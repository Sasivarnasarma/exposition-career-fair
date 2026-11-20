import "server-only";
import type { EmailMessage } from "./queue";
export class EmailSendError extends Error {
  constructor(
    public code: string,
    public retryable: boolean,
  ) {
    super("Email delivery failed");
  }
}
export type EmailTransport = (
  message: EmailMessage,
  idempotencyKey: string,
) => Promise<{ id: string }>;
export const sendWithResend: EmailTransport = async (
  message,
  idempotencyKey,
) => {
  if (
    process.env.NODE_ENV !== "production" &&
    (!process.env.EMAIL_TEST_RECIPIENT ||
      message.to.some(
        (address) =>
          address.toLowerCase() !==
          process.env.EMAIL_TEST_RECIPIENT!.toLowerCase(),
      ))
  )
    throw new EmailSendError("TEST_RECIPIENT_NOT_ALLOWED", false);
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new EmailSendError("PROVIDER_NOT_CONFIGURED", false);
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
  } catch {
    throw new EmailSendError("PROVIDER_UNAVAILABLE", true);
  }
  const value = await response.json().catch(() => null);
  if (!response.ok) {
    const retryable =
      response.status === 429 ||
      response.status >= 500 ||
      (response.status === 409 &&
        value?.name === "concurrent_idempotent_requests");
    throw new EmailSendError(
      retryable ? "PROVIDER_RETRYABLE" : "PROVIDER_REJECTED",
      retryable,
    );
  }
  if (!value || typeof value.id !== "string")
    throw new EmailSendError("PROVIDER_UNAVAILABLE", true);
  return { id: value.id };
};
