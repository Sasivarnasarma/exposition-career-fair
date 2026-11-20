import "server-only";

export type ErrorCode =
  "INVALID_REQUEST" | "FORBIDDEN" | "CONFLICT" | "RATE_LIMITED" | "UNAVAILABLE";
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function errorResponse(error: unknown): Response {
  const safe =
    error instanceof AppError
      ? error
      : new AppError(
          "UNAVAILABLE",
          503,
          "We could not process this request. Please try again.",
        );
  return Response.json(
    { error: { code: safe.code, message: safe.message } },
    { status: safe.status, headers: { "Cache-Control": "no-store" } },
  );
}
