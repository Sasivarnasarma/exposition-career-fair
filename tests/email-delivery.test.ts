import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import {
  encryptEmailPayload,
  decryptEmailPayload,
} from "../src/server/email/crypto";
import {
  emailAppOrigin,
  emailSender,
  deliveryEnabled,
} from "../src/server/email/config";
import { EmailSendError, sendWithResend } from "../src/server/email/transport";
import type { EmailMessage } from "../src/server/email/queue";

const originalEnv = { ...process.env };
afterEach(() => {
  mock.restoreAll();
  for (const name of Object.keys(process.env))
    if (!(name in originalEnv)) delete process.env[name];
  Object.assign(process.env, originalEnv);
});
const message: EmailMessage = {
  from: "Exposition Career Fair <fair@example.org>",
  to: ["recipient@example.org"],
  subject: "Example confirmation",
  html: "<p>Example content</p>",
  text: "Example content",
};
function configureDelivery() {
  Object.assign(process.env, {
    NODE_ENV: "test",
    RESEND_API_KEY: "fixture-api-key",
    EMAIL_TEST_RECIPIENT: "recipient@example.org",
  });
}
function expectSendError(code: string, retryable: boolean) {
  return (error: unknown) => {
    assert.ok(error instanceof EmailSendError);
    assert.equal(error.code, code);
    assert.equal(error.retryable, retryable);
    assert.equal(error.message, "Email delivery failed");
    assert.ok(!JSON.stringify(error).includes("fixture-api-key"));
    return true;
  };
}
test("email encryption round-trips structured payloads with fresh authenticated ciphertext", () => {
  process.env.EMAIL_PAYLOAD_SECRET = "ab".repeat(32);
  const value = {
    to: "recipient@example.org",
    actionUrl:
      "https://careerfair.example.org/verify-email#token=fixture-private-token",
    nested: { enabled: true },
  };
  const first = encryptEmailPayload(value);
  const second = encryptEmailPayload(value);
  assert.notEqual(first, second);
  assert.deepEqual(decryptEmailPayload(first), value);
  assert.ok(first.startsWith("v1."));
  assert.ok(!first.includes("recipient@example.org"));
  assert.ok(!first.includes("fixture-private-token"));
});
test("email encryption rejects missing, short and malformed keys", () => {
  for (const secret of [
    undefined,
    "",
    "a".repeat(63),
    "g".repeat(64),
    "a".repeat(65),
  ]) {
    if (secret === undefined) delete process.env.EMAIL_PAYLOAD_SECRET;
    else process.env.EMAIL_PAYLOAD_SECRET = secret;
    assert.throws(() => encryptEmailPayload({ token: "fixture-token" }), {
      message: "Email payload encryption is not configured",
    });
  }
});
test("authenticated encryption detects wrong keys, modified IV/tag/data and malformed envelopes", () => {
  process.env.EMAIL_PAYLOAD_SECRET = "ab".repeat(32);
  const ciphertext = encryptEmailPayload({ value: "fixture-token" });
  for (const index of [1, 2, 3]) {
    const parts = ciphertext.split(".");
    const bytes = Buffer.from(parts[index], "base64url");
    bytes[0] ^= 1;
    parts[index] = bytes.toString("base64url");
    assert.throws(() => decryptEmailPayload(parts.join(".")));
  }
  for (const invalid of [
    "",
    "v2.a.b.c",
    "v1.a.b",
    ciphertext + ".extra",
    "x".repeat(262145),
  ])
    assert.throws(() => decryptEmailPayload(invalid));
  process.env.EMAIL_PAYLOAD_SECRET = "cd".repeat(32);
  assert.throws(() => decryptEmailPayload(ciphertext));
});
test("sender configuration supports explicit sender and fallback without header injection", () => {
  delete process.env.EMAIL_FROM;
  delete process.env.FROM_NAME;
  delete process.env.RESEND_FROM_EMAIL;
  assert.throws(emailSender, { message: "Email sender is not configured" });
  process.env.RESEND_FROM_EMAIL = "fair@example.org";
  assert.equal(emailSender(), "Exposition Career Fair <fair@example.org>");
  process.env.FROM_NAME = "Example Organisers";
  assert.equal(emailSender(), "Example Organisers <fair@example.org>");
  process.env.EMAIL_FROM = "Fair Team <team@example.org>";
  assert.equal(emailSender(), "Fair Team <team@example.org>");
  for (const invalid of [
    "invalid-address",
    "Fair\r\nBcc: attacker@example.org <fair@example.org>",
    "fair@example.org\n",
  ]) {
    process.env.EMAIL_FROM = invalid;
    assert.throws(emailSender, { message: "Email sender is not configured" });
  }
  delete process.env.EMAIL_FROM;
  process.env.FROM_NAME = "Organisers\nBcc: attacker@example.org";
  assert.throws(emailSender);
});
test("email application origin is exact and production requires HTTPS", () => {
  Object.assign(process.env, {
    NODE_ENV: "test",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  });
  assert.equal(emailAppOrigin(), "http://localhost:3000");
  for (const invalid of [
    "https://user:password@example.org",
    "https://example.org/path",
    "https://example.org?next=bad",
    "https://example.org#token=bad",
    "ftp://example.org",
  ]) {
    process.env.NEXT_PUBLIC_APP_URL = invalid;
    assert.throws(emailAppOrigin);
  }
  Object.assign(process.env, {
    NODE_ENV: "production",
    NEXT_PUBLIC_APP_URL: "http://example.org",
  });
  assert.throws(emailAppOrigin);
  process.env.NEXT_PUBLIC_APP_URL = "https://careerfair.example.org";
  assert.equal(emailAppOrigin(), "https://careerfair.example.org");
  delete process.env.EMAIL_DELIVERY_ENABLED;
  assert.equal(deliveryEnabled(), false);
  process.env.EMAIL_DELIVERY_ENABLED = "true";
  assert.equal(deliveryEnabled(), true);
});
test("Resend transport uses fixed endpoint, bounded request and stable idempotent payload", async () => {
  configureDelivery();
  const requests: { input: string; init: RequestInit }[] = [];
  mock.method(
    globalThis,
    "fetch",
    async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({ input: String(input), init: init! });
      return Response.json({ id: "fixture-message-id" });
    },
  );
  assert.deepEqual(await sendWithResend(message, "job-fixture-key"), {
    id: "fixture-message-id",
  });
  assert.deepEqual(await sendWithResend(message, "job-fixture-key"), {
    id: "fixture-message-id",
  });
  assert.equal(requests.length, 2);
  for (const request of requests) {
    assert.equal(request.input, "https://api.resend.com/emails");
    assert.equal(request.init.method, "POST");
    assert.equal(request.init.cache, "no-store");
    const headers = new Headers(request.init.headers);
    assert.equal(headers.get("Authorization"), "Bearer fixture-api-key");
    assert.equal(headers.get("Content-Type"), "application/json");
    assert.equal(headers.get("Idempotency-Key"), "job-fixture-key");
    assert.ok(request.init.signal instanceof AbortSignal);
    assert.equal(request.init.signal.aborted, false);
    assert.deepEqual(JSON.parse(String(request.init.body)), message);
  }
  assert.equal(requests[0].init.body, requests[1].init.body);
});
test("Resend transport classifies retries and rejects provider messages without leaking details", async () => {
  configureDelivery();
  const responses: {
    status: number;
    name?: string;
    code: string;
    retryable: boolean;
  }[] = [
    { status: 429, code: "PROVIDER_RETRYABLE", retryable: true },
    { status: 503, code: "PROVIDER_RETRYABLE", retryable: true },
    { status: 400, code: "PROVIDER_REJECTED", retryable: false },
    { status: 401, code: "PROVIDER_REJECTED", retryable: false },
    {
      status: 409,
      name: "concurrent_idempotent_requests",
      code: "PROVIDER_RETRYABLE",
      retryable: true,
    },
    {
      status: 409,
      name: "invalid_idempotent_request",
      code: "PROVIDER_REJECTED",
      retryable: false,
    },
  ];
  let current = responses[0];
  mock.method(globalThis, "fetch", async () =>
    Response.json(
      {
        name: current.name,
        message:
          "fixture-api-key recipient@example.org private-provider-details",
      },
      { status: current.status },
    ),
  );
  for (const response of responses) {
    current = response;
    await assert.rejects(sendWithResend(message, "fixture-key"), (error) => {
      expectSendError(response.code, response.retryable)(error);
      assert.ok(!String(error).includes("private-provider-details"));
      assert.ok(!String(error).includes("recipient@example.org"));
      return true;
    });
  }
});
test("Resend timeout/network/malformed success failures are safely retryable", async () => {
  configureDelivery();
  const fetch = mock.method(
    globalThis,
    "fetch",
    async (): Promise<Response> => {
      throw new DOMException("fixture-private-timeout", "TimeoutError");
    },
  );
  await assert.rejects(
    sendWithResend(message, "fixture-key"),
    expectSendError("PROVIDER_UNAVAILABLE", true),
  );
  fetch.mock.mockImplementation(async () => {
    throw new Error("fixture-private-network-details");
  });
  await assert.rejects(
    sendWithResend(message, "fixture-key"),
    expectSendError("PROVIDER_UNAVAILABLE", true),
  );
  fetch.mock.mockImplementation(async () => new Response("not JSON"));
  await assert.rejects(
    sendWithResend(message, "fixture-key"),
    expectSendError("PROVIDER_UNAVAILABLE", true),
  );
  fetch.mock.mockImplementation(async () => Response.json({ status: "ok" }));
  await assert.rejects(
    sendWithResend(message, "fixture-key"),
    expectSendError("PROVIDER_UNAVAILABLE", true),
  );
});
test("nonproduction recipient allowlist and missing API key reject before network access", async () => {
  configureDelivery();
  const fetch = mock.method(globalThis, "fetch", async () =>
    Response.json({ id: "fixture-id" }),
  );
  delete process.env.EMAIL_TEST_RECIPIENT;
  await assert.rejects(
    sendWithResend(message, "fixture-key"),
    expectSendError("TEST_RECIPIENT_NOT_ALLOWED", false),
  );
  process.env.EMAIL_TEST_RECIPIENT = "other@example.org";
  await assert.rejects(
    sendWithResend(message, "fixture-key"),
    expectSendError("TEST_RECIPIENT_NOT_ALLOWED", false),
  );
  process.env.EMAIL_TEST_RECIPIENT = "RECIPIENT@EXAMPLE.ORG";
  await assert.rejects(
    sendWithResend(
      { ...message, to: [...message.to, "other@example.org"] },
      "fixture-key",
    ),
    expectSendError("TEST_RECIPIENT_NOT_ALLOWED", false),
  );
  delete process.env.RESEND_API_KEY;
  await assert.rejects(
    sendWithResend(message, "fixture-key"),
    expectSendError("PROVIDER_NOT_CONFIGURED", false),
  );
  assert.equal(fetch.mock.callCount(), 0);
  process.env.RESEND_API_KEY = "fixture-api-key";
  assert.deepEqual(await sendWithResend(message, "fixture-key"), {
    id: "fixture-id",
  });
  Object.assign(process.env, { NODE_ENV: "production" });
  delete process.env.EMAIL_TEST_RECIPIENT;
  assert.deepEqual(
    await sendWithResend(
      { ...message, to: ["other@example.org"] },
      "fixture-key",
    ),
    { id: "fixture-id" },
  );
});
