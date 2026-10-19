# @a11ypilot/reporters

`@a11ypilot/reporters` converts an A11yPilot journey result or baseline diff into JSON, compact HTML, SARIF 2.1.0, or a text summary. It is deliberately small and does not launch browsers, load journeys, write files, upload artifacts, or choose exit codes.

- [Repository](https://github.com/Raphel6969/A11yPilot)
- [npm package](https://www.npmjs.com/package/@a11ypilot/reporters)
- Related packages: [`@a11ypilot/core`](../core/README.md) · [`@a11ypilot/cli`](../cli/README.md)

## Installation

```bash
npm install @a11ypilot/reporters @a11ypilot/core playwright
npx playwright install chromium
```

Version `0.1.2` is built against `@a11ypilot/core` `0.1.2`. Reporters have no peer dependencies. Install core and a Playwright implementation to create a result first; reporters only format the object they receive.

## Format a realistic run

The normal flow is: load and run a journey with core, then write each selected representation yourself.

```ts
import { chromium } from "playwright";
import { loadJourney, runJourney } from "@a11ypilot/core";
import { htmlReport, jsonReport, sarifReport } from "@a11ypilot/reporters";
import { mkdir, writeFile } from "node:fs/promises";

await mkdir("artifacts", { recursive: true });
const loaded = await loadJourney("journeys/checkout.yml");
const browser = await chromium.launch();
try {
  const result = await runJourney(await browser.newPage(), loaded, {
    evidenceDir: "artifacts/checkout-evidence",
  });
  await writeFile("artifacts/checkout.json", jsonReport(result));
  await writeFile("artifacts/checkout.html", htmlReport(result));
  await writeFile("artifacts/checkout.sarif", sarifReport(result));
  console.log(result.status);
} finally {
  await browser.close();
}
```

The result retains journey status, keyboard traces, findings, fingerprints, WCAG references, and any evidence paths created by core. JSON preserves the result as indented machine-readable data. HTML renders a findings table containing step, oracle, outcome, severity, and message. SARIF is version 2.1.0 and includes only findings whose `outcome` is `fail`, with rule ID, severity-derived level, message, step, oracle, and WCAG properties.

## API

The package exports:

```ts
jsonReport(result): string;
htmlReport(result): string;
sarifReport(result): string;
diffJsonReport(diff): string;
diffSummaryReport(diff): string;
```

The result input is structurally compatible with a core `JourneyResult`. Diff functions accept the object returned by core's `diffResults` (or a compatible `DiffReport`). For example:

```ts
import { createBaseline, diffResults } from "@a11ypilot/core";
import { diffJsonReport, diffSummaryReport } from "@a11ypilot/reporters";
import { writeFile } from "node:fs/promises";

// `result` is the JourneyResult returned by core's runJourney(...).
const baseline = createBaseline(result, { toolVersion: "0.1.2" });
const diff = diffResults(result, baseline);

await writeFile("artifacts/checkout-diff.json", diffJsonReport(diff));
console.log(diffSummaryReport(diff));
```

The summary starts with counts for new, fixed, and unchanged findings, then lists new and fixed fingerprints when present. Baseline creation, persistence, comparison, and gating belong to core; this package only formats the diff.

## Cross-package and CLI workflow

For a shell or CI workflow, [`@a11ypilot/cli`](../cli/README.md) composes core and reporters for you:

```bash
npx a11ypilot validate journeys/checkout.yml
npx a11ypilot run journeys/checkout.yml --format json --output artifacts/checkout.json
npx a11ypilot run journeys/checkout.yml --format sarif --output artifacts/checkout.sarif
npx a11ypilot baseline artifacts/checkout.json --output a11y-baseline.json
npx a11ypilot diff a11y-baseline.json artifacts/checkout.json --format summary
```

Use the library API when you need to choose an evidence directory or combine several output files in application code. Use the CLI when you want standard command-line validation, browser execution, baseline creation, and non-zero gating behavior.

## Security and scope

Reporters format data; they do not verify that a result came from a trusted run, enforce authorization, sanitize or host arbitrary application content, upload artifacts, or enforce exit codes. HTML table fields are escaped, but consumers must still apply appropriate transport and hosting controls. Reports may contain page-derived names, messages, URLs, or evidence paths, so protect artifacts and do not commit secrets. HTML, JSON, SARIF, and diff output are evidence summaries—not WCAG, ADA, or EAA certification—and do not replace manual, visual, or screen-reader review.
