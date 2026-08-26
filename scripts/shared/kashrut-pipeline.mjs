/**
 * The shared kashrut-remediation pipeline (Item 4 Unit 3 architecture pivot,
 * 2026-08-27). One pipeline, per-source adapters — the owner's own words:
 * "each source we use needs to pass the same guards and logic... each source
 * will just have an adapter to the same pipeline." This file is that one
 * place; scripts/shared/adapters/*.mjs are the adapters.
 *
 * An adapter reports what its source says and interprets nothing — see
 * adapters/rebar-adapter.mjs and adapters/greg-adapter.mjs for the exact
 * contract. Everything below is the ONLY place kosher/level/body/floor is
 * decided, so that argument is won once, not once per chain (§17 face 3 at
 * the architecture level — the mistake this file exists to stop repeating).
 *
 * === THE GATES (owner-specified, 2026-08-27) ===
 *
 * Gate 0 — selectivity, computed across the ADAPTER'S FULL branch list, not
 * per record: is the affirmative marker applied selectively, or does every
 * branch carry it? A marker on every branch is a chain-level statement, not
 * a per-branch fact, and everything downstream is weaker for it. This is a
 * REPORTED fact, not a gate that blocks anything by itself.
 *
 * Gate 1 — what does the source say about THIS branch?
 *   marked NOT kosher  -> SOURCE_STATES_NON_KOSHER. STOP: do not write, do
 *                          not delete, report. (Unit 1's rule, verbatim.)
 *   silent              -> SOURCE_SILENT_ON_KASHRUT. No claim, no write.
 *   marked kosher       -> kosher established for this branch; continue.
 *
 * Gate 2 — who certifies it? Source names a body -> record it VERBATIM
 * (becomes certifiedBy). Names none -> record none. Never invent one.
 *
 * Gate 3 — what level? A level may be asserted ONLY when the source states a
 * level AND names a body whose registry entry supports that level. A level
 * phrase with no supporting body does NOT establish a level — this is what
 * settled greg's 38.
 *
 * Gate 4 — the floor. Kosher established, no body, no supported level ->
 * kosherType 'rabanut' / kosherLevel 'regular' / kosherAuthorityGroup
 * 'rabbinate', not 'unknown'. Reasoning (owner's, recorded as an assumption
 * because that is what it is, not an invention): an Israeli business cannot
 * lawfully display a kashrut claim without Rabbanut certification, so
 * "kosher" entails at least that.
 *
 * The unbacked level phrase a Gate-4 branch carries (e.g. greg's "כשר
 * למהדרין") is recorded NOWHERE in the written record — not in certifiedBy,
 * which answers WHO certifies and would misrepresent a level phrase as a
 * body — only in this pipeline's report, per branch, so a human can still
 * read exactly what the source claimed.
 *
 * === CLOSED OUTCOME SET — no default, no fallthrough ===
 * AMBIGUOUS | SOURCE_UNREACHABLE | SOURCE_STATES_NON_KOSHER |
 * SOURCE_SILENT_ON_KASHRUT | SOURCE_STATES_A_LEVEL | SOURCE_STATES_KOSHER_NO_LEVEL
 * classifyBranch() below returns exactly one of these for every matched
 * record; anything unmatched by the gate chain throws rather than falls
 * through to a default.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordKashrutWrite } from './kashrut-write.mjs';
import { matchSourceBranches } from './store-matcher.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = resolve(HERE, '..', 'reports', 'kashrut-registry.json');

export const OUTCOMES = Object.freeze({
  AMBIGUOUS: 'AMBIGUOUS',
  SOURCE_UNREACHABLE: 'SOURCE_UNREACHABLE',
  SOURCE_STATES_NON_KOSHER: 'SOURCE_STATES_NON_KOSHER',
  SOURCE_SILENT_ON_KASHRUT: 'SOURCE_SILENT_ON_KASHRUT',
  SOURCE_STATES_A_LEVEL: 'SOURCE_STATES_A_LEVEL',
  SOURCE_STATES_KOSHER_NO_LEVEL: 'SOURCE_STATES_KOSHER_NO_LEVEL',
});

export function readNoBom(p) {
  const buf = readFileSync(p);
  const s = buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF ? buf.slice(3) : buf;
  return JSON.parse(s.toString('utf8'));
}
export function writeNoBom(p, data) {
  const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);
  writeFileSync(p, Buffer.concat([BOM, Buffer.from(JSON.stringify(data, null, 2), 'utf8')]));
}

function loadRegistry() {
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8').replace(/^﻿/, ''));
  return {
    aliasByRaw: new Map(registry.aliases.map((a) => [a.raw, a])),
    authorityById: new Map(registry.authorities.map((a) => [a.id, a])),
  };
}

/**
 * Gate 0 — selectivity across the adapter's FULL branch list (not just the
 * ones that end up matched to a dataset record): does the source's marker
 * actually discriminate between branches, or does every branch carry the
 * identical value? `selective` is TRUE only when at least two distinct
 * kashrutMarker values appear in the source at all — a source that marks
 * every branch 'asserted' (a chain-level marketing statement, not a
 * per-branch fact) is exactly as undifferentiated as one that marks every
 * branch 'negative' or every branch silent; only a source that actually
 * distinguishes branches earns the "per-branch fact" reading Gate 1 below
 * grants a selective source's affirmative marker.
 *
 * BOUND into Gate 1, not decorative: classifyBranch() takes this value and
 * downgrades an 'asserted' branch to SOURCE_SILENT_ON_KASHRUT when the
 * source as a whole is not selective — see classifyBranch for why only the
 * positive reading is affected.
 */
export function gate0Selectivity(branches) {
  const asserted = branches.filter((b) => b.kashrutMarker === 'asserted').length;
  const negative = branches.filter((b) => b.kashrutMarker === 'negative').length;
  const silent = branches.filter((b) => b.kashrutMarker === 'not_asserted').length;
  const distinctMarkers = new Set(branches.map((b) => b.kashrutMarker)).size;
  const selective = branches.length > 0 && distinctMarkers > 1;
  return { total: branches.length, asserted, negative, silent, selective };
}

/**
 * Gates 1-4 for one already-matched branch. Returns exactly one closed
 * outcome — throws rather than falling through if a future adapter reports
 * a kashrutMarker value outside the three this pipeline understands.
 *
 * @param {boolean} selective - Gate 0's reading for the WHOLE source this
 *   branch came from (not just this branch) — required, no default, so a
 *   caller cannot forget to bind Gate 0 into Gate 1.
 */
export function classifyBranch(branch, registry, selective) {
  if (typeof selective !== 'boolean') {
    throw new Error('classifyBranch: `selective` (Gate 0\'s reading for this branch\'s source) is required — call gate0Selectivity() first and pass its result, never omit it.');
  }
  if (branch.kashrutMarker === 'negative') {
    // An explicit non-kosher marking is never a marketing artifact the way a
    // uniform positive marking can be — no business fakes a false negative
    // about itself — so Gate 0's selectivity reading does not gate this
    // branch. Unit 1's STOP rule applies regardless of source selectivity.
    return { outcome: OUTCOMES.SOURCE_STATES_NON_KOSHER, write: null, branch };
  }
  if (branch.kashrutMarker === 'not_asserted') {
    return { outcome: OUTCOMES.SOURCE_SILENT_ON_KASHRUT, write: null, branch };
  }
  if (branch.kashrutMarker !== 'asserted') {
    throw new Error(`classifyBranch: unrecognized kashrutMarker ${JSON.stringify(branch.kashrutMarker)} — the adapter contract only permits 'asserted'|'negative'|'not_asserted'.`);
  }
  if (!selective) {
    // The source's affirmative marker carries no per-branch information —
    // every branch says the same thing, so this branch's 'asserted' is
    // indistinguishable from a chain-level marketing statement. Gate 1 may
    // NOT read "kosher established" from it.
    return { outcome: OUTCOMES.SOURCE_SILENT_ON_KASHRUT, write: null, branch };
  }

  // Gate 1 passed: kosher established. Gate 2: who certifies?
  const body = branch.bodyText || null;
  const alias = body ? registry.aliasByRaw.get(body) ?? null : null;

  // Gate 3: level requires BOTH a level phrase AND a body whose registry
  // entry supports that level (matches basisSupportsLevelAssertion's own
  // registry-alias rule in kashrut-write.mjs — this pipeline resolves the
  // same registry the write-time guard checks, not a second copy of it).
  const levelSupported = Boolean(branch.levelText) && alias?.level === 'mehadrin';

  if (levelSupported) {
    const authority = registry.authorityById.get(alias.authorityId);
    return {
      outcome: OUTCOMES.SOURCE_STATES_A_LEVEL,
      write: {
        kosherType: 'mehadrin',
        kosherLevel: 'mehadrin',
        kosherAuthorityGroup: authority?.group ?? 'unknown',
        certifiedBy: body,
        levelBasis: { kind: 'registry-alias', alias: body, aliasLevel: 'mehadrin' },
      },
      branch,
    };
  }

  if (body) {
    // Gate 3 failed with a body actually named (unsupported level, or no
    // level claimed at all): kosher established, certifier recorded
    // verbatim, no level. Not exercised by rebar (no body ever) or greg (no
    // body ever) as of this writing — kept honest rather than precise: this
    // pipeline does not invent a specific badatz_* kosherType from a
    // registry authorityId (the hyphen/underscore authority namespaces are
    // known NOT to be a safe string transform of each other — see
    // docs/KASHRUT_FACTS.md), so it falls back to the generic 'kosher' type
    // plus the resolved authority's group, both real values, neither
    // invented. Revisit with a real mapping if/when a source actually hits
    // this branch.
    const authority = alias ? registry.authorityById.get(alias.authorityId) : null;
    return {
      outcome: OUTCOMES.SOURCE_STATES_KOSHER_NO_LEVEL,
      write: {
        kosherType: authority?.group === 'rabbinate' ? 'rabanut' : 'kosher',
        kosherLevel: null,
        kosherAuthorityGroup: authority?.group ?? 'unknown',
        certifiedBy: body,
        floorApplied: false,
      },
      branch,
    };
  }

  // Gate 4 — REVISED 2026-08-27: the floor is a PRESENTATION concern, not a
  // data write. Writing kosherAuthorityGroup:'rabbinate' here would remove
  // these records from the kashrutAuthorityUnknown ratchet count
  // (validate-data.mjs: FOOD_TYPES && (!kosherAuthorityGroup || === 'unknown'))
  // while adding zero certificate documents and zero new facts — deleting
  // the counter that measures our ignorance, in exactly the field real
  // evidence is supposed to write into. The legal-compliance inference was
  // also invalid in form (assumes the business is compliant; the population
  // most needing a floor is the least likely to be). The data stays at the
  // same evidence ceiling Item 4 Unit 1/2 already established for this exact
  // fact pattern (kosher established, no body anywhere) — kosherType:
  // 'kosher', kosherLevel: null, kosherAuthorityGroup: 'unknown'. A "כשרות
  // מקומית" floor, if wanted, is a display-layer decision reading THIS
  // shape — not a write. unbackedLevelClaim is still carried on the write
  // plan (report-only; applyWriteToRecord never persists it) so a level
  // phrase the source stated is still visible to whoever reviews this run,
  // even though nothing about it reaches the dataset.
  return {
    outcome: OUTCOMES.SOURCE_STATES_KOSHER_NO_LEVEL,
    write: {
      kosherType: 'kosher',
      kosherLevel: null,
      kosherAuthorityGroup: 'unknown',
      certifiedBy: null,
      floorApplied: true,
      unbackedLevelClaim: branch.levelText || null,
    },
    branch,
  };
}

function fieldsSnapshot(record) {
  return {
    kosherType: record.kosherType,
    kosherLevel: 'kosherLevel' in record ? record.kosherLevel : undefined,
    kosherAuthorityGroup: 'kosherAuthorityGroup' in record ? record.kosherAuthorityGroup : undefined,
    kosherAuthority: 'kosherAuthority' in record ? record.kosherAuthority : undefined,
    certifiedBy: 'certifiedBy' in record ? record.certifiedBy : undefined,
    sourceUrl: 'sourceUrl' in record ? record.sourceUrl : undefined,
    lastVerifiedAt: 'lastVerifiedAt' in record ? record.lastVerifiedAt : undefined,
  };
}

/**
 * Refuses to move lastVerifiedAt backward relative to the record's current
 * value — the exact one-shot-frozen-payload signature validate-data.mjs
 * hard-fails on. String comparison is correct for YYYY-MM-DD. Ported
 * unchanged from remediate-rebar-55.mjs.
 */
function assertNotBackdating(record, runDate) {
  const prior = record.lastVerifiedAt;
  if (prior && runDate < prior) {
    throw new Error(
      `${record.id}: refusing to write lastVerifiedAt=${JSON.stringify(runDate)} over existing ${JSON.stringify(prior)} — that would move it backward.`,
    );
  }
}

/**
 * Applies one classifyBranch() write (a places.osm.json-shaped object) to a
 * CLONE of `record`, through recordKashrutWrite for every KASHRUT_FIELDS
 * field the write touches, and direct assignment for sourceUrl/
 * lastVerifiedAt (not kashrut fields, not covered by that choke point —
 * same reasoning as remediate-rebar-55.mjs). `schema` is 'places' or
 * 'restaurants' — restaurants.osm.json records carry kosherType only, no
 * kosherLevel/kosherAuthorityGroup/certifiedBy fields (confirmed by reading
 * the live file, not assumed), so those keys are skipped entirely for that
 * file rather than written as spurious new fields it has never had.
 */
function applyWriteToRecord(record, write, sourceUrl, runDate, schema) {
  assertNotBackdating(record, runDate);
  const clone = { ...record };
  const basis = write.levelBasis ?? { kind: 'human-review', note: 'Kashrut pipeline Gate 1-4 decision; see the dry-run report for this record\'s branch evidence.' };

  recordKashrutWrite(clone, 'kosherType', write.kosherType, basis);
  if (schema === 'places') {
    recordKashrutWrite(clone, 'kosherLevel', write.kosherLevel, basis);
    recordKashrutWrite(clone, 'kosherAuthorityGroup', write.kosherAuthorityGroup, basis);
  }
  if (write.certifiedBy) {
    recordKashrutWrite(clone, 'certifiedBy', write.certifiedBy, basis);
  }
  clone.sourceUrl = sourceUrl;
  clone.lastVerifiedAt = runDate;
  return clone;
}

/**
 * Runs the full pipeline for one chain: fetch via the adapter, match against
 * the chain's existing records (both dataset files), classify every matched
 * branch through Gates 1-4, and — only when `apply` is true — write.
 *
 * @param {object} opts
 * @param {() => Promise<Array>} opts.fetchBranches - the adapter's fetchBranches, already bound to any fetchImpl the caller wants.
 * @param {Array} opts.places - places.osm.json, already parsed.
 * @param {Array} opts.restaurants - restaurants.osm.json, already parsed.
 * @param {(record: object) => boolean} opts.isInChain - selects this chain's existing records out of `places`.
 * @param {boolean} opts.apply - structural write gate; dry-run unless true.
 * @param {string} [opts.chainName] - for report labeling only.
 * @param {Object<string, {branchSourceKey: string, reasoning: string}>} [opts.resolutions] -
 *   EXPLICIT, human-authored resolutions for ambiguous records — never a
 *   computed fallback the matcher invents itself (the matcher's own
 *   guarantee is that it never auto-resolves; this is the separate,
 *   auditable channel a human uses to resolve one anyway). Keyed by record
 *   id. Validated against the matcher's own output, not trusted blind:
 *     - a resolution naming a record the matcher did NOT call ambiguous -> throws.
 *     - the resolution's branchSourceKey must be one of that record's actual
 *       candidates (by branch.sourceKey) -> throws otherwise.
 *     - an ambiguous record with NO resolution entry stays AMBIGUOUS,
 *       reported, unwritten — resolutions are opt-in per record, never
 *       required.
 *   Defaults to {} (nothing pre-resolved) — the one default in this
 *   function's options, and it errs toward NOT writing, unlike `apply`.
 * NO DEFAULT on `apply` — an omitted value must not silently mean "write nothing" OR "write production"; the caller states it explicitly every time.
 */
export async function runPipeline({ fetchBranches, places, restaurants, isInChain, apply, chainName, resolutions = {} }) {
  if (typeof apply !== 'boolean') {
    throw new Error('runPipeline: `apply` must be explicitly true or false — no default, so a caller can never write production by omission.');
  }
  const registry = loadRegistry();
  const existingRecords = places.filter(isInChain);

  let branches;
  try {
    branches = await fetchBranches();
  } catch (err) {
    return {
      outcome: OUTCOMES.SOURCE_UNREACHABLE,
      chainName,
      error: String(err && err.message ? err.message : err),
      existingRecords,
      writes: [],
      report: [`SOURCE_UNREACHABLE (${chainName ?? 'chain'}): ${String(err && err.message ? err.message : err)}`],
    };
  }

  const gate0 = gate0Selectivity(branches);
  const { confirmed, ambiguousRecords, noMatchRecords } = matchSourceBranches(branches, existingRecords);

  // Validate resolutions against what the matcher actually found — a
  // resolution is never trusted on its own say-so.
  const ambiguousById = new Map(ambiguousRecords.map((a) => [a.record.id, a]));
  for (const recordId of Object.keys(resolutions)) {
    const ambiguous = ambiguousById.get(recordId);
    if (!ambiguous) {
      throw new Error(`runPipeline: resolutions["${recordId}"] names a record the matcher did not call ambiguous — never apply a resolution the matcher's own output doesn't support.`);
    }
    const { branchSourceKey } = resolutions[recordId];
    const chosen = ambiguous.candidates.find((c) => c.sourceKey === branchSourceKey);
    if (!chosen) {
      throw new Error(`runPipeline: resolutions["${recordId}"].branchSourceKey=${JSON.stringify(branchSourceKey)} is not one of this record's actual candidates (${JSON.stringify(ambiguous.candidates.map((c) => c.sourceKey))}) — the resolution is stale against this fetch's candidate set.`);
    }
  }
  const resolvedRecordIds = new Set(Object.keys(resolutions));

  const runDate = new Date().toISOString().slice(0, 10);
  const report = [];
  report.push(`=== ${chainName ?? 'chain'}: Gate 0 — selectivity ===`);
  report.push(`  ${gate0.total} branches: ${gate0.asserted} asserted, ${gate0.negative} negative, ${gate0.silent} silent. selective=${gate0.selective}`);

  const perRecord = [];
  for (const { record, branch } of confirmed) {
    const classification = classifyBranch(branch, registry, gate0.selective);
    perRecord.push({ record, branch, ...classification });
  }
  for (const { record, candidates } of ambiguousRecords) {
    if (resolvedRecordIds.has(record.id)) {
      const { branchSourceKey, reasoning } = resolutions[record.id];
      const branch = candidates.find((c) => c.sourceKey === branchSourceKey);
      const classification = classifyBranch(branch, registry, gate0.selective);
      perRecord.push({ record, branch, resolutionReasoning: reasoning, ...classification });
    } else {
      perRecord.push({ record, outcome: OUTCOMES.AMBIGUOUS, write: null, candidates });
    }
  }
  for (const record of noMatchRecords) {
    perRecord.push({ record, outcome: OUTCOMES.AMBIGUOUS, write: null, candidates: [], noCandidateAtAll: true });
  }

  report.push(`\n=== ${chainName ?? 'chain'}: per-record outcomes (${perRecord.length}) ===`);
  for (const pr of perRecord) {
    if (pr.outcome === OUTCOMES.AMBIGUOUS) {
      report.push(`${pr.record.id} (${pr.record.name}) -> AMBIGUOUS (${pr.candidates?.length ?? 0} candidate(s)${pr.noCandidateAtAll ? ', none at all' : ''})`);
    } else if (pr.write) {
      const resolvedNote = pr.resolutionReasoning ? ` | RESOLVED: ${pr.resolutionReasoning}` : '';
      report.push(`${pr.record.id} (${pr.record.name}) -> ${pr.outcome} | before=${JSON.stringify(fieldsSnapshot(pr.record))} | write=${JSON.stringify(pr.write)} | sourceUrl=${pr.branch.sourceUrl}${resolvedNote}`);
    } else {
      report.push(`${pr.record.id} (${pr.record.name}) -> ${pr.outcome} (no write)`);
    }
  }

  const writes = perRecord.filter((pr) => pr.write);

  // runPipeline() never touches disk itself — `apply` is threaded through so
  // a caller's intent is visible in this result, but writing (with its
  // backup, its real file paths, its --apply CLI flag) is applyPipelineWrites()
  // below, called separately after a human has seen this report. Same
  // two-step shape as remediate-rebar-55.mjs.
  return { outcome: null, chainName, apply, gate0, confirmed, ambiguousRecords, noMatchRecords, perRecord, writes, runDate, report };
}

/**
 * Applies a runPipeline() result's writes to CLONEs of the full places/
 * restaurants arrays — never the originals. Separate from runPipeline()
 * itself so a caller can inspect the dry-run result, get explicit approval,
 * and only THEN call this against real file paths with a backup — the same
 * two-step shape as remediate-rebar-55.mjs's applyPlan().
 */
export function applyPipelineWrites(places, restaurants, writes, runDate) {
  const byId = new Map(writes.map((w) => [w.record.id, w]));
  const newPlaces = places.map((p) => {
    const w = byId.get(p.id);
    return w ? applyWriteToRecord(p, w.write, w.branch.sourceUrl, runDate, 'places') : p;
  });
  const newRestaurants = restaurants.map((r) => {
    const w = byId.get(r.id);
    return w ? applyWriteToRecord(r, w.write, w.branch.sourceUrl, runDate, 'restaurants') : r;
  });
  return { newPlaces, newRestaurants };
}

export { loadRegistry, fieldsSnapshot };
