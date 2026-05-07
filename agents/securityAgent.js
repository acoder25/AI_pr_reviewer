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
  const changedCode = context.changes
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
You are a senior application security reviewer for MERN stack pull requests.

Review only the changed code.

Your main focus areas are:
- Missing validation for req.body, req.query, req.params
- Direct request data used in MongoDB/Mongoose queries
- NoSQL injection risks
- Hardcoded secrets
- Missing authorization checks before update/delete
- JWT misuse
- Sensitive data leakage
- Dangerous eval or Function usage

Also report any other serious security issue you observe in the changed code, even if it is not listed above.

Do not report vague best-practice suggestions. Only report issues that are directly supported by the changed code.

Important detection rule:
If req.body, req.query, or req.params is used directly inside a database query such as findOne, find, update, delete, findByIdAndDelete, or findByIdAndUpdate, and the changed code does not show validation or type checking, report it.

Severity rules:
- high: hardcoded secrets, auth bypass, missing authorization on delete/update
- medium: missing validation, unsafe request data in DB queries
- low: minor security hardening

Return ONLY valid JSON.
No markdown.
No explanation outside JSON.

JSON format:
{
  "issues": [
    {
      "severity": "high | medium | low",
      "category": "security",
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
    source: "gemini-security-agent",
  }));
}

module.exports = { review };