/**
 * Offline demo — proves the unified pipeline runs end-to-end with no network
 * and no writes to production. Run it directly:
 *
 *   node importers/unified/example/run-demo.ts
 *
 * It feeds the in-memory test adapter (3 fixtures) through the orchestrator in
 * DRY-RUN mode, with one existing candidate so the first fixture is detected as
 * an enrichable duplicate. Output is a console report only.
 */
import { isMain } from '../../shared/utils.ts';
import type { SourceRegistryEntry } from '../schema/source-registry.ts';
import type { DuplicateCandidate } from '../pipeline/duplicate-detection.ts';
import { runImport } from '../orchestrator.ts';
import { InMemoryTestAdapter, TEST_ADAPTER_ID } from '../adapters/in-memory-test-adapter.ts';

const NOW = '2026-06-18T09:00:00.000Z';

/** A registry entry for the fake source (status active so a run is legal). */
const SOURCE: SourceRegistryEntry = {
  id: 'test:in-memory',
  displayName: 'In-memory test source',
  kind: 'manual',
  adapterId: TEST_ADAPTER_ID,
  status: 'active',
  produces: ['synagogue'],
  license: { id: 'unknown', attributionRequired: false },
  trust: 0.5,
};

/**
 * One existing record at the exact spot of fixture #1, missing phone/nusach and
 * with a thin address — so the importer classifies fixture #1 as a `match` that
 * could enrich phone + nusach + address.
 */
const CANDIDATES: DuplicateCandidate[] = [
  {
    id: 'osm-node-1',
    name: 'בית הכנסת הגדול',
    type: 'synagogue',
    location: { latitude: 32.0853, longitude: 34.7818 },
    address: 'בית הכנסת הגדול', // thin (== name) → address is enrichable
    source: 'osm',
  },
];

async function main(): Promise<void> {
  const result = await runImport(new InMemoryTestAdapter(), {
    source: SOURCE,
    batchId: 'demo-batch-001',
    now: NOW,
    dryRun: true,
    geocode: true, // exercises the geocoding step (NullGeocoder → unresolved, offline)
    candidates: CANDIDATES,
  });

  console.log('\n========== UNIFIED IMPORTER — DRY RUN ==========');
  console.log(`batch: ${result.batch.id}  dryRun: ${result.dryRun}  note: ${result.batch.note}`);
  console.log('\nstats:');
  for (const [k, v] of Object.entries(result.stats)) console.log(`  ${k}: ${v}`);

  console.log(`\nreview queue (${result.reviewQueue.length}):`);
  for (const item of result.reviewQueue) {
    const dup = item.staged.duplicate;
    console.log(
      `  • "${item.name}" — ${item.reason} (dup=${item.duplicateClass}` +
        `, matched="${dup?.matchedName}", enrich=[${(dup?.enrichableFields ?? []).join(', ')}])`,
    );
  }

  console.log(`\nauto-approvable (${result.autoApprovable.length}):`);
  for (const s of result.autoApprovable) console.log(`  • "${s.record.name}" (${s.status})`);

  console.log(`\nrejected (${result.rejected.length}):`);
  for (const s of result.rejected) {
    const reason = s.history.at(-1)?.reason;
    console.log(`  • "${s.record.name || '(blank)'}" — ${reason}`);
  }

  // Sanity assertions — make the demo fail loudly if the wiring breaks.
  const ok =
    result.stats.normalized === 3 &&
    result.stats.rejected === 1 &&
    result.reviewQueue.length === 1 &&
    result.autoApprovable.length === 1 &&
    result.reviewQueue[0]?.reason === 'enrich';
  console.log(`\nself-check: ${ok ? 'PASS ✓' : 'FAIL ✗'}`);
  if (!ok) process.exitCode = 1;
}

if (isMain(import.meta.url)) {
  void main();
}
