/**
 * Phase 17B — V2 rebuild PARITY PROOF (READ-ONLY, PREVIEW).
 *
 * Reconstructs a candidate places dataset from the 38 partition-preview source
 * files (per the dataset-registry preview) and PROVES it is set/content-identical
 * to the current live src/data/generated/places.osm.json:
 *   total count · id-set (no missing / no extra) · deep-equal per id.
 * Order differences (legacy append-order vs the v2 deterministic id-sort) are
 * REPORTED, not treated as a parity failure.
 *
 * Touches NO live data: reads places.osm.json, writes only to
 * importers/unified/output/. Throws (stops) if set/content parity is not exact.
 *
 * Run:  node importers/unified/rebuild-v2-preview.ts
 * Out:  importers/unified/output/rebuild-v2-preview.json
 *       importers/unified/output/rebuild-v2-parity-report.json
 *       importers/unified/output/rebuild-v2-summary.json
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain } from '../shared/utils.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const GEN = join(HERE, '..', '..', 'src', 'data', 'generated');
const PREVIEW = join(HERE, 'output', 'partition-preview');
const OUT = join(HERE, 'output');
const read = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;

interface Place { id: string; [k: string]: unknown; }

/** Deterministic canonical serialization (recursively sorted keys). */
function stable(o: unknown): string {
  if (o === null || typeof o !== 'object') return JSON.stringify(o);
  if (Array.isArray(o)) return '[' + o.map(stable).join(',') + ']';
  return '{' + Object.keys(o as object).sort().map((k) => JSON.stringify(k) + ':' + stable((o as any)[k])).join(',') + '}';
}
const hash = (s: string): string => createHash('sha256').update(s).digest('hex').slice(0, 16);

function run(): void {
  // 1+2) load dataset-registry preview + all 38 source files
  const registry = read<{ sources: { sourceId: string; file: string; recordCount: number }[] }>(join(PREVIEW, 'dataset-registry.preview.json'));
  const perSource: { sourceId: string; records: Place[] }[] = [];
  for (const s of registry.sources) {
    const records = read<Place[]>(join(PREVIEW, s.file));
    if (records.length !== s.recordCount) throw new Error(`source ${s.sourceId}: file has ${records.length}, registry says ${s.recordCount} — STOP`);
    perSource.push({ sourceId: s.sourceId, records });
  }

  // 3) MERGE (the v2 rebuild): concat all sources, reject duplicate ids, then
  //    deterministic stable-sort by id (the v2 canonical order).
  const merged: Place[] = [];
  const seen = new Set<string>();
  const dupIds: string[] = [];
  for (const s of perSource) for (const r of s.records) {
    if (seen.has(r.id)) { dupIds.push(r.id); continue; }
    seen.add(r.id); merged.push(r);
  }
  const candidate = [...merged].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  // 4) load current live dataset
  const current = read<Place[]>(join(GEN, 'places.osm.json'));

  // 5) PROVE parity
  const curIds = new Set(current.map((p) => p.id));
  const candIds = new Set(candidate.map((p) => p.id));
  const missing = [...curIds].filter((id) => !candIds.has(id));         // in current, not in candidate
  const extra = [...candIds].filter((id) => !curIds.has(id));           // in candidate, not in current
  const curById = new Map(current.map((p) => [p.id, p]));

  let deepEqual = 0; const mismatches: { id: string; reason: string }[] = [];
  for (const c of candidate) {
    const cur = curById.get(c.id);
    if (!cur) continue; // handled by `extra`
    if (stable(c) === stable(cur)) deepEqual++;
    else mismatches.push({ id: c.id, reason: 'content differs (canonical deep-equal failed)' });
  }

  // order: candidate (id-sorted) vs current (append-order)
  const orderPositionsMatching = candidate.reduce((n, c, i) => n + (current[i]?.id === c.id ? 1 : 0), 0);
  // exact-order reproduction check: reorder candidate to the legacy id order →
  // is it byte/deep equal at every position? (proves exact file reproduction is possible)
  const reordered = current.map((p) => curById.get(p.id) && candIds.has(p.id) ? candidate.find((c) => c.id === p.id)! : undefined);
  const exactOrderReproducible = reordered.every((r, i) => r && stable(r) === stable(current[i]));

  const parityExact = current.length === candidate.length && missing.length === 0 && extra.length === 0 && mismatches.length === 0 && dupIds.length === 0;

  const parityReport = {
    generatedNote: 'PHASE 17B — V2 rebuild parity proof. READ-ONLY. Live places.osm.json NOT modified.',
    totals: { current: current.length, candidate: candidate.length, equal: current.length === candidate.length },
    idSet: { missingFromCandidate: missing.length, extraInCandidate: extra.length, missingSample: missing.slice(0, 10), extraSample: extra.slice(0, 10) },
    deepEqual: { matched: deepEqual, mismatched: mismatches.length, mismatchSample: mismatches.slice(0, 10) },
    duplicateIdsDuringMerge: dupIds.length,
    serializationOrder: {
      legacyOrder: 'append-order (the live file)', candidateOrder: 'deterministic stable id-sort (v2 canonical)',
      positionsMatching: orderPositionsMatching, ofTotal: current.length,
      note: 'Order DIFFERS by design (v2 canonicalizes to id-sort). This is a serialization/order difference, not a content/parity failure. The app reads Place[] and re-sorts by distance/rating, so order is not runtime-significant.',
      exactOrderReproducible,
      exactOrderNote: exactOrderReproducible ? 'Reordering the candidate to the legacy id-order reproduces the live file deep-equal at every position → exact-file reproduction is possible if ever required.' : 'exact-order reproduction NOT confirmed (investigate).',
    },
    contentHashCanonical: hash(stable(candidate)),
    deterministic: 'contentHashCanonical is a pure function of the source files (no clock/randomness) — re-running reproduces it.',
    parityExact,
    verdict: parityExact ? 'PARITY EXACT — candidate is set+content identical to the live dataset (order canonicalized).' : 'PARITY FAILED — see idSet/deepEqual/duplicates.',
  };

  const summary = {
    generatedNote: 'PHASE 17B — V2 rebuild parity summary. Read-only; no live data touched; rebuildAppDataset NOT switched.',
    sourcesLoaded: perSource.length,
    recordsMerged: merged.length,
    candidateCount: candidate.length,
    currentCount: current.length,
    parityExact,
    missingIds: missing.length, extraIds: extra.length, deepEqualMatched: deepEqual, deepEqualMismatched: mismatches.length, duplicateIds: dupIds.length,
    orderDiffers: orderPositionsMatching !== current.length, exactOrderReproducible,
    contentHash: parityReport.contentHashCanonical,
    conclusion: parityExact
      ? 'V2 rebuild reconstructs the dataset losslessly from the 38 source files: same count, same id-set, every record deep-equal. Safe basis for Phase 17C (safety rails) and a future cutover. Order is canonicalized to a deterministic id-sort (non-runtime-significant); exact legacy-order reproduction is also possible.'
      : 'NOT at parity — do not proceed.',
    dryRun: true, liveDataTouched: false, rebuildSwitched: false,
  };

  writeFileSync(join(OUT, 'rebuild-v2-preview.json'), JSON.stringify(candidate, null, 2), 'utf8');
  writeFileSync(join(OUT, 'rebuild-v2-parity-report.json'), JSON.stringify(parityReport, null, 2), 'utf8');
  writeFileSync(join(OUT, 'rebuild-v2-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('=== Phase 17B V2 rebuild parity proof (read-only) ===');
  console.log(`sources ${perSource.length} | merged ${merged.length} | candidate ${candidate.length} vs current ${current.length}`);
  console.log(`missing ${missing.length} | extra ${extra.length} | deep-equal ${deepEqual}/${candidate.length} | dup-ids ${dupIds.length}`);
  console.log(`order positions matching ${orderPositionsMatching}/${current.length} | exact-order reproducible: ${exactOrderReproducible}`);
  console.log(`contentHash ${parityReport.contentHashCanonical} | PARITY EXACT: ${parityExact}`);

  if (!parityExact) throw new Error('PARITY NOT EXACT — stopping per requirements.');
}

if (isMain(import.meta.url)) run();
