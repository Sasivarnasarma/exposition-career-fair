import "server-only";
import { createHash, randomBytes } from "node:crypto";
export const randomEmailToken = () => randomBytes(32).toString("base64url");
export const hashEmailToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const candidateTokenValid = (token: unknown): token is string =>
  typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
