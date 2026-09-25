const $ = (id) => document.getElementById(id);

const leagueSel = $('league');
const dateInput = $('date');
const loadBtn = $('loadBtn');
const tbody = document.querySelector('#games tbody');

const views = {
  summary: $('summary'),
  loading: $('loading'),
  empty: $('empty'),
  error: $('error'),
  table: $('tableWrap'),
};

function show(...names) {
  for (const [k, el] of Object.entries(views)) el.hidden = !names.includes(k);
}

function pct(p) {
  return p == null ? '–' : (p * 100).toFixed(1) + '%';
}

function line(n) {
  if (n == null) return '–';
  return n > 0 ? '+' + n : String(n);
}

function timeET(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '–';
  return d.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });
}

function todayISO() {
  // en-CA formats as yyyy-mm-dd, which is what <input type=date> wants
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
}

function prettyDate(yyyymmdd) {
  const d = new Date(`${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}T12:00:00`);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function teamRow(t, side, isFav) {
  const rating = t.rating.winPct == null ? 'no rating' : `${t.record || ''} · ${pct(t.rating.winPct)}`;
  const logo = t.logo ? `<img src="${esc(t.logo)}" alt="">` : '';
  return `<div class="team ${isFav ? 'fav' : ''}">
      <span class="side">${side}</span>${logo}
      <span class="name">${esc(t.name)}</span>
      <span class="rec">${esc(rating)}</span>
    </div>`;
}

function renderRows(games) {
  tbody.innerHTML = '';
  for (const g of games) {
    const f = g.flag;
    const tr = document.createElement('tr');
    if (f.flagged) tr.classList.add('flagged');

    const favLabel = f.rankedFavorite === 'home' ? g.home.abbrev
      : f.rankedFavorite === 'away' ? g.away.abbrev : '–';

    tr.innerHTML = `
      <td class="num">${timeET(g.startTime)}<div class="muted">${esc(g.status)}</div></td>
      <td><div class="matchup">
        ${teamRow(g.away, 'away', f.rankedFavorite === 'away')}
        ${teamRow(g.home, 'home', f.rankedFavorite === 'home')}
      </div></td>
      <td>${esc(favLabel)}</td>
      <td class="num"><div class="line"><span>${esc(g.away.abbrev)} ${line(g.odds.away)}</span><span>${esc(g.home.abbrev)} ${line(g.odds.home)}</span></div></td>
      <td class="num"><div class="line"><span>${esc(g.away.abbrev)} ${pct(f.impliedAway)}</span><span>${esc(g.home.abbrev)} ${pct(f.impliedHome)}</span></div></td>
      <td>
        ${f.flagged ? '<span class="tag">Favorite Undervalued</span>' : '<span class="tag none">No flag</span>'}
        <span class="reason">${esc(f.reason || '')}</span>
      </td>`;
    tbody.appendChild(tr);
  }
}

function renderSummary(data) {
  $('statGames').textContent = data.games.length;
  $('statFlagged').textContent = data.flaggedCount;
  $('statDate').textContent = prettyDate(data.date);
  const warn = $('warn');
  if (!data.standingsAvailable) {
    warn.textContent = 'ESPN standings were unavailable, so rankings are based on the records shown on the scoreboard.';
    warn.hidden = false;
  } else {
    warn.hidden = true;
  }
}

function showError(message) {
  $('errorMsg').textContent = message;
  show('error');
}

async function load() {
  const league = leagueSel.value;
  const date = (dateInput.value || '').replace(/-/g, '');
  if (!/^\d{8}$/.test(date)) {
    showError('Pick a valid date first.');
    return;
  }

  show('loading');
  loadBtn.disabled = true;

  try {
    const res = await fetch(`/api/games?league=${encodeURIComponent(league)}&date=${date}`);

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Server returned an unexpected response (${res.status}).`);
    }
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status}).`);

    if (!data.games.length) {
      const label = leagueSel.options[leagueSel.selectedIndex].text;
      $('emptyMsg').textContent = `No ${label} games scheduled for ${prettyDate(data.date)}. Try another date or league.`;
      show('empty');
      return;
    }

    renderSummary(data);
    renderRows(data.games);
    show('summary', 'table');
  } catch (err) {
    // fetch() itself throws on network failure (server down, offline)
    const msg = err instanceof TypeError
      ? 'Could not reach the server. Is it running?'
      : err.message;
    showError(msg);
  } finally {
    loadBtn.disabled = false;
  }
}

async function init() {
  dateInput.value = todayISO();
  $('controls').addEventListener('submit', (e) => { e.preventDefault(); load(); });
  $('retryBtn').addEventListener('click', load);
  $('todayBtn').addEventListener('click', () => { dateInput.value = todayISO(); load(); });
  leagueSel.addEventListener('change', load);

  try {
    const res = await fetch('/api/leagues');
    const leagues = await res.json();
    for (const l of leagues) {
      const opt = document.createElement('option');
      opt.value = l.key;
      opt.textContent = l.label;
      leagueSel.appendChild(opt);
    }
  } catch {
    showError('Could not load the league list from the server.');
    return;
  }

  load();
}

init();
