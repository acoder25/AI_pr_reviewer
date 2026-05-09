const { StateGraph, Annotation, START, END } = require("@langchain/langgraph");

const codeAgent = require("../agents/codeUnderstandingAgent");
const ruleBasedAgent = require("../agents/ruleBasedAgent");
const securityAgent = require("../agents/securityAgent");
const performanceAgent = require("../agents/performanceAgent");
const logicAgent = require("../agents/logicAgent");
const apiContractAgent = require("../agents/apiContractAgent");
const testAgent = require("../agents/testAgent");
const criticAgent = require("../agents/criticAgent");
const summaryAgent = require("../agents/summaryAgent");

const ReviewState = Annotation.Root({
  patchContent: Annotation(),
  repoRoot: Annotation(),

  context: Annotation(),
  criticReview: Annotation({
    reducer: (_, update) => update,
    default: () => ({ issueOpinions: [] }),
  }),
  report: Annotation(),

  skipTests: Annotation(),
  skipCritic: Annotation(),
  rulesOnly: Annotation(),
  startedAt: Annotation(),

  issues: Annotation({
    reducer: (left, right) => [...(left || []), ...(right || [])],
    default: () => [],
  }),

  tests: Annotation({
    reducer: (left, right) => [...(left || []), ...(right || [])],
    default: () => [],
  }),
});

async function safeIssueCall(name, fn, context) {
  try {
    return await fn(context);
  } catch (error) {
    console.error(`${name} failed:`, error.message || error);
    return [];
  }
}

async function safeTestCall(name, fn, context) {
  try {
    return await fn(context);
  } catch (error) {
    console.error(`${name} failed:`, error.message || error);
    return [];
  }
}

async function parseDiffNode(state) {
  let context = codeAgent.analyseDiff(state.patchContent);

  context = codeAgent.addFileContext(
    context,
    state.repoRoot,
    20
  );

  console.error("Total changed lines:", context.changes.length);
  console.error("First 10 changes:", context.changes.slice(0, 10));

  return {
    context,
    startedAt: Date.now(),
  };
}

async function ruleNode(state) {
  return {
    issues: ruleBasedAgent.review(state.context),
  };
}

async function securityNode(state) {
  if (state.rulesOnly) return { issues: [] };

  return {
    issues: await safeIssueCall(
      "Security Agent",
      securityAgent.review,
      state.context
    ),
  };
}

async function performanceNode(state) {
  if (state.rulesOnly) return { issues: [] };

  return {
    issues: await safeIssueCall(
      "Performance Agent",
      performanceAgent.review,
      state.context
    ),
  };
}

async function logicNode(state) {
  if (state.rulesOnly) return { issues: [] };

  return {
    issues: await safeIssueCall(
      "Logic Agent",
      logicAgent.review,
      state.context
    ),
  };
}

async function apiContractNode(state) {
  if (state.rulesOnly) return { issues: [] };

  return {
    issues: await safeIssueCall(
      "API Contract Agent",
      apiContractAgent.review,
      state.context
    ),
  };
}

async function testNode(state) {
  if (state.rulesOnly || state.skipTests) return { tests: [] };

  return {
    tests: await safeTestCall(
      "Test Agent",
      testAgent.generate,
      state.context
    ),
  };
}

async function criticNode(state) {
  if (state.rulesOnly || state.skipCritic || state.issues.length === 0) {
    return {
      criticReview: { issueOpinions: [] },
    };
  }

  try {
    const criticReview = await criticAgent.review(state.context, state.issues);
    return { criticReview };
  } catch (error) {
    console.error("Critic Agent failed:", error.message || error);
    return {
      criticReview: { issueOpinions: [] },
    };
  }
}

async function summaryNode(state) {
  const report = summaryAgent.aggregate(
    state.issues,
    state.criticReview || { issueOpinions: [] },
    state.tests
  );

  report.summary.latencyMs = Date.now() - state.startedAt;

  return { report };
}

function buildReviewGraph() {
  const graph = new StateGraph(ReviewState)
    .addNode("parseDiff", parseDiffNode)
    .addNode("ruleAgent", ruleNode)
    .addNode("securityAgent", securityNode)
    .addNode("performanceAgent", performanceNode)
    .addNode("logicAgent", logicNode)
    .addNode("apiContractAgent", apiContractNode)
    .addNode("testAgent", testNode)
    .addNode("criticAgent", criticNode)
    .addNode("summaryAgent", summaryNode)

    .addEdge(START, "parseDiff")

    // Parallel nodes
    .addEdge("parseDiff", "ruleAgent")
    .addEdge("parseDiff", "securityAgent")
    .addEdge("parseDiff", "performanceAgent")
    .addEdge("parseDiff", "logicAgent")
    .addEdge("parseDiff", "apiContractAgent")
    .addEdge("parseDiff", "testAgent")

    // Wait for all parallel nodes, then run critic
    .addEdge(
      [
        "ruleAgent",
        "securityAgent",
        "performanceAgent",
        "logicAgent",
        "apiContractAgent",
        "testAgent",
      ],
      "criticAgent"
    )

    .addEdge("criticAgent", "summaryAgent")
    .addEdge("summaryAgent", END)
    .compile();

  return graph;
}

module.exports = { buildReviewGraph };