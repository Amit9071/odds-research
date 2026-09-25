const test = require('node:test');
const assert = require('node:assert');
const { americanToImplied, impliedProbabilities, mockLine } = require('../src/odds');

test('american odds to implied probability', () => {
  assert.strictEqual(americanToImplied(-150), 0.6);
  assert.strictEqual(americanToImplied(+150), 0.4);
  assert.strictEqual(americanToImplied(-100), 0.5);
  assert.strictEqual(americanToImplied(null), null);
  assert.strictEqual(americanToImplied(0), null);
});

test('implied probabilities are normalised (no vig)', () => {
  const p = impliedProbabilities({ home: -120, away: +100 });
  assert.ok(Math.abs(p.home + p.away - 1) < 1e-9);
  assert.ok(p.home > p.away);
});

test('mock line is stable for the same game id', () => {
  const g = { id: '401872953' };
  assert.deepStrictEqual(mockLine(g, 0.6), mockLine(g, 0.6));
  assert.notDeepStrictEqual(mockLine(g, 0.6), mockLine({ id: 'other' }, 0.6));
});
