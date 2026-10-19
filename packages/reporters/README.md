# @a11ypilot/reporters

Small, dependency-light formatters for A11yPilot journey results and baseline diffs.

[Repository](https://github.com/Raphel6969/A11yPilot) · [npm package](https://www.npmjs.com/package/@a11ypilot/reporters)

## Install

```bash
npm install @a11ypilot/reporters @a11ypilot/core
```

Version `0.1.1` depends on the matching `@a11ypilot/core` `0.1.1` API. The package has no peer dependencies and does not launch browsers; use `@a11ypilot/core` (and a Playwright implementation) to create results first.

## API usage

```ts
import { jsonReport, htmlReport, sarifReport } from "@a11ypilot/reporters";
import { loadJourney, runJourney } from "@a11ypilot/core";
import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";

const loaded = await loadJourney("journeys/login.yml");
const browser = await chromium.launch();
try {
  const result = await runJourney(await browser.newPage(), loaded);
  await writeFile("artifacts/result.json", jsonReport(result));
  console.log(htmlReport(result));
  console.log(sarifReport(result));
} finally {
  await browser.close();
}
```

The exports are `jsonReport`, `htmlReport`, `sarifReport`, `diffJsonReport`, and `diffSummaryReport`. Each accepts a compatible result or diff object and returns a string; writing files and choosing an exit code remain the caller's responsibility.

## Journey and diff example

Run a journey with `@a11ypilot/core`, then format the returned result:

```ts
const json = jsonReport(result);
const html = htmlReport(result);
const sarif = sarifReport(result);
```

For a baseline comparison:

```ts
import { diffResults } from "@a11ypilot/core";
const diff = diffResults(result, baseline);
console.log(diffSummaryReport(diff));
```

## Outputs

JSON is pretty-printed machine-readable result data. HTML is a compact findings table suitable for an artifact or review page. SARIF 2.1.0 contains failing findings for code-scanning integrations. Diff JSON contains `newFindings`, `fixedFindings`, and `unchangedFindings`; the summary reports their counts and details for new and fixed findings. Reporters escape HTML text, but consumers should still apply their own transport and hosting controls.

## Security and scope

Reporters format data; they do not validate that a result came from a trusted run, sanitize arbitrary HTML beyond table fields, upload artifacts, or enforce authorization. Treat reports as potentially sensitive because findings may include page-derived names and messages. SARIF and HTML output are evidence summaries, not WCAG, ADA, or EAA certification and not a substitute for manual, visual, or screen-reader review.
