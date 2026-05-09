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
You are a senior MERN stack code reviewer focused on logic bugs and runtime correctness.

Review only the changed code and nearby context.

Look for:
- missing return after res.status().json()
- response sent multiple times
- missing await on async database calls
- null or undefined access
- wrong condition checks
- bad error handling
- route may crash on DB failure
- incorrect status codes
- async errors not handled
- frontend/backend data shape mismatch if visible

Do not report style-only issues.
Do not report vague best practices.
Only report issues directly supported by the code.

Return ONLY valid JSON. No markdown.

JSON format:
{
  "issues": [
    {
      "severity": "high | medium | low",
      "category": "logic",
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
    source: "gemini-logic-agent",
  }));
}

module.exports = { review };