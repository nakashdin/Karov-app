import { readFileSync, writeFileSync } from 'fs';

const DATA_PATH = 'C:\\Users\\User\\Desktop\\claude plane\\kosher-app\\src\\data\\generated\\places.osm.json';
const BRANCHES_PATH = 'C:\\Users\\User\\Desktop\\claude plane\\kosher-app\\importers\\mikvahs\\output\\pizza-shemesh-branches.json';

const raw = readFileSync(DATA_PATH, 'utf-8').replace(/^\uFEFF/, '');
let places = JSON.parse(raw);
const scraped = JSON.parse(readFileSync(BRANCHES_PATH, 'utf-8').replace(/^\uFEFF/, ''));

function np(p) {
  if (!p) return '';
  return String(p).replace(/[-\s\(\)\.×–]/g, '').replace(/^\+972/, '0').replace(/^972/, '0');
}

function nc(c) {
  if (!c) return '';
  return String(c).replace(/['"״]/g, '').replace(/\s+/g, ' ').trim();
}

function pad(t) {
  const [h, m] = t.split(':');
  return `${String(parseInt(h)).padStart(2,'0')}:${m}`;
}

function getTimes(line) {
  const r = /(\d{1,2}:\d{2})/g;
  const t = [];
  let m;
  while ((m = r.exec(line)) !== null) t.push(pad(m[1]));
  if (!t.length) {
    const plain = line.match(/(\d{1,2})\s+(?:עד|ל)\s+(\d{1,2})(?!\d)/);
    if (plain) {
      t.push(`${plain[1].padStart(2,'0')}:00`);
      t.push(`${plain[2].padStart(2,'0')}:00`);
    }
  }
  return t;
}

function parseHebrewHours(h) {
  if (!h || !h.trim()) return null;

  const lines = h.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('('));
  if (!lines.length) return null;

  // Simple one-liner "HH:MM-HH:MM"
  if (lines.length === 1) {
    const m = lines[0].match(/^(\d{1,2}:\d{2})[–\-](\d{1,2}:\d{2})$/);
    if (m) return `Su-Th ${pad(m[1])}-${pad(m[2])}`;
  }

  let suTh = null;
  let fr = null;
  let sa = null;
  let frClosed = false;
  const dayTimes = []; // individual א-ה lines

  for (const line of lines) {
    const t = getTimes(line);
    const closed = /סגור/.test(line);

    // Friday
    if (/^ו['\u05F3\u2019׳]?\s|שישי|^ו\s*[–\-]/.test(line)) {
      if (closed) { frClosed = true; }
      else if (t.length >= 2) fr = [t[0], t[1]];
      // "שעה לפני כניסת שבת" with no numeric time → skip
      continue;
    }

    // Shabbat / Motzei Shabbat
    if (/^ש['\u05F3\u2019׳]?\s|מוצ|שבת.*(?:ארב|חצי|שעה)/.test(line)) {
      if (!closed) {
        if (t.length >= 2) sa = [t[0], t[1]];        // explicit "19:00-01:00"
        else if (t.length === 1) sa = ['22:00', t[0]]; // "מוצש...עד 23:00"
        // no times at all → skip (just says "half hour after shabbat" with no close time)
      }
      continue;
    }

    // Su-Th range: א-ה / א'-ה' / ראשון עד חמישי
    if (/^א['\u05F3\u2019׳]?[\-–]ה|ראשון.*חמישי|^א-ה/.test(line)) {
      if (!closed && t.length >= 2) suTh = [t[0], t[1]];
      continue;
    }

    // Individual days א ב ג ד ה
    if (/^[אבגד]['\u05F3\u2019׳]?\s|^[אבגד]\s/.test(line) && !closed) {
      if (t.length >= 2) dayTimes.push([t[0], t[1]]);
    }
  }

  // Use individual day times if no range found
  if (!suTh && dayTimes.length > 0) {
    const open = dayTimes[0][0];
    const closes = dayTimes.map(d => d[1]);
    // Use most common close time (handles Thu being later)
    const closeMode = closes.reduce((a, b) =>
      closes.filter(v => v === b).length >= closes.filter(v => v === a).length ? b : a
    );
    suTh = [open, closeMode];
  }

  if (!suTh) return null;

  const parts = [`Su-Th ${suTh[0]}-${suTh[1]}`];
  if (!frClosed && fr) parts.push(`Fr ${fr[0]}-${fr[1]}`);
  if (sa) parts.push(`Sa ${sa[0]}-${sa[1]}`);
  return parts.join('; ');
}

// Build indexes from scraped data
const byPhone = new Map();
const byCity = new Map();

for (const b of scraped) {
  const phone = np(b.phone);
  if (phone) {
    if (!byPhone.has(phone)) byPhone.set(phone, []);
    byPhone.get(phone).push(b);
  }
  const city = nc(b.city);
  if (!byCity.has(city)) byCity.set(city, []);
  byCity.get(city).push(b);
}

function addrScore(a1, a2) {
  if (!a1 || !a2) return 0;
  const words = s => new Set(s.replace(/['"״]/g, '').replace(/רחוב|שכונת|מרכז|סניף/g, ' ').split(/\s+/).filter(w => w.length > 1));
  const w1 = words(a1), w2 = words(a2);
  let n = 0;
  for (const w of w1) if (w2.has(w)) n++;
  return n;
}

const used = new Set();

function findMatch(dbRec) {
  const phone = np(dbRec.phone);
  const city = nc(dbRec.cityId || '');
  const addr = dbRec.address || '';

  // 1. Phone match
  if (phone) {
    const candidates = (byPhone.get(phone) || []).filter(b => !used.has(b.url));
    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1) {
      const byCityFilter = candidates.filter(b => nc(b.city) === city);
      const pool = byCityFilter.length ? byCityFilter : candidates;
      let best = null, bestScore = -1;
      for (const c of pool) {
        const s = addrScore(addr, c.address);
        if (s > bestScore) { bestScore = s; best = c; }
      }
      if (best) return best;
    }
  }

  // 2. City match (with fallback: scraped address contains db city)
  const cityNorm = city;
  const candidates = scraped.filter(b => {
    if (used.has(b.url)) return false;
    const sc = nc(b.city);
    const exactCity = sc === cityNorm || sc.includes(cityNorm) || cityNorm.includes(sc);
    const addrContains = cityNorm.length > 3 && (b.address || '').includes(cityNorm);
    return exactCity || addrContains;
  });

  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    let best = null, bestScore = -1;
    for (const c of candidates) {
      const cityBonus = nc(c.city) === cityNorm ? 10 : 0;
      const s = addrScore(addr, c.address) + cityBonus;
      if (s > bestScore) { bestScore = s; best = c; }
    }
    if (best && bestScore > 0) return best;
  }

  return null;
}

let updated = 0;
const noMatch = [];

places = places.map(p => {
  if (!p.name || !p.name.includes('פיצה שמש')) return p;

  const match = findMatch(p);
  if (!match) {
    noMatch.push({ id: p.id, city: p.cityId, addr: p.address, phone: p.phone });
    return p;
  }

  used.add(match.url);
  const hours = parseHebrewHours(match.hours);
  const updates = { website: match.url, lastVerifiedAt: '2026-07-29' };
  if (hours) updates.openingHours = hours;
  if (!p.phone && match.phone) updates.phone = np(match.phone);

  updated++;
  return { ...p, ...updates };
});

writeFileSync(DATA_PATH, JSON.stringify(places, null, 2), 'utf-8');

console.log(`✅ עודכנו ${updated} סניפי פיצה שמש עם URL + שעות`);

if (noMatch.length) {
  console.log(`\n❌ לא נמצאה התאמה ל-${noMatch.length} רשומות:`);
  noMatch.forEach(r => console.log(`  ${r.id} | ${r.city} | ${r.addr} | ${r.phone}`));
}

const unused = scraped.filter(b => !used.has(b.url));
if (unused.length) {
  console.log(`\n⚠️  סניפים שנסרקו ולא שויכו ל-DB (${unused.length}):`);
  unused.forEach(b => console.log(`  ${b.city} | ${b.address} | ${b.url}`));
}

console.log(`\nסה"כ: ${places.length} רשומות`);
