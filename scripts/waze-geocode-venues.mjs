/**
 * waze-geocode-venues.mjs
 * מוצא קואורדינטה לכל ונו ב-docs/venue-coordinates-todo.json דרך Waze Search API.
 *
 * node scripts/waze-geocode-venues.mjs --dry
 * node scripts/waze-geocode-venues.mjs
 *
 * הסקריפט הזה נכתב מחדש אחרי שהגרסה הראשונה שלו הזיזה את פיצה האט "פארק אדיסון"
 * 111 ק"מ לקיבוץ אפיקים. השורש: חיפוש לפי שם הונו, עוגן ארצי אחד, ונפילה לחיפוש
 * ללא עיר שקיבלה כל תוצאה בגבולות ישראל.
 *
 * הכללים כאן זהים לאלה ש-scripts/waze-sync-coords.mjs כבר אוכף
 * (ראה docs/coordinates-backlog.md — "הכללים שהסקריפט אוכף — לא לרכך אותם"):
 *   1. חיפוש לפי כתובת, מעוגן בעיר עצמה — לא לפי שם בלבד ולא מעוגן במרכז הארץ.
 *   2. מקסימום CITY_RADIUS_KM ממרכז העיר. אין עוגן עירוני → אין כתיבה.
 *   3. אין נפילה לחיפוש ללא עיר. זו בדיוק הדלת שדרכה נכנס אפיקים.
 *   4. תווית שהיא רק שם יישוב/מדינה נרשמת _grade: 'locality' ולא 'address'.
 *   5. תוצאה שנופלת על מרכז העיר עצמו נפסלת — זו תשובת ברירת המחדל של וייז.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dir, '..');
const TODO = path.join(ROOT, 'docs', 'venue-coordinates-todo.json');

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const CITY_RADIUS_KM = 12;
const CITY_CENTRE_MIN_M = 150;   // קרוב מדי למרכז העיר = נפילה, לא מציאה
const DELAY = 750;

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

const words = s => new Set(
  String(s || '').replace(/[^֐-׿a-zA-Z0-9 ]/g, ' ')
    .split(/\s+/).filter(w => w.length > 2).map(w => w.toLowerCase())
);

/** שתי מילים משותפות — אחת היא צירוף מקרים. */
function labelNamesTheVenue(venue, label) {
  const wa = words(venue), wb = words(label);
  if (wa.size < 2) return false;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared >= 2;
}

/** תווית שאין בה רחוב, מספר או שם ונו — כלומר רק יישוב או "Israel". */
function isLocalityLabel(label) {
  if (!label) return true;
  if (/^israel$/i.test(label.trim())) return true;
  return !label.includes(',') && !/\d/.test(label);
}

async function wazeSearch(query, lat, lon) {
  const url = `https://www.waze.com/SearchServer/mozi?q=${encodeURIComponent(query)}`
    + `&lang=heb&origin=livemap&lon=${lon}&lat=${lat}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const body = await res.json();
  return Array.isArray(body) ? body : [];
}

/** מרכז העיר — גם העוגן לחיפוש וגם הסרגל שהתוצאה נמדדת מולו. */
const cityCache = new Map();
async function cityPoint(city) {
  if (!city) return null;
  if (cityCache.has(city)) return cityCache.get(city);
  let pt = null;
  try {
    // עוגן ראשוני גס רק כדי לאתר את העיר; משם והלאה העיר היא העוגן.
    const r = (await wazeSearch(city, 31.5, 34.9)).find(x => x.location);
    if (r) pt = { lat: r.location.lat, lon: r.location.lon };
  } catch { /* אין עוגן לעיר הזאת */ }
  cityCache.set(city, pt);
  await sleep(DELAY);
  return pt;
}

const todo = readJson(TODO);

let found = 0, notFound = 0, skipped = 0, noAnchor = 0, tooFar = 0, centreFallback = 0, locality = 0;

for (const entry of todo) {
  if (entry.lat !== null && entry.lng !== null) { skipped++; continue; }

  const centre = await cityPoint(entry.city);
  if (!centre) {
    // בלי מרכז עיר אין דרך לפסול תוצאה שגויה — עדיף לא לכתוב כלום.
    console.log(`⚠ אין עוגן לעיר: ${entry.city} — ${entry.venue} מדולג`);
    noAnchor++;
    continue;
  }

  // חיפוש לפי כתובת: הונו כפי שהוא מופיע בכתובת, ועוד שם העיר, מעוגן בעיר.
  const query = `${entry.venue}, ${entry.city}`;
  let results = [];
  try {
    results = await wazeSearch(query, centre.lat, centre.lon);
  } catch (err) {
    console.log(`⚠ שגיאה: ${entry.venue}, ${entry.city} — ${err.message}`);
    continue;
  }
  await sleep(DELAY);

  // אין fallback ללא עיר. בכוונה.
  const candidates = results.filter(r => r.location);
  let picked = null;
  let rejectReason = null;

  for (const r of candidates) {
    const d = distM(centre.lat, centre.lon, r.location.lat, r.location.lon);
    if (d > CITY_RADIUS_KM * 1000) { rejectReason = `${(d / 1000).toFixed(1)} ק"מ מהעיר`; continue; }
    if (d < CITY_CENTRE_MIN_M) { rejectReason = 'נפילה למרכז העיר'; continue; }
    picked = r;
    break;
  }

  if (!picked) {
    if (rejectReason === 'נפילה למרכז העיר') centreFallback++;
    else if (rejectReason) tooFar++;
    else notFound++;
    console.log(`✗ ${entry.venue}, ${entry.city}${rejectReason ? ` — נפסל: ${rejectReason}` : ' — לא נמצא'}`);
    continue;
  }

  const label = picked.name || picked.streetName || '';
  const localityGrade = isLocalityLabel(label) && !labelNamesTheVenue(entry.venue, label);
  if (localityGrade) locality++;

  entry.lat = parseFloat(picked.location.lat.toFixed(6));
  entry.lng = parseFloat(picked.location.lon.toFixed(6));
  entry._waze = label || '?';
  entry._provider = 'waze';
  entry._grade = localityGrade ? 'locality' : 'address';
  found++;
  console.log(`✓ ${entry.venue}, ${entry.city} → ${entry.lat}, ${entry.lng} | ${entry._waze}${localityGrade ? '  [locality]' : ''}`);

  if (!DRY && (found + notFound) % 10 === 0) {
    fs.writeFileSync(TODO, JSON.stringify(todo, null, 2), 'utf8');
  }
}

if (DRY) {
  console.log('\n*** DRY — לא נכתב כלום ***');
} else {
  fs.copyFileSync(TODO, `${TODO}.bak`);
  fs.writeFileSync(TODO, JSON.stringify(todo, null, 2), 'utf8');
}

console.log(`\nנמצאו: ${found} (מתוכן ${locality} ברמת יישוב בלבד)`);
console.log(`לא נמצאו: ${notFound} | נפסלו על מרחק: ${tooFar} | נפילה למרכז העיר: ${centreFallback}`);
console.log(`ללא עוגן עירוני: ${noAnchor} | כבר היו: ${skipped}`);
