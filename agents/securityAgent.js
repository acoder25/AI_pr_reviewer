async function review(context) {
  const issues = [];
  context.changes.forEach(({ file, line, content }) => {
    if (/req\.(body|query)/.test(content) &&
        /\+/.test(content) &&
        /(find|findOne|update|delete)/.test(content)) {
      issues.push({
        severity: 'high',
        message: 'Potential unsanitized user input in database query',
        file,
        line,
      });
    }
    if (/['"]{1}[A-Za-z0-9_]{32,}['"]{1}/.test(content)) {
      issues.push({
        severity: 'high',
        message: 'Hard-coded credential or secret detected',
        file,
        line,
      });
    }
    if (/router\.(post|put|patch)/.test(content) &&
        !/validate|checkSchema/.test(content)) {
      issues.push({
        severity: 'medium',
        message: 'Route handler may lack input validation',
        file,
        line,
      });
    }
  });
  return issues;
}

module.exports = { review };