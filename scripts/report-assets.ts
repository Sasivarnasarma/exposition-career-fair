import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
function files(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(join(root, entry.name))
      : [join(root, entry.name)],
  );
}
const kib = (bytes: number) => Math.round(bytes / 1024);
function main() {
  const photoFiles = files("src/assets/images"),
    photos = photoFiles.map((file) => statSync(file).size);
  const output = ".next-production";
  if (!existsSync(join(output, "static")))
    throw new Error("Run pnpm build before measuring assets");
  const staticFiles = files(join(output, "static"));
  const total = (paths: string[], compressed = false) =>
    kib(
      paths.reduce(
        (sum, path) =>
          sum +
          (compressed
            ? gzipSync(readFileSync(path)).length
            : statSync(path).size),
        0,
      ),
    );
  const scripts = staticFiles.filter((p) => p.endsWith(".js")),
    styles = staticFiles.filter((p) => p.endsWith(".css")),
    fonts = staticFiles.filter((p) => /\.(woff2?|ttf|otf)$/.test(p));
  console.log(
    JSON.stringify(
      {
        sourceImages: {
          count: photos.length,
          totalKiB: kib(photos.reduce((a, b) => a + b, 0)),
          largestKiB: kib(Math.max(...photos)),
        },
        productionStaticFiles: {
          javascriptCount: scripts.length,
          javascriptRawKiB: total(scripts),
          javascriptGzipKiB: total(scripts, true),
          cssGzipKiB: total(styles, true),
          fontKiB: total(fonts),
        },
        note: "All build chunks combined, not a per-page download or browser performance score. Source photos are served through responsive Next.js optimization.",
      },
      null,
      2,
    ),
  );
}
try {
  main();
} catch {
  console.error(
    "Asset measurement failed; check the production build and asset directories.",
  );
  process.exitCode = 1;
}
