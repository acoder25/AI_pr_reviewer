const { criticModel } = require("../llm/criticModel");

function safeJsonParse(text) {
  try {
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { issueOpinions: [] };
  }
}

async function review(context, issues) {
  const changedCode =
    context.reviewText ||
    context.changes
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

  if (!changedCode.trim() || issues.length === 0) {
    return { issueOpinions: [] };
  }

  const response = await criticModel.invoke([
    {
      role: "system",
      content: `
You are an advisory critic for an AI pull request reviewer.

Important:
- Do NOT remove issues.
- Do NOT rewrite the final review.
- Only judge whether each issue is supported by the changed code.
- Mark each issue as: supported, questionable, or unsupported.
- Suggest severity only if it is clearly wrong.
- Do not add new issues.

Definitions:
- Missing pagination: Model.find() or Model.find({}) in a list endpoint without limit/skip/page/cursor.
- N+1 query: database query inside a loop or repeated per item.
- Hardcoded secret/JWT/API key/password/private key is high severity.
- Missing authorization is high mainly for delete/update/private data routes.
- Missing validation in DB query is medium by default.

Return ONLY valid JSON.

JSON format:
{
  "issueOpinions": [
    {
      "issueIndex": 0,
      "status": "supported | questionable | unsupported",
      "suggestedSeverity": "high | medium | low | same",
      "reason": "short reason"
    }
  ]
}
`,
    },
    {
      role: "user",
      content: `
Changed code:

${changedCode}

Issues to validate:

${issueList}
`,
    },
  ]);

  const parsed = safeJsonParse(response.content);

  return {
    issueOpinions: parsed.issueOpinions || [],
  };
}

module.exports = { review };