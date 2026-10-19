import type { Page } from "playwright-core";
import type { ErrorEvidence, Finding, Status } from "./model.js";
import type { FocusStop } from "./runner.js";
import type { NormalizedStep, StatusExpectation, Target } from "./schema.js";

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
  errorBefore?: ErrorEvidence;
  errorAfter?: ErrorEvidence;
  status?: StatusObservation;
};
export type StatusObservation = {
  exists: boolean;
  role?: string;
  text?: string;
  live?: string;
  semantic: boolean;
  focused: boolean;
  changed?: boolean;
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
    fingerprint: stableFingerprint({
      oracle,
      target: context.target,
      expectDialog:
        "expectDialog" in context.step.action
          ? context.step.action.expectDialog
          : undefined,
      expectStatus:
        "expectStatus" in context.step.action
          ? context.step.action.expectStatus
          : undefined,
      expectError:
        "expectError" in context.step.action
          ? context.step.action.expectError
          : undefined,
    }),
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

export const errorIdentificationOracle: Oracle = {
  id: "error-identification",
  evaluate(context) {
    const action = context.step.action;
    if (!("expectError" in action) || action.expectError === undefined)
      return undefined;
    const evidence = context.errorAfter;
    const evidenceForFinding = {
      tabStops: context.tabStops.map((stop) => stop.selector),
      focused: context.focused?.selector,
      error: evidence,
    };
    if (evidence === undefined || context.reached !== true) {
      return oracleFinding(
        context,
        "error-identification",
        "needs-review",
        "The field or its post-submission error state was not captured, so error identification could not be judged.",
        ["3.3.1"],
        "warning",
        evidenceForFinding,
        "Capture the field state and related error or description content after keyboard submission.",
      );
    }
    const fieldError =
      (evidence.field.ariaInvalid === true &&
        evidence.descriptions.length > 0) ||
      Boolean(evidence.field.errorMessage) ||
      Boolean(evidence.field.validationMessage) ||
      evidence.errors.length > 0;
    const announced =
      evidence.field.describedBy.length > 0 ||
      Boolean(evidence.field.errorMessage) ||
      evidence.liveRegions.some((region) => region.text.length > 0);
    if (!fieldError) {
      return oracleFinding(
        context,
        "error-identification",
        "fail",
        "Submitting the form did not expose an identifiable error for the field.",
        ["3.3.1"],
        "serious",
        evidenceForFinding,
        "Expose a specific error message and associate it with the invalid field.",
      );
    }
    if (action.expectError.announced === true && !announced) {
      return oracleFinding(
        context,
        "error-identification",
        "fail",
        "An error was exposed, but no programmatic description or live-region announcement was captured.",
        ["3.3.1"],
        "serious",
        evidenceForFinding,
        "Associate the error with the field using an accessible description or announce it in a live region.",
      );
    }
    return oracleFinding(
      context,
      "error-identification",
      "pass",
      "The submitted field exposed an identifiable error state and related evidence.",
      ["3.3.1"],
      "info",
      evidenceForFinding,
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

export const focusReturnOracle: Oracle = {
  id: "focus-return",
  evaluate(context) {
    const action = context.step.action;
    if (!("expectDialog" in action) || action.expectDialog === undefined)
      return undefined;
    const previousFocus = context.previousFocus?.selector;
    const focused = context.focused?.selector;
    const evidence = {
      tabStops: context.tabStops.map((stop) => stop.selector),
      focused,
      previousFocus,
    };
    if (
      !context.reached ||
      previousFocus === undefined ||
      focused === undefined
    ) {
      return oracleFinding(
        context,
        "focus-return",
        "needs-review",
        "The dialog trigger or post-close focus was not captured, so focus return could not be judged.",
        ["2.4.3"],
        "warning",
        evidence,
        "Capture the trigger focus and the focused element after closing the dialog.",
      );
    }
    const returned = focused === previousFocus;
    const expected = action.expectDialog.focusReturns;
    const passes = returned === expected;
    return oracleFinding(
      context,
      "focus-return",
      passes ? "pass" : "fail",
      passes
        ? expected
          ? "Focus returned to the element that opened the dialog."
          : "Focus did not return to the element that opened the dialog, as expected."
        : expected
          ? "Focus did not return to the element that opened the dialog."
          : "Focus returned to the dialog trigger unexpectedly.",
      ["2.4.3"],
      passes ? "info" : "serious",
      evidence,
      passes
        ? undefined
        : expected
          ? "Return focus to the control that opened the dialog after the dialog closes."
          : "Confirm that the dialog's documented focus destination is intentional and accessible.",
    );
  },
};

function statusMatches(
  expectation: StatusExpectation,
  observed: StatusObservation,
) {
  if (!observed.exists) return false;
  if (expectation.role !== undefined && observed.role !== expectation.role)
    return false;
  const text = observed.text ?? "";
  if (expectation.text !== undefined && text !== expectation.text) return false;
  if (
    expectation.containsText !== undefined &&
    !text.includes(expectation.containsText)
  )
    return false;
  return true;
}

export const statusAnnouncementOracle: Oracle = {
  id: "status-announcement",
  evaluate(context) {
    const action = context.step.action;
    if (!("expectStatus" in action) || action.expectStatus === undefined)
      return undefined;
    const observed = context.status;
    const evidence = {
      tabStops: context.tabStops.map((stop) => stop.selector),
      focused: context.focused?.selector,
      status: observed,
    };
    if (observed === undefined)
      return oracleFinding(
        context,
        "status-announcement",
        "needs-review",
        "The expected status was not observed through the page accessibility bridge.",
        ["4.1.3"],
        "warning",
        evidence,
        "Capture the status through a status, alert, log, aria-live, or focused announcement element after the preceding action.",
      );
    if (!statusMatches(action.expectStatus, observed))
      return oracleFinding(
        context,
        "status-announcement",
        "fail",
        "The expected status announcement was not found.",
        ["4.1.3"],
        "serious",
        evidence,
        "Expose the expected message through an accessible status, alert, log, live region, or focused announcement.",
      );
    if (!observed.semantic && !observed.focused)
      return oracleFinding(
        context,
        "status-announcement",
        "fail",
        "The expected text is present but has no status semantics, live-region exposure, or focus evidence.",
        ["4.1.3"],
        "serious",
        evidence,
        "Use role=status, role=alert, role=log, aria-live, or move focus to the announcement.",
      );
    return oracleFinding(
      context,
      "status-announcement",
      "pass",
      "The expected status was observed with accessibility announcement evidence.",
      ["4.1.3"],
      "info",
      evidence,
    );
  },
};

export const defaultOracles: Oracle[] = [
  reachabilityOracle,
  noKeyboardTrapOracle,
  focusVisibleOracle,
  focusReturnOracle,
  statusAnnouncementOracle,
  errorIdentificationOracle,
];
