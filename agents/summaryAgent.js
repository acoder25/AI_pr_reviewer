function severityRank(severity) {
  const ranking = { high: 1, medium: 2, low: 3 };
  return ranking[severity] || 4;
}

function classifyIssue(issue) {
  const text = `${issue.message} ${issue.suggestion || ""}`.toLowerCase();

  if (/hardcoded|secret|jwt|api key|private key|password/.test(text)) {
    return "hardcoded_secret";
  }

  if (/pagination|unbounded|full collection|limit|skip/.test(text)) {
    return "missing_pagination";
  }

  if (/n\+1|inside a loop|per item|findbyid/.test(text)) {
    return "n_plus_one";
  }

  if (/authorization|auth/.test(text)) {
    return "authorization";
  }

  if (/validation|req\.body|req\.query|req\.params|nosql/.test(text)) {
    return "unsafe_input";
  }

  if (/sensitive|leak|token|password/.test(text)) {
    return "sensitive_data";
  }
  if (/dependency|package|version|unpinned/.test(text)) {
    return "dependency";
  }

  return text.slice(0, 50);
}

function mergeDuplicates(issues) {
  const map = new Map();

  for (const issue of issues) {
    const key = [
      issue.file,
      issue.line,
      issue.category,
      issue.ruleId || classifyIssue(issue),
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

      if (severityRank(issue.severity) < severityRank(existing.severity)) {
        existing.severity = issue.severity;
      }

      if ((issue.message || "").length > (existing.message || "").length) {
        existing.message = issue.message;
      }

      if ((issue.suggestion || "").length > (existing.suggestion || "").length) {
        existing.suggestion = issue.suggestion;
      }
    }
  }

  return Array.from(map.values());
}

function applyPolicy(issue) {
  const text = `${issue.message} ${issue.suggestion || ""}`.toLowerCase();

  // Strong deterministic severity policies
  if (
    issue.ruleId === "hardcoded_secret" ||
    /hardcoded|jwt secret|api key|private key|password|token/.test(text)
  ) {
    return { ...issue, severity: "high" };
  }

  if (
    issue.ruleId === "missing_pagination" ||
    /missing pagination|unbounded mongodb|unbounded query|fetches all documents/.test(
      text
    )
  ) {
    return { ...issue, severity: "medium" };
  }

  if (
    issue.ruleId === "n_plus_one_query" ||
    /n\+1|database call inside loop|findbyid.*loop/.test(text)
  ) {
    return { ...issue, severity: "high" };
  }

  // Public read-only GET routes should not automatically be high auth issues
  if (
    /missing authentication|missing authorization/.test(text) &&
    /get|list|feed|all posts|retrieves all posts/.test(text)
  ) {
    return { ...issue, severity: "medium" };
  }
  if (issue.ruleId === "unpinned_dependency") {
    return { ...issue, severity: "medium" };
  }

  if (issue.ruleId === "risky_dependency") {
    return { ...issue, severity: "high" };
  }

  return issue;
}

function attachCriticOpinion(issues, criticReview) {
  const opinions = criticReview.issueOpinions || [];

  return issues.map((issue, index) => {
    const opinion = opinions.find((o) => o.issueIndex === index);

    if (!opinion) {
      return {
        ...issue,
        criticStatus: "not_checked",
        needsReview: false,
      };
    }

    return {
      ...issue,
      criticStatus: opinion.status,
      criticSuggestedSeverity: opinion.suggestedSeverity,
      criticReason: opinion.reason,
      needsReview:
        opinion.status === "questionable" || opinion.status === "unsupported",
    };
  });
}

function calculateConfidence(issue) {
  const sources = issue.sources || [issue.source];

  if (issue.criticStatus === "unsupported") return "low";
  if (issue.criticStatus === "questionable") return "medium";

  if (sources.includes("rule-based-agent") && sources.length >= 2) {
    return "high";
  }

  if (sources.includes("rule-based-agent")) {
    return "medium";
  }

  if (issue.criticStatus === "supported") {
    return "high";
  }

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
  const withCritic = attachCriticOpinion(preliminaryIssues, criticReview);
  const merged = mergeDuplicates(withCritic);

  const finalIssues = merged
    .map(applyPolicy)
    .map((issue) => ({
      ...issue,
      confidence: calculateConfidence(issue),
    }))
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  return {
    summary: {
      totalIssues: finalIssues.length,
      highIssues: finalIssues.filter((i) => i.severity === "high").length,
      mediumIssues: finalIssues.filter((i) => i.severity === "medium").length,
      lowIssues: finalIssues.filter((i) => i.severity === "low").length,
      needsManualReview: finalIssues.filter((i) => i.needsReview).length,
      totalTestsSuggested: tests.length,
      reviewScore: calculateReviewScore(finalIssues, tests),
    },
    issues: finalIssues,
    tests,
  };
}
module.exports = { aggregate };