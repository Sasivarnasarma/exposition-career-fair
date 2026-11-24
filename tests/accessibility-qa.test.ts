import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { qaMetricSummary } from "../src/shared/qa-metric";
const css = readFileSync("src/app/globals.css", "utf8");
function color(token: string) {
  const match = css.match(new RegExp(`--${token}:\\s*#([0-9a-f]{6})`, "i"));
  assert.ok(match, `Missing theme color ${token}`);
  return [0, 2, 4]
    .map((offset) => parseInt(match[1].slice(offset, offset + 2), 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    )
    .reduce(
      (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
      0,
    );
}
function contrast(a: string, b: string) {
  const first = color(a),
    second = color(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
test("theme base text colors meet normal-text contrast on their surfaces", () => {
  for (const [foreground, background] of [
    ["foreground", "background"],
    ["card-foreground", "card"],
    ["muted-foreground", "card"],
    ["muted-foreground", "background"],
    ["primary-foreground", "primary"],
    ["destructive", "card"],
  ])
    assert.ok(
      contrast(foreground, background) >= 4.5,
      `${foreground} on ${background}`,
    );
});
test("input boundaries and focus colors remain distinguishable on form surfaces", () => {
  for (const surface of ["background", "card"]) {
    assert.ok(contrast("input", surface) >= 3);
    assert.ok(contrast("ring", surface) >= 3);
  }
});
test("QA metric summaries exclude identifiers, URLs and performance entries", () => {
  const metric = {
    name: "LCP",
    value: 1234.56789,
    id: "private-token",
    navigationURL: "https://example.org/private?token=private-token",
    entries: [{ text: "Candidate information" }],
  };
  assert.deepEqual(qaMetricSummary(metric), { name: "LCP", value: 1234.568 });
});
test("QA metrics reject unknown names and invalid measurement values", () => {
  for (const value of [NaN, Infinity, -1])
    assert.equal(qaMetricSummary({ name: "LCP", value }), null);
  assert.equal(qaMetricSummary({ name: "PRIVATE_URL", value: 1 }), null);
});
