import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
function key() {
  const secret = process.env.EMAIL_PAYLOAD_SECRET;
  if (!secret || !/^[a-f0-9]{64}$/i.test(secret))
    throw new Error("Email payload encryption is not configured");
  return Buffer.from(secret, "hex");
}
export function encryptEmailPayload(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from("exposition-email:v1"));
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}
export function decryptEmailPayload(value: string): unknown {
  if (value.length > 262144) throw new Error("Invalid email payload");
  const [version, iv, tag, data, ...extra] = value.split(".");
  if (version !== "v1" || !iv || !tag || !data || extra.length)
    throw new Error("Invalid email payload");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAAD(Buffer.from("exposition-email:v1"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(data, "base64url")),
      decipher.final(),
    ]).toString("utf8"),
  );
}
