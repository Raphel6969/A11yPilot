import { randomUUID } from "node:crypto";
import type { Page } from "playwright-core";
import type { Journey, NormalizedStep, Target } from "./schema.js";
import {
  defaultOracles,
  type AxSnapshot,
  type Oracle,
  type OracleContext,
} from "./oracle.js";
import {
  statusFor,
  type ActionTrace,
  type Finding,
  type RunResult,
} from "./model.js";
import { PlaywrightKeyboardPage } from "./playwright-page.js";
export type FocusStop = { selector: string; role?: string; name?: string };
export interface KeyboardPage {
  keyboard: {
    press(key: string): Promise<void>;
    type(text: string): Promise<void>;
  };
  activeFocus(): Promise<FocusStop | null>;
  observeTarget(
    target: Target,
  ): Promise<{ exists: boolean; focused: boolean; label: string }>;
  goto(url: string): Promise<void>;
  screenshot(path: string): Promise<void>;
}
export class KeyboardNavigator {
  constructor(private readonly page: KeyboardPage) {}
  async reach(
    target: Target,
    maxStops: number,
  ): Promise<{
    reached: boolean;
    stops: FocusStop[];
    focused: FocusStop | null;
  }> {
    const stops: FocusStop[] = [];
    for (let i = 0; i < maxStops; i += 1) {
      await this.page.keyboard.press("Tab");
      const focus = await this.page.activeFocus();
      if (focus) stops.push(focus);
      if ((await this.page.observeTarget(target)).focused)
        return { reached: true, stops, focused: focus };
    }
    return { reached: false, stops, focused: null };
  }
  async type(text: string): Promise<void> {
    await this.page.keyboard.type(text);
  }
  async press(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }
}
const targetText = (target: Target) => `${target.role} "${target.name}"`;
export type RunJourneyOptions = {
  oracles?: Oracle[];
  evidenceDir?: string;
  baseline?: string;
};

async function evaluateOracles(
  oracles: Oracle[],
  context: OracleContext,
): Promise<Finding[]> {
  const results = await Promise.all(
    oracles.map((oracle) => oracle.evaluate(context)),
  );
  return results.flatMap((result) =>
    result === undefined ? [] : Array.isArray(result) ? result : [result],
  );
}

async function executeJourney(
  journey: Journey,
  steps: NormalizedStep[],
  page: KeyboardPage,
  browserPage: Page,
  oracles: Oracle[],
): Promise<RunResult> {
  const started = Date.now();
  const navigator = new KeyboardNavigator(page);
  const traces: ActionTrace[] = [];
  const findings: Finding[] = [];
  await page.goto(journey.start);
  for (const [stepIndex, step] of steps.entries()) {
    const stepStarted = Date.now();
    const stops: string[] = [];
    const action =
      Object.keys(step.action).find((key) => key !== "goal") ?? "unknown";
    let target: Target | undefined;
    if ("goto" in step.action && step.action.goto)
      await page.goto(step.action.goto);
    else if ("expect" in step.action && step.action.expect) {
      target = step.action.expect;
      const reached = await navigator.reach(
        target,
        journey.options.maxTabStops,
      );
      stops.push(...reached.stops.map((s) => s.selector));
      findings.push(
        ...(await evaluateOracles(oracles, {
          page: browserPage,
          step,
          stepIndex,
          target,
          reached: reached.reached,
          tabStops: reached.stops,
          focused: reached.focused,
          before: emptySnapshot(),
          after: emptySnapshot(),
        })),
      );
    } else if ("type" in step.action && step.action.type) {
      target = step.action.type.target;
      const reached = await navigator.reach(
        target,
        journey.options.maxTabStops,
      );
      stops.push(...reached.stops.map((s) => s.selector));
      findings.push(
        ...(await evaluateOracles(oracles, {
          page: browserPage,
          step,
          stepIndex,
          target,
          reached: reached.reached,
          tabStops: reached.stops,
          focused: reached.focused,
          before: emptySnapshot(),
          after: emptySnapshot(),
        })),
      );
      if (reached.reached) await navigator.type(step.action.type.text);
    } else if ("activate" in step.action && step.action.activate) {
      target = step.action.activate;
      const reached = await navigator.reach(
        target,
        journey.options.maxTabStops,
      );
      stops.push(...reached.stops.map((s) => s.selector));
      findings.push(
        ...(await evaluateOracles(oracles, {
          page: browserPage,
          step,
          stepIndex,
          target,
          reached: reached.reached,
          tabStops: reached.stops,
          focused: reached.focused,
          before: emptySnapshot(),
          after: emptySnapshot(),
        })),
      );
      if (reached.reached) await navigator.press("Enter");
    } else if ("press" in step.action && step.action.press)
      await navigator.press(step.action.press.key);
    traces.push({
      stepId: step.id,
      action,
      target: target ? targetText(target) : undefined,
      startedAt: new Date().toISOString(),
      durationMs: Date.now() - stepStarted,
      tabStops: stops,
    });
  }
  return {
    schemaVersion: 1,
    runId: randomUUID(),
    startedAt: new Date(started).toISOString(),
    durationMs: Date.now() - started,
    journey: { name: journey.name, start: journey.start },
    status: statusFor(findings),
    traces,
    findings,
  };
}

const emptySnapshot = (): AxSnapshot => ({ children: [] });

export async function runJourney(
  page: Page,
  loaded: { journey: Journey; steps: NormalizedStep[] },
  options: RunJourneyOptions = {},
): Promise<RunResult> {
  return executeJourney(
    loaded.journey,
    loaded.steps,
    new PlaywrightKeyboardPage(page),
    page,
    options.oracles ?? defaultOracles,
  );
}
