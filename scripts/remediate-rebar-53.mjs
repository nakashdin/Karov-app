/**
 * Item 4 Unit 2 — dry-run remediation report for the rebar-* records still
 * asserting the fabricated kosherType:'mehadrin' (see import-rebar.mjs and
 * docs/KASHRUT_FACTS.md §5b/§22 for how that literal got there: the original
 * importer stamped it unconditionally, on every branch, with zero per-branch
 * evidence). REPORT ONLY — this file does not write to places.osm.json or
 * restaurants.osm.json. It reads the real dataset, fetches the real live
 * feed, computes what each record's fields WOULD become under the same
 * evidence ceiling Unit 1 already uses, and prints the full diff. The write
 * itself is a separate, later, explicitly-gated step once the owner has seen
 * this report — building that machinery now, before the disposition of the
 * ambiguous/no-match buckets below is confirmed, would be exactly the kind
 * of unrequested feature this project's own conventions warn against.
 *
 * Reuses matchRebarStores() from rebar-feed.mjs — the same many-to-one-aware
 * matcher Unit 1's importer uses — rather than re-deriving matching logic a
 * second time (§17 face 3: logic imported, never duplicated).
 *
 * Usage: node scripts/remediate-rebar-53.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { recordKashrutWrite } from './shared/kashrut-write.mjs';
import { fetchRebarStores, matchRebarStores } from './shared/rebar-feed.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PLACES_PATH = resolve(root, 'src/data/generated/places.osm.json');

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
  };
}

/** Applies the evidence-ceiling write to a CLONE of the record — never the original. */
function proposedAfter(record) {
  const clone = { ...record };
  recordKashrutWrite(clone, 'kosherType', 'kosher', BASIS);
  recordKashrutWrite(clone, 'kosherLevel', null, BASIS);
  recordKashrutWrite(clone, 'kosherAuthorityGroup', 'unknown', BASIS);
  // kosherAuthority/certifiedBy: none of the 53 currently have either field
  // set (verified separately, not assumed) — so there is nothing to remove
  // and nothing to leave untouched; recordKashrutWrite is not called for
  // either field, matching the precedent in restore-rebar-two-branches.mjs
  // ("certifiedBy left untouched — the source names no body").
  return clone;
}

export async function main({ fetchImpl, placesPath }) {
  const places = readNoBom(placesPath);
  const existingRebar = places.filter((p) => typeof p.id === 'string' && p.id.startsWith('rebar-'));
  const needsRemediation = existingRebar.filter((r) => r.kosherType === 'mehadrin');
  const noKashrutFieldsAtAll = existingRebar.filter((r) => !('kosherType' in r));

  console.log(`Existing rebar-* records: ${existingRebar.length}`);
  console.log(`  asserting kosherType:'mehadrin' (in scope for this remediation): ${needsRemediation.length}`);
  console.log(`  with NO kashrut fields at all (out of scope — separate finding, see below): ${noKashrutFieldsAtAll.length}\n`);

  const stores = fetchImpl ? await fetchRebarStores(fetchImpl) : await fetchRebarStores();
  console.log(`Feed entries parsed: ${stores.length}\n`);

  const { confirmed, ambiguousRecords, noMatchRecords } = matchRebarStores(stores, existingRebar);

  const inScope = new Set(needsRemediation.map((r) => r.id));
  const confirmedInScope = confirmed.filter((c) => inScope.has(c.record.id));
  const ambiguousInScope = ambiguousRecords.filter((a) => inScope.has(a.record.id));
  const noMatchInScope = noMatchRecords.filter((r) => inScope.has(r.id));

  const confirmedTrue = confirmedInScope.filter((c) => c.store.kosher === true);
  const confirmedFalse = confirmedInScope.filter((c) => c.store.kosher === false);
  const confirmedOther = confirmedInScope.filter((c) => c.store.kosher !== true && c.store.kosher !== false);

  console.log('--- Summary (of the 53 in scope) ---');
  console.log(`  confirmed match, feed kosher:true  -> PROPOSED WRITE       : ${confirmedTrue.length}`);
  console.log(`  confirmed match, feed kosher:false -> STOP, no write       : ${confirmedFalse.length}`);
  console.log(`  confirmed match, feed kosher neither -> STOP, no write     : ${confirmedOther.length}`);
  console.log(`  AMBIGUOUS (2+ candidates)           -> see per-record below: ${ambiguousInScope.length}`);
  console.log(`  no feed candidate at all             -> see per-record below: ${noMatchInScope.length}\n`);

  console.log('=== PROPOSED WRITE — confirmed match, feed kosher:true ===');
  for (const { record, store } of confirmedTrue) {
    const before = fieldsSnapshot(record);
    const after = fieldsSnapshot(proposedAfter(record));
    console.log(`${record.id} (${record.name})`);
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
    console.log(`\n${record.id} (${record.name})`);
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

  if (noKashrutFieldsAtAll.length) {
    console.log('\n=== OUT OF SCOPE FINDING — records with NO kashrut fields at all ===');
    for (const r of noKashrutFieldsAtAll) {
      console.log(`${r.id} (${r.name}) — kosherType, kosherLevel, kosherAuthorityGroup all ABSENT, not even 'unknown'.`);
    }
  }

  // Manual, per-record resolution of the 2 ambiguous cases — NOT a change to
  // matchRebarStores' "never auto-resolve" rule (that guarantee stays
  // exactly as Unit 1 left it; this is a human-reviewed judgment call made
  // HERE, in the report layer, informed by the address-token evidence
  // printed above, and stated with its reasoning rather than applied
  // silently):
  //
  //   rebar-02629c63: candidate "קרית אתא- שער הצפון" has 3/5 address-token
  //   overlap AND its own city (קרית אתא) matches this record's cityId
  //   (קריית אתא — spelling variant of the same city). The other candidate,
  //   "חיפה- ביג קריות", has ZERO address-token overlap and a DIFFERENT
  //   city than this record's own cityId — a proximity-only false positive,
  //   not claimed by any other existing record in the 55. Resolved to the
  //   first candidate (kosher:true).
  //
  //   rebar-dc59d466: candidate "באר שבע- קניון הנגב" has 4/6 address-token
  //   overlap AND its own name embeds "קניון הנגב", the same as this
  //   record's own name — a double match, not just address. The other
  //   candidate, "באר שבע- תחנה מרכזית", has ZERO address-token overlap; its
  //   name instead matches the OUT-OF-SCOPE record rebar-bs-central-station
  //   ("...תחנה מרכזית"), which independently corroborates this resolution:
  //   under it, no feed store is claimed by two different existing records.
  //   Resolved to the first candidate (kosher:true).
  const AMBIGUOUS_RESOLUTIONS = {
    'rebar-02629c63': 0, // candidates[0] = "קרית אתא- שער הצפון"
    'rebar-dc59d466': 1, // candidates[1] = "באר שבע- קניון הנגב"
  };

  console.log('\n=== PROPOSED RESOLUTION — the 2 ambiguous records, per-record reasoning above ===');
  const ambiguousResolved = [];
  for (const { record, candidates } of ambiguousInScope) {
    const idx = AMBIGUOUS_RESOLUTIONS[record.id];
    const chosen = candidates[idx];
    ambiguousResolved.push({ record, store: chosen });
    console.log(`${record.id}: resolved to "${chosen.name}" (kosher=${JSON.stringify(chosen.kosher)}) — see reasoning in the comment above this block.`);
  }

  const allWrites = [...confirmedTrue, ...ambiguousResolved];

  console.log(`\n=== FULL PLAN — all ${needsRemediation.length} in-scope records, one line each ===`);
  const planLines = [];
  for (const r of needsRemediation) {
    const w = allWrites.find((x) => x.record.id === r.id);
    const before = fieldsSnapshot(r);
    if (w) {
      const after = fieldsSnapshot(proposedAfter(r));
      planLines.push(`${r.id} | ${r.name} | before=${JSON.stringify(before)} | after=${JSON.stringify(after)} | matched="${w.store.name}"`);
    } else {
      planLines.push(`${r.id} | ${r.name} | before=${JSON.stringify(before)} | STOP — no write (see STOP sections above)`);
    }
  }
  for (const line of planLines) console.log(line);

  return {
    existingRebar, needsRemediation, confirmedTrue, confirmedFalse, confirmedOther,
    ambiguousInScope, ambiguousResolved, noMatchInScope, noKashrutFieldsAtAll, allWrites, planLines,
  };
}

/**
 * Applies every proposed write to a CLONE of the full places array (never
 * the original) — used only by the disposable-worktree validation step, not
 * by the dry-run report path above. restaurants.osm.json mirrors the same
 * places (Unit 1's importer keeps them in lockstep), so the same field
 * writes are applied to matching ids there too, same as Unit 1.
 */
export function applyPlan(places, restaurants, allWrites) {
  const writeIds = new Set(allWrites.map((w) => w.record.id));
  const newPlaces = places.map((p) => (writeIds.has(p.id) ? proposedAfter(p) : p));
  const newRestaurants = restaurants.map((r) => (writeIds.has(r.id) ? proposedAfter(r) : r));
  return { newPlaces, newRestaurants };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main({ placesPath: PLACES_PATH });
}
