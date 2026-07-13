/**
 * Phase 16b — Apply PREVIEW for the 51 write-ready new mikveh records
 * (OSM 50 + Tel Aviv GIS 1). DRY-RUN: builds exact Place payloads ready for an
 * additive append, but writes NOTHING to the app data.
 *
 * Steps:
 *   1. Re-fetch OSM (with tags) to SPOT-CHECK quality — exclude archaeological
 *      ruins / cisterns (historic=* / "שריד" / "בור מים"), and bare unnamed nodes.
 *   2. Re-deduplicate every candidate against the CURRENT live 531 (by coords).
 *   3. Within-batch coordinate dedup (one mikvah mapped twice in OSM).
 *   4. Build exact app `Place` payloads, preserving source/license/provenance
 *      (OSM=ODbL, Tel Aviv GIS=municipal-open).
 *
 * NO DB write, NO publish. Output: preview (Place payloads) + summary.
 *
 * Run:  node importers/mikvahs/phase16-write-ready.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { USER_AGENT, fetchOverpass, isInIsrael, isMain } from '../shared/utils.ts';
import type { Place } from '../../src/types/place.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'output');
const GEN = join(HERE, '..', '..', 'src', 'data', 'generated');
const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const NOW = new Date().toISOString().slice(0, 10);

interface PrevRec {
  id: string; name: string; type: string; cityHint?: string; address?: string; phone?: string;
  openingHours?: string; tags?: string[]; location?: { latitude: number; longitude: number };
  provenance: { sourceId: string; sourceRecordId: string; sourceUrl?: string };
  extra?: Record<string, unknown>;
}

const meters = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number => {
  const toR = (d: number) => d * Math.PI / 180; const dLat = toR(b.latitude - a.latitude), dLng = toR(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.latitude)) * Math.cos(toR(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
};
const normName = (s: string): string => s.replace(/["'׳״’”`]/g, '').replace(/\s+/g, ' ').trim();
const nameCore = (s: string): string => normName(s).replace(/^ה?מקו[ו]?ה\s*/, '').trim();

async function osmTags(): Promise<Map<string, Record<string, string>>> {
  const q = `[out:json][timeout:120];area["ISO3166-1"="IL"][admin_level=2]->.il;(nwr["amenity"="ritual_bath"](area.il);nwr["bath:type"="mikveh"](area.il);nwr["amenity"="public_bath"]["religion"="jewish"](area.il);nwr["name"~"מקווה|מקוה",i](area.il););out center tags;`;
  const d = await fetchOverpass(q, 'osm-tags');
  const m = new Map<string, Record<string, string>>();
  for (const e of d.elements ?? []) m.set(`${e.type}-${e.id}`, e.tags ?? {});
  return m;
}

interface Decision { rec: PrevRec; include: boolean; reason: string; confidence: number; flags: string[]; }

function spotCheck(rec: PrevRec, tags: Record<string, string> | undefined): Decision {
  const isOsm = rec.provenance.sourceId === 'osm:mikvahs';
  const name = normName(rec.name ?? '');
  const flags: string[] = [];

  if (isOsm) {
    // archaeological / non-operating water installations → EXCLUDE
    if (tags?.historic || /שריד|חורב|עתיק|ארכיאולוג|בור\s*מים|תל\s|נבטי|רומי/.test(name)) {
      return { rec, include: false, reason: 'archaeological/ruins or water-cistern (not an operating mikvah)', confidence: 0, flags: ['archaeological'] };
    }
    const ritualTag = tags?.amenity === 'ritual_bath' || tags?.['bath:type'] === 'mikveh';
    const hasSpecific = nameCore(name) !== '';
    const hasCity = !!rec.cityHint?.trim();
    // bare unnamed node, no ritual_bath tag, no city → too low-confidence to verify
    if (!ritualTag && !hasSpecific && !hasCity) {
      return { rec, include: false, reason: 'bare unnamed "מקווה" node — no specific name, no ritual_bath tag, no city → unverifiable', confidence: 0.4, flags: ['bare-generic'] };
    }
    if (ritualTag) flags.push('ritual_bath-tag');
    if (!hasSpecific) flags.push('generic-name');
    const confidence = ritualTag ? 0.85 : hasSpecific ? 0.75 : 0.6;
    return { rec, include: true, reason: ritualTag ? 'OSM amenity=ritual_bath' : hasSpecific ? 'OSM named mikvah facility' : 'OSM generic mikvah with city', confidence, flags };
  }
  // Tel Aviv GIS — authoritative municipal layer
  return { rec, include: true, reason: 'Tel Aviv municipal GIS feature', confidence: 0.9, flags: ['municipal-gis'] };
}

function toPlace(rec: PrevRec): { place: Place; source: string; license: string } {
  const isOsm = rec.provenance.sourceId === 'osm:mikvahs';
  const appId = isOsm ? `mikveh-${rec.provenance.sourceRecordId}` : `mikveh-${rec.provenance.sourceRecordId}`; // mikveh-osm-node-.. / mikveh-tlv-..
  const license = isOsm ? 'ODbL-1.0' : 'municipal-open';
  const sourceName = isOsm ? 'OpenStreetMap (ODbL)' : 'עיריית תל אביב-יפו — GIS';
  const gender = (rec.extra?.gender as string) ?? rec.tags?.find((t) => t.startsWith('gender:'))?.slice(7);
  const place: Place = {
    id: appId,
    name: rec.name,
    type: 'mikveh',
    cityId: rec.cityHint ?? '',
    address: rec.address ?? rec.cityHint ?? '',
    location: rec.location!,
    source: isOsm ? 'osm' : 'seed',
  };
  if (rec.phone) place.phone = rec.phone;
  if (rec.openingHours) place.openingHours = rec.openingHours;
  if (gender) place.mikvehGender = gender;
  if (rec.extra?.attendant) place.attendant = String(rec.extra.attendant);
  if (rec.provenance.sourceUrl) place.sourceUrl = isOsm ? `https://www.openstreetmap.org/${rec.provenance.sourceRecordId.replace('osm-', '').replace('-', '/')}` : rec.provenance.sourceUrl;
  place.sourceName = sourceName;
  place.extra = {
    license, attribution: isOsm ? '© OpenStreetMap contributors (ODbL)' : 'Tel Aviv-Yafo Municipality GIS',
    provenance: { sourceId: rec.provenance.sourceId, sourceRecordId: rec.provenance.sourceRecordId, fetchedAt: NOW },
    ...(rec.extra?.accessibility ? { accessibility: rec.extra.accessibility } : {}),
  };
  return { place, source: place.source!, license };
}

async function run(): Promise<void> {
  const prev = readJson<PrevRec[]>(join(OUT, 'phase16-official-open-preview.json'));
  const analysis = readJson<any[]>(join(OUT, 'phase16-official-open-merge-analysis.json'));
  // the 51 write-ready = new_record + has coords (OSM + TLV), paired by index
  const wr = prev.map((rec, i) => ({ rec, a: analysis[i] }))
    .filter((x) => x.a.classification === 'new_record' && x.rec.location &&
      (x.rec.provenance.sourceId === 'osm:mikvahs' || x.rec.provenance.sourceId === 'gis:tel-aviv:mikvaot'))
    .map((x) => x.rec);

  const tagMap = await osmTags();

  // 1. spot-check
  const decisions = wr.map((rec) => spotCheck(rec, tagMap.get(rec.provenance.sourceRecordId.replace('osm-', ''))));

  // 2. re-dedup vs current live 531 (coords)
  const live = readJson<any[]>(join(GEN, 'places.osm.json')).filter((p) => p.type === 'mikveh' && p.location);
  for (const d of decisions) {
    if (!d.include) continue;
    const near = live.find((l) => meters(d.rec.location!, l.location) <= 100);
    if (near) { d.include = false; d.reason = `duplicate of live ${near.id} (${Math.round(meters(d.rec.location!, near.location))}m)`; d.flags.push('live-duplicate'); }
  }

  // 3. within-batch coordinate dedup (keep first)
  const kept: Decision[] = [];
  for (const d of decisions) {
    if (!d.include) continue;
    const twin = kept.find((k) => meters(k.rec.location!, d.rec.location!) <= 40);
    if (twin) { d.include = false; d.reason = `within-batch duplicate of ${twin.rec.provenance.sourceRecordId} (${Math.round(meters(twin.rec.location!, d.rec.location!))}m)`; d.flags.push('batch-duplicate'); continue; }
    kept.push(d);
  }

  // 4. build Place payloads + id-collision guard
  const existingIds = new Set(readJson<any[]>(join(GEN, 'places.osm.json')).map((p) => p.id));
  const included = kept.map((d) => toPlace(d.rec));
  const collisions = included.filter((x) => existingIds.has(x.place.id)).map((x) => x.place.id);

  const excluded = decisions.filter((d) => !d.include).map((d) => ({
    sourceRecordId: d.rec.provenance.sourceRecordId, name: d.rec.name, city: d.rec.cityHint ?? null,
    source: d.rec.provenance.sourceId, reason: d.reason, flags: d.flags,
  }));

  const liveCount = readJson<any[]>(join(GEN, 'places.osm.json')).filter((p) => p.type === 'mikveh').length;
  const bySourceIncluded = included.reduce<Record<string, number>>((a, x) => { a[x.source] = (a[x.source] ?? 0) + 1; return a; }, {});
  const exclByReason = excluded.reduce<Record<string, number>>((a, e) => { const k = e.flags[0] ?? 'other'; a[k] = (a[k] ?? 0) + 1; return a; }, {});

  const summary = {
    generatedNote: 'PHASE 16b — apply PREVIEW for the 51 write-ready new mikveh records. DRY-RUN: exact Place payloads, NOTHING written. No publish.',
    inputCandidates: wr.length,
    included: included.length,
    excluded: excluded.length,
    excludedByReason: exclByReason,
    excludedDetail: excluded,
    duplicatesFound: excluded.filter((e) => e.flags.includes('live-duplicate') || e.flags.includes('batch-duplicate')).length,
    includedBySource: bySourceIncluded,
    licensePreserved: { osm: 'ODbL-1.0 (attribution: © OpenStreetMap contributors)', telAvivGis: 'municipal-open (Tel Aviv-Yafo Municipality GIS)' },
    idCollisionsWithLive: collisions.length,
    allIncludedHaveValidLocation: included.every((x) => isInIsrael(x.place.location)),
    finalRecommendedWriteCount: collisions.length ? 0 : included.length,
    liveMikvehBefore: liveCount,
    estimatedTotalAfterWrite: liveCount + (collisions.length ? 0 : included.length),
    rollbackPlan: [
      'Additive-only: each new id is fresh (mikveh-osm-* / mikveh-tlv-*), 0 existing ids touched.',
      'Before write: copy src/data/generated/places.osm.json → places.osm.pre-phase16-open.backup.json (and cities.osm.json).',
      'Rollback: restore both files from those backups; new records vanish, existing 531+others unchanged.',
      'Verify rollback: record count returns to pre-write value and no existing id changed.',
    ],
    nextStep: 'On human GO, append the included Place payloads with the same additive guarded writer used for Tier A (apply-tier-a.ts pattern). Spot-check OSM generic-name records on a map first if desired.',
    dryRun: true, liveDataTouched: false, publishPerformed: false,
  };

  writeFileSync(join(OUT, 'phase16-write-ready-preview.json'), JSON.stringify(included.map((x) => x.place), null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase16-write-ready-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('=== Phase 16b write-ready apply preview (dry-run) ===');
  console.log(`input ${wr.length} | included ${included.length} | excluded ${excluded.length} (${JSON.stringify(exclByReason)})`);
  console.log(`included by source: ${JSON.stringify(bySourceIncluded)} | id collisions: ${collisions.length}`);
  console.log(`final write count: ${summary.finalRecommendedWriteCount} | est total after: ${summary.estimatedTotalAfterWrite}`);
}

if (isMain(import.meta.url)) void run();
