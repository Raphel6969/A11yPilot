import { expect, it } from "vitest";
import { htmlReport } from "../../src/reporters/html.js";
import { sarifReport } from "../../src/reporters/sarif.js";
import { jsonReport } from "../../src/reporters/json.js";
const result = {
  schemaVersion: 1 as const,
  runId: "run",
  startedAt: "2026-01-01T00:00:00Z",
  durationMs: 1,
  journey: { name: "Demo <journey>", start: "http://localhost" },
  status: "completed-with-barriers" as const,
  traces: [],
  findings: [],
};
it("renders all reports from the normalized model", () => {
  expect(JSON.parse(jsonReport(result)).journey.name).toContain("journey");
  expect(htmlReport(result)).toContain("&lt;journey&gt;");
  expect(JSON.parse(sarifReport(result)).version).toBe("2.1.0");
});
