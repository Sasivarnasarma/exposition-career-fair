import { z } from "zod";

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().trim().min(1).max(max).optional(),
  );
export const adminFiltersSchema = z.object({
  eventId: optionalText(120),
  q: optionalText(120),
  institution: optionalText(200),
  faculty: optionalText(200),
  degree: optionalText(200),
  academicYear: optionalText(120),
  position: optionalText(120),
  opportunity: optionalText(120),
  verified: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.enum(["verified", "unverified"]).optional(),
  ),
  page: z.preprocess(
    (value) => (value === undefined || value === "" ? 1 : value),
    z.coerce.number().int().min(1).max(100000),
  ),
});
export type AdminFilters = z.infer<typeof adminFiltersSchema>;
export type AdminFilterInput =
  URLSearchParams | Record<string, string | string[] | undefined>;
export function parseAdminFilters(input: AdminFilterInput): AdminFilters {
  const values: Record<string, unknown> = {};
  for (const key of Object.keys(adminFiltersSchema.shape)) {
    const value =
      input instanceof URLSearchParams ? input.getAll(key) : input[key];
    if (Array.isArray(value)) {
      if (value.length > 1)
        throw new Error("Please provide each filter only once.");
      values[key] = value[0];
    } else values[key] = value;
  }
  const result = adminFiltersSchema.safeParse(values);
  if (!result.success)
    throw new Error("Please check the search and filter values.");
  return {
    ...Object.fromEntries(
      Object.entries(result.data).filter(([, value]) => value !== undefined),
    ),
    page: result.data.page,
  };
}
export function adminFilterParams(filters: Partial<AdminFilters>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters))
    if (value !== undefined && value !== "" && !(key === "page" && value === 1))
      params.set(key, String(value));
  return params;
}
