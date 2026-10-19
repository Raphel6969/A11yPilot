import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const directory = await mkdtemp(join(tmpdir(), "a11ypilot-baseline-"));
try {
  const result = (findings) => ({
    schemaVersion: 1,
    runId: "smoke",
    startedAt: "2026-01-01T00:00:00.000Z",
    durationMs: 1,
    journey: { name: "seeded baseline demo", start: "http://example.test" },
    status: "completed-with-barriers",
    traces: [],
    findings,
  });
  const finding = (fingerprint, severity = "serious") => ({
    id: fingerprint,
    oracle: "smoke",
    status: "fail",
    severity,
    wcag: [],
    stepIndex: 0,
    message: fingerprint,
    fingerprint,
    evidence: { tabStops: [] },
  });
  // Seed a prior run with an accepted legacy serious finding and a defect that
  // is fixed in the later run. The later run also introduces a critical defect.
  const before = join(directory, "before.json");
  const after = join(directory, "after.json");
  const baseline = join(directory, "baseline.json");
  await writeFile(
    before,
    JSON.stringify(
      result([
        finding("legacy-serious"),
        finding("fixed-critical", "critical"),
      ]),
    ),
    "utf8",
  );
  await writeFile(
    after,
    JSON.stringify(
      result([finding("legacy-serious"), finding("new-critical", "critical")]),
    ),
    "utf8",
  );
  const cli = "packages/cli/dist/cli.js";
  execFileSync(
    process.execPath,
    [cli, "baseline", before, "--output", baseline],
    { stdio: "inherit" },
  );
  const saved = JSON.parse(await readFile(baseline, "utf8"));
  if (!saved.findings["legacy-serious"] || !saved.findings["fixed-critical"])
    throw new Error("baseline did not contain all seeded findings");

  const diff = JSON.parse(
    execFileSync(
      process.execPath,
      [cli, "diff", baseline, after, "--format", "json"],
      { encoding: "utf8" },
    ),
  );
  if (
    !diff.unchangedFindings.some(
      ({ fingerprint }) => fingerprint === "legacy-serious",
    )
  )
    throw new Error("diff did not classify the legacy finding as unchanged");
  if (
    !diff.newFindings.some(({ fingerprint }) => fingerprint === "new-critical")
  )
    throw new Error("diff did not report the new critical finding");
  if (
    !diff.fixedFindings.some(
      ({ fingerprint }) => fingerprint === "fixed-critical",
    )
  )
    throw new Error("diff did not report the fixed finding");

  const { gateResult } = await import("../packages/core/dist/index.js");
  const legacyGate = gateResult(result([finding("legacy-serious")]), {
    baseline: saved,
    failOn: "serious",
  });
  if (!legacyGate.passed)
    throw new Error("an unchanged baselined serious finding failed the gate");
  const newGate = gateResult(
    result([finding("legacy-serious"), finding("new-critical", "critical")]),
    {
      baseline: saved,
      failOn: "serious",
    },
  );
  if (
    newGate.passed ||
    newGate.failedFindings[0]?.fingerprint !== "new-critical"
  )
    throw new Error("a new critical finding did not fail the baselined gate");
  console.log(
    "Baseline CLI regression smoke passed (created, unchanged, new, fixed)",
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
