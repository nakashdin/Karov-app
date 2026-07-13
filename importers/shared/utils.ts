/** Shared helpers for the importers: HTTP, geo math, OSM parsing, stats. */
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import type { GeoPoint, Locality, NormalizedPlace, OsmElement } from './types.ts';

/** Identifies this client to the public APIs (required by OSM/Nominatim). */
export const USER_AGENT = 'karov-kosher-app/1.0 (OSM data import; non-commercial)';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

export const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/** GET/POST JSON with retry + backoff on the usual "busy" statuses. */
export async function httpJson(
  url: string,
  options: RequestInit,
  label: string,
  attempts = 3,
): Promise<any> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, options);
      if ([429, 502, 503, 504].includes(res.status)) {
        throw new Error(`HTTP ${res.status} (busy)`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
      console.warn(`  [${label}] attempt ${attempt}: ${(e as Error).message}`);
      await sleep(attempt * 4000);
    }
  }
  throw new Error(`[${label}] gave up: ${(lastErr as Error)?.message}`);
}

/** POST an Overpass QL query, falling back across mirror endpoints. */
export async function fetchOverpass(query: string, label: string): Promise<any> {
  let lastErr: unknown;
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      console.log(`[${label}] ${url} …`);
      return await httpJson(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': USER_AGENT,
            Accept: 'application/json',
          },
          body: 'data=' + encodeURIComponent(query),
        },
        label,
      );
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

// --- Geo --------------------------------------------------------------------

const toRad = (d: number): number => (d * Math.PI) / 180;

/** Great-circle distance in km between two coordinates. */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Nearest locality name to a point, or '' if none. */
export function nearestLocality(lat: number, lng: number, localities: Locality[]): string {
  let best = '';
  let bestD = Infinity;
  for (const c of localities) {
    const d = distanceKm(lat, lng, c.lat, c.lng);
    if (d < bestD) {
      bestD = d;
      best = c.name;
    }
  }
  return best;
}

/** Rough Israel bounding box — rejects obviously-wrong coordinates. */
export function isInIsrael(p: GeoPoint | null | undefined): boolean {
  if (!p) return false;
  return (
    p.latitude >= 29.3 && p.latitude <= 33.5 &&
    p.longitude >= 34.2 && p.longitude <= 35.95
  );
}

// --- OSM parsing ------------------------------------------------------------

/** Stable id for an OSM element, e.g. `osm-node-12345`. */
export const osmId = (el: OsmElement): string => `osm-${el.type}-${el.id}`;

/** Resolve an element's coordinate (node lat/lon or way/relation center). */
export function osmCoords(el: OsmElement): GeoPoint | null {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return { latitude: lat, longitude: lng };
}

/** Build "street number, city" from OSM addr tags, falling back to city. */
export function buildOsmAddress(tags: Record<string, string>, cityName: string): string {
  const streetLine = [tags['addr:street'], tags['addr:housenumber']]
    .filter(Boolean)
    .join(' ')
    .trim();
  return streetLine ? [streetLine, cityName].filter(Boolean).join(', ') : cityName;
}

/** Fetch all Israeli localities (city/town/village) for nearest-city lookup. */
export async function fetchLocalities(): Promise<Locality[]> {
  const query = `[out:json][timeout:120];
area["ISO3166-1"="IL"][admin_level=2]->.il;
(
  node["place"~"city|town|village"]["name"](area.il);
);
out center tags;`;
  const data = await fetchOverpass(query, 'localities');
  const out: Locality[] = [];
  for (const el of data.elements || []) {
    const tags = el.tags || {};
    const name = tags['name:he'] || tags.name;
    if (name && typeof el.lat === 'number' && typeof el.lon === 'number') {
      out.push({ name, lat: el.lat, lng: el.lon });
    }
  }
  console.log(`Localities: ${out.length}`);
  return out;
}

// --- Misc -------------------------------------------------------------------

const nonEmpty = (v: unknown): boolean =>
  v !== null && v !== undefined && String(v).trim() !== '';

/** Percentage of records where field `f` is filled (for coverage reports). */
export function fillRate(rows: NormalizedPlace[], f: keyof NormalizedPlace): number {
  if (!rows.length) return 0;
  return Math.round((rows.filter((r) => nonEmpty(r[f])).length / rows.length) * 100);
}

/** First-wins de-duplication by `id`. */
export function dedupeById(rows: NormalizedPlace[]): NormalizedPlace[] {
  const byId = new Map<string, NormalizedPlace>();
  for (const r of rows) if (!byId.has(r.id)) byId.set(r.id, r);
  return [...byId.values()];
}

/** True when the given module is the file Node was invoked with. */
export function isMain(metaUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return resolve(fileURLToPath(metaUrl)).toLowerCase() === resolve(entry).toLowerCase();
}
