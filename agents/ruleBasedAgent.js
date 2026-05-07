function review(context) {
  const issues = [];

  for (const change of context.changes) {
    if (change.type !== "Added") continue;

    const { file, line, content } = change;

    // 1. Hardcoded secret/token/key
    if (
      /(SECRET|TOKEN|API_KEY|PASSWORD|PRIVATE_KEY)\s*=\s*["'][^"']{16,}["']/i.test(
        content
      )
    ) {
      issues.push({
        severity: "high",
        category: "security",
        file,
        line,
        message: "Hardcoded secret detected",
        suggestion:
          "Move secrets to environment variables and access them through process.env.",
        source: "rule-based-agent",
        ruleId: "hardcoded_secret",
      });
    }

    // 2. Request data directly used in DB query
    if (
      /req\.(body|query|params)/.test(content) &&
      /\.(find|findOne|findById|findByIdAndDelete|findByIdAndUpdate|update|delete)/.test(
        content
      )
    ) {
      issues.push({
        severity: "medium",
        category: "security",
        file,
        line,
        message: "Request data used directly in database query",
        suggestion:
          "Validate and type-check request data before using it in MongoDB/Mongoose queries.",
        source: "rule-based-agent",
        ruleId: "unsafe_request_data_db_query",
      });
    }

    // 3. Delete/update route without visible auth middleware
    if (
      /router\.(delete|put|patch)/.test(content) &&
      !/(auth|requireAuth|verifyJWT|authenticate|protect)/i.test(content)
    ) {
      issues.push({
        severity: "high",
        category: "security",
        file,
        line,
        message: "Update/delete route may be missing authorization middleware",
        suggestion:
          "Add authentication and ownership/role checks before modifying or deleting resources.",
        source: "rule-based-agent",
        ruleId: "missing_authorization",
      });
    }

    // 4. Dangerous eval
    if (/\beval\s*\(|new Function\s*\(/.test(content)) {
      issues.push({
        severity: "high",
        category: "security",
        file,
        line,
        message: "Dangerous dynamic code execution detected",
        suggestion:
          "Avoid eval/new Function because they can execute attacker-controlled code.",
        source: "rule-based-agent",
        ruleId: "dangerous_eval",
      });
    }

    // 5. Blocking sync filesystem call
    if (/fs\.(readFileSync|writeFileSync|readdirSync|statSync)/.test(content)) {
      issues.push({
        severity: "medium",
        category: "performance",
        file,
        line,
        message: "Synchronous filesystem operation may block Node.js event loop",
        suggestion:
          "Use async fs/promises APIs inside request handlers to avoid blocking concurrent requests.",
        source: "rule-based-agent",
        ruleId: "sync_fs_operation",
      });
    }

    // 6. Possible sensitive logging
    if (/console\.log/.test(content) && /(password|token|secret|req\.body)/i.test(content)) {
      issues.push({
        severity: "medium",
        category: "security",
        file,
        line,
        message: "Possible sensitive data logging",
        suggestion:
          "Avoid logging passwords, tokens, secrets, or full request bodies.",
        source: "rule-based-agent",
        ruleId: "sensitive_logging",
      });
    }
    // Missing pagination / unbounded list query
    if (
      /\.find\s*\(\s*(\{\s*\})?\s*\)/.test(content) &&
      !/limit|skip|page|cursor/.test(content)
    ) {
      issues.push({
        severity: "medium",
        category: "performance",
        file,
        line,
        message: "Unbounded MongoDB query without pagination",
        suggestion:
          "Add pagination using limit/skip or cursor-based pagination to avoid loading the full collection.",
        source: "rule-based-agent",
        ruleId: "missing_pagination",
      });
    }
  }

  return issues;
}

module.exports = { review };