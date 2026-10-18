import { expect, it } from "vitest";
import { reachabilityFinding } from "../../packages/core/src/index.js";
it("creates deterministic blocking finding for unreachable targets", () => {
  const finding = reachabilityFinding("step-001", 'button "Submit"', false);
  expect(finding).toMatchObject({
    id: "step-001-reachability",
    outcome: "fail",
    severity: "error",
    wcag: "2.1.1",
  });
});
