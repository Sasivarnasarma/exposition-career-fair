import "server-only";
import { site } from "../../config/site";
export function registrationSettings() {
  const origin = new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  );
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    (process.env.NODE_ENV === "production" && origin.protocol !== "https:")
  )
    throw new Error("Registration origin is invalid");
  return {
    origin: origin.origin,
    eventId: process.env.REGISTRATION_EVENT_ID || "issue-22-2027",
    enabled:
      site.registrationOpen ||
      (process.env.NODE_ENV !== "production" &&
        process.env.REGISTRATION_DEV_PREVIEW === "true"),
  };
}
