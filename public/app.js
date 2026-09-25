const leagueSel = document.getElementById('league');
const dateInput = document.getElementById('date');
const statusEl = document.getElementById('status');
const summaryEl = document.getElementById('summary');
const tbody = document.querySelector('#games tbody');

function pct(p) {
  return p == null ? '-' : (p * 100).toFixed(1) + '%';
}

function line(n) {
  if (n == null) return '-';
  return n > 0 ? '+' + n : String(n);
}

function timeET(iso) {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function todayISO() {
  // date input wants yyyy-mm-dd, in ET to line up with ESPN's day
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
  return parts; // en-CA already gives yyyy-mm-dd
}

function teamCell(t, isFav) {
  const rating = t.rating.winPct == null ? 'no rating' : `${t.record || ''} · ${pct(t.rating.winPct)}`;
  return `<div class="${isFav ? 'fav' : ''}">${t.name}</div><div class="rec">${rating}</div>`;
}

function render(data) {
  tbody.innerHTML = '';
  if (!data.games.length) {
    tbody.innerHTML = '<tr class="empty"><td colspan="7">No games found for that day.</td></tr>';
    summaryEl.textContent = '';
    return;
  }

  summaryEl.textContent =
    `${data.games.length} games · ${data.flaggedCount} flagged` +
    (data.standingsAvailable ? '' : ' · standings unavailable, using scoreboard records');

  for (const g of data.games) {
    const f = g.flag;
    const tr = document.createElement('tr');
    if (f.flagged) tr.classList.add('flagged');

    const favLabel = f.rankedFavorite === 'home' ? g.home.abbrev
      : f.rankedFavorite === 'away' ? g.away.abbrev : '-';

    tr.innerHTML = `
      <td class="num">${timeET(g.startTime)}<div class="rec">${g.status}</div></td>
      <td>${teamCell(g.away, f.rankedFavorite === 'away')}</td>
      <td>${teamCell(g.home, f.rankedFavorite === 'home')}</td>
      <td>${favLabel}</td>
      <td class="num">${g.away.abbrev} ${line(g.odds.away)}<br>${g.home.abbrev} ${line(g.odds.home)}</td>
      <td class="num">${g.away.abbrev} ${pct(f.impliedAway)}<br>${g.home.abbrev} ${pct(f.impliedHome)}</td>
      <td>
        ${f.flagged ? '<span class="tag">Favorite Undervalued</span>' : '<span class="tag none">-</span>'}
        <span class="reason">${f.reason || ''}</span>
      </td>`;
    tbody.appendChild(tr);
  }
}

async function load() {
  const league = leagueSel.value;
  const date = dateInput.value.replace(/-/g, '');
  statusEl.className = 'status';
  statusEl.textContent = 'Loading…';

  try {
    const res = await fetch(`/api/games?league=${league}&date=${date}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    render(data);
    statusEl.textContent = `Loaded ${data.date}`;
  } catch (err) {
    statusEl.className = 'status error';
    statusEl.textContent = err.message;
    tbody.innerHTML = '';
    summaryEl.textContent = '';
  }
}

async function init() {
  const leagues = await fetch('/api/leagues').then((r) => r.json());
  for (const l of leagues) {
    const opt = document.createElement('option');
    opt.value = l.key;
    opt.textContent = l.label;
    leagueSel.appendChild(opt);
  }
  dateInput.value = todayISO();
  document.getElementById('controls').addEventListener('submit', (e) => {
    e.preventDefault();
    load();
  });
  load();
}

init();
