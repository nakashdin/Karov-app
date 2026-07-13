/**
 * Phase 14 — Resolve coordless backlog records into write-ready mikveh records
 * (DRY-RUN, NO PUBLISH, NO DATA CHANGE).
 *
 * Scope (from skipped-mikveh-backlog.json): coordless-city-level, coordless-failed,
 * geocoding-needed.
 *
 * Strategy (after testing GovMap — ITM coords + wrong-result risk — and Nominatim):
 *   - SETTLEMENT entries (regional-council yishuvim, the city IS the settlement):
 *     a validated settlement-center coordinate IS the correct location for a
 *     yishuv-level mikvah → WRITE-READY at locationPrecision 'city' (the app shows
 *     an "approximate location" hint). Reuse Phase-10 centers; re-geocode the ones
 *     that failed using CLEANED settlement names (strip "- מונגש"/"שכונת …" suffixes).
 *   - LARGE-CITY street entries (Modiin Illit, Maale Adumim, גני תקווה): a
 *     city-center misplaces them within the city → NOT write-ready → manual-coordinate
 *     workflow (exact coords from Waze/Maps).
 *
 * Output: per-record preview + summary. No external publish, no DB/app-data change.
 *
 * Run:  node importers/mikvahs/coordless-resolve.ts
 * Out:  output/coordless-resolution-preview.json
 *       output/coordless-resolution-summary.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isInIsrael, isMain } from '../shared/utils.ts';
import type { GeoPoint } from '../shared/types.ts';
import { geocodeCity, geocodeQuery, saveCache } from './geocoder.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'output');
const readJson = <T>(f: string): T => JSON.parse(readFileSync(join(OUT, f), 'utf8')) as T;

/** Large municipalities where a city-center is too coarse — need exact coords. */
const LARGE_CITIES = new Set(['מודיעין עילית', 'מעלה אדומים', 'מודיעין-מכבים-רעות', 'מודיעין', 'גני תקווה']);

/** Strip table-suffixes so a settlement name geocodes (e.g. "ברוכין - מונגש" → "ברוכין"). */
function cleanSettlement(city: string): string {
  return city
    .split(' - ')[0]
    .replace(/שכונת.*$/, '')
    .replace(/\b(מונגש|מרכז|פלגי\s*מים)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

interface GeoRow { id: string; sourceSystem: string; name: string; city: string; address: string | null; geocode: { location: GeoPoint | null; precision: string; note: string }; duplicate: unknown; }

/** Council → expected region bbox [latMin, latMax, lngMin, lngMax]. A geocode
 *  outside its council's region is a name-collision (Nominatim returns wrong
 *  same-named places, e.g. a Samaria yishuv → a Tel-Aviv street) → rejected. */
const REGION: Record<string, [number, number, number, number]> = {
  'mate-binyamin': [31.70, 32.50, 35.00, 35.55], // West Bank — Binyamin
  shomron: [31.95, 32.55, 35.00, 35.55], // West Bank — Samaria
  'sdot-negev': [31.20, 31.65, 34.40, 34.95], // western Negev
};
const inRegion = (p: GeoPoint, b: [number, number, number, number]): boolean =>
  p.latitude >= b[0] && p.latitude <= b[1] && p.longitude >= b[2] && p.longitude <= b[3];

type Resolution = {
  name: string; city: string; source: string; address: string | null;
  currentIssue: string;
  proposedCoordinates: GeoPoint | null;
  confidence: number;
  locationPrecision: 'address' | 'city' | null;
  writeReady: boolean;
  verifyBeforePublish?: boolean;
  resolutionPath: string;
  manualEntry?: { lat: null; lng: null; mapsQuery: string; note: string };
};

async function resolveOne(
  name: string, city: string, source: string, address: string | null,
  priorLocation: GeoPoint | null, priorNote: string,
  region: [number, number, number, number] | undefined,
): Promise<Resolution> {
  const base: Pick<Resolution, 'name' | 'city' | 'source' | 'address'> = { name, city, source, address };
  const manual = (issue: string, hint: GeoPoint | null, conf: number): Resolution => ({
    ...base, currentIssue: issue, proposedCoordinates: hint, confidence: conf,
    locationPrecision: hint ? 'city' : null, writeReady: false,
    resolutionPath: 'manual-coordinates',
    manualEntry: { lat: null, lng: null, mapsQuery: `${name} ${address ?? ''} ${city} ישראל`.replace(/\s+/g, ' ').trim(), note: 'enter exact coordinates from Waze/Google Maps' },
  });

  // Large city → city-center is too coarse for a street entry → manual.
  if (LARGE_CITIES.has(city)) {
    return manual('large-city street address; city-center too coarse to place precisely', priorLocation, priorLocation ? 0.4 : 0);
  }

  // Settlement: reuse Phase-10 center, else re-geocode the cleaned settlement name.
  let loc = priorLocation;
  let validated = /validated/.test(priorNote);
  let path = 'reused Phase-10 settlement center';
  if (!loc) {
    const clean = cleanSettlement(city);
    path = `re-geocoded settlement "${clean}"`;
    const v = await geocodeCity(clean);
    if (v && isInIsrael(v)) { loc = v; validated = true; }
    else {
      const f = await geocodeQuery(`${clean}, ישראל`);
      if (f && isInIsrael(f)) { loc = f; validated = false; }
    }
  }
  if (!loc) return manual('settlement not found by any geocoder', null, 0);

  // REGION GATE: reject geocodes outside the council's real region (name collisions).
  if (region && !inRegion(loc, region)) {
    return manual(`geocode landed outside the council region (${loc.latitude.toFixed(3)},${loc.longitude.toFixed(3)}) — Nominatim name-collision, unreliable`, null, 0);
  }

  // Region-validated, but still only an APPROXIMATE settlement-center → write-ready
  // at 'city' precision, flagged for human verification before publish.
  return {
    ...base,
    currentIssue: 'no native coordinates (settlement-level entry)',
    proposedCoordinates: loc, confidence: validated ? 0.6 : 0.5,
    locationPrecision: 'city', writeReady: true, verifyBeforePublish: true,
    resolutionPath: `${path} (region-validated, approximate)`,
  };
}

async function run(): Promise<void> {
  const geo = readJson<GeoRow[]>('coordless-geocoding-preview.json');
  const inScope = geo.filter((g) => !g.duplicate); // the 1 duplicate is out of coordless scope
  const dupCount = geo.length - inScope.length;

  const resolutions: Resolution[] = [];
  for (const g of inScope) {
    const council = g.id.split(':')[1]; // e.g. "mate-binyamin"
    resolutions.push(await resolveOne(g.name, g.city, g.sourceSystem, g.address, g.geocode.location, g.geocode.note, REGION[council]));
  }

  // the 1 SabaiApps geocoding-needed record (never geocoded; large-ish city + street)
  const rd = readJson<any[]>('review-decisions-preview.json').find((x) => x.decision === 'geocoding_needed');
  if (rd) {
    resolutions.push(await resolveOne(rd.name, rd.city, 'sabaiapps', rd.stagedRecord?.address ?? null, null, '', undefined));
  }
  saveCache();

  // --- aggregate ---
  const writeReady = resolutions.filter((r) => r.writeReady);
  const manual = resolutions.filter((r) => !r.writeReady);
  const byPath = resolutions.reduce<Record<string, number>>((a, r) => { const k = r.writeReady ? 'write-ready' : r.resolutionPath; a[k] = (a[k] ?? 0) + 1; return a; }, {});
  const writeReadyByCity = writeReady.reduce<Record<string, number>>((a, r) => { a[r.city] = (a[r.city] ?? 0) + 1; return a; }, {});
  const manualByCity = manual.reduce<Record<string, number>>((a, r) => { a[r.city] = (a[r.city] ?? 0) + 1; return a; }, {});

  const rejectedOutOfRegion = manual.filter((r) => r.currentIssue.includes('outside the council region')).length;
  const TIER_A = 61; // already-written native-coord batch
  const nextBatch = TIER_A + writeReady.length;

  const summary = {
    generatedNote: 'PHASE 14 DRY-RUN — coordless backlog resolution. No publish, no DB/app-data change. Geocoder cache + these previews only.',
    geocodingSourcesTried: ['Nominatim (project geocoder, used)', 'GovMap es.govmap.gov.il (tested: ITM coords + wrong-result risk → not auto-used)'],
    accuracyCaveat: 'Nominatim is UNRELIABLE for West-Bank/Negev settlements: it name-collides them with Tel-Aviv streets / Galilee / Eilat. A per-council REGION GATE rejects out-of-region results; survivors are still APPROXIMATE settlement-centers (locationPrecision city) and are flagged verifyBeforePublish — they should be human-checked before the next write.',
    policy: "Settlement entries → region-validated approximate center = write-ready (city precision, verify-first). Out-of-region geocodes + large-city street entries + not-found → manual exact coordinates.",
    inputCoordlessRecords: resolutions.length,
    becameWriteReady: writeReady.length,
    writeReadyAllApproximateVerifyFirst: writeReady.every((r) => r.verifyBeforePublish),
    stillNeedManualCoordinates: manual.length,
    rejectedOutOfRegion,
    duplicatesOrConflicts: dupCount,
    byResolutionPath: byPath,
    writeReadyByCity,
    manualByCity,
    writeReadyPrecision: "city (approximate yishuv-center) — app shows 'מיקום משוער' hint; flagged verifyBeforePublish",
    nextWriteBatch: { previousTierA: TIER_A, newCoordlessApproximate: writeReady.length, totalIfApproximateAccepted: nextBatch, note: 'the coordless additions are APPROXIMATE+verify-first; include them only if a human accepts city-level precision and spot-checks them.' },
    manualWorkflowNote: 'Each non-write-ready record carries a manualEntry { lat:null, lng:null, mapsQuery } — fill lat/lng from Waze/Maps to promote it to exact precision.',
    dryRun: true, liveDataTouched: false, publishPerformed: false,
  };

  writeFileSync(join(OUT, 'coordless-resolution-preview.json'), JSON.stringify(resolutions, null, 2), 'utf8');
  writeFileSync(join(OUT, 'coordless-resolution-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('=== Phase 14 coordless resolution (dry-run) ===');
  console.log(`input=${resolutions.length} | write-ready=${writeReady.length} | manual=${manual.length} | duplicates(out of scope)=${dupCount}`);
  console.log(`by path: ${JSON.stringify(byPath)}`);
  console.log(`next write batch: ${TIER_A} (Tier A) + ${writeReady.length} (coordless) = ${nextBatch}`);
}

if (isMain(import.meta.url)) void run();
