import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type { Page } from "playwright-core";
import type {
  Journey,
  NormalizedStep,
  StatusExpectation,
  Target,
} from "./schema.js";
import {
  defaultOracles,
  type AxSnapshot,
  type Oracle,
  type OracleContext,
  type StatusObservation,
} from "./oracle.js";
import {
  statusFor,
  type ActionTrace,
  type Finding,
  type RunResult,
} from "./model.js";
import type { ErrorEvidence } from "./model.js";
import { PlaywrightKeyboardPage } from "./playwright-page.js";
export type FocusStop = { selector: string; role?: string; name?: string };
export interface KeyboardPage {
  keyboard: {
    press(key: string): Promise<void>;
    type(text: string): Promise<void>;
  };
  activeFocus(): Promise<FocusStop | null>;
  focusVisible?(): Promise<boolean | null>;
  observeTarget(
    target: Target,
  ): Promise<{ exists: boolean; focused: boolean; label: string }>;
  goto(url: string): Promise<void>;
  screenshot(path: string): Promise<void>;
  accessibilitySnapshot?(): Promise<AxSnapshot | null>;
  observeError?(target: Target): Promise<ErrorEvidence>;
  observeStatus?(
    expectation: StatusExpectation,
  ): Promise<StatusObservation | null>;
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
  evidenceDir?: string,
): Promise<RunResult> {
  const started = Date.now();
  const navigator = new KeyboardNavigator(page);
  const traces: ActionTrace[] = [];
  const findings: Finding[] = [];
  let lastUserAction = false;
  await page.goto(journey.start);
  for (const [stepIndex, step] of steps.entries()) {
    const stepStarted = Date.now();
    const stops: string[] = [];
    const action =
      Object.keys(step.action).find((key) => key !== "goal") ?? "unknown";
    let target: Target | undefined;
    let stepFindings: Finding[] = [];
    if ("goto" in step.action && step.action.goto)
      await page.goto(step.action.goto);
    else if ("expect" in step.action && step.action.expect) {
      target = step.action.expect;
      const reached = await navigator.reach(
        target,
        journey.options.maxTabStops,
      );
      stops.push(...reached.stops.map((s) => s.selector));
      stepFindings = await evaluateOracles(oracles, {
        page: browserPage,
        step,
        stepIndex,
        target,
        reached: reached.reached,
        tabStops: reached.stops,
        focused: reached.focused,
        focusVisible: page.focusVisible ? await page.focusVisible() : null,
        before: emptySnapshot(),
        after: emptySnapshot(),
      });
    } else if ("type" in step.action && step.action.type) {
      target = step.action.type.target;
      const reached = await navigator.reach(
        target,
        journey.options.maxTabStops,
      );
      stops.push(...reached.stops.map((s) => s.selector));
      stepFindings = await evaluateOracles(oracles, {
        page: browserPage,
        step,
        stepIndex,
        target,
        reached: reached.reached,
        tabStops: reached.stops,
        focused: reached.focused,
        focusVisible: page.focusVisible ? await page.focusVisible() : null,
        before: emptySnapshot(),
        after: emptySnapshot(),
      });
      if (reached.reached) {
        await navigator.type(step.action.type.text);
        lastUserAction = true;
      }
    } else if ("activate" in step.action && step.action.activate) {
      target = step.action.activate;
      const reached = await navigator.reach(
        target,
        journey.options.maxTabStops,
      );
      stops.push(...reached.stops.map((s) => s.selector));
      stepFindings = await evaluateOracles(oracles, {
        page: browserPage,
        step,
        stepIndex,
        target,
        reached: reached.reached,
        tabStops: reached.stops,
        focused: reached.focused,
        focusVisible: page.focusVisible ? await page.focusVisible() : null,
        before: emptySnapshot(),
        after: emptySnapshot(),
      });
      if (reached.reached) {
        await navigator.press("Enter");
        lastUserAction = true;
      }
    } else if ("expectError" in step.action && step.action.expectError) {
      target = step.action.expectError.field;
      const reached = await navigator.reach(
        target,
        journey.options.maxTabStops,
      );
      stops.push(...reached.stops.map((s) => s.selector));
      const before = page.observeError
        ? await page.observeError(target)
        : undefined;
      // Enter is the least surprising keyboard submission for a focused form field.
      // It preserves the user's keyboard-only journey and lets native validation run.
      if (reached.reached) await navigator.press("Enter");
      if (reached.reached) lastUserAction = true;
      const after = page.observeError
        ? await page.observeError(target)
        : undefined;
      stepFindings = await evaluateOracles(oracles, {
        page: browserPage,
        step,
        stepIndex,
        target,
        reached: reached.reached,
        tabStops: reached.stops,
        focused: await page.activeFocus(),
        focusVisible: page.focusVisible ? await page.focusVisible() : null,
        before: { children: [] },
        after: { children: [] },
        errorBefore: before,
        errorAfter: after,
      });
    } else if ("expectDialog" in step.action && step.action.expectDialog) {
      target = step.action.expectDialog.opensFrom;
      const reached = await navigator.reach(
        target,
        journey.options.maxTabStops,
      );
      stops.push(...reached.stops.map((s) => s.selector));
      const previousFocus = reached.focused;
      if (reached.reached) {
        await navigator.press("Enter");
        await navigator.press(step.action.expectDialog.closesWith);
        lastUserAction = true;
      }
      const focused = await page.activeFocus();
      stepFindings = await evaluateOracles(oracles, {
        page: browserPage,
        step,
        stepIndex,
        target,
        reached: reached.reached,
        tabStops: reached.stops,
        focused,
        previousFocus: previousFocus ?? undefined,
        focusVisible: page.focusVisible ? await page.focusVisible() : null,
        before: emptySnapshot(),
        after: emptySnapshot(),
      });
    } else if ("press" in step.action && step.action.press) {
      await navigator.press(step.action.press.key);
      lastUserAction = true;
    } else if ("expectStatus" in step.action && step.action.expectStatus) {
      const status =
        lastUserAction && page.observeStatus
          ? await page.observeStatus(step.action.expectStatus)
          : undefined;
      stepFindings = await evaluateOracles(oracles, {
        page: browserPage,
        step,
        stepIndex,
        tabStops: [],
        before: emptySnapshot(),
        after: (await page.accessibilitySnapshot?.()) ?? emptySnapshot(),
        status: status ?? undefined,
      });
      lastUserAction = false;
    }
    const capture = evidenceDir && action !== "goto";
    const evidence = capture
      ? await captureStepEvidence(page, evidenceDir, stepIndex, step.id)
      : undefined;
    if (evidence) {
      stepFindings = stepFindings.map((finding) => ({
        ...finding,
        evidence: {
          ...finding.evidence,
          screenshot: evidence.screenshot,
          accessibilitySnapshot: evidence.accessibilitySnapshot,
        },
        screenshot: evidence.screenshot,
        accessibilityTree: evidence.accessibilitySnapshot,
      }));
    }
    findings.push(...stepFindings);
    traces.push({
      stepId: step.id,
      action,
      target: target ? targetText(target) : undefined,
      startedAt: new Date().toISOString(),
      durationMs: Date.now() - stepStarted,
      tabStops: stops,
      ...(evidence ?? {}),
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
    options.evidenceDir,
  );
}

async function captureStepEvidence(
  page: KeyboardPage,
  evidenceDir: string,
  stepIndex: number,
  stepId: string,
): Promise<{ screenshot: string; accessibilitySnapshot?: string }> {
  const safeId = stepId.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const prefix = `${String(stepIndex + 1).padStart(3, "0")}-${safeId}`;
  const { mkdir, writeFile } = await import("node:fs/promises");
  const screenshot = join(evidenceDir, `${prefix}.png`);
  const accessibilitySnapshot = join(evidenceDir, `${prefix}.ax.json`);
  await mkdir(evidenceDir, { recursive: true });
  await page.screenshot(screenshot);
  const snapshot = page.accessibilitySnapshot
    ? await page.accessibilitySnapshot()
    : null;
  if (snapshot !== null)
    await writeFile(
      accessibilitySnapshot,
      `${JSON.stringify(snapshot, null, 2)}\n`,
      "utf8",
    );
  return snapshot === null
    ? { screenshot }
    : { screenshot, accessibilitySnapshot };
}
