// Listens for newly opened compose tabs of type "reply"; if the subject has
// a leading reply prefix in front of an "AW: " core, strips the outer prefix.
// Pure logic lives in subject.js (`unstackSubject`, exposed as a global).
//
// A tab from `tabs.onCreated` may still be loading, in which case
// `getComposeDetails` can come back before the subject is populated and the
// fix silently no-ops. So we also re-run on `tabs.onUpdated` once the compose
// tab reaches status "complete". `maybeFixComposeTab` is idempotent
// (re-running on an already-unstacked subject changes nothing), so the two
// entry points can't double-strip.

async function maybeFixComposeTab(tabId) {
  let details;
  try {
    details = await browser.compose.getComposeDetails(tabId);
  } catch (e) {
    return;
  }
  if (details.type !== "reply") return;
  const fixed = unstackSubject(details.subject);
  if (fixed !== details.subject) {
    await browser.compose.setComposeDetails(tabId, { subject: fixed });
  }
}

browser.tabs.onCreated.addListener(async (tab) => {
  if (tab.type !== "messageCompose") return;
  await maybeFixComposeTab(tab.id);
});

browser.tabs.onUpdated.addListener(
  (tabId, changeInfo, tab) => {
    if (tab.type !== "messageCompose" || changeInfo.status !== "complete") return;
    maybeFixComposeTab(tabId);
  },
  { properties: ["status"] }
);
