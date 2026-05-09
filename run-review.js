const fs = require("fs");
const { buildReviewGraph } = require("./graph/reviewGraph");

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
    console.error("Usage: node run-review.js <patch-file> --repo <repo-path>");
    process.exit(1);
  }

  const repoIndex = process.argv.indexOf("--repo");
  const repoRoot =
    repoIndex !== -1 && process.argv[repoIndex + 1]
      ? process.argv[repoIndex + 1]
      : null;

  const skipTests = process.argv.includes("--skip-tests");
  const skipCritic = process.argv.includes("--skip-critic");
  const rulesOnly = process.argv.includes("--rules-only");

  const patchContent = readPatchFile(patchPath);

  const graph = buildReviewGraph();

  const result = await graph.invoke({
    patchContent,
    repoRoot,
    skipTests,
    skipCritic,
    rulesOnly,
  });

  console.log(JSON.stringify(result.report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});