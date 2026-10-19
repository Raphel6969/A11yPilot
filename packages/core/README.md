# @a11ypilot/core

`@a11ypilot/core` loads a strict YAML keyboard journey, executes it against a real Playwright `Page`, evaluates deterministic accessibility oracles, and returns traces, findings, and optional browser evidence. It is the execution and data-model package; it does not provide a CLI or render reports.

- [Repository](https://github.com/Raphel6969/A11yPilot)
- [npm package](https://www.npmjs.com/package/@a11ypilot/core)
- Related packages: [`@a11ypilot/reporters`](../reporters/README.md) · [`@a11ypilot/cli`](../cli/README.md)

## Installation

```bash
npm install @a11ypilot/core playwright
npx playwright install chromium
```

The package declares `playwright-core >=1.48.0` as a peer dependency. The normal `playwright` package supplies the compatible `Page` implementation and browser binaries; an equivalent implementation can be used if you provide the `KeyboardPage` integration expected by the lower-level APIs. Node.js 20 or newer is supported.

## A realistic journey

Journey files are YAML documents with `version: 1`, a URL, and at least one step. Targets use the accessible `role` and `name` exposed to users, rather than CSS selectors or generated IDs. Every step contains exactly one action.

```yaml
version: 1
name: Submit the profile form with keyboard
start: http://127.0.0.1:3000/profile
options:
  maxTabStops: 60
  timeoutMs: 5000
steps:
  - type:
      target:
        role: textbox
        name: Display name
      text: Ada Lovelace
  - type:
      target:
        role: textbox
        name: Email
      text: ada@example.test
  - activate:
      role: button
      name: Save profile
  - expectStatus:
      role: status
      containsText: Profile saved
```

Supported actions are `goto`, `expect`, `type`, `activate`, `expectDialog`, `press`, `expectError`, `expectStatus`, and `snapshot`. For example, a dialog check records the trigger focus, presses the configured close key, and evaluates focus return:

```yaml
- expectDialog:
    opensFrom:
      role: button
      name: Help
    closesWith: Escape
    focusReturns: true
```

`loadJourney` parses YAML, applies option defaults (`maxTabStops: 80`, `timeoutMs: 5000`), and validates the strict schema. Invalid files throw `JourneyLoadError`; its `diagnostics` array contains file, document, or field-level messages.

## Programmatic API

```ts
import { chromium } from "playwright";
import {
  defaultOracles,
  loadJourney,
  runJourney,
  type JourneyResult,
} from "@a11ypilot/core";

const loaded = await loadJourney("journeys/profile.yml");
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const result: JourneyResult = await runJourney(page, loaded, {
    oracles: defaultOracles,
    evidenceDir: "artifacts/profile-evidence",
  });
  console.log(`${result.status}: ${result.findings.length} findings`);
  for (const finding of result.findings) {
    console.log(finding.severity, finding.oracle, finding.message);
  }
} finally {
  await browser.close();
}
```

`runJourney` navigates to `journey.start`, performs the keyboard actions, and returns a `JourneyResult` with `schemaVersion`, `runId`, timing, journey metadata, `status`, action `traces`, and WCAG-mapped `findings`. The default oracle set covers reachability, keyboard traps, focus return, focus-visible, error identification, and status announcements. Pass an `oracles` array to select or extend the checks.

With `evidenceDir`, non-`goto` steps write numbered PNG screenshots and, when the page adapter can provide one, `.ax.json` accessibility snapshots. Finding and trace evidence points at those files. The CLI currently runs the same engine without exposing this option; use the library API when persisted browser evidence is required.

## Findings and baselines

Findings include `id`, `oracle`, `status` (`pass`, `fail`, or `needs-review`), severity, WCAG references, step index, message, optional fix text, stable fingerprint, and evidence. `statusFor` reports a completed, completed-with-barriers, or blocked journey based on failures.

Baselines preserve fingerprints of accepted findings and classify later results as new, fixed, or unchanged:

```ts
import {
  createBaseline,
  diffResults,
  gateResult,
  serializeBaseline,
} from "@a11ypilot/core";
import { writeFile } from "node:fs/promises";

const baseline = createBaseline(result, { toolVersion: "0.1.2" });
await writeFile("a11y-baseline.json", serializeBaseline(baseline));

const diff = diffResults(result, baseline);
console.log(diff.newFindings.length, diff.fixedFindings.length);
const gate = gateResult(result, { baseline, failOn: "serious" });
if (!gate.passed) process.exitCode = 1;
```

Use `parseBaseline`, `readBaseline`, and `writeBaseline` for persisted baseline files. `gateResult` defaults to an `error` threshold; severity ranking supports the current `critical`, `serious`, `moderate`, and `minor` values plus compatibility values used by older results.

## Cross-package workflow

Use core to execute and produce a result, reporters to serialize it, and the CLI when a shell/CI entry point is more convenient:

```ts
import { writeFile } from "node:fs/promises";
import { jsonReport, sarifReport } from "@a11ypilot/reporters";

await writeFile("artifacts/profile.json", jsonReport(result));
await writeFile("artifacts/profile.sarif", sarifReport(result));
```

See [`@a11ypilot/reporters`](../reporters/README.md) for output formats and [`@a11ypilot/cli`](../cli/README.md) for `validate`, `run`, `baseline`, and `diff` commands.

## Security and scope

Run journeys only against sites and environments you own or are authorized to test. URLs and typed values are executed in a real browser. Do not put passwords, cookies, tokens, payment data, or personal data in YAML, source, logs, or evidence directories; screenshots and accessibility snapshots may contain page-derived sensitive content. Core performs deterministic keyboard-journey checks only. It does not certify WCAG, ADA, or EAA conformance, replace manual or screen-reader testing, or audit arbitrary application code or server-side behavior.
