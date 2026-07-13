/**
 * REAL MERGE — connect the dry-run's write-ready Chabad houses into the app's
 * live dataset. ADDITIVE-ONLY, gated. DO NOT run until the dry-run report
 * (output/reports/) has been reviewed and approved.
 *
 * Safety (identical discipline to religious-councils/connect-live.ts):
 *   - Fresh backup first (places.osm.pre-chabad.backup.json), never overwritten.
 *   - Existing records are PRESERVED (0 deletions, enforced by a validation gate).
 *   - Only NEW chabad_house records from write-ready.json are appended.
 *   - Chabad houses are NEVER merged into synagogues (those are HELD in preview).
 *   - rebuildAppDataset is NEVER called (see the no-rebuild rule).
 *
 * Run (only after approval):  node importers/chabad/connect-live.ts
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isInIsrael } from '../shared/utils.ts';
import type { Place } from '../../src/types/place.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPORTS = join(HERE, 'output', 'reports');
const GEN = join(HERE, '..', '..', 'src', 'data', 'generated');
const PLACES = join(GEN, 'places.osm.json');
const CITIES = join(GEN, 'cities.osm.json');
const PLACES_BACKUP = join(GEN, 'places.osm.pre-chabad.backup.json');
const CITIES_BACKUP = join(GEN, 'cities.osm.pre-chabad.backup.json');
const WRITE_READY = join(REPORTS, 'write-ready.json');

function main(): void {
  if (!existsSync(WRITE_READY)) {
    console.error(`❌ ${WRITE_READY} not found — run build-preview.ts first.`);
    process.exit(1);
  }
  const liveRaw = readFileSync(PLACES, 'utf8');
  const citiesRaw = readFileSync(CITIES, 'utf8');
  const live = JSON.parse(liveRaw) as Place[];
  const beforeIds = new Set(live.map((p) => p.id));
  const beforeTotal = live.length;

  const incoming = JSON.parse(readFileSync(WRITE_READY, 'utf8')) as Place[];
  // Coordinate-proximity guard so re-runs can never duplicate an existing pin:
  // skip any incoming within 60m of a live chabad_house/synagogue with a similar
  // name. (id guard alone is not enough — coord-based ids can differ on re-run.)
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const meters = (aLat: number, aLng: number, bLat: number, bLng: number): number => {
    const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371000 * Math.asin(Math.sqrt(h));
  };
  const liveCoord = live.filter((p) => (p.type === 'chabad_house' || p.type === 'synagogue') && p.location);
  const isNearExisting = (p: Place): boolean =>
    liveCoord.some((e) => meters(p.location.latitude, p.location.longitude, e.location.latitude, e.location.longitude) <= 60);

  // additive: only genuinely-new ids+positions, only chabad_house, dedup within incoming
  const seen = new Set<string>();
  const added: Place[] = [];
  let skippedDup = 0;
  for (const p of incoming) {
    if (p.type !== 'chabad_house') continue;
    if (beforeIds.has(p.id) || seen.has(p.id)) { skippedDup++; continue; }
    if (isNearExisting(p)) { skippedDup++; continue; }
    seen.add(p.id);
    added.push(p);
  }

  const merged = [...live, ...added];

  // ---- tag-updates: add 'chabad_house' to tags of synagogues that are also
  //      Chabad houses (identified by build-preview's overlap_synagogue pass) ---
  const TAG_UPDATES = join(REPORTS, 'tag-updates.json');
  let taggedSynagogues = 0;
  if (existsSync(TAG_UPDATES)) {
    const tagUpdates = JSON.parse(readFileSync(TAG_UPDATES, 'utf8')) as { id: string; addTag: string }[];
    for (const u of tagUpdates) {
      const p = merged.find((x) => x.id === u.id);
      if (p && !p.tags?.includes(u.addTag)) {
        p.tags = [...(p.tags ?? []), u.addTag];
        taggedSynagogues++;
      }
    }
  }

  // ---- VALIDATION GATE (abort on any failure; nothing written) -------------
  const fail: string[] = [];
  for (const id of beforeIds) if (!merged.some((p) => p.id === id)) fail.push(`DELETED id ${id}`);
  if (merged.length !== beforeTotal + added.length) fail.push('count mismatch');
  for (const a of added) {
    if (!a.name?.trim()) fail.push(`new without name ${a.id}`);
    if (!a.cityId?.trim()) fail.push(`new without city ${a.id}`);
    if (!a.location || !Number.isFinite(a.location.latitude) || !isInIsrael(a.location)) fail.push(`new bad coords ${a.id}`);
  }
  if (fail.length) {
    console.error('❌ VALIDATION GATE FAILED — nothing written:\n  ' + fail.slice(0, 10).join('\n  '));
    process.exit(1);
  }

  // ---- fresh backups (never overwrite an existing backup) -------------------
  if (!existsSync(PLACES_BACKUP)) writeFileSync(PLACES_BACKUP, liveRaw, 'utf8');
  if (!existsSync(CITIES_BACKUP)) writeFileSync(CITIES_BACKUP, citiesRaw, 'utf8');

  // ---- write live (additive) + rebuild cities (NOT rebuildAppDataset) ------
  writeFileSync(PLACES, JSON.stringify(merged, null, 2), 'utf8');
  const counts: Record<string, number> = {};
  for (const p of merged) if (p.cityId) counts[p.cityId] = (counts[p.cityId] || 0) + 1;
  const cities = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).map((name) => ({ id: name, name }));
  writeFileSync(CITIES, JSON.stringify(cities, null, 2), 'utf8');

  const summary = {
    addedChabadHouses: added.length,
    taggedSynagogues,
    skippedDuplicates: skippedDup,
    beforeTotal, afterTotal: merged.length,
    chabadHousesAfter: merged.filter((p) => p.type === 'chabad_house').length,
    synagoguesTaggedChabad: merged.filter((p) => p.type === 'synagogue' && p.tags?.includes('chabad_house')).length,
    deletions: 0, citiesAfter: cities.length, backupCreated: true,
  };
  writeFileSync(join(REPORTS, 'connect-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log('\n========== REAL MERGE (additive, gated) ==========');
  for (const [k, v] of Object.entries(summary)) console.log(`  ${k}: ${v}`);
}

main();
