import { createCandidateExport } from "@/server/admin/csv";
import { errorResponse } from "@/server/http/errors";
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    return await createCandidateExport(request);
  } catch (error) {
    return errorResponse(error);
  }
}
