/**
 * Phase 2 — Cross-source deduplication.
 * OSM wins for coordinates; Wikidata enriches person metadata.
 * When merged, confidence score is upgraded (+10).
 */
import { distanceKm } from '../shared/utils.ts';
import type { TzaddikGraveRaw, DedupOutcome } from './types.ts';

const PROXIMITY_KM = 0.15;

function normalize(s: string): string {
  return s.trim().toLowerCase()
    .replace(/['"״׳']/g, '')
    .replace(/רבי\s+/g, '')
    .replace(/rabbi\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesSimilar(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wordsA = new Set(na.split(' ').filter((w) => w.length > 3));
  return nb.split(' ').filter((w) => w.length > 3).some((w) => wordsA.has(w));
}

export function deduplicateGraves(records: TzaddikGraveRaw[]): DedupOutcome {
  const manual = records.filter((r) => r.source === 'manual');
  const osm = records.filter((r) => r.source === 'osm');
  const wikidata = records.filter((r) => r.source === 'wikidata');
  const merged: DedupOutcome['merged'] = [];
  const droppedIds = new Set<string>();

  // Manual seeds absorb duplicates from other sources (seeds always win)
  for (const seed of manual) {
    if (seed.lat == null || seed.lng == null) continue;
    for (const other of [...osm, ...wikidata]) {
      if (other.lat == null || other.lng == null) continue;
      if (droppedIds.has(other.sourceId)) continue;
      const dist = distanceKm(seed.lat, seed.lng, other.lat, other.lng);
      if (dist > PROXIMITY_KM) continue;
      // Enrich seed with extra info from the API record
      if (!seed.wikidataId && other.wikidataId) seed.wikidataId = other.wikidataId;
      if (!seed.osmId && other.osmId) seed.osmId = other.osmId;
      // Boost seed confidence when confirmed by a second source
      if ((seed.confidenceScore ?? 0) < 100) {
        seed.confidenceScore = Math.min(100, (seed.confidenceScore ?? 90) + 3);
        seed.confidenceReason = (seed.confidenceReason || '') + ' | +אימות מקור שני';
      }
      merged.push({ kept: seed, dropped: other });
      droppedIds.add(other.sourceId);
    }
  }

  // Wikidata absorbs OSM duplicates (OSM wins coords, Wikidata enriches)
  for (const wd of wikidata) {
    if (wd.lat == null || wd.lng == null) continue;
    if (droppedIds.has(wd.sourceId)) continue;

    for (const os of osm) {
      if (os.lat == null || os.lng == null) continue;
      if (droppedIds.has(os.sourceId) || droppedIds.has(wd.sourceId)) continue;

      const dist = distanceKm(wd.lat, wd.lng, os.lat, os.lng);
      if (dist > PROXIMITY_KM) continue;

      const nameMatch =
        (wd.name && os.name && namesSimilar(wd.name, os.name)) ||
        (wd.buriedPerson && os.name && namesSimilar(wd.buriedPerson, os.name)) ||
        (wd.name && os.buriedPerson && namesSimilar(wd.name, os.buriedPerson));

      if (!nameMatch && dist > 0.05) continue;

      // Enrich OSM with Wikidata metadata
      if (!os.buriedPerson && wd.buriedPerson) os.buriedPerson = wd.buriedPerson;
      if (!os.buriedPersonHe && wd.buriedPersonHe) os.buriedPersonHe = wd.buriedPersonHe;
      if (!os.wikidataId && wd.wikidataId) os.wikidataId = wd.wikidataId;
      if (!os.hillula && wd.hillula) os.hillula = wd.hillula;

      // Boost confidence when both sources agree
      if (os.confidenceScore != null) {
        os.confidenceScore = Math.min(100, os.confidenceScore + 12);
        os.confidenceReason = (os.confidenceReason || '') + ' | +OSM+Wikidata match';
        os.confidenceLevel = os.confidenceScore >= 70 ? 'high' : os.confidenceScore >= 45 ? 'medium' : 'low';
      }

      merged.push({ kept: os, dropped: wd });
      droppedIds.add(wd.sourceId);
      break;
    }
  }

  const unique = records.filter((r) => !droppedIds.has(r.sourceId));
  return { unique, merged };
}
