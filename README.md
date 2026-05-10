# CodeSentinel AI

**CodeSentinel AI** is a hybrid, multi-agent pull request reviewer built for MERN applications. It analyzes Git diffs using deterministic rule-based checks, Gemini-powered review agents, Groq advisory critic validation, LangGraph routing, confidence scoring, and a polished dashboard for demo-ready PR analysis.

> Core idea: not just “ask an LLM to review code” — CodeSentinel combines **rules + specialist agents + cross-model validation + benchmark evaluation** to produce structured, confidence-ranked PR feedback.

---

## Preview

![LangGraph Workflow](docs/langgraph-workflow.png)

---

## Why this project is different

Most AI PR reviewers simply send a diff to one LLM and return comments. CodeSentinel AI is designed to be more reliable and explainable:

- **Hybrid review engine**: deterministic rule-based checks + LLM reasoning.
- **Cross-model validation**: Gemini generates review findings; Groq acts as an advisory critic.
- **LangGraph workflow**: routing, parallel agent execution, critic validation, and summary generation are represented as graph nodes.
- **Confidence scoring**: findings are ranked by source agreement and critic opinion.
- **MERN-focused intelligence**: understands Express routes, MongoDB/Mongoose queries, React API calls, and frontend-backend contract mismatches.
- **Benchmark-tested**: evaluated on custom benchmark PRs with known injected issues.
- **Dashboard-first demo**: upload a patch, choose Smart/Full mode, and view a clean issue/test report.

---

## Features

### Review capabilities

- Security review:
  - hardcoded secrets/JWT/API keys
  - missing validation for `req.body`, `req.query`, `req.params`
  - unsafe MongoDB/Mongoose query usage
  - sensitive data leakage
  - authentication/authorization risks

- Performance review:
  - unbounded MongoDB queries
  - missing pagination
  - N+1 query patterns
  - large payload risks
  - blocking/sync operations

- Logic review:
  - missing `return` after `res.status().json()`
  - response sent multiple times
  - missing `await`
  - null/undefined access
  - weak error handling

- API contract review:
  - frontend sends wrong field names
  - frontend expects wrong response shape
  - backend route/method mismatch
  - missing frontend error handling

- Test generation:
  - Supertest/Jest/React Testing Library/Cypress suggestions
  - positive, negative, edge, security, and performance tests

- Dependency checks:
  - unpinned dependency versions
  - risky-looking packages
  - package.json change analysis

---

## Architecture

```txt
Patch file + repo path
        ↓
Custom diff parser
        ↓
Context expansion around changed lines
        ↓
Large PR smart/full mode
        ↓
LangGraph Router Node
        ↓
Selected agents run in parallel:
  - Rule-Based Agent
  - Security Agent
  - Performance Agent
  - Logic Agent
  - API Contract Agent
  - Dependency Agent
  - Test Agent
        ↓
Groq Advisory Critic
        ↓
Summary + Policy Layer
        ↓
Dashboard Report
```

### LangGraph nodes

| Node | Purpose |
|---|---|
| `parseDiff` | Parses patch file and extracts changed lines |
| `router` | Decides which agents should run |
| `ruleAgent` | Runs deterministic checks |
| `securityAgent` | Gemini-based security review |
| `performanceAgent` | Gemini-based performance review |
| `logicAgent` | Gemini-based runtime/logic review |
| `apiContractAgent` | Gemini-based frontend-backend contract review |
| `dependencyAgent` | Rule-based package.json review |
| `testAgent` | Generates test suggestions |
| `criticAgent` | Groq advisory validation |
| `summaryAgent` | Merges, scores, applies policies, and returns final report |

---

## Tech stack

### Backend

- Node.js
- Express
- LangGraph JS
- LangChain JS
- Gemini API
- Groq API
- Custom Git diff parser
- Multer for patch upload

### Frontend

- React
- Vite
- CSS dark dashboard UI

### Evaluation

- Custom benchmark patches
- Expected issue JSON files
- Automated evaluation script

---

## Folder structure

```txt
ai_pr_reviewer/
├── agents/
│   ├── apiContractAgent.js
│   ├── codeUnderstandingAgent.js
│   ├── criticAgent.js
│   ├── dependencyAgent.js
│   ├── logicAgent.js
│   ├── performanceAgent.js
│   ├── routerAgent.js
│   ├── ruleBasedAgent.js
│   ├── securityAgent.js
│   ├── summaryAgent.js
│   └── testAgent.js
├── benchmarks/
│   ├── expected/
│   ├── patches/
│   ├── results/
│   └── evaluation.md
├── dashboard/
│   └── src/
├── docs/
│   └── langgraph-workflow.png
├── graph/
│   └── reviewGraph.js
├── llm/
│   ├── model.js
│   └── criticModel.js
├── scripts/
│   └── evaluate.js
├── server/
│   └── server.js
├── run-review.js
├── package.json
└── README.md
```

---

## Environment variables

Create a `.env` file in the project root:

```env
GOOGLE_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
```

Do not commit `.env`.

---

## Installation

From the project root:

```bash
npm install
npm install --prefix dashboard
```

Or, if you added the helper script:

```bash
npm run install:all
```

---

## Running the project

Start backend and dashboard together:

```bash
npm start
```

Then open:

```txt
http://localhost:5173
```

Backend runs on:

```txt
http://localhost:5000
```

---

## CLI usage

Run a full review from the terminal:

```bash
node run-review.js benchmarks/patches/n-plus-one-query.patch --repo "../SocialEcho_Agentic_ai_project"
```

Run Smart mode with a max change limit:

```bash
node run-review.js benchmarks/patches/missing-pagination.patch --repo "../SocialEcho_Agentic_ai_project" --max-changes 250
```

Run Full mode:

```bash
node run-review.js benchmarks/patches/missing-pagination.patch --repo "../SocialEcho_Agentic_ai_project" --full
```

Run rules-only mode without LLM calls:

```bash
node run-review.js benchmarks/patches/hardcoded-secret.patch --repo "../SocialEcho_Agentic_ai_project" --rules-only
```

Save output:

```bash
node run-review.js benchmarks/patches/hardcoded-secret.patch --repo "../SocialEcho_Agentic_ai_project" > benchmarks/results/hardcoded-secret.json
```

---

## Dashboard workflow

1. Upload a `.patch` or `.diff` file.
2. Enter local repository path for context expansion.
3. Choose review mode:
   - **Smart Review**: faster, prioritizes risky changes.
   - **Full Review**: reviews all changed lines.
4. Run review.
5. View:
   - Review score
   - Confirmed suggestions
   - Manual review items
   - Suggested tests
   - Latency and route plan

---

## Smart Review vs Full Review

| Mode | Behavior |
|---|---|
| Smart Review | Prioritizes high-risk changed lines for speed and quota efficiency |
| Full Review | Reviews all changed lines; slower and uses more API quota |
| Rules Only | Runs deterministic checks without Gemini/Groq API calls |

The report includes coverage metadata such as:

```json
{
  "reviewMode": "smart",
  "originalChangedLines": 900,
  "reviewedChangedLines": 250
}
```

---

## Benchmark evaluation

Custom benchmark PRs were created to test the reviewer against known issues.

### Benchmark set

| Benchmark | Expected issue |
|---|---|
| `hardcoded-secret` | Hardcoded JWT secret |
| `missing-validation` | Unsafe request body in DB query |
| `missing-pagination` | Unbounded query / missing pagination |
| `n-plus-one-query` | DB call inside loop |
| `missing-authorization` | Delete/update without auth |
| `sensitive-data-leak` | Returning private fields |
| `logic-bug` | Missing return / double response |
| `api-contract-mismatch` | Frontend-backend mismatch |
| `clean-pr` | No issue expected |

### Current benchmark metrics

Based on the latest `evaluation.md`:

| Metric | Result |
|---|---|
| Detection accuracy | **7/8 = 87.5%** |
| Severity accuracy | **6/7 = 85.7%** |
| Clean PR accuracy | **1/1 = 100%** |
| Wrong-finding rate | **1/8 = 12.5%** |

These metrics are benchmark-specific and should be updated whenever prompts, rules, or agents change.

Run automated evaluation:

```bash
node scripts/evaluate.js
```

---

## Example output

```json
{
  "summary": {
    "totalIssues": 3,
    "highIssues": 1,
    "mediumIssues": 2,
    "needsManualReview": 1,
    "totalTestsSuggested": 4,
    "reviewScore": 60,
    "latencyMs": 18200
  },
  "issues": [
    {
      "severity": "medium",
      "category": "performance",
      "message": "Unbounded MongoDB query without pagination",
      "suggestion": "Use limit/skip or cursor-based pagination.",
      "confidence": "high",
      "sources": ["rule-based-agent", "gemini-performance-agent"]
    }
  ]
}
```

---

## What makes it agentic?

The system is not just a fixed LLM call. It uses a LangGraph-based workflow where:

- a router node chooses relevant agents,
- multiple specialist agents run in parallel,
- a critic node validates findings,
- a policy layer decides final severity/confidence,
- large PR handling changes review behavior dynamically.

This makes the review process adaptive and structured.

---

## Known limitations

- Free-tier Gemini API quotas can limit repeated full runs.
- LLM findings may still need manual review.
- Smart Review mode may skip low-priority changes in very large PRs.
- Current rules/prompts are optimized for MERN applications, not every tech stack.
- Local repo path is needed for context expansion.

---

## Future improvements

- GitHub PR URL integration
- GitHub Actions bot comments
- Real-time backend progress via SSE/WebSockets
- Benchmark metrics page in dashboard
- ESLint/Semgrep tool integration
- Stack presets: MERN, generic Node.js, Python/FastAPI
- Export review as PDF/Markdown
- Authentication for dashboard users

---

## Resume-ready description

> Built CodeSentinel AI, a LangGraph-powered hybrid multi-agent pull request reviewer for MERN applications using rule-based checks, Gemini agents, Groq critic validation, API-contract analysis, confidence scoring, and benchmark evaluation.

> Evaluated the reviewer on 9 benchmark PRs with injected defects, achieving 87.5% detection accuracy, 85.7% severity accuracy, and 100% clean-PR pass rate.

---

## License

MIT
