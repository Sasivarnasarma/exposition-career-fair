import { handleVerification } from "@/server/email/verification-handler";
export async function POST(request: Request) {
  return handleVerification(request, "consume");
}
