const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validate, match, active } = require('../rules');
const rule = validate({ id: 'test', enabled: true, domains: ['https://Example.com/watch'], days: [1], start: '09:00', end: '18:00' });
const monday = (h, m = 0) => new Date(2026, 10, 16, h, m);
test('normalizes domains and matches subdomains without matching lookalikes', () => {
  assert.deepEqual(rule.domains, ['example.com']);
  assert.ok(match('https://video.example.com/a', [rule], monday(10)));
  assert.equal(match('https://notexample.com', [rule], monday(10)), null);
  assert.equal(match('https://example.com.evil.test', [rule], monday(10)), null);
  assert.equal(match('about:blank', [rule], monday(10)), null);
});
test('start inclusive, end exclusive and selected weekdays only', () => {
  assert.equal(active(rule, monday(8, 59)), false);
  assert.equal(active(rule, monday(9)), true);
  assert.equal(active(rule, monday(17, 59)), true);
  assert.equal(active(rule, monday(18)), false);
  assert.equal(active(rule, new Date(2026, 10, 17, 10)), false);
});
test('overnight schedules carry into the following day', () => {
  const night = { ...rule, start: '22:00', end: '06:00' };
  assert.equal(active(night, monday(5)), false);
  assert.equal(active(night, monday(22)), true);
  assert.equal(active(night, new Date(2026, 10, 17, 5, 59)), true);
  assert.equal(active(night, new Date(2026, 10, 17, 6)), false);
  assert.equal(active({ ...night, days: [6] }, new Date(2026, 10, 15, 5)), true);
});
test('all-day, disabled, and overlapping rules', () => {
  assert.equal(active({ ...rule, start: '00:00', end: '00:00' }, monday(23, 59)), true);
  assert.equal(active({ ...rule, enabled: false }, monday(10)), false);
  assert.ok(match('https://example.com', [{ ...rule, enabled: false }, rule], monday(10)));
});
test('rejects empty domains, invalid times, unsupported protocols and absent days', () => {
  for (const patch of [{ domains: [] }, { domains: ['file:///tmp/a'] }, { start: '24:00' }, { days: [] }]) {
    assert.throws(() => validate({ ...rule, ...patch }));
  }
});
