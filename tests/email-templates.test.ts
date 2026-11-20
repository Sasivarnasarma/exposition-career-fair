import assert from "node:assert/strict";
import { test } from "node:test";
import { renderEmail, type EmailKind } from "../src/server/email/templates";

const base = {
  recipientName: "Example Candidate",
  actionUrl: "https://careerfair.example.org/verify-email#token=example-token",
  reference: "EXPO-2027-EXAMPLE",
  mainWebsite: "https://exposition.lk",
};
const kinds: EmailKind[] = [
  "REGISTRATION_CONFIRMATION",
  "CANDIDATE_VERIFICATION",
  "ADMIN_INVITATION",
  "ADMIN_PASSWORD_RESET",
];
test("all lifecycle email kinds provide branded HTML, plaintext and a clear action", () => {
  for (const kind of kinds) {
    const message = renderEmail({ ...base, kind });
    assert.ok(message.subject.length > 10);
    assert.ok(message.html.includes('role="presentation"'));
    assert.ok(message.html.includes("max-width:600px"));
    assert.ok(message.html.includes("#e8c896"));
    assert.ok(message.html.includes(base.actionUrl));
    assert.ok(message.text.includes(base.actionUrl));
    assert.ok(message.text.includes("Example Candidate"));
    assert.ok(message.text.includes("expires"));
    assert.ok(!message.html.includes("<script"));
  }
});
test("candidate confirmation distinguishes persistence, verification and opportunities", () => {
  const message = renderEmail({ ...base, kind: "REGISTRATION_CONFIRMATION" });
  assert.match(message.text, /has been saved/);
  assert.match(
    message.text,
    /Pre-registration and email verification are separate/,
  );
  assert.match(message.text, /Neither guarantees an interview/);
  assert.match(message.html, /EXPO-2027-EXAMPLE/);
  assert.throws(() =>
    renderEmail({ ...base, reference: "", kind: "REGISTRATION_CONFIRMATION" }),
  );
});
test("untrusted names, references and URL attributes are HTML escaped", () => {
  const message = renderEmail({
    ...base,
    kind: "REGISTRATION_CONFIRMATION",
    recipientName: '<img src=x onerror="alert(1)"> & visitor',
    reference: '<svg onload="alert(1)">',
    actionUrl: "https://careerfair.example.org/verify-email?one=1&two=2",
  });
  assert.ok(!message.html.includes("<img src=x"));
  assert.ok(!message.html.includes("<svg onload"));
  assert.ok(message.html.includes("&lt;img"));
  assert.ok(message.html.includes("&quot;"));
  assert.ok(message.html.includes("?one=1&amp;two=2"));
  assert.ok(message.text.includes('<img src=x onerror="alert(1)">'));
  assert.equal(message.subject, "Your Exposition Career Fair pre-registration");
});
test("unsafe action, footer and community URLs are rejected without reflecting them", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,hello",
    "ftp://example.org/file",
    "//example.org",
    "https://user:secret@example.org",
    "https://example.org/\nheader",
    "not-a-url",
  ]) {
    for (const field of ["actionUrl", "mainWebsite", "whatsappUrl"] as const) {
      assert.throws(
        () =>
          renderEmail({
            ...base,
            kind: "CANDIDATE_VERIFICATION",
            [field]: url,
          }),
        {
          message:
            "Email links must be valid HTTP or HTTPS URLs without credentials",
        },
      );
    }
  }
});
test("community links are optional and kept out of administrator emails", () => {
  const candidate = renderEmail({
    ...base,
    kind: "REGISTRATION_CONFIRMATION",
    whatsappUrl: "https://chat.whatsapp.com/example",
  });
  assert.match(candidate.html, /Community updates are optional/);
  assert.match(candidate.text, /Optional WhatsApp community/);
  const without = renderEmail({ ...base, kind: "CANDIDATE_VERIFICATION" });
  assert.ok(!without.text.includes("WhatsApp"));
  const admin = renderEmail({
    ...base,
    kind: "ADMIN_INVITATION",
    whatsappUrl: "https://chat.whatsapp.com/example",
  });
  assert.ok(!admin.html.includes("chat.whatsapp.com"));
  assert.ok(!admin.text.includes("Registration reference"));
});
test("admin messages describe private one-use links without invented expiry dates", () => {
  for (const kind of ["ADMIN_INVITATION", "ADMIN_PASSWORD_RESET"] as const) {
    const message = renderEmail({ ...base, kind });
    assert.match(message.text, /can be used once/);
    assert.match(message.text, /Keep it private/);
    assert.ok(!/\d+ hours|\d+ days/.test(message.text));
  }
});

test("email header and footer preserve branding, public organiser details and safe destination links", () => {
  for (const kind of kinds) {
    const message = renderEmail({
      ...base,
      kind,
      actionUrl:
        "https://careerfair.example.org/admin/reset-password?token=fixture-token#private",
    });
    assert.match(message.html, /email-header/);
    assert.match(message.html, /CONNECTING TALENT &amp; OPPORTUNITY/);
    assert.match(message.html, /ISSUE 22/);
    assert.match(message.html, /email-badge-cell/);
    assert.match(message.html, /email-footer/);
    assert.match(message.html, /University of Kelaniya/);
    assert.match(
      message.html,
      /Industrial Management Science Students' Association/,
    );
    assert.match(
      message.html,
      /href="https:\/\/careerfair\.example\.org\/privacy"/,
    );
    assert.match(message.html, /href="mailto:exposition\.mit@gmail\.com"/);
    assert.match(
      message.text,
      /Privacy notice: https:\/\/careerfair\.example\.org\/privacy/,
    );
    assert.match(message.text, /transactional email/);
    assert.ok(!message.html.includes("unsubscribe"));
    assert.ok(!message.html.includes("<img"));
    assert.ok(
      !message.html.includes(
        'width="600" cellspacing="0" cellpadding="0" border="0" bgcolor=',
      ),
    );
  }
});
test("email layout has mobile single-column rules, full-width action and Outlook fallbacks", () => {
  const { html } = renderEmail({ ...base, kind: "REGISTRATION_CONFIRMATION" });
  assert.match(html, /@media only screen and \(max-width:600px\)/);
  assert.match(
    html,
    /\.email-stack\{display:block!important;width:100%!important/,
  );
  assert.match(html, /\.email-cta\{width:100%!important\}/);
  assert.match(html, /\.email-cta a\{display:block!important/);
  assert.match(html, /email-footer\{padding:26px 22px!important/);
  assert.match(html, /\[if mso\]/);
  assert.match(html, /mso-padding-alt/);
  assert.match(html, /PixelsPerInch>96/);
  assert.match(html, /max-width:600px/);
  assert.match(html, /overflow-wrap:anywhere;word-break:break-all/);
});
