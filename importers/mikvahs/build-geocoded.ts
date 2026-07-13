/**
 * STEP 3 ONLY — geocode the normalized mikvahs into coordinates.
 *
 * Reads mikvahs.normalized.json, resolves each record's coordinate via
 * Nominatim (rate-limited + cached), and writes mikvahs.geocoded.json. It does
 * NOT touch the app, PlaceType, screens, the repository, or the live dataset,
 * and NEVER guesses: a record that doesn't resolve is excluded from the output.
 *
 * Lookup policy per record:
 *   - address + city → "address, city, ישראל"   → precision "address"
 *   - else city only → "city, ישראל"             → precision "city" (low)
 *   - neither resolves                            → excluded (counted as failed)
 *
 * Run:  node importers/mikvahs/build-geocoded.ts
 * In :  importers/mikvahs/output/mikvahs.normalized.json
 * Out:  importers/mikvahs/output/mikvahs.geocoded.json
 *       importers/mikvahs/output/geocode-cache.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GeocodedMikvah, GeoPoint, MikvahPlace } from '../shared/types.ts';
import { isInIsrael } from '../shared/utils.ts';
import { cacheSize, geocodeCity, geocodeQuery, saveCache } from './geocoder.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const INPUT_FILE = join(HERE, 'output', 'mikvahs.normalized.json');
const OUTPUT_FILE = join(HERE, 'output', 'mikvahs.geocoded.json');

interface Resolved {
  point: GeoPoint;
  precision: 'address' | 'city';
  query: string;
}

/** Try address-level first, then fall back to city-level (low precision). */
async function resolve(m: MikvahPlace): Promise<Resolved | null> {
  if (m.address && m.city) {
    const query = `${m.address}, ${m.city}, ישראל`;
    const point = await geocodeQuery(query);
    if (point) return { point, precision: 'address', query };
  }
  if (m.city) {
    // Validated city-level lookup — rejects street/POI matches in other cities.
    const point = await geocodeCity(m.city);
    if (point) return { point, precision: 'city', query: `${m.city}, ישראל` };
  }
  return null;
}

async function main(): Promise<void> {
  const input = JSON.parse(readFileSync(INPUT_FILE, 'utf8')) as MikvahPlace[];
  const geocodedAt = new Date().toISOString().slice(0, 10);

  const output: GeocodedMikvah[] = [];
  const seen = new Set<string>();
  let addressHits = 0;
  let cityHits = 0;
  let failed = 0;
  let outsideIsrael = 0;
  const cityPassed: { sourceId: string; name: string; city: string; lat: number; lng: number }[] = [];
  const cityRejected: { sourceId: string; name: string; city: string }[] = [];

  for (let i = 0; i < input.length; i++) {
    const m = input[i];
    const r = await resolve(m);

    if (!r) {
      failed++;
      // had a city but no valid match → city-level rejection (for the report)
      if (m.city) cityRejected.push({ sourceId: m.sourceId, name: m.name, city: m.city });
    } else if (!isInIsrael(r.point)) {
      // Resolved but outside Israel → reject, do not include (no guessing).
      outsideIsrael++;
      failed++;
      if (m.city) cityRejected.push({ sourceId: m.sourceId, name: m.name, city: m.city });
    } else if (seen.has(m.sourceId)) {
      // duplicate id safety — skip silently
    } else {
      seen.add(m.sourceId);
      if (r.precision === 'address') {
        addressHits++;
      } else {
        cityHits++;
        cityPassed.push({ sourceId: m.sourceId, name: m.name, city: m.city ?? '', lat: r.point.latitude, lng: r.point.longitude });
      }
      output.push({
        ...m,
        lat: r.point.latitude,
        lng: r.point.longitude,
        geocodeQuery: r.query,
        geocodePrecision: r.precision,
        geocodedAt,
      });
    }

    // Persist cache periodically so an interrupted run resumes cleanly.
    if (i % 25 === 0) {
      saveCache();
      console.log(`  …${i + 1}/${input.length} (address ${addressHits} · city ${cityHits} · failed ${failed})`);
    }
  }
  saveCache();
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');

  // --- validation + summary -------------------------------------------------
  const ids = output.map((p) => p.sourceId);
  const duplicates = ids.length - new Set(ids).size;
  const badLoc = output.filter((p) => !isInIsrael({ latitude: p.lat, longitude: p.lng })).length;

  console.log('\n========== mikvahs geocoding (step 3) ==========');
  console.log(`קלט (input)                : ${input.length}`);
  console.log(`קיבלו קואורדינטות (total)  : ${output.length}`);
  console.log(`  לפי כתובת (address)      : ${addressHits}`);
  console.log(`  לפי עיר בלבד (city)      : ${cityHits}`);
  console.log(`נכשלו (failed)             : ${failed}` + (outsideIsrael ? `  (מתוכם מחוץ לישראל: ${outsideIsrael})` : ''));
  console.log(`כפילויות id בפלט           : ${duplicates}`);
  console.log(`lat/lng לא תקין בפלט        : ${badLoc}`);
  console.log(`רשומות במטמון (cache)      : ${cacheSize()}`);

  console.log('\n--- 5 דוגמאות city-level שעברו ---');
  for (const s of cityPassed.slice(0, 5)) {
    console.log(`  ✅ ${s.city} | ${s.name} | ${s.lat.toFixed(4)},${s.lng.toFixed(4)}`);
  }
  console.log('--- 5 דוגמאות שנפסלו (city לא אומת) ---');
  for (const s of cityRejected.slice(0, 5)) {
    console.log(`  ❌ ${s.city} | ${s.name} (${s.sourceId})`);
  }

  console.log(`\nנכתב → ${OUTPUT_FILE}`);
}

main().catch((e) => {
  saveCache();
  console.error('Failed:', e);
  process.exit(1);
});
