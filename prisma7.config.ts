import { config } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const connection = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
let migrationUrl = connection;
if (connection) {
  const url = new URL(connection);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (!local || process.env.NODE_ENV === "production") {
    url.searchParams.set("sslmode", "verify-full");
    if (process.env.DATABASE_CA_CERT_FILE)
      url.searchParams.set(
        "sslrootcert",
        resolve(process.env.DATABASE_CA_CERT_FILE),
      );
  }
  migrationUrl = url.toString();
}
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node --conditions=react-server --import tsx prisma/seed.ts",
  },
  datasource: { url: migrationUrl },
});
