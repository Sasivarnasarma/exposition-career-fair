import {
  adminStatusSchema,
  updateAdminStatus,
} from "@/server/admin/management";
import { authorizeAdminMutation } from "@/server/admin/mutation-request";
import { AppError, errorResponse } from "@/server/http/errors";
import { readBoundedJson } from "@/server/http/request";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await authorizeAdminMutation(request);
    const parsed = adminStatusSchema.safeParse(
      await readBoundedJson(request, 1024),
    );
    if (!parsed.success)
      throw new AppError(
        "INVALID_REQUEST",
        400,
        "Please check the account information.",
      );
    const { id } = await context.params;
    return Response.json(
      await updateAdminStatus(request.headers, id, parsed.data.active),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
