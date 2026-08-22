#!/usr/bin/env node
/**
 * Dataset gate for src/data/generated/*.
 *
 * Two classes of check:
 *
 *   HARD  — structural invariants the app relies on to not crash or lie to the
 *           user. Any violation fails the build.
 *   RATCHET — known quality gaps (missing address, missing provenance, a food
 *           place with no kashrut field). These are allowed to exist at their
 *           current level and are never allowed to grow. The ceilings live in
 *           scripts/data-quality-baseline.json; lower them as data improves.
 *
 * Usage:
 *   node scripts/validate-data.mjs             # verify
 *   node scripts/validate-data.mjs --update    # rewrite the baseline (only ever down)
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_PATH = resolve(root, 'scripts', 'data-quality-baseline.json');

const PLACES_PATH = resolve(root, 'src/data/generated/places.osm.json');
const CITIES_PATH = resolve(root, 'src/data/generated/cities.osm.json');

/** Keep in sync with PlaceType in src/types/place.ts. */
const PLACE_TYPES = new Set([
  'restaurant',
  'fast_food',
  'cafe',
  'coffee_cart',
  'juice_bar',
  'ice_cream_parlor',
  'bakery',
  'winery',
  'synagogue',
  'mikveh',
  'chabad_house',
  'tzaddik_grave',
]);

/** Types that serve food — these must carry a kashrut claim to be shown at all. */
const FOOD_TYPES = new Set([
  'restaurant',
  'fast_food',
  'cafe',
  'coffee_cart',
  'juice_bar',
  'ice_cream_parlor',
  'bakery',
  'winery',
]);

/** Generous bounding box around Israel; a point outside it is a data error. */
const BBOX = { minLat: 29.3, maxLat: 33.4, minLng: 34.2, maxLng: 35.95 };

const hard = [];
const counts = {
  total: 0,
  unknownCityId: 0,
  missingAddress: 0,
  missingCityId: 0,
  foodWithoutKashrut: 0,
  missingSource: 0,
};

function fail(msg) {
  hard.push(msg);
}

function readJson(path, label) {
  if (!existsSync(path)) {
    fail(`${label}: file not found at ${path}`);
    return null;
  }
  try {
    // Some generated files were written with a BOM; JSON.parse chokes on it.
    return JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, ''));
  } catch (err) {
    fail(`${label}: not valid JSON — ${err.message}`);
    return null;
  }
}

const places = readJson(PLACES_PATH, 'places.osm.json');
const cities = readJson(CITIES_PATH, 'cities.osm.json');

if (places && cities) {
  if (!Array.isArray(places)) fail('places.osm.json must be an array');
  if (!Array.isArray(cities)) fail('cities.osm.json must be an array');
}

if (hard.length === 0) {
  const cityIds = new Set(cities.map((c) => c.id));
  const seenIds = new Set();
  const dupIds = [];
  const outOfBounds = [];
  const badType = [];
  const structural = [];
  const shorthandLoc = [];

  counts.total = places.length;

  for (const p of places) {
    // ── HARD ────────────────────────────────────────────────────────────────
    if (!p || typeof p.id !== 'string' || !p.id) {
      structural.push(`record without a usable id: ${JSON.stringify(p).slice(0, 120)}`);
      continue;
    }
    if (seenIds.has(p.id)) dupIds.push(p.id);
    seenIds.add(p.id);

    if (typeof p.name !== 'string' || !p.name.trim()) structural.push(`${p.id}: missing name`);
    if (!PLACE_TYPES.has(p.type)) badType.push(`${p.id}: unknown type "${p.type}"`);

    const loc = p.location;
    if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number' &&
        typeof loc.latitude !== 'number') {
      // sanitizePlace() silently discards this shape, so the place vanishes
      // from the app with no error. Run scripts/fix-location-shape.mjs.
      shorthandLoc.push(`${p.id} (${p.name})`);
    } else if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') {
      structural.push(`${p.id}: missing or non-numeric location`);
    } else if (
      loc.latitude < BBOX.minLat ||
      loc.latitude > BBOX.maxLat ||
      loc.longitude < BBOX.minLng ||
      loc.longitude > BBOX.maxLng
    ) {
      outOfBounds.push(`${p.id}: (${loc.latitude}, ${loc.longitude})`);
    }

    // ── RATCHET ─────────────────────────────────────────────────────────────
    if (!p.cityId) counts.missingCityId++;
    else if (!cityIds.has(p.cityId)) counts.unknownCityId++;
    if (!p.address) counts.missingAddress++;
    if (!p.source) counts.missingSource++;
    if (FOOD_TYPES.has(p.type) && !p.kosherType && !p.kosherAuthorityGroup && !p.certifiedBy) {
      counts.foodWithoutKashrut++;
    }
  }

  const cap = (label, list, limit = 10) => {
    if (!list.length) return;
    fail(`${label} (${list.length}):\n    ` + list.slice(0, limit).join('\n    ') +
      (list.length > limit ? `\n    …and ${list.length - limit} more` : ''));
  };

  cap('duplicate ids', dupIds);
  cap('coordinates outside Israel', outOfBounds);
  cap('unknown place types', badType);
  cap('structurally invalid records', structural);
  cap(
    'location written as {lat,lng} instead of {latitude,longitude} — invisible in the app; ' +
      'run node scripts/fix-location-shape.mjs',
    shorthandLoc,
  );
}

// ── Ratchet comparison ────────────────────────────────────────────────────────

const RATCHET_KEYS = [
  'unknownCityId',
  'missingAddress',
  'missingCityId',
  'foodWithoutKashrut',
  'missingSource',
];

const baseline = existsSync(BASELINE_PATH)
  ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
  : null;

const regressions = [];
const improvements = [];

if (baseline && hard.length === 0) {
  for (const key of RATCHET_KEYS) {
    const now = counts[key];
    const was = baseline[key] ?? Infinity;
    if (now > was) regressions.push(`${key}: ${was} → ${now} (+${now - was})`);
    else if (now < was) improvements.push(`${key}: ${was} → ${now} (−${was - now})`);
  }
  // The dataset is additive-only by project rule: it must never shrink.
  if (typeof baseline.total === 'number' && counts.total < baseline.total) {
    fail(`record count dropped: ${baseline.total} → ${counts.total}. The dataset is additive-only.`);
  }
}

// ── Report ────────────────────────────────────────────────────────────────────

const pct = (n) => (counts.total ? ((n / counts.total) * 100).toFixed(1) : '0.0');

console.log(`\nplaces: ${counts.total}   cities: ${cities?.length ?? '?'}\n`);
for (const key of RATCHET_KEYS) {
  const was = baseline?.[key];
  const arrow = was === undefined ? '' : was === counts[key] ? '  =' : counts[key] < was ? '  ↓' : '  ↑';
  console.log(`  ${key.padEnd(20)} ${String(counts[key]).padStart(6)}  (${pct(counts[key])}%)${arrow}`);
}

if (process.argv.includes('--update')) {
  const next = { total: counts.total };
  for (const key of RATCHET_KEYS) {
    next[key] = baseline ? Math.min(baseline[key] ?? Infinity, counts[key]) : counts[key];
  }
  writeFileSync(BASELINE_PATH, JSON.stringify(next, null, 2) + '\n');
  console.log(`\n✓ baseline written to ${BASELINE_PATH}`);
  process.exit(0);
}

if (improvements.length) {
  console.log('\n✓ improved:');
  improvements.forEach((m) => console.log('   ' + m));
  console.log('   run `node scripts/validate-data.mjs --update` to lock these in.');
}

if (hard.length) {
  console.error('\n✖ HARD FAILURES\n');
  hard.forEach((m) => console.error('  • ' + m + '\n'));
}
if (regressions.length) {
  console.error('\n✖ DATA QUALITY REGRESSION\n');
  regressions.forEach((m) => console.error('  • ' + m));
  console.error('\n  These counts may not grow. Fix the new records, or justify and');
  console.error('  raise the ceiling in scripts/data-quality-baseline.json deliberately.\n');
}

if (hard.length || regressions.length) process.exit(1);
console.log('\n✓ dataset OK\n');
