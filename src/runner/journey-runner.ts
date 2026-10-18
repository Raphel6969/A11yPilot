import { randomUUID } from "node:crypto";
import type { Journey, NormalizedStep, Target } from "../spec/schema.js";
import { reachabilityFinding } from "../oracles/reachability.js";
import {
  statusFor,
  type ActionTrace,
  type RunResult,
} from "../result/model.js";
import { KeyboardNavigator, type KeyboardPage } from "./keyboard-navigator.js";
const targetText = (target: Target) => `${target.role} "${target.name}"`;
export async function runJourney(
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
