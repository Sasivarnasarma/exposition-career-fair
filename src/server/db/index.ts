import "server-only";
import { createDatabase } from "./factory";

const shared = globalThis as unknown as {
  careerFairDb?: ReturnType<typeof createDatabase>;
};
export function getDatabase() {
  shared.careerFairDb ??= createDatabase();
  return shared.careerFairDb;
}
