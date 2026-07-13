/**
 * The importers' "sink": where normalized records land on disk.
 *
 * Today this writes JSON into src/data/generated/ — the exact files the app's
 * OSM repository already reads (places.osm.json, cities.osm.json). Each source
 * also keeps its own raw category file so a single category can be re-imported
 * without re-fetching the others. When a real Supabase backend is wired, swap
 * `rebuildAppDataset` / add an `upsert` here — nothing else has to change.
 */
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ImportType, NormalizedPlace } from './types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
export const GENERATED_DIR = join(HERE, '..', '..', 'src', 'data', 'generated');

/** Per-source raw output, one file per category. */
export const CATEGORY_FILES: Record<ImportType, string> = {
  synagogue: 'synagogues.osm.json',
  restaurant: 'restaurants.osm.json',
  fast_food: 'fast-food.chains.json',
  mikveh: 'mikvahs.datagov.json',
};

/** Place types the app currently understands (others stay out of the dataset). */
const APP_TYPES: ImportType[] = ['synagogue', 'restaurant', 'fast_food', 'mikveh'];

export function writeJson(file: string, data: unknown): string {
  mkdirSync(GENERATED_DIR, { recursive: true });
  const path = join(GENERATED_DIR, file);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
  return path;
}

export function readJson<T>(file: string, fallback: T): T {
  const path = join(GENERATED_DIR, file);
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

/** Map an importer record onto the app's `Place` JSON shape. */
function toAppPlace(p: NormalizedPlace): Record<string, unknown> {
  const place: Record<string, unknown> = {
    id: p.id,
    name: p.name,
    type: p.type,
    cityId: p.cityId,
    address: p.address,
    location: p.location,
    source: p.source === 'osm' ? 'osm' : p.source === 'datagov' ? 'manual' : 'seed',
  };
  if (p.phone) place.phone = p.phone;
  if (p.openingHours) place.openingHours = p.openingHours;
  if (p.tags?.length) place.tags = p.tags;
  return place;
}

/**
 * Merge every app-supported category file into the dataset the app reads:
 * places.osm.json (deduped) + cities.osm.json (localities that have places,
 * busiest first). Call this at the end of any importer run.
 */
export function rebuildAppDataset(): { places: number; cities: number } {
  const merged: NormalizedPlace[] = [];
  for (const type of APP_TYPES) {
    merged.push(...readJson<NormalizedPlace[]>(CATEGORY_FILES[type], []));
  }

  const byId = new Map<string, NormalizedPlace>();
  for (const p of merged) {
    if (APP_TYPES.includes(p.type) && !byId.has(p.id)) byId.set(p.id, p);
  }
  const records = [...byId.values()];

  const counts: Record<string, number> = {};
  for (const p of records) if (p.cityId) counts[p.cityId] = (counts[p.cityId] || 0) + 1;
  const cities = Object.keys(counts)
    .sort((a, b) => counts[b] - counts[a])
    .map((name) => ({ id: name, name }));

  writeJson('places.osm.json', records.map(toAppPlace));
  writeJson('cities.osm.json', cities);
  return { places: records.length, cities: cities.length };
}
