export type Status = "pass" | "fail" | "needs-review";
/** @deprecated Use Status. */
export type Outcome = Status;
export type Severity =
  | "critical"
  | "serious"
  | "moderate"
  | "minor"
  // Compatibility values used by the original reachability report.
  | "info"
  | "warning"
  | "error";
export type Evidence = {
  tabStops: string[];
  focused?: string;
  focusVisible?: boolean;
  screenshot?: string;
  accessibilitySnapshot?: string;
};
export type Finding = {
  id: string;
  oracle: string;
  status: Status;
  severity: Severity;
  wcag: string[];
  stepIndex: number;
  message: string;
  fix?: string;
  fingerprint: string;
  evidence: Evidence;
  // Compatibility aliases retained for existing consumers and reports.
  stepId?: string;
  outcome?: Outcome;
  recommendation?: string;
  screenshot?: string;
  accessibilityTree?: string;
};
export type ActionTrace = {
  stepId: string;
  action: string;
  target?: string;
  startedAt: string;
  durationMs: number;
  focus?: string;
  tabStops: string[];
  screenshot?: string;
  accessibilitySnapshot?: string;
};
export type JourneyResult = {
  schemaVersion: 1;
  runId: string;
  startedAt: string;
  durationMs: number;
  journey: { name: string; start: string };
  status: "completed" | "completed-with-barriers" | "blocked";
  traces: ActionTrace[];
  findings: Finding[];
};
/** @deprecated Use JourneyResult. */
export type RunResult = JourneyResult;
export function statusFor(findings: Finding[]): JourneyResult["status"] {
  return findings.some(
    (f) =>
      f.status === "fail" &&
      (f.severity === "error" ||
        f.severity === "critical" ||
        f.severity === "serious"),
  )
    ? "blocked"
    : findings.some((f) => f.status === "fail")
      ? "completed-with-barriers"
      : "completed";
}
