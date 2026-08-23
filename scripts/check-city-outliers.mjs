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
 * אפיקים ואיש לא ראה. בדיקה כזאת הייתה תופסת כל תאונת גיאוקוד המונית —
 * חוץ מהנקודה העיוורת שמתועדת כאן למטה: עיר עם פחות מ-MIN_PEERS שכנים
 * אין לה עוגן, ובדיוק שם 9100027 חמק. הרשימה השנייה בפלט היא הנקודה הזאת.
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

for (const [cityId, group] of byCity) {
  if (group.length < MIN_PEERS + 1) {
    // אין די שכנים כדי לבנות עוגן שהמקום עצמו לא שולט בו
    for (const p of group) {
      unanchored.push({ id: p.id, name: p.name, cityId, peers: group.length - 1,
                        location: p.location, locationPrecision: p.locationPrecision });
    }
    continue;
  }
  for (const p of group) {
    // חציון של השאר — בלי המקום הנבדק, אחרת הוא מאמת את עצמו
    const peers = group.filter(q => q !== p);
    const cLat = median(peers.map(q => q.location.latitude));
    const cLon = median(peers.map(q => q.location.longitude));
    const d = km(cLat, cLon, p.location.latitude, p.location.longitude);
    if (d > MAX_KM) {
      outliers.push({ id: p.id, name: p.name, cityId, km: +d.toFixed(2), peers: peers.length,
                      location: p.location, locationPrecision: p.locationPrecision,
                      locationSource: p.locationSource });
    }
  }
}

outliers.sort((a, b) => b.km - a.km);
unanchored.sort((a, b) => a.peers - b.peers);

if (AS_JSON) {
  console.log(JSON.stringify({ maxKm: MAX_KM, minPeers: MIN_PEERS, outliers, unanchored }, null, 2));
} else {
  console.log(`\nמקומות עם קואורדינטה: ${located.length}   ערים: ${byCity.size}`);
  console.log(`סף: ${MAX_KM} ק"מ מחציון העיר, לפחות ${MIN_PEERS} שכנים\n`);

  if (outliers.length === 0) {
    console.log('✓ אין חריגים');
  } else {
    console.log(`⚠ ${outliers.length} חריגים:`);
    for (const o of outliers) {
      console.log(`  ${String(o.km).padStart(8)} ק"מ  ${o.id}  ${o.name ?? ''} (${o.cityId}, ${o.peers} שכנים)`);
    }
  }

  console.log(`\nנקודה עיוורת — ${unanchored.length} מקומות בערים עם פחות מ-${MIN_PEERS} שכנים,`);
  console.log('אי אפשר לאמת אותם אופליין. כאן חמקה טעות של 111 ק"מ:');
  for (const u of unanchored.slice(0, 15)) {
    console.log(`  ${u.id}  ${u.name ?? ''} (${u.cityId}, ${u.peers} שכנים, precision ${u.locationPrecision ?? '-'})`);
  }
  if (unanchored.length > 15) console.log(`  ... ועוד ${unanchored.length - 15}`);
}

if (STRICT && outliers.length > 0) process.exit(1);
