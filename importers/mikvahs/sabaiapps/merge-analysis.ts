/**
 * Phase 2 — Government dataset merge ANALYSIS (DRY-RUN, REPORTS ONLY).
 *
 * Compares the canonical data.gov.il mikveh dataset (606 records) against the
 * Phase-1 SabaiApps preview (120 records) and produces four analysis reports.
 * It NEVER writes to the app DB, NEVER merges, NEVER geocodes, NEVER mutates the
 * source datasets. Output is advisory only.
 *
 * Matching strategy (highest confidence first):
 *   1. Native coordinates (only vs gov records geocoded at 'address' precision)
 *   2. Normalized address (street tokens + house number, same city)
 *   3. Normalized name (same city)
 *   4. Phone number
 *   5. City + address similarity
 *
 * Each SabaiApps record is classified as exactly one of:
 *   exact_match | probable_match | new_record | ambiguous | requires_manual_review
 *
 * Run:  node importers/mikvahs/sabaiapps/merge-analysis.ts
 * Out:  output/government-merge-analysis.json
 *       output/government-enrichment-preview.json
 *       output/government-new-mikvahs.json
 *       output/government-dedup-summary.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { distanceKm, isMain } from '../../shared/utils.ts';
import type { MikvahCouncilPlace } from './sources.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'output');
const readJson = <T>(f: string): T => JSON.parse(readFileSync(join(OUT, f), 'utf8')) as T;

// --- source shapes -----------------------------------------------------------

interface GovMikvah {
  sourceId: string;
  name: string;
  city?: string;
  address?: string;
  phone?: string;
  openingHours?: string;
  extra: {
    hoursWinter?: string; hoursShabbat?: string; accessibility?: string;
    forWomen?: string; forMen?: string; forDishes?: string; brideRoom?: string;
    responsible?: string; council?: string;
  };
  lat?: number;
  lng?: number;
  geocodePrecision?: 'address' | 'city';
}

/** gov record enriched with exact coords joined from the geocoded file. */
interface GovRec extends GovMikvah {
  hasExactCoords: boolean;
}

// --- normalization -----------------------------------------------------------

const STREET_PREFIXES = /^(רחוב|רח|שדרות|שד|שכונת|שכ|דרך|סמטת|סמ|ככר|כיכר)$/;

const stripPunct = (s: string): string =>
  s.replace(/["'׳״’”`.()\[\]\-]/g, ' ').replace(/\s+/g, ' ').trim();

function normCity(s: string | undefined): string {
  return stripPunct(String(s ?? '')).replace(/\s+/g, ' ').trim();
}

const MIKVAH_WORDS = /(מקוואות|מקואות|מקווה|מקוה|טהרת|נשים|גברים|כלים)/g;
function normName(s: string | undefined): string {
  return stripPunct(String(s ?? '').replace(MIKVAH_WORDS, ' ')).replace(/\s+/g, ' ').trim();
}

function digits(s: string | undefined): string {
  const d = String(s ?? '').replace(/\D/g, '');
  return d.length > 10 ? d.slice(-10) : d; // drop country prefix noise
}

interface AddrParts { houseNum: string | null; streetTokens: Set<string>; }

function normAddr(addr: string | undefined, city: string | undefined): AddrParts {
  let s = stripPunct(String(addr ?? ''));
  s = s.replace(/\b(ישראל|israel)\b/gi, ' ');
  const cityN = normCity(city);
  if (cityN) s = s.split(' ').filter((t) => !cityN.split(' ').includes(t)).join(' ');
  const tokens = s.split(/\s+/).filter(Boolean);
  let houseNum: string | null = null;
  const streetTokens = new Set<string>();
  for (const t of tokens) {
    if (/^\d+[א-ת]?$/.test(t)) { if (!houseNum) houseNum = t.replace(/[^\d]/g, ''); continue; }
    if (STREET_PREFIXES.test(t)) continue;
    if (t.length >= 2) streetTokens.add(t);
  }
  return { houseNum, streetTokens };
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

const metersBetween = (aLat: number, aLng: number, bLat: number, bLng: number): number =>
  distanceKm(aLat, aLng, bLat, bLng) * 1000;

// --- scoring -----------------------------------------------------------------

type Tier = 'coords-exact' | 'address-exact' | 'phone+context' | 'coords-near'
  | 'address-partial' | 'name' | 'phone-only' | 'city+addr-sim';

interface Score {
  conf: number;
  /** Secondary richer score to break confidence ties (name/address/coord/phone). */
  detail: number;
  tier: Tier;
  signals: string[];
  distanceM: number | null;
}

/** Score one SabaiApps record against one gov candidate. null = below floor. */
function score(s: MikvahCouncilPlace, g: GovRec): Score | null {
  const cityMatch = !!s.city && normCity(s.city) === normCity(g.city);
  const sAddr = normAddr(s.address ?? undefined, s.city);
  const gAddr = normAddr(g.address, g.city);
  const streetSim = jaccard(sAddr.streetTokens, gAddr.streetTokens);
  const houseEq = !!sAddr.houseNum && sAddr.houseNum === gAddr.houseNum;
  const addrExact = cityMatch && streetSim >= 0.6 && houseEq;
  const addrPartial = cityMatch && streetSim >= 0.5 && (houseEq || !sAddr.houseNum || !gAddr.houseNum);
  const nameMatch = cityMatch && normName(s.name).length >= 3 && normName(s.name) === normName(g.name);
  const phoneEq = digits(s.phone ?? undefined).length >= 9 && digits(s.phone ?? undefined) === digits(g.phone);

  let distM: number | null = null;
  if (s.lat != null && s.lng != null && g.hasExactCoords && g.lat != null && g.lng != null) {
    distM = Math.round(metersBetween(s.lat, s.lng, g.lat, g.lng));
  }
  const coordsExact = distM != null && distM <= 60;
  const coordsNear = distM != null && distM <= 150;

  const sig: string[] = [];
  if (cityMatch) sig.push('city');
  if (coordsExact) sig.push(`coords<=60m(${distM}m)`);
  else if (coordsNear) sig.push(`coords<=150m(${distM}m)`);
  if (addrExact) sig.push('address-exact');
  else if (addrPartial) sig.push(`address-partial(j=${streetSim.toFixed(2)})`);
  if (nameMatch) sig.push('name');
  if (phoneEq) sig.push('phone');

  // tie-breaker: rewards the candidate that agrees on the DISTINGUISHING fields
  // (name/address/coords), so a shared council phone cannot fan out 1→many.
  const detail =
    streetSim +
    (nameMatch ? 0.5 : 0) +
    (houseEq ? 0.5 : 0) +
    (coordsExact ? 1 : coordsNear ? 0.5 : 0) +
    (phoneEq ? 0.3 : 0);
  const mk = (conf: number, tier: Tier): Score => ({ conf, detail, tier, signals: sig, distanceM: distM });

  // tiered decision, highest confidence first. NOTE: phone is only decisive when
  // paired with a distinguishing signal — phone+city alone is NOT unique (councils
  // reuse one central number across all their mikvahs).
  if (phoneEq && (addrPartial || nameMatch || coordsNear)) return mk(0.97, 'phone+context');
  if (coordsExact) return mk(0.95, 'coords-exact');
  if (addrExact) return mk(0.92, 'address-exact');
  if (coordsNear && (addrPartial || nameMatch)) return mk(0.85, 'coords-near');
  if (addrPartial) return mk(0.8, 'address-partial');
  if (nameMatch) return mk(0.75, 'name');
  if (phoneEq && cityMatch) return mk(0.62, 'phone-only'); // phone+city only: weak, needs review
  if (cityMatch && streetSim >= 0.4) return mk(0.55, 'city+addr-sim');
  return null;
}

// --- enrichment ---------------------------------------------------------------

const empty = (v: unknown): boolean => v == null || String(v).trim() === '';

const ENRICH_FIELDS = ['phone', 'openingHours', 'gender', 'balanit', 'coordinates', 'notes', 'sourceUrl'] as const;
type EnrichField = (typeof ENRICH_FIELDS)[number];

interface FieldEnrichment { field: EnrichField; current: string | null; proposed: string; }

/** Which gov fields a matched SabaiApps record could fill (gov is empty). */
function enrichments(g: GovRec, s: MikvahCouncilPlace): FieldEnrichment[] {
  const out: FieldEnrichment[] = [];
  const balanit = (s.raw as any)?.balanit as string | undefined;

  if (empty(g.phone) && !empty(s.phone)) out.push({ field: 'phone', current: null, proposed: s.phone! });
  if (empty(g.openingHours) && !empty(s.openingHours)) out.push({ field: 'openingHours', current: null, proposed: s.openingHours! });
  if (empty(g.extra.forWomen) && empty(g.extra.forMen) && !empty(s.category))
    out.push({ field: 'gender', current: null, proposed: s.category! });
  if (empty(g.extra.responsible) && !empty(balanit)) out.push({ field: 'balanit', current: null, proposed: balanit! });
  // coordinates: gov lacks EXACT coords but SabaiApps has native exact coords
  if (!g.hasExactCoords && s.lat != null && s.lng != null)
    out.push({ field: 'coordinates', current: g.lat != null ? `${g.lat},${g.lng} (city)` : null, proposed: `${s.lat},${s.lng}` });
  if (empty(g.openingHours) && empty((s.raw as any)?.hopePhone) === false)
    out.push({ field: 'notes', current: null, proposed: `contact: ${(s.raw as any).hopePhone}` });
  if (!empty(s.sourceUrl)) out.push({ field: 'sourceUrl', current: null, proposed: s.sourceUrl! });
  return out;
}

// --- main --------------------------------------------------------------------

interface MatchReport {
  sabSourceId: string;
  name: string;
  city: string;
  classification: 'exact_match' | 'probable_match' | 'new_record' | 'ambiguous' | 'requires_manual_review';
  confidence: number;
  cityInGov: boolean;
  candidatesConsidered: number;
  bestMatch: {
    govSourceId: string; govName: string; govCity: string | undefined;
    tier: Tier; signals: string[]; distanceM: number | null;
  } | null;
  runnerUp?: { govSourceId: string; confidence: number; tier: Tier } | null;
  reason: string;
}

function run(): void {
  const govNorm = readJson<GovMikvah[]>('mikvahs.normalized.json');
  const govGeo = readJson<GovMikvah[]>('mikvahs.geocoded.json');
  const sab = readJson<MikvahCouncilPlace[]>('sabaiapps-mikvah-preview.json');

  // join exact coords from the geocoded file onto the canonical 606
  const geoById = new Map(govGeo.map((g) => [g.sourceId, g]));
  const gov: GovRec[] = govNorm.map((g) => {
    const geo = geoById.get(g.sourceId);
    const addrPrecision = geo?.geocodePrecision === 'address';
    return {
      ...g,
      lat: geo?.lat, lng: geo?.lng, geocodePrecision: geo?.geocodePrecision,
      hasExactCoords: addrPrecision && geo?.lat != null,
    };
  });

  const govCities = new Set(gov.map((g) => normCity(g.city)));

  // candidate generation: same city OR address-precision coords within 200m OR phone match
  const candidatesFor = (s: MikvahCouncilPlace): GovRec[] => {
    const sCity = normCity(s.city);
    const sPhone = digits(s.phone ?? undefined);
    return gov.filter((g) => {
      if (sCity && normCity(g.city) === sCity) return true;
      if (sPhone.length >= 9 && digits(g.phone) === sPhone) return true;
      if (s.lat != null && s.lng != null && g.hasExactCoords && g.lat != null && g.lng != null)
        return metersBetween(s.lat, s.lng, g.lat, g.lng) <= 200;
      return false;
    });
  };

  const matches: MatchReport[] = [];
  const enrichPreview: {
    govSourceId: string; govName: string; govCity: string | undefined; matchedBy: string;
    matchedSabId: string; confidence: number; fields: FieldEnrichment[];
  }[] = [];
  const newRecords: MikvahCouncilPlace[] = [];

  for (const s of sab) {
    const cand = candidatesFor(s);
    const scored = cand
      .map((g) => ({ g, sc: score(s, g) }))
      .filter((x): x is { g: GovRec; sc: Score } => x.sc !== null)
      .sort((a, b) => b.sc.conf - a.sc.conf || b.sc.detail - a.sc.detail);

    const cityInGov = govCities.has(normCity(s.city));
    const best = scored[0];
    const runner = scored[1];

    let classification: MatchReport['classification'];
    let confidence = best ? best.sc.conf : 0;
    let reason: string;

    if (!best) {
      // no scored candidate
      if (cityInGov) { classification = 'new_record'; confidence = 0.8; reason = 'city present in gov dataset but no matching record → genuinely new'; }
      else { classification = 'new_record'; confidence = 0.9; reason = 'city entirely absent from gov dataset → new (coverage gap filled)'; }
    } else if (runner && best.sc.conf - runner.sc.conf < 0.1 && runner.sc.conf >= 0.7
               && Math.abs(best.sc.detail - runner.sc.detail) < 0.25) {
      classification = 'ambiguous';
      reason = `two gov candidates tie on both confidence (${best.sc.conf.toFixed(2)} vs ${runner.sc.conf.toFixed(2)}) and distinguishing signals`;
    } else if (best.sc.conf >= 0.9) {
      classification = 'exact_match';
      reason = `tier=${best.sc.tier}`;
    } else if (best.sc.conf >= 0.7) {
      classification = 'probable_match';
      reason = `tier=${best.sc.tier}`;
    } else {
      classification = 'requires_manual_review';
      reason = `weak single signal (conf=${best.sc.conf.toFixed(2)}, tier=${best.sc.tier})`;
    }

    matches.push({
      sabSourceId: s.sourceId, name: s.name, city: s.city, classification,
      confidence: Number(confidence.toFixed(2)), cityInGov, candidatesConsidered: cand.length,
      bestMatch: best ? {
        govSourceId: best.g.sourceId, govName: best.g.name, govCity: best.g.city,
        tier: best.sc.tier, signals: best.sc.signals, distanceM: best.sc.distanceM,
      } : null,
      runnerUp: runner ? { govSourceId: runner.g.sourceId, confidence: Number(runner.sc.conf.toFixed(2)), tier: runner.sc.tier } : null,
      reason,
    });

    if (classification === 'new_record') newRecords.push(s);

    // enrichment only from confident (non-ambiguous) matches
    if ((classification === 'exact_match' || classification === 'probable_match') && best) {
      const fields = enrichments(best.g, s);
      if (fields.length) {
        enrichPreview.push({
          govSourceId: best.g.sourceId, govName: best.g.name, govCity: best.g.city,
          matchedBy: best.sc.tier, matchedSabId: s.sourceId,
          confidence: Number(best.sc.conf.toFixed(2)), fields,
        });
      }
    }
  }

  // --- aggregate ---
  const count = (c: MatchReport['classification']) => matches.filter((m) => m.classification === c).length;
  const matchedConfs = matches.filter((m) => m.classification === 'exact_match' || m.classification === 'probable_match').map((m) => m.confidence);
  const avgConf = matchedConfs.length ? matchedConfs.reduce((a, b) => a + b, 0) / matchedConfs.length : 0;

  const fieldsImproved: Record<EnrichField, number> = {
    phone: 0, openingHours: 0, gender: 0, balanit: 0, coordinates: 0, notes: 0, sourceUrl: 0,
  };
  for (const e of enrichPreview) for (const f of e.fields) fieldsImproved[f.field]++;

  const summary = {
    generatedNote: 'PHASE 2 DRY-RUN — government vs SabaiApps merge analysis. REPORTS ONLY. No DB write, no merge, no geocoding, no mutation of source datasets.',
    typeTagNote: "Gov dataset uses type 'mikveh'; SabaiApps preview uses 'mikvah'. Reconcile in the Unified-Importer phase (Phase 3).",
    governmentRecords: gov.length,
    sabaiAppsRecords: sab.length,
    exactMatches: count('exact_match'),
    probableMatches: count('probable_match'),
    trulyNewMikvahs: count('new_record'),
    ambiguous: count('ambiguous'),
    requiresManualReview: count('requires_manual_review'),
    govRecordsEnrichable: enrichPreview.length,
    averageMatchConfidence: Number(avgConf.toFixed(3)),
    fieldsImproved,
    citiesAbsentFromGov: [...new Set(sab.filter((s) => !govCities.has(normCity(s.city))).map((s) => s.city))],
    matchingStrategy: ['native-coordinates(address-precision)', 'normalized-address', 'normalized-name', 'phone', 'city+address-similarity'],
    dryRun: true,
    liveDataTouched: false,
  };

  writeFileSync(join(OUT, 'government-merge-analysis.json'), JSON.stringify(matches, null, 2), 'utf8');
  writeFileSync(join(OUT, 'government-enrichment-preview.json'), JSON.stringify(enrichPreview, null, 2), 'utf8');
  writeFileSync(join(OUT, 'government-new-mikvahs.json'), JSON.stringify(newRecords, null, 2), 'utf8');
  writeFileSync(join(OUT, 'government-dedup-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('=== Phase 2 merge analysis (dry-run) ===');
  console.log(`gov=${gov.length} sab=${sab.length}`);
  console.log(`exact=${summary.exactMatches} probable=${summary.probableMatches} new=${summary.trulyNewMikvahs} ambiguous=${summary.ambiguous} manual=${summary.requiresManualReview}`);
  console.log(`enrichable gov records=${summary.govRecordsEnrichable} avgConf=${summary.averageMatchConfidence}`);
  console.log('fieldsImproved:', JSON.stringify(fieldsImproved));
}

if (isMain(import.meta.url)) run();
