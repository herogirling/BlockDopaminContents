const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const BlockRules = require('../rules');

test('background loads saved rules, redirects requests and existing tabs, and responds to setting changes', async () => {
  const now = new Date();
  const rule = { id: 'one', domains: ['example.com'], days: [now.getDay()], start: '00:00', end: '00:00', enabled: true };
  const listeners = {};
  const updates = [];
  const browser = {
    storage: {
      local: { get: async () => ({ rules: [rule] }) },
      onChanged: { addListener: fn => { listeners.changed = fn; } }
    },
    webRequest: { onBeforeRequest: { addListener: (fn, filter, flags) => {
      listeners.request = fn;
      assert.deepEqual(Array.from(filter.types), ['main_frame']);
      assert.deepEqual(Array.from(flags), ['blocking']);
    } } },
    tabs: {
      query: async () => [{ id: 1, url: 'https://example.com/private?secret=123' }, { id: 2, url: 'https://other.test' }],
      update: async (id, update) => updates.push({ id, ...update })
    },
    runtime: { getURL: path => `moz-extension://test/${path}`, openOptionsPage: async () => {} },
    browserAction: { onClicked: { addListener: fn => { listeners.click = fn; } } },
    alarms: { create: () => {}, onAlarm: { addListener: fn => { listeners.alarm = fn; } } }
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../background.js'), 'utf8'), {
    browser, BlockRules, URL, Date, console, setTimeout: () => {}
  });
  // A request arriving before storage resolves must still be blocked.
  const result = await listeners.request({ url: 'https://example.com/private?secret=123' });
  assert.equal(result.redirectUrl, 'moz-extension://test/blocked.html?site=example.com');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(updates.length, 1);
  assert.equal(updates[0].id, 1);
  assert.ok(!updates[0].url.includes('secret'));
  assert.equal((await listeners.request({ url: 'https://other.test' })).redirectUrl, undefined);
  listeners.changed({ rules: { newValue: [] } }, 'local');
  assert.equal((await listeners.request({ url: 'https://example.com' })).redirectUrl, undefined);
});
