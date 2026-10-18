import type { RunResult } from "../result/model.js";
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
