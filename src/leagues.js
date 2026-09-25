// ESPN path segments for the leagues we support.
// Adding a league is just a new entry here as long as ESPN exposes it the same way.
const LEAGUES = {
  nfl: { sport: 'football', league: 'nfl', label: 'NFL' },
  nba: { sport: 'basketball', league: 'nba', label: 'NBA' },
  mlb: { sport: 'baseball', league: 'mlb', label: 'MLB' },
  nhl: { sport: 'hockey', league: 'nhl', label: 'NHL' },
};

const DEFAULT_LEAGUE = 'nfl';

module.exports = { LEAGUES, DEFAULT_LEAGUE };
