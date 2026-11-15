"use strict";
const names = ["日", "月", "火", "水", "木", "金", "土"];
const status = document.getElementById("status");
let rules = [];
let busy = false;
for (let day = 0; day < 7; day++) {
  const label = document.createElement("label");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.value = day;
  input.checked = day >= 1 && day <= 5;
  label.append(input, names[day]);
  document.getElementById("days").append(label);
}
async function save(next) {
  if (busy) return;
  busy = true;
  try {
    await browser.storage.local.set({ rules: next });
    rules = next;
    render();
    status.textContent = "設定を保存しました。";
    return true;
  } catch { status.textContent = "保存できませんでした。もう一度お試しください。"; }
  finally { busy = false; }
}
function render() {
  const list = document.getElementById("rules");
  list.replaceChildren();
  if (!rules.length) {
    list.textContent = "まだ登録されていません。上のフォームから追加してください。";
  }
  for (const rule of rules) {
    const card = document.createElement("article");
    const title = document.createElement("h3");
    title.textContent = rule.domains.join(" / ");
    const detail = document.createElement("p");
    detail.textContent = `${rule.days.map(day => names[day]).join("・")}　${rule.start} 〜 ${rule.end}${rule.start === rule.end ? "（終日）" : rule.start > rule.end ? "（翌日まで）" : ""}`;
    const label = document.createElement("label");
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.checked = rule.enabled;
    toggle.addEventListener("change", async () => {
      if (!await save(rules.map(item => item.id === rule.id ? { ...item, enabled: toggle.checked } : item))) toggle.checked = rule.enabled;
    });
    label.append(toggle, " 有効");
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "secondary";
    remove.textContent = "削除";
    remove.addEventListener("click", () => save(rules.filter(item => item.id !== rule.id)));
    card.append(title, detail, label, remove);
    list.append(card);
  }
}
document.getElementById("rule-form").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    const rule = BlockRules.validate({
      id: crypto.randomUUID(), enabled: true,
      domains: document.getElementById("domains").value.split(/\n/).map(line => line.trim()).filter(Boolean),
      days: [...document.querySelectorAll("#days input:checked")].map(input => Number(input.value)),
      start: document.getElementById("start").value,
      end: document.getElementById("end").value
    });
    if (await save([...rules, rule])) document.getElementById("domains").value = "";
  } catch (error) { status.textContent = error.message; }
});
browser.storage.local.get("rules").then(data => { rules = data.rules || []; render(); }).catch(() => {
  status.textContent = "設定を読み込めませんでした。ページを再読み込みしてください。";
});
