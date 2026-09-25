const path = require('path');
const express = require('express');
const { fetchGames } = require('./src/espn');
const { mockLine } = require('./src/odds');
const { favoriteUndervalued } = require('./src/flags');
const { LEAGUES, DEFAULT_LEAGUE } = require('./src/leagues');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// today as yyyymmdd in US Eastern, since that's the timezone ESPN's "day" follows
function todayKey() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}${get('month')}${get('day')}`;
}

// rough "true" home win prob from ratings, used only to seed the mock lines
function guessHomeEdge(game) {
  const h = game.home.rating.winPct;
  const a = game.away.rating.winPct;
  if (h == null || a == null) return null;
  const homeAdvantage = 0.04;
  return Math.min(0.9, Math.max(0.1, 0.5 + (h - a) * 0.35 + homeAdvantage));
}

app.get('/api/leagues', (req, res) => {
  res.json(Object.entries(LEAGUES).map(([key, l]) => ({ key, label: l.label })));
});

app.get('/api/games', async (req, res) => {
  const league = String(req.query.league || DEFAULT_LEAGUE).toLowerCase();
  const date = String(req.query.date || todayKey());

  if (!LEAGUES[league]) {
    return res.status(400).json({ error: `unknown league '${league}'` });
  }
  if (!/^\d{8}$/.test(date)) {
    return res.status(400).json({ error: 'date must be YYYYMMDD' });
  }

  try {
    const { games, standingsAvailable } = await fetchGames(league, date);

    const rows = games.map((game) => {
      const odds = mockLine(game, guessHomeEdge(game));
      const flag = favoriteUndervalued(game, odds);
      return { ...game, odds, flag };
    });

    res.json({
      league,
      date,
      oddsSource: 'mock',
      standingsAvailable,
      flaggedCount: rows.filter((r) => r.flag.flagged).length,
      games: rows,
    });
  } catch (err) {
    console.error('failed to build games list:', err);
    let status = 500;
    let message = 'Something went wrong on the server.';
    if (err.name === 'AbortError') {
      status = 504;
      message = 'ESPN took too long to respond. Please try again.';
    } else if (/ESPN responded/.test(err.message)) {
      status = 502;
      message = 'ESPN returned an error for that request. Please try again in a moment.';
    } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || /fetch failed/i.test(err.message)) {
      status = 502;
      message = 'Could not reach ESPN. Check your internet connection and try again.';
    }
    res.status(status).json({ error: message, detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`odds-research listening on http://localhost:${PORT}`);
});
