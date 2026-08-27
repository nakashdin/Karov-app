/**
 * geocode-venues.mjs
 * גיאוקוד גיבוי דרך Nominatim לונויים ב-docs/venue-coordinates-todo.json.
 *
 * node scripts/geocode-venues.mjs --dry
 * node scripts/geocode-venues.mjs
 *
 * ⚠ וייז הוא מקור האמת לקואורדינטות בישראל (docs/coordinates-backlog.md).
 *   הסקריפט הזה הוא גיבוי בלבד, לונויים ש-scripts/waze-geocode-venues.mjs לא פתר.
 *   כל מה שהוא כותב מסומן _provider: 'nominatim' ומגיע לדאטה כ-locationSource
 *   'nominatim' — לא 'waze'. אסור להטביע ספק שלא באמת החזיר את הקואורדינטה.
 *
 * אותם מעצורים כמו בסקריפט הוייז: עוגן עירוני חובה, מקסימום 12 ק"מ ממנו,
 * ופסילת תוצאה שנופלת על מרכז העיר.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const TODO_PATH = path.join(ROOT, 'docs', 'venue-coordinates-todo.json');

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const CITY_RADIUS_KM = 12;
const CITY_CENTRE_MIN_M = 150;
const DELAY = 1100;   // מדיניות Nominatim: בקשה אחת לשנייה

const sleep = ms => new Promise(r => setTimeout(r, ms));

const distM = (a, b, c, d) => {
  const R = 6371000, r = Math.PI / 180;
  return R * Math.hypot((d - b) * r * Math.cos(((a + c) / 2) * r), (c - a) * r);
};

function readJson(filePath) {
  let raw = fs.readFileSync(filePath, 'utf8');
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  return JSON.parse(raw);
}

async function nominatim(query, limit = 5) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}`
    + `&format=json&countrycodes=il&limit=${limit}&accept-language=he`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'KarovApp/1.0 (nakashdin@gmail.com)' },
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

/** מרכז העיר, כדי שאפשר יהיה לפסול תוצאה שנחתה בעיר אחרת. */
const cityCache = new Map();
async function cityPoint(city) {
  if (cityCache.has(city)) return cityCache.get(city);
  let pt = null;
  try {
    const r = (await nominatim(`${city}, ישראל`, 1))[0];
    if (r) pt = { lat: parseFloat(r.lat), lon: parseFloat(r.lon) };
  } catch { /* אין עוגן */ }
  cityCache.set(city, pt);
  await sleep(DELAY);
  return pt;
}

const todo = readJson(TODO_PATH);

let found = 0, notFound = 0, skipped = 0, noAnchor = 0, tooFar = 0, centreFallback = 0;

for (const entry of todo) {
  if (entry.lat !== null && entry.lng !== null) { skipped++; continue; }

  const centre = await cityPoint(entry.city);
  if (!centre) {
    console.log(`⚠ אין עוגן לעיר: ${entry.city} — ${entry.venue} מדולג`);
    noAnchor++;
    continue;
  }

  let results = [];
  try {
    results = await nominatim(`${entry.venue}, ${entry.city}, ישראל`);
  } catch (err) {
    console.log(`⚠ שגיאה: ${entry.venue}, ${entry.city} — ${err.message}`);
    continue;
  }
  await sleep(DELAY);

  let picked = null;
  let rejectReason = null;
  for (const r of results) {
    const lat = parseFloat(r.lat), lon = parseFloat(r.lon);
    const d = distM(centre.lat, centre.lon, lat, lon);
    if (d > CITY_RADIUS_KM * 1000) { rejectReason = `${(d / 1000).toFixed(1)} ק"מ מהעיר`; continue; }
    if (d < CITY_CENTRE_MIN_M) { rejectReason = 'נפילה למרכז העיר'; continue; }
    picked = { lat, lon, label: r.display_name };
    break;
  }

  if (!picked) {
    if (rejectReason === 'נפילה למרכז העיר') centreFallback++;
    else if (rejectReason) tooFar++;
    else notFound++;
    console.log(`✗ ${entry.venue}, ${entry.city}${rejectReason ? ` — נפסל: ${rejectReason}` : ' — לא נמצא'}`);
    continue;
  }

  entry.lat = parseFloat(picked.lat.toFixed(6));
  entry.lng = parseFloat(picked.lon.toFixed(6));
  entry._nominatim = picked.label;
  entry._provider = 'nominatim';
  entry._grade = 'address';
  found++;
  console.log(`✓ ${entry.venue}, ${entry.city} → ${entry.lat}, ${entry.lng}`);
  console.log(`  ${picked.label.substring(0, 80)}`);
}

if (DRY) {
  console.log('\n*** DRY — לא נכתב כלום ***');
} else {
  fs.copyFileSync(TODO_PATH, `${TODO_PATH}.bak`);
  fs.writeFileSync(TODO_PATH, JSON.stringify(todo, null, 2), 'utf8');
}

console.log(`\nנמצאו: ${found} | לא נמצאו: ${notFound}`);
console.log(`נפסלו על מרחק: ${tooFar} | נפילה למרכז העיר: ${centreFallback} | ללא עוגן: ${noAnchor} | כבר היו: ${skipped}`);
