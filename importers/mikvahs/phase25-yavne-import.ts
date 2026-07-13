/**
 * Phase 25 — Yavne (יבנה) ONLY (DRY-RUN, additive recon).
 *
 * Source: המועצה הדתית יבנה — https://mdyv.org.il/mikve (Vue SSR, single page).
 * 6 records (5 women + 1 men), each with a NATIVE Waze coordinate embedded in
 * the card's navigate link (param `lng=LAT%2CLNG`). Extracted + verified live
 * 2026-06-22. NATIVE COORDINATES ONLY — no GovMap, no geocoding; a record
 * without a bbox-valid native coord is excluded.
 *
 * Gender-aware dedup vs the live 696 (men/keilim distinct from women, matching
 * the live convention). NO write, NO publish, NO rebuild.
 *
 * Run:  node importers/mikvahs/phase25-yavne-import.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isInIsrael, isMain } from '../shared/utils.ts';
import type { GeoPoint } from '../unified/schema/normalized-record.ts';
import type { Place } from '../../src/types/place.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'output');
const GEN = join(HERE, '..', '..', 'src', 'data', 'generated');
const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const NOW = new Date().toISOString().slice(0, 10);

const CITY = 'יבנה';
const SLUG = 'yavne';
const SOURCE_NAME = 'המועצה הדתית יבנה';
const BBOX = { latMin: 31.85, latMax: 31.90, lngMin: 34.71, lngMax: 34.78 };
const inBbox = (p: GeoPoint): boolean => p.latitude >= BBOX.latMin && p.latitude <= BBOX.latMax && p.longitude >= BBOX.lngMin && p.longitude <= BBOX.lngMax;
const normPhone = (s: string | null): string | undefined => { const d = String(s ?? '').replace(/\D/g, ''); if (d.length === 10 && d[0] === '0') return d; if (d.length === 9 && d[0] !== '0') return '0' + d; return d.length >= 9 ? d : undefined; };

const HRS_W = "ימי חול א'-ה' 19:51–23:00 (שעון קיץ); ערב שבת/חג: מזמן הדלקת נרות עד שעה לאחר מכן; מוצ\"ש/חג: חצי שעה לאחר צאת השבת/חג עד שלוש שעות";
const HRS_M = "ימים א'-ה' 04:00–11:00 ו-16:00–19:45; שישי/ערב חג: מ-04:00 עד שעה לפני כניסת שבת";

interface Rec { name: string; address: string; phone: string | null; hours: string; gender: string; lat: number; lng: number; }
const SRC: Rec[] = [
  { name: 'מקווה שבזי - באר מרים', address: 'שבזי 40, יבנה', phone: '089160961', hours: HRS_W, gender: 'נשים', lat: 31.871204376220692, lng: 34.74469375610352 },
  { name: 'מקווה תורמוס', address: 'תורמוס 5, יבנה', phone: '089154699', hours: HRS_W, gender: 'נשים', lat: 31.87101137422908, lng: 34.738790988922126 },
  { name: 'מקווה הדקל', address: 'משעול הרב אברהם אשטמקר, יבנה', phone: '089431759', hours: HRS_W, gender: 'נשים', lat: 31.875740041145846, lng: 34.737846851348884 },
  { name: 'מקווה הצדף', address: 'הצדף 7, יבנה', phone: '086532996', hours: HRS_W + '; שעון חורף עד 22:00', gender: 'נשים', lat: 31.86757633300706, lng: 34.73753571510316 },
  { name: 'מקווה נאות שמיר', address: 'שי עגנון 17, יבנה', phone: '089345268', hours: HRS_W, gender: 'נשים', lat: 31.86618681340471, lng: 34.72456049919129 },
  { name: 'מקווה טהרה לגברים ע"ש הרב אהרון אבוקרט זצ"ל', address: 'חבלבל, יבנה', phone: '0527675546', hours: HRS_M, gender: 'גברים', lat: 31.8725694011164, lng: 34.747588634490974 },
];

const sp = (s: string): string => s.replace(/["'׳״’”`.,()\[\]\-–\/\\]/g, ' ').replace(/\s+/g, ' ').trim();
const genderOf = (name: unknown, mg: unknown): string => { const s = `${mg ?? ''} ${name ?? ''}`; if (/כלים/.test(s)) return 'כלים'; if (/גברים/.test(s)) return 'גברים'; return 'נשים'; };
const STOP = /מקוואות|מקואות|מקווה|מקוה|נשים|גברים|כלים|טהרת|טהרה|טהורים|שכונת|רובע|בית|הכנסת|הרב/g;
const nameCore = (s: string | undefined): string[] => sp(String(s ?? '').replace(STOP, ' ')).split(' ').filter((t) => t.length >= 3);
const streetTokens = (addr: string | undefined): { name: string; num: string | null } => { const head = String(addr ?? '').split(',')[0].replace(/^(רחוב|רח'|משעול)\s+/, ''); const num = head.match(/\b(\d{1,3})\b/)?.[1] ?? null; const name = sp(head.replace(/\d+/g, '')); return { name, num }; };
const meters = (a: GeoPoint, b: GeoPoint): number => { const R = (d: number) => (d * Math.PI) / 180; const dLat = R(b.latitude - a.latitude), dLng = R(b.longitude - a.longitude); const hh = Math.sin(dLat / 2) ** 2 + Math.cos(R(a.latitude)) * Math.cos(R(b.latitude)) * Math.sin(dLng / 2) ** 2; return 2 * 6371000 * Math.asin(Math.sqrt(hh)); };

function run(): void {
  const live = readJson<any[]>(join(GEN, 'places.osm.json')).filter((p: any) => p.type === 'mikveh');
  const liveCoord = live.filter((l) => l.location);
  const existingIds = new Set(live.map((p) => p.id));
  // exact-city live set (avoids substring conflation with גן יבנה / נהריה street "יבנה")
  const liveYavne = live.filter((l) => l.cityId === CITY);

  const analysis: any[] = [];
  const writeReadyKept: Rec[] = [];
  for (const rec of SRC) {
    const loc = { latitude: rec.lat, longitude: rec.lng };
    const g = genderOf(rec.name, rec.gender);
    let disposition: string, reason: string, matchedLiveId: string | null = null;
    if (!isInIsrael(loc) || !inBbox(loc)) {
      disposition = 'excluded'; reason = 'native coordinate failed Yavne bbox / Israel check (native-only policy → no geocoding fallback)';
    } else {
      // dedup vs live: gender-aware geo ≤150m (cityId-agnostic, catches mislabeled) OR exact-Yavne name/street.
      const nearLive = liveCoord.find((l) => genderOf(l.name, l.mikvehGender) === g && meters(loc, l.location) <= 150);
      const recCore = nameCore(rec.name), recSt = streetTokens(rec.address);
      const nameLive = liveYavne.find((l) => genderOf(l.name, l.mikvehGender) === g && (nameCore(l.name).some((t) => recCore.includes(t)) || (() => { const s = streetTokens(l.address); return !!recSt.name && !!s.name && (recSt.name.includes(s.name) || s.name.includes(recSt.name)) && (recSt.num == null || s.num == null || recSt.num === s.num); })()));
      const twin = writeReadyKept.find((k) => genderOf(k.name, k.gender) === g && meters({ latitude: k.lat, longitude: k.lng }, loc) <= 40);
      if (nearLive) { disposition = 'duplicate'; reason = `geo-duplicate of live ${nearLive.id} (${Math.round(meters(loc, nearLive.location))}m, same gender)`; matchedLiveId = nearLive.id; }
      else if (nameLive) { disposition = 'duplicate'; reason = `name/street duplicate of live ${nameLive.id} (${nameLive.name})`; matchedLiveId = nameLive.id; }
      else if (twin) { disposition = 'duplicate'; reason = `within-batch same building+gender as "${twin.name}"`; }
      else { disposition = 'write_ready'; reason = 'native Waze coordinate, not a duplicate'; writeReadyKept.push(rec); }
    }
    analysis.push({ name: rec.name, address: rec.address, phone: rec.phone, gender: rec.gender, coordSource: 'record-native(waze)', location: loc, disposition, reason, matchedLiveId });
  }

  const writeReady: Place[] = writeReadyKept.map((rec) => {
    const loc = { latitude: rec.lat, longitude: rec.lng };
    const gtag = genderOf(rec.name, rec.gender) === 'גברים' ? 'm' : genderOf(rec.name, rec.gender) === 'כלים' ? 'k' : 'w';
    const place: Place = { id: `mikveh-${SLUG}-${gtag}-${loc.latitude.toFixed(5)}_${loc.longitude.toFixed(5)}`, name: rec.name, type: 'mikveh', cityId: CITY, address: rec.address, location: loc, source: 'seed' };
    if (normPhone(rec.phone)) place.phone = normPhone(rec.phone);
    if (rec.hours) place.openingHours = rec.hours;
    place.mikvehGender = rec.gender;
    place.sourceName = SOURCE_NAME;
    place.sourceUrl = 'https://mdyv.org.il/mikve';
    place.extra = { license: 'council-public', coordSource: 'record-native(waze)', provenance: { sourceId: `council:${SLUG}:mikvah`, sourceUrl: 'https://mdyv.org.il/mikve', fetchedAt: NOW } };
    return place;
  });
  const collisions = writeReady.filter((p) => existingIds.has(p.id)).map((p) => p.id);
  const dupAppIds = writeReady.map((p) => p.id).filter((id, i, a) => a.indexOf(id) !== i);

  const summary = {
    generatedNote: 'PHASE 25 DRY-RUN — Yavne only (mdyv.org.il). NATIVE Waze coordinates only (no GovMap, no geocoding). Gender-aware dedup vs live. No write, no publish, no rebuild.',
    source: { name: SOURCE_NAME, url: 'https://mdyv.org.il/mikve', type: 'Vue SSR single page', parsed: SRC.length },
    totalParsed: SRC.length,
    liveYavneBefore: liveYavne.length,
    duplicates: analysis.filter((a) => a.disposition === 'duplicate').length,
    excluded: analysis.filter((a) => a.disposition === 'excluded').length,
    writeReady: writeReady.length,
    writeReadyByGender: writeReadyKept.reduce<Record<string, number>>((a, r) => { const g = genderOf(r.name, r.gender); a[g] = (a[g] ?? 0) + 1; return a; }, {}),
    idCollisions: collisions.length, duplicateAppIds: dupAppIds.length,
    finalRecommendedWriteCount: collisions.length || dupAppIds.length ? 0 : writeReady.length,
    liveMikvehBefore: live.length, estimatedTotalAfterWrite: live.length + (collisions.length || dupAppIds.length ? 0 : writeReady.length),
    note: 'Yavne had 0 live mikvehs under exact cityId="יבנה" (prior audit counts were inflated by substring matches to גן יבנה / נהריה). All 6 council records carry native Waze coords → high confidence, no geocoding needed.',
    rollbackPlan: ['Backup places.osm.json (+cities) before any write', 'Additive append only; do NOT run rebuildAppDataset'],
    dryRun: true, liveDataTouched: false, publishPerformed: false, rebuildTouched: false,
  };

  writeFileSync(join(OUT, 'phase25-yavne-preview.json'), JSON.stringify(SRC, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase25-yavne-merge-analysis.json'), JSON.stringify(analysis, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase25-yavne-write-ready-preview.json'), JSON.stringify(writeReady, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase25-yavne-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('=== Phase 25 — Yavne (dry-run, native coords only) ===');
  console.log(`parsed ${SRC.length} | live Yavne before ${liveYavne.length} | duplicates ${summary.duplicates} | excluded ${summary.excluded}`);
  console.log(`write-ready ${writeReady.length} ${JSON.stringify(summary.writeReadyByGender)} | id collisions ${collisions.length}`);
  console.log(`live ${live.length} → est after write ${summary.estimatedTotalAfterWrite}`);
}

if (isMain(import.meta.url)) run();
