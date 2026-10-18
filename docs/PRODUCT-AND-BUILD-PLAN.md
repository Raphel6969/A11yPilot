# A11yPilot: Product and Build Plan

**Status:** Planning baseline  
**Date:** 2026-10-18  
**Source:** `.opencode/omnirush/inbox/chat-attachments/ses_eb1cad2cfffecnhl6TDN028GTC/8c91db36-3aaa-43c0-972c-f856ff12e1bd-A11yPilot Problem Statement, Market Gap and Solution Design.md`

## 1. Executive decision

A11yPilot should start as a **TypeScript CLI and GitHub Action** that runs declarative, keyboard-only journeys against a user-owned web application and produces evidence-backed HTML, JSON, and SARIF reports.

The first release should not be a hosted dashboard, browser extension, AI auditor, compliance certificate, or screen-reader replacement. The wedge is narrower and more defensible:

> **Can a real user complete this declared journey with the keyboard, and can the team prove exactly where it succeeds or fails?**

The repository is currently an empty implementation starting point: it has no package manifest, source code, tests, CI, deployment configuration, or Git history. The GitHub repository URL resolves successfully but has no refs/content. This plan therefore treats the project as a greenfield build and keeps all implementation in this workspace.

## 2. Product definition

### 2.1 Target users and adoption motion

**Primary adopters:** front-end/QA engineers who need a CI signal beyond axe-core; accessibility agencies that need defensible before/after evidence; and e-commerce, banking, ticketing, SaaS, and public-sector teams with high-value forms and transactions.

**Beneficiaries:** keyboard-only users, screen-reader users, and people who depend on accessible controls.

**Initial adoption motion:** free local CLI runnable with `npx`; a GitHub Action that uploads reports as artifacts and optionally emits SARIF; and a small broken/fixed demo site. No account, server, database, or API key is required for the MVP.

### 2.2 Core promise and boundaries

The tool will load a versioned YAML/JSON journey spec, launch Chromium through Playwright, interact through keyboard events and accessible role/name targets, record focus stops, run deterministic oracles, capture screenshots and accessibility-tree evidence, produce HTML/JSON/SARIF, and exit non-zero for configured blocking barriers or regressions.

It will not claim WCAG/ADA/EAA compliance, replace manual or assistive-technology testing, use an LLM as the judge, use CSS selectors as the primary target mechanism, test third-party sites without permission, or support Firefox/WebKit/native apps/full screen-reader automation in the first release.

## 3. MVP acceptance criteria

1. New users can run it with one documented command and no service setup.
2. A journey supports `expect`, `type`, `activate`, and error/assertion steps.
3. Targets are resolved by accessible role and name; missing/ambiguous targets are failures.
4. The runner logs tab order, focused element, action, oracle results, and timing for every step.
5. Initial oracles cover reachability, keyboard escape/no trap, visible focus, name/role/value, error association, status announcement, and basic focus management.
6. Every failure includes step, oracle, WCAG mapping, severity, recommendation, screenshot, and accessibility-tree excerpt when available.
7. Broken and fixed demo variants have seeded faults and an honest axe-only versus A11yPilot benchmark.
8. HTML, JSON, and SARIF are generated from one normalized result model.
9. Baselines classify findings as fixed, new, unchanged, or changed.
10. Blocking findings produce a non-zero exit code and are safe in CI.
11. The fixed demo completes with zero false-positive blocking findings.
12. Unit, integration, and end-to-end checks run locally and in GitHub Actions.

## 4. Recommended technical choices

Use TypeScript because it keeps Playwright, axe-core, CLI code, reporters, demo fixtures, and the future GitHub Action in one ecosystem.

- Node.js 20 LTS or newer.
- TypeScript with strict mode.
- Playwright for Chromium, keyboard input, screenshots, and browser inspection.
- `@axe-core/playwright` for complementary page-level checks.
- Zod for runtime validation of YAML/JSON specs and normalized results.
- `yaml` for the spec format.
- Vitest for pure unit/integration tests and Playwright Test for browser acceptance tests.
- ESLint and Prettier with npm scripts as the supported local interface.
- Static escaped HTML templates; no web framework for the report.

Python is viable, but TypeScript avoids crossing language boundaries between Playwright, axe-core, the CLI, and the GitHub Action. The journey format and result schema stay language-neutral, so this is reversible.

### Distribution and deployment

The first deployable product is a package, not a hosted service:

- Publish `@a11ypilot/cli` to npm (placeholder name).
- Support `npx @a11ypilot/cli run journey.yml`.
- Provide a GitHub Action after the CLI contract is stable.
- Upload HTML, JSON, screenshots, and SARIF as CI artifacts.
- Pin Playwright/browser versions in CI and document Chromium installation.
- Keep local execution offline from A11yPilot servers by default.

Hosted monitoring is a later product surface, not a prerequisite for the MVP.

## 5. Proposed repository layout

```text
.
├── src/
│   ├── cli.ts
│   ├── spec/{schema.ts,loader.ts,diagnostics.ts}
│   ├── runner/{journey-runner.ts,keyboard-navigator.ts,target-resolver.ts,browser-session.ts}
│   ├── oracles/{types.ts,reachability.ts,keyboard-trap.ts,focus-visible.ts,focus-management.ts,name-role-value.ts,form-errors.ts,status-messages.ts,axe.ts}
│   ├── evidence/{collector.ts,accessibility-tree.ts,focus-log.ts}
│   ├── scoring/{scorer.ts,diff.ts}
│   └── reporters/{model.ts,html.ts,json.ts,sarif.ts}
├── demo/{broken/,fixed/,server.ts}
├── journeys/{signup.yml,validation-recovery.yml,modal-and-dropdown.yml}
├── tests/{unit/,integration/,e2e/}
├── .github/workflows/ci.yml
├── docs/{PRODUCT-AND-BUILD-PLAN.md,journey-spec.md,oracle-reference.md,contributing.md}
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
└── README.md
```

## 6. Domain model and execution design

### 6.1 Versioned journey spec

```yaml
version: 1
name: Register account
start: http://127.0.0.1:4173/signup
options:
  maxTabStops: 80
  timeoutMs: 5000
steps:
  - goal: reach the email field
    expect: { role: textbox, name: Email }
  - type:
      target: { role: textbox, name: Email }
      text: user@example.com
  - activate: { role: button, name: Create account }
  - expectError:
      field: { role: textbox, name: Email }
      announced: true
```

Start with `goto`, `goal/expect`, `type`, `activate`, `press`, `expectError`, `expectStatus`, and `snapshot`. Every normalized step gets a stable ID. CSS selectors are not accepted in the MVP schema. Secrets must be environment references, never committed values. Schema errors identify the exact path.

### 6.2 Keyboard-only enforcement

Use `page.keyboard` for Tab, Shift+Tab, Enter, Space, Escape, arrows, and text entry. Do not call locator click, mouse APIs, or JavaScript-triggered click handlers during journey execution. Resolve targets by role/name and tab until the target is focused. Record every focus stop and enforce a tab-stop limit. DOM evaluation is observation only (styles, ARIA state, bounds), never an action. Dynamic or uncertain results become `needs-review`, never a silent pass.

### 6.3 Normalized result model

All reporters consume one immutable model containing run metadata, journey/step IDs, action traces, tab-stop logs, oracle results (`pass | fail | needs-review`), severity, WCAG criterion, recommendations, evidence references, aggregate journey result (`completed | completed-with-barriers | blocked`), and baseline diff classification. This prevents HTML, JSON, SARIF, and future APIs from diverging.

## 7. Oracle rollout

### Tier 1: blocking journey signals

1. Reachability (2.1.1): target found by keyboard within the configured limit.
2. No keyboard trap (2.1.2): focus can leave the component with reverse/forward navigation or Escape where appropriate.
3. Focus visible (2.4.7): computed indicator plus screenshot evidence; conservative needs-review for complex styling.
4. Name, role, value (4.1.2): expected role/name and state/value are observable.

### Tier 2: forms and state changes

5. Error identification (3.3.1): invalid state, visible description, and field association.
6. Error suggestion/recovery (3.3.3): user can return to the invalid control and resubmit by keyboard.
7. Status announcement (4.1.3): success/error message uses an appropriate live region or observable equivalent.
8. Focus management: dialogs receive focus and return it; route/state changes place focus sensibly.

### Tier 3: context and advisory signals

9. Focus not obscured (2.4.11).
10. Focus order (2.4.3), reporting only clear violations as failures.
11. Bypass blocks (2.4.1), advisory initially.
12. Efficiency, advisory only.
13. axe-core, run once per page or after relevant steps according to a documented performance mode.

Every oracle gets pass, fail, and ambiguous/needs-review unit fixtures plus at least one browser fixture.

## 8. Demo and benchmark

Build a self-contained local demo with identical flows in two variants. The broken variant seeds a modal focus trap, missing focus return, unlabeled control, color-only error, unreachable action, and focus hidden under a sticky header. The fixed variant corrects those behaviors with equivalent content.

Before running tools, define the fault inventory. Run axe-core alone and A11yPilot with the same browser/version and clean state. Record each seeded fault as detected/not detected and include false positives. Publish raw results and methodology. The claim is not that A11yPilot finds everything; it is that it finds journey barriers page-level rules do not reliably express, with replayable evidence.

## 9. Delivery phases

### Phase 0: foundation

Initialize Git/npm, strict TypeScript, lint/format/test/build scripts, README, and CI. Exit when an empty CLI builds, tests, and passes `npm pack --dry-run`.

### Phase 1: runner and spec

Implement schema/loader/diagnostics, browser lifecycle, URL navigation, keyboard focus logger, role/name resolution, and `goto`, `expect`, `type`, `activate`, `press`. Exit when a signup journey runs against a fixture and reports unreachable targets clearly.

### Phase 2: core oracles and evidence

Add Tier 1/Tier 2 oracles, screenshots, focused-element summaries, accessibility-tree capture, tab logs, deterministic scoring, and blocking policy. Exit when broken/fixed fixtures produce explainable repeatable results.

### Phase 3: reports and regression workflow

Add HTML/JSON/SARIF, baseline save/load and diffing, output-directory/headless/retry/severity/baseline options. Exit when a developer can inspect a local report and CI can fail on new blockers.

### Phase 4: demo, packaging, and CI distribution

Add the demo server and three journeys, benchmark script, GitHub Action example, npm packaging, versioning/changelog, and release workflow. Add Docker only after native CI is stable. Exit when a new repository can run the demo and a permitted user-owned site with documented commands.

## 10. Quality strategy and canonical checks

Once scaffolded, these should be the canonical checks:

```text
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run demo:benchmark
```

CI runs fast checks on every pull request and Chromium fixture/e2e checks on pull requests and the default branch. A check is not considered passing until it has actually run.

Use pure unit tests for schemas, matching, oracle decisions, scoring, and diffing; browser integration tests for focus/evidence; CLI e2e tests against broken/fixed demo pages; small stable report snapshots; and a regression fixture for every fixed bug.

## 11. Security, privacy, and operations

Treat specs and target pages as untrusted. Do not log field values, cookies, authorization headers, or screenshots by default when marked sensitive. Add redaction/sensitive-field support before encouraging authenticated journeys. Set navigation/action/total-run timeouts and prevent infinite tab loops. Limit artifact sizes. Make external URL testing explicit with an opt-in permission reminder. Do not upload artifacts from the CLI; the caller controls CI storage.

## 12. Market validation after MVP

Measure time to first report, journey-authoring success without support, detection lift over axe-only, false positives on fixed fixtures, CI runtime/flakiness, regressions caught before release, and the most requested templates (signup, login, checkout, form recovery, search, cookie consent).

Build hosted monitoring only when users repeatedly request scheduled runs, history, alerting, team permissions, or cross-site aggregation. Monitoring/evidence history is the likely paid layer; the open-source CLI is the adoption engine.

## 13. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Browser inspection is not a full screen-reader tree | Be precise about evidence; add Guidepup later; document limitations. |
| Dynamic pages cause flaky focus state | Wait on observable state, retry once, preserve attempts, and use needs-review. |
| Focus heuristics create false positives | Conservative rules, screenshots, and needs-review. |
| Users expect compliance certification | Put the disclaimer in CLI output, README, and every report. |
| Authenticated journeys leak secrets | Environment-only secrets, redaction, and no telemetry. |
| axe comparison is unfair | Freeze browser/version, disclose methodology, publish false positives. |
| Scope expands into a full platform | Enforce the journey-level wedge; defer dashboard, extension, and screen-reader layers. |
| Packaging is fragile | Test `npm pack`, document browser install, and provide a known-good CI image if needed. |

## 14. Immediate next implementation slice

1. Initialize the TypeScript package and canonical scripts.
2. Create a minimal local demo with one labeled and one intentionally unlabeled button.
3. Implement the versioned spec loader and one `expect` step.
4. Implement keyboard tab navigation with a focus-stop log.
5. Implement reachability and JSON output.
6. Add unit tests for schema errors and reachability pass/fail.
7. Add CI for lint, typecheck, unit tests, and build.

This proves the core thesis before investing in report polish or hosted infrastructure. After it passes, add evidence capture and the first broken/fixed journey.

## 15. Decisions before public release

1. Final package/npm organization name.
2. Whether `needs-review` fails CI by default (recommended: no; configurable).
3. Stable SARIF rule IDs and taxonomy.
4. Environment-variable versus named secrets-file policy.
5. Engineer-focused versus executive report summary.
6. First three reusable journey templates.
7. License and contribution policy.
