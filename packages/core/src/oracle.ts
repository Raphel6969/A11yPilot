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

export const defaultOracles: Oracle[] = [reachabilityOracle];
