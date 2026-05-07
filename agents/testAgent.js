const { model } = require("../llm/model");

function safeJsonParse(text) {
  try {
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(cleaned);
  } catch (error) {
    return { tests: [] };
  }
}

async function generate(context) {
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
You are a senior QA engineer reviewing a MERN stack pull request.

Generate useful tests based only on changed code.

Rules:
- If changed code exists, always generate at least 2 useful tests.
- Do not generate generic tests.
- Every test must mention the exact route, function, component, or file being tested.
- Prefer Jest, Supertest, React Testing Library, or Cypress depending on the file.
- Include positive, negative, edge, security, or performance tests when relevant.

Do not suggest tests that depend on insecure implementation details.
For hardcoded secrets, suggest tests that verify secrets are loaded from environment variables and that the app fails safely when the env variable is missing.

Return ONLY valid JSON.
No markdown.
No explanation outside JSON.

JSON format:
{
  "tests": [
    {
      "type": "positive | negative | edge | security | performance",
      "file": "file path",
      "testName": "test name",
      "description": "what this test verifies",
      "framework": "Jest | Supertest | React Testing Library | Cypress"
    }
  ]
}
`,
    },
    {
      role: "user",
      content: changedCode,
    },
  ]);

  const parsed = safeJsonParse(response.content);

  return parsed.tests.map((test) => ({
    ...test,
    source: "gemini-test-agent",
  }));
}

module.exports = { generate };