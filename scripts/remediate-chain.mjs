/**
 * Item 4 Unit 3 — the ONE entry point for every chain remediation, wired to
 * the shared pipeline (scripts/shared/kashrut-pipeline.mjs) and a per-chain
 * adapter (scripts/shared/adapters/*.mjs). Replaces the earlier one-script-
 * per-chain shape (remediate-rebar-55.mjs) going forward — that file is kept
 * as-is, unmodified, as the historical record of what commit 880e48d
 * actually shipped; it is not deleted and not re-run.
 *
 * DRY RUN BY DEFAULT. Always prints the full plan. Only writes when called
 * with --apply — same structural gate as every other Item 4 write path: the
 * write is reachable ONLY inside the terminal `else` branch of an
 * `if (!apply) {...} else if (writes.length === 0) {...} else {...}` chain.
 * Creates a timestamped backup of both dataset files before writing.
 *
 * Usage:
 *   node scripts/remediate-chain.mjs --chain=rebar            # dry-run
 *   node scripts/remediate-chain.mjs --chain=greg              # dry-run
 *   node scripts/remediate-chain.mjs --chain=greg --apply       # writes, with backup
 *   node scripts/remediate-chain.mjs --chain=rebar --places=<path> --restaurants=<path>   # point at a snapshot instead of the live dataset (used by the pipeline-reproduction check)
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runPipeline, applyPipelineWrites, readNoBom, writeNoBom, fieldsSnapshot } from './shared/kashrut-pipeline.mjs';
import * as rebarAdapter from './shared/adapters/rebar-adapter.mjs';
import * as gregAdapter from './shared/adapters/greg-adapter.mjs';
import { REBAR_RESOLUTIONS } from './shared/adapters/rebar-resolutions.mjs';
import { GREG_RESOLUTIONS } from './shared/adapters/greg-resolutions.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const CHAINS = {
  rebar: {
    adapter: rebarAdapter,
    isInChain: (r) => typeof r.id === 'string' && r.id.startsWith(rebarAdapter.CHAIN_ID_PREFIX),
    resolutions: REBAR_RESOLUTIONS,
  },
  greg: {
    adapter: gregAdapter,
    // Scoped to exactly the 38 records Unit 3 flagged (kosherType value
    // "mehadrin" — the fabricated-level population), NOT every greg-* record.
    // 3 other greg-* records already carry the values "rabanut"/"regular"/
    // "rabbinate" for kosherType/kosherLevel/kosherAuthorityGroup
    // respectively, with no sourceUrl/certifiedBy of their own — outside this run's scope
    // even though the current pipeline, run against them, would rewrite
    // them too (found live, not theorized: it does). Flagged separately,
    // deliberately not included here — narrowing scope to what was actually
    // asked, not silently expanding it because the code technically could.
    isInChain: (r) => typeof r.id === 'string' && r.id.startsWith(gregAdapter.CHAIN_ID_PREFIX) && r.kosherType === 'mehadrin',
    resolutions: GREG_RESOLUTIONS,
  },
};

function parseArgs(argv) {
  const args = { apply: false };
  for (const a of argv) {
    if (a === '--apply') args.apply = true;
    else if (a.startsWith('--chain=')) args.chain = a.slice('--chain='.length);
    else if (a.startsWith('--places=')) args.placesPath = a.slice('--places='.length);
    else if (a.startsWith('--restaurants=')) args.restaurantsPath = a.slice('--restaurants='.length);
  }
  return args;
}

export async function main({ chain, placesPath, restaurantsPath, backupRoot, apply, fetchImpl }) {
  const def = CHAINS[chain];
  if (!def) {
    throw new Error(`remediate-chain: unknown --chain=${JSON.stringify(chain)}. Known chains: ${Object.keys(CHAINS).join(', ')}.`);
  }

  const places = readNoBom(placesPath);
  const restaurants = readNoBom(restaurantsPath);

  const result = await runPipeline({
    fetchBranches: () => def.adapter.fetchBranches(fetchImpl),
    places,
    restaurants,
    isInChain: def.isInChain,
    apply,
    chainName: chain,
    resolutions: def.resolutions,
  });

  for (const line of result.report) console.log(line);

  if (result.outcome === 'SOURCE_UNREACHABLE') {
    console.log(`\nSOURCE_UNREACHABLE — nothing written. ${result.error}`);
    return result;
  }

  console.log(`\n=== ${chain}: summary ===`);
  const byOutcome = new Map();
  for (const pr of result.perRecord) byOutcome.set(pr.outcome, (byOutcome.get(pr.outcome) ?? 0) + 1);
  for (const [outcome, n] of byOutcome) console.log(`  ${outcome}: ${n}`);

  if (!apply) {
    console.log(
      result.writes.length > 0
        ? `\n(dry run — nothing written. ${result.writes.length} record(s) would be written. Re-run with --apply to write.)\n`
        : '\n(dry run — nothing to write.)\n',
    );
  } else if (result.writes.length === 0) {
    console.log('\nNothing to write.\n');
  } else {
    const backupDir = join(backupRoot, 'data-backups', `remediate-${chain}-pipeline`);
    mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    copyFileSync(placesPath, join(backupDir, `places.osm.${stamp}.json`));
    copyFileSync(restaurantsPath, join(backupDir, `restaurants.osm.${stamp}.json`));

    const { newPlaces, newRestaurants } = applyPipelineWrites(places, restaurants, result.writes, result.runDate);
    writeNoBom(placesPath, newPlaces);
    writeNoBom(restaurantsPath, newRestaurants);

    console.log(`\n✓ remediated ${result.writes.length} record(s) in ${placesPath} and ${restaurantsPath}.`);
    console.log(`  backup: ${backupDir}\n`);
  }

  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  await main({
    chain: args.chain,
    placesPath: args.placesPath ? resolve(args.placesPath) : resolve(root, 'src/data/generated/places.osm.json'),
    restaurantsPath: args.restaurantsPath ? resolve(args.restaurantsPath) : resolve(root, 'src/data/generated/restaurants.osm.json'),
    backupRoot: root,
    apply: args.apply,
  });
}

export { fieldsSnapshot };
