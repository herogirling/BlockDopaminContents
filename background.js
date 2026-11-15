"use strict";
let rules = [];
let ready = false;
const loaded = browser.storage.local.get("rules").then(data => {
  rules = data.rules || [];
  ready = true;
}).catch(error => { console.error("設定の読み込みに失敗しました", error); });

function blockedUrl(url) {
  return `${browser.runtime.getURL("blocked.html")}?site=${encodeURIComponent(new URL(url).hostname)}`;
}

browser.webRequest.onBeforeRequest.addListener(details => {
  const check = () => BlockRules.match(details.url, rules) ? { redirectUrl: blockedUrl(details.url) } : {};
  return ready ? check() : loaded.then(check);
}, { urls: ["http://*/*", "https://*/*"], types: ["main_frame"] }, ["blocking"]);

async function checkTabs() {
  await loaded;
  const tabs = await browser.tabs.query({});
  await Promise.all(tabs.map(async tab => {
    if (tab.url && BlockRules.match(tab.url, rules)) {
      try { await browser.tabs.update(tab.id, { url: blockedUrl(tab.url) }); }
      catch { /* A tab may close while it is checked. */ }
    }
  }));
}
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.rules) {
    rules = changes.rules.newValue || [];
    checkTabs().catch(console.error);
  }
});
browser.browserAction.onClicked.addListener(() => browser.runtime.openOptionsPage());
browser.alarms.onAlarm.addListener(() => checkTabs().catch(console.error));
browser.alarms.create("schedule", { periodInMinutes: 1 });
// Align checks with wall-clock minute boundaries; alarms also cover wake from sleep.
function tick() {
  checkTabs().catch(console.error);
  setTimeout(tick, 60000 - (Date.now() % 60000) + 20);
}
tick();
