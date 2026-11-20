import { createAdminInvitation } from "@/server/admin/invitations";
import { adminInviteSchema } from "@/server/admin/management";
import { authorizeAdminMutation } from "@/server/admin/mutation-request";
import { dispatchAfterResponse } from "@/server/email/after-response";
import { AppError, errorResponse } from "@/server/http/errors";
import { readBoundedJson } from "@/server/http/request";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    await authorizeAdminMutation(request);
    const parsed = adminInviteSchema.safeParse(
      await readBoundedJson(request, 2048),
    );
    if (!parsed.success)
      throw new AppError(
        "INVALID_REQUEST",
        400,
        "Please enter a valid email address.",
      );
    const result = await createAdminInvitation(
      request.headers,
      parsed.data.email,
    );
    if (result.created) dispatchAfterResponse();
    return Response.json(
      { success: true, created: result.created },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
