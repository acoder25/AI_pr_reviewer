async function review(context) {
  const issues = [];
  context.changes.forEach(({ file, line, content }) => {
    if (/for\s*\(/.test(content) && /\.(find|findOne|update|remove)/.test(content)) {
      issues.push({
        severity: 'medium',
        message: 'Database call inside a loop may lead to an N+1 query pattern',
        file,
        line,
      });
    }
    if (/fs\.(readFileSync|writeFileSync|readdirSync|statSync)/.test(content)) {
      issues.push({
        severity: 'medium',
        message: 'Synchronous file system operation could block the event loop',
        file,
        line,
      });
    }
    if (/\b(await )?\w+\(/.test(content) && /\.then/.test(content)) {
      issues.push({
        severity: 'low',
        message: 'Consider using async/await for better readability and error handling',
        file,
        line,
      });
    }
  });
  return issues;
}

module.exports = { review };