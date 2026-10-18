import type { Finding } from "../result/model.js";
export function reachabilityFinding(
  stepId: string,
  target: string,
  reached: boolean,
): Finding {
  return {
    id: `${stepId}-reachability`,
    stepId,
    oracle: "reachability",
    outcome: reached ? "pass" : "fail",
    severity: reached ? "info" : "error",
    wcag: "2.1.1",
    message: reached
      ? `${target} is reachable by keyboard.`
      : `${target} was not reached by keyboard navigation.`,
    recommendation: reached
      ? undefined
      : "Check tabindex, disabled state, and the control’s semantic role.",
  };
}
