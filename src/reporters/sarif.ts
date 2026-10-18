import type { RunResult } from "../result/model.js";
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
