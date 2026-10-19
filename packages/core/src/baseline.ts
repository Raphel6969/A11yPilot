import { readFile, writeFile } from "node:fs/promises";
import type { Finding, JourneyResult, Severity } from "./model.js";

/** A finding persisted in a baseline. The original finding is retained for useful fixed output. */
export type BaselineFinding = {
  fingerprint: string;
  firstSeen: string;
  toolVersion: string;
  finding: Finding;
};

export type Baseline = {
  schemaVersion: 1;
  createdAt: string;
  toolVersion: string;
  findings: Record<string, BaselineFinding>;
};

export type BaselineOptions = {
  toolVersion?: string;
  createdAt?: string;
};

export type FindingChange = "new" | "fixed" | "unchanged";
export type ClassifiedFinding = Finding & { change: "new" | "unchanged" };

export type DiffResult = {
  newFindings: ClassifiedFinding[];
  fixedFindings: BaselineFinding[];
  unchangedFindings: ClassifiedFinding[];
  /** All current findings, annotated with their change where applicable. */
  findings: ClassifiedFinding[];
};

export const severityRanks: Readonly<Record<Severity, number>> = {
  info: 1,
  minor: 2,
  warning: 3,
  moderate: 3,
  error: 4,
  serious: 4,
  critical: 5,
};

/** Returns a stable comparable rank for every current and legacy severity. */
export function severityRank(severity: Severity): number {
  return severityRanks[severity];
}

export function createBaseline(
  result: Pick<JourneyResult, "findings">,
  options: BaselineOptions = {},
): Baseline {
  const createdAt = options.createdAt ?? new Date().toISOString();
  const toolVersion = options.toolVersion ?? "unknown";
  const findings: Record<string, BaselineFinding> = {};
  for (const finding of result.findings) {
    if (findings[finding.fingerprint]) continue;
    findings[finding.fingerprint] = {
      fingerprint: finding.fingerprint,
      firstSeen: createdAt,
      toolVersion,
      finding,
    };
  }
  return { schemaVersion: 1, createdAt, toolVersion, findings };
}

export function serializeBaseline(baseline: Baseline): string {
  return `${JSON.stringify(baseline, null, 2)}\n`;
}

export function parseBaseline(value: string): Baseline {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object")
    throw new Error("Invalid baseline");
  const candidate = parsed as Partial<Baseline>;
  if (
    candidate.schemaVersion !== 1 ||
    typeof candidate.createdAt !== "string" ||
    typeof candidate.toolVersion !== "string" ||
    !candidate.findings ||
    typeof candidate.findings !== "object"
  ) {
    throw new Error("Invalid baseline");
  }
  return candidate as Baseline;
}

export async function readBaseline(path: string): Promise<Baseline> {
  return parseBaseline(await readFile(path, "utf8"));
}

export async function writeBaseline(
  path: string,
  baseline: Baseline,
): Promise<void> {
  await writeFile(path, serializeBaseline(baseline), "utf8");
}

export function diffResults(
  result: Pick<JourneyResult, "findings">,
  baseline: Baseline,
): DiffResult {
  const current = new Map(
    result.findings.map((finding) => [finding.fingerprint, finding]),
  );
  const newFindings: ClassifiedFinding[] = [];
  const unchangedFindings: ClassifiedFinding[] = [];
  for (const finding of result.findings) {
    const classified = {
      ...finding,
      change: baseline.findings[finding.fingerprint] ? "unchanged" : "new",
    } as ClassifiedFinding;
    (classified.change === "new" ? newFindings : unchangedFindings).push(
      classified,
    );
  }
  const fixedFindings = Object.values(baseline.findings).filter(
    (entry) => !current.has(entry.fingerprint),
  );
  return {
    newFindings,
    fixedFindings,
    unchangedFindings,
    findings: [...newFindings, ...unchangedFindings],
  };
}

export type GateOptions = {
  /** Findings at this severity or above fail the gate. Defaults to error. */
  failOn?: Severity;
  baseline?: Baseline;
};

export type GateResult = {
  passed: boolean;
  failedFindings: Finding[];
  diff?: DiffResult;
};

export function gateResult(
  result: Pick<JourneyResult, "findings">,
  options: GateOptions = {},
): GateResult {
  const threshold = severityRank(options.failOn ?? "error");
  const diff = options.baseline
    ? diffResults(result, options.baseline)
    : undefined;
  const candidates = options.baseline ? diff!.newFindings : result.findings;
  const failedFindings = candidates.filter(
    (finding) =>
      finding.status === "fail" && severityRank(finding.severity) >= threshold,
  );
  return {
    passed: failedFindings.length === 0,
    failedFindings,
    ...(diff ? { diff } : {}),
  };
}
