/**
 * Address → coordinates via OpenStreetMap **Nominatim** (step 3).
 *
 * Nominatim usage policy: max **1 request/second**, a real User-Agent, and be
 * nice. We therefore rate-limit and cache every lookup to disk, so re-runs are
 * instant and an interrupted run resumes where it stopped. Cached `null` means
 * "searched, not found" — we never re-query it and never guess.
 *
 * Cache: importers/mikvahs/output/geocode-cache.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GeoPoint } from '../shared/types.ts';
import { USER_AGENT, httpJson, sleep } from '../shared/utils.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = join(HERE, 'output', 'geocode-cache.json');
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const RATE_LIMIT_MS = 1100; // ≥ 1 req/sec per Nominatim policy

type Cache = Record<string, GeoPoint | null>;

let cache: Cache | null = null;

function loadCache(): Cache {
  if (cache) return cache;
  cache = existsSync(CACHE_FILE) ? (JSON.parse(readFileSync(CACHE_FILE, 'utf8')) as Cache) : {};
  return cache;
}

export function saveCache(): void {
  if (!cache) return;
  mkdirSync(dirname(CACHE_FILE), { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
}

export function cacheSize(): number {
  return Object.keys(loadCache()).length;
}

/**
 * Geocode one free-text query (cached, rate-limited). Returns the coordinate or
 * null when Nominatim finds nothing. Only performs a network call (and waits the
 * rate-limit) on a cache miss.
 */
export async function geocodeQuery(query: string): Promise<GeoPoint | null> {
  const key = query.trim();
  if (!key) return null;

  const c = loadCache();
  if (key in c) return c[key]; // hit (including cached nulls)

  await sleep(RATE_LIMIT_MS);
  const url =
    `${NOMINATIM}?format=json&limit=1&countrycodes=il&accept-language=he` +
    `&q=${encodeURIComponent(key)}`;

  let point: GeoPoint | null = null;
  try {
    const res = await httpJson(url, { headers: { 'User-Agent': USER_AGENT } }, 'geocode');
    if (Array.isArray(res) && res[0]?.lat && res[0]?.lon) {
      point = { latitude: Number(res[0].lat), longitude: Number(res[0].lon) };
    }
  } catch (e) {
    console.warn(`  geocode failed for "${key}": ${(e as Error).message}`);
  }

  c[key] = point;
  return point;
}

// --- city-level geocoding (validated) ---------------------------------------

/** Settlement-ish place types we accept for a city-level match. */
const SETTLEMENT_TYPES = new Set([
  'city', 'town', 'village', 'municipality', 'hamlet', 'suburb', 'quarter', 'locality', 'neighbourhood',
]);

/** Does this Nominatim result describe a settlement (not a street/POI)? */
function isSettlement(r: any): boolean {
  const cls = r.class ?? r.category;
  if (cls === 'place' && SETTLEMENT_TYPES.has(r.type)) return true;
  if (cls === 'boundary' && r.type === 'administrative') return true;
  if (SETTLEMENT_TYPES.has(r.addresstype)) return true;
  return false;
}

/** Normalize a Hebrew name for comparison (strip quotes/geresh, collapse spaces). */
function normName(s: unknown): string {
  return String(s ?? '').replace(/['"׳״’”`]/g, '').replace(/\s+/g, ' ').trim();
}

/** Does the result actually correspond to the requested city? */
function cityMatches(r: any, city: string): boolean {
  const want = normName(city);
  if (!want) return false;
  const a = r.address ?? {};
  const candidates = [r.name, a.city, a.town, a.village, a.municipality, a.hamlet, a.suburb, a.locality]
    .map(normName)
    .filter(Boolean);
  if (candidates.includes(want)) return true;
  // accept only as a standalone token of the display name (no loose substrings)
  return normName(r.display_name).split(/[,\s]+/).includes(want);
}

/**
 * Validated city-level geocode. Returns a coordinate ONLY when Nominatim
 * returns a settlement that matches the requested city — never a street/POI in
 * a different city. Uses a separate cache namespace ("city2|") so earlier,
 * unvalidated city results are refreshed rather than reused.
 */
export async function geocodeCity(city: string): Promise<GeoPoint | null> {
  const want = city.trim();
  if (!want) return null;

  const cacheKey = `city3|${want}`;
  const c = loadCache();
  if (cacheKey in c) return c[cacheKey];

  await sleep(RATE_LIMIT_MS);
  // Structured search (city=) instead of free-text q=. Free text ranks famous
  // streets (e.g. "בן יהודה") above the settlement; structured search returns
  // the settlement itself. Still validated below before we accept it.
  const url =
    `${NOMINATIM}?format=jsonv2&addressdetails=1&limit=5&accept-language=he` +
    `&country=Israel&city=${encodeURIComponent(want)}`;

  let point: GeoPoint | null = null;
  try {
    const res = await httpJson(url, { headers: { 'User-Agent': USER_AGENT } }, 'geocode-city');
    if (Array.isArray(res)) {
      const match = res.find((r) => isSettlement(r) && cityMatches(r, want));
      if (match?.lat && match?.lon) {
        point = { latitude: Number(match.lat), longitude: Number(match.lon) };
      }
    }
  } catch (e) {
    console.warn(`  city geocode failed for "${want}": ${(e as Error).message}`);
  }

  c[cacheKey] = point;
  return point;
}
