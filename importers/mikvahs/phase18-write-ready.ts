/**
 * Phase 18b — Apply PREVIEW for the 49 Phase-18 write-ready mikveh records
 * (Jerusalem 42 + Holon 4 + Lod 3). DRY-RUN: builds exact Place payloads for an
 * additive append, writes NOTHING. Does NOT touch rebuildAppDataset.
 *
 * Steps: pull the new_record+coords set → re-dedup vs the live 556 (coords) →
 * within-batch coord dedup → spot-check names/coords → emit Place payloads
 * preserving sourceUrl / sourceName / license / provenance / gender / phone /
 * address. Excludes duplicates and anything suspicious.
 *
 * Run:  node importers/mikvahs/phase18-write-ready.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isInIsrael, isMain } from '../shared/utils.ts';
import type { Place } from '../../src/types/place.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'output');
const GEN = join(HERE, '..', '..', 'src', 'data', 'generated');
const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const NOW = new Date().toISOString().slice(0, 10);

interface Prev {
  id: string; name: string; type: string; cityHint?: string; address?: string; phone?: string;
  tags?: string[]; location?: { latitude: number; longitude: number };
  provenance: { sourceId: string; sourceRecordId: string; sourceUrl?: string };
  extra?: any;
}
const meters = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number => {
  const R = (d: number) => d * Math.PI / 180; const dLat = R(b.latitude - a.latitude), dLng = R(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(R(a.latitude)) * Math.cos(R(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
};
const normName = (s: string): string => s.replace(/["'׳״’”`]/g, '').replace(/\s+/g, ' ').trim();

function appId(p: Prev): string {
  const sid = p.provenance.sourceId; const srid = p.provenance.sourceRecordId; const loc = p.location!;
  if (sid.includes('jerusalem')) return `mikveh-jlm-${loc.latitude.toFixed(5)}_${loc.longitude.toFixed(5)}`;
  if (sid.includes('holon')) return `mikveh-holon-${srid.replace(/^חולון-/, '')}`;
  if (sid.includes('lod')) return `mikveh-lod-${srid.replace(/^לוד-/, '')}`;
  return `mikveh-p18-${loc.latitude.toFixed(5)}_${loc.longitude.toFixed(5)}`;
}

function toPlace(p: Prev): Place {
  const sid = p.provenance.sourceId;
  const sourceName = sid.includes('jerusalem') ? 'המועצה הדתית ירושלים' : sid.includes('holon') ? 'עיריית חולון — GIS' : sid.includes('lod') ? 'עיריית לוד — GIS' : 'official';
  const license = (p.extra?.sourceLicense as string) ?? (sid.startsWith('gis:') ? 'municipal-open' : 'council-public');
  const gender = (p.extra?.gender as string) ?? p.tags?.find((t) => t.startsWith('gender:'))?.slice(7);
  const place: Place = {
    id: appId(p), name: p.name, type: 'mikveh', cityId: p.cityHint ?? '',
    address: p.address ?? p.cityHint ?? '', location: p.location!, source: 'seed',
  };
  if (p.phone) place.phone = p.phone;
  if (gender) place.mikvehGender = gender;
  if (p.extra?.attendant) place.attendant = String(p.extra.attendant);
  if (p.provenance.sourceUrl) place.sourceUrl = p.provenance.sourceUrl;
  place.sourceName = sourceName;
  place.extra = {
    license,
    attribution: sid.includes('jerusalem') ? 'המועצה הדתית ירושלים (rabanut.org.il)' : sid.includes('holon') ? 'Holon Municipality GIS' : 'Lod Municipality GIS',
    provenance: { sourceId: sid, sourceRecordId: p.provenance.sourceRecordId, fetchedAt: NOW },
  };
  return place;
}

interface Excl { id: string; name: string; city?: string; source: string; reason: string; flags: string[]; }

function run(): void {
  const preview = readJson<Prev[]>(join(OUT, 'phase18-preview.json'));
  const analysis = readJson<any[]>(join(OUT, 'phase18-merge-analysis.json'));
  // the 49 = new_record + has coords (paired by index)
  const wr = preview.map((p, i) => ({ p, a: analysis[i] })).filter((x) => x.a.classification === 'new_record' && x.p.location).map((x) => x.p);

  const excluded: Excl[] = [];
  const kept: Prev[] = [];

  // 1) spot-check: valid coords + name quality
  const candidates = wr.filter((p) => {
    if (!p.location || !isInIsrael(p.location)) { excluded.push({ id: p.id, name: p.name, city: p.cityHint, source: p.provenance.sourceId, reason: 'invalid/out-of-Israel coordinates', flags: ['bad-coords'] }); return false; }
    return true;
  });

  // 2) re-dedup vs live 556 (coords) + 3) within-batch dedup
  const live = readJson<any[]>(join(GEN, 'places.osm.json')).filter((p) => p.type === 'mikveh' && p.location);
  for (const p of candidates) {
    const near = live.find((l) => meters(p.location!, l.location) <= 100);
    if (near) { excluded.push({ id: p.id, name: p.name, city: p.cityHint, source: p.provenance.sourceId, reason: `duplicate of live ${near.id} (${Math.round(meters(p.location!, near.location))}m)`, flags: ['live-duplicate'] }); continue; }
    const twin = kept.find((k) => meters(k.location!, p.location!) <= 40 && (normName(k.name) === normName(p.name) || k.provenance.sourceId === p.provenance.sourceId));
    if (twin) { excluded.push({ id: p.id, name: p.name, city: p.cityHint, source: p.provenance.sourceId, reason: `within-batch duplicate of ${twin.provenance.sourceRecordId} (${Math.round(meters(twin.location!, p.location!))}m)`, flags: ['batch-duplicate'] }); continue; }
    kept.push(p);
  }

  // 4) build Place payloads + id-collision guard
  const existingIds = new Set(readJson<any[]>(join(GEN, 'places.osm.json')).map((p) => p.id));
  const included = kept.map(toPlace);
  const dupAppIds = included.map((x) => x.id).filter((id, i, arr) => arr.indexOf(id) !== i);
  const collisions = included.filter((x) => existingIds.has(x.id)).map((x) => x.id);

  const bySource = included.reduce<Record<string, number>>((a, x) => { const k = String(x.sourceName); a[k] = (a[k] ?? 0) + 1; return a; }, {});
  const bareNames = included.filter((x) => normName(x.name).replace(/^ה?מקו[ו]?ה\s*/, '').replace(new RegExp(x.cityId, 'g'), '').trim() === '').length;
  const liveCount = readJson<any[]>(join(GEN, 'places.osm.json')).filter((p) => p.type === 'mikveh').length;

  const summary = {
    generatedNote: 'PHASE 18b — apply PREVIEW for the 49 write-ready Phase-18 records. DRY-RUN: exact Place payloads, NOTHING written. No publish, rebuildAppDataset NOT touched.',
    inputCandidates: wr.length,
    included: included.length,
    excluded: excluded.length,
    excludedDetail: excluded,
    duplicatesFound: excluded.filter((e) => e.flags.includes('live-duplicate') || e.flags.includes('batch-duplicate')).length,
    includedBySource: bySource,
    spotCheck: { allValidIsraelCoords: included.every((x) => isInIsrael(x.location)), bareUnnamedOfficialGisPoints: bareNames, note: 'bare-unnamed records are kept ONLY because they come from official municipal GIS mikvah layers (coordinate-verified), unlike crowd-sourced OSM.' },
    licensePreserved: { jerusalem: 'council-public (rabanut.org.il)', holon: 'municipal-open (Holon GIS)', lod: 'municipal-open (Lod GIS)' },
    fieldsPreserved: ['sourceUrl', 'sourceName', 'license', 'provenance', 'mikvehGender', 'phone', 'address'],
    idCollisionsWithLive: collisions.length,
    duplicateAppIdsInBatch: dupAppIds.length,
    finalRecommendedWriteCount: (collisions.length || dupAppIds.length) ? 0 : included.length,
    liveMikvehBefore: liveCount,
    estimatedTotalAfterWrite: liveCount + ((collisions.length || dupAppIds.length) ? 0 : included.length),
    rollbackPlan: [
      'Additive-only: every new id is fresh (mikveh-jlm-* / mikveh-holon-* / mikveh-lod-*); 0 existing ids touched.',
      'Before write: copy src/data/generated/places.osm.json → places.osm.pre-phase18.backup.json (and cities.osm.json).',
      'Rollback: restore both files from those backups; the new records vanish, existing 556+others unchanged. Do NOT run rebuildAppDataset.',
      'Verify rollback: record count returns to pre-write value; no existing id changed.',
    ],
    nextStep: 'On explicit human GO, append the included Place payloads with the additive guarded writer (apply-phase16-open.ts pattern). Never rebuild.',
    dryRun: true, liveDataTouched: false, publishPerformed: false, rebuildTouched: false,
  };

  writeFileSync(join(OUT, 'phase18-write-ready-preview.json'), JSON.stringify(included, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase18-write-ready-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('=== Phase 18b write-ready apply preview (dry-run) ===');
  console.log(`input ${wr.length} | included ${included.length} | excluded ${excluded.length} | duplicates ${summary.duplicatesFound}`);
  console.log(`by source: ${JSON.stringify(bySource)} | id collisions ${collisions.length} | bare-unnamed GIS ${bareNames}`);
  console.log(`final write count ${summary.finalRecommendedWriteCount} | est total after ${summary.estimatedTotalAfterWrite}`);
}

if (isMain(import.meta.url)) run();
