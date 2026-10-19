#!/usr/bin/env node
import { Command } from "commander";
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import {
  diffJsonReport,
  diffSummaryReport,
  htmlReport,
  jsonReport,
  sarifReport,
} from "@a11ypilot/reporters";
import {
  createBaseline,
  diffResults,
  gateResult,
  parseBaseline,
  readBaseline,
  runJourney,
  loadJourney,
  serializeBaseline,
  type JourneyResult,
  type Severity,
} from "@a11ypilot/core";

const failOnValues = ["critical", "serious", "moderate", "minor"] as const;
type FailOn = (typeof failOnValues)[number];

async function readResult(path: string): Promise<JourneyResult> {
  const value: unknown = JSON.parse(await readFile(path, "utf8"));
  if (
    !value ||
    typeof value !== "object" ||
    !Array.isArray((value as JourneyResult).findings)
  )
    throw new Error(`Invalid result JSON: ${path}`);
  return value as JourneyResult;
}

async function readBaselineOrResult(path: string) {
  const text = await readFile(path, "utf8");
  try {
    return { baseline: parseBaseline(text) };
  } catch {
    return { result: JSON.parse(text) as JourneyResult };
  }
}

function validateFailOn(value: string): FailOn {
  if (!failOnValues.includes(value as FailOn))
    throw new Error("fail-on must be critical, serious, moderate, or minor");
  return value as FailOn;
}

const program = new Command()
  .name("a11ypilot")
  .description("Keyboard journey accessibility evidence")
  .version("0.1.0");
program
  .command("validate")
  .argument("<journey>")
  .action(async (path: string) => {
    await loadJourney(path);
    console.log(`Valid journey: ${path}`);
  });
program
  .command("run")
  .argument("<journey>")
  .option("-o, --output <path>", "write report to a file")
  .option("-f, --format <format>", "json, html, or sarif", "json")
  .option("--headed", "show Chromium while running")
  .option("--baseline <path>", "baseline JSON used to ignore existing findings")
  .option("--fail-on <severity>", "critical, serious, moderate, or minor")
  .action(
    async (
      path: string,
      options: {
        output?: string;
        format: string;
        headed?: boolean;
        baseline?: string;
        failOn?: string;
      },
    ) => {
      const loaded = await loadJourney(path);
      if (!["json", "html", "sarif"].includes(options.format))
        throw new Error("format must be json, html, or sarif");
      const browser = await chromium.launch({ headless: !options.headed });
      try {
        const result = await runJourney(await browser.newPage(), loaded);
        const output =
          options.format === "html"
            ? htmlReport(result)
            : options.format === "sarif"
              ? sarifReport(result)
              : jsonReport(result);
        if (options.output) await writeFile(options.output, output);
        else console.log(output);
        const gate = gateResult(result, {
          baseline: options.baseline
            ? await readBaseline(options.baseline)
            : undefined,
          failOn: options.failOn
            ? (validateFailOn(options.failOn) as Severity)
            : undefined,
        });
        if (!gate.passed) process.exitCode = 1;
      } finally {
        await browser.close();
      }
    },
  );

program
  .command("baseline")
  .argument("<results>", "JSON result produced by run")
  .requiredOption("-o, --output <path>", "baseline JSON destination")
  .action(async (path: string, options: { output: string }) => {
    const result = await readResult(path);
    await writeFile(
      options.output,
      serializeBaseline(createBaseline(result, { toolVersion: "0.1.0" })),
    );
  });

program
  .command("diff")
  .argument("<before>", "baseline JSON or earlier result JSON")
  .argument("<after>", "result JSON")
  .option("-f, --format <format>", "json or summary", "summary")
  .action(
    async (
      beforePath: string,
      afterPath: string,
      options: { format: string },
    ) => {
      const before = await readBaselineOrResult(beforePath);
      const baseline = before.baseline ?? createBaseline(before.result!);
      const diff = diffResults(await readResult(afterPath), baseline);
      if (options.format === "json") console.log(diffJsonReport(diff));
      else if (options.format === "summary")
        console.log(diffSummaryReport(diff));
      else throw new Error("format must be json or summary");
    },
  );
await program.parseAsync();
