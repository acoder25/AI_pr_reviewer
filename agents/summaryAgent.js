// ai_pr_reviewer/agents/summaryAgent.js

function aggregate(securityIssues, performanceIssues, tests) {
  const allIssues = [...securityIssues, ...performanceIssues];

  const ranking = {
    high: 1,
    medium: 2,
    low: 3,
  };

  allIssues.sort((a, b) => {
    return (ranking[a.severity] || 4) - (ranking[b.severity] || 4);
  });

  const score = calculateReviewScore(allIssues, tests);

  return {
    summary: {
      totalIssues: allIssues.length,
      highIssues: allIssues.filter((i) => i.severity === "high").length,
      mediumIssues: allIssues.filter((i) => i.severity === "medium").length,
      lowIssues: allIssues.filter((i) => i.severity === "low").length,
      totalTestsSuggested: tests.length,
      reviewScore: score,
    },
    issues: allIssues,
    tests,
  };
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

module.exports = { aggregate };