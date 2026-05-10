const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { buildReviewGraph } = require("../graph/reviewGraph");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());

function readPatchFile(patchPath) {
  const buffer = fs.readFileSync(patchPath);
  const hasNullBytes = buffer.includes(0);

  if (hasNullBytes) {
    return buffer.toString("utf16le").replace(/^\uFEFF/, "");
  }

  return buffer.toString("utf8").replace(/^\uFEFF/, "");
}

app.post("/api/review", upload.single("patch"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Patch file is required" });
    }

    const {
      repoRoot,
      skipTests,
      skipCritic,
      rulesOnly,
      fullReview,
      maxChanges,
    } = req.body;

    const patchContent = readPatchFile(req.file.path);
    const graph = buildReviewGraph();

    const result = await graph.invoke({
      patchContent,
      repoRoot: repoRoot || null,
      skipTests: skipTests === "true",
      skipCritic: skipCritic === "true",
      rulesOnly: rulesOnly === "true",
      fullReview: fullReview === "true",
      maxChanges: maxChanges ? Number(maxChanges) : 250,
    });

    fs.unlinkSync(req.file.path);

    res.json(result.report);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Review failed",
      message: error.message,
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`AI PR Reviewer backend running on http://localhost:${PORT}`);
});