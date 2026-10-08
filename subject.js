// Pure subject-handling logic. Loaded as a background script in Thunderbird
// (exposing the subject helpers as globals) and require()d from tests in Node.

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

function replySubject(subject, prefix) {
  if (prefix === undefined) return unstackSubject(subject);
  // Treat a configured prefix literally, including any regex punctuation.
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const prefixes = new RegExp(`^(?:(?:re|aw|antwort|wg|fwd?)\\s*:\\s*|${escaped}\\s*)+`, "i");
  const body = subject.replace(prefixes, "");
  return body ? `${prefix} ${body}` : prefix;
}

if (typeof module !== "undefined") {
  module.exports = { unstackSubject, replySubject };
}
