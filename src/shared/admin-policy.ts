export type AdminPermission =
  | "dashboard:read"
  | "registrations:read"
  | "registrations:export"
  | "admins:manage";
export function canAdmin(
  profile: { active: boolean; role: string } | null | undefined,
  permission: AdminPermission,
) {
  if (!profile?.active) return false;
  const common: readonly AdminPermission[] = [
    "dashboard:read",
    "registrations:read",
    "registrations:export",
  ];
  if (profile.role === "SUPER_ADMIN")
    return [...common, "admins:manage"].includes(permission);
  return profile.role === "ADMIN" && common.includes(permission);
}
