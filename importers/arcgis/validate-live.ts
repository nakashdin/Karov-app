/**
 * STABILIZATION VALIDATOR — read-only integrity checks on the live dataset
 * after the ArcGIS merges. Reads places.osm.json + the pre-arcgis-batch1 backup
 * (the canonical pre-ArcGIS city-name reference); NEVER writes live data. Writes
 * only a report under importers/arcgis/output/. Exits non-zero if any check fails.
 *
 * Run:  node importers/arcgis/validate-live.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Place } from '../../src/types/place.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const GEN = join(HERE, '..', '..', 'src', 'data', 'generated');
const PLACES = join(GEN, 'places.osm.json');
const PRE_ARCGIS = join(GEN, 'places.osm.pre-arcgis-batch1.backup.json');
const OUT = join(HERE, 'output');

const EXPECTED = { mikveh: 531, restaurant: 346, synagogue: 4030, arcgisRecords: 1291, arcgisCities: 8, councils: 14 };
const isArcgis = (id: string): boolean => typeof id === 'string' && id.startsWith('arcgis:');
const inIsrael = (p: Place): boolean =>
  p.location.latitude > 29 && p.location.latitude < 33.5 && p.location.longitude > 34 && p.location.longitude < 36;

function main(): void {
  const live = JSON.parse(readFileSync(PLACES, 'utf8')) as (Place & { provenance?: Record<string, unknown> })[];
  const baseCityIds = new Set(
    (JSON.parse(readFileSync(PRE_ARCGIS, 'utf8')) as Place[]).map((p) => p.cityId).filter(Boolean),
  );

  const arcgis = live.filter((p) => isArcgis(p.id));
  const byType: Record<string, number> = {};
  for (const p of live) byType[p.type] = (byType[p.type] || 0) + 1;

  // checks
  const ids = live.map((p) => p.id);
  const dupIds = ids.length - new Set(ids).size;
  const arcIds = arcgis.map((p) => p.id);
  const dupArcgisIds = arcIds.length - new Set(arcIds).size;
  const phoneZero = live.filter((p) => p.phone === '0').length;
  const badCoords = live.filter((p) => !inIsrael(p)).length;
  const newCityIds = [...new Set(arcgis.map((p) => p.cityId).filter((c) => !baseCityIds.has(c)))];
  const arcgisCities = new Set(arcgis.map((p) => p.id.match(/^arcgis:([a-z-]+):/)?.[1]).filter(Boolean));
  const councils = new Set(live.map((p) => p.provenance?.council).filter(Boolean));
  const arcgisNoProvenance = arcgis.filter((p) => !p.provenance || !(p.provenance.source || p.provenance.by)).length;

  const checks: { name: string; pass: boolean; detail: string }[] = [
    { name: 'no duplicate ids (all)', pass: dupIds === 0, detail: `dups=${dupIds}` },
    { name: 'no duplicate ids within ArcGIS', pass: dupArcgisIds === 0, detail: `dups=${dupArcgisIds}` },
    { name: 'no phone="0"', pass: phoneZero === 0, detail: `count=${phoneZero}` },
    { name: 'no coords outside Israel', pass: badCoords === 0, detail: `count=${badCoords}` },
    { name: 'no new/unexpected ArcGIS cityId', pass: newCityIds.length === 0, detail: newCityIds.length ? newCityIds.join(', ') : 'all cityIds pre-existed' },
    { name: 'mikvah count preserved', pass: byType.mikveh === EXPECTED.mikveh, detail: `${byType.mikveh}/${EXPECTED.mikveh}` },
    { name: 'restaurant count preserved', pass: byType.restaurant === EXPECTED.restaurant, detail: `${byType.restaurant}/${EXPECTED.restaurant}` },
    { name: 'synagogue count as expected', pass: byType.synagogue === EXPECTED.synagogue, detail: `${byType.synagogue}/${EXPECTED.synagogue}` },
    { name: 'ArcGIS record count as expected', pass: arcgis.length === EXPECTED.arcgisRecords, detail: `${arcgis.length}/${EXPECTED.arcgisRecords}` },
    { name: 'ArcGIS city count as expected', pass: arcgisCities.size === EXPECTED.arcgisCities, detail: `${arcgisCities.size}/${EXPECTED.arcgisCities}` },
    { name: 'council count as expected', pass: councils.size === EXPECTED.councils, detail: `${councils.size}/${EXPECTED.councils}` },
    { name: 'all ArcGIS records have provenance', pass: arcgisNoProvenance === 0, detail: `missing=${arcgisNoProvenance}` },
  ];

  const allPass = checks.every((c) => c.pass);
  const report = {
    verifiedAt: new Date().toISOString(),
    total: live.length,
    byType,
    arcgisRecords: arcgis.length,
    arcgisCities: [...arcgisCities].sort(),
    councils: councils.size,
    allPass,
    checks,
  };
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'validation-report.json'), JSON.stringify(report, null, 2), 'utf8');

  console.log('\n========== STABILIZATION VALIDATION (read-only) ==========');
  console.log(`  total=${live.length} | ${JSON.stringify(byType)} | arcgis=${arcgis.length} in ${arcgisCities.size} cities | councils=${councils.size}`);
  for (const c of checks) console.log(`  ${c.pass ? '✅' : '❌'} ${c.name} (${c.detail})`);
  console.log(`\n  RESULT: ${allPass ? '✅ ALL CHECKS PASSED' : '❌ FAILURES PRESENT'}`);
  if (!allPass) process.exit(1);
}

main();
