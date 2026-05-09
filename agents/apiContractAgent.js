const { model } = require("../llm/model");

function safeJsonParse(text) {
  try {
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { issues: [] };
  }
}

async function review(context) {
  const changedCode =
    context.reviewText ||
    context.changes
      .map(
        (c) =>
          `File: ${c.file}\nLine: ${c.line}\nType: ${c.type}\nCode: ${c.content}`
      )
      .join("\n\n");

  if (!changedCode.trim()) return [];

  const response = await model.invoke([
    {
      role: "system",
      content: `
You are an API contract review agent for MERN stack pull requests.

Your job is to detect frontend-backend contract mismatches.

Review changed code and nearby context.

Look for:
- frontend calls endpoint that backend does not define
- frontend uses wrong HTTP method
- frontend sends field name different from backend expectation
  Example: frontend sends username but backend expects email
- frontend expects response shape different from backend response
  Example: frontend reads data.user but backend returns { result }
- missing Content-Type or wrong request body structure
- backend changed response but frontend not updated
- backend changed route but frontend still calls old route
- status code handling mismatch
- missing error handling in frontend for API failure

Only report issues when both sides or enough evidence are visible.
Do not guess if only one side is visible.
Do not report generic API best practices.

Return ONLY valid JSON. No markdown.

JSON format:
{
  "issues": [
    {
      "severity": "high | medium | low",
      "category": "api-contract",
      "file": "file path",
      "line": 12,
      "message": "short issue description",
      "suggestion": "how to fix"
    }
  ]
}

If no issue exists:
{
  "issues": []
}
`,
    },
    {
      role: "user",
      content: changedCode,
    },
  ]);

  const parsed = safeJsonParse(response.content);

  return (parsed.issues || []).map((issue) => ({
    ...issue,
    source: "gemini-api-contract-agent",
  }));
}

module.exports = { review };