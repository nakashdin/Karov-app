/**
 * PREVIEW ONLY — dedup + enrichment analysis of the council records against the
 * app's existing synagogues. Produces REPORTS ONLY. It does NOT touch live data,
 * does NOT merge, does NOT delete/overwrite. Additive-only by construction.
 *
 * Run:  node importers/religious-councils/build-preview-dedup.ts
 * In :  importers/religious-councils/output/<council>.normalized.json (×7)
 *       src/data/generated/places.osm.json   (read-only)
 * Out:  output/reports/preview-dedup.json , preview-summary.json
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Place } from '../../src/types/place.ts';
import type { CouncilPlace } from './sources.ts';
import { normName } from './parse.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'output');
const REPORTS = join(OUT, 'reports');
const COUNCIL_IDS = ['petah-tikva', 'netanya', 'givat-shmuel', 'yehud', 'merchavim', 'rosh-haayin', 'ganei-tikva'];

const toRad = (d: number): number => (d * Math.PI) / 180;
function meters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

const tokens = (s: string): string[] => normName(s).split(' ').filter((t) => t.length > 1);
function nameSim(a: string, b: string): number {
  const A = new Set(tokens(a)), B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const jac = inter / (A.size + B.size - inter);
  const na = normName(a).replace(/\s/g, ''), nb = normName(b).replace(/\s/g, '');
  if (na && nb && (na.includes(nb) || nb.includes(na))) return Math.max(jac, 0.85);
  return jac;
}

interface MatchRow {
  sourceId: string; council: string; name: string;
  classification: 'new' | 'match' | 'conflict';
  matchedId?: string; matchedName?: string; distanceM?: number; nameSim?: number;
  enrichFields?: string[]; suspicious?: boolean;
}

function main(): void {
  const existing = (JSON.parse(readFileSync(join(HERE, '..', '..', 'src', 'data', 'generated', 'places.osm.json'), 'utf8')) as Place[])
    .filter((p) => p.type === 'synagogue');

  const council: CouncilPlace[] = [];
  for (const id of COUNCIL_IDS) {
    const f = join(OUT, `${id}.normalized.json`);
    if (existsSync(f)) council.push(...(JSON.parse(readFileSync(f, 'utf8')) as CouncilPlace[]));
  }

  const rows: MatchRow[] = [];
  for (const c of council) {
    let best: { e: Place; d: number; sim: number } | null = null;
    let strongNear = 0;
    for (const e of existing) {
      const d = meters(c.lat, c.lng, e.location.latitude, e.location.longitude);
      if (d > 600) continue;
      const sim = nameSim(c.name, e.name);
      if (d <= 80 && sim >= 0.5) strongNear++;
      if (!best || sim > best.sim || (sim === best.sim && d < best.d)) best = { e, d, sim };
    }

    const row: MatchRow = { sourceId: c.sourceId, council: c.council, name: c.name, classification: 'new' };
    if (best && best.d <= 150 && best.sim >= 0.6) row.classification = 'match';
    else if (best && best.sim >= 0.8 && best.d <= 600) row.classification = 'match'; // name match, coord drift
    else if (best && best.d <= 150 && best.sim >= 0.3) row.classification = 'conflict'; // same spot, different name
    else row.classification = 'new';

    if (row.classification !== 'new' && best) {
      row.matchedId = best.e.id;
      row.matchedName = best.e.name;
      row.distanceM = Math.round(best.d);
      row.nameSim = Number(best.sim.toFixed(2));
      if (strongNear >= 2) row.suspicious = true;
      if (row.classification === 'match') {
        const ef: string[] = [];
        if (c.nusach && !best.e.nusach) ef.push('nusach');
        if (c.gabbaiPhone && !best.e.phone) ef.push('phone');
        if (best.e.source === 'osm' && (!best.e.address || best.e.address === best.e.cityId) && c.address) ef.push('address');
        row.enrichFields = ef;
      }
    }
    rows.push(row);
  }

  const news = rows.filter((r) => r.classification === 'new');
  const matches = rows.filter((r) => r.classification === 'match');
  const conflicts = rows.filter((r) => r.classification === 'conflict');
  const enriched = matches.filter((r) => (r.enrichFields?.length ?? 0) > 0);
  const suspicious = rows.filter((r) => r.suspicious);

  const summary = {
    councilRecords: council.length,
    existingSynagogues: existing.length,
    newRecords: news.length,
    matchedExisting: matches.length,
    enrichedMatches: enriched.length,
    conflicts: conflicts.length,
    suspiciousDuplicates: suspicious.length,
    note: 'PREVIEW ONLY — no live data touched, no merge, additive-only',
    dryRun: true,
    liveDataTouched: false,
  };

  writeFileSync(join(REPORTS, 'preview-dedup.json'), JSON.stringify(rows, null, 2), 'utf8');
  writeFileSync(join(REPORTS, 'preview-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('\n========== PREVIEW dedup + enrichment ==========');
  for (const [k, v] of Object.entries(summary)) console.log(`  ${k}: ${v}`);
  console.log('\n--- 10 MATCHES (council → existing) ---');
  for (const r of matches.slice(0, 10)) {
    console.log(`  "${r.name}" → "${r.matchedName}" | ${r.distanceM}m | sim ${r.nameSim} | enrich [${(r.enrichFields ?? []).join(',')}]`);
  }
  console.log('\n--- 10 NEW (no match) ---');
  for (const r of news.slice(0, 10)) console.log(`  "${r.name}" (${r.council})`);
}

main();
