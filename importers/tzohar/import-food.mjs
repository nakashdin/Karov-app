/**
 * Import Tzohar food places (restaurants / cafes / bakeries / school_canteens)
 * into places.osm.json, with deduplication.
 *
 * Rules:
 *  - Skip wineries (already imported separately)
 *  - Match by (normalized name + city) OR (normalized address + city + same type)
 *  - Matched → update certifiedBy, kosherType, kosherAuthority, kosherAuthorityGroup,
 *               kosherLevel, kosherCertUrl, source, lastVerifiedAt only
 *  - Unmatched → insert as new place
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dir, '../..');

const PLACES_PATH = path.join(ROOT, 'src/data/generated/places.osm.json');
const TZOHAR_PATH = path.join(__dir, 'tzohar-cleaned.json');

const readJson = f => JSON.parse(readFileSync(f, 'utf8').replace(/^﻿/, ''));
const places = readJson(PLACES_PATH);
const tzohar = readJson(TZOHAR_PATH);

// ── City name normalisation ──────────────────────────────────────────────────
// Tzohar sometimes uses dashes and/or "- יפו" suffixes; we normalise to
// the Hebrew form used in our cityId values.
const CITY_MAP = {
  'תל אביב - יפו': 'תל אביב',
  'תל אביב יפו': 'תל אביב',
  'תל-אביב יפו': 'תל אביב',
  'תל-אביב': 'תל אביב',
  'בת-ים': 'בת ים',
  'בית-קמה': 'בית קמה',
  'בני-דרור': 'בני דרור',
  'גבעת-שמואל': 'גבעת שמואל',
  'הוד-השרון': 'הוד השרון',
  'מודיעין-מכבים-רעות': 'מודיעין מכבים רעות',
  'מודיעין מכבים רעות': 'מודיעין מכבים רעות',
  'מזכרת-בתיה': 'מזכרת בתיה',
  'נס-ציונה': 'נס ציונה',
  'פרדס חנה - כרכור': 'פרדס חנה כרכור',
  'פרדס חנה כרכור': 'פרדס חנה כרכור',
  'פרדס חנה - כרכור': 'פרדס חנה כרכור',
  'פתח-תקווה': 'פתח תקווה',
  'קרית-אונו': 'קרית אונו',
  'ראשון-לציון': 'ראשון לציון',
  'רמת-גן': 'רמת גן',
  'רמת-השרון': 'רמת השרון',
  'באר-שבע': 'באר שבע',
  'כפר-סבא': 'כפר סבא',
  'תל-יצחק': 'תל יצחק',
  'תל-מונד': 'תל מונד',
  'שדה-בוקר': 'שדה בוקר',
  'המלך חסן השני 10': 'ירושלים', // data error in tzohar API — actually Jerusalem
};

function normCity(raw) {
  if (!raw) return '';
  const mapped = CITY_MAP[raw.trim()];
  if (mapped) return mapped;
  return raw.trim();
}

// ── Type mapping ─────────────────────────────────────────────────────────────
const TYPE_MAP = {
  restaurant: 'restaurant',
  cafe: 'cafe',
  bakery: 'bakery',
  school_canteen: 'restaurant', // no separate type; treat as restaurant
};

// ── Text normalisation for matching ─────────────────────────────────────────
function norm(s) {
  if (!s) return '';
  return s
    .replace(/["“”‘’]/g, '') // remove quotes
    .replace(/[-–—\s]+/g, ' ')                   // normalise dashes/spaces
    .trim()
    .toLowerCase();
}

// Strip common suffixes that vary between sources
const STRIP_SUFFIX = /\s*(מסעדה|בית קפה|קפה|פיצה|גריל|מאפיה|מאפייה|פטיסרי|פטיסרייה|סניף.*)?$/;
function normName(s) {
  return norm(s).replace(STRIP_SUFFIX, '').trim();
}

function normAddr(s) {
  if (!s) return '';
  // Keep only first component (street name + number) for matching
  return norm(s).split(',')[0].trim();
}

// ── Build lookup tables from existing DB ─────────────────────────────────────
const byNameCity = new Map();    // "normName|normCity" → place
const byAddrCity = new Map();    // "normAddr|normCity" → place[]

for (const p of places) {
  const nc = norm(p.cityId);
  const k1 = normName(p.name) + '|' + nc;
  if (!byNameCity.has(k1)) byNameCity.set(k1, p);

  const k2 = normAddr(p.address) + '|' + nc;
  if (!byAddrCity.has(k2)) byAddrCity.set(k2, []);
  byAddrCity.get(k2).push(p);
}

// ── Process tzohar food entries ──────────────────────────────────────────────
const food = tzohar.filter(t => t.category !== 'winery');

const toUpdate = [];   // { existing: Place, patch: Partial<Place> }
const toInsert = [];   // Place[]
const skipped  = [];   // entries with ambiguous / bad city data

// Counter for new IDs
let nextIdx = places.filter(p => p.id.startsWith('tzohar-food-')).length + 1;

for (const t of food) {
  const city = normCity(t.city);
  if (!city) { skipped.push(t); continue; }

  const nc = norm(city);
  const placeType = TYPE_MAP[t.category] ?? 'restaurant';

  const CERT_PATCH = {
    certifiedBy: 'צהר',
    kosherType: 'tzohar',
    kosherAuthority: 'tzohar',
    kosherAuthorityGroup: 'independent',
    kosherLevel: 'regular',
    ...(t.certPdf ? { kosherCertUrl: t.certPdf } : {}),
    source: 'tzohar',
    lastVerifiedAt: '2026-08-10',
  };

  // 1. Match by normalised name + city
  const nameKey = normName(t.name) + '|' + nc;
  let matched = byNameCity.get(nameKey);

  // 2. Fallback: normalised address + city — ONLY match food-type places
  const FOOD_TYPES = new Set(['restaurant', 'cafe', 'bakery', 'fast_food', 'juice_bar', 'ice_cream_parlor', 'winery']);
  if (!matched) {
    const addrKey = normAddr(t.address) + '|' + nc;
    const addrHits = (byAddrCity.get(addrKey) ?? []).filter(h => FOOD_TYPES.has(h.type));
    if (addrHits.length === 1) matched = addrHits[0];
  }

  if (matched) {
    toUpdate.push({ existing: matched, patch: CERT_PATCH });
  } else {
    // Build a fresh place record
    const id = `tzohar-food-${String(nextIdx++).padStart(4, '0')}`;
    toInsert.push({
      id,
      name: t.name,
      type: placeType,
      cityId: city,
      address: t.address,
      location: { latitude: t.lat, longitude: t.lng },
      ...(t.website ? { website: t.website } : {}),
      ...(t.phone   ? { phone:   t.phone   } : {}),
      ...(t.kosherCategory ? { category: t.kosherCategory } : {}),
      ...CERT_PATCH,
    });
  }
}

// ── Apply updates ────────────────────────────────────────────────────────────
const updatedIds = new Set();
for (const { existing, patch } of toUpdate) {
  if (updatedIds.has(existing.id)) continue; // guard against double-update
  updatedIds.add(existing.id);
  Object.assign(existing, patch);
}

// ── Append new entries ────────────────────────────────────────────────────────
const updated = [...places, ...toInsert];

writeFileSync(PLACES_PATH, JSON.stringify(updated, null, 2), 'utf8');

// ── Report ────────────────────────────────────────────────────────────────────
console.log('\n=== Tzohar Food Import ===');
console.log(`Total tzohar food entries  : ${food.length}`);
console.log(`Updated existing places    : ${toUpdate.length}`);
console.log(`Inserted new places        : ${toInsert.length}`);
console.log(`Skipped (bad city data)    : ${skipped.length}`);
console.log(`New total in places.osm.json: ${updated.length}`);

if (toUpdate.length) {
  console.log('\n— Updated —');
  toUpdate.forEach(({ existing, patch }) =>
    console.log(`  ✓ ${existing.id}  "${existing.name}"  (${existing.cityId})`)
  );
}

if (skipped.length) {
  console.log('\n— Skipped —');
  skipped.forEach(t => console.log(`  ✗ "${t.name}"  city="${t.city}"`));
}

if (toInsert.length) {
  console.log('\n— New entries (first 20) —');
  toInsert.slice(0, 20).forEach(p =>
    console.log(`  + ${p.id}  "${p.name}"  (${p.cityId})  [${p.type}]`)
  );
  if (toInsert.length > 20) console.log(`  … and ${toInsert.length - 20} more`);
}
