/**
 * Rebar kosher branches importer — REWRITTEN (Item 4 Unit 1, 2026-08-26;
 * matcher rewritten again same day after the Architect's independent
 * re-derivation found both the parser and the original single-nearest-match
 * design unsafe — see scripts/shared/rebar-feed.mjs for both fixes).
 *
 * The original version of this file held a hand-typed array of 53 branches
 * and stamped `kosherType: 'mehadrin'` as an unconditional literal in
 * buildPlace() — no fetch, no per-record evidence, the same value on every
 * single one. Its own header said the list was "filtered by כשר label": a
 * *kosher* label was transcribed as *mehadrin*. See
 * docs/KASHRUT_FACTS.md §5b/§22 for the full history.
 *
 * This version reads Rebar's own live store-locator feed (see
 * scripts/shared/rebar-feed.mjs for the fetch/parse/match core — shared
 * with the separate remediation step for the 53 existing records, so both
 * paths trust the same evidence through the same code, never a duplicate
 * copy of the parsing logic).
 *
 * SCOPE OF THIS SCRIPT: adds records ONLY for feed stores that are
 * kosher:true AND have zero candidate existing records at all (genuinely
 * new — see rebar-feed.mjs's matchRebarStores for what "candidate" means
 * and why it's many-to-one aware). It does NOT touch any existing record's
 * fields; remediating the 53 already-present records is a separate, gated
 * step (Item 4 Unit 2), which now depends on this matcher being correct —
 * three of the existing records surfaced as genuinely AMBIGUOUS (more than
 * one plausible feed match), including rebar-bs-central-station itself.
 *
 * Mapping — the evidence ceiling, and this importer is structurally
 * incapable of exceeding it (no kosherAuthority/certifiedBy field exists
 * anywhere in this file to accidentally set):
 *   kosher:true, zero candidates          -> new record: kosherType:'kosher',
 *                                             kosherLevel:null, kosherAuthorityGroup:'unknown'
 *   confirmed match (exactly one, mutual) -> nothing written here (Unit 2's job);
 *                                             reported, split by the matched store's kosher value
 *   ambiguous (2+ candidates, either side)-> nothing written, reported, NEVER resolved by nearest/address-wins
 *   kosher:false / neither true nor false -> nothing written, reported only
 *
 * Usage:
 *   node scripts/import-rebar.mjs             # dry-run + report (default)
 *   node scripts/import-rebar.mjs --apply      # writes, with backup
 */
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { recordKashrutWrite } from './shared/kashrut-write.mjs';
import { fetchRebarStores, matchRebarStores } from './shared/rebar-feed.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PLACES_PATH = resolve(root, 'src/data/generated/places.osm.json');
const RESTAURANTS_PATH = resolve(root, 'src/data/generated/restaurants.osm.json');
const FEED_URL = 'https://rebar.co.il/our-stores/';
// Computed at call time, never a literal — a hardcoded date here is exactly
// the defect this whole effort exists to fix (see remediate-rebar-55.mjs's
// header: the original importer's `lastVerifiedAt: '2026-07-14'` constant is
// why all 53 records it touched carry an identical, meaningless date). This
// one was ALSO a literal until 2026-08-26, correct only because that was
// today when it was written — every run after today would have silently
// backdated every new record's lastVerifiedAt to a date that never happened,
// undetected by validate-data.mjs's backward-date guard (it only compares
// against a record's PRIOR value at HEAD; a brand-new record has none).
const RUN_DATE = new Date().toISOString().slice(0, 10);

const BASIS = {
  kind: 'human-review',
  note: 'rebar.co.il/our-stores/ store-locator feed: kosher:true for this branch. Feed has no level/authority ' +
    'field anywhere in its key union — verified against the full union across every entry, not a sample.',
};

function readNoBom(p) {
  const buf = readFileSync(p);
  const s = (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) ? buf.slice(3) : buf;
  return JSON.parse(s.toString('utf8'));
}
function writeNoBom(p, data) {
  const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);
  writeFileSync(p, Buffer.concat([BOM, Buffer.from(JSON.stringify(data, null, 2), 'utf8')]));
}

function makeId(name) {
  const hash = createHash('md5').update(name).digest('hex').slice(0, 8);
  return `rebar-${hash}`;
}

function buildNewPlace(store) {
  const place = {
    id: makeId(store.name),
    name: `רי בר rebar ${store.name}`,
    type: 'juice_bar',
    category: 'dairy',
    cityId: store.city,
    address: store.address,
    location: { latitude: store.lat, longitude: store.lng },
    locationPrecision: 'exact',
    website: 'https://rebar.co.il',
    instagram: 'https://www.instagram.com/rebarisrael/',
    source: 'manual',
    sourceUrl: FEED_URL,
    lastVerifiedAt: RUN_DATE,
  };
  recordKashrutWrite(place, 'kosherType', 'kosher', BASIS);
  recordKashrutWrite(place, 'kosherLevel', null, BASIS);
  recordKashrutWrite(place, 'kosherAuthorityGroup', 'unknown', BASIS);
  return place;
}

/**
 * Wrapped in a function (rather than flat top-level script code) instead of
 * using `process.exit()` for control flow. Found necessary on a real run:
 * `process.exit()` tears the process down immediately, before the fetch's
 * keep-alive socket has finished closing — libuv then aborts with
 * "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" and the process
 * exits 127, on a completely successful run. A non-zero exit on success is
 * dangerous specifically in this repo: it reads as failure, inviting a
 * re-run, which for --apply is the one-shot-script-re-applied hazard
 * (docs/AGENTS.md) — arriving disguised as "the first run failed."
 *
 * The write itself (below) is gated by an explicit `if (apply) {...} else`
 * branch, not by an early return/exit — that gate is what actually keeps a
 * dry run from writing anything, independent of any control-flow detail up
 * here. The only `return` in this function is on the fetch-failure path,
 * paired with `process.exitCode = 1` so Node still exits non-zero — just
 * without the forced, premature teardown that produced 127 instead.
 *
 * EXPORTED and PARAMETERIZED specifically so the write path itself can be
 * tested — every earlier test in this file's test suite could only assert
 * NEGATIVES (nothing written, byte-identical, no backup); none of them
 * could prove the write path actually works, because none of them could
 * reach it without touching the real shared dataset. With `placesPath`/
 * `restaurantsPath`/`backupRoot`/`apply` as parameters, a test can point
 * this function at temp files it created itself — the real dataset is
 * never even a candidate value, so it cannot be reached even by a bug in
 * the test, which is stronger than worktree isolation (isolated by
 * discipline) or dry-run-only testing (isolated by never exercising the
 * write at all).
 *
 * DELIBERATELY NO DEFAULTS on any of the four — not even the real paths.
 * A default of "the real dataset" means a test that omits a parameter (a
 * typo, a forgotten arg, a copied call site) writes production silently
 * and looks like it worked; that puts the safety burden back on every call
 * site, defeating the entire point of parameterizing this. The one real
 * caller (this file's own entry-point block, below) supplies all four
 * explicitly — production paths then exist at exactly one call site in the
 * whole file, and a missing one fails loudly (undefined path -> readFileSync
 * throws) instead of silently falling back to the most dangerous value
 * available. `apply` itself is included in this for the same reason: it
 * used to be a module-level `APPLY` read from `process.argv` and consulted
 * at two separate sites inside this function — two sources of truth on the
 * one flag that gates a write is the worst possible place to have one, so
 * it is now solely a parameter, computed once, at the entry point only.
 */
export async function main({ fetchImpl, placesPath, restaurantsPath, backupRoot, apply }) {
  console.log(`=== Rebar import — ${apply ? 'APPLY' : 'DRY RUN'} ===\n`);

  const places = readNoBom(placesPath);
  const existingRebar = places.filter((p) => typeof p.id === 'string' && p.id.startsWith('rebar-'));
  console.log(`Existing rebar-* records in places.osm.json: ${existingRebar.length}`);

  // Test-only seam (subprocess level): when set and no `fetchImpl` param was
  // passed, a spawned child process uses this instead of a real network
  // call — needed for tests that must observe the actual process exit code,
  // which only exists at the subprocess level and can't be reached by
  // calling main() directly in-process. Absent, and with no `fetchImpl`
  // param either (every real run), behavior is unchanged: fetchRebarStores()
  // uses the real network fetch.
  let resolvedFetchImpl = fetchImpl;
  if (!resolvedFetchImpl) {
    const testFeedText = process.env.REBAR_TEST_FETCH_TEXT;
    const testFetchFail = process.env.REBAR_TEST_FETCH_FAIL === '1';
    if (testFetchFail) resolvedFetchImpl = async () => ({ ok: false, status: 500, text: async () => '' });
    else if (testFeedText) resolvedFetchImpl = async () => ({ ok: true, status: 200, text: async () => testFeedText });
  }

  let stores;
  try {
    stores = resolvedFetchImpl ? await fetchRebarStores(resolvedFetchImpl) : await fetchRebarStores();
  } catch (err) {
    console.error(`✗ fetch failed: ${err.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Feed entries parsed: ${stores.length}\n`);

  const { confirmed, ambiguousRecords, noMatchRecords, newStores } = matchRebarStores(stores, existingRebar);

  const confirmedTrue = confirmed.filter((c) => c.store.kosher === true);
  const confirmedFalse = confirmed.filter((c) => c.store.kosher === false);
  const confirmedOther = confirmed.filter((c) => c.store.kosher !== true && c.store.kosher !== false);

  const kosherFalseCount = stores.filter((s) => s.kosher === false).length;
  const kosherNullCount = stores.filter((s) => s.kosher !== true && s.kosher !== false).length;

  console.log('--- Summary ---');
  console.log(`  confirmed match, feed says kosher:true                 : ${confirmedTrue.length}`);
  console.log(`  confirmed match, feed says kosher:false — STOP, do not write, do not delete: ${confirmedFalse.length}`);
  console.log(`  confirmed match, feed kosher neither true/false        : ${confirmedOther.length}`);
  console.log(`  AMBIGUOUS — 2+ plausible candidates, never auto-resolved: ${ambiguousRecords.length}`);
  console.log(`  existing records with NO feed candidate at all          : ${noMatchRecords.length}`);
  console.log(`  kosher:true, zero candidates -> NEW record              : ${newStores.length}`);
  console.log(`  (feed-wide: ${kosherFalseCount} kosher:false, ${kosherNullCount} kosher neither true/false — most have no candidate relationship to our 55 and aren't listed below)`);

  if (confirmedFalse.length) {
    console.log('\n--- CONFIRMED MATCH BUT FEED SAYS kosher:false — owner decision, not ours ---');
    for (const { record, store } of confirmedFalse) {
      console.log(`  ${record.id} (${record.name}) <-> "${store.name}" | ${store.address}, ${store.city}`);
    }
  }

  if (ambiguousRecords.length) {
    console.log('\n--- AMBIGUOUS existing records (2+ candidates — reported, never auto-resolved) ---');
    for (const { record, candidates } of ambiguousRecords) {
      console.log(`  ${record.id} (${record.name}) | ${record.address}`);
      for (const c of candidates) console.log(`      candidate: "${c.name}" | ${c.address}, ${c.city} | kosher=${JSON.stringify(c.kosher)}`);
    }
  }

  if (noMatchRecords.length) {
    console.log('\n--- Existing rebar-* records with NO feed candidate at all (closed? renamed? investigate) ---');
    for (const r of noMatchRecords) console.log(`  ${r.id}: ${r.name} | ${r.address}`);
  }

  if (newStores.length) {
    console.log('\n--- NEW records (kosher:true, zero candidate existing records) ---');
    for (const s of newStores) console.log(`  ${makeId(s.name)}: ${s.name} | ${s.address}, ${s.city} | (${s.lat}, ${s.lng})`);
  }

  if (confirmedOther.length) {
    console.log('\n--- CONFIRMED MATCH, feed kosher field ambiguous (neither true nor false) ---');
    for (const { record, store } of confirmedOther) {
      console.log(`  ${record.id} (${record.name}) <-> "${store.name}": kosher=${JSON.stringify(store.kosher)}`);
    }
  }

  // Structural gate, not a control-flow gate: the write is reachable ONLY
  // inside this `else` branch, which requires BOTH `apply` true AND
  // `newStores.length > 0`. This is deliberately NOT an early
  // exit/return-based guard — an earlier fix attempt used
  // `if (!apply) { ...; return; }` ahead of an UNGUARDED write section
  // (correct in isolation, since `return` does stop execution here, but
  // fragile: the write's safety depended entirely on that one early exit
  // never being edited, reordered, or removed by anyone in the future,
  // exactly the "nobody will do that again" pattern this project replaces
  // with "something checks"). With an explicit `if (apply) {...}` wrapping
  // the write itself, reaching it without --apply is impossible by
  // construction, independent of every other branch's control flow.
  if (!apply) {
    // Conditional on newStores.length, not unconditional — a real run
    // reported "NEW record: 0" and this line still said "Re-run with
    // --apply to add the NEW records listed above" three lines below it.
    // This report is the artifact a gated, irreversible action gets
    // decided from in this project's own analyse -> dry-run -> report ->
    // verify -> apply ordering; inviting --apply when there is nothing to
    // add is not cosmetic in that context, even though --apply would
    // currently write nothing regardless (newStores.length === 0 today).
    console.log(
      newStores.length > 0
        ? '\n(dry run — nothing written. Re-run with --apply to add the NEW records listed above.)\n'
        : '\n(dry run — nothing written. Nothing to add, so --apply would not write anything either.)\n',
    );
  } else if (newStores.length === 0) {
    console.log('\nNothing to add.\n');
  } else {
    const newPlaces = newStores.map(buildNewPlace);

    const backupDir = join(backupRoot, 'data-backups', 'import-rebar');
    mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    copyFileSync(placesPath, join(backupDir, `places.osm.${stamp}.json`));
    copyFileSync(restaurantsPath, join(backupDir, `restaurants.osm.${stamp}.json`));

    const placesOut = [...places, ...newPlaces];
    writeNoBom(placesPath, placesOut);

    const restaurants = readNoBom(restaurantsPath);
    const existingRestaurantIds = new Set(restaurants.map((r) => r.id));
    const newForRestaurants = newPlaces.filter((p) => !existingRestaurantIds.has(p.id));
    writeNoBom(restaurantsPath, [...restaurants, ...newForRestaurants]);

    console.log(`\n✓ added ${newPlaces.length} new record(s) to places.osm.json, ${newForRestaurants.length} to restaurants.osm.json.`);
    console.log(`  backup: ${backupDir}\n`);
  }
}

// Self-executes only when this file is the entry module Node was invoked
// with — not on import (e.g. by a test importing `main` directly). Not an
// `endsWith` on argv[1]: that breaks on symlinks and Windows path-case
// differences, and getting it wrong means importing this module runs it —
// precisely what this guard exists to prevent, and the test file is
// exactly what imports it.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main({
    placesPath: PLACES_PATH,
    restaurantsPath: RESTAURANTS_PATH,
    backupRoot: root,
    apply: process.argv.slice(2).includes('--apply'),
  });
}
