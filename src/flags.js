const { impliedProbabilities } = require('./odds');

/**
 * Decide which side is "higher ranked".
 * Win% first, point differential as the tiebreaker (early season everyone is 1-1).
 * Returns 'home' | 'away' | null (null = can't tell, e.g. missing data or dead tie).
 */
function higherRanked(home, away) {
  const h = home.rating || {};
  const a = away.rating || {};
  if (h.winPct == null || a.winPct == null) return null;

  if (h.winPct !== a.winPct) return h.winPct > a.winPct ? 'home' : 'away';

  if (h.pointDiff != null && a.pointDiff != null && h.pointDiff !== a.pointDiff) {
    return h.pointDiff > a.pointDiff ? 'home' : 'away';
  }
  return null;
}

/**
 * "Favorite Undervalued":
 * the higher-ranked team's odds imply a LOWER win probability than the
 * lower-ranked opponent's.
 */
function favoriteUndervalued(game, odds) {
  const favSide = higherRanked(game.home, game.away);
  const probs = impliedProbabilities(odds);

  const result = {
    rankedFavorite: favSide,
    impliedHome: probs.home,
    impliedAway: probs.away,
    flagged: false,
    reason: null,
  };

  if (!favSide) {
    result.reason = 'no clear ranking favourite';
    return result;
  }
  if (probs.home == null || probs.away == null) {
    result.reason = 'odds unavailable';
    return result;
  }

  const favProb = favSide === 'home' ? probs.home : probs.away;
  const dogProb = favSide === 'home' ? probs.away : probs.home;

  if (favProb < dogProb) {
    result.flagged = true;
    result.reason = `market has ranked favourite at ${(favProb * 100).toFixed(1)}% vs ${(dogProb * 100).toFixed(1)}%`;
  } else {
    result.reason = 'market agrees with ranking';
  }
  return result;
}

module.exports = { higherRanked, favoriteUndervalued };
