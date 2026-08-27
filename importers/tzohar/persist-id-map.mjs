/**
 * Persist our-record-id -> Tzohar's own stable id, once Stage 2 has matched
 * them, so future runs are exact rather than re-doing fuzzy matching every
 * time. Per the Architect's ruling (2026-08-26): additive, touches nothing
 * existing, does not need the owner — but does NOT live under
 * src/data/generated/ (that ships in the web bundle and is the dataset the
 * guard apparatus protects). This is operational metadata about OUR
 * matching, not app data and not evidence, so it lives in
 * scripts/reports/tzohar-id-map.json, the same class of file as the
 * registry and other audit output.
 *
 * NEVER silently overwrites an existing mapping. If a record's newly
 * matched tzoharId differs from what's already on file, that is a signal
 * (the live feed changed, or a prior match was wrong) — reported loudly and
 * left untouched, not corrected automatically. Re-confirming the SAME
 * tzoharId is not a signal and updates the record's cert-URL/score/
 * timestamp in place.
 *
 * computeMappingUpdate() is the pure core (no I/O, testable directly);
 * the CLI below is a thin wrapper doing only reads/writes.
 *
 * Usage:
 *   node importers/tzohar/persist-id-map.mjs --input <live-feed.json> [--dry]
 *   node importers/tzohar/persist-id-map.mjs --sweep [--dry]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sweepIsrael } from './store-search.mjs';
import { matchTzoharRecord } from '../../scripts/shared/tzohar-identity-match.mjs';
import { isMain } from '../shared/utils.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DEFAULT_PLACES_PATH = resolve(ROOT, 'src/data/generated/places.osm.json');
export const DEFAULT_MAP_PATH = resolve(ROOT, 'scripts/reports/tzohar-id-map.json');

/**
 * Pure: given our records, the live feed, and any existing mapping, compute
 * the next mapping state and a summary. Never mutates its inputs, never
 * touches a file. today defaults to real "now" but is injectable for
 * deterministic tests.
 */
export function computeMappingUpdate(ourRecords, liveEntries, existingMap = {}, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const nextMap = { ...existingMap };
  let added = 0, refreshed = 0, conflicts = 0, notMatched = 0;
  const conflictDetails = [];
  const matchDetails = [];

  for (const our of ourRecords) {
    const result = matchTzoharRecord(our, liveEntries);
    if (result.status !== 'matched') { notMatched++; continue; }

    const entry = result.matchedEntry;
    const existing = existingMap[our.id];
    const newRecord = {
      tzoharId: entry.tzoharId,
      matchedName: entry.store,
      matchedAddress: entry.address,
      score: Math.round(result.score * 100) / 100,
      signals: { name: result.breakdown.name, distKm: result.breakdown.distKm, phone: result.breakdown.phone },
      certUrlAtMatchTime: entry.certUrl,
      matchedAt: today,
    };

    if (!existing) {
      nextMap[our.id] = newRecord;
      added++;
      matchDetails.push({ ourId: our.id, kind: 'added' });
    } else if (existing.tzoharId === entry.tzoharId) {
      nextMap[our.id] = newRecord;
      refreshed++;
      matchDetails.push({ ourId: our.id, kind: 'refreshed' });
    } else {
      conflicts++;
      const detail = { ourId: our.id, ourName: our.name, storedTzoharId: existing.tzoharId, newlyMatchedTzoharId: entry.tzoharId, storedCertUrl: existing.certUrlAtMatchTime, newCertUrl: entry.certUrl };
      conflictDetails.push(detail);
      matchDetails.push({ ourId: our.id, kind: 'conflict' });
      // nextMap[our.id] intentionally left as the pre-existing entry — never silently overwritten.
    }
  }

  return { nextMap, added, refreshed, conflicts, notMatched, conflictDetails, matchDetails };
}

// ── CLI (I/O only) ──────────────────────────────────────────────────────
if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  const inputPath = args.includes('--input') ? args[args.indexOf('--input') + 1] : null;
  const doSweep = args.includes('--sweep');
  const dry = args.includes('--dry');
  const mapPath = args.includes('--map-path') ? resolve(args[args.indexOf('--map-path') + 1]) : DEFAULT_MAP_PATH;
  const placesPath = args.includes('--places-path') ? resolve(args[args.indexOf('--places-path') + 1]) : DEFAULT_PLACES_PATH;

  if (!inputPath && !doSweep) {
    console.error('Usage: node importers/tzohar/persist-id-map.mjs --input <file> | --sweep [--dry] [--map-path <file>]');
    process.exit(2);
  }
  if (inputPath && doSweep) {
    console.error('--input and --sweep are mutually exclusive.');
    process.exit(2);
  }

  const readNoBom = (p) => {
    const buf = readFileSync(p);
    const s = (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) ? buf.slice(3) : buf;
    return JSON.parse(s.toString('utf8'));
  };
  const normalizeLiveEntries = (raw) => raw.map((r) => ('tzoharId' in r ? r : {
    tzoharId: String(r.id), store: r.store, address: r.address, city: r.city,
    lat: r.lat !== undefined ? Number(r.lat) : null, lng: r.lng !== undefined ? Number(r.lng) : null,
    phone: r.phone || null, certUrl: r.address2 || null,
  }));

  const places = readNoBom(placesPath);
  const ourRecords = places.filter((p) => p.certifiedBy === 'צהר');

  let liveRaw;
  if (inputPath) {
    liveRaw = readNoBom(resolve(inputPath));
  } else {
    console.log('Sweeping live feed...');
    liveRaw = await sweepIsrael({ stepDeg: 0.25, delayMs: 400, onProgress: ({ index, total }) => { if (index % 30 === 0) console.log(`  ${index}/${total}`); } });
  }
  const liveEntries = normalizeLiveEntries(liveRaw);
  console.log(`Live feed: ${liveEntries.length} entries. Our Tzohar records: ${ourRecords.length}.`);

  const existingMap = existsSync(mapPath) ? JSON.parse(readFileSync(mapPath, 'utf8')) : {};
  const { nextMap, added, refreshed, conflicts, notMatched, conflictDetails } = computeMappingUpdate(ourRecords, liveEntries, existingMap);

  for (const c of conflictDetails) {
    console.log(`  ⚠ CONFLICT ${c.ourId} (${c.ourName}): stored tzoharId ${c.storedTzoharId} != newly matched ${c.newlyMatchedTzoharId} — leaving the existing mapping untouched`);
  }

  console.log(`\n=== Mapping summary ===`);
  console.log(`new mappings added        : ${added}`);
  console.log(`re-confirmed (refreshed)  : ${refreshed}`);
  console.log(`not matched this run      : ${notMatched}`);
  console.log(`CONFLICTS (not applied)   : ${conflicts}`);
  if (conflicts > 0) console.log(`\n${conflicts} conflict(s) require a human decision before the mapping file changes for those ids — listed above and never silently applied.`);

  if (dry) {
    console.log(`\n(--dry: ${mapPath} not written)`);
  } else {
    mkdirSync(dirname(mapPath), { recursive: true });
    writeFileSync(mapPath, JSON.stringify(nextMap, null, 2) + '\n');
    console.log(`\nWritten to ${mapPath} (${Object.keys(nextMap).length} total mappings)`);
  }
}
