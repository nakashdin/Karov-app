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
const RESTAURANTS_PATH = resolve(root, 'src/data/generated/restaurants.osm.json');
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

/**
 * Explicit, reviewable exceptions to the lastVerifiedAt-never-moves-backward
 * hard failure below. This is a HARD failure with no CLI flag and no
 * commit-message convention as an escape hatch — both were considered and
 * rejected: a flag leaves no trace of who decided what, and a commit-message
 * convention couples enforcement to text that runs outside commit context
 * and is trivially copy-pasted. An allowlist entry is the only form that is
 * additive, reviewable in the diff that adds it, and forces a stated reason
 * before the build goes green — same shape as FROZEN_EXCLUSIONS in
 * scripts/shared/__tests__/kashrut-write-completeness.test.mjs, the pattern
 * in this repo that has actually held up.
 *
 * An entry authorises EXACTLY ONE id moving from EXACTLY ONE date to
 * EXACTLY ONE date. Not a record-level exemption, not a date range, not a
 * wildcard — anything broader becomes a permanent hole instead of a
 * reviewed, one-time exception. Add an entry only for a genuine corrective
 * revert (restoring a real earlier date after undoing bad data that was
 * itself wrongly written), never to silence a failure you haven't
 * investigated.
 *
 * STALE ENTRIES ARE AN ERROR, not a no-op (checked below, same principle as
 * FROZEN_EXCLUSIONS' stale-entry check) — checked against the CURRENT
 * DATASET being validated, not HEAD: if the current data no longer shows
 * this id at this exact `to` date — because something else changed it again
 * since — the entry no longer describes anything real and must be removed.
 *
 * A successful correction does NOT make its own entry stale. Once the
 * corrective write lands, the record permanently shows the `to` date (there
 * is nothing left to move it away from that value on its own), so the stale
 * check never fires for an entry that did its job — it only fires if some
 * LATER, unrelated change moves that same id to a third date. All 7 entries
 * below are already in this permanent, non-stale state today. Without this,
 * "decays into a permission list" reads as a promise that entries clean
 * themselves up after use, which they do not — the mechanism only catches
 * an entry that has become disconnected from reality, not one that already
 * served its purpose.
 *
 * The BACKWARD-MOVEMENT DETECTION itself (not this list) is HEAD-relative,
 * same limitation as the certifiedBy append-only check above: a backdate
 * that gets committed becomes the new HEAD and is invisible to every later
 * run — this can only catch a regression happening in the same uncommitted
 * change that introduces it, which is exactly the moment a corrective
 * commit needs an allowlist entry to get past it.
 */
const LASTVERIFIEDAT_BACKDATE_ALLOWLIST = [
  // All seven from commit c8857c501, "fix(tzohar): stop the importer
  // stamping co-located businesses with the wrong certificate" — the
  // address-fallback bug in import-food.mjs (see that file's own header)
  // matched a Tzohar record to any single food place at the same street
  // address, wrongly stamping 12 co-located businesses with someone else's
  // certificate and an incorrect lastVerifiedAt. Restoring the true earlier
  // dates recovered from git, while undoing that mis-certification, is
  // exactly the corrective-revert case this allowlist exists for. Verified
  // independently against full commit history (97 commits, 539,089 same-id
  // comparisons) before this list was designed — these 7 are the only
  // backward movements that have ever occurred in this dataset's history.
  { id: 'humus-eli-חומוס-אליהו-הרצליה-פיתוח', from: '2026-08-10', to: '2026-07-30',
    reason: 'חומוס אליהו הרצליה פיתוח: restored after being wrongly stamped with another business\'s Tzohar-adjacent certificate by the address-fallback bug.' },
  { id: '9100018', from: '2026-08-10', to: '2026-07-29',
    reason: 'פיצה האט (id 9100018): same revert, one of the 12 co-located businesses restored to its pre-corruption certifiedBy and date.' },
  { id: '9100059', from: '2026-08-10', to: '2026-07-29',
    reason: 'פיצה האט (id 9100059): same revert, a second branch caught by the same address-fallback match.' },
  { id: 'burgersbar-0b78072a', from: '2026-08-10', to: '2026-07-14',
    reason: 'בורגרס בר הגבעה הצרפתית: same revert; this one\'s wrong certificate left it with no certifiedBy at all once undone, restored to its true (oldest) prior date.' },
  { id: 'manual-kansai-tlv', from: '2026-08-10', to: '2026-07-29',
    reason: 'קנסאי סושי: named directly in the commit message — was wrongly stamped with Arcaffe Alon Towers\' certificate, restored to רבנות תל אביב.' },
  { id: '9000064', from: '2026-08-10', to: '2026-07-29',
    reason: 'פיצה שמש (id 9000064): same revert, restored to בד"צ בית יוסף.' },
  { id: 'manual-dedup-פיצה-שמש-בית-קמה', from: '2026-08-10', to: '2026-07-29',
    reason: 'פיצה שמש בית קמה: same revert, restored to בד"צ בית יוסף.' },
];

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
  // ── restaurants.osm.json (FACTS §18c): 86 scripts write this file, one
  // (the guarded importer) reads it, and until this addition NOTHING
  // validated it. Not app-facing (nothing in src/ imports it — checked by
  // repo-wide scan), so these are ratchets, not HARD failures: a malformed
  // record here cannot crash the app today. They exist because the file is
  // the live authority sync-greg-places.mjs restores FROM, and because
  // f2b15d5's writeCategoryGuarded only closed the erasure path, not this
  // one. All five measured against live data before being baselined —
  // see scripts/data-quality-baseline.json.
  restaurantsDuplicateIds: 0,
  restaurantsShorthandLocation: 0,
  restaurantsOutOfBounds: 0,
  // FACTS §18d: every record in this file carrying certificateValidUntil
  // breaks the field's own documented invariant on place.ts ("only ever set
  // from a real certificate document ... never inferred, extrapolated, or
  // copied from a sibling branch") the moment it lacks kosherCertUrl — which,
  // measured, is all 30 of them today.
  restaurantsCertificateValidUntilWithoutUrl: 0,
  // Same predicate as levelAssertedOverNamedBody above, applied to this
  // file's own kosherType/certifiedBy — a body named in the source text,
  // asserted here as a level the text never stated.
  restaurantsLevelAssertedOverNamedBody: 0,
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

/**
 * id -> lastVerifiedAt as committed at HEAD. Same shape and same "relative
 * to HEAD, not true history" caveat as loadHeadCertifiedByMap. Returns null
 * if HEAD can't be read — the check is then skipped rather than false-failing.
 */
function loadHeadLastVerifiedAtMap() {
  try {
    const raw = execSync(`git show HEAD:${PLACES_REL}`, { cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024 * 64 });
    const headPlaces = JSON.parse(raw.replace(/^﻿/, ''));
    const map = new Map();
    for (const p of headPlaces) {
      if (p && typeof p.id === 'string' && p.lastVerifiedAt) map.set(p.id, p.lastVerifiedAt);
    }
    return map;
  } catch {
    return null;
  }
}

/** Exact-match lookup: is this specific (id, from, to) triple allowlisted? */
function isBackdateAllowed(id, from, to) {
  return LASTVERIFIEDAT_BACKDATE_ALLOWLIST.some((e) => e.id === id && e.from === from && e.to === to);
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
const restaurants = readJson(RESTAURANTS_PATH, 'restaurants.osm.json');

if (places && cities) {
  if (!Array.isArray(places)) fail('places.osm.json must be an array');
  if (!Array.isArray(cities)) fail('cities.osm.json must be an array');
}
if (restaurants && !Array.isArray(restaurants)) fail('restaurants.osm.json must be an array');

if (hard.length === 0) {
  const cityIds = new Set(cities.map((c) => c.id));
  const seenIds = new Set();
  const dupIds = [];
  const outOfBounds = [];
  const badType = [];
  const structural = [];
  const shorthandLoc = [];
  const certifiedByOverwrites = [];
  const lastVerifiedAtBackdates = [];
  const currentLastVerifiedAt = new Map(); // for the allowlist's own stale-entry check, below

  const aliasMap = loadAliasMap();
  const headCertifiedBy = loadHeadCertifiedByMap();
  const headLastVerifiedAt = loadHeadLastVerifiedAtMap();

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

    // ── HARD: lastVerifiedAt never moves backward relative to HEAD ──────────
    // The signature of a one-shot script re-applying a frozen payload — this
    // exact thing happened in this repo (an adversarial re-run sweep moved
    // several dates back by exactly one day) and the only reason it didn't
    // ship was a human noticing a row count. Unconditional except for the
    // explicit allowlist above; see that block for why no other escape
    // hatch exists.
    if (p.lastVerifiedAt) currentLastVerifiedAt.set(p.id, p.lastVerifiedAt);
    if (headLastVerifiedAt && p.lastVerifiedAt && headLastVerifiedAt.has(p.id)) {
      const prior = headLastVerifiedAt.get(p.id);
      const current = p.lastVerifiedAt;
      if (current !== prior) {
        const priorDate = new Date(prior);
        const currentDate = new Date(current);
        if (!isNaN(priorDate) && !isNaN(currentDate) && currentDate < priorDate) {
          if (!isBackdateAllowed(p.id, prior, current)) {
            lastVerifiedAtBackdates.push(`${p.id}: was ${JSON.stringify(prior)}, now ${JSON.stringify(current)} — not on the allowlist`);
          }
        }
      }
    }
  }

  // ── restaurants.osm.json (FACTS §18c) — ratchets only, no HARD failures.
  // Not app-facing, so a malformed record here cannot crash the app today;
  // see the counts{} block above for why these five and not the full
  // places.osm.json check set. Reuses aliasMap loaded above rather than
  // reloading the registry a second time.
  if (Array.isArray(restaurants)) {
    const seenRestaurantIds = new Set();
    for (const r of restaurants) {
      if (!r || typeof r.id !== 'string' || !r.id) continue;
      const id = r.id;
      if (seenRestaurantIds.has(id)) counts.restaurantsDuplicateIds++;
      seenRestaurantIds.add(id);

      const loc = r.location;
      if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number' && typeof loc.latitude !== 'number') {
        counts.restaurantsShorthandLocation++;
      } else if (
        loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number' &&
        (loc.latitude < BBOX.minLat || loc.latitude > BBOX.maxLat || loc.longitude < BBOX.minLng || loc.longitude > BBOX.maxLng)
      ) {
        counts.restaurantsOutOfBounds++;
      }

      if (r.certificateValidUntil && !r.kosherCertUrl) counts.restaurantsCertificateValidUntilWithoutUrl++;

      if (
        FOOD_TYPES.has(r.type) &&
        LEVEL_ASSERTING_KOSHER_TYPES.has(r.kosherType) &&
        r.certifiedBy &&
        aliasMap?.get(r.certifiedBy)?.authorityId
      ) {
        counts.restaurantsLevelAssertedOverNamedBody++;
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
  cap(
    'lastVerifiedAt moved backward since HEAD and the movement is not on the allowlist — this is the ' +
      'signature of a one-shot script re-applying a frozen payload. If this is a genuine corrective revert ' +
      '(restoring a real earlier date after undoing bad data), add a one-time entry to ' +
      'LASTVERIFIEDAT_BACKDATE_ALLOWLIST in scripts/validate-data.mjs naming this exact id/from/to and why',
    lastVerifiedAtBackdates,
  );

  // Stale allowlist entries are an error, not a no-op — same principle as
  // FROZEN_EXCLUSIONS' stale-entry check. Checked against the CURRENT
  // dataset being validated, not HEAD: an entry authorises a working-tree
  // transition that may not be committed yet (that's the whole point — it
  // has to pass validate-data.mjs BEFORE the corrective commit lands), so
  // checking against HEAD would flag every entry as stale at the exact
  // moment it's needed. An entry stays live as long as the current data
  // still shows this id at the allowlisted "to" date — pre-commit or
  // post-commit, that's the same fact. Only once something else changes the
  // date AGAIN does the entry stop describing anything present, and only
  // then is it stale.
  {
    const staleAllowlistEntries = LASTVERIFIEDAT_BACKDATE_ALLOWLIST.filter(
      (e) => currentLastVerifiedAt.get(e.id) !== e.to,
    );
    cap(
      'STALE entries in LASTVERIFIEDAT_BACKDATE_ALLOWLIST — the current dataset no longer shows this id ' +
        'at the allowlisted "to" date (something changed it again since), so the entry no longer describes ' +
        'anything real. Remove it — an allowlist that only ever grows decays into a permission list',
      staleAllowlistEntries.map((e) => `${e.id}: allowlisted ${e.from} → ${e.to}, but the dataset now shows ${JSON.stringify(currentLastVerifiedAt.get(e.id) ?? null)}`),
    );
  }
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
  'restaurantsDuplicateIds',
  'restaurantsShorthandLocation',
  'restaurantsOutOfBounds',
  'restaurantsCertificateValidUntilWithoutUrl',
  'restaurantsLevelAssertedOverNamedBody',
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
