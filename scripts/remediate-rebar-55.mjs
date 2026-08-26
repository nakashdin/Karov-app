/**
 * Item 4 Unit 2 — dry-run remediation report for ALL 55 rebar-* records:
 * the 53 asserting the fabricated kosherType:'mehadrin' (see import-rebar.mjs
 * and docs/KASHRUT_FACTS.md §5b/§22 for how that literal got there — the
 * original importer stamped it unconditionally, on every branch, with zero
 * per-branch evidence), PLUS the 2 that currently have NO kashrut fields at
 * all (rebar-bs-central-station, rebar-ramat-gan-marom-nave).
 *
 * Originally scoped to 53 and named remediate-rebar-53.mjs (that report is
 * commit 8117b67). The Architect's independent verification found the other
 * 2 are a live "אין תעודה → אין רשומה" violation right now — juice_bar is a
 * FOOD_TYPE, the app's food filter has no kashrut precondition, so these two
 * are displayed with literally nothing, not even 'unknown'. Absent -> value
 * and fabricated -> honest are different starting points, but the
 * destination this script computes is identical either way, so both belong
 * in the same plan rather than a separate script. This file SUPERSEDES
 * scripts/restore-rebar-two-branches.mjs, retired in the same commit —
 * that script matched by single-nearest name+address+coordinate (~120m),
 * exactly the design matchRebarStores' own header documents as unsafe on
 * this data: rebar-bs-central-station is one of the three real ambiguous
 * cases the many-to-one matcher below exists to catch, and the retired
 * script could not have detected that.
 *
 * DRY RUN BY DEFAULT. Always prints the full diff. Only writes to
 * places.osm.json/restaurants.osm.json when called with apply:true (CLI:
 * --apply) — same structural gate as import-rebar.mjs: the write is
 * reachable ONLY inside the terminal `else` branch of an `if (!apply) {...}
 * else if (allWrites.length === 0) {...} else {...}` chain, not behind an
 * early return, so reaching it without --apply is impossible by
 * construction rather than by one control-flow detail staying correct.
 * Creates a timestamped backup of both dataset files before writing.
 * main() takes NO DEFAULTS on placesPath/restaurantsPath/backupRoot/apply —
 * same reasoning as import-rebar.mjs: a default of "the real dataset" means
 * a caller that omits a parameter writes production silently. The one real
 * call site is this file's own entry-point guard, below.
 *
 * FIVE fields, not three — AGENTS.md: "Provenance לכל רשומה. source +
 * sourceUrl + lastVerifiedAt ככל שאפשר." Writing kosherType/kosherLevel/
 * kosherAuthorityGroup from a fetched, parsed, cross-key-verified source
 * while leaving sourceUrl unset (0/55 today) discards the citation for the
 * conclusion — a claim nobody could re-verify next month. sourceUrl is set
 * to the feed URL on all 55; source itself is left 'manual' (unchanged,
 * on 55 of 55 already — the record's origin genuinely is manual, sourceUrl
 * records where the kashrut FACT came from; same shape as osm-node-1763031739,
 * humus-eli-*, etc.). lastVerifiedAt is computed ONCE, from the real clock,
 * right after this run's fetch succeeds — never a hardcoded literal. A
 * hardcoded lastVerifiedAt is exactly the defect that produced this whole
 * effort: buildPlace()'s old `lastVerifiedAt: '2026-07-14'` constant is why
 * all 53 records carry the identical date regardless of when anyone actually
 * looked, which is indistinguishable from nobody ever having looked.
 * validate-data.mjs hard-fails a lastVerifiedAt that moves backward relative
 * to HEAD (the signature of a one-shot script re-applying a frozen payload)
 * — asserted per-record below, before writing, not just left to that guard
 * to catch after the fact.
 *
 * Reuses matchRebarStores() from rebar-feed.mjs — the same many-to-one-aware
 * matcher Unit 1's importer uses — rather than re-deriving matching logic a
 * second time (§17 face 3: logic imported, never duplicated).
 *
 * Usage:
 *   node scripts/remediate-rebar-55.mjs            # dry-run + report (default)
 *   node scripts/remediate-rebar-55.mjs --apply     # writes, with backup
 */
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { recordKashrutWrite } from './shared/kashrut-write.mjs';
import { fetchRebarStores, matchRebarStores } from './shared/rebar-feed.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PLACES_PATH = resolve(root, 'src/data/generated/places.osm.json');
const RESTAURANTS_PATH = resolve(root, 'src/data/generated/restaurants.osm.json');
const FEED_URL = 'https://rebar.co.il/our-stores/';

const BASIS = {
  kind: 'human-review',
  note: 'rebar.co.il/our-stores/ store-locator feed: kosher:true for this branch, matched by ' +
    'coordinates/address against the existing record. Feed has no level/authority field anywhere ' +
    'in its key union — same evidence ceiling as Item 4 Unit 1.',
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

/**
 * Tokenizes address text for the address-token re-derivation below.
 * Deliberately does NOT strip Hebrew geresh/gershayim from a token like
 * 'א׳' (accessibility/day-range text does not appear in addresses, but
 * street names occasionally carry them) — only whitespace and the
 * punctuation that actually separates address components (comma, dash,
 * parens) is a delimiter.
 */
function tokenize(text) {
  return String(text ?? '')
    .split(/[\s,\-־()]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Independent re-derivation of address-token agreement between an existing
 * record and one candidate feed store — built fresh, not consuming the
 * Architect's prior numbers (the Architect flagged their own first attempt
 * as wrong: it counted city-name tokens as address agreement, which is not
 * evidence of a SPECIFIC-branch match — two branches in the same city always
 * share the city name). Both the candidate's own city tokens AND the
 * existing record's cityId tokens are stripped before comparing, so a
 * shared city can never inflate the overlap.
 */
function addressTokenOverlap(existingRecord, candidateStore) {
  const excludeTokens = new Set([
    ...tokenize(candidateStore.city),
    ...tokenize(existingRecord.cityId),
  ]);
  const existingTokens = tokenize(existingRecord.address).filter((t) => !excludeTokens.has(t));
  const candidateTokens = tokenize(candidateStore.address).filter((t) => !excludeTokens.has(t));
  const overlap = existingTokens.filter((t) => candidateTokens.includes(t));
  return { existingTokens, candidateTokens, overlap };
}

function fieldsSnapshot(record) {
  return {
    kosherType: record.kosherType,
    kosherLevel: record.kosherLevel,
    kosherAuthorityGroup: record.kosherAuthorityGroup,
    kosherAuthority: 'kosherAuthority' in record ? record.kosherAuthority : undefined,
    certifiedBy: 'certifiedBy' in record ? record.certifiedBy : undefined,
    sourceUrl: 'sourceUrl' in record ? record.sourceUrl : undefined,
    lastVerifiedAt: 'lastVerifiedAt' in record ? record.lastVerifiedAt : undefined,
  };
}

/**
 * Asserts `runDate` (this run's real fetch date, YYYY-MM-DD) does not move
 * lastVerifiedAt backward relative to the record's current value — the
 * exact condition validate-data.mjs hard-fails on (the one-shot-frozen-
 * payload signature). Checked here, before the write, not left solely to
 * that guard to catch downstream. String comparison is correct for
 * YYYY-MM-DD: lexicographic order matches chronological order for this
 * format. "Not in the future" needs no separate runtime check: runDate is
 * derived from `new Date()` at the moment of this run and is never supplied
 * by a caller, so it cannot be later than "now" by construction — the
 * hazard this whole change exists to remove (a hardcoded literal a future
 * caller could set to any date) does not exist in this code path.
 */
function assertNotBackdating(record, runDate) {
  const prior = record.lastVerifiedAt;
  if (prior && runDate < prior) {
    throw new Error(
      `${record.id}: refusing to write lastVerifiedAt=${JSON.stringify(runDate)} over existing ${JSON.stringify(prior)} — ` +
      'that would move it backward, which validate-data.mjs hard-fails as the one-shot-frozen-payload signature.',
    );
  }
}

/** Applies the evidence-ceiling write to a CLONE of the record — never the original. */
function proposedAfter(record, runDate) {
  assertNotBackdating(record, runDate);
  const clone = { ...record };
  recordKashrutWrite(clone, 'kosherType', 'kosher', BASIS);
  recordKashrutWrite(clone, 'kosherLevel', null, BASIS);
  recordKashrutWrite(clone, 'kosherAuthorityGroup', 'unknown', BASIS);
  // kosherAuthority/certifiedBy: none of the 55 currently have either field
  // set (verified separately, not assumed) — so there is nothing to remove
  // and nothing to leave untouched; recordKashrutWrite is not called for
  // either field. sourceUrl/lastVerifiedAt are not kashrut fields (not in
  // KASHRUT_FIELDS) — recordKashrutWrite would reject them — so they are
  // set directly, same as buildNewPlace() does in import-rebar.mjs.
  clone.sourceUrl = FEED_URL;
  clone.lastVerifiedAt = runDate;
  return clone;
}

export async function main({ fetchImpl, placesPath, restaurantsPath, backupRoot, apply }) {
  const places = readNoBom(placesPath);
  const existingRebar = places.filter((p) => typeof p.id === 'string' && p.id.startsWith('rebar-'));
  // In scope: the 53 asserting the fabricated literal, PLUS the 2 with no
  // kashrut fields at all. Both groups get the identical destination; only
  // their starting state differs (labeled per record below).
  const needsRemediation = existingRebar.filter((r) => r.kosherType === 'mehadrin' || !('kosherType' in r));
  const startingState = (r) => (r.kosherType === 'mehadrin' ? 'fabricated-mehadrin' : 'absent-entirely');

  console.log(`Existing rebar-* records: ${existingRebar.length}`);
  console.log(`  in scope for this remediation: ${needsRemediation.length}`);
  console.log(`    asserting kosherType:'mehadrin' (fabricated): ${needsRemediation.filter((r) => startingState(r) === 'fabricated-mehadrin').length}`);
  console.log(`    with NO kashrut fields at all (absent — the app shows these with ZERO kashrut info today, not 'unknown'): ${needsRemediation.filter((r) => startingState(r) === 'absent-entirely').length}\n`);

  const stores = fetchImpl ? await fetchRebarStores(fetchImpl) : await fetchRebarStores();
  // Computed ONCE, right after this run's fetch succeeds — the actual
  // verification date, not a hardcoded literal. See the file header for why
  // that distinction is the point of this whole change.
  //
  // toISOString() is UTC (found live, 2026-08-27 — see localDateISO() in
  // kashrut-write.mjs). THIS FILE PREDATES THAT FIX AND IS DELIBERATELY LEFT
  // UNMODIFIED: it is the historical record of what commit 880e48d actually
  // ran (see remediate-chain.mjs's header) — editing it to call
  // localDateISO() would assert a fix that was not in effect when it shipped,
  // making the record inaccurate about its own history for the sake of
  // consistency it doesn't need (it can never run again). Copy
  // localDateISO() from kashrut-write.mjs for any NEW script, not this line.
  const runDate = new Date().toISOString().slice(0, 10);
  console.log(`Feed entries parsed: ${stores.length} (fetched and verified ${runDate})\n`);

  const { confirmed, ambiguousRecords, noMatchRecords } = matchRebarStores(stores, existingRebar);

  const inScope = new Set(needsRemediation.map((r) => r.id));
  const confirmedInScope = confirmed.filter((c) => inScope.has(c.record.id));
  const ambiguousInScope = ambiguousRecords.filter((a) => inScope.has(a.record.id));
  const noMatchInScope = noMatchRecords.filter((r) => inScope.has(r.id));

  const confirmedTrue = confirmedInScope.filter((c) => c.store.kosher === true);
  const confirmedFalse = confirmedInScope.filter((c) => c.store.kosher === false);
  const confirmedOther = confirmedInScope.filter((c) => c.store.kosher !== true && c.store.kosher !== false);

  console.log(`--- Summary (of the ${needsRemediation.length} in scope) ---`);
  console.log(`  confirmed match, feed kosher:true  -> PROPOSED WRITE       : ${confirmedTrue.length}`);
  console.log(`  confirmed match, feed kosher:false -> STOP, no write       : ${confirmedFalse.length}`);
  console.log(`  confirmed match, feed kosher neither -> STOP, no write     : ${confirmedOther.length}`);
  console.log(`  AMBIGUOUS (2+ candidates)           -> see per-record below: ${ambiguousInScope.length}`);
  console.log(`  no feed candidate at all             -> see per-record below: ${noMatchInScope.length}\n`);

  console.log('=== PROPOSED WRITE — confirmed match, feed kosher:true ===');
  for (const { record, store } of confirmedTrue) {
    const before = fieldsSnapshot(record);
    const after = fieldsSnapshot(proposedAfter(record, runDate));
    console.log(`${record.id} (${record.name}) [${startingState(record)}]`);
    console.log(`  matched feed store: "${store.name}" | ${store.address}, ${store.city}`);
    console.log(`  before: ${JSON.stringify(before)}`);
    console.log(`  after:  ${JSON.stringify(after)}`);
  }

  console.log('\n=== STOP — confirmed match, feed says kosher:false ===');
  for (const { record, store } of confirmedFalse) {
    console.log(`${record.id} (${record.name}) <-> "${store.name}" | ${store.address}, ${store.city} — feed says NOT kosher. Not written; owner decision.`);
  }

  console.log('\n=== STOP — confirmed match, feed kosher neither true/false ===');
  for (const { record, store } of confirmedOther) {
    console.log(`${record.id} (${record.name}) <-> "${store.name}": kosher=${JSON.stringify(store.kosher)}. Not written.`);
  }

  console.log('\n=== AMBIGUOUS — independent address-token re-derivation, per record ===');
  for (const { record, candidates } of ambiguousInScope) {
    console.log(`\n${record.id} (${record.name}) [${startingState(record)}]`);
    console.log(`  existing address: "${record.address}" | cityId: "${record.cityId}"`);
    for (const c of candidates) {
      const { existingTokens, candidateTokens, overlap } = addressTokenOverlap(record, c);
      console.log(`  candidate: "${c.name}" | address: "${c.address}" | city: "${c.city}" | kosher=${JSON.stringify(c.kosher)}`);
      console.log(`    existing tokens (city-excluded): ${JSON.stringify(existingTokens)}`);
      console.log(`    candidate tokens (city-excluded): ${JSON.stringify(candidateTokens)}`);
      console.log(`    overlap: ${JSON.stringify(overlap)} (${overlap.length}/${existingTokens.length || 1})`);
    }
  }

  console.log('\n=== NO FEED CANDIDATE AT ALL ===');
  for (const r of noMatchInScope) {
    console.log(`${r.id} (${r.name}) | ${r.address}`);
  }

  // Manual, per-record resolution of the 3 ambiguous cases — NOT a change to
  // matchRebarStores' "never auto-resolve" rule (that guarantee stays
  // exactly as Unit 1 left it; this is a human-reviewed judgment call made
  // HERE, in the report layer, informed by the address-token evidence
  // printed above, and stated with its reasoning rather than applied
  // silently). Keyed by the WINNING CANDIDATE'S NAME, not a positional
  // index — candidatesByRecord's array order depends on store iteration
  // order, which is not a contract this file should rely on.
  //
  //   rebar-02629c63: candidate "קרית אתא- שער הצפון" has 3/5 address-token
  //   overlap AND its own city (קרית אתא) matches this record's cityId
  //   (קריית אתא — spelling variant of the same city). The other candidate,
  //   "חיפה- ביג קריות", has ZERO address-token overlap and a DIFFERENT
  //   city than this record's own cityId — a proximity-only false positive,
  //   not claimed by any other existing record in the 55. Resolved to
  //   "קרית אתא- שער הצפון" (kosher:true).
  //
  //   rebar-dc59d466 and rebar-bs-central-station are a genuine mutual 2x2:
  //   both existing records have BOTH "קניון הנגב" and "תחנה מרכזית" as
  //   candidates. This is the strongest evidence in this report, stated
  //   directly rather than as an aside: rebar-dc59d466's own name is
  //   "קניון הנגב", and that candidate's address has 4/6 token overlap with
  //   it (שדרות/יצחק/רגר/2) — a double match, name AND address.
  //   rebar-bs-central-station's own name is "...תחנה מרכזית", the OTHER
  //   candidate. Resolving each existing record to the feed store whose
  //   name it already carries is not a coincidence available on only one
  //   side: it is RECIPROCAL — under this resolution, "קניון הנגב" and
  //   "תחנה מרכזית" are claimed by exactly one existing record each, and no
  //   feed store is left claimed by two. A resolution that got either one
  //   wrong would leave the other feed store double-claimed or unclaimed;
  //   this one leaves both accounted for exactly once. That mutual
  //   consistency is the argument, not a footnote to it.
  const AMBIGUOUS_RESOLUTIONS = {
    'rebar-02629c63': 'קרית אתא- שער הצפון',
    'rebar-dc59d466': 'באר שבע- קניון הנגב',
    'rebar-bs-central-station': 'באר שבע- תחנה מרכזית',
  };

  console.log('\n=== PROPOSED RESOLUTION — the ambiguous records, per-record reasoning above ===');
  const ambiguousResolved = [];
  for (const { record, candidates } of ambiguousInScope) {
    const winningName = AMBIGUOUS_RESOLUTIONS[record.id];
    const chosen = candidates.find((c) => c.name === winningName);
    if (!chosen) {
      throw new Error(`${record.id}: no candidate named "${winningName}" — the resolution table is stale against this fetch's candidate set. Investigate before trusting this plan.`);
    }
    ambiguousResolved.push({ record, store: chosen });
    console.log(`${record.id}: resolved to "${chosen.name}" (kosher=${JSON.stringify(chosen.kosher)}) — see reasoning in the comment above this block.`);
  }
  console.log('  RECIPROCITY CHECK: rebar-dc59d466 and rebar-bs-central-station resolve to two DIFFERENT feed stores (קניון הנגב / תחנה מרכזית) — neither store is claimed twice under this plan.');
  // Both Beer Sheva candidates are kosher:true (verified above, not assumed):
  // the resolution between them decides WHICH feed store gets cited as the
  // match, but not WHAT gets written — either way both records land on
  // kosherType:'kosher'. rebar-02629c63 is the only one of the three where
  // getting the resolution wrong would change the actual kashrut answer: its
  // two candidates disagree (kosher:true vs kosher:false).
  console.log('  NOTE: rebar-02629c63 is the ONLY ambiguous record where this resolution decides a kashrut answer — its two candidates disagree (true vs false). Both Beer Sheva candidates are kosher:true, so rebar-dc59d466/rebar-bs-central-station reach the same written value either way; only which feed store gets cited as the match depends on the resolution.');

  const allWrites = [...confirmedTrue, ...ambiguousResolved];

  console.log(`\n=== FULL PLAN — all ${needsRemediation.length} in-scope records, one line each ===`);
  const planLines = [];
  for (const r of needsRemediation) {
    const w = allWrites.find((x) => x.record.id === r.id);
    const before = fieldsSnapshot(r);
    if (w) {
      const after = fieldsSnapshot(proposedAfter(r, runDate));
      planLines.push(`${r.id} | ${r.name} | [${startingState(r)}] | before=${JSON.stringify(before)} | after=${JSON.stringify(after)} | matched="${w.store.name}"`);
    } else {
      planLines.push(`${r.id} | ${r.name} | [${startingState(r)}] | before=${JSON.stringify(before)} | STOP — no write (see STOP sections above)`);
    }
  }
  for (const line of planLines) console.log(line);

  // Structural gate, not a control-flow gate — same reasoning as
  // import-rebar.mjs (docs/AGENTS.md's own near-miss: an early-return-based
  // guard is correct in isolation but depends on nobody ever reordering it;
  // an `if (apply) {...}` wrapping the write itself makes reaching it
  // without --apply impossible by construction).
  if (!apply) {
    console.log(
      allWrites.length > 0
        ? '\n(dry run — nothing written. Re-run with --apply to write the plan above.)\n'
        : '\n(dry run — nothing written. Nothing to write, so --apply would not write anything either.)\n',
    );
  } else if (allWrites.length === 0) {
    console.log('\nNothing to write.\n');
  } else {
    const restaurants = readNoBom(restaurantsPath);

    const backupDir = join(backupRoot, 'data-backups', 'remediate-rebar-55');
    mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    copyFileSync(placesPath, join(backupDir, `places.osm.${stamp}.json`));
    copyFileSync(restaurantsPath, join(backupDir, `restaurants.osm.${stamp}.json`));

    const { newPlaces, newRestaurants } = applyPlan(places, restaurants, allWrites, runDate);
    writeNoBom(placesPath, newPlaces);
    writeNoBom(restaurantsPath, newRestaurants);

    console.log(`\n✓ remediated ${allWrites.length} record(s) in places.osm.json and restaurants.osm.json.`);
    console.log(`  backup: ${backupDir}\n`);
  }

  return {
    existingRebar, needsRemediation, confirmedTrue, confirmedFalse, confirmedOther,
    ambiguousInScope, ambiguousResolved, noMatchInScope, allWrites, planLines, runDate,
  };
}

/**
 * Applies every proposed write to a CLONE of the full places/restaurants
 * arrays (never the originals) — used by main()'s own --apply path above,
 * and separately importable for a disposable-worktree validation run that
 * wants to exercise the exact same function without going through the real
 * dataset paths. `runDate` must be the SAME value main() computed for this
 * run (its return value includes it) — never recomputed here, or a run
 * that straddles a UTC midnight could write two different dates for what
 * should be one consistent verification pass.
 */
export function applyPlan(places, restaurants, allWrites, runDate) {
  const writeIds = new Set(allWrites.map((w) => w.record.id));
  const newPlaces = places.map((p) => (writeIds.has(p.id) ? proposedAfter(p, runDate) : p));
  const newRestaurants = restaurants.map((r) => (writeIds.has(r.id) ? proposedAfter(r, runDate) : r));
  return { newPlaces, newRestaurants };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main({
    placesPath: PLACES_PATH,
    restaurantsPath: RESTAURANTS_PATH,
    backupRoot: root,
    apply: process.argv.slice(2).includes('--apply'),
  });
}
