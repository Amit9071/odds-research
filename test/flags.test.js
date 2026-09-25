const test = require('node:test');
const assert = require('node:assert');
const { higherRanked, favoriteUndervalued } = require('../src/flags');

const team = (winPct, pointDiff = null) => ({ rating: { winPct, pointDiff } });

test('higherRanked uses win% then point diff', () => {
  assert.strictEqual(higherRanked(team(0.75), team(0.5)), 'home');
  assert.strictEqual(higherRanked(team(0.5), team(0.75)), 'away');
  assert.strictEqual(higherRanked(team(0.5, 10), team(0.5, -3)), 'home');
  assert.strictEqual(higherRanked(team(0.5, 2), team(0.5, 2)), null);
  assert.strictEqual(higherRanked(team(null), team(0.5)), null);
});

test('flags when ranked favourite is priced as underdog', () => {
  const game = { home: team(0.8), away: team(0.3) };
  // home is better but market has home as +130 dog
  const r = favoriteUndervalued(game, { home: +130, away: -150 });
  assert.strictEqual(r.rankedFavorite, 'home');
  assert.strictEqual(r.flagged, true);
});

test('does not flag when market agrees', () => {
  const game = { home: team(0.8), away: team(0.3) };
  const r = favoriteUndervalued(game, { home: -200, away: +170 });
  assert.strictEqual(r.flagged, false);
});

test('no flag when ranking cannot pick a favourite', () => {
  const game = { home: team(0.5), away: team(0.5) };
  const r = favoriteUndervalued(game, { home: -110, away: -110 });
  assert.strictEqual(r.flagged, false);
  assert.match(r.reason, /no clear/);
});

test('no flag when odds missing', () => {
  const game = { home: team(0.8), away: team(0.3) };
  const r = favoriteUndervalued(game, { home: null, away: null });
  assert.strictEqual(r.flagged, false);
  assert.match(r.reason, /odds unavailable/);
});
