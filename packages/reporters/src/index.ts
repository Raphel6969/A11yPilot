import type { RunResult } from "@a11ypilot/core";
export function jsonReport(result: RunResult): string {
  return JSON.stringify(result, null, 2);
}
const escape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
export function htmlReport(result: RunResult): string {
  const rows = result.findings
    .map(
      (f) =>
        `<tr><td>${escape(f.stepId)}</td><td>${escape(f.oracle)}</td><td>${escape(f.outcome)}</td><td>${escape(f.severity)}</td><td>${escape(f.message)}</td></tr>`,
    )
    .join("");
  return `<!doctype html><meta charset="utf-8"><title>A11yPilot - ${escape(result.journey.name)}</title><h1>${escape(result.journey.name)}</h1><p>Status: <strong>${escape(result.status)}</strong></p><table><thead><tr><th>Step</th><th>Oracle</th><th>Outcome</th><th>Severity</th><th>Message</th></tr></thead><tbody>${rows}</tbody></table>`;
}
export function sarifReport(result: RunResult): string {
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
