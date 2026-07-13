/**
 * Phase 23 — Mikveh coverage AUDIT (read-only). Analyzes the live mikveh set
 * (696 after the Phase 19–22 write) and emits two reports. NO import, NO write
 * to the dataset, NO rebuild. Only writes the two audit JSONs under output/.
 *
 * Run:  node importers/mikvahs/coverage-audit.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain } from '../shared/utils.ts';
import type { Place } from '../../src/types/place.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const GEN = join(HERE, '..', '..', 'src', 'data', 'generated');
const OUT = join(HERE, 'output');
const read = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const write = (p: string, d: unknown): void => writeFileSync(p, JSON.stringify(d, null, 2), 'utf8');

const genderOf = (p: Place): string => {
  const s = `${p.mikvehGender ?? ''} ${p.name ?? ''}`;
  if (/כלים/.test(s)) return 'כלים';
  if (/גברים/.test(s)) return 'גברים';
  return 'נשים';
};
const meters = (a: any, b: any): number => {
  const R = (d: number) => (d * Math.PI) / 180;
  const dLat = R(b.latitude - a.latitude), dLng = R(b.longitude - a.longitude);
  const hh = Math.sin(dLat / 2) ** 2 + Math.cos(R(a.latitude)) * Math.cos(R(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(hh));
};
const nonEmpty = (v: unknown): boolean => v != null && String(v).trim() !== '';

// Population (thousands, approx) + type weighting for low-coverage heuristic.
// kind: 'haredi' (dense mikveh need), 'dati' (religious), 'general', 'arab' (≈0 Jewish mikvehs — not a gap).
const POP: Array<[string, number, string]> = [
  ['ירושלים', 981, 'haredi'], ['תל אביב - יפו', 474, 'general'], ['חיפה', 285, 'general'],
  ['ראשון לציון', 254, 'general'], ['פתח תקווה', 248, 'general'], ['אשדוד', 225, 'haredi'],
  ['נתניה', 224, 'general'], ['באר שבע', 209, 'general'], ['בני ברק', 208, 'haredi'],
  ['חולון', 196, 'general'], ['רמת גן', 170, 'general'], ['רחובות', 149, 'general'],
  ['אשקלון', 148, 'general'], ['בת ים', 128, 'general'], ['בית שמש', 125, 'haredi'],
  ['כפר סבא', 111, 'general'], ['חדרה', 99, 'general'], ['מודיעין-מכבים-רעות', 97, 'general'],
  ['הרצליה', 97, 'general'], ['מודיעין עילית', 94, 'haredi'], ['לוד', 81, 'general'],
  ['נצרת', 78, 'arab'], ['רמלה', 78, 'general'], ['רהט', 78, 'arab'], ['רעננה', 75, 'general'],
  ['ראש העין', 75, 'dati'], ['הוד השרון', 65, 'general'], ['ביתר עילית', 65, 'haredi'],
  ['גבעתיים', 62, 'general'], ['קרית אתא', 62, 'general'], ['נהריה', 60, 'general'],
  ['קרית גת', 60, 'dati'], ['אום אל-פחם', 58, 'arab'], ['עפולה', 53, 'general'],
  ['אילת', 53, 'general'], ['נס ציונה', 51, 'general'], ['יבנה', 51, 'general'],
  ['אלעד', 50, 'haredi'], ['עכו', 49, 'general'], ['טבריה', 48, 'dati'],
  ['קרית מוצקין', 41, 'general'], ['קרית אונו', 40, 'general'], ['קרית ביאליק', 40, 'general'],
  ['קרית ים', 39, 'general'], ['אור יהודה', 37, 'general'], ['צפת', 37, 'dati'],
  ['דימונה', 34, 'general'], ['נתיבות', 43, 'dati'], ['שדרות', 27, 'general'],
  ['אופקים', 35, 'dati'], ['גבעת שמואל', 30, 'dati'], ['קרית מלאכי', 27, 'dati'],
  ['טירת כרמל', 24, 'general'], ['מגדל העמק', 25, 'general'], ['יקנעם עילית', 24, 'general'],
  ['אור עקיבא', 22, 'general'], ['בית שאן', 18, 'general'], ['קרית שמונה', 23, 'general'],
];
const norm = (s: unknown): string => String(s ?? '').replace(/["׳״’–-]/g, ' ').replace(/\s+/g, ' ').trim();

function run(): void {
  const all = read<Place[]>(join(GEN, 'places.osm.json'));
  const mik = all.filter((p) => p.type === 'mikveh');

  // --- 1. count by city ---
  const byCity: Record<string, number> = {};
  for (const m of mik) byCity[m.cityId || '(ללא עיר)'] = (byCity[m.cityId || '(ללא עיר)'] ?? 0) + 1;
  const cityRanked = Object.entries(byCity).sort((a, b) => b[1] - a[1]).map(([city, count]) => ({ city, count }));

  // --- 2. top coverage cities ---
  const topCities = cityRanked.slice(0, 20);

  // --- 3. suspiciously low-coverage (population-aware) ---
  const liveForCity = (city: string): number => {
    const c = norm(city);
    return mik.filter((m) => norm(m.cityId) === c || norm(m.cityId).includes(c) || norm(m.address).includes(c)).length;
  };
  const lowCoverage = POP.map(([city, pop, kind]) => {
    const live = liveForCity(city);
    const per100k = +(live / (pop / 100)).toFixed(2);
    // expected minimum: haredi ~1 per 6k, dati ~1 per 12k, general ~1 per 20k; arab ≈ 0.
    const factor = kind === 'haredi' ? 6 : kind === 'dati' ? 12 : kind === 'arab' ? Infinity : 20;
    const expectedMin = factor === Infinity ? 0 : Math.round(pop / factor);
    const gap = Math.max(0, expectedMin - live);
    return { city, popK: pop, kind, live, per100k, expectedMin, gap };
  }).filter((r) => r.kind !== 'arab' && r.gap >= 2)
    .sort((a, b) => b.gap - a.gap);

  // --- 4. duplicate-risk clusters (same city, same gender, <=75m apart) ---
  const dupClusters: any[] = [];
  const byCityRecs: Record<string, Place[]> = {};
  for (const m of mik) (byCityRecs[m.cityId || '?'] ??= []).push(m);
  for (const [city, recs] of Object.entries(byCityRecs)) {
    for (let i = 0; i < recs.length; i++) for (let j = i + 1; j < recs.length; j++) {
      const a = recs[i], b = recs[j];
      if (!a.location || !b.location) continue;
      const d = meters(a.location, b.location);
      if (d <= 75 && genderOf(a) === genderOf(b)) {
        dupClusters.push({ city, gender: genderOf(a), distanceM: Math.round(d), a: { id: a.id, name: a.name, address: a.address }, b: { id: b.id, name: b.name, address: b.address }, note: 'same city + same gender + ≤75m → review for duplicate' });
      }
    }
  }
  dupClusters.sort((x, y) => x.distanceM - y.distanceM);

  // --- 5. records missing fields ---
  const missing = {
    phone: mik.filter((m) => !nonEmpty(m.phone)),
    address: mik.filter((m) => !nonEmpty(m.address) || norm(m.address) === norm(m.cityId)),
    gender: mik.filter((m) => !nonEmpty(m.mikvehGender)),
    sourceUrl: mik.filter((m) => !nonEmpty(m.sourceUrl)),
  };
  const lite = (m: Place) => ({ id: m.id, name: m.name, city: m.cityId });

  // --- 6. approximate / city-level coordinates ---
  const cityLevel = mik.filter((m) => m.locationPrecision === 'city');

  // --- 7. source breakdown ---
  const tally = (fn: (m: Place) => string): Record<string, number> =>
    mik.reduce<Record<string, number>>((a, m) => { const k = fn(m) || '(none)'; a[k] = (a[k] ?? 0) + 1; return a; }, {});
  const sourceBreakdown = {
    bySourceField: tally((m) => String(m.source ?? '(none)')),
    byLocationPrecision: tally((m) => String(m.locationPrecision ?? 'native/exact')),
    byGender: tally((m) => genderOf(m)),
    byCoordSource: tally((m) => String((m.extra as any)?.coordSource ?? '(none)')),
    bySourceName: Object.entries(tally((m) => String(m.sourceName ?? '(none)'))).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
    withProvenance: mik.filter((m) => (m.extra as any)?.provenance).length,
  };

  // --- 8. recommended next 10 targets ---
  // Cities whose official council source was already fully scraped in Phases 16–22
  // (gap may persist but the OFFICIAL source is exhausted → not an actionable re-target;
  // these need an ALTERNATIVE source such as the gov.il national feed or neighborhood lists).
  const PROCESSED = new Set(['ראשון לציון', 'רמת גן', 'גבעתיים', 'קרית אתא', 'אשדוד', 'בית שמש', 'קרית גת', 'בני ברק', 'מודיעין עילית', 'ביתר עילית', 'אלעד', 'חיפה', 'טבריה', 'נהריה', 'עפולה', 'קרית מוצקין', 'קרית ביאליק', 'קרית ים', 'כפר סבא', 'רעננה', 'הרצליה', 'נתניה', 'צפת', 'תל אביב - יפו', 'חולון', 'בת ים', 'לוד', 'אשקלון']);
  const actionable = lowCoverage.filter((r) => !PROCESSED.has(r.city));
  const recommended = actionable.slice(0, 10).map((r, i) => ({
    rank: i + 1, city: r.city, popK: r.popK, kind: r.kind, live: r.live, expectedMin: r.expectedMin, estimatedGap: r.gap,
    suggestedSource: 'official religious-council / municipal site (search "המועצה הדתית ' + r.city + ' מקוואות"); GovMap ADDR_V1 for coords',
  }));
  const exhaustedButStillLow = lowCoverage.filter((r) => PROCESSED.has(r.city) && r.gap >= 5).map((r) => ({
    city: r.city, kind: r.kind, live: r.live, expectedMin: r.expectedMin, gap: r.gap,
    note: 'official council source already fully scraped (P16–22) — residual gap needs an ALTERNATIVE source (gov.il national feed, neighborhood/chassidic-court lists) or is genuinely lower than the population heuristic',
  }));

  // data-quality: records with an empty cityId
  const emptyCity = mik.filter((m) => !nonEmpty(m.cityId));

  const fieldCoverage = {
    phone: +(100 * (mik.length - missing.phone.length) / mik.length).toFixed(1),
    address: +(100 * (mik.length - missing.address.length) / mik.length).toFixed(1),
    gender: +(100 * (mik.length - missing.gender.length) / mik.length).toFixed(1),
    sourceUrl: +(100 * (mik.length - missing.sourceUrl.length) / mik.length).toFixed(1),
  };

  const audit = {
    generatedNote: 'PHASE 23 — read-only mikveh coverage audit. No import, no write, no rebuild.',
    totals: { totalPlaces: all.length, totalMikveh: mik.length, distinctCities: cityRanked.length },
    countByCity: cityRanked,
    topCities,
    lowCoverageCities: lowCoverage,
    duplicateRiskClusters: dupClusters,
    missingFields: {
      phone: { count: missing.phone.length, records: missing.phone.map(lite) },
      address: { count: missing.address.length, records: missing.address.map(lite) },
      gender: { count: missing.gender.length, records: missing.gender.map(lite) },
      sourceUrl: { count: missing.sourceUrl.length, records: missing.sourceUrl.map(lite) },
    },
    approximateCoordinates: { count: cityLevel.length, records: cityLevel.map((m) => ({ id: m.id, name: m.name, city: m.cityId, address: m.address })) },
    dataQuality: { emptyCityId: { count: emptyCity.length, records: emptyCity.map((m) => ({ id: m.id, name: m.name, address: m.address })) } },
    sourceBreakdown,
    recommendedNextTargets: recommended,
    exhaustedSourcesStillLow: exhaustedButStillLow,
  };

  const summary = {
    generatedNote: 'PHASE 23 — mikveh coverage audit SUMMARY (read-only).',
    totalMikveh: mik.length,
    totalPlaces: all.length,
    distinctCities: cityRanked.length,
    top10Cities: topCities.slice(0, 10),
    suspiciouslyLowTop10: lowCoverage.slice(0, 10).map((r) => ({ city: r.city, popK: r.popK, kind: r.kind, live: r.live, expectedMin: r.expectedMin, gap: r.gap })),
    duplicateRiskClusters: dupClusters.length,
    fieldCoveragePct: fieldCoverage,
    missingCounts: { phone: missing.phone.length, address: missing.address.length, gender: missing.gender.length, sourceUrl: missing.sourceUrl.length },
    approximateCoordCount: cityLevel.length,
    emptyCityIdCount: emptyCity.length,
    exhaustedSourcesStillLow: exhaustedButStillLow.map((r) => `${r.city} (${r.live} live, ~${r.gap} residual — official source maxed)`),
    genderSplit: sourceBreakdown.byGender,
    locationPrecisionSplit: sourceBreakdown.byLocationPrecision,
    sourceFieldSplit: sourceBreakdown.bySourceField,
    topSourceNames: sourceBreakdown.bySourceName.slice(0, 12),
    recommendedNext10: recommended.map((r) => `${r.rank}. ${r.city} (${r.kind}, ${r.live} live, ~${r.estimatedGap} gap)`),
    auditFile: 'mikveh-coverage-audit.json',
  };

  write(join(OUT, 'mikveh-coverage-audit.json'), audit);
  write(join(OUT, 'mikveh-coverage-audit-summary.json'), summary);

  console.log('=== Phase 23 — Mikveh Coverage Audit (read-only) ===');
  console.log(`total mikveh: ${mik.length} across ${cityRanked.length} cities`);
  console.log(`field coverage %: phone ${fieldCoverage.phone} | address ${fieldCoverage.address} | gender ${fieldCoverage.gender} | sourceUrl ${fieldCoverage.sourceUrl}`);
  console.log(`missing: phone ${missing.phone.length} | address ${missing.address.length} | gender ${missing.gender.length} | sourceUrl ${missing.sourceUrl.length}`);
  console.log(`approx (city-level) coords: ${cityLevel.length} | duplicate-risk clusters: ${dupClusters.length}`);
  console.log(`gender: ${JSON.stringify(sourceBreakdown.byGender)}`);
  console.log(`top5 cities: ${topCities.slice(0, 5).map((c) => c.city + ' ' + c.count).join(' | ')}`);
  console.log(`recommended next 10: ${recommended.map((r) => r.city).join(', ')}`);
  console.log(`outputs: output/mikveh-coverage-audit.json , output/mikveh-coverage-audit-summary.json`);
}

if (isMain(import.meta.url)) run();
