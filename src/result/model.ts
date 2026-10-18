export type Outcome = "pass" | "fail" | "needs-review";
export type Severity = "info" | "warning" | "error" | "critical";
export type Finding = {
  id: string;
  stepId: string;
  oracle: string;
  outcome: Outcome;
  severity: Severity;
  wcag?: string;
  message: string;
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
};
export type RunResult = {
  schemaVersion: 1;
  runId: string;
  startedAt: string;
  durationMs: number;
  journey: { name: string; start: string };
  status: "completed" | "completed-with-barriers" | "blocked";
  traces: ActionTrace[];
  findings: Finding[];
};
export function statusFor(findings: Finding[]): RunResult["status"] {
  return findings.some(
    (f) =>
      f.outcome === "fail" &&
      (f.severity === "error" || f.severity === "critical"),
  )
    ? "blocked"
    : findings.some((f) => f.outcome === "fail")
      ? "completed-with-barriers"
      : "completed";
}
