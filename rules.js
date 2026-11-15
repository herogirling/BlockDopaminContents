/* Shared by the background page, settings, and Node tests. */
(function (root) {
  "use strict";
  function hostname(input) {
    const value = input.trim();
    if (!value) throw new Error("サイトを入力してください。");
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password) {
      throw new Error("http / https のサイトを入力してください。");
    }
    return url.hostname.toLowerCase().replace(/\.$/, "");
  }
  function minutes(value) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error("時刻を正しく入力してください。");
    const [h, m] = value.split(":").map(Number);
    return h * 60 + m;
  }
  function validate(rule) {
    const domains = [...new Set(rule.domains.map(hostname))];
    if (!domains.length) throw new Error("サイトを1つ以上入力してください。");
    const days = [...new Set(rule.days)];
    if (!days.length || days.some(day => !Number.isInteger(day) || day < 0 || day > 6)) {
      throw new Error("曜日を1つ以上選んでください。");
    }
    minutes(rule.start);
    minutes(rule.end);
    return { id: rule.id, enabled: rule.enabled !== false, domains, days, start: rule.start, end: rule.end };
  }
  function active(rule, now) {
    if (!rule.enabled) return false;
    const start = minutes(rule.start), end = minutes(rule.end);
    const time = now.getHours() * 60 + now.getMinutes();
    const day = now.getDay();
    if (start === end) return rule.days.includes(day);
    if (start < end) return rule.days.includes(day) && time >= start && time < end;
    return (rule.days.includes(day) && time >= start) ||
      (rule.days.includes((day + 6) % 7) && time < end);
  }
  function match(url, rules, now = new Date()) {
    let host;
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) return null;
      host = parsed.hostname.toLowerCase().replace(/\.$/, "");
    } catch { return null; }
    return rules.find(rule => active(rule, now) && rule.domains.some(domain => host === domain || host.endsWith(`.${domain}`))) || null;
  }
  const api = { hostname, minutes, validate, active, match };
  root.BlockRules = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
