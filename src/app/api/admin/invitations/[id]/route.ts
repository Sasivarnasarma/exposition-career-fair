import { revokeAdminInvitation } from "@/server/admin/management";
import { authorizeAdminMutation } from "@/server/admin/mutation-request";
import { errorResponse } from "@/server/http/errors";
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await authorizeAdminMutation(request);
    const { id } = await context.params;
    return Response.json(await revokeAdminInvitation(request.headers, id), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
