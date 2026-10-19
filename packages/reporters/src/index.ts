type ReporterResult = {
  journey: { name: string };
  status: string;
  findings: Array<{
    stepId?: string;
    oracle: string;
    outcome?: string;
    severity: string;
    message: string;
    id: string;
    wcag?: string[];
  }>;
};
export type DiffReport = {
  newFindings: Array<{
    fingerprint: string;
    severity: string;
    message: string;
  }>;
  fixedFindings: Array<{
    fingerprint: string;
    finding?: { severity?: string; message?: string };
  }>;
  unchangedFindings: Array<{
    fingerprint: string;
    severity: string;
    message: string;
  }>;
};
export function jsonReport(result: ReporterResult): string {
  return JSON.stringify(result, null, 2);
}
const escape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
export function htmlReport(result: ReporterResult): string {
  const rows = result.findings
    .map(
      (f) =>
        `<tr><td>${escape(f.stepId ?? "")}</td><td>${escape(f.oracle)}</td><td>${escape(f.outcome ?? "")}</td><td>${escape(f.severity)}</td><td>${escape(f.message)}</td></tr>`,
    )
    .join("");
  return `<!doctype html><meta charset="utf-8"><title>A11yPilot - ${escape(result.journey.name)}</title><h1>${escape(result.journey.name)}</h1><p>Status: <strong>${escape(result.status)}</strong></p><table><thead><tr><th>Step</th><th>Oracle</th><th>Outcome</th><th>Severity</th><th>Message</th></tr></thead><tbody>${rows}</tbody></table>`;
}
export function sarifReport(result: ReporterResult): string {
  return JSON.stringify(
    {
      version: "2.1.0",
      $schema: "https://json.schemastore.org/sarif-2.1.0.json",
      runs: [
        {
          tool: {
            driver: {
              name: "A11yPilot",
              informationUri: "https://github.com/a11ypilot",
            },
          },
          results: result.findings
            .filter((f) => f.outcome === "fail")
            .map((f) => ({
              ruleId: f.id,
              level:
                f.severity === "critical" || f.severity === "error"
                  ? "error"
                  : "warning",
              message: { text: f.message },
              properties: { stepId: f.stepId, oracle: f.oracle, wcag: f.wcag },
            })),
        },
      ],
    },
    null,
    2,
  );
}

export function diffJsonReport(diff: DiffReport): string {
  return JSON.stringify(diff, null, 2);
}

export function diffSummaryReport(diff: DiffReport): string {
  const lines = [
    `New findings: ${diff.newFindings.length}`,
    `Fixed findings: ${diff.fixedFindings.length}`,
    `Unchanged findings: ${diff.unchangedFindings.length}`,
  ];
  if (diff.newFindings.length) {
    lines.push("", "New:");
    for (const finding of diff.newFindings)
      lines.push(
        `- [${finding.severity}] ${finding.fingerprint}: ${finding.message}`,
      );
  }
  if (diff.fixedFindings.length) {
    lines.push("", "Fixed:");
    for (const finding of diff.fixedFindings)
      lines.push(`- ${finding.fingerprint}`);
  }
  return `${lines.join("\n")}\n`;
}
