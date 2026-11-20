export const routes = {
  home: "/",
  register: "/register",
  registrationSuccess: "/registration/success",
  verifyEmail: "/verify-email",
  privacy: "/privacy",
  admin: {
    login: "/admin/login",
    dashboard: "/admin",
    registrations: "/admin/registrations",
    registration: (id: string) =>
      `/admin/registrations/${encodeURIComponent(id)}`,
    admins: "/admin/admins",
    forgotPassword: "/admin/forgot-password",
    resetPassword: "/admin/reset-password",
    acceptInvitation: "/admin/accept-invitation",
  },
} as const;
