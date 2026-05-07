// agents/summaryAgent.js
function enforceSeverityPolicy(issue) {
  const text = `${issue.message} ${issue.suggestion || ""}`.toLowerCase();

  if (
    issue.ruleId === "hardcoded_secret" ||
    /hardcoded|secret|token|api key|password|private key|jwt secret/.test(text)
  ) {
    return { ...issue, severity: "high" };
  }

  if (
    issue.ruleId === "missing_pagination" ||
    /missing pagination|unbounded mongo|unbounded query|fetching entire collection/.test(text)
  ) {
    return { ...issue, severity: issue.severity === "high" ? "high" : "medium" };
  }

  if (
    /n\+1/.test(text) &&
    !/loop|inside a loop|per item|for each|for \(/.test(text)
  ) {
    return {
      ...issue,
      message: issue.message.replace(/N\+1 query/i, "Unbounded query"),
      severity: "medium",
    };
  }

  return issue;
}
function classifyIssue(issue) {
  const text = `${issue.message} ${issue.suggestion || ""}`.toLowerCase();

  if (text.includes("hardcoded") || text.includes("secret")) {
    return "hardcoded_secret";
  }

  if (
    text.includes("req.body") ||
    text.includes("request data") ||
    text.includes("nosql") ||
    text.includes("validation")
  ) {
    return "unsafe_input";
  }

  if (text.includes("authorization") || text.includes("auth")) {
    return "authorization";
  }

  if (text.includes("password") || text.includes("sensitive")) {
    return "sensitive_data";
  }

  if (text.includes("pagination") || text.includes("unbounded")) {
    return "pagination";
  }

  if (text.includes("loop") || text.includes("n+1")) {
    return "n_plus_one";
  }

  return text.slice(0, 40);
}

function mergeDuplicates(issues) {
  const map = new Map();

  for (const issue of issues) {
    const key = [
      issue.file,
      issue.line,
      issue.category,
      classifyIssue(issue),
    ].join("|");

    if (!map.has(key)) {
      map.set(key, {
        ...issue,
        sources: [issue.source],
      });
    } else {
      const existing = map.get(key);

      existing.sources = Array.from(
        new Set([...existing.sources, issue.source])
      );

      existing.message =
        existing.message.length >= issue.message.length
          ? existing.message
          : issue.message;

      existing.suggestion =
        existing.suggestion.length >= issue.suggestion.length
          ? existing.suggestion
          : issue.suggestion;

      if (severityRank(issue.severity) < severityRank(existing.severity)) {
        existing.severity = issue.severity;
      }
    }
  }

  return Array.from(map.values());
}

function severityRank(severity) {
  const ranking = { high: 1, medium: 2, low: 3 };
  return ranking[severity] || 4;
}

function applyCriticReview(issues, criticReview) {
  let filtered = issues.filter(
    (_, index) => !criticReview.unsupportedIssueIndexes.includes(index)
  );

  for (const update of criticReview.severityUpdates || []) {
    if (filtered[update.issueIndex]) {
      filtered[update.issueIndex].severity = update.newSeverity;
      filtered[update.issueIndex].criticSeverityReason = update.reason;
    }
  }

  filtered.push(...(criticReview.missingIssues || []));

  return filtered;
}

function calculateConfidence(issue) {
  const sourceCount = issue.sources ? issue.sources.length : 1;

  if (issue.criticAdded) return "medium";
  if (sourceCount >= 2) return "high";
  if (issue.source === "rule-based-agent") return "medium";
  return "medium";
}

function calculateReviewScore(issues, tests) {
  let score = 100;

  for (const issue of issues) {
    if (issue.severity === "high") score -= 20;
    if (issue.severity === "medium") score -= 10;
    if (issue.severity === "low") score -= 5;
  }

  if (tests.length === 0) score -= 10;

  return Math.max(score, 0);
}

function aggregate(preliminaryIssues, criticReview, tests) {
  const criticApplied = applyCriticReview(preliminaryIssues, criticReview);
  const mergedIssues = mergeDuplicates(criticApplied);

  const finalIssues = mergedIssues
  .map(enforceSeverityPolicy)
  .map((issue) => ({
    ...issue,
    confidence: calculateConfidence(issue),
  }))

  return {
    summary: {
      totalIssues: finalIssues.length,
      highIssues: finalIssues.filter((i) => i.severity === "high").length,
      mediumIssues: finalIssues.filter((i) => i.severity === "medium").length,
      lowIssues: finalIssues.filter((i) => i.severity === "low").length,
      totalTestsSuggested: tests.length,
      reviewScore: calculateReviewScore(finalIssues, tests),
      criticRemovedIssues: criticReview.unsupportedIssueIndexes.length,
      criticAddedIssues: criticReview.missingIssues.length,
    },
    issues: finalIssues,
    tests,
  };
}

module.exports = { aggregate };