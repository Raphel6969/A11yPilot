import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { gsap } from "gsap";
import "./styles.css";

type Status = "passed" | "attention" | "not-run";
type Page = "overview" | "journeys" | "runs" | "settings" | "docs";
type Journey = {
  id: string;
  name: string;
  detail: string;
  status: Status;
  score: string;
  time: string;
  method: string;
};
type Run = {
  id: string;
  journey: string;
  status: Status;
  score: string;
  time: string;
  barriers: number;
  date: string;
  format?: string;
};
const starterJourneys: Journey[] = [
  {
    id: "account",
    name: "Create an account",
    detail: "Sign up · 6 steps",
    status: "passed",
    score: "100%",
    time: "2m ago",
    method: "Template",
  },
  {
    id: "recovery",
    name: "Recover from a form error",
    detail: "Checkout · 4 steps",
    status: "attention",
    score: "75%",
    time: "18m ago",
    method: "Guided",
  },
  {
    id: "dialog",
    name: "Open and close a dialog",
    detail: "Settings · 5 steps",
    status: "not-run",
    score: "—",
    time: "Never run",
    method: "Template",
  },
];
const starterRuns: Run[] = [
  {
    id: "r1",
    journey: "Create an account",
    status: "passed",
    score: "100%",
    time: "2 minutes ago",
    barriers: 0,
    date: "Today, 10:42 AM",
  },
  {
    id: "r2",
    journey: "Recover from a form error",
    status: "attention",
    score: "75%",
    time: "18 minutes ago",
    barriers: 1,
    date: "Today, 10:26 AM",
  },
];
const pageLabels: Record<Page, string> = {
  overview: "Overview",
  journeys: "Journeys",
  runs: "Run history",
  settings: "Settings",
  docs: "Documentation",
};
const readStorage = <T,>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
};
const pathPage = (): Page => {
  const value = window.location.hash.replace(/^#\/?/, "").split("/")[0] as Page;
  return pageLabels[value] ? value : "overview";
};

export function App() {
  const [page, setPage] = useState<Page>(pathPage);
  const [journeys, setJourneys] = useState<Journey[]>(() =>
    readStorage("a11ypilot-journeys", starterJourneys),
  );
  const [runs, setRuns] = useState<Run[]>(() =>
    readStorage("a11ypilot-runs", starterRuns),
  );
  const [selectedId, setSelectedId] = useState("recovery");
  const [showModal, setShowModal] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const change = () => setPage(pathPage());
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    localStorage.setItem("a11ypilot-journeys", JSON.stringify(journeys));
  }, [journeys]);
  useEffect(() => {
    localStorage.setItem("a11ypilot-runs", JSON.stringify(runs));
  }, [runs]);
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".page-view", {
        opacity: 0,
        y: 10,
        duration: 0.35,
        ease: "power2.out",
      });
      gsap.from(".stagger-in", {
        opacity: 0,
        y: 12,
        duration: 0.45,
        stagger: 0.05,
        delay: 0.06,
        ease: "power2.out",
      });
    }, contentRef);
    return () => ctx.revert();
  }, [page]);
  const navigate = (next: Page) => {
    window.location.hash = next;
    setMobileNav(false);
  };
  const addJourney = (name: string, method: string) => {
    const journey = {
      id: `${Date.now()}`,
      name,
      detail:
        method === "Import"
          ? "Imported spec · ready to run"
          : "New journey · 0 steps",
      status: "not-run" as Status,
      score: "—",
      time: "Never run",
      method,
    };
    setJourneys((items) => [...items, journey]);
    setSelectedId(journey.id);
    setShowModal(false);
    navigate("journeys");
  };
  const runJourney = (journey: Journey, goHistory = true) => {
    const passed = journey.id !== "recovery";
    const run: Run = {
      id: `${Date.now()}`,
      journey: journey.name,
      status: passed ? "passed" : "attention",
      score: passed ? "100%" : "75%",
      time: "Just now",
      barriers: passed ? 0 : 1,
      date: "Just now",
    };
    setRuns((items) => [run, ...items]);
    setJourneys((items) =>
      items.map((item) =>
        item.id === journey.id
          ? { ...item, status: run.status, score: run.score, time: run.time }
          : item,
      ),
    );
    if (goHistory) navigate("runs");
  };
  return (
    <div className="app-shell" ref={contentRef}>
      <Sidebar page={page} navigate={navigate} mobile={mobileNav} />
      <main id="main" className="main-content">
        <header className="topbar">
          <button
            className="mobile-menu"
            aria-label="Open navigation"
            aria-expanded={mobileNav}
            onClick={() => setMobileNav(!mobileNav)}
          >
            ☰
          </button>
          <div className="breadcrumb">
            <span>Workspace</span>
            <b>/</b>
            <strong>{pageLabels[page]}</strong>
          </div>
          <div className="top-actions">
            <span className="last-run">
              <i /> All systems operational
            </span>
            <button
              className="icon-button"
              aria-label="Notifications"
              onClick={() =>
                setNotice(
                  "No new notifications. Your local workspace is up to date.",
                )
              }
            >
              ♧
            </button>
            <span className="top-avatar">JD</span>
          </div>
        </header>
        <div className="page-content page-view" ref={contentRef}>
          {page === "overview" && (
            <Overview
              journeys={journeys}
              runs={runs}
              navigate={navigate}
              openNew={() => setShowModal(true)}
              runJourney={runJourney}
            />
          )}
          {page === "journeys" && (
            <Journeys
              journeys={journeys}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              openNew={() => setShowModal(true)}
              runJourney={runJourney}
            />
          )}
          {page === "runs" && <Runs runs={runs} />}
          {page === "settings" && <Settings />}
          {page === "docs" && <Docs />}
          <footer className="footer">
            <span>
              A11yPilot helps you test real user journeys. It does not certify
              compliance.
            </span>
            <a href="#docs">Read the docs →</a>
          </footer>
        </div>
      </main>
      {showModal && (
        <NewJourneyModal
          close={() => setShowModal(false)}
          create={addJourney}
        />
      )}
      {notice && (
        <button className="toast" role="status" onClick={() => setNotice(null)}>
          {notice}
        </button>
      )}
    </div>
  );
}
function Sidebar({
  page,
  navigate,
  mobile,
}: {
  page: Page;
  navigate: (p: Page) => void;
  mobile: boolean;
}) {
  return (
    <aside
      className={`sidebar ${mobile ? "mobile-open" : ""}`}
      aria-label="Primary navigation"
    >
      <a className="brand" href="#overview">
        <span className="brand-mark">a</span>
        <span>A11yPilot</span>
      </a>
      <button
        className="workspace"
        onClick={() =>
          window.alert(
            "Workspace switching will be available when remote workspaces are connected.",
          )
        }
      >
        <span className="workspace-dot" />
        Acme Product <span className="chevron">⌄</span>
      </button>
      <nav>
        <p className="nav-label">Workspace</p>
        {(["overview", "journeys", "runs"] as Page[]).map((item) => (
          <button
            key={item}
            className={`nav-item ${page === item ? "active" : ""}`}
            onClick={() => navigate(item)}
          >
            <span aria-hidden="true">
              {item === "overview" ? "◈" : item === "journeys" ? "↗" : "◷"}
            </span>
            {pageLabels[item]}
            {item === "journeys" && (
              <span className="nav-count">
                {
                  readStorage<Journey[]>("a11ypilot-journeys", starterJourneys)
                    .length
                }
              </span>
            )}
          </button>
        ))}
        <p className="nav-label nav-label-spaced">Manage</p>
        {(["settings", "docs"] as Page[]).map((item) => (
          <button
            key={item}
            className={`nav-item ${page === item ? "active" : ""}`}
            onClick={() => navigate(item)}
          >
            <span aria-hidden="true">{item === "settings" ? "⚙" : "?"}</span>
            {pageLabels[item]}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="plan-card">
          <span className="eyebrow">Your plan</span>
          <strong>Local & open source</strong>
          <span>Run unlimited journeys locally.</span>
          <a href="#docs">View setup guide ↗</a>
        </div>
        <div className="profile">
          <span className="avatar">JD</span>
          <span>
            <strong>Jordan Davis</strong>
            <small>jordan@acme.co</small>
          </span>
        </div>
      </div>
    </aside>
  );
}
function Header({
  eyebrow,
  title,
  copy,
  action,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  copy?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="hero stagger-in">
      <div>
        {eyebrow && <p className="eyebrow teal">{eyebrow}</p>}
        <h1>{title}</h1>
        {copy && <p className="hero-copy">{copy}</p>}
      </div>
      {action}
    </section>
  );
}
function Overview({
  journeys,
  runs,
  navigate,
  openNew,
  runJourney,
}: {
  journeys: Journey[];
  runs: Run[];
  navigate: (p: Page) => void;
  openNew: () => void;
  runJourney: (j: Journey, goHistory?: boolean) => void;
}) {
  const passing = journeys.filter((j) => j.status === "passed").length;
  const [fixed, setFixed] = useState(false);
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(false);
  const [email, setEmail] = useState("");
  const recovery = journeys.find((j) => j.id === "recovery") || journeys[0];
  const run = () => {
    setRunning(true);
    setComplete(false);
    window.setTimeout(() => {
      setRunning(false);
      setComplete(true);
      runJourney(recovery, false);
    }, 700);
  };
  return (
    <>
      <Header
        eyebrow="MONDAY, OCTOBER 18, 2026"
        title={
          <>
            Good morning, Jordan<span>.</span>
          </>
        }
        copy="Make every important journey completable. See where users get stuck, then prove the fix."
        action={
          <button className="primary-button" onClick={openNew}>
            ＋ New journey
          </button>
        }
      />
      <section className="metrics" aria-label="Workspace summary">
        <Metric
          label="Journey health"
          value={`${journeys.length ? Math.round((passing / journeys.length) * 100) : 0}%`}
          note="Across all journeys"
          icon="↗"
        />
        <Metric
          label="Journeys passing"
          value={`${passing} / ${journeys.length}`}
          note="One needs attention"
          icon="✓"
        />
        <Metric
          label="Focus stops recorded"
          value={`${runs.reduce((sum, r) => sum + r.barriers, 0)}`}
          note="Across your recent runs"
          icon="⌁"
        />
      </section>
      <div className="content-grid">
        <section className="panel stagger-in">
          <PanelHeading
            title="Your journeys"
            copy="Real tasks, tested with the keyboard."
            action={
              <button
                className="text-button"
                onClick={() => navigate("journeys")}
              >
                View all →
              </button>
            }
          />
          {journeys.slice(0, 3).map((journey) => (
            <JourneyRow
              key={journey.id}
              journey={journey}
              onClick={() => navigate("journeys")}
            />
          ))}
          <button className="add-journey" onClick={openNew}>
            ＋ Add a journey
          </button>
        </section>
        <section className="panel stagger-in">
          <PanelHeading
            title="Recent activity"
            copy="A quiet view of what changed."
          />
          {runs.slice(0, 3).map((run) => (
            <Activity key={run.id} run={run} />
          ))}
          <div className="activity-footer">
            <span className="pulse" /> Runs are recorded locally
          </div>
        </section>
      </div>
      <section className="demo-panel panel stagger-in">
        <div className="demo-heading">
          <div>
            <span className="eyebrow teal">INTERACTIVE DEMO</span>
            <h2>See the barrier. Feel the fix.</h2>
            <p>Try the same recovery journey in its broken and fixed states.</p>
          </div>
          <div className="state-toggle" role="group" aria-label="Demo state">
            <button
              className={!fixed ? "active" : ""}
              onClick={() => {
                setFixed(false);
                setComplete(false);
              }}
            >
              Broken
            </button>
            <button
              className={fixed ? "active fixed" : ""}
              onClick={() => {
                setFixed(true);
                setComplete(false);
              }}
            >
              Fixed
            </button>
          </div>
        </div>
        <div className="demo-body">
          <div className="demo-copy">
            <div className="journey-step">
              <span className="step-number">01</span>
              <span>
                <strong>Recover from a form error</strong>
                <small>We intentionally start with an invalid email.</small>
              </span>
            </div>
            <div className="journey-step">
              <span className="step-number muted">02</span>
              <span>
                <strong className="muted-text">
                  Correct the field and resubmit
                </strong>
                <small className="muted-text">
                  Keyboard-only · no mouse required
                </small>
              </span>
            </div>
            <div
              className={`run-result ${complete ? "show" : ""}`}
              aria-live="polite"
            >
              {complete && (
                <>
                  <span>✓</span>
                  <strong>
                    {fixed ? "Journey passed" : "1 barrier found"}
                  </strong>
                  <small>
                    {fixed
                      ? "All 4 steps completed with no barriers."
                      : "Error is visible, but not announced to assistive technology."}
                  </small>
                </>
              )}
            </div>
            <button className="run-button" onClick={run} disabled={running}>
              {running ? (
                "◌ Running journey…"
              ) : (
                <>
                  Run this journey <span>→</span>
                </>
              )}
            </button>
          </div>
          <div className={`mini-browser ${fixed ? "is-fixed" : ""}`}>
            <div className="browser-bar">
              <span />
              <span />
              <span />
              <small>acme.co / checkout</small>
            </div>
            <div className="browser-content">
              <span className="mini-kicker">ACME CHECKOUT</span>
              <h3>Almost there</h3>
              <p>Enter your details to finish.</p>
              <label htmlFor="demo-email">Email address</label>
              <input
                id="demo-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!fixed}
                aria-describedby="email-error"
                placeholder="you@example.com"
              />
              <div
                className={`field-error ${fixed ? "good" : ""}`}
                id="email-error"
                role={fixed ? "status" : undefined}
              >
                {fixed
                  ? "✓ Email looks good."
                  : "Please enter a valid email address."}
              </div>
              <button
                className="demo-submit"
                onClick={() => setEmail(email || "jordan@acme.co")}
              >
                {fixed ? "Continue to payment" : "Continue"}
              </button>
              <span className="mini-focus">⌨ Keyboard focus visible</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
function Metric({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: string;
}) {
  return (
    <article className="metric-card stagger-in">
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        <span className="metric-icon green">{icon}</span>
      </div>
      <strong className="metric-value">{value}</strong>
      <span className="metric-trend">{note}</span>
    </article>
  );
}
function PanelHeading({
  title,
  copy,
  action,
}: {
  title: string;
  copy: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel-heading">
      <div>
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
      {action}
    </div>
  );
}
function JourneyRow({
  journey,
  onClick,
}: {
  journey: Journey;
  onClick?: () => void;
}) {
  return (
    <button className="journey-row" onClick={onClick}>
      <span className={`journey-icon ${journey.status}`}>
        {journey.status === "passed"
          ? "✓"
          : journey.status === "attention"
            ? "!"
            : "○"}
      </span>
      <span className="journey-info">
        <strong>{journey.name}</strong>
        <small>
          {journey.detail} · {journey.method}
        </small>
      </span>
      <span className="journey-result">
        <strong className={journey.status}>{journey.score}</strong>
        <small>{journey.time}</small>
      </span>
      <span className="row-arrow">→</span>
    </button>
  );
}
function Activity({ run }: { run: Run }) {
  return (
    <button
      className="activity-item"
      onClick={() => (window.location.hash = "runs")}
    >
      <span
        className={`activity-icon ${run.status === "passed" ? "green" : "amber"}`}
      >
        {run.status === "passed" ? "✓" : "!"}
      </span>
      <span>
        <strong>
          {run.journey} {run.status === "passed" ? "passed" : "needs attention"}
        </strong>
        <small>
          {run.time} · {run.barriers} barrier{run.barriers === 1 ? "" : "s"}
        </small>
      </span>
      <span className="activity-arrow">→</span>
    </button>
  );
}
function Journeys({
  journeys,
  selectedId,
  setSelectedId,
  openNew,
  runJourney,
}: {
  journeys: Journey[];
  selectedId: string;
  setSelectedId: (id: string) => void;
  openNew: () => void;
  runJourney: (j: Journey, goHistory?: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Status | "all">("all");
  const selected = journeys.find((j) => j.id === selectedId) || journeys[0];
  const visible = journeys.filter(
    (j) =>
      j.name.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "all" || j.status === filter),
  );
  return (
    <>
      <Header
        title="Journeys"
        copy="Design, edit, and run the tasks that matter to your users."
        action={
          <button className="primary-button" onClick={openNew}>
            ＋ New journey
          </button>
        }
      />
      <div className="toolbar">
        <label className="search-field">
          <span>⌕</span>
          <input
            aria-label="Search journeys"
            placeholder="Search journeys"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Filter journeys"
          value={filter}
          onChange={(e) => setFilter(e.target.value as Status | "all")}
        >
          <option value="all">All statuses</option>
          <option value="passed">Passing</option>
          <option value="attention">Needs attention</option>
          <option value="not-run">Not run</option>
        </select>
      </div>
      <div className="journey-layout">
        <section className="panel journey-directory">
          <PanelHeading
            title={`${visible.length} journeys`}
            copy="Select a journey to view its details."
          />
          {visible.length ? (
            visible.map((j) => (
              <JourneyRow
                journey={j}
                key={j.id}
                onClick={() => setSelectedId(j.id)}
              />
            ))
          ) : (
            <Empty text="No journeys match your search." />
          )}
        </section>
        {selected && (
          <section className="panel journey-detail">
            <span className="eyebrow teal">{selected.method} JOURNEY</span>
            <h2>{selected.name}</h2>
            <p>{selected.detail}</p>
            <div className="detail-status">
              <span className={`journey-icon ${selected.status}`}>
                {selected.status === "passed"
                  ? "✓"
                  : selected.status === "attention"
                    ? "!"
                    : "○"}
              </span>
              <strong>
                {selected.status === "not-run"
                  ? "Ready to run"
                  : `${selected.score} health score`}
              </strong>
            </div>
            <h3>Steps</h3>
            <ol>
              <li>Open the journey starting page</li>
              <li>Complete the task using keyboard controls</li>
              <li>Verify focus and error feedback</li>
            </ol>
            <button
              className="primary-button full"
              onClick={() => runJourney(selected)}
            >
              ▶ Run journey
            </button>
            <button
              className="secondary-button full"
              onClick={() => alert("Journey basics saved locally.")}
            >
              Save changes
            </button>
          </section>
        )}
      </div>
    </>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}
function Runs({ runs }: { runs: Run[] }) {
  const exportData = (format: "json" | "html" | "sarif") => {
    const payload =
      format === "sarif"
        ? {
            version: "2.1.0",
            runs: [
              {
                tool: { driver: { name: "A11yPilot" } },
                results: runs.map((r) => ({
                  message: { text: `${r.barriers} barriers in ${r.journey}` },
                  level: r.status === "passed" ? "note" : "warning",
                })),
              },
            ],
          }
        : format === "html"
          ? `<html><body><h1>A11yPilot run history</h1><ul>${runs.map((r) => `<li>${r.journey}: ${r.score}</li>`).join("")}</ul></body></html>`
          : JSON.stringify(runs, null, 2);
    const blob = new Blob(
      [
        typeof payload === "string"
          ? payload
          : JSON.stringify(payload, null, 2),
      ],
      { type: format === "html" ? "text/html" : "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `a11ypilot-runs.${format === "sarif" ? "sarif" : format}`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <Header
        title="Run history"
        copy="Review simulated evidence from every journey run and export it for your team."
      />
      <section className="panel export-panel">
        <div>
          <h2>Export evidence</h2>
          <p>Download results in a format your tooling understands.</p>
        </div>
        <div className="export-actions">
          <button onClick={() => exportData("json")}>JSON</button>
          <button onClick={() => exportData("html")}>HTML</button>
          <button onClick={() => exportData("sarif")}>SARIF</button>
        </div>
      </section>
      <section className="panel">
        <PanelHeading
          title={`${runs.length} recorded runs`}
          copy="Runs are stored in this browser."
        />
        <div className="run-table" role="table" aria-label="Run history">
          <div className="run-table-row run-table-head" role="row">
            <span>Journey</span>
            <span>Status</span>
            <span>Barriers</span>
            <span>When</span>
          </div>
          {runs.map((run) => (
            <div className="run-table-row" role="row" key={run.id}>
              <strong>{run.journey}</strong>
              <span className={`status-pill ${run.status}`}>
                {run.status === "passed" ? "Passed" : "Attention"} · {run.score}
              </span>
              <span>{run.barriers}</span>
              <span>{run.date}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
function Settings() {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState(() =>
    readStorage("a11ypilot-settings", {
      workspace: "Acme Product",
      baseUrl: "http://localhost:3000",
      reducedMotion: false,
      announcements: true,
      timeoutMs: 5000,
      maxTabStops: 80,
      defaultFormat: "html",
      redactScreenshots: true,
    }),
  );
  const save = () => {
    localStorage.setItem("a11ypilot-settings", JSON.stringify(settings));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };
  return (
    <>
      <Header
        title="Settings"
        copy="Tune your local workspace and accessibility preferences."
      />
      <section className="settings-grid">
        <section className="panel settings-card">
          <span className="eyebrow teal">WORKSPACE</span>
          <h2>Workspace details</h2>
          <label>
            Workspace name
            <input
              value={settings.workspace}
              onChange={(e) =>
                setSettings({ ...settings, workspace: e.target.value })
              }
            />
          </label>
          <label>
            Application base URL
            <input
              value={settings.baseUrl}
              onChange={(e) =>
                setSettings({ ...settings, baseUrl: e.target.value })
              }
            />
          </label>
        </section>
        <section className="panel settings-card">
          <span className="eyebrow teal">PREFERENCES</span>
          <h2>Interface preferences</h2>
          <label className="check-row">
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) =>
                setSettings({ ...settings, reducedMotion: e.target.checked })
              }
            />{" "}
            Reduce motion
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={settings.announcements}
              onChange={(e) =>
                setSettings({ ...settings, announcements: e.target.checked })
              }
            />{" "}
            Announce run results
          </label>
          <p className="setting-help">
            Preferences are saved to this browser only.
          </p>
        </section>
        <section className="panel settings-card">
          <span className="eyebrow teal">RUNNER DEFAULTS</span>
          <h2>Evidence and limits</h2>
          <label>
            Action timeout (ms)
            <input
              type="number"
              min="1000"
              step="500"
              value={settings.timeoutMs}
              onChange={(e) =>
                setSettings({ ...settings, timeoutMs: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Maximum tab stops
            <input
              type="number"
              min="1"
              value={settings.maxTabStops}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  maxTabStops: Number(e.target.value),
                })
              }
            />
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={settings.redactScreenshots}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  redactScreenshots: e.target.checked,
                })
              }
            />{" "}
            Redact sensitive screenshots by default
          </label>
          <p className="setting-help">
            These defaults apply to new journey runs. Never store passwords,
            cookies, or tokens in specs.
          </p>
        </section>
      </section>
      <div className="save-row">
        <button className="primary-button" onClick={save}>
          Save settings
        </button>
        {saved && <span role="status">Settings saved.</span>}
      </div>
    </>
  );
}
function Docs() {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const sections = [
    {
      title: "Getting started",
      text: "Create a journey from a guided builder, a reusable template, or a validated YAML/JSON spec. Run it locally, then inspect the evidence-backed result.",
    },
    {
      title: "Journey format",
      text: "Journey specs contain version, name, start URL, options, and ordered steps. Targets use accessible role and name, never fragile CSS selectors.",
    },
    {
      title: "Ways to create journeys",
      text: "Guided creation is best for teams starting out. Templates provide common signup, checkout, dialog, and form-recovery flows. Import is best for specs already reviewed in a repository.",
    },
    {
      title: "Oracle reference",
      text: "Reachability, keyboard traps, focus visibility, name/role/value, form errors, status announcements, and focus management return pass, fail, or needs-review with a WCAG mapping.",
    },
    {
      title: "Reports and exports",
      text: "HTML is for people, JSON is for internal tooling, and SARIF is for code-scanning workflows. Every finding should retain its step, severity, recommendation, and evidence.",
    },
    {
      title: "Command line",
      text: "Command line: Validate and run journeys in CI with the A11yPilot CLI. Use the exit code to block configured failures, upload HTML/JSON/SARIF as artifacts, and keep browser versions pinned in CI.",
    },
    {
      title: "Privacy and limitations",
      text: "A11yPilot runs locally and does not certify WCAG, ADA, or EAA compliance. Do not place passwords, cookies, tokens, or sensitive page content in specs or reports.",
    },
    {
      title: "Troubleshooting",
      text: "If a target is not found, verify its accessible role and name. If Chromium cannot launch, install the pinned Playwright browser or use the provided Docker image.",
    },
  ];
  const filtered = sections.filter((s) =>
    `${s.title} ${s.text}`.toLowerCase().includes(query.toLowerCase()),
  );
  const command = "npx a11ypilot run journey.example.yml";
  const copy = async () => {
    await navigator.clipboard?.writeText(command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <>
      <Header
        title="Documentation"
        copy="Learn how A11yPilot turns real tasks into accessibility evidence."
      />
      <label className="docs-search search-field">
        <span>⌕</span>
        <input
          aria-label="Search documentation"
          placeholder="Search documentation"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="docs-layout">
        <nav className="docs-nav" aria-label="Documentation sections">
          {filtered.map((s) => (
            <a href={`#doc-${s.title.replace(/ /g, "-")}`} key={s.title}>
              {s.title}
            </a>
          ))}
        </nav>
        <section className="docs-content">
          {filtered.map((s) => (
            <article
              className="panel doc-section"
              id={`doc-${s.title.replace(/ /g, "-")}`}
              key={s.title}
            >
              <h2>{s.title}</h2>
              <p>{s.text}</p>
              {s.title === "Command line" && (
                <div className="command-box">
                  <code>{command}</code>
                  <button onClick={copy}>
                    {copied ? "Copied" : "Copy command"}
                  </button>
                </div>
              )}
            </article>
          ))}
          {!filtered.length && (
            <Empty text="No documentation sections match your search." />
          )}
        </section>
      </div>
    </>
  );
}
function NewJourneyModal({
  close,
  create,
}: {
  close: () => void;
  create: (name: string, method: string) => void;
}) {
  const [name, setName] = useState("");
  const [method, setMethod] = useState("Guided");
  const [spec, setSpec] = useState(
    "version: 1\nname: Imported journey\nstart: http://localhost:3000\nsteps: []",
  );
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "Tab" && dialog.current) {
        const focusable = dialog.current.querySelectorAll<HTMLElement>(
          "button, input, select",
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={close}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-journey-title"
        ref={dialog}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close"
          aria-label="Close dialog"
          onClick={close}
        >
          ×
        </button>
        <span className="eyebrow teal">NEW JOURNEY</span>
        <h2 id="new-journey-title">What should we test?</h2>
        <p>Start with a task your users need to complete.</p>
        <label htmlFor="journey-name">Journey name</label>
        <input
          id="journey-name"
          autoFocus
          placeholder="e.g. Complete checkout"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label htmlFor="journey-method">Creation method</label>
        <p className="field-help">
          Choose how your team wants to define the task.
        </p>
        <select
          id="journey-method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          <option>Guided</option>
          <option>Template</option>
          <option>Import</option>
          <option>Paste spec</option>
        </select>
        {(method === "Import" || method === "Paste spec") && (
          <label htmlFor="journey-spec">
            Journey YAML or JSON
            <textarea
              id="journey-spec"
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              rows={5}
            />
            <span className="field-help">
              A11yPilot validates role/name targets before saving.
            </span>
          </label>
        )}
        <button
          className="primary-button full"
          disabled={!name.trim()}
          onClick={() => create(name.trim(), method)}
        >
          Create journey <span>→</span>
        </button>
      </section>
    </div>
  );
}
const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
