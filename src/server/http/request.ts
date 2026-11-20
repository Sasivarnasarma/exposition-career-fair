import "server-only";
import { AppError } from "./errors";

export function assertTrustedOrigin(request: Request, expectedOrigin: string) {
  if (request.headers.get("origin") !== new URL(expectedOrigin).origin)
    throw new AppError("FORBIDDEN", 403, "This request is not allowed.");
}

export async function readBoundedJson(
  request: Request,
  maxBytes = 32768,
): Promise<unknown> {
  if (
    request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase() !== "application/json"
  )
    throw new AppError("INVALID_REQUEST", 415, "Please submit JSON data.");
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBytes))
    throw new AppError("INVALID_REQUEST", 413, "This request is too large.");
  const reader = request.body?.getReader();
  if (!reader)
    throw new AppError("INVALID_REQUEST", 400, "Please provide request data.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new AppError(
          "INVALID_REQUEST",
          413,
          "This request is too large.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const data = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(data));
  } catch {
    throw new AppError(
      "INVALID_REQUEST",
      400,
      "Please provide valid JSON data.",
    );
  }
}
