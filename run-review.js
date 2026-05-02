const fs = require('fs');
const { parsePatch } = require('diff');
const codeAgent = require('./agents/codeUnderstandingAgent');
const securityAgent = require('./agents/securityAgent');
const performanceAgent = require('./agents/performanceAgent');
const testAgent = require('./agents/testAgent');
const summaryAgent = require('./agents/summaryAgent');

async function main() {
  const patchPath = process.argv[2];
  if (!patchPath) {
    console.error('Usage: node run-review.js <patch-file>');
    process.exit(1);
  }
  const patchContent = fs.readFileSync(patchPath, 'utf8');
  const diff = parsePatch(patchContent); 

  const context = codeAgent.analyseDiff(diff);
  const securityIssues = await securityAgent.review(context);
  const performanceIssues = await performanceAgent.review(context);
  const tests = await testAgent.generate(context);

  const report = summaryAgent.aggregate(securityIssues, performanceIssues, tests);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});