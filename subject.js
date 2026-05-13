// Pure subject-handling logic. Loaded as a background script in Thunderbird
// (exposing `unstackSubject` as a global) and require()d from tests in Node.

const STACKED_PREFIX_RE = /^(?:re|aw|antwort|wg|fwd?)\s*:\s+(aw:\s.*)$/i;

function unstackSubject(subject) {
  if (!subject) return subject;
  const match = subject.match(STACKED_PREFIX_RE);
  return match ? match[1] : subject;
}

if (typeof module !== "undefined") {
  module.exports = { unstackSubject };
}
