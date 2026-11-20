import { timingSafeEqual } from "node:crypto";
import { runEmailWorker } from "@/server/email/worker";
import { errorResponse } from "@/server/http/errors";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production")
    return Response.json(
      { disabled: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret || ""}`;
  if (
    !secret ||
    secret.length < 32 ||
    Buffer.byteLength(supplied) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  )
    return Response.json(
      { error: { message: "Not allowed" } },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  try {
    return Response.json(await runEmailWorker({ maxJobs: 5 }), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export const POST = GET;
