/**
 * Read-only CLI: what would the legacy `rebuildAppDataset()` do to the live
 * dataset right now?
 *
 * Writes nothing, fetches nothing. Exits non-zero when any guard fails, so it
 * can be used as a canary in CI: if this ever starts passing, the per-type
 * category files have caught up with the live dataset.
 *
 * Run: npm run data:rebuild-plan
 */
import { formatRebuildReport, planAppDatasetRebuild } from './database.ts';

const report = planAppDatasetRebuild();

console.log('\n=== legacy rebuildAppDataset() impact report (READ-ONLY) ===\n');
console.log(formatRebuildReport(report));

if (Object.keys(report.typesDropped).length > 0) {
  console.log('\nplace types that would be erased entirely:');
  for (const [t, n] of Object.entries(report.typesDropped).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${t.padEnd(20)} ${n}`);
  }
}

if (report.fieldsStripped.length > 0) {
  console.log('\nfields that would be stripped from every surviving record:');
  console.log('  ' + report.fieldsStripped.join(', '));
}

console.log(
  report.blocked
    ? '\n⛔ BLOCKED — rebuildAppDataset() cannot write in this state. This is the expected result today.\n'
    : '\n✓ all guards pass — a rebuild would be non-destructive.\n',
);

process.exit(report.blocked ? 1 : 0);
