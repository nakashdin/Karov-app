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
 *
 * KASHRUT WRITES ARE EVIDENCE-GATED (Batch B1 migration). The five kashrut
 * fields route through recordKashrutWrite() with basis
 * {kind:'certificate-document', url}, using a real Tzohar PDF URL — either
 * from this pull (t.certPdf) or, for a record this script already certified
 * in an earlier pull, the URL already on the record. Neither PDF was NOT a
 * formatting gap to paper over: a Tzohar export entry with no PDF anywhere
 * (never this pull, never a prior one) is real Tzohar list membership but
 * not a citable document, and the honest thing to do with it is NOT
 * silently invent a basis. So:
 *   - a MATCHED existing record with no citable PDF gets its non-kashrut
 *     fields (lastVerifiedAt) refreshed, but its kashrut fields are left
 *     exactly as they were rather than re-asserted on no evidence — see
 *     `noEvidenceUpdates` below.
 *   - an UNMATCHED entry with no citable PDF is not admitted as a new food
 *     record at all (AGENTS.md: a restaurant without kashrut evidence does
 *     not get admitted) — see `skipped` below.
 * This is a real, load-bearing behavior change from the pre-migration
 * script, which wrote all five fields unconditionally via Object.assign
 * regardless of whether a PDF existed for that specific record.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { recordKashrutWrite } from '../../scripts/shared/kashrut-write.mjs';

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

/**
 * True when two business names share a meaningful word. Guards the
 * address-based fallback so co-located businesses are never conflated.
 */
function namesOverlap(a, b) {
  const words = s => new Set(norm(s).split(' ').filter(w => w.length > 2));
  const wa = words(a), wb = words(b);
  for (const w of wa) if (wb.has(w)) return true;
  return false;
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

const toUpdate = [];         // { existing: Place, certUrl: string, basis: KashrutBasis }
const toInsert = [];         // { base: Partial<Place>, certUrl: string, basis: KashrutBasis }
const skipped  = [];         // { t, reason: string }
const noEvidenceUpdates = []; // { existing: Place } — matched, but no certificate to cite for THIS pull;
                              // non-kashrut fields still refresh, kashrut fields are left untouched rather
                              // than re-asserted without a citable document (see header note on basis).
const helperViolations = []; // recordKashrutWrite refusals — caught, not crashed, same pattern as
                              // apply-kashrut-authorities.mjs

// Counter for new IDs — derived from the MAX existing index, not the count.
// Real, live defect found by the Reviewer and fixed here: dedupe-places.mjs
// folds duplicate records into extra.mergedFrom on the surviving id rather
// than deleting them, which leaves holes in the tzohar-food-NNNN sequence —
// verified today at 173 live records but a max index of 216 (43 gaps). A
// count-based nextIdx (174) mints straight into already-occupied ids: 37 of
// the first 69 mints collided with existing records and corrupted the
// output (data:validate: 37 duplicate ids) before this fix. Belt-and-braces:
// mintTzoharFoodId() below also asserts no collision at the point of mint
// and throws rather than silently writing a duplicate, because the next
// person who writes an id scheme for this file is one count-based line away
// from the same bug.
let maxIdx = 0;
for (const p of places) {
  const m = /^tzohar-food-(\d+)$/.exec(p.id);
  if (m) maxIdx = Math.max(maxIdx, parseInt(m[1], 10));
}
let nextIdx = maxIdx + 1;
const existingIds = new Set(places.map(p => p.id));

function mintTzoharFoodId() {
  const id = `tzohar-food-${String(nextIdx++).padStart(4, '0')}`;
  if (existingIds.has(id)) {
    throw new Error(
      `mintTzoharFoodId: "${id}" already exists in the live dataset. nextIdx computation is wrong — ` +
      'refusing to mint a colliding id rather than silently writing a duplicate.',
    );
  }
  existingIds.add(id);
  return id;
}

for (const t of food) {
  // 3 entries in tzohar-cleaned.json carry no name at all (empty string) but
  // DO have a certPdf — a distinct defect from the 3 unmatched businesses
  // with no certificate at all (below). Skipped here, before matching (name
  // matching on an empty string is meaningless anyway) and before the
  // evidence gate (having a PDF does not fix having no name). Not fabricating
  // a name from the PDF filename slug — that would be exactly the kind of
  // unverified inference this project exists to avoid.
  if (!t.name || !t.name.trim()) {
    skipped.push({ t, reason: 'source record has no name (empty string) — not fabricating one from the certificate PDF filename' });
    continue;
  }

  const city = normCity(t.city);
  if (!city) { skipped.push({ t, reason: 'bad city data' }); continue; }

  const nc = norm(city);
  const placeType = TYPE_MAP[t.category] ?? 'restaurant';

  // 1. Match by normalised name + city
  const nameKey = normName(t.name) + '|' + nc;
  let matched = byNameCity.get(nameKey);

  // 2. Fallback: normalised address + city — ONLY match food-type places.
  //    A shared address is NOT enough on its own: malls, food courts and office
  //    buildings hold several businesses at one street address, and matching on
  //    address alone stamped 12 unrelated places with someone else's Tzohar
  //    certificate (McDonald's Tel Mond got a butcher's, Alfredo got Chick&Pick's).
  //    Require the names to overlap as well.
  const FOOD_TYPES = new Set(['restaurant', 'cafe', 'bakery', 'fast_food', 'juice_bar', 'ice_cream_parlor', 'winery']);
  if (!matched) {
    const addrKey = normAddr(t.address) + '|' + nc;
    const addrHits = (byAddrCity.get(addrKey) ?? [])
      .filter(h => FOOD_TYPES.has(h.type))
      .filter(h => namesOverlap(t.name, h.name));
    if (addrHits.length === 1) matched = addrHits[0];
  }

  // The honest evidence for a certificate-document basis: a certPdf from THIS
  // pull, or — for a record this same script already certified in an earlier
  // pull — the URL it recorded then. Neither existing is a real finding, not
  // a formatting gap: see the header note. It is NOT papered over with a
  // human-review or backfilled-inference basis, because neither is true —
  // there is no reviewer and no prior capture to point to, only Tzohar's
  // institutional list entry with no attached document.
  const certUrl = t.certPdf || matched?.kosherCertUrl || null;

  if (!certUrl) {
    if (matched) {
      noEvidenceUpdates.push({ existing: matched });
    } else {
      skipped.push({ t, reason: 'no certificate PDF for a NEW record — not admitted without a citable document (AGENTS.md admission rule)' });
    }
    continue;
  }

  const basis = { kind: 'certificate-document', url: certUrl };

  if (matched) {
    toUpdate.push({ existing: matched, certUrl, basis });
  } else {
    toInsert.push({
      base: {
        id: mintTzoharFoodId(),
        name: t.name,
        type: placeType,
        cityId: city,
        address: t.address,
        location: { latitude: t.lat, longitude: t.lng },
        ...(t.website ? { website: t.website } : {}),
        ...(t.phone   ? { phone:   t.phone   } : {}),
        ...(t.kosherCategory ? { category: t.kosherCategory } : {}),
      },
      certUrl,
      basis,
    });
  }
}

/** The five fields recordKashrutWrite governs, applied identically to an update or a fresh record. */
function applyCertPatch(place, basis) {
  recordKashrutWrite(place, 'certifiedBy', 'צהר', basis);
  recordKashrutWrite(place, 'kosherType', 'tzohar', basis);
  recordKashrutWrite(place, 'kosherAuthority', 'tzohar', basis);
  recordKashrutWrite(place, 'kosherAuthorityGroup', 'independent', basis);
  recordKashrutWrite(place, 'kosherLevel', 'regular', basis); // never level-asserting — 'regular' is never guarded
  // certifierId was the actual cause of the freeTextCertifierUnmapped ratchet
  // regression that a proposed apply-before-import ordering rule would not
  // have fixed — the counter was measuring this script's own omission (it
  // wrote certifiedBy and kosherAuthority:'tzohar' but never certifierId),
  // not stale global state, so no scheduling rule could have closed it.
  // Registry-confirmed clean: alias 'צהר' -> authorityId 'tzohar', not
  // reviewQueue-deferred, authority 'tzohar' registered. Not level-asserting,
  // so the choke point's level guard never applies to this write.
  recordKashrutWrite(place, 'certifierId', 'tzohar', basis);
}

// ── Apply updates ────────────────────────────────────────────────────────────
// "Updated" counts WRITE ATTEMPTS, not value changes — most matched records
// already carry צהר/tzohar/independent/regular from an earlier pull, so the
// write is a no-op. Tracked separately so a report doesn't read as "N
// records changed" when the honest number is much smaller.
const changeCounts = { kashrutValueChanged: 0, nonKashrutValueChanged: 0, noopWrite: 0 };
const updatedIds = new Set();
for (const { existing, certUrl, basis } of toUpdate) {
  if (updatedIds.has(existing.id)) continue; // guard against double-update
  updatedIds.add(existing.id);
  const before = {
    certifiedBy: existing.certifiedBy, kosherType: existing.kosherType, kosherAuthority: existing.kosherAuthority,
    kosherAuthorityGroup: existing.kosherAuthorityGroup, kosherLevel: existing.kosherLevel, certifierId: existing.certifierId,
    kosherCertUrl: existing.kosherCertUrl, source: existing.source, lastVerifiedAt: existing.lastVerifiedAt,
  };
  try {
    applyCertPatch(existing, basis);
    existing.kosherCertUrl = certUrl; // not a KASHRUT_FIELD — kosherCertUrl is evidence data, not routed through the helper
    existing.source = 'tzohar';
    existing.lastVerifiedAt = '2026-08-10';

    const kashrutValueChanged = ['certifiedBy', 'kosherType', 'kosherAuthority', 'kosherAuthorityGroup', 'kosherLevel', 'certifierId']
      .some((f) => before[f] !== existing[f]);
    const nonKashrutValueChanged = ['kosherCertUrl', 'source', 'lastVerifiedAt']
      .some((f) => before[f] !== existing[f]);
    if (kashrutValueChanged) changeCounts.kashrutValueChanged++;
    else if (nonKashrutValueChanged) changeCounts.nonKashrutValueChanged++;
    else changeCounts.noopWrite++;
  } catch (err) {
    helperViolations.push(`${existing.id} "${existing.name}": ${err.message}`);
  }
}

// Records matched but with no citable certificate: still worth a freshness
// stamp (Tzohar's list still names this business), but their kashrut fields
// are left exactly as they were rather than re-asserted on no evidence.
for (const { existing } of noEvidenceUpdates) {
  if (updatedIds.has(existing.id)) continue;
  updatedIds.add(existing.id);
  existing.lastVerifiedAt = '2026-08-10';
}

// ── Build new entries ────────────────────────────────────────────────────────
const newPlaces = [];
for (const { base, certUrl, basis } of toInsert) {
  const place = { ...base };
  try {
    applyCertPatch(place, basis);
    place.kosherCertUrl = certUrl;
    place.source = 'tzohar';
    place.lastVerifiedAt = '2026-08-10';
    newPlaces.push(place);
  } catch (err) {
    helperViolations.push(`NEW ${base.id} "${base.name}": ${err.message}`);
    skipped.push({ t: { name: base.name, city: base.cityId }, reason: `recordKashrutWrite refused: ${err.message}` });
  }
}

// ── Append new entries ────────────────────────────────────────────────────────
const updated = [...places, ...newPlaces];

writeFileSync(PLACES_PATH, JSON.stringify(updated, null, 2), 'utf8');

// ── Report ────────────────────────────────────────────────────────────────────
console.log('\n=== Tzohar Food Import ===');
console.log(`Total tzohar food entries        : ${food.length}`);
console.log(`Updated existing places (write attempts) : ${toUpdate.length}`);
console.log(`  — of which kashrut fields actually changed value : ${changeCounts.kashrutValueChanged}`);
console.log(`  — of which only non-kashrut fields changed (lastVerifiedAt etc.) : ${changeCounts.nonKashrutValueChanged}`);
console.log(`  — of which nothing changed (already up to date) : ${changeCounts.noopWrite}`);
console.log(`Inserted new places              : ${newPlaces.length}`);
console.log(`Matched, no certificate to cite  : ${noEvidenceUpdates.length}  (kashrut fields left untouched, non-kashrut fields refreshed)`);
console.log(`Skipped (bad city data / no cert for a new record) : ${skipped.length}`);
console.log(`recordKashrutWrite refusals      : ${helperViolations.length}`);
console.log(`New total in places.osm.json     : ${updated.length}`);

if (toUpdate.length) {
  console.log('\n— Updated —');
  toUpdate.forEach(({ existing }) =>
    console.log(`  ✓ ${existing.id}  "${existing.name}"  (${existing.cityId})`)
  );
}

if (noEvidenceUpdates.length) {
  console.log('\n— Matched, no certificate to cite (kashrut fields NOT re-asserted) —');
  noEvidenceUpdates.forEach(({ existing }) =>
    console.log(`  ~ ${existing.id}  "${existing.name}"  (${existing.cityId})  kosherCertUrl=${JSON.stringify(existing.kosherCertUrl ?? null)}`)
  );
}

if (skipped.length) {
  console.log('\n— Skipped —');
  skipped.forEach(({ t, reason }) => console.log(`  ✗ "${t.name}"  city="${t.city}"  — ${reason}`));
}

if (helperViolations.length) {
  console.log('\n— recordKashrutWrite refusals —');
  helperViolations.forEach((m) => console.log(`  ⚠ ${m}`));
}

if (newPlaces.length) {
  console.log('\n— New entries (first 20) —');
  newPlaces.slice(0, 20).forEach(p =>
    console.log(`  + ${p.id}  "${p.name}"  (${p.cityId})  [${p.type}]`)
  );
  if (newPlaces.length > 20) console.log(`  … and ${newPlaces.length - 20} more`);
}
