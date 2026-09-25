const { LEAGUES } = require('./leagues');

const BASE = 'https://site.api.espn.com/apis';
const TIMEOUT_MS = 8000;

async function getJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) {
      throw new Error(`ESPN responded ${res.status} for ${url}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// yyyymmdd is what the scoreboard endpoint wants
function scoreboardUrl(leagueKey, yyyymmdd) {
  const l = LEAGUES[leagueKey];
  return `${BASE}/site/v2/sports/${l.sport}/${l.league}/scoreboard?dates=${yyyymmdd}`;
}

function standingsUrl(leagueKey) {
  const l = LEAGUES[leagueKey];
  return `${BASE}/v2/sports/${l.sport}/${l.league}/standings`;
}

// Standings JSON is nested (league -> conference -> division -> entries) and the
// depth differs per league, so just walk it and collect every entries[] we find.
function collectEntries(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node.entries)) out.push(...node.entries);
  for (const key of ['children', 'standings']) {
    const child = node[key];
    if (Array.isArray(child)) child.forEach((c) => collectEntries(c, out));
    else if (child) collectEntries(child, out);
  }
  return out;
}

function statValue(stats, name) {
  const s = stats.find((x) => x.name === name);
  return s && typeof s.value === 'number' ? s.value : null;
}

// Returns a map of teamId -> { winPct, pointDiff, wins, losses }
// Empty map on failure - caller decides what to do with missing ratings.
async function fetchStandings(leagueKey) {
  const data = await getJson(standingsUrl(leagueKey));
  const map = {};
  for (const entry of collectEntries(data)) {
    if (!entry.team || !entry.team.id) continue;
    const stats = entry.stats || [];
    map[entry.team.id] = {
      winPct: statValue(stats, 'winPercent'),
      pointDiff: statValue(stats, 'pointDifferential') ?? statValue(stats, 'differential'),
      wins: statValue(stats, 'wins'),
      losses: statValue(stats, 'losses'),
    };
  }
  return map;
}

function parseRecord(summary) {
  // "2-1" or "2-1-1" (ties). Anything else -> nulls.
  if (typeof summary !== 'string') return { wins: null, losses: null };
  const parts = summary.split('-').map(Number);
  if (parts.length < 2 || parts.some(Number.isNaN)) return { wins: null, losses: null };
  return { wins: parts[0], losses: parts[1] };
}

function pickTeam(competitor, standings) {
  const t = competitor.team || {};
  const overall = (competitor.records || []).find((r) => r.type === 'total') || (competitor.records || [])[0];
  const rec = parseRecord(overall && overall.summary);
  const st = standings[t.id];

  // Prefer standings numbers; fall back to the record printed on the scoreboard.
  let winPct = st && st.winPct != null ? st.winPct : null;
  if (winPct == null && rec.wins != null && rec.wins + rec.losses > 0) {
    winPct = rec.wins / (rec.wins + rec.losses);
  }

  return {
    id: t.id,
    name: t.displayName || t.name || 'Unknown',
    abbrev: t.abbreviation || '',
    logo: t.logo || null,
    homeAway: competitor.homeAway,
    record: overall ? overall.summary : null,
    rating: {
      winPct,
      pointDiff: st ? st.pointDiff : null,
      source: st ? 'standings' : (winPct != null ? 'scoreboard-record' : 'none'),
    },
  };
}

async function fetchGames(leagueKey, yyyymmdd) {
  const [scoreboard, standingsResult] = await Promise.all([
    getJson(scoreboardUrl(leagueKey, yyyymmdd)),
    // standings failing shouldn't kill the whole page, we can still show games
    fetchStandings(leagueKey).catch((err) => {
      console.warn('standings fetch failed, falling back to scoreboard records:', err.message);
      return {};
    }),
  ]);

  const games = [];
  for (const ev of scoreboard.events || []) {
    const comp = (ev.competitions || [])[0];
    if (!comp || !Array.isArray(comp.competitors) || comp.competitors.length !== 2) continue;

    const home = comp.competitors.find((c) => c.homeAway === 'home') || comp.competitors[0];
    const away = comp.competitors.find((c) => c.homeAway === 'away') || comp.competitors[1];

    games.push({
      id: ev.id,
      startTime: ev.date,
      status: ev.status && ev.status.type ? ev.status.type.description : 'Unknown',
      name: ev.shortName || ev.name,
      home: pickTeam(home, standingsResult),
      away: pickTeam(away, standingsResult),
    });
  }

  return {
    games,
    standingsAvailable: Object.keys(standingsResult).length > 0,
  };
}

module.exports = { fetchGames, fetchStandings, collectEntries, parseRecord };
