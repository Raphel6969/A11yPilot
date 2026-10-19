# @a11ypilot/core

Deterministic keyboard-journey loading, execution, evidence collection, baselines, and accessibility oracles for A11yPilot.

[Repository](https://github.com/Raphel6969/A11yPilot) · [npm package](https://www.npmjs.com/package/@a11ypilot/core)

## Install

```bash
npm install @a11ypilot/core playwright
```

`playwright` supplies a browser implementation. The package declares the compatible peer dependency `playwright-core >=1.48.0`; any equivalent Playwright-compatible implementation may be used when you provide the `KeyboardPage` integration yourself. Install Chromium separately when using Playwright (`npx playwright install chromium`). Node.js 20 or newer is supported.

## API usage

```ts
import { chromium } from "playwright";
import { defaultOracles, loadJourney, runJourney } from "@a11ypilot/core";

const loaded = await loadJourney("journeys/checkout.yml");
const browser = await chromium.launch();
try {
  const result = await runJourney(await browser.newPage(), loaded, {
    oracles: defaultOracles,
    evidenceDir: "artifacts/checkout",
  });
  console.log(result.status, result.findings.length);
} finally {
  await browser.close();
}
```

Key exports include `loadJourney` (YAML parsing and strict validation), `runJourney`, `KeyboardNavigator`, `defaultOracles`, `createBaseline`, `diffResults`, `gateResult`, and the `Journey`, `JourneyResult`, `Finding`, and `Status` types. `JourneyLoadError.diagnostics` contains actionable validation messages.

## Journey example

```yaml
version: 1
name: Search with the keyboard
start: https://example.test/search
options:
  maxTabStops: 40
  timeoutMs: 5000
steps:
  - type:
      target: { role: textbox, name: Search }
      text: accessibility
  - activate: { role: button, name: Search }
  - expectStatus:
      role: status
      containsText: Results loaded
```

Steps use accessible roles and names. Supported actions include `goto`, `expect`, `type`, `activate`, `expectDialog`, `press`, `expectError`, `expectStatus`, and `snapshot`.

## Outputs

`runJourney` returns a `JourneyResult` with `status` (`completed`, `completed-with-barriers`, or `blocked`), action `traces`, and WCAG-mapped `findings`. Findings include severity, oracle, message, fingerprint, and evidence such as tab stops, focus state, screenshots, accessibility snapshots, error evidence, or status observations. Set `evidenceDir` to persist supported evidence files. Baselines classify findings as new, fixed, or unchanged and can be passed to `gateResult`.

## Security and scope

Only run journeys against sites you own or are authorized to test. Journey URLs and typed values are executed in a real browser; do not place production credentials or secrets in YAML, source, logs, or evidence directories. Evidence can contain page text and screenshots, so treat artifacts as sensitive. The runner does not certify WCAG, ADA, or EAA conformance, does not replace manual or screen-reader testing, and does not audit arbitrary application code or server-side behavior.
