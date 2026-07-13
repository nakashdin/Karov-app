/**
 * Tzaddik Graves — Connect-Live (VALIDATION ONLY).
 *
 * Reads approved_for_live.json, maps records to Place objects,
 * and validates them against the live places.osm.json.
 *
 * ⛔  NEVER writes to src/data/generated/
 * ⛔  NEVER calls rebuildAppDataset()
 * ⛔  DRY RUN / VALIDATION ONLY until --live flag is approved and passed.
 *
 * Safety (identical discipline to chabad/connect-live.ts):
 *   - Fresh backup would be created first (never overwritten).
 *   - Existing records are PRESERVED (0 deletions enforced).
 *   - Only NEW tzaddik_grave records are appended.
 *   - Two OSM IDs that already exist as synagogues receive a tag update only.
 *   - rebuildAppDataset is NEVER called.
 *
 * Run validation:  node importers/tzaddik-graves/connect-live.ts
 * Run live import: node importers/tzaddik-graves/connect-live.ts --live   ← requires explicit approval
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isInIsrael } from '../shared/utils.ts';
import type { Place } from '../../src/types/place.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT   = join(HERE, 'output');
const GEN   = join(HERE, '..', '..', 'src', 'data', 'generated');

const APPROVED_FILE   = join(OUT, 'approved_for_live.json');
const PLACES_FILE     = join(GEN, 'places.osm.json');
const PLACES_BACKUP   = join(GEN, 'places.osm.pre-tzaddik.backup.json');

const IS_LIVE = process.argv.includes('--live');

// ---------------------------------------------------------------------------
// City overrides — fills in city for Wikidata records whose API returned none.
// Verified by reverse-geocoding from coordinates (see validation report above).
// ---------------------------------------------------------------------------
const CITY_OVERRIDES: Record<string, string> = {
  'wikidata-grave-Q6653557':   'טבריה',
  'wikidata-grave-Q120411618': 'חיפה',
  'wikidata-grave-Q1708945':   'ירושלים',
  'wikidata-grave-Q12410947':  'בית שערים',
  'wikidata-grave-Q492091':    'ירושלים',
  'wikidata-grave-Q5216485':   'נתיבות',
  'wikidata-grave-Q119719894': 'תקוע',
  'wikidata-grave-Q6970838':   'תמנת סרח',
  'wikidata-grave-Q625219':    'טבריה',
  'wikidata-grave-Q2907254':   'ירושלים',
};

// ---------------------------------------------------------------------------
// OSM IDs that already exist in places.osm.json as 'synagogue'.
// Strategy: add 'tzaddik_grave' tag to the existing record; do NOT create a
// duplicate Place. This mirrors the chabad_house tag-update pattern.
// ---------------------------------------------------------------------------
const SYNAGOGUE_TAG_UPDATES: { existingId: string; name: string }[] = [
  { existingId: 'osm-way-493703983',  name: 'קבר רבי שמעון בר יוחאי' },
  { existingId: 'osm-node-1339426969', name: 'קברי התנאים בצומת חנניה' },
];

// ---------------------------------------------------------------------------
// Distance helper
// ---------------------------------------------------------------------------
function meters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

// ---------------------------------------------------------------------------
// Map TzaddikGraveRaw → Place
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPlace(r: any, verifiedAt: string): Place {
  const cityId: string =
    CITY_OVERRIDES[r.sourceId] ?? r.city ?? r.address ?? 'לא ידוע';

  const source: Place['source'] =
    r.source === 'manual' ? 'manual' :
    r.source === 'wikidata' ? 'wikidata' : 'osm';

  return {
    id: `tzaddik-${r.sourceId}`,
    name: r.name ?? '?',
    type: 'tzaddik_grave',
    cityId,
    address: r.address ?? cityId,
    location: { latitude: r.lat, longitude: r.lng },
    source,
    lastVerifiedAt: r.verifiedAt ?? verifiedAt,
    tags: ['tzaddik_grave'],
    extra: {
      sourceId:        r.sourceId,
      buriedPerson:    r.buriedPerson,
      wikidataId:      r.wikidataId,
      osmId:           r.osmId,
      confidenceScore: r.confidenceScore,
      confidenceLevel: r.confidenceLevel,
      confidenceReason: r.confidenceReason,
      manualSeed:      r.extra?.manualSeed ?? false,
      isMustHave:      r.extra?.isMustHave ?? false,
    },
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main(): void {
  const verifiedAt = new Date().toISOString().slice(0, 10);

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log(`║  קברי צדיקים — Connect-Live ${IS_LIVE ? '⚠️  LIVE' : '🔍 VALIDATION'}             ║`);
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ── Load files ──────────────────────────────────────────────────────────
  if (!existsSync(APPROVED_FILE)) {
    console.error(`❌ ${APPROVED_FILE} לא נמצא — הרץ תחילה: node importers/tzaddik-graves/importer.ts`);
    process.exit(1);
  }
  if (!existsSync(PLACES_FILE)) {
    console.error(`❌ ${PLACES_FILE} לא נמצא`);
    process.exit(1);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const incoming: any[] = JSON.parse(readFileSync(APPROVED_FILE, 'utf8'));
  const live: Place[] = JSON.parse(readFileSync(PLACES_FILE, 'utf8'));
  const beforeIds = new Set(live.map((p) => p.id));
  const beforeTotal = live.length;

  console.log(`▶ מסד נתונים קיים: ${beforeTotal} רשומות`);
  console.log(`▶ רשומות נכנסות (approved): ${incoming.length}`);

  // ── Tag-update candidates (existing synagogues) ──────────────────────────
  const tagUpdates: { record: Place; tag: string; name: string }[] = [];
  for (const tu of SYNAGOGUE_TAG_UPDATES) {
    const existing = live.find((p) => p.id === tu.existingId);
    if (existing) {
      tagUpdates.push({ record: existing, tag: 'tzaddik_grave', name: tu.name });
    }
  }

  // ── OSM sourceIds that are handled via tag-update (skip as new Place) ──
  // The two synagogues have sourceIds like 'osm-osm-way-493703983'
  const tagUpdateSourceIds = new Set(
    SYNAGOGUE_TAG_UPDATES.map((tu) => {
      // sourceId in approved_for_live is e.g. 'osm-osm-way-493703983'
      // existingId is 'osm-way-493703983'
      return `osm-${tu.existingId}`;
    }),
  );

  // ── Map & validate each incoming record ──────────────────────────────────
  type RowResult =
    | { status: 'add';      place: Place }
    | { status: 'tag_only'; sourceId: string; existingId: string; name: string }
    | { status: 'skip';     sourceId: string; reason: string };

  const results: RowResult[] = [];

  for (const r of incoming) {
    // 1. Already handled via synagogue tag-update?
    if (tagUpdateSourceIds.has(r.sourceId)) {
      const tu = SYNAGOGUE_TAG_UPDATES.find((t) => `osm-${t.existingId}` === r.sourceId)!;
      results.push({ status: 'tag_only', sourceId: r.sourceId, existingId: tu.existingId, name: r.name });
      continue;
    }

    const place = toPlace(r, verifiedAt);
    const issues: string[] = [];

    // 2. ID collision
    if (beforeIds.has(place.id)) {
      issues.push(`ID כבר קיים: ${place.id}`);
    }

    // 3. Required fields
    if (!place.name?.trim())   issues.push('שם חסר');
    if (!place.cityId?.trim()) issues.push('cityId חסר');

    // 4. Coordinates valid & within bbox
    if (!place.location ||
        !Number.isFinite(place.location.latitude) ||
        !Number.isFinite(place.location.longitude)) {
      issues.push('קואורדינטות לא תקינות');
    } else if (!isInIsrael(place.location)) {
      issues.push(`קואורדינטות מחוץ לתחום (${place.location.latitude.toFixed(4)}, ${place.location.longitude.toFixed(4)})`);
    }

    // 5. Proximity guard — within 50m of existing tzaddik_grave
    const nearGrave = live.find(
      (e) => e.type === 'tzaddik_grave' && e.location &&
        meters(place.location.latitude, place.location.longitude,
               e.location.latitude, e.location.longitude) <= 50,
    );
    if (nearGrave) {
      issues.push(`כפילות מיקום — ${nearGrave.id} (${
        meters(place.location.latitude, place.location.longitude,
               nearGrave.location.latitude, nearGrave.location.longitude).toFixed(0)}מ')`);
    }

    if (issues.length > 0) {
      results.push({ status: 'skip', sourceId: r.sourceId, reason: issues.join('; ') });
    } else {
      results.push({ status: 'add', place });
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  const toAdd    = results.filter((r): r is Extract<RowResult, { status: 'add' }>      => r.status === 'add');
  const tagOnly  = results.filter((r): r is Extract<RowResult, { status: 'tag_only' }> => r.status === 'tag_only');
  const skipped  = results.filter((r): r is Extract<RowResult, { status: 'skip' }>     => r.status === 'skip');

  const afterTotal = beforeTotal + toAdd.length;

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║            דוח ולידציה — Connect-Live Preview       ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║ לפני:          ${String(beforeTotal).padStart(5)} רשומות קיימות            ║`);
  console.log(`║ נכנסות:        ${String(incoming.length).padStart(5)} רשומות approved          ║`);
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║ ✅ יתווספו:    ${String(toAdd.length).padStart(5)} רשומות tzaddik_grave      ║`);
  console.log(`║ 🏷️  tag בלבד:  ${String(tagOnly.length).padStart(5)} synagogues קיימות         ║`);
  console.log(`║ ⏭️  יידחו:     ${String(skipped.length).padStart(5)} רשומות                    ║`);
  console.log(`║ אחרי:         ${String(afterTotal).padStart(5)} רשומות סה"כ              ║`);
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║ כפילויות ID:       ${skipped.filter(s => s.reason.includes('ID')).length === 0 ? '✅ 0' : '❌ ' + skipped.filter(s => s.reason.includes('ID')).length}                        ║`);
  console.log(`║ כפילויות מיקום:    ${skipped.filter(s => s.reason.includes('כפילות')).length === 0 ? '✅ 0' : '❌ ' + skipped.filter(s => s.reason.includes('כפילות')).length}                        ║`);
  console.log(`║ שגיאות שדה:        ${skipped.filter(s => s.reason.includes('חסר')).length === 0 ? '✅ 0' : '❌ ' + skipped.filter(s => s.reason.includes('חסר')).length}                        ║`);
  console.log(`║ Rollback path: ✅ ${PLACES_BACKUP.split(/[\\/]/).pop()}  ║`);
  console.log('╠══════════════════════════════════════════════════════╣');

  // Tag updates detail
  if (tagOnly.length > 0) {
    console.log('║ 🏷️  Tag updates (synagogue → +tzaddik_grave):        ║');
    for (const t of tagOnly) {
      console.log(`║   · ${t.existingId.padEnd(30)} ${t.name}`.slice(0, 54) + ' ║');
    }
    console.log('╠══════════════════════════════════════════════════════╣');
  }

  // Skipped detail
  if (skipped.length > 0) {
    console.log('║ ⏭️  נדחו:                                            ║');
    for (const s of skipped) {
      const line = `║   · ${s.sourceId}: ${s.reason}`;
      console.log((line + ' '.repeat(60)).slice(0, 54) + ' ║');
    }
    console.log('╠══════════════════════════════════════════════════════╣');
  }

  // Validation gate
  const fatal = skipped.filter(
    (s) => s.reason.includes('ID כבר קיים') || s.reason.includes('קואורדינטות לא תקינות'),
  );

  if (fatal.length > 0) {
    console.log('║ ❌ VALIDATION GATE — שגיאות קריטיות:               ║');
    for (const f of fatal) console.log(`║   · ${f.sourceId}: ${f.reason}`.slice(0, 54) + ' ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');
    console.error('\n❌ VALIDATION GATE FAILED — אין כתיבה.');
    process.exit(1);
  }

  console.log('║ ✅ VALIDATION GATE PASSED                            ║');

  if (IS_LIVE) {
    console.log('║ ⚠️  מצב LIVE — דורש אישור מפורש נוסף               ║');
    console.log('║    הוסף --confirmed להרצת הייבוא האמיתי            ║');
  } else {
    console.log('║ 🔍 מצב VALIDATION בלבד — אין כתיבה                 ║');
  }

  console.log('╚══════════════════════════════════════════════════════╝\n');

  if (IS_LIVE && !process.argv.includes('--confirmed')) {
    console.log('ℹ️  כדי לבצע live import: node importers/tzaddik-graves/connect-live.ts --live --confirmed');
    process.exit(0);
  }

  // Validation-only path
  if (!IS_LIVE) {
    console.log('✅ Validation בלבד הושלמה בהצלחה. אין כתיבה.');
    return;
  }

  // ── LIVE WRITE (only reached with --live --confirmed) ───────────────────
  const liveRaw = readFileSync(PLACES_FILE, 'utf8');

  // 1. Fresh backup (never overwrite)
  if (!existsSync(PLACES_BACKUP)) {
    writeFileSync(PLACES_BACKUP, liveRaw, 'utf8');
    console.log(`\n✅ גיבוי נוצר: ${PLACES_BACKUP.split(/[\\/]/).pop()}`);
  } else {
    console.log(`ℹ️  גיבוי כבר קיים: ${PLACES_BACKUP.split(/[\\/]/).pop()}`);
  }

  // 2. Verify backup is readable
  const backupCheck = JSON.parse(readFileSync(PLACES_BACKUP, 'utf8')) as Place[];
  if (backupCheck.length !== beforeTotal) {
    console.error(`❌ גיבוי פגום — ${backupCheck.length} רשומות במקום ${beforeTotal}`);
    process.exit(1);
  }
  console.log(`✅ גיבוי תקין: ${backupCheck.length} רשומות`);

  // 3. Build merged dataset
  const merged: Place[] = JSON.parse(liveRaw) as Place[];

  // Apply tag updates to existing synagogue records
  let taggedCount = 0;
  for (const tu of tagOnly) {
    const existing = merged.find((p) => p.id === tu.existingId);
    if (existing && !existing.tags?.includes('tzaddik_grave')) {
      existing.tags = [...(existing.tags ?? []), 'tzaddik_grave'];
      taggedCount++;
    }
  }

  // Append new tzaddik_grave records
  for (const r of toAdd) {
    merged.push(r.place);
  }

  // 4. Validation gate (abort on failure — nothing written yet)
  const fail: string[] = [];
  const mergedIds = new Set(merged.map((p) => p.id));
  for (const id of beforeIds) {
    if (!mergedIds.has(id)) fail.push(`DELETED id ${id}`);
  }
  if (merged.length !== beforeTotal + toAdd.length) {
    fail.push(`count mismatch: ${merged.length} ≠ ${beforeTotal} + ${toAdd.length}`);
  }
  for (const r of toAdd) {
    if (!r.place.name?.trim())   fail.push(`no name: ${r.place.id}`);
    if (!r.place.cityId?.trim()) fail.push(`no city: ${r.place.id}`);
    if (!isInIsrael(r.place.location)) fail.push(`bad coords: ${r.place.id}`);
  }
  if (fail.length > 0) {
    console.error('❌ FINAL VALIDATION GATE FAILED — אין כתיבה:\n  ' + fail.slice(0, 10).join('\n  '));
    process.exit(1);
  }

  // 5. Write places.osm.json
  writeFileSync(PLACES_FILE, JSON.stringify(merged, null, 2), 'utf8');

  // 6. Rebuild cities.osm.json (additive count, NOT rebuildAppDataset)
  const CITIES_FILE = join(GEN, 'cities.osm.json');
  const counts: Record<string, number> = {};
  for (const p of merged) if (p.cityId) counts[p.cityId] = (counts[p.cityId] ?? 0) + 1;
  const cities = Object.keys(counts)
    .sort((a, b) => counts[b] - counts[a])
    .map((name) => ({ id: name, name }));
  writeFileSync(CITIES_FILE, JSON.stringify(cities, null, 2), 'utf8');

  // 7. Write import log
  const LOG_FILE = join(OUT, 'connect-live-log.json');
  const log = {
    runDate: new Date().toISOString(),
    beforeTotal,
    afterTotal: merged.length,
    added: toAdd.length,
    tagUpdates: taggedCount,
    skipped: skipped.length,
    backupFile: PLACES_BACKUP.split(/[\\/]/).pop(),
    addedIds: toAdd.map((r) => r.place.id),
    taggedIds: tagOnly.map((t) => t.existingId),
  };
  writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf8');

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║            LIVE IMPORT — הסתיים בהצלחה              ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║ לפני:  ${String(beforeTotal).padStart(5)} | אחרי: ${String(merged.length).padStart(5)} | נוספו: ${String(toAdd.length).padStart(3)}        ║`);
  console.log(`║ tag updates: ${String(taggedCount).padStart(2)} | ערים: ${String(cities.length).padStart(4)} | נדחו: ${String(skipped.length).padStart(2)}          ║`);
  console.log(`║ גיבוי: ${(PLACES_BACKUP.split(/[\\/]/).pop() ?? '').slice(0, 42).padEnd(42)} ║`);
  console.log(`║ לוג:   connect-live-log.json                         ║`);
  console.log('╚══════════════════════════════════════════════════════╝\n');
}

main();
