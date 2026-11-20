import { handleAuth } from "@/server/auth/handler";
import { dispatchAfterResponse } from "@/server/email/after-response";
export const maxDuration = 60;
export const GET = handleAuth;
export async function POST(request: Request) {
  const response = await handleAuth(request);
  if (
    response.ok &&
    new URL(request.url).pathname === "/api/auth/request-password-reset"
  )
    dispatchAfterResponse();
  return response;
}
