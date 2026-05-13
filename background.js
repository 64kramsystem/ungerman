// Listens for newly opened compose tabs of type "reply"; if the subject has
// a leading reply prefix in front of an "AW: " core, strips the outer prefix.
// Pure logic lives in subject.js (`unstackSubject`, exposed as a global).

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
