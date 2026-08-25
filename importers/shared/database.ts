/**
 * The importers' "sink": where normalized records land on disk.
 *
 * Each source keeps its own raw category file so a single category can be
 * re-imported without re-fetching the others.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⛔  `rebuildAppDataset()` NO LONGER WRITES BY DEFAULT.
 *
 * It used to reconstruct src/data/generated/places.osm.json from the per-TYPE
 * category files below. That model is wrong and destructive: the world is
 * "many sources per type", the category files only ever covered a handful of
 * them, and 68 other programs append to places.osm.json directly. Rebuilding
 * from the category files therefore DELETES every record that did not come
 * through one — measured at 4,544 of 7,471 records (60.8%) — and `toAppPlace`
 * additionally strips kashrut, website, description and provenance from every
 * survivor.
 *
 * The function is kept (it is the seed of the future v2 rebuild, and its
 * comparison logic is the audit) but it now:
 *   1. computes the candidate output WITHOUT writing,
 *   2. diffs it against the live dataset,
 *   3. runs hard guards (volume / dropped types / dropped ids / stripped fields),
 *   4. refuses to write unless the caller has explicitly opted in AND every
 *      guard passes.
 *
 * Use `planAppDatasetRebuild()` for the read-only report. See
 * docs/DATA_ARCHITECTURE.md §6 for the replacement architecture.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { writeFileSync, readFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ImportType, NormalizedPlace } from './types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
export const GENERATED_DIR = join(HERE, '..', '..', 'src', 'data', 'generated');
const BACKUP_DIR = join(HERE, '..', '..', 'data-backups', 'rebuild-guard');

/** Per-source raw output, one file per category. */
export const CATEGORY_FILES: Record<ImportType, string> = {
  synagogue: 'synagogues.osm.json',
  restaurant: 'restaurants.osm.json',
  fast_food: 'fast-food.chains.json',
  cafe: 'cafes.chains.json',
  coffee_cart: 'coffee-carts.chains.json',
  mikveh: 'mikvahs.datagov.json',
};

/** Place types the legacy rebuild understands. NOT the app's full type list. */
const APP_TYPES: ImportType[] = ['synagogue', 'restaurant', 'fast_food', 'cafe', 'coffee_cart', 'mikveh'];

/**
 * Opt-in required before the legacy rebuild may touch the live dataset.
 * Deliberately verbose: it must be impossible to set by accident.
 */
const OPT_IN_ENV = 'KAROV_ALLOW_DESTRUCTIVE_REBUILD';

/** A record shaped like the app's Place, as stored in places.osm.json. */
type StoredPlace = Record<string, unknown> & { id?: unknown; type?: unknown };

export function writeJson(file: string, data: unknown): string {
  mkdirSync(GENERATED_DIR, { recursive: true });
  const path = join(GENERATED_DIR, file);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
  return path;
}

export function readJson<T>(file: string, fallback: T): T {
  const path = join(GENERATED_DIR, file);
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

/** Map an importer record onto the app's `Place` JSON shape. */
function toAppPlace(p: NormalizedPlace): Record<string, unknown> {
  const place: Record<string, unknown> = {
    id: p.id,
    name: p.name,
    type: p.type,
    cityId: p.cityId,
    address: p.address,
    location: p.location,
    source: p.source === 'osm' ? 'osm' : p.source === 'datagov' ? 'manual' : 'seed',
  };
  if (p.phone) place.phone = p.phone;
  if (p.openingHours) place.openingHours = p.openingHours;
  if (p.tags?.length) place.tags = p.tags;
  return place;
}

/** One safety check, and whether the candidate output passed it. */
export interface RebuildGuard {
  name: string;
  passed: boolean;
  detail: string;
}

/** Full, read-only account of what a legacy rebuild WOULD do. */
export interface RebuildReport {
  live: { places: number; cities: number };
  candidate: { places: number; cities: number };
  /** candidate − live. Negative means records would be destroyed. */
  recordDelta: number;
  /** Types present live that the candidate does not produce at all. */
  typesDropped: Record<string, number>;
  /** Ids present live and absent from the candidate. */
  idsDropped: number;
  /** Field names present on live records that the candidate never emits. */
  fieldsStripped: string[];
  guards: RebuildGuard[];
  blocked: boolean;
  written: boolean;
}

/** Build the candidate dataset in memory. Pure: reads files, writes nothing. */
function buildCandidate(): { records: NormalizedPlace[]; cities: { id: string; name: string }[] } {
  const merged: NormalizedPlace[] = [];
  for (const type of APP_TYPES) {
    merged.push(...readJson<NormalizedPlace[]>(CATEGORY_FILES[type], []));
  }

  const byId = new Map<string, NormalizedPlace>();
  for (const p of merged) {
    if (APP_TYPES.includes(p.type) && !byId.has(p.id)) byId.set(p.id, p);
  }
  const records = [...byId.values()];

  const counts: Record<string, number> = {};
  for (const p of records) if (p.cityId) counts[p.cityId] = (counts[p.cityId] || 0) + 1;
  const cities = Object.keys(counts)
    .sort((a, b) => counts[b] - counts[a])
    .map((name) => ({ id: name, name }));

  return { records, cities };
}

/**
 * Read-only: what would a legacy rebuild do to the live dataset right now?
 *
 * Never writes, never throws on a failing guard — it reports. This is the
 * function to call from a CLI or a test.
 */
export function planAppDatasetRebuild(): RebuildReport {
  const { records, cities } = buildCandidate();
  const candidatePlaces = records.map(toAppPlace);

  const livePlaces = readJson<StoredPlace[]>('places.osm.json', []);
  const liveCities = readJson<{ id: string; name: string }[]>('cities.osm.json', []);

  const liveIds = new Set(livePlaces.map((p) => String(p.id)));
  const candIds = new Set(candidatePlaces.map((p) => String(p.id)));
  const idsDropped = [...liveIds].filter((id) => !candIds.has(id)).length;

  const liveTypeCounts: Record<string, number> = {};
  for (const p of livePlaces) {
    const t = String(p.type ?? '(none)');
    liveTypeCounts[t] = (liveTypeCounts[t] || 0) + 1;
  }
  const candTypes = new Set(candidatePlaces.map((p) => String(p.type)));
  const typesDropped: Record<string, number> = {};
  for (const [t, n] of Object.entries(liveTypeCounts)) {
    if (!candTypes.has(t)) typesDropped[t] = n;
  }

  const liveFields = new Set<string>();
  for (const p of livePlaces) for (const k of Object.keys(p)) liveFields.add(k);
  const candFields = new Set<string>();
  for (const p of candidatePlaces) for (const k of Object.keys(p)) candFields.add(k);
  const fieldsStripped = [...liveFields].filter((f) => !candFields.has(f)).sort();

  const recordDelta = candidatePlaces.length - livePlaces.length;
  const ratio = livePlaces.length === 0 ? 1 : candidatePlaces.length / livePlaces.length;

  const guards: RebuildGuard[] = [
    {
      name: 'volume',
      passed: ratio >= 0.95,
      detail: `candidate ${candidatePlaces.length} vs live ${livePlaces.length} (${(ratio * 100).toFixed(1)}% — floor is 95%)`,
    },
    {
      name: 'no-dropped-types',
      passed: Object.keys(typesDropped).length === 0,
      detail:
        Object.keys(typesDropped).length === 0
          ? 'every live place type is still produced'
          : `would erase ${Object.entries(typesDropped).map(([t, n]) => `${t}=${n}`).join(', ')}`,
    },
    {
      name: 'no-dropped-ids',
      passed: idsDropped === 0,
      detail: idsDropped === 0 ? 'no live id disappears' : `${idsDropped} live ids absent from the candidate`,
    },
    {
      name: 'no-stripped-fields',
      passed: fieldsStripped.length === 0,
      detail:
        fieldsStripped.length === 0
          ? 'no field is lost'
          : `${fieldsStripped.length} fields lost on every survivor: ${fieldsStripped.join(', ')}`,
    },
  ];

  return {
    live: { places: livePlaces.length, cities: liveCities.length },
    candidate: { places: candidatePlaces.length, cities: cities.length },
    recordDelta,
    typesDropped,
    idsDropped,
    fieldsStripped,
    guards,
    blocked: guards.some((g) => !g.passed),
    written: false,
  };
}

/** Human-readable rendering of a report, for CLIs and error messages. */
export function formatRebuildReport(r: RebuildReport): string {
  const lines = [
    `live      : ${r.live.places} places · ${r.live.cities} cities`,
    `candidate : ${r.candidate.places} places · ${r.candidate.cities} cities`,
    `delta     : ${r.recordDelta >= 0 ? '+' : ''}${r.recordDelta} records`,
    '',
    'guards:',
    ...r.guards.map((g) => `  ${g.passed ? 'PASS' : 'FAIL'}  ${g.name.padEnd(20)} ${g.detail}`),
  ];
  return lines.join('\n');
}

/**
 * Legacy rebuild. **Refuses to write** unless the caller has explicitly opted
 * in via the `KAROV_ALLOW_DESTRUCTIVE_REBUILD=1` environment variable AND every
 * guard in `planAppDatasetRebuild()` passes.
 *
 * Throws (rather than returning quietly) on refusal, so a script that expects
 * to have rebuilt the dataset cannot carry on believing it did.
 */
export function rebuildAppDataset(): RebuildReport {
  const report = planAppDatasetRebuild();

  if (process.env[OPT_IN_ENV] !== '1') {
    throw new Error(
      'rebuildAppDataset() is disabled — it would overwrite the live dataset.\n\n' +
        formatRebuildReport(report) +
        `\n\nThis rebuild reconstructs places.osm.json from the per-type category files only.\n` +
        'Records written directly by any other importer are not in those files and would be lost.\n' +
        `Read-only report: planAppDatasetRebuild() (npm run data:rebuild-plan).\n` +
        `To override anyway: ${OPT_IN_ENV}=1 — and every guard above must still pass.`,
    );
  }

  if (report.blocked) {
    throw new Error(
      `rebuildAppDataset() blocked by ${report.guards.filter((g) => !g.passed).length} failing guard(s).\n\n` +
        formatRebuildReport(report) +
        '\n\nThe opt-in env var does not bypass guards. Fix the inputs, or use the ' +
        'unified per-source rebuild (docs/DATA_ARCHITECTURE.md §6).',
    );
  }

  // Guards passed and the caller opted in: back up, then write.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = join(BACKUP_DIR, stamp);
  mkdirSync(dest, { recursive: true });
  for (const f of ['places.osm.json', 'cities.osm.json']) {
    const src = join(GENERATED_DIR, f);
    if (existsSync(src)) copyFileSync(src, join(dest, f));
  }

  const { records, cities } = buildCandidate();
  writeJson('places.osm.json', records.map(toAppPlace));
  writeJson('cities.osm.json', cities);

  return { ...report, written: true };
}
