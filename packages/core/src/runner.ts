import { randomUUID } from "node:crypto";
import type { Page } from "playwright-core";
import type { Journey, NormalizedStep, Target } from "./schema.js";
import { reachabilityFinding } from "./oracle.js";
import { statusFor, type ActionTrace, type RunResult } from "./model.js";
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
  ): Promise<{ reached: boolean; stops: FocusStop[] }> {
    const stops: FocusStop[] = [];
    for (let i = 0; i < maxStops; i += 1) {
      await this.page.keyboard.press("Tab");
      const focus = await this.page.activeFocus();
      if (focus) stops.push(focus);
      if ((await this.page.observeTarget(target)).focused)
        return { reached: true, stops };
    }
    return { reached: false, stops };
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
  oracles?: unknown[];
  evidenceDir?: string;
  baseline?: string;
};

async function executeJourney(
  journey: Journey,
  steps: NormalizedStep[],
  page: KeyboardPage,
): Promise<RunResult> {
  const started = Date.now();
  const navigator = new KeyboardNavigator(page);
  const traces: ActionTrace[] = [];
  const findings = [];
  await page.goto(journey.start);
  for (const step of steps) {
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
        reachabilityFinding(step.id, targetText(target), reached.reached),
      );
    } else if ("type" in step.action && step.action.type) {
      target = step.action.type.target;
      const reached = await navigator.reach(
        target,
        journey.options.maxTabStops,
      );
      stops.push(...reached.stops.map((s) => s.selector));
      findings.push(
        reachabilityFinding(step.id, targetText(target), reached.reached),
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
        reachabilityFinding(step.id, targetText(target), reached.reached),
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

export async function runJourney(
  page: Page,
  loaded: { journey: Journey; steps: NormalizedStep[] },
  _options: RunJourneyOptions = {},
): Promise<RunResult> {
  return executeJourney(
    loaded.journey,
    loaded.steps,
    new PlaywrightKeyboardPage(page),
  );
}
