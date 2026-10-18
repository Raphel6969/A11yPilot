import { describe, expect, it } from "vitest";
import {
  defaultOracles,
  reachabilityOracle,
  reachabilityFinding,
  stableFingerprint,
} from "../../packages/core/src/index.js";

const step = {
  id: "step-001",
  action: { expect: { role: "button", name: "Submit" } },
} as const;

describe("evidence-backed oracle foundation", () => {
  it("produces stable fingerprints for equivalent inputs", () => {
    expect(
      reachabilityFinding("step-001", 'button "Submit"', false, {}, 0)
        .fingerprint,
    ).toBe(
      reachabilityFinding("step-002", 'button "Submit"', false, {}, 8)
        .fingerprint,
    );
  });

  it("executes the default reachability oracle with observed evidence", async () => {
    expect(defaultOracles).toContain(reachabilityOracle);
    const finding = await reachabilityOracle.evaluate({
      page: undefined as never,
      step,
      stepIndex: 0,
      target: step.action.expect,
      reached: false,
      tabStops: [{ selector: "#cancel" }],
      focused: { selector: "#cancel" },
      before: { children: [] },
      after: { children: [] },
    });
    expect(finding).toMatchObject({
      oracle: "reachability",
      status: "fail",
      stepIndex: 0,
      evidence: { tabStops: ["#cancel"], focused: "#cancel" },
    });
  });
});
