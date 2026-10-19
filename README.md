# ♿ A11yPilot

> **Deterministic keyboard-journey accessibility evidence for real product flows.**

[![CI](https://github.com/Raphel6969/A11yPilot/actions/workflows/ci.yml/badge.svg)](https://github.com/Raphel6969/A11yPilot/actions/workflows/ci.yml)
[![Playwright](https://img.shields.io/badge/browser-Playwright-2ead33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![Node](https://img.shields.io/badge/node-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Render](https://img.shields.io/badge/deploy-Render-46e3b7?logo=render&logoColor=white)](https://render.com/)

A11yPilot turns important user journeys into repeatable keyboard-accessibility checks. It drives a real Chromium browser through Playwright, records focus behavior and evidence, evaluates deterministic WCAG-mapped oracles, and produces JSON, HTML, and SARIF reports.

It is designed to complement axe, screen-reader testing, manual review, and visual testing. **A passing run is not WCAG, ADA, or EAA certification.**

---

## 🚀 What is included

| Area | Ships today |
| --- | --- |
| Browser runner | Real Playwright Chromium with keyboard-only navigation |
| Journey format | Strict YAML validation with accessible role/name targets |
| Oracles | Reachability, keyboard traps, focus-visible, focus-return, error-identification, status-announcement |
| Evidence | Screenshots, accessibility-tree JSON when available, focus traces, error/status evidence |
| Reports | JSON, HTML, SARIF, baseline diff summaries |
| Baselines | New, fixed, unchanged classification and `--fail-on` gating |
| Library | `@a11ypilot/core`, `@a11ypilot/reporters`, `@a11ypilot/cli` workspace packages |
| Demo | Broken/fixed seeded site with real Chromium regression checks |
| Dashboard | Private Vite/React product demo |
| Deployment | Docker image and Render Blueprint on `deploy/render` |

### Current oracle catalog

| Oracle | WCAG | Detects |
| --- | --- | --- |
| `reachability` | 2.1.1 | A target cannot be reached with `Tab` |
| `no-keyboard-trap` | 2.1.2 | Focus repeats across consecutive keyboard stops |
| `focus-return` | 2.4.3 | Dialog focus does not return to its trigger |
| `focus-visible` | 2.4.7 | Focused element does not match `:focus-visible` |
| `error-identification` | 3.3.1 | Invalid fields lack identifiable or associated errors |
| `status-announcement` | 4.1.3 | Status text lacks semantic/live/focus announcement evidence |

---

## ⚡ Quick start

### Requirements

- Node.js 20+
- npm 10+
- Chromium; install it with the command below
- A local, staging, or test website you are authorized to test

### Install

```bash
git clone https://github.com/Raphel6969/A11yPilot.git
cd A11yPilot

npm ci
npm run playwright:install
```

On Linux CI or a bare Linux machine:

```bash
npm run playwright:install -- --with-deps
```

### Open the dashboard

```bash
npm run dev
```

Open the Vite URL printed in the terminal, normally `http://localhost:5173`.

### Run the full local verification loop

```bash
npm run typecheck
npm run lint
npm run test:all
npm run build
```

---

## 🎬 Best product demo

The strongest demo is the seeded broken-versus-fixed regression suite:

```bash
npm run test:demo
```

It launches a local demo server and runs the built CLI in real Chromium against both variants:

```text
PASS broken/modal-focus-return.yml: fail
PASS broken/keyboard-trap.yml: fail
PASS broken/error-identification.yml: fail
PASS broken/status-announcement.yml: fail

PASS fixed/modal-focus-return.yml: pass
PASS fixed/keyboard-trap.yml: pass
PASS fixed/error-identification.yml: pass
PASS fixed/status-announcement.yml: pass
```

This demonstrates the product claim clearly: the same deterministic checks fail on seeded defects and pass on the corrected implementation.

The demo sources are in:

```text
examples/demo-site/broken/index.html
examples/demo-site/fixed/index.html
examples/journeys/
```

---

## 🧭 Test any website

### 1. Start the target website

Start the application you own or are authorized to test:

```bash
cd ../my-product
npm run dev
```

Assume it runs at `http://127.0.0.1:3000`.

### 2. Write a journey

Create `journeys/checkout.yml`:

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
      text: person@example.com

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

Use accessible roles and names exposed to users, not CSS classes or generated IDs.

### 3. Validate it

```bash
npm run build:cli
node packages/cli/dist/cli.js validate journeys/checkout.yml
```

### 4. Run it

Headless:

```bash
node packages/cli/dist/cli.js run journeys/checkout.yml
```

Visible browser for debugging:

```bash
node packages/cli/dist/cli.js run journeys/checkout.yml --headed
```

With evidence:

```bash
node packages/cli/dist/cli.js run journeys/checkout.yml \
  --format html \
  --output artifacts/checkout.html
```

To write screenshots and accessibility snapshots, use the library API with `evidenceDir`, or add the CLI evidence flag when that CLI surface is enabled in your release branch.

---

## 📝 Journey actions

### Reachability

```yaml
- expect:
    role: button
    name: Continue
```

### Type

```yaml
- type:
    target:
      role: textbox
      name: Search
    text: accessibility
```

### Activate

```yaml
- activate:
    role: button
    name: Search
```

### Press a key

```yaml
- press:
    target:
      role: textbox
      name: Search
    key: Enter
```

### Dialog focus return

```yaml
- expectDialog:
    opensFrom:
      role: button
      name: Help
    closesWith: Escape
    focusReturns: true
```

### Error identification

```yaml
- expectError:
    field:
      role: textbox
      name: Email
    announced: true
```

### Status announcement

Exact text:

```yaml
- expectStatus:
    role: status
    text: Profile saved
```

Contains text:

```yaml
- expectStatus:
    containsText: saved
```

Each step must contain exactly one action. `maxTabStops` limits the search so a broken flow cannot loop forever.

---

## 📊 Reports

### JSON

```bash
node packages/cli/dist/cli.js run journeys/checkout.yml \
  --format json \
  --output artifacts/checkout.json
```

### HTML

```bash
node packages/cli/dist/cli.js run journeys/checkout.yml \
  --format html \
  --output artifacts/checkout.html
```

### SARIF

```bash
node packages/cli/dist/cli.js run journeys/checkout.yml \
  --format sarif \
  --output artifacts/checkout.sarif
```

Exit status is non-zero when findings fail the configured gate. Reports include the deterministic finding, WCAG mapping, message, recommendation, fingerprint, and captured evidence where available.

---

## 🧪 Baselines and regression gating

Baselines are for legacy sites. They let a team accept existing findings while blocking new regressions.

### Create a baseline

```bash
node packages/cli/dist/cli.js baseline \
  artifacts/checkout.json \
  --output a11y-baseline.json
```

### Compare results

```bash
node packages/cli/dist/cli.js diff \
  a11y-baseline.json \
  artifacts/checkout-latest.json
```

Machine-readable diff:

```bash
node packages/cli/dist/cli.js diff \
  a11y-baseline.json \
  artifacts/checkout-latest.json \
  --format json
```

### Gate only new serious findings

```bash
node packages/cli/dist/cli.js run journeys/checkout.yml \
  --baseline a11y-baseline.json \
  --fail-on serious \
  --format sarif \
  --output artifacts/checkout.sarif
```

Thresholds:

```text
critical
serious
moderate
minor
```

Without a baseline, all failing findings at or above the threshold are evaluated. With a baseline, only new findings are evaluated.

---

## 📦 Use as a library

The first `0.1.0` packages are published on npm. You can use them directly or work from this repository:

```bash
npm ci
npm run build:cli
npm run test:library
```

Published packages:

- [`@a11ypilot/core`](https://www.npmjs.com/package/@a11ypilot/core)
- [`@a11ypilot/reporters`](https://www.npmjs.com/package/@a11ypilot/reporters)
- [`@a11ypilot/cli`](https://www.npmjs.com/package/@a11ypilot/cli)

Install the CLI with:

```bash
npm install --save-dev @a11ypilot/cli
```

Example programmatic usage:

```ts
import { chromium } from "playwright";
import {
  defaultOracles,
  loadJourney,
  runJourney,
} from "@a11ypilot/core";
import { jsonReport } from "@a11ypilot/reporters";

const loaded = await loadJourney("journeys/checkout.yml");
const browser = await chromium.launch();
const page = await browser.newPage();

const result = await runJourney(page, loaded, {
  oracles: defaultOracles,
  evidenceDir: "artifacts/checkout",
});

console.log(result.status, result.findings.length);
console.log(jsonReport(result));

await browser.close();
```

The next package milestone is `@a11ypilot/playwright`, which will reuse an existing Playwright test's `page`, auth state, mocks, and fixtures.

---

## 👥 How a real dev team uses it

### Repository layout

```text
your-product/
├── journeys/
│   ├── signup.yml
│   ├── login.yml
│   ├── checkout.yml
│   └── account-recovery.yml
├── artifacts/
└── a11y-baseline.json
```

### Local development

```bash
node packages/cli/dist/cli.js run journeys/login.yml --headed
```

Developers inspect focus traces and evidence while fixing markup, labels, focus management, dialogs, validation, and status messages.

### Pull requests

```bash
node packages/cli/dist/cli.js run journeys/checkout.yml \
  --baseline a11y-baseline.json \
  --fail-on serious \
  --format sarif \
  --output artifacts/checkout.sarif
```

### CI

The repository's workflow runs:

1. `npm ci`
2. Chromium installation with Linux dependencies
3. typecheck
4. formatting check
5. unit/UI/library/baseline/demo/E2E tests
6. production build
7. Docker build

### Release review

Teams archive HTML/SARIF/JSON artifacts for critical flows and use `diff` to show fixed, new, and unchanged findings between releases.

---

## 🐳 Docker and Render deployment

The repository includes a Docker runtime that serves the dashboard on port `4173`.

### Local Docker

```bash
docker build -t a11ypilot:local .
docker run --rm -p 4173:4173 a11ypilot:local
```

Open <http://localhost:4173>.

### Render web service (recommended)

Create a standard Render **Web Service** from the `deploy/render` branch. The deploy branch includes a Dockerfile configured for the dashboard:

```text
Branch: deploy/render
Service: a11ypilot
Health check: /
Port: 4173
```

Deploy it on Render:

1. Push the `deploy/render` branch to GitHub.
2. In Render, choose **New → Web Service**.
3. Connect `Raphel6969/A11yPilot`.
4. Select the `deploy/render` branch.
5. Choose **Docker** as the runtime.
6. Set Dockerfile path to `./Dockerfile` and Docker context to `.`.
7. Set the health check path to `/`.
8. Create the service.
9. Wait for the Docker build and health check.
10. Open the generated Render URL.

The current Render deployment is the dashboard/demo container. It is not yet a hosted multi-user runner or remote job API. Do not put secrets into the image or repository.

### Render service settings

Use these values in the Web Service form:

```text
Environment: Docker
Branch: deploy/render
Dockerfile: ./Dockerfile
Docker context: .
Health check path: /
```

Render detects the exposed port from the Docker image; the application listens on `4173`.

---

## 🤖 GitHub Actions

The current CI workflow is `.github/workflows/ci.yml`.

For a product repository, the essential shape is:

```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version-file: .nvmrc
    cache: npm
- run: npm ci
- run: npx playwright install --with-deps chromium
- run: npm run build:cli
- run: node packages/cli/dist/cli.js run journeys/checkout.yml --baseline a11y-baseline.json --fail-on serious --format sarif --output checkout.sarif
```

Start the product's own test server before running the journey. A11yPilot intentionally does not guess how a Next.js, Rails, Django, Vite, or other application should start.

---

## 🗂️ Project layout

```text
packages/core/              # loader, runner, evidence, oracles, baseline API
packages/reporters/         # JSON, HTML, SARIF, diff reports
packages/cli/               # a11ypilot validate/run/baseline/diff
examples/demo-site/         # seeded broken and fixed HTML
examples/journeys/          # demo journeys
scripts/                    # E2E, demo, library, and baseline smoke tests
src/                        # private dashboard/demo application
Dockerfile                  # reproducible Playwright image
render.yaml                 # Render Docker Blueprint
```

---

## 🎥 Premium showcase video

The requested local `brag` skill is installed at:

```text
.agents/skills/brag
```

It is intentionally ignored and not committed with application source. The skill can storyboard and render a 15–25 second Hyperframes video with music, SFX, polished transitions, and share copy.

Recommended creative direction:

```text
Tone: polished cinematic developer-tool launch
Format: landscape
Duration: 20 seconds
Hook: “axe checks the page. A11yPilot checks the journey.”
Reveal: real keyboard focus moving through a form
Highlights: broken vs fixed modal focus, validation error evidence, baseline diff
Outro: “Ship the journey. Keep the evidence.”
```

Use the installed `/brag` workflow from an agent environment that has the Hyperframes domain skills available. Keep generated output under `brag-output*/`; it is ignored by Git.

Important: a video is marketing evidence, not a substitute for the executable regression suite.

---

## ⚠️ Scope and security

- Test only sites you own or are authorized to test.
- Do not put passwords, cookies, tokens, payment data, or personal data into journeys or reports.
- Chromium is the initial browser target.
- A11yPilot does not certify WCAG, ADA, or EAA conformance.
- The current release does not include hosted authentication, scheduled monitoring, or a multi-user job queue.
- Baselines should be reviewed like code; do not blindly accept new findings.

## 🛠️ Troubleshooting

### Playwright browser missing

```bash
npm run playwright:install
```

Linux:

```bash
npm run playwright:install -- --with-deps
```

### Target not found

Check the URL, role, accessible name, authentication state, consent screens, and `maxTabStops`. Run with `--headed`.

### Render deployment fails

Confirm the service uses the `deploy/render` branch, Dockerfile path `./Dockerfile`, and health check `/`. The Render build must be able to run `npm ci` and Docker must be available in the Render build environment.

## 📌 Project status

This is an MVP/buildathon project. The next production milestones are:

1. push and verify the deploy branch,
2. ship `@a11ypilot/playwright`,
4. ship a reusable GitHub Action,
5. add authenticated `storageState` journeys,
6. add hosted runs and scheduled monitoring only after the local/library contracts stabilize.

Repository: <https://github.com/Raphel6969/A11yPilot>
