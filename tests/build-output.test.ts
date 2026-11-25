import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";

test("Vercel builds use the expected output while local and QA caches remain isolated", () => {
  for (const [mode, vercel, qa, expected] of [
    ["production", "1", "false", ".next"],
    ["production", "1", "true", ".next"],
    ["production", "", "false", ".next-production"],
    ["development", "", "true", ".next-qa"],
    ["development", "", "false", ".next"],
  ] as const) {
    const output = execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "--eval",
        "process.stdout.write(require('./next.config.ts').default.distDir)",
      ],
      {
        env: {
          ...process.env,
          NODE_ENV: mode,
          VERCEL: vercel,
          EXPOSITION_QA: qa,
        },
        encoding: "utf8",
        windowsHide: true,
        timeout: 15000,
      },
    );
    assert.equal(output, expected);
  }
});
