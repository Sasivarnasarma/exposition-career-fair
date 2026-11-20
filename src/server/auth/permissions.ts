import "server-only";
import { getAuth } from "./index";
import { getDatabase } from "../db";
import { canAdmin, type AdminPermission } from "../../shared/admin-policy";
import { AppError } from "../http/errors";

export async function authenticatedAdmin(
  headers: Headers,
  permission: AdminPermission = "dashboard:read",
) {
  const session = await getAuth().api.getSession({
    headers,
    query: { disableCookieCache: true },
  });
  if (!session) return null;
  const profile = await getDatabase().adminProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!canAdmin(profile, "dashboard:read")) {
    await getDatabase().session.deleteMany({
      where: { userId: session.user.id },
    });
    return null;
  }
  if (!canAdmin(profile, permission)) return null;
  return { userId: session.user.id, role: profile!.role };
}
export async function requireAdmin(
  headers: Headers,
  permission: AdminPermission,
) {
  const admin = await authenticatedAdmin(headers, permission);
  if (!admin)
    throw new AppError("FORBIDDEN", 403, "Administrator access is required.");
  return admin;
}
