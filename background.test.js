const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

function startBackground() {
  const state = { details: { type: "reply", subject: "Re: AW: Project" } };
  const reads = [];
  const writes = [];
  const listeners = {};
  const context = vm.createContext({
    browser: {
      compose: {
        async getComposeDetails(id) {
          reads.push(id);
          if (state.error) throw state.error;
          return { ...state.details };
        },
        async setComposeDetails(id, details) {
          writes.push({ id, subject: details.subject });
          Object.assign(state.details, details);
        },
      },
      tabs: {
        onCreated: { addListener(fn) { listeners.created = fn; } },
        onUpdated: { addListener(fn) { listeners.updated = fn; } },
      },
    },
  });
  for (const name of ["subject.js", "background.js"]) {
    vm.runInContext(readFileSync(join(__dirname, name), "utf8"), context);
  }
  return { state, reads, writes, listeners };
}

// The updated listener intentionally has no return value; drain its async API work.
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("compose creation normalizes the reply using its actual tab ID", async () => {
  const { listeners, writes } = startBackground();
  await listeners.created({ id: 23, type: "messageCompose" });
  assert.deepEqual(writes, [{ id: 23, subject: "AW: Project" }]);
});

test("a delayed subject is normalized when the compose tab finishes loading", async () => {
  const { listeners, state, writes } = startBackground();
  state.details.subject = "";
  await listeners.created({ id: 23, type: "messageCompose" });
  assert.deepEqual(writes, []);
  state.details.subject = "Re: AW: Loaded later";
  listeners.updated(23, { status: "complete" }, { type: "messageCompose" });
  await settle();
  assert.deepEqual(writes, [{ id: 23, subject: "AW: Loaded later" }]);
});

test("updates and repeated completion events do not strip an already fixed subject", async () => {
  const { listeners, writes, state } = startBackground();
  await listeners.created({ id: 23, type: "messageCompose" });
  listeners.updated(23, { status: "complete" }, { type: "messageCompose" });
  listeners.updated(23, { status: "complete" }, { type: "messageCompose" });
  await settle();
  assert.equal(state.details.subject, "AW: Project");
  assert.equal(writes.length, 1);
});

test("new messages, forwards and drafts retain their subjects on both event paths", async () => {
  for (const type of ["new", "forward", "draft"]) {
    const { listeners, state, writes } = startBackground();
    state.details.type = type;
    await listeners.created({ id: 23, type: "messageCompose" });
    listeners.updated(23, { status: "complete" }, { type: "messageCompose" });
    await settle();
    assert.deepEqual(writes, [], type);
  }
});

test("unrelated tabs and incomplete updates do not call the compose API", async () => {
  const { listeners, reads } = startBackground();
  await listeners.created({ id: 5, type: "mail" });
  listeners.updated(5, { status: "complete" }, { type: "content" });
  listeners.updated(23, { status: "loading" }, { type: "messageCompose" });
  listeners.updated(23, { title: "New title" }, { type: "messageCompose" });
  await settle();
  assert.deepEqual(reads, []);
});

test("a closed or not-yet-ready compose tab is ignored and later events still work", async () => {
  const { listeners, state, writes } = startBackground();
  state.error = new Error("compose tab no longer exists");
  await listeners.created({ id: 23, type: "messageCompose" });
  listeners.updated(23, { status: "complete" }, { type: "messageCompose" });
  await settle();
  assert.deepEqual(writes, []);
  state.error = null;
  await listeners.created({ id: 24, type: "messageCompose" });
  assert.deepEqual(writes, [{ id: 24, subject: "AW: Project" }]);
});
