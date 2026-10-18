# A11yPilot

A11yPilot tests whether a real user journey can be completed with the keyboard. It combines declarative journey specs, deterministic checks, and evidence-ready reports. It complements axe and manual accessibility testing; it does **not** certify WCAG, ADA, or EAA compliance.

## Who it is for

A11yPilot is designed for front-end and QA teams, accessibility agencies, and product teams responsible for signup, checkout, account, and form-recovery journeys. The UI is intentionally calm and operational: teams can see what passed, what needs attention, and what changed without a noisy analytics wall.

## Requirements

- Node.js 20 (pinned in `.nvmrc`)
- npm 10+
- Docker 24+ for container builds

## Install and run

```bash
npm ci
npm run dev
```

Open the Vite URL shown in the terminal. The demo UI includes a broken/fixed form-recovery journey, run feedback, and a new-journey dialog. Animations use GSAP and respect the product's restrained visual language.

## CLI

```bash
npm run build:cli
node dist/src/cli.js validate journey.example.yml
node dist/src/cli.js run journey.example.yml --format json --output report.json
node dist/src/cli.js run journey.example.yml --format html --output report.html
node dist/src/cli.js run journey.example.yml --format sarif --output report.sarif
```

The runner uses keyboard events for journey actions and resolves targets by accessible role/name. Run only against sites you own or are authorized to test.

## Checks

The complete local verification command is:

```bash
npm run typecheck
npm run lint
npm run test:all
npm run build
```

To run the container build check:

```bash
docker build -t a11ypilot:local .
docker run --rm -p 4173:4173 a11ypilot:local
```

Then open `http://localhost:4173`. The image serves the static UI on port 4173 and contains the built CLI.

## Deploy

A deploy target only needs to run the Docker image and expose port `4173`. For a managed container platform, configure:

- image: `a11ypilot:local` or a registry-published tag
- port: `4173`
- health check: `GET /`
- command: the Dockerfile default command

For a static host, deploy `dist-ui/` after `npm run build:ui`. For CI, `.github/workflows/ci.yml` runs typecheck, formatting, unit/UI tests, the production build, and Docker build.

## Project layout

- `src/cli.ts`: CLI entry point
- `src/spec`: journey schema and loader
- `src/runner`: keyboard-only browser abstractions
- `src/oracles`: deterministic accessibility checks
- `src/reporters`: HTML, JSON, and SARIF output
- `src/main.tsx`: user-facing operations dashboard/demo
- `docs/PRODUCT-AND-BUILD-PLAN.md`: product, market, architecture, and delivery plan

## Privacy and limitations

There is no telemetry or hosted upload in the MVP. Do not put passwords, tokens, cookies, or personal data into journey specs or reports. Authenticated-flow support needs a dedicated redaction/secrets design. Chromium is the initial browser target, and browser automation does not replace real screen-reader testing.
