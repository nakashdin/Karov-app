/**
 * Phase 25 — Kiryat Ono (קרית אונו) ONLY (DRY-RUN, additive recon).
 *
 * Source: עיריית קריית אונו — https://www.kiryatono.muni.il/מקוואות/ (municipal,
 * server-rendered). 6 mikvehs (3 women + 1 men + 2 keilim), extracted + verified
 * live 2026-06-22. The site publishes NO coordinates → GovMap ADDR_V1 geocoding
 * (native-only not available here). Reject anything not address-level.
 *
 * Gender-aware dedup vs the live 696. NO write, NO publish, NO rebuild.
 *
 * Run:  node importers/mikvahs/phase25-kiryat-ono-import.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isInIsrael, isMain, sleep } from '../shared/utils.ts';
import type { GeoPoint } from '../unified/schema/normalized-record.ts';
import type { Place } from '../../src/types/place.ts';
import { itmToWgs84 } from '../arcgis/itm.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'output');
const GEN = join(HERE, '..', '..', 'src', 'data', 'generated');
const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const NOW = new Date().toISOString().slice(0, 10);
const BUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const CITY = 'קרית אונו';
const SLUG = 'kiryat-ono';
const SOURCE_NAME = 'עיריית קריית אונו';
const SOURCE_URL = 'https://www.kiryatono.muni.il/מקוואות/';
const BBOX = { latMin: 32.04, latMax: 32.085, lngMin: 34.83, lngMax: 34.885 };
const inBbox = (p: GeoPoint): boolean => p.latitude >= BBOX.latMin && p.latitude <= BBOX.latMax && p.longitude >= BBOX.lngMin && p.longitude <= BBOX.lngMax;
const normPhone = (s: string | null): string | undefined => { const d = String(s ?? '').replace(/\D/g, ''); if (d.length === 10 && d[0] === '0') return d; if (d.length === 9 && d[0] !== '0') return '0' + d; return d.length >= 9 ? d : undefined; };

const HRS_KELIM = 'פתוח כל השבוע, כל שעות היממה (מהשקיעה — נשים בלבד, מטעמי צניעות)';

interface Rec { name: string; address: string; geo: string; phone: string | null; hours: string | null; attendant: string | null; gender: string; }
const SRC: Rec[] = [
  { name: 'מקווה שד\' קק"ל', address: 'שד\' קק"ל 19, קרית אונו', geo: 'קק"ל 19, קרית אונו', phone: '037431091', hours: "א'-ה' 20:00–22:00; ו' 20 דק' לאחר כניסת השבת/חג למשך חצי שעה; מוצ\"ש/חג חורף 20:00–21:00, קיץ 21:00–22:00", attendant: 'שירה אשכנזי 050-6953333; מירי טרוסט 052-6226225; מוריה אליהו 050-8752835', gender: 'נשים' },
  { name: 'מקווה הגפן', address: 'הגפן 12, קרית אונו', geo: 'הגפן 12, קרית אונו', phone: '035350973', hours: "א'-ה' חורף 18:00–21:00, קיץ 19:00–22:00; ו' 20 דק' לאחר כניסת השבת למשך חצי שעה; מוצ\"ש/חג שעה לאחר צאת השבת למשך שעה", attendant: 'שרה מתתיהו 050-4100514; מרים קאסר 050-8462299', gender: 'נשים' },
  { name: 'מקווה ש"י עגנון', address: 'ש"י עגנון 1, קרית אונו', geo: 'עגנון 1, קרית אונו', phone: '035355028', hours: "א'-ה' חורף 16:00–21:30, קיץ 19:00–22:30; ו' 20 דק' לאחר כניסת השבת למשך חצי שעה; מוצ\"ש/חג שעה לאחר צאת השבת למשך שעה", attendant: 'צילה יוסף 052-8317458', gender: 'נשים' },
  { name: 'מקווה גברים', address: 'הרצל 34, קרית אונו (צמוד לבית הכנסת "אור ציון")', geo: 'הרצל 34, קרית אונו', phone: null, hours: null, attendant: 'גיל אבישר 050-7958485', gender: 'גברים' },
  { name: 'מקווה כלים שד\' קק"ל', address: 'שד\' קק"ל 19, קרית אונו', geo: 'קק"ל 19, קרית אונו', phone: null, hours: HRS_KELIM, attendant: null, gender: 'כלים' },
  { name: 'מקווה כלים הגפן', address: 'הגפן 12, קרית אונו', geo: 'הגפן 12, קרית אונו', phone: null, hours: HRS_KELIM, attendant: null, gender: 'כלים' },
];

// --- GovMap ADDR_V1 -----------------------------------------------------------
const sp = (s: string): string => s.replace(/["'׳״’”`.,()\[\]\-–\/\\]/g, ' ').replace(/\s+/g, ' ').trim();
const normCity = (s: string | undefined): string => sp(String(s ?? ''));
async function govmap(query: string): Promise<GeoPoint | null> {
  let d: any;
  try { d = await (await fetch(`https://es.govmap.gov.il/TldSearch/api/DetailsByQuery?query=${encodeURIComponent(query)}&lyrs=257&gid=govmap`, { headers: { 'User-Agent': BUA, Accept: 'application/json' } })).json(); } catch { return null; }
  const a = d?.data?.ADDRESS?.[0];
  if (!a || a.DescLayerID !== 'ADDR_V1' || a.ResultType !== 1) return null;
  if (!normCity(String(a.ResultLable ?? '')).includes(normCity(CITY))) return null;
  const w = itmToWgs84(Number(a.X), Number(a.Y));
  if (w.latitude == null || w.longitude == null) return null;
  const loc = { latitude: w.latitude, longitude: w.longitude };
  if (!isInIsrael(loc) || !inBbox(loc)) return null;
  return loc;
}

const genderOf = (name: unknown, mg: unknown): string => { const s = `${mg ?? ''} ${name ?? ''}`; if (/כלים/.test(s)) return 'כלים'; if (/גברים/.test(s)) return 'גברים'; return 'נשים'; };
const STOP = /מקוואות|מקואות|מקווה|מקוה|נשים|גברים|כלים|טהרת|טהרה|טהורים|שכונת|רובע|בית|הכנסת|הרב/g;
const nameCore = (s: string | undefined): string[] => sp(String(s ?? '').replace(STOP, ' ')).split(' ').filter((t) => t.length >= 3);
const streetTokens = (addr: string | undefined): { name: string; num: string | null } => { const head = String(addr ?? '').split(',')[0].replace(/^(רחוב|רח'|שד'|דרך)\s+/, '').replace(/\(.*?\)/g, ' '); const num = head.match(/\b(\d{1,3})\b/)?.[1] ?? null; const name = sp(head.replace(/\d+/g, '')); return { name, num }; };
const meters = (a: GeoPoint, b: GeoPoint): number => { const R = (d: number) => (d * Math.PI) / 180; const dLat = R(b.latitude - a.latitude), dLng = R(b.longitude - a.longitude); const hh = Math.sin(dLat / 2) ** 2 + Math.cos(R(a.latitude)) * Math.cos(R(b.latitude)) * Math.sin(dLng / 2) ** 2; return 2 * 6371000 * Math.asin(Math.sqrt(hh)); };

async function run(): Promise<void> {
  const live = readJson<any[]>(join(GEN, 'places.osm.json')).filter((p: any) => p.type === 'mikveh');
  const liveCoord = live.filter((l) => l.location);
  const existingIds = new Set(live.map((p) => p.id));
  const liveCity = live.filter((l) => l.cityId === CITY);

  // resolve coords (GovMap ADDR_V1)
  const located = new Map<string, GeoPoint | null>();
  for (const rec of SRC) {
    if (!located.has(rec.geo)) { located.set(rec.geo, await govmap(rec.geo)); await sleep(320); }
  }

  const analysis: any[] = [];
  const writeReadyKept: Array<Rec & { loc: GeoPoint }> = [];
  for (const rec of SRC) {
    const loc = located.get(rec.geo) ?? null;
    const g = genderOf(rec.name, rec.gender);
    let disposition: string, reason: string, matchedLiveId: string | null = null;
    if (!loc) {
      disposition = 'excluded'; reason = 'GovMap could not resolve to ADDR_V1 (street exists but house-number not in address layer; native-only/address-level policy → no street-centroid, no fabrication)';
    } else {
      const nearLive = liveCoord.find((l) => genderOf(l.name, l.mikvehGender) === g && meters(loc, l.location) <= 150);
      const recCore = nameCore(rec.name), recSt = streetTokens(rec.address);
      const nameLive = liveCity.find((l) => genderOf(l.name, l.mikvehGender) === g && (nameCore(l.name).some((t) => recCore.includes(t)) || (() => { const s = streetTokens(l.address); return !!recSt.name && !!s.name && (recSt.name.includes(s.name) || s.name.includes(recSt.name)) && (recSt.num == null || s.num == null || recSt.num === s.num); })()));
      const twin = writeReadyKept.find((k) => genderOf(k.name, k.gender) === g && meters(k.loc, loc) <= 40);
      if (nearLive) { disposition = 'duplicate'; reason = `geo-duplicate of live ${nearLive.id} (same gender)`; matchedLiveId = nearLive.id; }
      else if (nameLive) { disposition = 'duplicate'; reason = `name/street duplicate of live ${nameLive.id}`; matchedLiveId = nameLive.id; }
      else if (twin) { disposition = 'duplicate'; reason = `within-batch same building+gender as "${twin.name}"`; }
      else { disposition = 'write_ready'; reason = 'GovMap ADDR_V1 coordinate, not a duplicate'; writeReadyKept.push({ ...rec, loc }); }
    }
    analysis.push({ name: rec.name, address: rec.address, geo: rec.geo, phone: rec.phone, attendant: rec.attendant, gender: rec.gender, coordSource: loc ? 'govmap-ADDR_V1' : 'govmap-no-match', location: loc, disposition, reason, matchedLiveId });
  }

  const writeReady: Place[] = writeReadyKept.map((rec) => {
    const gtag = genderOf(rec.name, rec.gender) === 'גברים' ? 'm' : genderOf(rec.name, rec.gender) === 'כלים' ? 'k' : 'w';
    const place: Place = { id: `mikveh-${SLUG}-${gtag}-${rec.loc.latitude.toFixed(5)}_${rec.loc.longitude.toFixed(5)}`, name: rec.name, type: 'mikveh', cityId: CITY, address: rec.address, location: rec.loc, source: 'seed', locationPrecision: 'address' };
    if (normPhone(rec.phone)) place.phone = normPhone(rec.phone);
    if (rec.hours) place.openingHours = rec.hours;
    place.mikvehGender = rec.gender;
    if (rec.attendant) place.attendant = rec.attendant;
    place.sourceName = SOURCE_NAME;
    place.sourceUrl = SOURCE_URL;
    place.extra = { license: 'council-public', coordSource: 'govmap-ADDR_V1', provenance: { sourceId: `council:${SLUG}:mikvah`, sourceUrl: SOURCE_URL, fetchedAt: NOW } };
    return place;
  });
  const collisions = writeReady.filter((p) => existingIds.has(p.id)).map((p) => p.id);
  const dupAppIds = writeReady.map((p) => p.id).filter((id, i, a) => a.indexOf(id) !== i);

  const summary = {
    generatedNote: 'PHASE 25 DRY-RUN — Kiryat Ono only (kiryatono.muni.il). GovMap ADDR_V1 (no native coords on source). Gender-aware dedup vs live. No write, no publish, no rebuild.',
    source: { name: SOURCE_NAME, url: SOURCE_URL, type: 'municipal (server-rendered)', parsed: SRC.length },
    totalParsed: SRC.length,
    liveCityBefore: liveCity.length,
    duplicates: analysis.filter((a) => a.disposition === 'duplicate').length,
    excluded: analysis.filter((a) => a.disposition === 'excluded').length,
    writeReady: writeReady.length,
    writeReadyByGender: writeReadyKept.reduce<Record<string, number>>((a, r) => { const g = genderOf(r.name, r.gender); a[g] = (a[g] ?? 0) + 1; return a; }, {}),
    idCollisions: collisions.length, duplicateAppIds: dupAppIds.length,
    finalRecommendedWriteCount: collisions.length || dupAppIds.length ? 0 : writeReady.length,
    liveMikvehBefore: live.length, estimatedTotalAfterWrite: live.length + (collisions.length || dupAppIds.length ? 0 : writeReady.length),
    notes: ['Kiryat Ono had 0 live mikvehs (cityId="קרית אונו"). Source has no coordinates → GovMap ADDR_V1.', 'ש"י עגנון 1: street exists in GovMap but house-number 1 not in the ADDR_V1 layer → excluded (no street-centroid/fabrication). Candidate for manual coordinate.'],
    rollbackPlan: ['Backup places.osm.json (+cities) before any write', 'Additive append only; do NOT run rebuildAppDataset'],
    dryRun: true, liveDataTouched: false, publishPerformed: false, rebuildTouched: false,
  };

  writeFileSync(join(OUT, 'phase25-kiryat-ono-preview.json'), JSON.stringify(SRC, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase25-kiryat-ono-merge-analysis.json'), JSON.stringify(analysis, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase25-kiryat-ono-write-ready-preview.json'), JSON.stringify(writeReady, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase25-kiryat-ono-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('=== Phase 25 — Kiryat Ono (dry-run, GovMap ADDR_V1) ===');
  console.log(`parsed ${SRC.length} | live before ${liveCity.length} | duplicates ${summary.duplicates} | excluded ${summary.excluded}`);
  console.log(`write-ready ${writeReady.length} ${JSON.stringify(summary.writeReadyByGender)} | id collisions ${collisions.length}`);
  console.log(`live ${live.length} → est after write ${summary.estimatedTotalAfterWrite}`);
}

if (isMain(import.meta.url)) void run();
