import "./load-env";
import { Client } from "pg";
import { databaseSettings } from "../src/server/config/database";

async function inspect() {
  const client = new Client(databaseSettings());
  try {
    await client.connect();
    await client.query("BEGIN READ ONLY");
    const result = await client.query<{ table_count: number }>(
      "SELECT count(*)::int AS table_count FROM pg_tables WHERE schemaname = 'public'",
    );
    await client.query("ROLLBACK");
    console.log(
      JSON.stringify({
        connected: true,
        publicTableCount: result.rows[0].table_count,
      }),
    );
  } finally {
    await client.end();
  }
}
inspect().catch((error: unknown) => {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "DATABASE_CHECK_FAILED";
  // Never print connection strings, query payloads, paths, or raw driver errors.
  console.error(
    JSON.stringify({
      connected: false,
      code: /^[A-Z0-9_]{1,50}$/.test(code) ? code : "DATABASE_CHECK_FAILED",
    }),
  );
  process.exitCode = 1;
});
