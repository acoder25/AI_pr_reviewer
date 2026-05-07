const { criticModel } = require("../llm/criticModel");

function safeJsonParse(text) {
  try {
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      unsupportedIssueIndexes: [],
      severityUpdates: [],
    };
  }
}

async function review(context, issues) {
  const changedCode = context.changes
    .map(
      (c) =>
        `File: ${c.file}\nLine: ${c.line}\nType: ${c.type}\nCode: ${c.content}`
    )
    .join("\n\n");

  const issueList = issues
    .map(
      (i, index) =>
        `Index: ${index}
Source: ${i.source}
RuleId: ${i.ruleId || "none"}
Severity: ${i.severity}
Category: ${i.category}
File: ${i.file}
Line: ${i.line}
Message: ${i.message}
Suggestion: ${i.suggestion}`
    )
    .join("\n\n");

  if (!changedCode.trim()) {
    return {
      unsupportedIssueIndexes: [],
      severityUpdates: [],
      missingIssues: [],
    };
  }

  const response = await criticModel.invoke([
    {
      role: "system",
      content: `
You are a critic/validator agent for an AI pull request reviewer.

You will receive:
1. Changed code
2. Issues found by rule-based and Gemini agents

Your role:
- Validate existing findings.
- Remove unsupported findings.
- Correct clearly wrong severity.
- Do NOT add new issues.

Important:
- Do not remove rule-based findings unless they are clearly wrong.
- Do not add style-only comments.
- Do not invent issues.
- Do not rename issues incorrectly.

Performance definitions:
- Missing pagination: a list endpoint fetches many/all documents without limit, skip, cursor, or pagination.
- N+1 query: database query inside a loop or repeated per item.
- Do not call simple find() an N+1 issue unless a loop exists.

Severity rules:
- Hardcoded secrets, JWT secrets, API keys, tokens, passwords, private keys: high.
- Missing authorization on delete/update/private data routes: high.
- Missing pagination/unbounded list query: medium by default.
- Missing input validation in DB query: medium by default.
- Sensitive data leakage: high only if password/token/private fields are clearly returned.

Do not remove a missing-pagination issue if the changed code contains Model.find() or Model.find({}) without limit, skip, page, or cursor.

A simple Model.find() without pagination is NOT N+1, but it IS an unbounded query / missing pagination issue.

Return ONLY valid JSON. No markdown.

JSON format:
{
  "unsupportedIssueIndexes": [0, 2],
  "severityUpdates": [
    {
      "issueIndex": 1,
      "newSeverity": "medium",
      "reason": "why severity changed"
    }
  ]
}

If everything is fine:
{
  "unsupportedIssueIndexes": [],
  "severityUpdates": []
}
`,
    },
    {
      role: "user",
      content: `
Changed code:

${changedCode}

Current issues:

${issueList}
`,
    },
  ]);

  const parsed = safeJsonParse(response.content);

  return {
    unsupportedIssueIndexes: parsed.unsupportedIssueIndexes || [],
    severityUpdates: parsed.severityUpdates || [],
    missingIssues: [],
  };
}

module.exports = { review };