/**
 * check-city-outliers.mjs
 *
 * שומר שפיות אופליין לקואורדינטות: לכל מקום, המרחק מחציון שאר המקומות
 * באותה עיר. חשבון בלבד — בלי רשת, בלי API, על דאטה שכבר בריפו.
 *
 *   node scripts/check-city-outliers.mjs
 *   node scripts/check-city-outliers.mjs --max-km 10 --json
 *   node scripts/check-city-outliers.mjs --strict     # יוצא 1 אם נמצאו חריגים
 *
 * למה זה קיים: סבב גיאוקוד הזיז את פיצה האט "פארק אדיסון" 111 ק"מ לקיבוץ
 * אפיקים ואיש לא ראה. בדיקה כזאת תופסת כל תאונת גיאוקוד המונית — חוץ
 * משתי נקודות עיוורות שהפלט מדפיס במפורש במקום להסתיר:
 *
 *   1. עיר עם פחות מ-MIN_PEERS שכנים — אין ממה לבנות עוגן. שם חמק 9100027.
 *   2. cityId שהוא מועצה אזורית או אזור ולא יישוב — "ים המלח" נפתר למרכז
 *      האגם, והאגם באורך 50 ק"מ, כך שנקודה נכונה בעין בוקק נמדדת 41 ק"מ
 *      מהעוגן. אותו דבר במרחבים, מרום גליל, גוש עציון. במקרים כאלה למבחן
 *      המרחק אין כוח הבחנה, והוא מדווח "ללא עוגן" ולא "חריג".
 *
 * החציון ולא הממוצע — נקודה שגויה אחת מזיזה ממוצע, לא חציון.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dir, '..');
const PLACES = path.join(ROOT, 'src/data/generated/places.osm.json');

const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const MAX_KM = +arg('--max-km', 15);
const MIN_PEERS = +arg('--min-peers', 3);
// עיר מפוזרת: אם הפיזור הטיפוסי שלה עצמו מתקרב לסף, כל "חריג" הוא רעש
const SPREAD_FACTOR = +arg('--spread-factor', 3);
const AS_JSON = args.includes('--json');
const STRICT = args.includes('--strict');

function readJson(filePath) {
  let raw = fs.readFileSync(filePath, 'utf8');
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  return JSON.parse(raw);
}

const km = (aLat, aLon, bLat, bLon) => {
  const R = 6371, r = Math.PI / 180;
  return R * Math.hypot((bLon - aLon) * r * Math.cos(((aLat + bLat) / 2) * r), (bLat - aLat) * r);
};

const median = nums => {
  const s = [...nums].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const quantile = (nums, q) => {
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * q))];
};

const places = readJson(PLACES);
const located = places.filter(p => typeof p.location?.latitude === 'number');

const byCity = new Map();
for (const p of located) {
  if (!p.cityId) continue;
  if (!byCity.has(p.cityId)) byCity.set(p.cityId, []);
  byCity.get(p.cityId).push(p);
}

const outliers = [];
const unanchored = [];
const diffuseCities = [];

const note = (p, cityId, reason, extra = {}) => ({
  id: p.id, name: p.name, cityId, reason,
  location: p.location, locationPrecision: p.locationPrecision,
  locationSource: p.locationSource, ...extra,
});

for (const [cityId, group] of byCity) {
  if (group.length < MIN_PEERS + 1) {
    // אין די שכנים כדי לבנות עוגן שהמקום עצמו לא שולט בו
    for (const p of group) unanchored.push(note(p, cityId, 'too-few-peers', { peers: group.length - 1 }));
    continue;
  }

  const cLat = median(group.map(q => q.location.latitude));
  const cLon = median(group.map(q => q.location.longitude));
  const spreads = group.map(q => km(cLat, cLon, q.location.latitude, q.location.longitude));
  const typical = median(spreads);
  const p90 = quantile(spreads, 0.9);

  // cityId שאינו יישוב — מועצה אזורית, אגם, גוש. הפיזור עצמו בולע את הסף.
  // רק הפיזור הטיפוסי קובע. p90 נשלט בערים קטנות ע"י החריגים עצמם —
  // אריאל היא עיר קומפקטית (חציון 0.57 ק"מ) ששתי רשומות שבורות מנפחות
  // לה את ה-p90 ל-31 ק"מ, וסינון לפיו היה מחביא בדיוק אותן.
  if (typical * SPREAD_FACTOR > MAX_KM) {
    diffuseCities.push({ cityId, places: group.length, typicalKm: +typical.toFixed(2), p90Km: +p90.toFixed(2) });
    for (const p of group) {
      unanchored.push(note(p, cityId, 'diffuse-city', { peers: group.length - 1, cityTypicalKm: +typical.toFixed(2) }));
    }
    continue;
  }

  for (const p of group) {
    // חציון של השאר — בלי המקום הנבדק, אחרת הוא מאמת את עצמו
    const peers = group.filter(q => q !== p);
    const pLat = median(peers.map(q => q.location.latitude));
    const pLon = median(peers.map(q => q.location.longitude));
    const d = km(pLat, pLon, p.location.latitude, p.location.longitude);
    if (d > MAX_KM) {
      outliers.push(note(p, cityId, 'far-from-city-median',
        { km: +d.toFixed(2), peers: peers.length, cityTypicalKm: +typical.toFixed(2) }));
    }
  }
}

outliers.sort((a, b) => b.km - a.km);
diffuseCities.sort((a, b) => b.places - a.places);

if (AS_JSON) {
  console.log(JSON.stringify({ maxKm: MAX_KM, minPeers: MIN_PEERS, spreadFactor: SPREAD_FACTOR,
                               outliers, diffuseCities, unanchored }, null, 2));
} else {
  console.log(`\nמקומות עם קואורדינטה: ${located.length}   ערים: ${byCity.size}`);
  console.log(`סף: ${MAX_KM} ק"מ מחציון העיר, לפחות ${MIN_PEERS} שכנים\n`);

  if (outliers.length === 0) {
    console.log('✓ אין חריגים');
  } else {
    console.log(`⚠ ${outliers.length} חריגים:`);
    for (const o of outliers) {
      console.log(`  ${String(o.km).padStart(8)} ק"מ  ${o.id}  ${o.name ?? ''} (${o.cityId}, ${o.peers} שכנים, precision ${o.locationPrecision ?? '-'})`);
    }
  }

  const tooFew = unanchored.filter(u => u.reason === 'too-few-peers');
  const diffuse = unanchored.filter(u => u.reason === 'diffuse-city');

  console.log(`\nללא כוח הבחנה — ${unanchored.length} מקומות (${((unanchored.length / located.length) * 100).toFixed(1)}%)`);
  console.log(`  ${tooFew.length} בערים עם פחות מ-${MIN_PEERS} שכנים. כאן חמקה טעות של 111 ק"מ.`);
  console.log(`  ${diffuse.length} ב-${diffuseCities.length} ערים מפוזרות שבהן המבחן חסר משמעות:`);
  for (const c of diffuseCities) {
    console.log(`     ${c.cityId} — ${c.places} מקומות, פיזור טיפוסי ${c.typicalKm} ק"מ, p90 ${c.p90Km} ק"מ`);
  }
}

if (STRICT && outliers.length > 0) process.exit(1);
