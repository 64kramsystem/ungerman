const rows = document.querySelector("tbody");
const status = document.getElementById("status");
const add = document.getElementById("add");
const save = document.getElementById("save");

function addRow(email = "", prefix = "") {
  const row = document.querySelector("template").content.firstElementChild.cloneNode(true);
  row.querySelector('[name="email"]').value = email;
  row.querySelector('[name="prefix"]').value = prefix;
  row.querySelector("button").addEventListener("click", () => {
    row.remove();
    status.textContent = "";
  });
  rows.append(row);
  return row;
}

browser.storage.local.get({ recipientPrefixes: [] }).then(({ recipientPrefixes }) => {
  for (const { email, prefix } of recipientPrefixes) addRow(email, prefix);
  add.disabled = false;
  save.disabled = false;
}).catch(error => { status.textContent = error.message; });

add.addEventListener("click", () => {
  addRow().querySelector("input").focus();
  status.textContent = "";
});

document.querySelector("form").addEventListener("input", () => { status.textContent = ""; });
document.querySelector("form").addEventListener("submit", async event => {
  event.preventDefault();
  const recipientPrefixes = Array.from(rows.children, row => {
    const email = row.querySelector('[name="email"]').value.trim().toLowerCase();
    const input = row.querySelector('[name="prefix"]');
    const value = input.value.trim();
    const prefix = value.endsWith(":") ? value : `${value}:`;
    input.value = prefix;
    return { email, prefix };
  });
  save.disabled = true;
  status.textContent = "Saving…";
  try {
    await browser.storage.local.set({ recipientPrefixes });
    status.textContent = "Saved.";
  } catch (error) {
    status.textContent = error.message;
  } finally {
    save.disabled = false;
  }
});
