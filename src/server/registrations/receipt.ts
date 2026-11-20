import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
export const receiptCookieName =
  process.env.NODE_ENV === "production"
    ? "__Secure-exposition-receipt"
    : "exposition-receipt";
export const receiptLifetime = 15 * 60;
export function receiptSecret() {
  const value = process.env.REGISTRATION_RECEIPT_SECRET;
  if (!value || value.length < 32)
    throw new Error("Registration receipt signing is not configured");
  return value;
}
const schema = z
  .object({
    v: z.literal(1),
    reference: z.string().regex(/^EXPO-\d{4}-[A-F0-9]{32}$/),
    eventId: z.string().min(1).max(200),
    exp: z.number().int(),
  })
  .strict();
export function createReceipt(
  reference: string,
  eventId: string,
  now = Date.now(),
) {
  const payload = schema.parse({
    v: 1,
    reference,
    eventId,
    exp: Math.floor(now / 1000) + receiptLifetime,
  });
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", receiptSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}
export function readReceipt(
  token: string | undefined,
  eventId: string,
  now = Date.now(),
) {
  if (
    !token ||
    token.length > 1024 ||
    !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token)
  )
    return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const expected = createHmac("sha256", receiptSecret())
      .update(parts[0])
      .digest();
    const signature = Buffer.from(parts[1], "base64url");
    if (
      signature.length !== expected.length ||
      !timingSafeEqual(signature, expected)
    )
      return null;
    const parsed = schema.safeParse(
      JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")),
    );
    const seconds = Math.floor(now / 1000);
    if (
      !parsed.success ||
      parsed.data.eventId !== eventId ||
      parsed.data.exp <= seconds ||
      parsed.data.exp > seconds + receiptLifetime
    )
      return null;
    return { reference: parsed.data.reference };
  } catch {
    return null;
  }
}
