// agents/dependencyAgent.js

function review(context) {
  const issues = [];

  const packageChanges = context.changes.filter(
    (change) =>
      change.type === "Added" &&
      change.file.endsWith("package.json") &&
      !change.file.includes("package-lock.json")
  );

  for (const change of packageChanges) {
    const line = change.content.trim();

    const depMatch = line.match(/^"([^"]+)":\s*"([^"]+)"/);

    if (!depMatch) continue;

    const packageName = depMatch[1];
    const version = depMatch[2];

    if (version === "*" || version.toLowerCase() === "latest") {
      issues.push({
        severity: "medium",
        category: "dependency",
        file: change.file,
        line: change.line,
        message: `Unpinned dependency version detected for ${packageName}`,
        suggestion:
          "Use a fixed semantic version instead of '*' or 'latest' to avoid unexpected breaking changes.",
        source: "dependency-agent",
        ruleId: "unpinned_dependency",
      });
    }

    if (/eval|exec|shell|child-process|unsafe/i.test(packageName)) {
      issues.push({
        severity: "high",
        category: "dependency",
        file: change.file,
        line: change.line,
        message: `Potentially risky dependency added: ${packageName}`,
        suggestion:
          "Review the package purpose, maintainership, downloads, and security history before using it.",
        source: "dependency-agent",
        ruleId: "risky_dependency",
      });
    }
  }

  return issues;
}

module.exports = { review };