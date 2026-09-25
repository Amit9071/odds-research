# Odds Research – "Favorite Undervalued" prototype

Small take-home prototype. Pulls a day's games for a league from ESPN, attaches a
(mock) moneyline to each game, and flags the games where the market is pricing the
higher-ranked team as the underdog.

## Running it

Needs Node 18 or newer (uses the built-in `fetch`).

```
npm install
npm start
```

Then open http://localhost:3000. Pick a league and a date and hit Load.
Defaults to NFL and today's date (US Eastern, which is the "day" ESPN uses).

Tests:

```
npm test
```

## What it does

1. **Games + ranking** – `GET /api/games?league=nfl&date=YYYYMMDD` calls two public
   ESPN endpoints: the scoreboard for that day and the league standings. Each team
   gets a rating made of win% (from standings) with point differential as the
   tiebreaker. If standings are down, it falls back to the W-L record printed on
   the scoreboard and says so in the UI.
2. **Odds** – there is no sportsbook feed in this prototype. `src/odds.js` builds a
   mock moneyline per game, seeded from the game id so it's the same on every
   refresh, skewed toward the better team plus some noise so a handful of games
   come out "mispriced". The UI has a banner saying the odds are mocked.
3. **Flag** – `src/flags.js`. Convert both moneylines to implied win probability,
   strip the vig so they sum to 1, and if the higher-ranked team's implied
   probability is lower than the opponent's, flag it as **Favorite Undervalued**.
4. **UI** – one static page (`public/`) that renders the table. Flagged rows are
   highlighted red with the reason shown.

## Layout

```
server.js         express app, the one API route, wires everything together
src/leagues.js    which ESPN leagues are supported
src/espn.js       fetching + parsing scoreboard and standings
src/odds.js       mock line generator, american odds -> implied probability
src/flags.js      ranking comparison and the Favorite Undervalued rule
public/           plain html/css/js front end
test/             unit tests for the odds maths and the flag logic
```

## Assumptions I made

- "Ranking" isn't defined in the brief, so I used win% + point differential from
  the standings. It's simple, explainable, and available for every league on ESPN.
  Early in a season this is noisy (lots of 1-1 teams), which is exactly why the
  point-diff tiebreak is there. If two teams are still dead even, the game gets no
  favourite and can't be flagged – it says "no clear ranking favourite".
- The flag compares *de-vigged* implied probabilities. With the vig left in, both
  sides of a pick'em would be over 50% and the comparison gets muddy.
- Only moneyline is considered. Spreads/totals are out of scope.
- ESPN's day is US Eastern, so dates are handled in that timezone end to end.

## Things I'd do differently with more time

- Plug in a real odds provider (The Odds API has a free tier) behind the same
  `{home, away}` shape so the flag logic doesn't change.
- Use a proper power rating (Elo or similar) instead of raw win%, and probably
  weight the flag by how big the disagreement is rather than a yes/no.
- Cache ESPN responses for a minute or two. Right now every page load hits ESPN
  twice.
- Team / player / coach drill-down pages, which is where the real product goes.
