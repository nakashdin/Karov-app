/**
 * Read-only CLI: what would overwriting a category file (e.g.
 * restaurants.osm.json) with a given candidate array do to its live content
 * right now?
 *
 * Writes nothing. Unlike `data:rebuild-plan`, this cannot be fully offline
 * on its own — a category importer's real candidate comes from a live
 * network fetch (e.g. OSM Overpass), which running the importer already
 * reports on every invocation (see kosher-restaurants/importer.ts). What
 * this CLI buys instead: replaying a candidate that already blocked, or
 * diffing two candidates against each other, from a JSON file on disk —
 * reachable by a human at a terminal without hitting the network again.
 *
 * Run: npm run data:category-plan -- --file restaurants.osm.json --candidate path/to/candidate.json
 */
import { readFileSync } from 'node:fs';
import { formatCategoryOverwriteReport, planCategoryOverwrite, type StoredPlace } from './database.ts';

const args = process.argv.slice(2);
const file = args.includes('--file') ? args[args.indexOf('--file') + 1] : undefined;
const candidatePath = args.includes('--candidate') ? args[args.indexOf('--candidate') + 1] : undefined;

if (!file || !candidatePath) {
  console.error('Usage: npm run data:category-plan -- --file <categoryFile> --candidate <path-to-json>');
  console.error('  --file       category file name under src/data/generated/, e.g. restaurants.osm.json');
  console.error('  --candidate  path to a JSON file containing the candidate array to compare against it');
  process.exit(2);
}

const candidate: unknown = JSON.parse(readFileSync(candidatePath, 'utf8'));
if (!Array.isArray(candidate)) {
  console.error(`--candidate file must contain a JSON array; got ${typeof candidate}`);
  process.exit(2);
}

const report = planCategoryOverwrite(file, candidate as StoredPlace[]);

console.log(`\n=== category-overwrite impact report for ${file} (READ-ONLY) ===\n`);
console.log(formatCategoryOverwriteReport(report));
console.log(
  report.blocked
    ? '\n⛔ BLOCKED — writeCategoryGuarded() would refuse to write in this state.\n'
    : '\n✓ all guards pass — this overwrite would be non-destructive.\n',
);

process.exit(report.blocked ? 1 : 0);
