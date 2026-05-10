// agents/routerAgent.js

function route(context, options = {}) {
  const files = Array.from(new Set(context.changes.map((c) => c.file)));
  const content = context.changes.map((c) => c.content).join("\n").toLowerCase();

  const changedBackend = files.some((file) =>
    /server\/|routes\/|controllers\/|models\/|middlewares\//i.test(file)
  );

  const changedFrontend = files.some((file) =>
    /client\/|src\/|components\/|pages\/|\.jsx$|\.tsx$/i.test(file)
  );

  const changedPackageJson = files.some((file) => file.endsWith("package.json"));

  const hasDbOrApiCode =
    /router\.|app\.|req\.|res\.|mongoose|findone|findbyid|\.find\(|fetch\(|axios/.test(
      content
    );

  const hasFrontendApiCall = /fetch\(|axios|api\//.test(content);

  const hasSecuritySensitiveCode =
    /req\.body|req\.query|req\.params|jwt|token|password|secret|delete|update|auth/.test(
      content
    );

  const hasPerformanceSensitiveCode =
    /\.find\(|findbyid|for\s*\(|for\s+.*of|foreach|map\(|limit|skip|pagination/.test(
      content
    );

  const largePr = context.originalChangedLines
    ? context.originalChangedLines > 250
    : context.changes.length > 250;

  return {
    runSecurity: changedBackend && (hasSecuritySensitiveCode || hasDbOrApiCode),
    runPerformance: changedBackend && hasPerformanceSensitiveCode,
    runLogic: changedBackend || changedFrontend,
    runApiContract: changedBackend && changedFrontend && hasFrontendApiCall,
    runDependency: changedPackageJson,
    runTests: !largePr && !options.skipTests,
    runCritic: !largePr && !options.skipCritic,
    largePr,
    changedFiles: files,
  };
}

module.exports = { route };