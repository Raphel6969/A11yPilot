import type { Page } from "playwright-core";
import type { Finding, Status } from "./model.js";
import type { FocusStop } from "./runner.js";
import type { NormalizedStep, Target } from "./schema.js";

export type OracleContext = {
  page: Page;
  step: NormalizedStep;
  stepIndex: number;
  target?: Target;
  reached?: boolean;
  tabStops: FocusStop[];
  focused?: FocusStop | null;
  focusVisible?: boolean | null;
  before: AxSnapshot;
  after: AxSnapshot;
  previousFocus?: FocusStop;
};
export type AxSnapshot = {
  role?: string;
  name?: string;
  state?: Record<string, string | boolean | number | undefined>;
  children?: AxSnapshot[];
};
export interface Oracle {
  id: string;
  evaluate(
    context: OracleContext,
  ): Finding | Finding[] | undefined | Promise<Finding | Finding[] | undefined>;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function stableFingerprint(value: unknown): string {
  const text = canonical(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fp-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function reachabilityFinding(
  stepId: string,
  target: string,
  reached: boolean,
  evidence: { tabStops?: string[]; focused?: string } = {},
  stepIndex = 0,
): Finding {
  const status: Status = reached ? "pass" : "fail";
  const fix = reached
    ? undefined
    : "Check tabindex, disabled state, and the control’s semantic role.";
  const severity: Finding["severity"] = reached ? "info" : "error";
  const finding = {
    id: `${stepId}-reachability`,
    oracle: "reachability",
    status,
    severity,
    wcag: ["2.1.1"],
    stepIndex,
    message: reached
      ? `${target} is reachable by keyboard.`
      : `${target} was not reached by keyboard navigation.`,
    fix,
    evidence: { tabStops: evidence.tabStops ?? [], focused: evidence.focused },
  };
  return {
    ...finding,
    fingerprint: stableFingerprint({
      oracle: finding.oracle,
      target,
    }),
    stepId,
    outcome: status,
    recommendation: fix,
  };
}

export const reachabilityOracle: Oracle = {
  id: "reachability",
  evaluate(context) {
    if (context.target === undefined || context.reached === undefined)
      return undefined;
    return reachabilityFinding(
      context.step.id,
      `${context.target.role} "${context.target.name}"`,
      context.reached,
      {
        tabStops: context.tabStops.map((stop) => stop.selector),
        focused: context.focused?.selector,
      },
      context.stepIndex,
    );
  },
};

function oracleFinding(
  context: OracleContext,
  oracle: string,
  status: Status,
  message: string,
  wcag: string[],
  severity: Finding["severity"],
  evidence: Finding["evidence"],
  fix?: string,
): Finding {
  const finding = {
    id: `${context.step.id}-${oracle}`,
    oracle,
    status,
    severity,
    wcag,
    stepIndex: context.stepIndex,
    message,
    fix,
    evidence,
  };
  return {
    ...finding,
    fingerprint: stableFingerprint({ oracle, target: context.target }),
    stepId: context.step.id,
    outcome: status,
    recommendation: fix,
  };
}

export const noKeyboardTrapOracle: Oracle = {
  id: "no-keyboard-trap",
  evaluate(context) {
    const tabStops = context.tabStops.map((stop) => stop.selector);
    const focusKeys = context.tabStops.map(
      (stop) => `${stop.selector}|${stop.role ?? ""}|${stop.name ?? ""}`,
    );
    const evidence = {
      tabStops,
      focused: context.focused?.selector,
      focusVisible: context.focusVisible ?? undefined,
    };
    if (tabStops.length === 0) {
      return oracleFinding(
        context,
        "no-keyboard-trap",
        "needs-review",
        "There were no observed focus stops, so keyboard-trap behavior could not be judged.",
        ["2.1.2"],
        "warning",
        evidence,
        "Capture a keyboard traversal with at least one observed focus stop and verify that focus can move onward or leave the component.",
      );
    }

    const repeatedFocus = focusKeys.some(
      (focusKey, index) => index > 0 && focusKey === focusKeys[index - 1],
    );
    if (repeatedFocus) {
      return oracleFinding(
        context,
        "no-keyboard-trap",
        "fail",
        "Keyboard focus remained on the same element across consecutive Tab stops.",
        ["2.1.2"],
        "serious",
        evidence,
        "Ensure Tab moves focus onward and that users can leave the component with standard keyboard navigation.",
      );
    }

    if (context.reached === true) {
      return oracleFinding(
        context,
        "no-keyboard-trap",
        "pass",
        "Observed keyboard focus advanced through distinct stops to the target.",
        ["2.1.2"],
        "info",
        evidence,
      );
    }
    return oracleFinding(
      context,
      "no-keyboard-trap",
      "needs-review",
      "Focus advanced through distinct stops, but the available traversal did not establish that users can leave the component.",
      ["2.1.2"],
      "warning",
      evidence,
      "Verify manually that keyboard focus can leave the component in every direction required by the interaction.",
    );
  },
};

export const focusVisibleOracle: Oracle = {
  id: "focus-visible",
  evaluate(context) {
    const evidence = {
      tabStops: context.tabStops.map((stop) => stop.selector),
      focused: context.focused?.selector,
      focusVisible: context.focusVisible ?? undefined,
    };
    if (context.focused == null || context.focusVisible == null) {
      return oracleFinding(
        context,
        "focus-visible",
        "needs-review",
        "The focused element or its focus-visible state was not captured, so visible focus could not be judged.",
        ["2.4.7"],
        "warning",
        evidence,
        "Capture the active element and its :focus-visible state after keyboard navigation.",
      );
    }
    return oracleFinding(
      context,
      "focus-visible",
      context.focusVisible ? "pass" : "fail",
      context.focusVisible
        ? "The focused element matches :focus-visible."
        : "The focused element does not match :focus-visible.",
      ["2.4.7"],
      context.focusVisible ? "info" : "serious",
      evidence,
      context.focusVisible
        ? undefined
        : "Provide a visible focus indicator for keyboard-focused elements without relying on color alone.",
    );
  },
};

export const defaultOracles: Oracle[] = [
  reachabilityOracle,
  noKeyboardTrapOracle,
  focusVisibleOracle,
];
