/**
 * Phase 10 — Geocode the 49 coordless mikveh records from the unified review
 * package (DRY-RUN, NO DB WRITE, NO PUBLISH).
 *
 * Uses the EXISTING project geocoder (importers/mikvahs/geocoder.ts — Nominatim,
 * rate-limited, disk-cached). Per record:
 *   1. validated city/settlement center  (geocodeCity)
 *   2. street address geocode            (geocodeQuery), ACCEPTED only if it lands
 *      in Israel AND within 5 km of the validated city center (else rejected as a
 *      likely wrong-city street match → fall back to the city center).
 *
 * Precision/confidence:
 *   address  → high   (0.85) → WRITE-READY
 *   city     → medium (0.60) → low-confidence → manual-review (NOT write-ready)
 *   failed   → none          → failed
 *
 * Then re-runs duplicate detection against the live mikveh places: a record that,
 * once placed, coincides with an existing place is NOT new → dropped from
 * write-ready into enrich/manual review.
 *
 * Writes ONLY preview + summary (and the geocoder's own cache). No app/DB writes.
 *
 * Run:  node importers/mikvahs/coordless-geocode.ts
 * Out:  output/coordless-geocoding-preview.json
 *       output/coordless-geocoding-summary.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { distanceKm, isInIsrael, isMain } from '../shared/utils.ts';
import type { GeoPoint, NormalizedImportRecord } from '../unified/schema/normalized-record.ts';
import { GeoNameDuplicateDetector, type DuplicateCandidate } from '../unified/pipeline/duplicate-detection.ts';
import { geocodeCity, geocodeQuery, saveCache } from './geocoder.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'output');
const readJson = <T>(f: string): T => JSON.parse(readFileSync(join(OUT, f), 'utf8')) as T;
const NOW = new Date().toISOString();

const CITY_RADIUS_KM = 5; // an address hit further than this from the city center is rejected

interface PkgRecord { sourceSystem: string; city: string | null; address: string | null; record: NormalizedImportRecord; }
interface AppPlace { id: string; name: string; type: string; address?: string; location: GeoPoint; phone?: string; }

type Precision = 'address' | 'city' | 'failed';

async function run(): Promise<void> {
  const pkg = readJson<PkgRecord[]>('unified-new-mikveh-review-package.json');
  const coordless = pkg.filter((p) => p.record.location == null);

  const appPlaces = readJson<AppPlace[]>('places.mikvahs.app.json');
  const candidates: DuplicateCandidate[] = appPlaces
    .filter((p) => p.type === 'mikveh' && p.location)
    .map((p) => ({ id: p.id, name: p.name, type: 'mikveh', location: p.location, address: p.address, phone: p.phone, source: 'datagov' }));
  const detector = new GeoNameDuplicateDetector();

  const preview: any[] = [];
  for (const p of coordless) {
    const rec = p.record;
    const city = rec.cityHint ?? p.city ?? '';
    const address = rec.address ?? null;

    // 1) validated settlement center; 2) free-text city fallback (the structured
    //    search misses many real places, e.g. מודיעין עילית / ביתר עילית).
    let cityCenter = city ? await geocodeCity(city) : null;
    let cityValidated = cityCenter != null;
    if (!cityCenter && city) {
      const loose = await geocodeQuery(`${city}, ישראל`);
      if (loose && isInIsrael(loose)) cityCenter = loose;
    }

    let location: GeoPoint | null = null;
    let precision: Precision = 'failed';
    let confidence = 0;
    let note = '';

    if (address) {
      const addrPt = await geocodeQuery(`${address}, ${city}, ישראל`);
      if (addrPt && isInIsrael(addrPt)) {
        const dKm = cityCenter ? distanceKm(addrPt.latitude, addrPt.longitude, cityCenter.latitude, cityCenter.longitude) : 0;
        if (!cityCenter || dKm <= CITY_RADIUS_KM) {
          location = addrPt; precision = 'address'; confidence = 0.85;
          note = `street geocode${cityCenter ? `, ${dKm.toFixed(1)}km from city center` : ''}`;
        } else {
          note = `street geocode rejected: ${dKm.toFixed(1)}km from city center (likely wrong-city match)`;
        }
      }
    }
    if (!location && cityCenter) {
      location = cityCenter; precision = 'city'; confidence = cityValidated ? 0.6 : 0.5;
      const base = cityValidated ? 'validated city/settlement center' : 'free-text city center (unvalidated, coarse)';
      note = note ? `${note}; fell back to ${base}` : base;
    }
    if (!location) { precision = 'failed'; confidence = 0; note = note || 'no geocode (city + address both unresolved)'; }

    // re-dedup once placed
    let dup: { class: string; matchedId?: string; matchedName?: string; distanceM?: number } | null = null;
    if (location) {
      const placed: NormalizedImportRecord = { ...rec, location };
      const v = detector.detect(placed, candidates);
      if (v.class !== 'new') dup = { class: v.class, matchedId: v.matchedId, matchedName: v.matchedName, distanceM: v.distanceM };
    }

    // write-readiness: high-confidence address precision AND not a duplicate
    let writeReadiness: 'write_ready' | 'low_confidence_manual' | 'duplicate_review' | 'failed';
    if (precision === 'failed') writeReadiness = 'failed';
    else if (dup) writeReadiness = 'duplicate_review';
    else if (precision === 'address') writeReadiness = 'write_ready';
    else writeReadiness = 'low_confidence_manual';

    preview.push({
      id: rec.id, sourceSystem: p.sourceSystem, name: rec.name, city, address,
      gender: (rec.extra as any)?.gender ?? null,
      geocode: { location, precision, confidence, query: address ? `${address}, ${city}` : city, note, geocodedAt: NOW.slice(0, 10) },
      duplicate: dup,
      writeReadiness,
    });
  }
  saveCache();

  // --- aggregate ---
  const by = (k: string) => preview.filter((x) => x.writeReadiness === k).length;
  const geocoded = preview.filter((x) => x.geocode.precision !== 'failed').length;
  const failed = preview.filter((x) => x.geocode.precision === 'failed').length;
  const addr = preview.filter((x) => x.geocode.precision === 'address').length;
  const cityLvl = preview.filter((x) => x.geocode.precision === 'city').length;
  const writeReady = by('write_ready');
  const lowConf = by('low_confidence_manual');
  const dupReview = by('duplicate_review');
  const newDuplicates = preview.filter((x) => x.duplicate).length;

  const bySystem = (rows: any[]) => rows.reduce<Record<string, number>>((a, x) => { a[x.sourceSystem] = (a[x.sourceSystem] ?? 0) + 1; return a; }, {});
  const PREV_WRITE_READY = 61; // Tier A from the Phase-9 plan (SabaiApps, native coords)

  const summary = {
    generatedNote: 'PHASE 10 DRY-RUN — geocoding the coordless candidates. No DB write, no publish, no app-data change. Used the project geocoder (Nominatim, cached). Only the geocoder cache + these preview files were written.',
    geocoder: 'importers/mikvahs/geocoder.ts (Nominatim, 1 req/sec, disk-cached)',
    inputCoordlessRecords: coordless.length,
    successfullyGeocoded: geocoded,
    byPrecision: { address: addr, city: cityLvl, failed },
    failedGeocoding: failed,
    highConfidenceWriteReady: writeReady,
    lowConfidenceManualReview: lowConf,
    newDuplicatesFoundAfterGeocoding: newDuplicates,
    duplicateReviewRecords: dupReview,
    writeReadyBySystem: bySystem(preview.filter((x) => x.writeReadiness === 'write_ready')),
    lowConfidenceBySystem: bySystem(preview.filter((x) => x.writeReadiness === 'low_confidence_manual')),
    rule: "write-ready = address-precision geocode (conf ≥ 0.8) AND not a duplicate of a live place. City-center precision is treated as low-confidence and NOT write-ready, per requirements.",
    updatedCountReadyForFirstWrite: { previousTierA: PREV_WRITE_READY, newlyGeocodedWriteReady: writeReady, totalReadyForFirstWrite: PREV_WRITE_READY + writeReady },
    stillDeferred: { lowConfidenceCityLevel: lowConf, duplicates: dupReview, failed, note: 'low-confidence city-level + duplicates + failed stay out of the first write; revisit with manual placement or enrich/discard decisions.' },
    dryRun: true, liveDataTouched: false, publishPerformed: false,
  };

  writeFileSync(join(OUT, 'coordless-geocoding-preview.json'), JSON.stringify(preview, null, 2), 'utf8');
  writeFileSync(join(OUT, 'coordless-geocoding-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('=== Phase 10 coordless geocoding (dry-run) ===');
  console.log(`input=${coordless.length} geocoded=${geocoded} (address=${addr} city=${cityLvl}) failed=${failed}`);
  console.log(`write-ready=${writeReady} lowConf-manual=${lowConf} duplicate-review=${dupReview} | newDuplicates=${newDuplicates}`);
  console.log(`updated ready for first write: ${PREV_WRITE_READY} + ${writeReady} = ${PREV_WRITE_READY + writeReady}`);
}

if (isMain(import.meta.url)) void run();
