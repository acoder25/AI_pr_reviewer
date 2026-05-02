function aggregate(securityIssues, performanceIssues, tests) {
  const allIssues = [...securityIssues, ...performanceIssues];
  const ranking = { high: 1, medium: 2, low: 3 };
  allIssues.sort((a, b) => {
    const rankA = ranking[a.severity] || 4;
    const rankB = ranking[b.severity] || 4;
    return rankA - rankB;
  });
  return {
    issues: allIssues,
    tests,
  };
}

module.exports = { aggregate };