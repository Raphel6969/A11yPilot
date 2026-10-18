import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { gsap } from "gsap";
import "./styles.css";

type Status = "passed" | "attention" | "not-run";
const journeys = [
  {
    name: "Create an account",
    detail: "Sign up · 6 steps",
    status: "passed" as Status,
    score: "100%",
    time: "2m ago",
    icon: "↗",
  },
  {
    name: "Recover from a form error",
    detail: "Checkout · 4 steps",
    status: "attention" as Status,
    score: "75%",
    time: "18m ago",
    icon: "!",
  },
  {
    name: "Open and close a dialog",
    detail: "Settings · 5 steps",
    status: "not-run" as Status,
    score: "—",
    time: "Never run",
    icon: "○",
  },
];

export function App() {
  const [selectedJourney, setSelectedJourney] = useState(1);
  const [fixed, setFixed] = useState(false);
  const [running, setRunning] = useState(false);
  const [runComplete, setRunComplete] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [email, setEmail] = useState("");
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".sidebar, .topbar", {
        opacity: 0,
        duration: 0.45,
        ease: "power2.out",
      });
      gsap.from(".stagger-in", {
        opacity: 0,
        y: 16,
        duration: 0.6,
        stagger: 0.08,
        delay: 0.15,
        ease: "power2.out",
      });
      gsap.from(".metric-value", {
        textContent: 0,
        duration: 1.1,
        stagger: 0.1,
        snap: { textContent: 1 },
        ease: "power1.out",
      });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  const runJourney = () => {
    setRunning(true);
    setRunComplete(false);
    window.setTimeout(() => {
      setRunning(false);
      setRunComplete(true);
    }, 950);
  };
  const active = journeys[selectedJourney];

  return (
    <div className="app-shell" ref={heroRef}>
      <aside className="sidebar" aria-label="Primary navigation">
        <a className="brand" href="#main" aria-label="A11yPilot home">
          <span className="brand-mark">a</span>
          <span>A11yPilot</span>
        </a>
        <div className="workspace">
          <span className="workspace-dot" aria-hidden="true" />
          Acme Product <span className="chevron">⌄</span>
        </div>
        <nav>
          <p className="nav-label">Workspace</p>
          <a className="nav-item active" href="#overview">
            <span aria-hidden="true">◈</span>Overview
          </a>
          <a className="nav-item" href="#journeys">
            <span aria-hidden="true">↗</span>Journeys{" "}
            <span className="nav-count">3</span>
          </a>
          <a className="nav-item" href="#runs">
            <span aria-hidden="true">◷</span>Run history
          </a>
          <p className="nav-label nav-label-spaced">Manage</p>
          <a className="nav-item" href="#settings">
            <span aria-hidden="true">⚙</span>Settings
          </a>
          <a className="nav-item" href="#docs">
            <span aria-hidden="true">?</span>Documentation{" "}
            <span className="external">↗</span>
          </a>
        </nav>
        <div className="sidebar-bottom">
          <div className="plan-card">
            <span className="eyebrow">Your plan</span>
            <strong>Local & open source</strong>
            <span>Run unlimited journeys locally.</span>
            <a href="#setup">View setup guide ↗</a>
          </div>
          <div className="profile">
            <span className="avatar">JD</span>
            <span>
              <strong>Jordan Davis</strong>
              <small>jordan@acme.co</small>
            </span>
            <button aria-label="Open profile menu">⋯</button>
          </div>
        </div>
      </aside>
      <main id="main" className="main-content">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open navigation">
            ☰
          </button>
          <div className="breadcrumb">
            <span>Workspace</span>
            <b>/</b>
            <strong>Overview</strong>
          </div>
          <div className="top-actions">
            <span className="last-run">
              <i /> All systems operational
            </span>
            <button className="icon-button" aria-label="Notifications">
              ♧<span className="notification-dot" />
            </button>
            <span className="top-avatar">JD</span>
          </div>
        </header>
        <div className="page-content">
          <section className="hero stagger-in">
            <div>
              <p className="eyebrow teal">MONDAY, OCTOBER 18, 2026</p>
              <h1>
                Good morning, Jordan<span>.</span>
              </h1>
              <p className="hero-copy">
                Make every important journey completable. See where users get
                stuck, then prove the fix.
              </p>
            </div>
            <button
              className="primary-button"
              onClick={() => setShowDemo(true)}
            >
              <span>+</span> New journey
            </button>
          </section>
          <section className="metrics" aria-label="Workspace summary">
            <article className="metric-card stagger-in">
              <div className="metric-top">
                <span className="metric-label">Journey health</span>
                <span className="metric-icon green">↗</span>
              </div>
              <strong className="metric-value">88%</strong>
              <span className="metric-trend up">
                ↑ 12% <em>vs last week</em>
              </span>
            </article>
            <article className="metric-card stagger-in">
              <div className="metric-top">
                <span className="metric-label">Journeys passing</span>
                <span className="metric-icon blue">✓</span>
              </div>
              <strong className="metric-value">
                2 <small>/ 3</small>
              </strong>
              <span className="metric-trend">One needs attention</span>
            </article>
            <article className="metric-card stagger-in">
              <div className="metric-top">
                <span className="metric-label">Focus stops recorded</span>
                <span className="metric-icon purple">⌁</span>
              </div>
              <strong className="metric-value">47</strong>
              <span className="metric-trend">Across your last 3 runs</span>
            </article>
          </section>
          <div className="content-grid">
            <section className="panel journeys-panel stagger-in" id="journeys">
              <div className="panel-heading">
                <div>
                  <h2>Your journeys</h2>
                  <p>Real tasks, tested with the keyboard.</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => setShowDemo(true)}
                >
                  View all <span>→</span>
                </button>
              </div>
              <div className="journey-list">
                {journeys.map((journey, i) => (
                  <button
                    key={journey.name}
                    className={`journey-row ${selectedJourney === i ? "selected" : ""}`}
                    onClick={() => setSelectedJourney(i)}
                    aria-pressed={selectedJourney === i}
                  >
                    <span className={`journey-icon ${journey.status}`}>
                      {journey.icon}
                    </span>
                    <span className="journey-info">
                      <strong>{journey.name}</strong>
                      <small>{journey.detail}</small>
                    </span>
                    <span className="journey-result">
                      <strong className={journey.status}>
                        {journey.score}
                      </strong>
                      <small>{journey.time}</small>
                    </span>
                    <span className="row-arrow" aria-hidden="true">
                      →
                    </span>
                  </button>
                ))}
              </div>
              <button className="add-journey" onClick={() => setShowDemo(true)}>
                ＋ Add a journey
              </button>
            </section>
            <section className="panel activity-panel stagger-in" id="runs">
              <div className="panel-heading">
                <div>
                  <h2>Recent activity</h2>
                  <p>A quiet view of what changed.</p>
                </div>
                <button
                  className="more-button"
                  aria-label="More activity options"
                >
                  ⋯
                </button>
              </div>
              <div className="activity-list">
                <Activity
                  icon="✓"
                  color="green"
                  title="Create an account passed"
                  meta="2 minutes ago · 6 steps"
                />
                <Activity
                  icon="!"
                  color="amber"
                  title="Form error needs attention"
                  meta="18 minutes ago · 1 barrier"
                />
                <Activity
                  icon="↗"
                  color="blue"
                  title="Journey spec updated"
                  meta="Yesterday · by Jordan"
                />
              </div>
              <div className="activity-footer">
                <span className="pulse" /> Runs are recorded locally{" "}
                <a href="#privacy">How it works</a>
              </div>
            </section>
          </div>
          <section className="demo-panel panel stagger-in" id="demo">
            <div className="demo-heading">
              <div>
                <span className="eyebrow teal">INTERACTIVE DEMO</span>
                <h2>See the barrier. Feel the fix.</h2>
                <p>
                  Try the same recovery journey in its broken and fixed states.
                </p>
              </div>
              <div
                className="state-toggle"
                role="group"
                aria-label="Demo state"
              >
                <button
                  className={!fixed ? "active" : ""}
                  onClick={() => {
                    setFixed(false);
                    setRunComplete(false);
                  }}
                >
                  Broken
                </button>
                <button
                  className={fixed ? "active fixed" : ""}
                  onClick={() => {
                    setFixed(true);
                    setRunComplete(false);
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
                  className={`run-result ${runComplete ? "show" : ""}`}
                  aria-live="polite"
                >
                  {runComplete && (
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
                <button
                  className="run-button"
                  onClick={runJourney}
                  disabled={running}
                >
                  {running ? (
                    <>
                      <span className="spinner" /> Running journey…
                    </>
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
                    aria-invalid={!fixed ? "true" : undefined}
                    aria-describedby={!fixed ? "email-error" : undefined}
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
          <footer className="footer">
            <span>
              A11yPilot helps you test real user journeys. It does not certify
              compliance.
            </span>
            <span>
              <a href="#docs">Read the docs</a> · <a href="#github">GitHub ↗</a>
            </span>
          </footer>
        </div>
      </main>
      {showDemo && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setShowDemo(false)}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-journey-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Close dialog"
              onClick={() => setShowDemo(false)}
            >
              ×
            </button>
            <span className="eyebrow teal">NEW JOURNEY</span>
            <h2 id="new-journey-title">What should we test?</h2>
            <p>
              Start with a task your users need to complete, not a page you need
              to scan.
            </p>
            <label htmlFor="journey-name">Journey name</label>
            <input
              id="journey-name"
              autoFocus
              placeholder="e.g. Complete checkout"
            />
            <button
              className="primary-button full"
              onClick={() => setShowDemo(false)}
            >
              Create journey <span>→</span>
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
function Activity({
  icon,
  color,
  title,
  meta,
}: {
  icon: string;
  color: string;
  title: string;
  meta: string;
}) {
  return (
    <div className="activity-item">
      <span className={`activity-icon ${color}`}>{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{meta}</small>
      </span>
      <span className="activity-arrow">→</span>
    </div>
  );
}
const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
