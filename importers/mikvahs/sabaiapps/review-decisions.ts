/**
 * Phase 5 — Review-decision PREVIEW for the Phase-4 dry-run (DRY-RUN, NO WRITES).
 *
 * Reads the Phase-4 unified dry-run and recommends a review decision for each of
 * the 72 records, WITHOUT writing to the DB or publishing:
 *   - clean new (native coords, no dup)      → approve_add_new
 *   - missing coordinates                     → geocoding_needed
 *   - suspected duplicate (match/conflict)    → discard_duplicate | enrich_existing
 *                                               | add_new | manual_review_required
 *
 * Recommendations combine the dedup verdict (class, distance, name similarity)
 * with an ADDRESS comparison against the matched government record, so a
 * name-similar but address-conflicting match is sent to manual review rather
 * than auto-enriched. Decisions are advisory; a human still approves.
 *
 * Run:  node importers/mikvahs/sabaiapps/review-decisions.ts
 * Out:  output/review-decisions-preview.json
 *       output/review-decisions-summary.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain } from '../../shared/utils.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'output');
const readJson = <T>(f: string): T => JSON.parse(readFileSync(join(OUT, f), 'utf8')) as T;

// --- input shapes ------------------------------------------------------------

interface DryRunRecord {
  stagingId: string; sourceId: string; name: string; city?: string;
  hadNativeCoords: boolean; duplicateClass: 'new' | 'match' | 'conflict' | null;
  duplicate: { matchedId?: string; matchedName?: string; distanceM?: number; nameSimilarity?: number; suspicious?: boolean } | null;
}
interface StagedFlat {
  sourceId: string; name: string; city: string; sourceName: string;
  address: string | null; phone: string | null; openingHours: string | null;
  category: string | null; balanit: string | null; sourceUrl: string | null;
  coordinates: { latitude: number; longitude: number } | null;
}
interface AppPlace {
  id: string; name: string; address?: string; phone?: string;
  location: { latitude: number; longitude: number }; locationPrecision?: string;
  openingHours?: string; extra?: Record<string, unknown>;
}

// --- address similarity ------------------------------------------------------

const STOP = /^(רחוב|רח|שדרות|שד|שכונת|שכ|דרך|מושב|קיבוץ|ישראל|israel)$/;
function addrTokens(s: string | null | undefined, city?: string): Set<string> {
  let t = String(s ?? '').replace(/["'׳״’”`.,()\[\]\-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (city) for (const c of city.split(' ')) t = t.split(' ').filter((x) => x !== c).join(' ');
  return new Set(t.split(/\s+/).filter((x) => x.length >= 2 && !STOP.test(x)));
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

const empty = (v: unknown): boolean => v == null || String(v).trim() === '';

/** Which gov fields the staged record could fill (gov empty / coarser). */
function enrichableFields(gov: AppPlace, st: StagedFlat): string[] {
  const ef: string[] = [];
  if (gov.locationPrecision !== 'address' && st.coordinates) ef.push('coordinates');
  ef.push('sourceUrl'); // gov places carry no source URL
  if (empty(gov.phone) && !empty(st.phone)) ef.push('phone');
  if (empty(gov.openingHours) && !empty(st.openingHours)) ef.push('openingHours');
  if (empty(gov.extra?.responsibleWorker) && !empty(st.balanit)) ef.push('balanit');
  if (empty(gov.extra?.forWomen) && empty(gov.extra?.forMen) && !empty(st.category)) ef.push('gender');
  return ef;
}

type Decision = 'approve_add_new' | 'enrich_existing' | 'discard_duplicate' | 'add_new' | 'manual_review_required' | 'geocoding_needed';

interface DecisionEntry {
  stagingId: string; sourceId: string; sourceName: string;
  name: string; city: string; category: string | null;
  decision: Decision; confidence: number; reason: string;
  stagedRecord: StagedFlat;
  matchedExisting?: { id: string; name: string; address?: string; phone?: string; location: { latitude: number; longitude: number }; locationPrecision?: string } | null;
  distanceM?: number; nameSimilarity?: number;
  addressComparison?: { staged: string | null; existing: string | null; similarity: number; agree: boolean };
  enrichableFields?: string[];
}

function decideSuspected(dr: DryRunRecord, st: StagedFlat, gov: AppPlace): DecisionEntry {
  const nameSim = dr.duplicate?.nameSimilarity ?? 0;
  const dist = dr.duplicate?.distanceM ?? Infinity;
  const addrSim = jaccard(addrTokens(st.address, st.city), addrTokens(gov.address, st.city));
  const addrAgree = addrSim >= 0.34;
  const ef = enrichableFields(gov, st);

  let decision: Decision;
  let confidence: number;
  let reason: string;

  // Distance is a weak signal here — gov coords are city-center geocodes, so the
  // detector already vetted these within its 600m name-match tier. Name + address
  // agreement is the real identity signal.
  const enrichOrDiscard = (): Decision => (ef.length ? 'enrich_existing' : 'discard_duplicate');
  if (dr.duplicateClass === 'conflict') {
    decision = 'manual_review_required';
    confidence = 0.5;
    reason = `Same location (${dist}m) but divergent names (sim ${nameSim}) — same facility under a different name vs a distinct nearby mikvah is unclear; needs a human.`;
  } else if (nameSim >= 0.8 && addrAgree) {
    decision = enrichOrDiscard();
    confidence = 0.88;
    reason = `Strong match (name sim ${nameSim}, address agrees, ${dist}m) — same facility the gov dataset already has. ${ef.length ? `SabaiApps enriches: ${ef.join(', ')}.` : 'Nothing new to add.'}`;
  } else if (nameSim >= 0.8 && !addrAgree) {
    decision = 'manual_review_required';
    confidence = 0.6;
    reason = `Name-similar (sim ${nameSim}, ${dist}m) but addresses conflict (staged "${st.address ?? ''}" vs gov "${gov.address ?? ''}") — possible false match; needs a human.`;
  } else if (nameSim >= 0.6 && (addrAgree || dist <= 200)) {
    decision = enrichOrDiscard();
    confidence = addrAgree ? 0.78 : 0.7;
    reason = `Likely the same mikvah (name sim ${nameSim}, ${dist}m${addrAgree ? ', address agrees' : ''}). Phase-2 missed it because this regional council keys the council name as the city while the gov record is stored under the settlement name (matched gov: "${gov.name}"). ${ef.length ? `Enriches: ${ef.join(', ')}.` : ''}`;
  } else {
    decision = 'manual_review_required';
    confidence = 0.55;
    reason = `Weak corroboration (sim ${nameSim}, ${dist}m, address sim ${addrSim.toFixed(2)}) — cannot confidently call it the same place; needs a human.`;
  }

  return {
    stagingId: dr.stagingId, sourceId: st.sourceId, sourceName: st.sourceName,
    name: st.name, city: st.city, category: st.category,
    decision, confidence, reason,
    stagedRecord: st,
    matchedExisting: { id: gov.id, name: gov.name, address: gov.address, phone: gov.phone, location: gov.location, locationPrecision: gov.locationPrecision },
    distanceM: dr.duplicate?.distanceM, nameSimilarity: nameSim,
    addressComparison: { staged: st.address, existing: gov.address ?? null, similarity: Number(addrSim.toFixed(2)), agree: addrAgree },
    enrichableFields: ef,
  };
}

function run(): void {
  const dryrun = readJson<{ records: DryRunRecord[] }>('sabaiapps-unified-dryrun.json').records;
  const staging = readJson<StagedFlat[]>('sabaiapps-new-mikvahs-staging.json');
  const appPlaces = readJson<AppPlace[]>('places.mikvahs.app.json');
  const govById = new Map(appPlaces.map((p) => [p.id, p]));
  const stagedByKey = new Map(staging.map((s) => [`${s.sourceId}||${s.name}`, s]));

  const entries: DecisionEntry[] = [];
  for (const dr of dryrun) {
    const st = stagedByKey.get(`${dr.sourceId}||${dr.name}`);
    if (!st) continue; // defensive

    if (!dr.hadNativeCoords) {
      entries.push({
        stagingId: dr.stagingId, sourceId: st.sourceId, sourceName: st.sourceName,
        name: st.name, city: st.city, category: st.category,
        decision: 'geocoding_needed', confidence: 0.5,
        reason: 'No native coordinates — cannot be deduplicated or placed yet. Resolve coordinates (geocoder or manual), then re-run dedup before deciding add vs enrich.',
        stagedRecord: st, matchedExisting: null,
      });
      continue;
    }

    if (dr.duplicate && dr.duplicateClass && dr.duplicateClass !== 'new') {
      const gov = dr.duplicate.matchedId ? govById.get(dr.duplicate.matchedId) : undefined;
      if (gov) { entries.push(decideSuspected(dr, st, gov)); continue; }
    }

    // clean new with coordinates
    entries.push({
      stagingId: dr.stagingId, sourceId: st.sourceId, sourceName: st.sourceName,
      name: st.name, city: st.city, category: st.category,
      decision: 'approve_add_new', confidence: 0.9,
      reason: 'Clean new mikvah: native coordinates, no live duplicate within range. Recommend approving as a new additive record.',
      stagedRecord: st, matchedExisting: null,
    });
  }

  // --- aggregate ---
  const n = (d: Decision) => entries.filter((e) => e.decision === d).length;
  const approveAdd = n('approve_add_new') + n('add_new');
  const enrich = n('enrich_existing');
  const discard = n('discard_duplicate');
  const manual = n('manual_review_required');
  const geocoding = n('geocoding_needed');

  // truly-new estimate: confirmed adds + the provisional geocoding-needed (likely
  // new); enrich/discard are existing; manual is unresolved (excluded, range top).
  const finalTrulyNewLikely = approveAdd + geocoding;
  const finalTrulyNewRange = { low: approveAdd, likely: finalTrulyNewLikely, high: finalTrulyNewLikely + manual };

  const enrichableFieldTally: Record<string, number> = {};
  for (const e of entries) if (e.decision === 'enrich_existing') for (const f of e.enrichableFields ?? []) enrichableFieldTally[f] = (enrichableFieldTally[f] ?? 0) + 1;

  const summary = {
    generatedNote: 'PHASE 5 DRY-RUN — review-decision preview. Advisory only. No DB write, no publish, no merge. A human approves each decision.',
    inputRecords: entries.length,
    decisions: {
      approve_add_new: approveAdd,
      enrich_existing: enrich,
      discard_duplicate: discard,
      manual_review_required: manual,
      geocoding_needed: geocoding,
    },
    enrichmentFieldsByType: enrichableFieldTally,
    byCity: (() => { const m: Record<string, Record<string, number>> = {}; for (const e of entries) { (m[e.city] ??= {})[e.decision] = ((m[e.city] ??= {})[e.decision] ?? 0) + 1; } return m; })(),
    finalEstimatedTrulyNewMikvehs: finalTrulyNewRange,
    coverageNote: `Gov canonical 606 + ~${finalTrulyNewLikely} truly-new SabaiApps = ~${606 + finalTrulyNewLikely} (down from the Phase-2 estimate of 678: ${enrich} are gov-existing under settlement names → enrich, ${manual} await manual adjudication).`,
    interpretation: 'enrich_existing concentrates in the regional council Merhavim — Phase-2 classified these new because it keyed the council name as city, but the gov dataset stores them under settlement names; geo-dedup (Phase 4) recovered the overlap.',
    dryRun: true,
    liveDataTouched: false,
    publishPerformed: false,
  };

  writeFileSync(join(OUT, 'review-decisions-preview.json'), JSON.stringify(entries, null, 2), 'utf8');
  writeFileSync(join(OUT, 'review-decisions-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('=== Phase 5 review-decision preview (dry-run) ===');
  console.log(`input=${entries.length}`);
  console.log(`approve/add=${approveAdd} enrich=${enrich} discard=${discard} manual=${manual} geocoding_needed=${geocoding}`);
  console.log(`final truly-new: likely ${finalTrulyNewLikely} (range ${finalTrulyNewRange.low}–${finalTrulyNewRange.high})`);
  console.log(`enrichment fields:`, JSON.stringify(enrichableFieldTally));
}

if (isMain(import.meta.url)) run();
