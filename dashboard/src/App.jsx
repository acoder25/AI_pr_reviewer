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
  const repoDirectoryInputRef = useRef(null);

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

  function handleDownloadPdf() {
    downloadReviewPdf({
      summary,
      confirmedIssues,
      manualReviewIssues,
      tests,
      latencyDisplay,
    });
  }

  function applyRepoFiles(files) {
    const detectedPath = getRepoPathFromFiles(files);

    if (detectedPath) {
      setRepoRoot(detectedPath);
    }
  }

  function handleRepoDrop(e) {
    e.preventDefault();

    const droppedText = e.dataTransfer.getData("text/plain")?.trim();

    if (droppedText) {
      setRepoRoot(droppedText);
      return;
    }

    applyRepoFiles(e.dataTransfer.files);
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

  const latencyDisplay = formatLatency(summary.latencyMs);

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
                  <div
                    className="repo-path-drop"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleRepoDrop}
                  >
                    <input
                      value={repoRoot}
                      onChange={(e) => setRepoRoot(e.target.value)}
                      placeholder="../SocialEcho_Agentic_ai_project"
                    />
                    <button
                      className="repo-picker-btn"
                      type="button"
                      onClick={() => repoDirectoryInputRef.current?.click()}
                    >
                      Browse
                    </button>
                    <input
                      ref={repoDirectoryInputRef}
                      className="repo-directory-input"
                      type="file"
                      webkitdirectory=""
                      directory=""
                      onChange={(e) => applyRepoFiles(e.target.files)}
                    />
                  </div>
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
                  <div className="mode-description-copy">
                    <p>
                      <strong>Smart Review:</strong> Optimized and faster for large PRs.
                    </p>
                    <p>
                      <strong>Full Review:</strong> Deeper analysis, slower and more expensive.
                    </p>
                  </div>
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
                label="Low Confidence"
                value={summary.needsManualReview ?? 0}
              />
              <StatCard label="Latency" value={latencyDisplay} />
            </section>

            <section className="tabs-section">
              <div className="tabs-header">
                <button
                  className={activeTab === "issues" ? "tab active" : "tab"}
                  onClick={() => setActiveTab("issues")}
                >
                  Issues ({confirmedIssues.length})
                </button>
                <button
                  className={
                    activeTab === "manual" ? "tab active" : "tab"
                  }
                  onClick={() => setActiveTab("manual")}
                >
                  Low Confidence Issues ({manualReviewIssues.length})
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
                    emptyText="No issues found."
                  />
                )}

                {activeTab === "manual" && (
                  <IssueList
                    issues={manualReviewIssues}
                    emptyText="No low-confidence issues found."
                  />
                )}

                {activeTab === "tests" && (
                  <TestList tests={tests} emptyText="No test suggestions found." />
                )}
              </div>
            </section>

            <section className="report-actions">
              <button className="download-report-btn" type="button" onClick={handleDownloadPdf}>
                Download PDF Report
              </button>
            </section>

            <PrintableReport
              summary={summary}
              confirmedIssues={confirmedIssues}
              manualReviewIssues={manualReviewIssues}
              tests={tests}
              latencyDisplay={latencyDisplay}
            />
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

function PrintableReport({
  summary,
  confirmedIssues,
  manualReviewIssues,
  tests,
  latencyDisplay,
}) {
  const generatedAt = new Date().toLocaleString();

  return (
    <section className="print-report" aria-hidden="true">
      <header className="print-report-header">
        <p className="print-kicker">CodeSentinel AI</p>
        <h1>Pull Request Review Report</h1>
        <p>Generated {generatedAt}</p>
      </header>

      <div className="print-summary-grid">
        <PrintMetric label="Review Score" value={summary.reviewScore ?? 0} />
        <PrintMetric label="Total Issues" value={summary.totalIssues ?? 0} />
        <PrintMetric label="High Issues" value={summary.highIssues ?? 0} />
        <PrintMetric label="Medium Issues" value={summary.mediumIssues ?? 0} />
        <PrintMetric label="Low Confidence" value={summary.needsManualReview ?? 0} />
        <PrintMetric label="Latency" value={latencyDisplay} />
      </div>

      <PrintIssueSection title={`Issues (${confirmedIssues.length})`} issues={confirmedIssues} />
      <PrintIssueSection
        title={`Low Confidence Issues (${manualReviewIssues.length})`}
        issues={manualReviewIssues}
      />

      <section className="print-section">
        <h2>Suggested Tests ({tests.length})</h2>
        {tests.length ? (
          tests.map((test, index) => (
            <article className="print-item" key={index}>
              <div className="print-item-meta">
                <span>{test.type}</span>
                <span>{test.framework}</span>
              </div>
              <h3>{test.testName}</h3>
              <p>{test.description}</p>
              <footer>
                <span>{test.file}</span>
                <span>{test.source}</span>
              </footer>
            </article>
          ))
        ) : (
          <p className="print-empty">No test suggestions found.</p>
        )}
      </section>
    </section>
  );
}

function PrintMetric({ label, value }) {
  return (
    <div className="print-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PrintIssueSection({ title, issues }) {
  return (
    <section className="print-section">
      <h2>{title}</h2>
      {issues.length ? (
        issues.map((issue, index) => (
          <article className="print-item" key={index}>
            <div className="print-item-meta">
              <span>{issue.severity}</span>
              <span>{issue.category}</span>
              <span>{issue.confidence || "medium"} confidence</span>
              <span>Line {issue.line ?? "-"}</span>
            </div>
            <h3>{issue.message}</h3>
            <p>{issue.suggestion}</p>
            <footer>
              <span>{issue.file}</span>
              <span>{(issue.sources || [issue.source]).join(" + ")}</span>
            </footer>
          </article>
        ))
      ) : (
        <p className="print-empty">No items found.</p>
      )}
    </section>
  );
}

function downloadReviewPdf({
  summary,
  confirmedIssues,
  manualReviewIssues,
  tests,
  latencyDisplay,
}) {
  const generatedAt = new Date().toLocaleString();
  const pages = buildPdfPages({
    summary,
    confirmedIssues,
    manualReviewIssues,
    tests,
    latencyDisplay,
    generatedAt,
  });
  const pdf = createPdfDocument(pages);
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `codesentinel-review-report-${Date.now()}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildPdfPages({
  summary,
  confirmedIssues,
  manualReviewIssues,
  tests,
  latencyDisplay,
  generatedAt,
}) {
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  const pages = [""];
  let pageIndex = 0;
  let y = pageHeight - margin;

  const addRaw = (command) => {
    pages[pageIndex] += `${command}\n`;
  };

  const newPage = () => {
    pages.push("");
    pageIndex += 1;
    y = pageHeight - margin;
  };

  const ensureSpace = (height) => {
    if (y - height < margin) {
      newPage();
    }
  };

  const text = (value, x, fontSize = 11, font = "F1", color = "0 0 0") => {
    addRaw(`BT /${font} ${fontSize} Tf ${color} rg ${x} ${y} Td (${escapePdfText(value)}) Tj ET`);
    y -= fontSize + 5;
  };

  const paragraph = (value, x, width, fontSize = 11, font = "F1") => {
    const lines = wrapPdfText(value || "-", width, fontSize);
    lines.forEach((line) => {
      ensureSpace(fontSize + 8);
      text(line, x, fontSize, font);
    });
  };

  const pill = (value, x, yPos) => {
    const safeValue = String(value || "-").toUpperCase();
    const width = Math.max(42, safeValue.length * 5.8 + 14);
    addRaw(`0.95 0.96 0.98 rg ${x} ${yPos - 4} ${width} 18 re f`);
    addRaw(`0.78 0.81 0.86 RG ${x} ${yPos - 4} ${width} 18 re S`);
    addRaw(`BT /F2 8 Tf 0.12 0.16 0.22 rg ${x + 7} ${yPos + 2} Td (${escapePdfText(safeValue)}) Tj ET`);
    return x + width + 7;
  };

  const sectionTitle = (title) => {
    ensureSpace(40);
    y -= 8;
    text(title, margin, 16, "F2");
    y -= 3;
  };

  const issueItem = (issue) => {
    const wrappedMessage = wrapPdfText(issue.message || "-", maxWidth - 24, 12);
    const wrappedSuggestion = wrapPdfText(issue.suggestion || "-", maxWidth - 24, 10);
    const cardHeight =
      138 + wrappedMessage.length * 17 + wrappedSuggestion.length * 15;

    ensureSpace(cardHeight);
    const top = y;
    addRaw(`0.99 0.99 1 rg ${margin} ${top - cardHeight} ${maxWidth} ${cardHeight} re f`);
    addRaw(`0.82 0.84 0.88 RG ${margin} ${top - cardHeight} ${maxWidth} ${cardHeight} re S`);

    let pillX = margin + 12;
    pillX = pill(issue.severity, pillX, top - 20);
    pillX = pill(issue.category, pillX, top - 20);
    pillX = pill(`${issue.confidence || "medium"} confidence`, pillX, top - 20);
    pill(`Line ${issue.line ?? "-"}`, pillX, top - 20);

    y = top - 48;
    text("ISSUE", margin + 12, 8, "F2", "0.25 0.35 0.55");
    paragraph(issue.message, margin + 12, maxWidth - 24, 12, "F2");
    y -= 4;
    text("SUGGESTION", margin + 12, 8, "F2", "0.25 0.35 0.55");
    paragraph(issue.suggestion, margin + 12, maxWidth - 24, 10, "F1");
    y = top - cardHeight + 28;
    addRaw(`0.9 0.91 0.94 RG ${margin + 12} ${y + 13} ${maxWidth - 24} 0.8 re f`);
    addRaw(`BT /F2 8 Tf 0.25 0.31 0.42 rg ${margin + 12} ${y} Td (${escapePdfText(truncatePdfText(issue.file || "-", 56))}) Tj ET`);
    addRaw(`BT /F2 8 Tf 0.25 0.31 0.42 rg ${pageWidth - margin - 150} ${y} Td (${escapePdfText(truncatePdfText((issue.sources || [issue.source]).join(" + "), 28))}) Tj ET`);
    y = top - cardHeight - 14;
  };

  const testItem = (test) => {
    const wrappedName = wrapPdfText(test.testName || "-", maxWidth - 24, 12);
    const wrappedDescription = wrapPdfText(test.description || "-", maxWidth - 24, 10);
    const cardHeight = 116 + wrappedName.length * 17 + wrappedDescription.length * 15;

    ensureSpace(cardHeight);
    const top = y;
    addRaw(`0.99 0.99 1 rg ${margin} ${top - cardHeight} ${maxWidth} ${cardHeight} re f`);
    addRaw(`0.82 0.84 0.88 RG ${margin} ${top - cardHeight} ${maxWidth} ${cardHeight} re S`);

    let pillX = margin + 12;
    pillX = pill(test.type, pillX, top - 20);
    pill(test.framework, pillX, top - 20);

    y = top - 48;
    paragraph(test.testName, margin + 12, maxWidth - 24, 12, "F2");
    y -= 4;
    text("DESCRIPTION", margin + 12, 8, "F2", "0.25 0.35 0.55");
    paragraph(test.description, margin + 12, maxWidth - 24, 10, "F1");
    y = top - cardHeight + 28;
    addRaw(`0.9 0.91 0.94 RG ${margin + 12} ${y + 13} ${maxWidth - 24} 0.8 re f`);
    addRaw(`BT /F2 8 Tf 0.25 0.31 0.42 rg ${margin + 12} ${y} Td (${escapePdfText(truncatePdfText(test.file || "-", 56))}) Tj ET`);
    addRaw(`BT /F2 8 Tf 0.25 0.31 0.42 rg ${pageWidth - margin - 120} ${y} Td (${escapePdfText(truncatePdfText(test.source || "-", 22))}) Tj ET`);
    y = top - cardHeight - 14;
  };

  text("CODESENTINEL AI", margin, 10, "F2", "0.31 0.27 0.9");
  text("Pull Request Review Report", margin, 24, "F2");
  text(`Generated ${generatedAt}`, margin, 10, "F1", "0.3 0.33 0.4");
  y -= 10;
  addRaw(`0.08 0.1 0.15 RG ${margin} ${y} ${maxWidth} 1.4 re f`);
  y -= 26;

  const metrics = [
    ["Review Score", summary.reviewScore ?? 0],
    ["Total Issues", summary.totalIssues ?? 0],
    ["High Issues", summary.highIssues ?? 0],
    ["Medium Issues", summary.mediumIssues ?? 0],
    ["Low Confidence", summary.needsManualReview ?? 0],
    ["Latency", latencyDisplay],
  ];

  metrics.forEach(([label, value], index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const boxWidth = (maxWidth - 20) / 3;
    const x = margin + col * (boxWidth + 10);
    const boxY = y - row * 66;

    addRaw(`0.97 0.98 0.99 rg ${x} ${boxY - 52} ${boxWidth} 52 re f`);
    addRaw(`0.82 0.84 0.88 RG ${x} ${boxY - 52} ${boxWidth} 52 re S`);
    addRaw(`BT /F2 7 Tf 0.25 0.31 0.42 rg ${x + 10} ${boxY - 18} Td (${escapePdfText(label)}) Tj ET`);
    addRaw(`BT /F2 18 Tf 0.03 0.05 0.1 rg ${x + 10} ${boxY - 40} Td (${escapePdfText(value)}) Tj ET`);
  });
  y -= 150;

  sectionTitle(`Issues (${confirmedIssues.length})`);
  if (confirmedIssues.length) {
    confirmedIssues.forEach(issueItem);
  } else {
    paragraph("No issues found.", margin, maxWidth, 11);
  }

  sectionTitle(`Low Confidence Issues (${manualReviewIssues.length})`);
  if (manualReviewIssues.length) {
    manualReviewIssues.forEach(issueItem);
  } else {
    paragraph("No low-confidence issues found.", margin, maxWidth, 11);
  }

  sectionTitle(`Suggested Tests (${tests.length})`);
  if (tests.length) {
    tests.forEach(testItem);
  } else {
    paragraph("No test suggestions found.", margin, maxWidth, 11);
  }

  return pages;
}

function wrapPdfText(value, width, fontSize) {
  const maxChars = Math.max(12, Math.floor(width / (fontSize * 0.5)));
  const words = String(value || "-").replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const nextLine = line ? `${line} ${word}` : word;
    if (nextLine.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = nextLine;
    }
  });

  if (line) {
    lines.push(line);
  }

  return lines;
}

function escapePdfText(value) {
  return String(value ?? "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function truncatePdfText(value, maxLength) {
  const text = String(value ?? "-");

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
}

function getRepoPathFromFiles(files) {
  const fileList = Array.from(files || []);

  if (!fileList.length) {
    return "";
  }

  const firstFile = fileList[0];
  const nativePath = firstFile.path;

  if (nativePath) {
    const relativePath = firstFile.webkitRelativePath;

    if (relativePath) {
      const relativeParts = relativePath.split("/");
      const nativeParts = nativePath.split(/[/\\]/);
      const repoParts = nativeParts.slice(0, nativeParts.length - relativeParts.length);

      return repoParts.join(nativePath.includes("\\") ? "\\" : "/");
    }

    return nativePath.replace(/[/\\][^/\\]*$/, "");
  }

  if (firstFile.webkitRelativePath) {
    return `../${firstFile.webkitRelativePath.split("/")[0]}`;
  }

  return "";
}

function formatLatency(latencyMs) {
  if (!latencyMs) {
    return "0s";
  }

  const totalSeconds = latencyMs / 1000;

  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(2)}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(2).padStart(5, "0");

  return `${minutes}m ${seconds}s`;
}

function createPdfDocument(pageStreams) {
  const pageWidth = 612;
  const pageHeight = 792;
  const objects = [];
  const pageRefs = pageStreams.map((_, index) => 6 + index * 2);

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${pageStreams.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  pageStreams.forEach((stream, index) => {
    const contentObjectNumber = 5 + index * 2;
    const pageObjectNumber = 6 + index * 2;

    objects[contentObjectNumber] = `<< /Length ${stream.length} >>\nstream\n${stream}endstream`;
    objects[pageObjectNumber] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> ` +
      `/Contents ${contentObjectNumber} 0 R >>`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = pdf.length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
}

export default App;
