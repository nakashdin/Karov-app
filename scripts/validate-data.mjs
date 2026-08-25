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
import { execSync } from 'node:child_process';
import { isCertifiedByAppendOnlyViolation } from './shared/kashrut-write.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_PATH = resolve(root, 'scripts', 'data-quality-baseline.json');
const REGISTRY_PATH = resolve(root, 'scripts', 'reports', 'kashrut-registry.json');

const PLACES_PATH = resolve(root, 'src/data/generated/places.osm.json');
const CITIES_PATH = resolve(root, 'src/data/generated/cities.osm.json');
const PLACES_REL = 'src/data/generated/places.osm.json';

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

/** kosherType values that assert a specific kashrut level (Batch B1, FACTS §5b). */
const LEVEL_ASSERTING_KOSHER_TYPES = new Set(['mehadrin', 'rabanut_mehadrin', 'rabanut_mehadrin_jerusalem']);

const hard = [];
const counts = {
  total: 0,
  unknownCityId: 0,
  missingAddress: 0,
  missingCityId: 0,
  foodWithoutKashrut: 0,
  missingSource: 0,
  // `foodWithoutKashrut` counts a record as "having kashrut" once it carries
  // ANY kashrut-ish field, including `kosherAuthorityGroup: 'unknown'` — which
  // is the value the kashrut filter itself reads as "no usable signal". These
  // two ask the honest question instead; see docs/DATA_ARCHITECTURE.md §10 B6.
  kashrutAuthorityUnknown: 0,
  freeTextCertifierUnmapped: 0,
  // Site A + site B of the 358 authority->level inference defect (FACTS
  // §5b): kosherType asserts a level, but the record's own certifiedBy names
  // a specific registered authority — the level was invented from the body,
  // never stated by the text. TARGET IS 0, NOT "STAY AT 343": the Batch B
  // dataset operation that sets these 358 records' kosherLevel to explicit
  // null (FACTS §5b "Batch B remediation — approved shape") drives this to
  // 0. When that operation lands, this entry MUST convert from a
  // RATCHET_KEYS entry to a HARD failure in the same commit — at 0 there is
  // no cost to unconditional enforcement, and leaving it a ratchet at 0
  // would let a future regression be `--update`d away by someone who reads
  // the ratchet as a preference rather than a bug. This is not a TODO to
  // rediscover later; it is a condition of accepting this ratchet at all.
  levelAssertedOverNamedBody: 0,
};

function fail(msg) {
  hard.push(msg);
}

/**
 * Registry alias -> {authorityId, level}, for the levelAssertedOverNamedBody
 * check. Returns null (not throw) if the registry can't be read — that check
 * is then skipped for this run rather than failing the whole gate on an
 * unrelated file-availability problem.
 */
function loadAliasMap() {
  if (!existsSync(REGISTRY_PATH)) return null;
  try {
    const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8').replace(/^﻿/, ''));
    return new Map((registry.aliases ?? []).map((a) => [a.raw, a]));
  } catch {
    return null;
  }
}

/**
 * id -> certifiedBy as committed at HEAD, for the certifiedBy append-only
 * check (B1.1). Returns null if HEAD can't be read (no git, no HEAD yet,
 * file untracked) — the check is then skipped rather than false-failing.
 *
 * CONSEQUENCE, stated so "the validator is green" is never misread as
 * "certifiedBy has never been overwritten": this check is relative to HEAD,
 * not to true history. A destructive overwrite that gets COMMITTED becomes
 * the new HEAD and is invisible to every future run of this check — it can
 * only ever catch an overwrite happening in the SAME uncommitted change that
 * introduced it. That is still real protection (it fires at exactly the
 * moment a script would otherwise silently destroy evidence, which is where
 * it matters most), but it is a ratchet against further loss from here, not
 * proof nothing has ever been lost.
 */
function loadHeadCertifiedByMap() {
  try {
    const raw = execSync(`git show HEAD:${PLACES_REL}`, { cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024 * 64 });
    const headPlaces = JSON.parse(raw.replace(/^﻿/, ''));
    const map = new Map();
    for (const p of headPlaces) {
      if (p && typeof p.id === 'string') map.set(p.id, p.certifiedBy);
    }
    return map;
  } catch {
    return null;
  }
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
  const certifiedByOverwrites = [];

  const aliasMap = loadAliasMap();
  const headCertifiedBy = loadHeadCertifiedByMap();

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
    if (FOOD_TYPES.has(p.type) && (!p.kosherAuthorityGroup || p.kosherAuthorityGroup === 'unknown')) {
      counts.kashrutAuthorityUnknown++;
    }
    // `certifierId: null` is a deliberately resolved state ("level known, no
    // authority identified") — not the same as never having gone through the
    // registry. Only strict absence counts as unmapped here.
    if (FOOD_TYPES.has(p.type) && p.certifiedBy && p.certifierId === undefined) {
      counts.freeTextCertifierUnmapped++;
    }
    // Site A + site B (FACTS §5b): the level was invented from a named body,
    // never stated by the source text. Resolved via the registry alias map
    // (the Method Lesson from FACTS §4 — raw-string matching misses
    // gershayim/spelling variants), not a substring/keyword heuristic.
    if (
      FOOD_TYPES.has(p.type) &&
      LEVEL_ASSERTING_KOSHER_TYPES.has(p.kosherType) &&
      p.certifiedBy &&
      aliasMap?.get(p.certifiedBy)?.authorityId
    ) {
      counts.levelAssertedOverNamedBody++;
    }

    // ── HARD (B1.1): certifiedBy is append-only relative to HEAD ─────────────
    if (headCertifiedBy && headCertifiedBy.has(p.id)) {
      const prior = headCertifiedBy.get(p.id);
      if (isCertifiedByAppendOnlyViolation(prior, p.certifiedBy)) {
        certifiedByOverwrites.push(
          `${p.id}: was ${JSON.stringify(prior)}, now ${JSON.stringify(p.certifiedBy ?? null)}`,
        );
      }
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
  cap(
    'certifiedBy overwritten since HEAD — this field is source evidence and append-only (B1.1); ' +
      'a value may only be set from empty or extended, never replaced. If this is a deliberate correction, ' +
      'route it through recordKashrutWrite() with a documented basis rather than assigning it directly',
    certifiedByOverwrites,
  );
}

// ── Ratchet comparison ────────────────────────────────────────────────────────

const RATCHET_KEYS = [
  'unknownCityId',
  'missingAddress',
  'missingCityId',
  'foodWithoutKashrut',
  'missingSource',
  'kashrutAuthorityUnknown',
  'freeTextCertifierUnmapped',
  'levelAssertedOverNamedBody',
];

const baseline = existsSync(BASELINE_PATH)
  ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
  : null;

const regressions = [];
const improvements = [];

if (baseline && hard.length === 0) {
  for (const key of RATCHET_KEYS) {
    const now = counts[key];
    // A key absent from the baseline is unmeasured, not zero and not infinite.
    // Falling back to Infinity made every first measurement of a new ratchet
    // report as an "improvement" no matter how bad — the exact failure mode
    // this gate exists to prevent. Missing baseline data is a hard failure:
    // establish it deliberately with `--update`, don't let it default to a
    // free pass.
    if (!(key in baseline)) {
      fail(`${key}: no baseline entry (current count: ${now}). A missing baseline is not evidence of ` +
        `improvement — run \`node scripts/validate-data.mjs --update\` once, after confirming ${now} is ` +
        'the accepted starting point, to establish it deliberately.');
      continue;
    }
    const was = baseline[key];
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
