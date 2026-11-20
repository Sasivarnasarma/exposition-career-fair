import { handleVerification } from "@/server/email/verification-handler";
import { dispatchAfterResponse } from "@/server/email/after-response";
export const maxDuration = 60;
export async function POST(request: Request) {
  const response = await handleVerification(request, "resend");
  if (response.ok) dispatchAfterResponse();
  return response;
}
