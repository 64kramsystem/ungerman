// Pure subject-handling logic. Loaded as a background script in Thunderbird
// (exposing `unstackSubject` as a global) and require()d from tests in Node.

const LEADING_PREFIXES_RE = /^(?:(?:re|aw|antwort|wg|fwd?)\s*:\s*)+/i;

function unstackSubject(subject) {
  if (!subject) return subject;
  const match = subject.match(LEADING_PREFIXES_RE);
  if (!match) return subject;

  const awPrefixes = match[0].match(/aw\s*:\s*/gi);
  if (!awPrefixes) return subject;

  // Keep the innermost AW prefix's spelling and spacing, but remove the
  // entire leading chain so repeated compose events cannot strip more.
  return awPrefixes[awPrefixes.length - 1] + subject.slice(match[0].length);
}

if (typeof module !== "undefined") {
  module.exports = { unstackSubject };
}
