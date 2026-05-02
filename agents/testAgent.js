async function generate(context) {
  const tests = [];
  const files = Array.from(new Set(context.changes.map((c) => c.file)));
  files.forEach((file) => {
    tests.push({
      type: 'positive',
      description: `should correctly handle valid input in ${file}`,
    });
    tests.push({
      type: 'negative',
      description: `should gracefully handle invalid or missing parameters in ${file}`,
    });
    tests.push({
      type: 'edge',
      description: `should handle edge cases (empty strings, null values) in ${file}`,
    });
  });
  return tests;
}

module.exports = { generate };