function analyseDiff(patchContent) {
  const changes = [];

  const lines = patchContent.split(/\r?\n/);

  let currentFile = "unknown";
  let oldLine = 0;
  let newLine = 0;
  let insideHunk = false;

  for (const line of lines) {
    // Example:
    // diff --git a/server/routes/user.js b/server/routes/user.js
    if (line.startsWith("diff --git")) {
      const parts = line.split(" ");
      const newFile = parts[3]; // b/path/to/file.js

      if (newFile) {
        currentFile = newFile.replace(/^b\//, "");
      }

      insideHunk = false;
      continue;
    }

    // Example:
    // +++ b/server/routes/user.js
    if (line.startsWith("+++ ")) {
      const file = line.replace("+++ ", "").trim();

      if (file !== "/dev/null") {
        currentFile = file.replace(/^b\//, "");
      }

      continue;
    }
    function shouldIgnoreFile(file) {
      return (
        file.includes("package-lock.json") ||
        file.includes("package.json") ||
        file.includes(".env") ||
        file.includes("node_modules") ||
        file.includes("dist/") ||
        file.includes("build/")
      );
    }

    // Example:
    // @@ -10,6 +10,12 @@
    if (line.startsWith("@@")) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);

      if (match) {
        oldLine = Number(match[1]);
        newLine = Number(match[2]);
        insideHunk = true;
      }

      continue;
    }

    if (!insideHunk) {
      continue;
    }

    if (line.startsWith("\\ No newline")) {
      continue;
    }
    if (shouldIgnoreFile(currentFile)) continue;
    // Added line
    if (line.startsWith("+") && !line.startsWith("+++")) {
      changes.push({
        file: currentFile,
        line: newLine,
        type: "Added",
        content: line.slice(1).trimEnd(),
      });

      newLine++;
      continue;
    }

    // Deleted line
    if (line.startsWith("-") && !line.startsWith("---")) {
      changes.push({
        file: currentFile,
        line: oldLine,
        type: "Deleted",
        content: line.slice(1).trimEnd(),
      });

      oldLine++;
      continue;
    }

    // Context line
    if (line.startsWith(" ")) {
      oldLine++;
      newLine++;
      continue;
    }
  }

  return { changes };
}

module.exports = { analyseDiff };