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
const routerAgent = require("../agents/routerAgent");
const dependencyAgent = require("../agents/dependencyAgent");

const ReviewState = Annotation.Root({
  patchContent: Annotation(),
  repoRoot: Annotation(),

  context: Annotation(),
  criticReview: Annotation({
    reducer: (_, update) => update,
    default: () => ({ issueOpinions: [] }),
  }),
  report: Annotation(),
  routePlan: Annotation(),

  skipTests: Annotation(),
  skipCritic: Annotation(),
  rulesOnly: Annotation(),
  startedAt: Annotation(),
  fullReview: Annotation(),
  maxChanges: Annotation(),

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

  if (state.fullReview) {
    context = {
      ...context,
      originalChangedLines: context.changes.length,
      largePrMode: false,
      reviewMode: "full",
    };
  } else {
    context = codeAgent.applyLargePrLimits(
      context,
      state.maxChanges || 250
    );

    context.reviewMode = context.largePrMode ? "smart" : "full";
  }

  context = codeAgent.addFileContext(context, state.repoRoot, 20);

  return {
    context,
    startedAt: Date.now(),
  };
}
async function routerNode(state) {
  const routePlan = routerAgent.route(state.context, {
    skipTests: state.skipTests,
    skipCritic: state.skipCritic,
  });

  console.error("Router plan:", routePlan);

  return { routePlan };
}
async function dependencyNode(state) {
  if (!state.routePlan?.runDependency) return { issues: [] };

  return {
    issues: dependencyAgent.review(state.context),
  };
}
async function ruleNode(state) {
  return {
    issues: ruleBasedAgent.review(state.context),
  };
}

async function securityNode(state) {
  if (state.rulesOnly || !state.routePlan?.runSecurity) return { issues: [] };

  return {
    issues: await safeIssueCall(
      "Security Agent",
      securityAgent.review,
      state.context
    ),
  };
}

async function performanceNode(state) {
  if (state.rulesOnly || !state.routePlan?.runPerformance) return { issues: [] };

  return {
    issues: await safeIssueCall(
      "Performance Agent",
      performanceAgent.review,
      state.context
    ),
  };
}

async function logicNode(state) {
  if (state.rulesOnly || !state.routePlan?.runLogic) return { issues: [] };

  return {
    issues: await safeIssueCall("Logic Agent", logicAgent.review, state.context),
  };
}

async function apiContractNode(state) {
  if (state.rulesOnly || !state.routePlan?.runApiContract) {
    return { issues: [] };
  }

  return {
    issues: await safeIssueCall(
      "API Contract Agent",
      apiContractAgent.review,
      state.context
    ),
  };
}

async function testNode(state) {
  if (state.rulesOnly || state.skipTests || !state.routePlan?.runTests) {
    return { tests: [] };
  }

  return {
    tests: await safeTestCall("Test Agent", testAgent.generate, state.context),
  };
}

async function criticNode(state) {
  if (
    state.rulesOnly ||
    state.skipCritic ||
    !state.routePlan?.runCritic ||
    state.issues.length === 0
  ) {
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
  report.summary.routePlan = state.routePlan;
  report.summary.largePrMode = state.context.largePrMode;
  report.summary.reviewMode = state.context.reviewMode;
  report.summary.originalChangedLines = state.context.originalChangedLines;
  report.summary.reviewedChangedLines = state.context.changes.length;

  report.summary.coverage =
  `${state.context.changes.length}/${state.context.originalChangedLines}`;

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
    .addNode("router", routerNode)
    .addNode("dependencyAgent", dependencyNode)

    .addEdge(START, "parseDiff")
    .addEdge("parseDiff", "router")

    .addEdge("router", "ruleAgent")
    .addEdge("router", "securityAgent")
    .addEdge("router", "performanceAgent")
    .addEdge("router", "logicAgent")
    .addEdge("router", "apiContractAgent")
    .addEdge("router", "dependencyAgent")
    .addEdge("router", "testAgent")

    .addEdge(
      [
        "ruleAgent",
        "securityAgent",
        "performanceAgent",
        "logicAgent",
        "apiContractAgent",
        "dependencyAgent",
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