import "server-only";
import { z } from "zod";
import { getAuth } from "./index";
import { requireAdmin } from "./permissions";
import { authSettings } from "../config/auth";
import { assertTrustedOrigin, readBoundedJson } from "../http/request";
import { AppError, errorResponse } from "../http/errors";

const routes: Record<string, string> = {
  "sign-in/email": "POST",
  "sign-out": "POST",
  "get-session": "GET",
  "request-password-reset": "POST",
  "reset-password": "POST",
};
const signIn = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
});

export async function handleAuth(request: Request) {
  try {
    const path = new URL(request.url).pathname.replace(/^\/api\/auth\//, "");
    if (routes[path] !== request.method)
      return Response.json(
        { error: { message: "This endpoint is unavailable." } },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    let bounded = request;
    if (request.method === "POST") {
      assertTrustedOrigin(request, authSettings().origin);
      let body = await readBoundedJson(request, 8192);
      if (path === "sign-in/email") {
        const parsed = signIn.safeParse(body);
        if (!parsed.success)
          throw new AppError(
            "INVALID_REQUEST",
            400,
            "Please enter a valid email and password.",
          );
        body = { ...parsed.data, rememberMe: false };
      }
      if (path === "request-password-reset") {
        const input = z
          .object({ email: z.string().trim().email().max(254) })
          .safeParse(body);
        if (!input.success)
          throw new AppError(
            "INVALID_REQUEST",
            400,
            "Enter a valid email address.",
          );
        body = { email: input.data.email.toLowerCase() };
      }
      bounded = new Request(request.url, {
        method: request.method,
        headers: request.headers,
        body: JSON.stringify(body),
      });
    }
    if (path === "get-session") {
      const admin = await requireAdmin(request.headers, "dashboard:read");
      return Response.json(
        { authenticated: true, role: admin.role },
        {
          headers: {
            "Cache-Control": "no-store",
            Pragma: "no-cache",
            "Referrer-Policy": "no-referrer",
          },
        },
      );
    }
    const response = await getAuth().handler(bounded);
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");
    headers.set("Pragma", "no-cache");
    headers.set("Referrer-Policy", "no-referrer");
    if (!response.ok) {
      const status = response.status >= 500 ? 503 : response.status;
      const message =
        status === 429
          ? "Too many attempts. Please try again later."
          : status >= 500
            ? "Sign-in is temporarily unavailable. Please try again."
            : "Unable to complete this request. Check your details and complete a new security check.";
      return Response.json({ error: { message } }, { status, headers });
    }
    if (
      path === "sign-in/email" ||
      path === "request-password-reset" ||
      path === "sign-out" ||
      path === "reset-password"
    )
      return Response.json(
        { success: true },
        { status: response.status, headers },
      );
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    return errorResponse(error);
  }
}
