import { z } from "zod";

const verificationToken = z.string().regex(/^[A-Za-z0-9_-]{32,256}$/);
export const verificationEmailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address")
  .max(254)
  .transform((value) => value.toLowerCase());

export function verificationTokenFromHash(hash: string): string | null {
  if (!hash.startsWith("#") || hash.length > 2048) return null;
  try {
    const tokens = new URLSearchParams(hash.slice(1)).getAll("token");
    if (tokens.length !== 1) return null;
    const result = verificationToken.safeParse(tokens[0]);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function verificationResponseStatus(
  value: unknown,
): "verified" | "already-verified" | null {
  if (!value || typeof value !== "object" || !("status" in value)) return null;
  return value.status === "verified" || value.status === "already-verified"
    ? value.status
    : null;
}
