# @a11ypilot/cli

`@a11ypilot/cli` provides the `a11ypilot` command for validating and running YAML keyboard journeys, producing JSON/HTML/SARIF reports, creating baselines, and comparing results. It composes [`@a11ypilot/core`](../core/README.md) and [`@a11ypilot/reporters`](../reporters/README.md).

- [Repository](https://github.com/Raphel6969/A11yPilot)
- [npm package](https://www.npmjs.com/package/@a11ypilot/cli)
- Related packages: [`@a11ypilot/core`](../core/README.md) · [`@a11ypilot/reporters`](../reporters/README.md)

## Installation

```bash
npm install --save-dev @a11ypilot/cli
npx playwright install chromium
```

The package includes matching `@a11ypilot/core` and `@a11ypilot/reporters` `0.1.1` dependencies, `commander`, and Playwright `^1.48.0`. Node.js 20 or newer is supported. Install Chromium in the same environment that runs the command. In a repository checkout, build first with `npm run build:cli` and invoke `node packages/cli/dist/cli.js`.

## A realistic journey

```yaml
version: 1
name: Complete checkout with keyboard
start: http://127.0.0.1:3000/checkout
options:
  maxTabStops: 60
  timeoutMs: 5000
steps:
  - type:
      target:
        role: textbox
        name: Email
      text: shopper@example.test
  - type:
      target:
        role: textbox
        name: Card number
      text: "4242424242424242"
  - activate:
      role: button
      name: Place order
  - expectStatus:
      role: status
      containsText: Order placed
```

Targets must use the accessible role and name. Supported step actions include `goto`, `expect`, `type`, `activate`, `expectDialog`, `press`, `expectError`, `expectStatus`, and `snapshot`; each step must contain exactly one action. Start the product's own server before running the command. A11yPilot does not guess how to start a Next.js, Rails, Django, Vite, or other application.

## Command reference by example

Validate without launching a browser:

```bash
npx a11ypilot validate journeys/checkout.yml
# Valid journey: journeys/checkout.yml
```

Run headless and write each report format:

```bash
npx a11ypilot run journeys/checkout.yml \
  --format json --output artifacts/checkout.json
npx a11ypilot run journeys/checkout.yml \
  --format html --output artifacts/checkout.html
npx a11ypilot run journeys/checkout.yml \
  --format sarif --output artifacts/checkout.sarif
```

Without `--output`, the selected report is printed to stdout. Use `--headed` to watch Chromium while debugging:

```bash
npx a11ypilot run journeys/checkout.yml --headed
```

The CLI's `run` command writes report data that includes journey status, traces, findings, severity, WCAG references, fingerprints, and evidence available from the run. It does not expose core's `evidenceDir` option, so persisted screenshots and accessibility snapshots require the programmatic core API described in [`@a11ypilot/core`](../core/README.md).

## Baselines and gates

Create a baseline from a JSON result, compare a later result, and inspect machine-readable output:

```bash
npx a11ypilot baseline artifacts/checkout.json \
  --output a11y-baseline.json
npx a11ypilot diff a11y-baseline.json \
  artifacts/checkout-latest.json --format summary
npx a11ypilot diff a11y-baseline.json \
  artifacts/checkout-latest.json --format json \
  > artifacts/checkout-diff.json
```

Baselines preserve finding fingerprints. `diff` reports new, fixed, and unchanged findings. To fail only for newly introduced findings at or above a threshold:

```bash
npx a11ypilot run journeys/checkout.yml \
  --baseline a11y-baseline.json \
  --fail-on serious \
  --format sarif \
  --output artifacts/checkout.sarif
```

`--fail-on` accepts `critical`, `serious`, `moderate`, or `minor`. A failed gate sets a non-zero process exit code; successful validation and report generation do not. With a baseline, only new failing findings are candidates for the gate. Without one, all failing findings at or above the threshold are candidates.

## Cross-package workflow

In a product repository, a typical pull-request flow is:

```bash
npm ci
npx playwright install chromium
npx a11ypilot validate journeys/checkout.yml
npx a11ypilot run journeys/checkout.yml --format json --output artifacts/checkout.json
npx a11ypilot run journeys/checkout.yml \
  --baseline a11y-baseline.json --fail-on serious \
  --format sarif --output artifacts/checkout.sarif
```

Use core directly for custom Playwright setup, `evidenceDir`, custom oracle selection, or baseline APIs; use reporters directly when an application needs JSON, HTML, SARIF, or diff strings in its own artifact pipeline. This CLI is the packaged path that wires core execution to reporter output and command exit status.

## Security and scope

Run the CLI only against websites and environments you own or are authorized to test. Journey input can navigate to URLs and type values; reports and any referenced artifacts can contain page-derived content, screenshots, and sensitive data. Do not put passwords, cookies, tokens, payment data, or personal data in journeys or committed artifacts. Keep outputs under appropriate access controls. The CLI performs deterministic keyboard-journey checks only: it is not a full accessibility scanner, security test, WCAG/ADA/EAA certification, or replacement for manual, visual, screen-reader, or assistive-technology testing.
