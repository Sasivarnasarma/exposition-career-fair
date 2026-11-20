import "server-only";
import { z } from "zod";
export function emailAppOrigin() {
  const url = new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  );
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.hash ||
    url.search ||
    (process.env.NODE_ENV === "production" && url.protocol !== "https:")
  )
    throw new Error("Email application origin is invalid");
  return url.origin;
}
export function emailSender() {
  const value =
    process.env.EMAIL_FROM ||
    `${process.env.FROM_NAME || "Exposition Career Fair"} <${process.env.RESEND_FROM_EMAIL || ""}>`;
  const address = value.match(/<([^<>]+)>$/)?.[1] || value;
  if (!z.email().safeParse(address).success || /[\r\n]/.test(value))
    throw new Error("Email sender is not configured");
  return value;
}
export function deliveryEnabled() {
  return (
    process.env.EMAIL_DELIVERY_ENABLED === "true" &&
    (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production")
  );
}
