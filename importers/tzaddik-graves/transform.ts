/**
 * Transform layer for tzaddik-graves importer.
 *
 * In this importer, transformation is handled inline in fetch-osm.ts and
 * fetch-wikidata.ts (both produce TzaddikGraveRaw directly). This file
 * provides lightweight post-processing helpers used after fetch + validate.
 *
 * Exported for use by importer.ts or any future merge step.
 */
import type { TzaddikGraveRaw } from './types.ts';

/**
 * Normalise a raw record before writing to the preview file:
 * - Trim whitespace from name / city / address
 * - Coerce empty strings to undefined
 * - Ensure source attribution fields are consistent
 */
export function normalizeGrave(r: TzaddikGraveRaw): TzaddikGraveRaw {
  return {
    ...r,
    name: r.name?.trim() || null,
    city: r.city?.trim() || undefined,
    address: r.address?.trim() || undefined,
    phone: r.phone?.trim() || undefined,
    buriedPerson: r.buriedPerson?.trim() || undefined,
    buriedPersonHe: r.buriedPersonHe?.trim() || undefined,
    hillula: r.hillula?.trim() || undefined,
  };
}

/** Apply normalizeGrave to every record in an array. */
export function normalizeGraves(records: TzaddikGraveRaw[]): TzaddikGraveRaw[] {
  return records.map(normalizeGrave);
}
