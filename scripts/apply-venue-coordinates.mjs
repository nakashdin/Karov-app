/**
 * apply-venue-coordinates.mjs
 *
 * מחיל קואורדינטות ונויים מ-docs/venue-coordinates-todo.json על places.osm.json
 *
 * הרצה:  node scripts/apply-venue-coordinates.mjs --dry-run
 *        node scripts/apply-venue-coordinates.mjs
 *
 * כללי בטיחות (אחרי התקלה של 111 ק"מ ברשומה 9100027):
 *  1. לא נוגעים ברשומה שכבר מוצהרת 'exact' או 'address' — היא כבר אומתה.
 *     (המדרג המקורי בדק רק 'exact' והשאיר 650 רשומות 'address' חשופות.)
 *  2. locationSource נקבע לפי הספק שבאמת החזיר את הקואורדינטה (_waze / _nominatim),
 *     לא מוטבע 'waze' על עיוור. Provider ≠ Authority.
 *  3. ונו שהתאמתו היא יישוב/מדינה בלבד מסומן locationPrecision 'city',
 *     כדי שהאזהרה "מיקום משוער" תמשיך להופיע למשתמש.
 *  4. קואורדינטה שרחוקה יותר מ-MAX_CITY_KM מחציון שאר המקומות באותה עיר — נדחית.
 *  5. גיבוי לפני כתיבה, ו---dry-run שמדפיס בלי לכתוב.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const DRY_RUN = process.argv.includes('--dry-run');
const MAX_CITY_KM = 12;   // אותו רדיוס ש-waze-sync-coords.mjs אוכף (--city-radius 12000)
const VERIFIED_PRECISION = new Set(['exact', 'address']);
const MIN_PEERS = 3;

const FOOD_TYPES = ['restaurant', 'cafe', 'fast_food', 'juice_bar', 'bakery', 'ice_cream', 'winery', 'food_truck'];
const VENUE_KEYWORDS = ['קניון', 'סנטר', 'מתחם', 'מרכז', 'תחנת', 'ביג ', 'פארק תעשי', 'אזור תעשי', 'מול ', 'קניונית', 'מרינה', 'נמל', 'גן ', 'פארק '];

/** קורא JSON ומקלף BOM אם קיים — קבצים שנערכו בווינדוס מגיעים עם U+FEFF */
function readJson(filePath) {
  let raw = fs.readFileSync(filePath, 'utf8');
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  return JSON.parse(raw);
}

function isRealVenue(v) {
  return v.length > 5 && VENUE_KEYWORDS.some(kw => v.includes(kw));
}

function hasNoStreetNumber(address) {
  if (!address) return true;
  return !/\d/.test(address.split(',')[0].trim());
}

const km = (aLat, aLon, bLat, bLon) => {
  const R = 6371, r = Math.PI / 180;
  return R * Math.hypot((bLon - aLon) * r * Math.cos(((aLat + bLat) / 2) * r), (bLat - aLat) * r);
};

const median = nums => {
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/** התאמה שהיא רק שם יישוב/מדינה — אין רחוב, אין מספר, אין שם ונו */
function isLocalityGrade(entry) {
  const label = entry._waze || entry._nominatim || '';
  if (!label) return true;
  if (/^israel$/i.test(label.trim())) return true;
  // "Even Yehuda", "Or Akiva" — מילה או שתיים בלי פסיק ובלי ספרה
  return !label.includes(',') && !/\d/.test(label);
}

const todoPath = path.join(ROOT, 'docs', 'venue-coordinates-todo.json');
const placesPath = path.join(ROOT, 'src', 'data', 'generated', 'places.osm.json');

const todo = readJson(todoPath);
const places = readJson(placesPath);

// מפה: 'venue|city' → הרשומה המלאה מה-todo (צריך גם את מקור ההתאמה, לא רק lat/lng)
const venueMap = {};
let filled = 0;
let empty = 0;

todo.forEach(entry => {
  if (entry.lat !== null && entry.lng !== null) {
    venueMap[`${entry.venue}|${entry.city}`] = entry;
    filled++;
  } else {
    empty++;
  }
});

// חציון לכל עיר, כעוגן שפיות. נבנה רק ממקומות שלא עומדים להתעדכן עכשיו.
const cityPoints = {};
places.forEach(p => {
  const loc = p.location;
  if (!loc || typeof loc.latitude !== 'number') return;
  (cityPoints[p.cityId] ??= []).push(loc);
});
function cityAnchor(cityId) {
  const pts = cityPoints[cityId];
  if (!pts || pts.length < MIN_PEERS) return null;
  return { lat: median(pts.map(p => p.latitude)), lng: median(pts.map(p => p.longitude)) };
}

console.log(`ונויים עם קואורדינטה: ${filled}`);
console.log(`ונויים ריקים (טרם מולאו): ${empty}`);
if (DRY_RUN) console.log('*** DRY RUN — לא נכתב כלום ***');
console.log('');

let updated = 0;
let skipped = 0;
let protectedCount = 0;
let rejected = 0;
let downgraded = 0;
let unanchored = 0;

const result = places.map(p => {
  if (!FOOD_TYPES.includes(p.type)) return p;
  if (p.locationSource === 'waze') return p;

  // הרשומה כבר מוצהרת ברמת כתובת — היא אומתה, לא דורסים אותה.
  if (VERIFIED_PRECISION.has(p.locationPrecision)) {
    protectedCount++;
    return p;
  }

  if (!hasNoStreetNumber(p.address)) return p;

  const venuePart = (p.address || '').split(',')[0].trim();
  if (!isRealVenue(venuePart)) return p;

  const entry = venueMap[`${venuePart}|${p.cityId || ''}`];
  if (!entry) {
    skipped++;
    return p;
  }

  // בדיקת שפיות מול שאר העיר
  const anchor = cityAnchor(p.cityId);
  if (anchor) {
    const dist = km(anchor.lat, anchor.lng, entry.lat, entry.lng);
    if (dist > MAX_CITY_KM) {
      console.log(`⛔ נדחה: ${p.name} / ${venuePart} — ${dist.toFixed(1)} ק"מ מחציון ${p.cityId}`);
      rejected++;
      return p;
    }
  } else {
    // פחות מ-MIN_PEERS שכנים בעיר — אין במה לאמת. זה בדיוק המקום שבו 9100027 חמק.
    console.log(`⚠ ללא עוגן: ${p.name} / ${venuePart} (${p.cityId}) — דורש אימות ידני`);
    unanchored++;
  }

  const localityGrade = isLocalityGrade(entry);
  if (localityGrade) downgraded++;

  updated++;
  return {
    ...p,
    location: { latitude: entry.lat, longitude: entry.lng },
    locationPrecision: localityGrade ? 'city' : 'address',
    locationSource: entry._waze ? 'waze' : 'nominatim',
  };
});

if (!DRY_RUN) {
  const backup = `${placesPath}.bak-venue-coords`;
  fs.copyFileSync(placesPath, backup);
  console.log(`גיבוי: ${path.relative(ROOT, backup)}`);
  fs.writeFileSync(placesPath, JSON.stringify(result, null, 2), 'utf8');
}

console.log('');
console.log(`${DRY_RUN ? 'היו מתעדכנים' : '✅ עודכנו'}: ${updated} רשומות`);
console.log(`   מתוכן סומנו 'city' (התאמה ברמת יישוב): ${downgraded}`);
console.log(`   מתוכן ללא עוגן עירוני — דורשות אימות ידני: ${unanchored}`);
console.log(`🛡  לא נגענו (כבר 'exact'/'address'): ${protectedCount}`);
console.log(`⛔ נדחו (רחוק מדי מהעיר): ${rejected}`);
console.log(`⏭  דולגו (ונו לא ברשימה): ${skipped}`);
