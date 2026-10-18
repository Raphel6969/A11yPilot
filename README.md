# ♿ A11yPilot

> **Keyboard journey evidence for teams that ship accessible interfaces.**

[![CI](https://github.com/Raphel6969/A11yPilot/actions/workflows/ci.yml/badge.svg)](https://github.com/Raphel6969/A11yPilot/actions/workflows/ci.yml)
[![Node 20+](https://img.shields.io/badge/node-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/browser-Playwright-2ead33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![License](https://img.shields.io/badge/license-not%20yet%20published-lightgrey)](#project-status)

A11yPilot runs repeatable, keyboard-only journeys in a real Chromium browser. It checks whether a person can move through important UI flows using `Tab`, type into reachable controls, activate controls with `Enter`, and navigate between pages. It produces evidence-ready JSON, HTML, and SARIF reports.

It is a focused complement to automated rule scanners, screen-reader testing, visual testing, and manual accessibility review. **It is not a WCAG, ADA, or EAA certification tool.**

---

## 📚 Contents

- [Why teams use it](#-why-teams-use-it)
- [What ships today](#-what-ships-today)
- [Requirements](#-requirements)
- [Quick start](#-quick-start)
- [Run the included demo](#-run-the-included-demo)
- [Test any website](#-test-any-website)
- [Journey file format](#-journey-file-format)
- [Reports and exit codes](#-reports-and-exit-codes)
- [How a real development team uses it](#-how-a-real-development-team-uses-it)
- [CI and GitHub Actions](#-ci-and-github-actions)
- [Docker](#-docker)
- [Troubleshooting](#-troubleshooting)
- [Project layout](#-project-layout)
- [Limitations and safe use](#-limitations-and-safe-use)
- [Project status](#-project-status)

## 🎯 Why teams use it

Many accessibility defects are not caught by static rules alone. A dialog may exist but be impossible to reach, a checkout button may be skipped in the tab order, or a form control may expose the wrong accessible name. A11yPilot turns those important user flows into small, reviewable files that can run locally and in pull requests.

The core workflow is:

```text
journey.yml → Playwright + Chromium → keyboard observations → report + exit code
```

## ✨ What ships today

| Capability | What it does |
| --- | --- |
| 🧭 Accessible target lookup | Resolves controls by ARIA role and accessible name instead of brittle CSS selectors. |
| ⌨️ Keyboard navigation | Advances with real `Tab` key presses and records every observed focus stop. |
| ✍️ Text entry | Reaches a named textbox or control and types the requested text. |
| ▶️ Keyboard activation | Reaches a named control and activates it with `Enter`. |
| 🌐 Page navigation | Supports `goto` steps and a journey start URL. |
| 📸 Browser bridge | Uses Playwright's real Chromium browser; optional screenshots are available in the runner bridge. |
| 📄 Evidence reports | Emits JSON, HTML, or SARIF output for humans and CI tooling. |
| ✅ Journey validation | Validates YAML against a strict Zod schema before execution. |
| 🖥️ Demo dashboard | Includes a Vite/React UI for exploring journeys, run history, reports, settings, and documentation. |
| 🐳 Reproducible container | Includes a Dockerfile based on the official Playwright image. |

Current runner actions are `goto`, `expect`, `type`, `activate`, and `press`. The schema also reserves space for future assertions such as form errors, status messages, and snapshots; those are not yet executed by the MVP runner.

## 🧰 Requirements

- **Node.js 20 or newer** — the repository pins the major version in `.nvmrc`.
- **npm 10 or newer**.
- **Chromium dependencies** — installed automatically by `npm run playwright:install -- --with-deps` on Linux CI, or provided by the Docker image.
- A website running locally or at a test/staging URL that you are authorized to test.

## 🚀 Quick start

```bash
git clone https://github.com/Raphel6969/A11yPilot.git
cd A11yPilot

npm ci
npm run playwright:install
npm run dev
```

Open the Vite URL printed in the terminal to explore the A11yPilot dashboard.

For a production-like build:

```bash
npm run build
npm run preview
```

## 🧪 Run the included demo

The repository contains `journey.example.yml`, which checks that the demo's **Run this journey** button is reachable by keyboard.

Run the complete real-browser check:

```bash
npm ci
npm run playwright:install
npm run test:e2e
```

`test:e2e` builds the CLI and UI, starts the built UI on a free local port, waits for it to respond, launches headless Chromium, runs the sample journey, prints the result, and shuts down the preview server.

To watch Chromium instead of running headlessly:

```bash
npm run build:cli
node packages/cli/dist/cli.js run journey.example.yml --headed
```

## 🌍 Test any website

### 1. Start the site under test

Start your own application in a test environment. For example:

```bash
cd ../my-store
npm run dev -- --host 127.0.0.1
```

Assume it is available at `http://127.0.0.1:3000/checkout`.

### 2. Create a journey file

Create `journeys/checkout.yml`:

```yaml
version: 1
name: Complete checkout with keyboard
start: http://127.0.0.1:3000/checkout

options:
  maxTabStops: 60
  timeoutMs: 5000

steps:
  - expect:
      role: textbox
      name: "Email"

  - type:
      target:
        role: textbox
        name: "Email"
      text: "person@example.com"

  - expect:
      role: textbox
      name: "Card number"

  - type:
      target:
        role: textbox
        name: "Card number"
      text: "4242424242424242"

  - expect:
      role: button
      name: "Place order"

  - activate:
      role: button
      name: "Place order"
```

Use the accessible role and accessible name that a real user would encounter. Prefer stable names such as `Email`, `Continue`, or `Place order`; do not use generated CSS classes or implementation-only IDs.

### 3. Build and validate

```bash
npm run build:cli
node packages/cli/dist/cli.js validate journeys/checkout.yml
```

Expected output:

```text
Valid journey: journeys/checkout.yml
```

### 4. Run the journey

```bash
node packages/cli/dist/cli.js run journeys/checkout.yml
```

Run in a visible browser while diagnosing a failure:

```bash
node packages/cli/dist/cli.js run journeys/checkout.yml --headed
```

The runner starts at `start`, presses `Tab` until each target is found or `maxTabStops` is exceeded, types or presses `Enter` where requested, and records the observed tab stops.

## 📝 Journey file format

Every file has:

- `version: 1`
- a human-readable `name`
- a URL `start`
- one or more `steps`
- optional `options.maxTabStops` and `options.timeoutMs`

Supported steps:

```yaml
steps:
  # Navigate to another URL.
  - goto: http://127.0.0.1:3000/account

  # Require a keyboard-reachable target.
  - expect:
      role: link
      name: "Account settings"

  # Reach a target and type text.
  - type:
      target:
        role: textbox
        name: "Search"
      text: "keyboard accessibility"

  # Reach a target and press Enter.
  - activate:
      role: button
      name: "Search"

  # Send a keyboard key without resolving a target.
  - press:
      target:
        role: textbox
        name: "Search"
      key: Enter
```

Each step must contain exactly one action. `role` and `name` are required for target-based steps. `maxTabStops` prevents an infinite search when the target is not reachable.

## 📊 Reports and exit codes

### JSON

```bash
node packages/cli/dist/cli.js run journeys/checkout.yml \
  --format json \
  --output artifacts/checkout.json
```

Best for storing complete machine-readable run data.

### HTML

```bash
node packages/cli/dist/cli.js run journeys/checkout.yml \
  --format html \
  --output artifacts/checkout.html
```

Best for sharing evidence with product, QA, design, and accessibility reviewers.

### SARIF

```bash
node packages/cli/dist/cli.js run journeys/checkout.yml \
  --format sarif \
  --output artifacts/checkout.sarif
```

Best for feeding findings into code-scanning or CI result systems.

The command exits successfully when all reachability findings pass. It sets a non-zero exit code when the journey is blocked, so a pull request can fail when a critical keyboard path regresses.

## 👥 How a real development team uses it

### Product and accessibility planning

The team chooses a small set of high-value journeys instead of trying to automate every click:

- sign-up and account recovery,
- login and multi-factor authentication,
- checkout and payment,
- search and filtering,
- modal open/close flows,
- validation and error recovery,
- navigation through the primary application shell.

Each journey is written as a plain YAML file and reviewed like product documentation. The `name` and step order explain the intended user experience.

### Local development

A developer starts the app, runs one focused journey, and uses `--headed` when a target cannot be reached:

```bash
npm run build:cli
node packages/cli/dist/cli.js run journeys/login.yml --headed --format html --output login-debug.html
```

They inspect the tab-stop trace and fix the underlying markup, focus order, accessible name, or keyboard handler.

### Pull requests

The repository keeps journeys in a directory such as `journeys/`. A pull request that changes checkout markup runs the checkout journey and uploads the HTML/SARIF artifact. Reviewers see both the code change and the user-flow evidence.

### Continuous integration

The included GitHub Actions workflow runs:

1. `npm ci`
2. Chromium installation with Linux dependencies
3. TypeScript checks
4. formatting checks
5. unit and UI tests
6. real Playwright journey testing
7. production build
8. Docker build

For a separate product repository, start the product server before invoking A11yPilot:

```yaml
- run: npm ci
- run: npx playwright install --with-deps chromium
- run: npm run build:cli
- run: npm run run:journey -- journeys/checkout.yml --format sarif --output checkout.sarif
```

The exact server startup command depends on the product. A11yPilot intentionally tests an already-running authorized site rather than guessing how every application should be started.

### Release and regression tracking

Teams archive reports from important branches or releases, compare the tab-stop traces when keyboard order changes, and keep a small regression suite of journeys that represent real customer outcomes.

## 🤖 CI and GitHub Actions

The project's own workflow is in `.github/workflows/ci.yml`. Run the same important checks locally:

```bash
npm run typecheck
npm run lint
npm run test:all
npm run build
docker build -t a11ypilot:ci .
```

On Linux, install the browser and native dependencies explicitly:

```bash
npm run playwright:install -- --with-deps
```

## 🐳 Docker

The Dockerfile uses the official Playwright image, which includes Chromium and the Linux libraries needed to launch it.

Build and run the dashboard:

```bash
docker build -t a11ypilot:local .
docker run --rm -p 4173:4173 a11ypilot:local
```

Open <http://localhost:4173>.

The image also contains the built CLI. For a journey that targets a service reachable from inside the container, run a command such as:

```bash
docker run --rm --network host \
  a11ypilot:local \
  node packages/cli/dist/cli.js run /workspace/journeys/checkout.yml
```

In practice, mount or copy your journey files into the image and ensure the URL is reachable from the container network. Never put passwords, tokens, cookies, or personal data in journey files or reports.

## 🛠️ Troubleshooting

### `Executable doesn't exist` from Playwright

Install Chromium:

```bash
npm run playwright:install
```

On Ubuntu or another Linux host:

```bash
npm run playwright:install -- --with-deps
```

### The target is never reached

Check:

1. The target page is loaded and reachable from the machine running the command.
2. The role is correct, for example `button`, `link`, or `textbox`.
3. The accessible name matches the visible label or `aria-label`.
4. The target is not behind an unhandled authentication or consent screen.
5. `maxTabStops` is high enough for the page.
6. The journey starts from the correct URL and uses `goto` when navigation is required.

Run with `--headed` and use an accessibility inspector in your browser to confirm the role and name.

### The app is not running

A11yPilot is a browser runner, not an application server manager. Start the site under test first, then run the journey. The included `test:e2e` command is special: it starts the repository's own built demo automatically.

### A journey fails after a UI redesign

That may be a real accessibility regression or an intentional label change. Review the report and update the journey only when the intended user-facing interaction changed.

## 🗂️ Project layout

```text
packages/core/              # journey schema/loader, runner, model, and oracles
packages/reporters/         # JSON, HTML, and SARIF output
packages/cli/                # validate and run commands (a11ypilot binary)
src/
├── main.tsx                # React demo/dashboard entry point
└── styles.css              # dashboard styling
scripts/run-e2e.mjs         # build, serve, and run the real-browser demo
journey.example.yml         # sample journey
Dockerfile                  # reproducible build/runtime image
```

## ⚠️ Limitations and safe use

- Test only sites you own or are explicitly authorized to test.
- Do not store secrets, credentials, cookies, payment data, or personal information in YAML files or generated reports.
- Chromium is the initial browser target; cross-browser testing is not yet provided.
- Keyboard reachability is one important accessibility dimension, not a full audit.
- A passing journey does not prove WCAG conformance.
- Authenticated journeys need a deliberate, redacted secrets strategy before being added to CI.
- The runner currently focuses on keyboard navigation and does not replace real screen-reader, switch, touch, zoom, contrast, or manual testing.

## 📌 Project status

A11yPilot is an MVP/buildathon project. The current public repository is:

<https://github.com/Raphel6969/A11yPilot>

Useful next steps include richer assertions, authenticated-flow handling, screenshot evidence, cross-browser projects, stronger artifact retention, and a published package release.

## 📄 License

No published license has been added yet. Treat the repository as source code for evaluation and obtain permission before redistributing it.
