import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseAdminFilters,
  adminFilterParams,
} from "../src/shared/admin-filters";
import { candidateWhere } from "../src/server/admin/candidates";
import {
  csvCell,
  csvLine,
  exportFilters,
  candidateCsvHeaders,
} from "../src/server/admin/csv";

test("admin filters normalize values, validate bounds and reject duplicate parameters", () => {
  assert.deepEqual(
    parseAdminFilters(
      new URLSearchParams("q=%20example%20&verified=verified&page=2"),
    ),
    { q: "example", verified: "verified", page: 2 },
  );
  for (const query of [
    "page=0",
    "page=1.5",
    "page=100001",
    "verified=other",
    "q=a&q=b",
    `q=${"a".repeat(121)}`,
  ])
    assert.throws(() => parseAdminFilters(new URLSearchParams(query)));
  assert.equal(
    adminFilterParams({ q: "a&b", page: 1, verified: "unverified" }).toString(),
    "q=a%26b&verified=unverified",
  );
});
test("candidate query combines event, custom academic labels, selections and verification", () => {
  const filters = parseAdminFilters({
    eventId: "example-event",
    q: "a%b_",
    institution: "Custom university",
    faculty: "Custom faculty",
    degree: "Custom degree",
    position: "software",
    opportunity: "internship",
    academicYear: "year-3",
    verified: "unverified",
  });
  const where = candidateWhere(filters);
  assert.equal(where.eventId, "example-event");
  assert.equal(where.institutionName, "Custom university");
  assert.equal(where.facultyName, "Custom faculty");
  assert.equal(where.degreeName, "Custom degree");
  assert.equal(where.emailVerifiedAt, null);
  assert.deepEqual(where.positions, { some: { positionId: "software" } });
  assert.deepEqual(where.opportunities, {
    some: { opportunityId: "internship" },
  });
  assert.deepEqual(where.OR?.[0], {
    fullName: { contains: "a\\%b\\_", mode: "insensitive" },
  });
});
test("export scope is explicit and all-record export preserves only the event", () => {
  const params = new URLSearchParams(
    "scope=all&eventId=example-event&q=sample&verified=verified&page=3",
  );
  assert.deepEqual(exportFilters(params), {
    scope: "all",
    filters: { eventId: "example-event", page: 1 },
  });
  params.set("scope", "filtered");
  assert.equal(exportFilters(params).filters.q, "sample");
  for (const query of ["", "scope=other", "scope=all&scope=filtered"])
    assert.throws(() => exportFilters(new URLSearchParams(query)));
});
test("CSV quotes delimiters and Unicode while neutralizing spreadsheet formula prefixes", () => {
  assert.equal(
    csvCell('Kelaniya, "Example"\nසිංහල'),
    '"Kelaniya, ""Example""\nසිංහල"',
  );
  for (const value of [
    "=1+1",
    "+123",
    "-123",
    "@SUM(A1)",
    " \t=1",
    "\r=1",
    "\n=1",
    "\tplain",
  ])
    assert.ok(csvCell(value).startsWith("\"'"));
  assert.equal(csvCell(null), '""');
  assert.equal(csvLine(["a", "b"]), '"a","b"\r\n');
  assert.ok(candidateCsvHeaders.includes("First preference"));
  assert.ok(candidateCsvHeaders.includes("Privacy notice version"));
});
