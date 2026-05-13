const { test } = require("node:test");
const assert = require("node:assert/strict");
const { unstackSubject } = require("./subject.js");

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
