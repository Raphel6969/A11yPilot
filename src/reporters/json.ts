import type { RunResult } from "../result/model.js";
export function jsonReport(result: RunResult): string {
  return JSON.stringify(result, null, 2);
}
