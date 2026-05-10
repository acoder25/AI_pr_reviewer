const fs = require("fs");
const path = require("path");

function shouldIgnoreFile(filePath) {
  if (!filePath) return true;

  const ignoredPatterns = [
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    ".env",
    ".env.example",
    "node_modules/",
    "dist/",
    "build/",
    ".next/",
    "coverage/",
    "public/",
  ];

  return ignoredPatterns.some((pattern) => filePath.includes(pattern));
}

function analyseDiff(patchContent) {
  const changes = [];

  const lines = patchContent.split(/\r?\n/);

  let currentFile = "unknown";
  let oldLine = 0;
  let newLine = 0;
  let insideHunk = false;

  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      const parts = line.split(" ");
      const newFile = parts[3];

      if (newFile) {
        currentFile = newFile.replace(/^b\//, "");
      }

      insideHunk = false;
      continue;
    }

    if (line.startsWith("+++ ")) {
      const file = line.replace("+++ ", "").trim();

      if (file !== "/dev/null") {
        currentFile = file.replace(/^b\//, "");
      }

      continue;
    }

    if (line.startsWith("@@")) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);

      if (match) {
        oldLine = Number(match[1]);
        newLine = Number(match[2]);
        insideHunk = true;
      }

      continue;
    }

    if (!insideHunk) continue;
    if (line.startsWith("\\ No newline")) continue;

    if (line.startsWith("+") && !line.startsWith("+++")) {
      if (shouldIgnoreFile(currentFile)) {
        newLine++;
        continue;
      }

      changes.push({
        file: currentFile,
        line: newLine,
        type: "Added",
        content: line.slice(1).trimEnd(),
      });
      newLine++;
      continue;
    }

    if (line.startsWith("-") && !line.startsWith("---")) {
       if (shouldIgnoreFile(currentFile)) {
        oldLine++;
        continue;
      }
      changes.push({
        file: currentFile,
        line: oldLine,
        type: "Deleted",
        content: line.slice(1).trimEnd(),
      });
      oldLine++;
      continue;
    }

    if (line.startsWith(" ")) {
      oldLine++;
      newLine++;
    }
  }

  return { changes };
}

function addFileContext(context, repoRoot, radius = 20) {
  if (!repoRoot) return context;

  const snippets = [];

  for (const change of context.changes) {
    if (change.type !== "Added") continue;
    if (shouldIgnoreFile(change.file)) continue;

    const absolutePath = path.join(repoRoot, change.file);

    if (!fs.existsSync(absolutePath)) continue;

    const fileLines = fs.readFileSync(absolutePath, "utf8").split(/\r?\n/);

    const start = Math.max(1, change.line - radius);
    const end = Math.min(fileLines.length, change.line + radius);

    const snippet = fileLines
      .slice(start - 1, end)
      .map((line, index) => {
        const actualLine = start + index;
        const marker = actualLine === change.line ? ">>" : "  ";
        return `${marker} ${actualLine}: ${line}`;
      })
      .join("\n");

    snippets.push(`
File: ${change.file}
Changed line: ${change.line}
Changed code: ${change.content}

Nearby context:
${snippet}
`);
  }

  return {
    ...context,
    reviewText: snippets.join("\n\n"),
  };
}
function scoreChange(change) {
  const text = `${change.file} ${change.content}`.toLowerCase();
  let score = 0;

  if (/routes|controllers|models|middlewares|server/.test(text)) score += 4;
  if (/req\.body|req\.query|req\.params|jwt|secret|token|password/.test(text))
    score += 5;
  if (/findone|findbyid|\.find\(|delete|update/.test(text)) score += 4;
  if (/router\.|app\.|res\.json|res\.status/.test(text)) score += 3;
  if (/fetch\(|axios|api\//.test(text)) score += 3;
  if (/for\s*\(|for\s+.*of|foreach|map\(/.test(text)) score += 2;

  return score;
}

function applyLargePrLimits(context, maxChanges = 250) {
  const originalChangedLines = context.changes.length;

  if (originalChangedLines <= maxChanges) {
    return {
      ...context,
      originalChangedLines,
      largePrMode: false,
    };
  }

  const prioritizedChanges = [...context.changes]
    .map((change) => ({
      ...change,
      priorityScore: scoreChange(change),
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, maxChanges);

  return {
    ...context,
    changes: prioritizedChanges,
    originalChangedLines,
    largePrMode: true,
  };
}

module.exports = { analyseDiff, addFileContext, applyLargePrLimits };