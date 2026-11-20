import { handleRegistration } from "@/server/registrations/handler";
import { dispatchAfterResponse } from "@/server/email/after-response";
export const maxDuration = 60;
export async function POST(request: Request) {
  const response = await handleRegistration(request);
  if (response.ok) dispatchAfterResponse();
  return response;
}
