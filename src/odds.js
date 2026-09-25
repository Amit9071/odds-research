// MOCK ODDS
// We don't have a real sportsbook feed for this prototype. Lines are generated
// deterministically from the game id so a refresh gives the same numbers, and
// they're skewed toward the better team so it looks plausible - with enough
// noise that some games end up priced "wrong" and trigger the flag.

function hash(str) {
  // small FNV-1a, plenty for seeding
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seeded(seed) {
  // mulberry32
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// probability -> american moneyline (rounded to a "book-like" 5)
function probToAmerican(p) {
  if (p >= 0.5) {
    const v = -(p / (1 - p)) * 100;
    return Math.round(v / 5) * 5;
  }
  const v = ((1 - p) / p) * 100;
  return Math.round(v / 5) * 5;
}

function americanToImplied(line) {
  if (typeof line !== 'number' || Number.isNaN(line) || line === 0) return null;
  if (line < 0) return -line / (-line + 100);
  return 100 / (line + 100);
}

// Build a mock moneyline for one game.
// homeEdge is our guess of the home team's "true" win prob from ratings (0..1),
// or null when we don't know - in which case it's a coin flip plus noise.
function mockLine(game, homeEdge) {
  const rnd = seeded(hash(String(game.id)));
  const base = homeEdge == null ? 0.5 : homeEdge;
  // +-14% noise; big enough that upsets in pricing happen a fair bit
  const noise = (rnd() - 0.5) * 0.28;
  let pHome = Math.min(0.85, Math.max(0.15, base + noise));

  // add a bit of vig (~4.5% overround) like a real book would
  const vig = 0.045;
  const homeLine = probToAmerican(pHome + vig / 2);
  const awayLine = probToAmerican(1 - pHome + vig / 2);

  return {
    source: 'mock',
    book: 'MockBook',
    home: homeLine,
    away: awayLine,
  };
}

// Turn a moneyline pair into implied win probabilities, with the vig
// stripped out so the two numbers add to 1.
function impliedProbabilities(odds) {
  const h = americanToImplied(odds.home);
  const a = americanToImplied(odds.away);
  if (h == null || a == null) return { home: null, away: null };
  const total = h + a;
  return { home: h / total, away: a / total };
}

module.exports = { mockLine, impliedProbabilities, americanToImplied, probToAmerican };
