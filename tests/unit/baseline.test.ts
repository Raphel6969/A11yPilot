import { describe, expect, it } from "vitest";
import {
  createBaseline,
  diffResults,
  gateResult,
  type Finding,
  type JourneyResult,
} from "../../packages/core/src/index.js";

const finding = (
  fingerprint: string,
  severity: Finding["severity"] = "error",
): Finding => ({
  id: fingerprint,
  oracle: "test",
  status: "fail",
  severity,
  wcag: ["1.1.1"],
  stepIndex: 0,
  message: fingerprint,
  fingerprint,
  evidence: { tabStops: [] },
});
const result = (...findings: Finding[]): JourneyResult => ({
  schemaVersion: 1,
  runId: "run",
  startedAt: "2026-01-01T00:00:00.000Z",
  durationMs: 1,
  journey: { name: "test", start: "https://example.com" },
  status: "completed-with-barriers",
  traces: [],
  findings,
});

describe("baselines and diffs", () => {
  it("creates fingerprint-keyed entries with first-seen metadata", () => {
    const baseline = createBaseline(result(finding("a")), {
      createdAt: "2026-01-02T00:00:00.000Z",
      toolVersion: "1.2.3",
    });
    expect(baseline.findings.a).toMatchObject({
      fingerprint: "a",
      firstSeen: "2026-01-02T00:00:00.000Z",
      toolVersion: "1.2.3",
    });
  });

  it("classifies new, fixed, and unchanged findings", () => {
    const baseline = createBaseline(
      result(finding("unchanged"), finding("fixed")),
    );
    const diff = diffResults(
      result(finding("unchanged"), finding("new")),
      baseline,
    );
    expect(diff.newFindings.map((item) => item.fingerprint)).toEqual(["new"]);
    expect(diff.unchangedFindings.map((item) => item.fingerprint)).toEqual([
      "unchanged",
    ]);
    expect(diff.fixedFindings.map((item) => item.fingerprint)).toEqual([
      "fixed",
    ]);
  });

  it("gates all findings without a baseline, but only new findings with one", () => {
    const baseline = createBaseline(result(finding("old")));
    expect(
      gateResult(result(finding("old")), { failOn: "error", baseline }).passed,
    ).toBe(true);
    expect(
      gateResult(result(finding("new")), { failOn: "error", baseline }).passed,
    ).toBe(false);
    expect(gateResult(result(finding("old")), { failOn: "error" }).passed).toBe(
      false,
    );
    expect(
      gateResult(result(finding("minor", "minor")), { failOn: "warning" })
        .passed,
    ).toBe(true);
  });
});
