const fs = require("fs");

const codeAgent = require("./agents/codeUnderstandingAgent");
const securityAgent = require("./agents/securityAgent");
const performanceAgent = require("./agents/performanceAgent");
const testAgent = require("./agents/testAgent");
const summaryAgent = require("./agents/summaryAgent");

function readPatchFile(patchPath) {
  const buffer = fs.readFileSync(patchPath);

  const hasNullBytes = buffer.includes(0);

  if (hasNullBytes) {
    return buffer.toString("utf16le").replace(/^\uFEFF/, "");
  }

  return buffer.toString("utf8").replace(/^\uFEFF/, "");
}

async function main() {
  const patchPath = process.argv[2];

  if (!patchPath) {
    console.error("Usage: node run-review.js <patch-file>");
    process.exit(1);
  }

  const patchContent = readPatchFile(patchPath);
  const context = codeAgent.analyseDiff(patchContent);

  console.error("Total changed lines:", context.changes.length);
  console.error("First 10 changes:", context.changes.slice(0, 10));

  const securityIssues = await securityAgent.review(context);
  const performanceIssues = await performanceAgent.review(context);
  const tests = await testAgent.generate(context);

  const report = summaryAgent.aggregate(
    securityIssues,
    performanceIssues,
    tests
  );

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});