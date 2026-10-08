const changedSubjects = new Map();

async function getReplySubject(tabId, details) {
  if (details.type !== "reply") return details.subject;
  const { recipientPrefixes = [] } = await browser.storage.local.get("recipientPrefixes");
  const recipients = await browser.messengerUtilities.parseMailboxString(details.to.join(","));
  const rule = recipientPrefixes.find(({ email }) =>
    recipients.some(recipient => recipient.email?.toLowerCase() === email.toLowerCase())
  );
  const previous = changedSubjects.get(tabId);
  // Reuse the original subject if only our rewrite changed it. This lets a changed
  // recipient or deleted rule undo the previous prefix without undoing the user's edits.
  const original = details.subject === previous?.applied ? previous.original : details.subject;
  const subject = replySubject(original, rule?.prefix);
  changedSubjects.set(tabId, { original, applied: subject });
  return subject;
}

async function maybeFixComposeTab(tabId) {
  let details;
  try {
    details = await browser.compose.getComposeDetails(tabId);
  } catch {
    return;
  }
  // onCreated can arrive before the subject is populated; onUpdated handles that case.
  if (!details.subject) return;
  const subject = await getReplySubject(tabId, details);
  if (subject !== details.subject) {
    await browser.compose.setComposeDetails(tabId, { subject });
  }
}

browser.tabs.onCreated.addListener(async tab => {
  if (tab.type === "messageCompose") await maybeFixComposeTab(tab.id);
});

browser.tabs.onUpdated.addListener(
  (tabId, changeInfo, tab) => {
    if (tab.type === "messageCompose" && changeInfo.status === "complete") {
      return maybeFixComposeTab(tabId);
    }
  },
  { properties: ["status"] }
);

browser.tabs.onRemoved.addListener(tabId => changedSubjects.delete(tabId));

browser.compose.onBeforeSend.addListener(async (tab, details) => {
  const subject = await getReplySubject(tab.id, details);
  if (subject !== details.subject) return { details: { subject } };
});
