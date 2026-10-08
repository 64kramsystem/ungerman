const { test } = require("node:test");
const assert = require("node:assert/strict");
const { unstackSubject, replySubject } = require("./subject.js");

test("strips Re: when the underlying subject already starts with AW:", () => {
  assert.equal(unstackSubject("Re: AW: Foo"), "AW: Foo");
});

test("strips AW: when the underlying subject already starts with AW: (German Thunderbird stacking)", () => {
  assert.equal(unstackSubject("AW: AW: Foo"), "AW: Foo");
});

test("strips Antwort: when the underlying subject already starts with AW:", () => {
  assert.equal(unstackSubject("Antwort: AW: Foo"), "AW: Foo");
});

test("matches reply prefix case-insensitively", () => {
  assert.equal(unstackSubject("re: aw: foo"), "aw: foo");
  assert.equal(unstackSubject("RE: AW: Foo"), "AW: Foo");
});

test("collapses the entire mixed chain when replying to an already stacked subject", () => {
  const subject = "AW: Re: Aw: Aw: Martin IL MIGLIORE!!!!";
  for (const addedPrefix of ["", "Re: ", "AW: ", "Antwort: "]) {
    const fixed = unstackSubject(addedPrefix + subject);
    assert.equal(fixed, "Aw: Martin IL MIGLIORE!!!!");
    assert.equal(unstackSubject(fixed), fixed);
  }
});

test("collapses reply prefixes after the last AW: too", () => {
  assert.equal(unstackSubject("AW: Re: Antwort: Foo"), "AW: Foo");
  assert.equal(unstackSubject("Re: Aw: Re: Foo"), "Aw: Foo");
});

test("continues to recognize forwarding prefixes in reply subjects", () => {
  for (const prefix of ["WG", "Fw", "Fwd"]) {
    assert.equal(unstackSubject(`${prefix}: Re: AW: Foo`), "AW: Foo");
  }
});

test("handles prefixes with missing or extra whitespace", () => {
  assert.equal(unstackSubject("Re:AW:Aw:Foo"), "Aw:Foo");
  assert.equal(unstackSubject("AW :\tRe:  Aw :  Foo"), "Aw :  Foo");
});

test("leaves prefix chains without AW: untouched", () => {
  const subject = "Re: Antwort: Re: Foo";
  assert.equal(unstackSubject(subject), subject);
});

test("only collapses the leading chain, preserving prefixes in the subject body", () => {
  assert.equal(unstackSubject("Re: Foo AW: Bar"), "Re: Foo AW: Bar");
  assert.equal(unstackSubject("Re: AW: Foo AW: Re: Bar"), "AW: Foo AW: Re: Bar");
  assert.equal(unstackSubject("Re: AW: AWESOME: Foo"), "AW: AWESOME: Foo");
});

test("collapses stacked prefixes even when the subject body is empty", () => {
  assert.equal(unstackSubject("Re: AW: Aw:"), "Aw:");
});

test("leaves a plain AW: subject untouched (no stacking)", () => {
  assert.equal(unstackSubject("AW: Foo"), "AW: Foo");
});

test("leaves a Re: subject untouched when there is no AW: core", () => {
  assert.equal(unstackSubject("Re: Foo"), "Re: Foo");
});

test("leaves a subject with no recognized prefix untouched", () => {
  assert.equal(unstackSubject("Foo"), "Foo");
});

test("returns empty string unchanged", () => {
  assert.equal(unstackSubject(""), "");
});

test("returns undefined unchanged", () => {
  assert.equal(unstackSubject(undefined), undefined);
});

test("does not strip when AW is part of a word (e.g. 'AWESOME:')", () => {
  assert.equal(unstackSubject("AWESOME: Foo"), "AWESOME: Foo");
});

test("a configured prefix replaces and unstacks standard and custom prefixes", () => {
  for (const subject of ["Re: Topic", "AW: Re: Topic", "Re: SV: SV: Topic", "SV: AW: SV: Topic"]) {
    const fixed = replySubject(subject, "SV:");
    assert.equal(fixed, "SV: Topic");
    assert.equal(replySubject(fixed, "SV:"), fixed);
  }
});

test("custom prefixes are literal and only the leading chain is removed", () => {
  assert.equal(replySubject("Re: [Reply]+: [Reply]+: Topic", "[Reply]+:"), "[Reply]+: Topic");
  assert.equal(replySubject("Re: Subject SV: Re: details", "SV:"), "SV: Subject SV: Re: details");
  assert.equal(replySubject("Re: AWESOME: Topic", "AW:"), "AW: AWESOME: Topic");
});

test("custom prefix matching ignores case and handles empty subjects", () => {
  assert.equal(replySubject("re:sv:Sv:Topic", "SV:"), "SV: Topic");
  assert.equal(replySubject("", "SV:"), "SV:");
  assert.equal(replySubject("Re: SV:", "SV:"), "SV:");
});

test("without a recipient prefix, existing behavior remains intact", () => {
  assert.equal(replySubject("Re: Aw: Topic"), "Aw: Topic");
  assert.equal(replySubject("Re: Topic"), "Re: Topic");
});
