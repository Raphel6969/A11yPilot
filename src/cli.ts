#!/usr/bin/env node
import { Command } from "commander";
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { htmlReport } from "./reporters/html.js";
import { jsonReport } from "./reporters/json.js";
import { sarifReport } from "./reporters/sarif.js";
import { PlaywrightKeyboardPage } from "./runner/playwright-page.js";
import { runJourney } from "./runner/journey-runner.js";
import { loadJourney } from "./spec/loader.js";

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
  .action(
    async (
      path: string,
      options: { output?: string; format: string; headed?: boolean },
    ) => {
      const loaded = await loadJourney(path);
      if (!["json", "html", "sarif"].includes(options.format))
        throw new Error("format must be json, html, or sarif");
      const browser = await chromium.launch({ headless: !options.headed });
      try {
        const result = await runJourney(
          loaded.journey,
          loaded.steps,
          new PlaywrightKeyboardPage(await browser.newPage()),
        );
        const output =
          options.format === "html"
            ? htmlReport(result)
            : options.format === "sarif"
              ? sarifReport(result)
              : jsonReport(result);
        if (options.output) await writeFile(options.output, output);
        else console.log(output);
        if (result.status === "blocked") process.exitCode = 1;
      } finally {
        await browser.close();
      }
    },
  );
await program.parseAsync();
