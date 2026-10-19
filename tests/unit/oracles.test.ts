import { describe, expect, it } from "vitest";
import {
  defaultOracles,
  focusVisibleOracle,
  focusReturnOracle,
  noKeyboardTrapOracle,
  reachabilityOracle,
  reachabilityFinding,
  stableFingerprint,
} from "../../packages/core/src/index.js";

const step = {
  id: "step-001",
  action: { expect: { role: "button", name: "Submit" } },
} as const;

describe("evidence-backed oracle foundation", () => {
  const context = {
    page: undefined as never,
    step,
    stepIndex: 0,
    target: step.action.expect,
    before: { children: [] },
    after: { children: [] },
  };

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

  it("reports a repeated focus stop as a keyboard trap", () => {
    const finding = noKeyboardTrapOracle.evaluate({
      ...context,
      reached: false,
      tabStops: [{ selector: "#dialog" }, { selector: "#dialog" }],
      focused: { selector: "#dialog" },
    });
    expect(finding).toMatchObject({
      oracle: "no-keyboard-trap",
      status: "fail",
      wcag: ["2.1.2"],
      evidence: { tabStops: ["#dialog", "#dialog"] },
    });
  });

  it("keeps an incomplete non-repeating traversal at needs-review", () => {
    const finding = noKeyboardTrapOracle.evaluate({
      ...context,
      reached: false,
      tabStops: [{ selector: "#first" }, { selector: "#second" }],
      focused: { selector: "#second" },
    });
    expect(finding).toMatchObject({
      oracle: "no-keyboard-trap",
      status: "needs-review",
    });
  });

  it("reports captured visible focus as pass and absent focus styling as fail", () => {
    const focused = { selector: "#submit" };
    expect(
      focusVisibleOracle.evaluate({
        ...context,
        reached: true,
        tabStops: [focused],
        focused,
        focusVisible: true,
      }),
    ).toMatchObject({
      oracle: "focus-visible",
      status: "pass",
      evidence: { focused: "#submit", focusVisible: true },
    });
    expect(
      focusVisibleOracle.evaluate({
        ...context,
        reached: true,
        tabStops: [focused],
        focused,
        focusVisible: false,
      }),
    ).toMatchObject({ oracle: "focus-visible", status: "fail" });
  });

  it("does not infer focus visibility when the browser state was not captured", () => {
    const finding = focusVisibleOracle.evaluate({
      ...context,
      reached: true,
      tabStops: [{ selector: "#submit" }],
      focused: { selector: "#submit" },
    });
    expect(finding).toMatchObject({
      oracle: "focus-visible",
      status: "needs-review",
    });
  });

  describe("focus return", () => {
    const dialogStep = {
      id: "step-001",
      action: {
        expectDialog: {
          opensFrom: { role: "button", name: "Details" },
          closesWith: "Escape",
          focusReturns: true,
        },
      },
    } as const;
    const dialogContext = {
      page: undefined as never,
      step: dialogStep,
      stepIndex: 0,
      target: dialogStep.action.expectDialog.opensFrom,
      reached: true,
      tabStops: [{ selector: "#details" }, { selector: "#close" }],
      before: { children: [] },
      after: { children: [] },
    };

    it("passes when close returns focus to the trigger", () => {
      expect(
        focusReturnOracle.evaluate({
          ...dialogContext,
          previousFocus: { selector: "#details" },
          focused: { selector: "#details" },
        }),
      ).toMatchObject({
        oracle: "focus-return",
        status: "pass",
        wcag: ["2.4.3"],
        evidence: {
          tabStops: ["#details", "#close"],
          focused: "#details",
          previousFocus: "#details",
        },
      });
    });

    it("fails when close leaves focus elsewhere", () => {
      expect(
        focusReturnOracle.evaluate({
          ...dialogContext,
          previousFocus: { selector: "#details" },
          focused: { selector: "#after" },
        }),
      ).toMatchObject({ oracle: "focus-return", status: "fail" });
    });

    it("needs review when the post-close focus was not captured", () => {
      expect(
        focusReturnOracle.evaluate({
          ...dialogContext,
          previousFocus: { selector: "#details" },
        }),
      ).toMatchObject({ oracle: "focus-return", status: "needs-review" });
    });
  });
});
