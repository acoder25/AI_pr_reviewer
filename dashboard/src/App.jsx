import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import logo from "./assets/logo.webp";

const API_URL = "http://localhost:5000/api/review";

const REVIEW_STAGES = [
  { label: "Uploading patch", percent: 18 },
  { label: "Parsing diff", percent: 36 },
  { label: "Routing agents", percent: 55 },
  { label: "Reviewing code", percent: 76 },
  { label: "Finalizing report", percent: 92 },
];

function App() {
  const [patchFile, setPatchFile] = useState(null);
  const [repoRoot, setRepoRoot] = useState("../SocialEcho_Agentic_ai_project");
  const [reviewMode, setReviewMode] = useState("smart");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("Waiting");
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("issues");

  const progressIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  function startFakeProgress() {
    let index = 0;
    setProgress(REVIEW_STAGES[0].percent);
    setProgressLabel(REVIEW_STAGES[0].label);

    progressIntervalRef.current = setInterval(() => {
      index += 1;
      if (index >= REVIEW_STAGES.length) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
        return;
      }
      setProgress(REVIEW_STAGES[index].percent);
      setProgressLabel(REVIEW_STAGES[index].label);
    }, 1200);
  }

  function stopFakeProgress() {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setProgress(100);
    setProgressLabel("Completed");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!patchFile) {
      setError("Please upload a patch file first.");
      return;
    }

    setLoading(true);
    setError("");
    setReport(null);
    setActiveTab("issues");
    setProgress(0);
    setProgressLabel("Starting review");

    startFakeProgress();

    const formData = new FormData();
    formData.append("patch", patchFile);
    formData.append("repoRoot", repoRoot);
    formData.append("fullReview", String(reviewMode === "full"));
    formData.append("skipTests", "false");
    formData.append("skipCritic", "false");
    formData.append("rulesOnly", "false");
    formData.append("maxChanges", "250");

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Review failed");
      }

      stopFakeProgress();
      setReport(data);
    } catch (err) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setProgress(0);
      setProgressLabel("Failed");
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const confirmedIssues = useMemo(
    () => report?.issues?.filter((issue) => !issue.needsReview) || [],
    [report]
  );

  const manualReviewIssues = useMemo(
    () => report?.issues?.filter((issue) => issue.needsReview) || [],
    [report]
  );

  const tests = report?.tests || [];
  const summary = report?.summary || {};

  const latencySeconds = summary.latencyMs
    ? (summary.latencyMs / 1000).toFixed(2)
    : "0.00";

  return (
    <div className="app-shell">
      <Header />

      <main className="main-content">
        <section className="hero-section">
          <p className="hero-tag">Multi-Agent Pull Request Intelligence</p>
          <h1 className="hero-title">
            Review pull requests with
            <span> confidence, structure, and speed.</span>
          </h1>
          <p className="hero-subtitle">
            CodeSentinel AI combines rule-based checks, LangGraph routing,
            Gemini review agents, and critic validation to generate security,
            performance, logic, and API-contract insights for MERN pull requests.
          </p>
        </section>

        <section className="review-panel-wrapper">
          <div className="review-panel">
            <div className="review-panel-top">
              <div>
                <p className="section-kicker">Run Review</p>
                <h2>Start a PR analysis</h2>
              </div>
              <div className="mode-chip">
                {reviewMode === "smart" ? "Smart Review" : "Full Review"}
              </div>
            </div>

            <form className="review-form" onSubmit={handleSubmit}>
              <div className="field-grid">
                <label className="field">
                  <span>Patch file</span>
                  <input
                    type="file"
                    accept=".patch,.diff,.txt"
                    onChange={(e) => setPatchFile(e.target.files[0])}
                  />
                </label>

                <label className="field">
                  <span>Repository path</span>
                  <input
                    value={repoRoot}
                    onChange={(e) => setRepoRoot(e.target.value)}
                    placeholder="../SocialEcho_Agentic_ai_project"
                  />
                </label>
              </div>

              <div className="field-grid two-col">
                <label className="field">
                  <span>Review mode</span>
                  <select
                    value={reviewMode}
                    onChange={(e) => setReviewMode(e.target.value)}
                  >
                    <option value="smart">Smart Review</option>
                    <option value="full">Full Review</option>
                  </select>
                </label>

                <div className="mode-description">
                  <span className="mode-description-label">Mode info</span>
                  <p>
                    <strong>Smart Review:</strong> optimized and faster for large
                    PRs. <br />
                    <strong>Full Review:</strong> deeper analysis, slower and
                    more expensive.
                  </p>
                </div>
              </div>

              <div className="form-actions">
                <button className="primary-btn" type="submit" disabled={loading}>
                  {loading ? "Reviewing..." : "Run Review"}
                </button>
              </div>
            </form>

            {error && <div className="error-box">{error}</div>}
          </div>
        </section>

        {(loading || report) && (
          <section className="progress-section">
            <div className="progress-header">
              <span>Review Progress</span>
              <span>{loading ? `${progress}%` : "100%"}</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${loading ? progress : 100}%` }}
              />
            </div>
            <p className="progress-label">
              {loading ? progressLabel : "Review completed successfully"}
            </p>
          </section>
        )}

        {report && (
          <>
            <section className="stats-grid">
              <StatCard label="Review Score" value={summary.reviewScore ?? 0} />
              <StatCard label="Total Issues" value={summary.totalIssues ?? 0} />
              <StatCard label="High" value={summary.highIssues ?? 0} />
              <StatCard label="Medium" value={summary.mediumIssues ?? 0} />
              <StatCard
                label="Manual Review"
                value={summary.needsManualReview ?? 0}
              />
              <StatCard label="Latency" value={`${latencySeconds}s`} />
            </section>

            <section className="tabs-section">
              <div className="tabs-header">
                <button
                  className={activeTab === "issues" ? "tab active" : "tab"}
                  onClick={() => setActiveTab("issues")}
                >
                  Suggestions ({confirmedIssues.length})
                </button>
                <button
                  className={
                    activeTab === "manual" ? "tab active" : "tab"
                  }
                  onClick={() => setActiveTab("manual")}
                >
                  Manual Review ({manualReviewIssues.length})
                </button>
                <button
                  className={activeTab === "tests" ? "tab active" : "tab"}
                  onClick={() => setActiveTab("tests")}
                >
                  Tests ({tests.length})
                </button>
              </div>

              <div className="tab-content">
                {activeTab === "issues" && (
                  <IssueList
                    issues={confirmedIssues}
                    emptyText="No confirmed issues found."
                  />
                )}

                {activeTab === "manual" && (
                  <IssueList
                    issues={manualReviewIssues}
                    emptyText="No items require manual review."
                  />
                )}

                {activeTab === "tests" && (
                  <TestList tests={tests} emptyText="No test suggestions found." />
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Header() {
  const [openProfile, setOpenProfile] = useState(false);

  return (
    <header className="topbar">
      <div className="brand-wrap">
        <div className="brand-logo image-logo">
          <img src={logo} alt="CodeSentinel AI logo" />
        </div>

        <div className="brand-text">
          <span className="brand-name">CodeSentinel AI</span>
          <span className="brand-sub">Hybrid Multi-Agent PR Reviewer</span>
        </div>
      </div>

      <div className="profile-menu-wrap">
        <button
          className="profile-btn"
          type="button"
          onClick={() => setOpenProfile((prev) => !prev)}
        >
          <span className="profile-avatar">A</span>
          <span className="profile-label">Analyst</span>
          <span className="profile-arrow">⌄</span>
        </button>

        {openProfile && (
          <div className="profile-dropdown">
            <button type="button">View Profile</button>
            <button type="button">Logout</button>
          </div>
        )}
      </div>
    </header>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function IssueList({ issues, emptyText }) {
  if (!issues.length) {
    return <div className="empty-state">{emptyText}</div>;
  }

  return (
    <div className="card-list">
      {issues.map((issue, index) => (
        <div className="issue-card" key={index}>
          <div className="issue-card-top">
            <div className="issue-badges">
              <span className={`pill ${issue.severity}`}>
                {issue.severity}
              </span>
              <span className="pill soft">{issue.category}</span>
              <span className="pill outline">
                {issue.confidence || "medium"} confidence
              </span>
            </div>

            <div className="line-chip">
              Line {issue.line ?? "-"}
            </div>
          </div>

          <div className="issue-line">
            <span className="issue-icon">⚠</span>
            <div>
              <p className="issue-label">Issue</p>
              <h3>{issue.message}</h3>
            </div>
          </div>

          <div className="issue-line suggestion-line">
            <span className="issue-icon">💡</span>
            <div>
              <p className="issue-label">Suggestion</p>
              <p className="issue-suggestion">{issue.suggestion}</p>
            </div>
          </div>

          <div className="issue-footer">
            <span>{issue.file}</span>
            <span>{(issue.sources || [issue.source]).join(" + ")}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TestList({ tests, emptyText }) {
  if (!tests.length) {
    return <div className="empty-state">{emptyText}</div>;
  }

  return (
    <div className="card-list">
      {tests.map((test, index) => (
        <div className="issue-card test-card" key={index}>
          <div className="issue-card-top">
            <div className="issue-badges">
              <span className="pill soft">{test.type}</span>
              <span className="pill outline">{test.framework}</span>
            </div>
            <div className="line-chip">Test</div>
          </div>

          <div className="issue-line">
            <span className="issue-icon">🧪</span>
            <div>
              <p className="issue-label">Suggested Test</p>
              <h3>{test.testName}</h3>
            </div>
          </div>

          <div className="issue-line suggestion-line">
            <span className="issue-icon">📝</span>
            <div>
              <p className="issue-label">Description</p>
              <p className="issue-suggestion">{test.description}</p>
            </div>
          </div>

          <div className="issue-footer">
            <span>{test.file}</span>
            <span>{test.source}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default App;