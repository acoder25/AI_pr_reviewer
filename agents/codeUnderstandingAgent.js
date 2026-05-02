function analyseDiff(diffArray) {
  const changes = [];
  diffArray.forEach((patch) => {
    // Safely choose the filename. For added/modified files, newFileName is used;
    // for deleted files, oldFileName; otherwise fallback to empty string.
    let filePathRaw = '';
    if (patch.newFileName && patch.newFileName !== '/dev/null') {
      filePathRaw = patch.newFileName;
    } else if (patch.oldFileName && patch.oldFileName !== '/dev/null') {
      filePathRaw = patch.oldFileName;
    }

    // Only call .replace() on a defined string; otherwise leave filePath blank
    const filePath =filePathRaw ? filePathRaw.replace(/^([ab]\/)/, '') : 'unknown';
    // … hunk parsing logic remains the same …
    patch.hunks.forEach((hunk) => {
      let newLine = hunk.newStart;
      let oldLine = hunk.oldStart;
      hunk.lines.forEach((line) => {
        const sign = line[0];
        const content = line.slice(1).trimEnd();
        if (sign === '+') {
          changes.push({ file: filePath, line: newLine, type: 'Added', content });
          newLine++;
        } else if (sign === '-') {
          changes.push({ file: filePath, line: oldLine, type: 'Deleted', content });
          oldLine++;
        } else {
          newLine++;
          oldLine++;
        }
      });
    });
  });
  return { changes };
}

module.exports = { analyseDiff };