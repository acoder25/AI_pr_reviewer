const { model } = require("../llm/model");

function safeJsonParse(text) {
  try {
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(cleaned);
  } catch (error) {
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
You are a senior backend performance reviewer for MERN stack pull requests.

Review only the changed code.

Your main focus areas are:
- Database queries inside loops
- N+1 query patterns
- Missing pagination for large list endpoints
- Unbounded MongoDB queries
- Synchronous fs operations in request handlers
- Expensive filtering/sorting in application memory
- Unnecessary React re-renders
- Large payload risks

Also report any other serious performance issue you observe in the changed code, even if it is not listed above.

Do not report vague best-practice suggestions. Only report issues that are directly supported by the changed code.

Return ONLY valid JSON.
No markdown.
No explanation outside JSON.

JSON format:
{
  "issues": [
    {
      "severity": "high | medium | low",
      "category": "performance",
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

  return parsed.issues.map((issue) => ({
    ...issue,
    source: "gemini-performance-agent",
  }));
}

module.exports = { review };