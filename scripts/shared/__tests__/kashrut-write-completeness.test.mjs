// Standalone test (not jest — .mjs files aren't in jest's testMatch, and this
// test also reads .ts files under importers/, which jest's `roots: ['src']`
// never sees either way).
// Run: node scripts/shared/__tests__/kashrut-write-completeness.test.mjs
//
// Purpose: recordKashrutWrite() (scripts/shared/kashrut-write.mjs) is the one
// place a kashrut-field write is SUPPOSED to happen. This test enumerates
// every existing script under scripts/ (excluding scripts/reports/, which is
// analysis output, not a writer) and importers/ that assigns one of the six
// kashrut fields directly, and asserts that set is EXACTLY the frozen list
// below — not a superset (a NEW bypass fails the test), and not a subset
// either (a STALE entry — a file that no longer bypasses, e.g. because it was
// migrated to the helper — also fails the test, so the list stays honest
// instead of silently accumulating dead entries). Same shape as the
// authorities.ts / reviewQueue.ts mirror tests.
//
// THE LIST IS FROZEN. New entries are forbidden — a script written or
// modified after this test existed must call recordKashrutWrite() directly,
// full stop. Every entry below is dated 2026-08-25 and reasoned: it already
// ran (or, for the confirmed-dead entries, never successfully ran) against
// the live dataset and has no realistic path to running again. See
// docs/KASHRUT_FACTS.md §13.
//
// Enumeration was data-derived: every `.mjs` file under scripts/ (excluding
// scripts/reports/) and every `.mjs`/`.ts` file under importers/ was scanned
// for a direct assignment (object-literal property or `.field =`) to one of
// the six fields, cross-referenced against package.json (none are wired to
// an npm script), and spot-checked live/dead against the real dataset by id,
// name, or certifiedBy substring. `importers/tzohar/import-food.mjs` was
// found this way — a real writer that a naive `.ts`-only sweep would have
// missed entirely, which is exactly the failure mode this method exists to
// catch (an importer-side sweep has already missed a writer twice in this
// project; see FACTS §8).
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const FIELDS = ['kosherType', 'kosherLevel', 'kosherAuthorityGroup', 'kosherAuthority', 'certifierId', 'certifiedBy'];
const OBJECT_LITERAL_RE = new RegExp(`\\b(${FIELDS.join('|')})\\s*:`);
const DIRECT_ASSIGN_RE = new RegExp(`\\.(${FIELDS.join('|')})\\s*=[^=]`);
const HELPER_IMPORT_RE = /kashrut-write(\.mjs)?['"]/;

function walk(dir, exts, excludeSubstrings) {
  let out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    const norm = p.replaceAll('\\', '/');
    if (excludeSubstrings.some((e) => norm.includes(e))) continue;
    if (entry.isDirectory()) out = out.concat(walk(p, exts, excludeSubstrings));
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(p);
  }
  return out;
}

function relPath(absPath) {
  return absPath.replaceAll('\\', '/').replace(root.replaceAll('\\', '/') + '/', '');
}

/** Every file that assigns a kashrut field and does NOT import the helper. */
function findBypassCandidates() {
  const files = [
    ...walk(join(root, 'scripts'), ['.mjs'], ['/scripts/reports', '/scripts/shared']),
    ...walk(join(root, 'importers'), ['.mjs', '.ts'], []),
  ];
  const bypasses = new Set();
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    if ((OBJECT_LITERAL_RE.test(src) || DIRECT_ASSIGN_RE.test(src)) && !HELPER_IMPORT_RE.test(src)) {
      bypasses.add(relPath(f));
    }
  }
  return bypasses;
}

// ── The frozen list ──────────────────────────────────────────────────────
// category: 're-runnable-utility' (generic, could plausibly run again — NOT
//   safe to ignore, migrating these to the helper is real future work) |
//   'one-shot-chain-import' (single-chain import, already run once) |
//   'one-shot-patch' (targeted fix for specific records, already run once) |
//   'dead' (confirmed zero live output — id/name/value cross-referenced
//   against the live dataset, not inferred from the filename).

const RE_RUNNABLE_UTILITY_REASON =
  'Generic, re-runnable by design — not a one-shot chain script. NOT migrated to recordKashrutWrite() yet; ' +
  'that migration is real follow-on work this exclusion does not substitute for.';
const ONE_SHOT_CHAIN_REASON = 'One-shot chain/branch import, already executed once; no automated trigger to re-run.';
const ONE_SHOT_PATCH_REASON = 'One-shot targeted patch for specific records, already executed once.';

const FROZEN_EXCLUSIONS = [
  // ── re-runnable-utility (3) ────────────────────────────────────────────
  { file: 'scripts/migrate-kosher-fields.mjs', category: 're-runnable-utility',
    note: 'The MAP itself (FACTS §2, §5b site A). Writes kosherLevel/kosherAuthorityGroup/kosherAuthority. ' + RE_RUNNABLE_UTILITY_REASON },
  { file: 'scripts/apply-kashrut-authorities.mjs', category: 're-runnable-utility',
    note: 'Writes certifierId/kosherLevel/kosherAuthorityGroup. Fully built and dry-run-tested but never run ' +
      'with --apply — certifierId is 0/7471 live today (confirmed). ' + RE_RUNNABLE_UTILITY_REASON },
  { file: 'importers/tzohar/import-food.mjs', category: 're-runnable-utility',
    note: 'Found via data-derived sweep, not the original .ts-only scope (it is .mjs) — exactly the class of ' +
      'miss this method exists to catch. Writes certifiedBy/kosherType/kosherAuthority/kosherAuthorityGroup/' +
      'kosherLevel via a single CERT_PATCH object, live on 195 tzohar records (matches FACTS §7\'s n=195). ' +
      'Never asserts a level-asserting kosherType (writes kosherType:"tzohar", kosherLevel:"regular"), so it ' +
      'does not itself trigger the B1.2(a) guard — still not migrated. ' + RE_RUNNABLE_UTILITY_REASON },

  // ── one-shot-chain-import (~35) ────────────────────────────────────────
  { file: 'scripts/import-rebar.mjs', category: 'one-shot-chain-import', note: 'Blanket kosherType:"mehadrin" hardcode, 55 live records. ' + ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-maafe-neeman.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-bfresh.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-golda.mjs', category: 'one-shot-chain-import', note: 'Dynamic (mapKosherType(b.kosher)) — a literal-string grep alone would have missed this one. ' + ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-arcaffe.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-jerusalem.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-burgerim-all.mjs', category: 'one-shot-chain-import', note: 'Hebrew-id scheme; the live burgerim writer. ' + ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-bahadunes.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-cafecafe.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-cafe-nimrod.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-shawarma-center.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-tlv-final.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-tlv-batch1.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-pizza-story-all.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-bardichev.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-chains-batch1.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-meat-chains.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-agadir.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-pizza-chains-batch2.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-shawarma-batch2.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-shawarma-batch3.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-shawarma-south2.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-takumi-suduch.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-humus-eli-full.mjs', category: 'one-shot-chain-import', note: 'Shares the humus-eli-* namespace with fix-humus-eli-and-dominos.mjs. ' + ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-humuskaspy.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-hummusneri.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-lechembasar.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-moses-shop.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-newdeli.mjs', category: 'one-shot-chain-import', note: 'Dynamic (kt(b.kosher)). ' + ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-pastabasta.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-burgersbar.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-bbb.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-greg.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-landwer.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-lehem-erez.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-shimoni.mjs', category: 'one-shot-chain-import', note: 'Shares an id-prefix with import-meat-chains.mjs (not disambiguated further). ' + ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-yashka.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-mcdonalds.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-pizzahut.mjs', category: 'one-shot-chain-import', note: ONE_SHOT_CHAIN_REASON },
  { file: 'scripts/import-pizza-chains.mjs', category: 'one-shot-chain-import', note: 'Contains a literal rabanut_mehadrin assignment. ' + ONE_SHOT_CHAIN_REASON },
  { file: 'importers/coffee-carts/scrape-coffeetrail.mjs', category: 'one-shot-chain-import', note: 'Dynamic (inferKosherType(certifiedBy)). ' + ONE_SHOT_CHAIN_REASON },

  // ── one-shot-patch (~17) ───────────────────────────────────────────────
  { file: 'scripts/apply-chains-research.mjs', category: 'one-shot-patch', note: 'Hardcodes kosherType+certifiedBy per record across many chains. ' + ONE_SHOT_PATCH_REASON },
  { file: 'scripts/apply-osm-research-results.mjs', category: 'one-shot-patch', note: 'Pass-through assignment plus 10 literal overrides. ' + ONE_SHOT_PATCH_REASON },
  { file: 'scripts/fix-humus-eli-and-dominos.mjs', category: 'one-shot-patch', note: '62 hand-typed level-asserting rows — the cleanest specimen of the site-B mechanism in the repo (FACTS §5b). ' + ONE_SHOT_PATCH_REASON },
  { file: 'scripts/import-kiriat-meir-chains.mjs', category: 'one-shot-patch', note: 'Updates existing cafecafe-* records rather than creating new ones. ' + ONE_SHOT_PATCH_REASON },
  { file: 'scripts/fix-eilat-cleanup.mjs', category: 'one-shot-patch', note: ONE_SHOT_PATCH_REASON },
  { file: 'scripts/fix-fastfood-types.mjs', category: 'one-shot-patch', note: ONE_SHOT_PATCH_REASON },
  { file: 'scripts/fix-hummus-eliyahu-full.mjs', category: 'one-shot-patch', note: ONE_SHOT_PATCH_REASON },
  { file: 'scripts/fix-humus-eli-encoding.mjs', category: 'one-shot-patch', note: 'id-repair only, not a field-level content change. ' + ONE_SHOT_PATCH_REASON },
  { file: 'scripts/fix-nagisa-official.mjs', category: 'one-shot-patch', note: 'Contains a literal mehadrin assignment. ' + ONE_SHOT_PATCH_REASON },
  { file: 'scripts/fix-pizza-roma-shoham.mjs', category: 'one-shot-patch', note: ONE_SHOT_PATCH_REASON },
  { file: 'scripts/merge-duplicates-phase1.mjs', category: 'one-shot-patch', note: 'Copies kashrut fields onto surviving records during a dedupe merge. ' + ONE_SHOT_PATCH_REASON },
  { file: 'scripts/patch-aroma-cafecafe.mjs', category: 'one-shot-patch', note: ONE_SHOT_PATCH_REASON },
  { file: 'scripts/patch-bulk-fixes.mjs', category: 'one-shot-patch', note: ONE_SHOT_PATCH_REASON },
  { file: 'scripts/patch-cafegreg-humuselihu-pazaz.mjs', category: 'one-shot-patch', note: ONE_SHOT_PATCH_REASON },
  { file: 'scripts/patch-greg-cafe.mjs', category: 'one-shot-patch', note: ONE_SHOT_PATCH_REASON },
  { file: 'scripts/patch-greg-hours-final.mjs', category: 'one-shot-patch', note: ONE_SHOT_PATCH_REASON },
  { file: 'scripts/patch-landwer.mjs', category: 'one-shot-patch', note: ONE_SHOT_PATCH_REASON },
  { file: 'scripts/patch-multi-chains.mjs', category: 'one-shot-patch', note: 'Includes an extra.osmKosher-based inference branch alongside the literal one. ' + ONE_SHOT_PATCH_REASON },
  { file: 'scripts/patch-obvious-fixes.mjs', category: 'one-shot-patch', note: ONE_SHOT_PATCH_REASON },
  { file: 'scripts/patch-pazzaz-full-update.mjs', category: 'one-shot-patch', note: ONE_SHOT_PATCH_REASON },
  { file: 'scripts/patch-pizzahut-shemesh.mjs', category: 'one-shot-patch', note: ONE_SHOT_PATCH_REASON },
  { file: 'scripts/patch-shemesh-missed.mjs', category: 'one-shot-patch', note: ONE_SHOT_PATCH_REASON },
  { file: 'scripts/patch-small-chains.mjs', category: 'one-shot-patch', note: ONE_SHOT_PATCH_REASON },
  { file: 'scripts/patch-story-and-bakikar.mjs', category: 'one-shot-patch', note: ONE_SHOT_PATCH_REASON },
  { file: 'scripts/update-chains-kosher-phase2.mjs', category: 'one-shot-patch', note: 'Mixed live/dead sub-paths — its Domino\'s-id branch targets the same dead range as patch-dominos.mjs. ' + ONE_SHOT_PATCH_REASON },
  { file: 'scripts/update-pazzaz.mjs', category: 'one-shot-patch', note: 'Also contains a known absolute Windows path (AGENTS.md pitfall, unrelated to this guard). ' + ONE_SHOT_PATCH_REASON },
  { file: 'scripts/update-pizza-story-hours.mjs', category: 'one-shot-patch', note: ONE_SHOT_PATCH_REASON },
  { file: 'scripts/update-roladin.mjs', category: 'one-shot-patch', note: 'The value that actually survives: all 49 live רולדין records show kosherType:"rabanut" from this script, overwriting the three below.', },
  { file: 'scripts/import-oryehuda-meat.mjs', category: 'one-shot-patch', note: ONE_SHOT_PATCH_REASON },
  { file: 'scripts/import-petrozilia.mjs', category: 'one-shot-patch', note: ONE_SHOT_PATCH_REASON },
  { file: 'scripts/patch-pizza-koshertype.mjs', category: 'one-shot-patch', note: 'One target record (9000112) never actually got the intended patch and is still missing kosherType live — a failed one-shot, not a live writer, but still a bypass site if ever reattempted. ' + ONE_SHOT_PATCH_REASON },

  // ── dead (confirmed 0 live output) ──────────────────────────────────────
  { file: 'scripts/import-burgerim.mjs', category: 'dead', note: 'English-id scheme (burgerim-ofakim etc.) — 0 live records; superseded by import-burgerim-all.mjs\'s Hebrew-id scheme.' },
  { file: 'scripts/import-humuseliyahu.mjs', category: 'dead', note: '0 live humuseliyahu-* records; superseded by import-humus-eli-full.mjs.' },
  { file: 'scripts/import-aroma.mjs', category: 'dead', note: '0 live records in its idCounter 9300000 range.' },
  { file: 'scripts/import-aroma-v2.mjs', category: 'dead', note: '0 live records in its idCounter 9400000 range; dynamic certToKosherType(r.certified) assignment.' },
  { file: 'scripts/fix-roladin-final.mjs', category: 'dead', note: 'Wrote kosherType:"kosher" to specific Roladin branches; 0/49 live records show that value — overwritten by update-roladin.mjs.' },
  { file: 'scripts/patch-roladin.mjs', category: 'dead', note: 'Same fate as fix-roladin-final.mjs — 0/49 live records show "kosher", overwritten by update-roladin.mjs.' },
  { file: 'scripts/update-roladin-kosher.mjs', category: 'dead', note: 'Same fate again — 0/49 live records show "kosher", overwritten by update-roladin.mjs.' },
  { file: 'scripts/patch-dominos.mjs', category: 'dead', note: 'Writes kosherType:"badatz_beit_yosef" to 10 target ids (9000093-9000102) that sit one past the live max id (9000092) in that counter — the targets never existed.' },
];

const FROZEN_SET = new Map(FROZEN_EXCLUSIONS.map((e) => [e.file, e]));

/**
 * Files the regex heuristic above cannot distinguish from a real writer —
 * they build a diagnostic/report OBJECT that happens to use one of the six
 * field names as a key, but never assign onto an actual place record.
 * Verified by reading each file, not assumed from the name. Separate from
 * FROZEN_EXCLUSIONS on purpose: these were never writers at all, so listing
 * them as a historical bypass (which implies "this used to write, and we've
 * accepted that") would misdescribe what they are.
 */
const CONFIRMED_NOT_A_WRITER = new Map([
  ['scripts/find-duplicate-places.mjs', 'Builds a { a: {...certifiedBy}, b: {...certifiedBy} } diagnostic report object for a pair of candidate duplicates — reads certifiedBy for display, assigns nothing.'],
  ['scripts/preview-kosher-fields.mjs', 'Explicit in its own header comment: "kosherType stays untouched — these are purely additive". Reads kosherType to group a preview report; never assigns it.'],
]);

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok - ${name}`);
  } catch (err) {
    console.error(`  FAIL - ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('kashrut-write-completeness');

test('sanity: the scan actually finds files (guards against a silently empty/broken walk passing vacuously)', () => {
  const found = findBypassCandidates();
  assert.ok(found.size > 30, `expected >30 bypass candidates, found ${found.size}`);
});

test('every category is one of the four documented kinds', () => {
  const valid = new Set(['re-runnable-utility', 'one-shot-chain-import', 'one-shot-patch', 'dead']);
  const bad = FROZEN_EXCLUSIONS.filter((e) => !valid.has(e.category));
  assert.deepEqual(bad, []);
});

test('every entry has a non-empty reason (note)', () => {
  const missing = FROZEN_EXCLUSIONS.filter((e) => !e.note || !e.note.trim()).map((e) => e.file);
  assert.deepEqual(missing, []);
});

test('no duplicate entries in the frozen list', () => {
  assert.equal(FROZEN_SET.size, FROZEN_EXCLUSIONS.length);
});

// This is the completeness test firing for real: it must actually run the
// scan against the real repository and compare, not assert on a fixture.
test('CONFIRMED_NOT_A_WRITER entries actually still match the heuristic (guards against a stale allowlist hiding a real new bypass)', () => {
  const found = findBypassCandidates();
  const noLongerMatches = [...CONFIRMED_NOT_A_WRITER.keys()].filter((f) => !found.has(f));
  assert.deepEqual(noLongerMatches, [], 'a CONFIRMED_NOT_A_WRITER entry no longer matches the scan — remove it, or verify it is still a false positive rather than assuming');
});

test('the live bypass set matches the frozen list exactly — no new bypass, no stale entry', () => {
  const found = new Set([...findBypassCandidates()].filter((f) => !CONFIRMED_NOT_A_WRITER.has(f)));
  const newBypasses = [...found].filter((f) => !FROZEN_SET.has(f));
  const staleEntries = [...FROZEN_SET.keys()].filter((f) => !found.has(f));

  if (newBypasses.length) {
    console.error('\n  NEW BYPASS — a script writes a kashrut field directly, outside recordKashrutWrite(),');
    console.error('  and is not in the frozen exclusion list. Either route it through the helper, or —');
    console.error('  only if it is genuinely a historical one-shot script that already ran — add a dated,');
    console.error('  reasoned entry. New entries require the same live/dead verification as the existing ones,');
    console.error('  not just an id check on the filename.');
    newBypasses.forEach((f) => console.error(`    + ${f}`));
  }
  if (staleEntries.length) {
    console.error('\n  STALE ENTRY — listed as a bypass but no longer matches (migrated to the helper, or');
    console.error('  rewritten). Remove it from FROZEN_EXCLUSIONS — an exclusion list that only grows decays');
    console.error('  into a permission list.');
    staleEntries.forEach((f) => console.error(`    - ${f}`));
  }

  assert.deepEqual(newBypasses, []);
  assert.deepEqual(staleEntries, []);
});

console.log(`\n${passed} passed${process.exitCode ? ', with failures' : ''} — ${FROZEN_EXCLUSIONS.length} frozen exclusions`);
