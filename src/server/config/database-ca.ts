import { X509Certificate } from "node:crypto";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  rmdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

type CertificateEnvironment = Record<string, string | undefined>;

export function inlineDatabaseCa(
  source: CertificateEnvironment,
): string | undefined {
  const value = source.DATABASE_CA_CERT?.trim();
  if (!value) return undefined;
  const pem = value
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n");
  try {
    if (
      pem.length > 131072 ||
      !/^(?:-----BEGIN CERTIFICATE-----[\sA-Za-z0-9+/=]+-----END CERTIFICATE-----\s*)+$/.test(
        pem,
      )
    )
      throw new Error();
    for (const certificate of pem.match(
      /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g,
    ) || [])
      new X509Certificate(certificate);
    return pem;
  } catch {
    throw new Error(
      "Database CA certificate must contain valid PEM certificates",
    );
  }
}

export function databaseCaCertificate(
  source: CertificateEnvironment,
): string | undefined {
  return (
    inlineDatabaseCa(source) ||
    (source.DATABASE_CA_CERT_FILE
      ? readFileSync(source.DATABASE_CA_CERT_FILE, "utf8")
      : undefined)
  );
}

export function migrationCaCertificateFile(
  source: CertificateEnvironment,
): string | undefined {
  const inline = inlineDatabaseCa(source);
  if (!inline)
    return source.DATABASE_CA_CERT_FILE
      ? resolve(source.DATABASE_CA_CERT_FILE)
      : undefined;
  // Prisma's migration engine accepts a file, so materialize the environment value temporarily.
  const directory = mkdtempSync(join(tmpdir(), "career-fair-ca-"));
  const certificateFile = join(directory, "database-ca.pem");
  process.once("exit", () => {
    rmSync(certificateFile, { force: true });
    rmdirSync(directory);
  });
  writeFileSync(certificateFile, inline, { encoding: "utf8", mode: 0o600 });
  return certificateFile;
}
