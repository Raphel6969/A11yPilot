# @a11ypilot/cli

The `a11ypilot` command-line interface for validating and running keyboard journeys, producing reports, managing baselines, and comparing results.

[Repository](https://github.com/Raphel6969/A11yPilot) · [npm package](https://www.npmjs.com/package/@a11ypilot/cli)

## Install

```bash
npm install --save-dev @a11ypilot/cli
npx playwright install chromium
```

The package includes `@a11ypilot/core` `0.1.1`, `@a11ypilot/reporters` `0.1.1`, `commander`, and `playwright`. Node.js 20 or newer is supported. The CLI launches Playwright Chromium, so install the browser binaries in the environment that runs it.

## Commands

```bash
npx a11ypilot validate journeys/checkout.yml
npx a11ypilot run journeys/checkout.yml --format json --output artifacts/checkout.json
npx a11ypilot run journeys/checkout.yml --format html --output artifacts/checkout.html
npx a11ypilot run journeys/checkout.yml --format sarif --output artifacts/checkout.sarif
npx a11ypilot baseline artifacts/checkout.json --output a11y-baseline.json
npx a11ypilot diff a11y-baseline.json artifacts/checkout.json --format summary
npx a11ypilot --version
```

`run` also supports `--headed`, `--baseline <path>`, and `--fail-on critical|serious|moderate|minor`. Without `--output`, the selected report is printed to stdout. A failing gate sets a non-zero exit code; successful validation and reporting do not.

## Journey example

```yaml
version: 1
name: Complete checkout with keyboard
start: http://127.0.0.1:3000/checkout
steps:
  - type:
      target: { role: textbox, name: Email }
      text: person@example.com
  - activate: { role: button, name: Place order }
  - expectStatus: { role: status, containsText: Order placed }
```

Validate before running, then gate only newly introduced serious-or-higher findings:

```bash
npx a11ypilot validate journeys/checkout.yml
npx a11ypilot run journeys/checkout.yml --baseline a11y-baseline.json --fail-on serious
```

## Outputs

The CLI writes JSON, HTML, or SARIF reports. Baselines preserve fingerprints for known findings, while `diff` prints either JSON or a human-readable new/fixed/unchanged summary. Results include journey status, traces, finding severity, WCAG references, and available evidence. `validate` prints a confirmation or diagnostics and never launches a browser.

## Peer dependencies, security, and scope

The CLI has no peer dependencies. Its bundled Playwright dependency satisfies core's `playwright-core >=1.48.0` peer expectation. Run it only against websites and environments you are authorized to test. Journey input can navigate to URLs and type values, while reports can contain page-derived content and screenshots; keep both under appropriate access controls and never commit secrets. The CLI performs deterministic journey checks only: it is not a full accessibility scanner, security test, WCAG/ADA/EAA certification, or replacement for manual and assistive-technology testing.
