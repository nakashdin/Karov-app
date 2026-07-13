/**
 * Phase 25 — Akko (עכו) ONLY (DRY-RUN, additive recon).
 *
 * Source: המועצה הדתית והרבנות עכו — https://www.mdakko.org (Wix; index
 * /mikooaot2, per-mikvah subpages /mikooaot3..7). 5 mikvehs (4 women + 1 men),
 * extracted + verified live 2026-06-22. NATIVE Waze coordinates (param
 * `to=ll.LAT,LNG`) per subpage.
 *
 * COORD NOTE: the men's page (/mikooaot7, "מקווה גברים") reuses the COUNCIL
 * OFFICE Waze coord (32.92732,35.07714 = יהושפט 29, identical to the dept index
 * pages) as a fallback — NOT the mikveh. Its real address is דרך הארבעה 57,
 * i.e. the SAME building as מקווה וולפסון (/mikooaot5). So the men's record is
 * assigned וולפסון's native building coord (same source, same address), flagged
 * below. All other 4 use their own distinct native coords.
 *
 * NATIVE coords only (no GovMap). Gender-aware dedup vs the live 696. NO write,
 * NO publish, NO rebuild.
 *
 * Run:  node importers/mikvahs/phase25-akko-import.ts
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

const CITY = 'עכו';
const SLUG = 'akko';
const SOURCE_NAME = 'המועצה הדתית והרבנות עכו';
const BBOX = { latMin: 32.90, latMax: 32.96, lngMin: 35.05, lngMax: 35.11 };
const inBbox = (p: GeoPoint): boolean => p.latitude >= BBOX.latMin && p.latitude <= BBOX.latMax && p.longitude >= BBOX.lngMin && p.longitude <= BBOX.lngMax;
const normPhone = (s: string | null): string | undefined => { const d = String(s ?? '').replace(/\D/g, ''); if (d.length === 10 && d[0] === '0') return d; if (d.length === 9 && d[0] !== '0') return '0' + d; return d.length >= 9 ? d : undefined; };

const HRS = 'שעון קיץ: א\'-ה\' משקיעת החמה עד 22:00; שעון חורף: א\'-ה\' משקיעת החמה עד 20:00-21:00; ערב שבת/חג מכניסת השבת; מוצ"ש בתיאום';

interface Rec { name: string; address: string; phone: string | null; hours: string | null; attendant: string | null; gender: string; lat: number; lng: number; coordNote?: string; url: string; }
const SRC: Rec[] = [
  { name: 'מקווה שדליץ', address: 'הרב לופס 3, עכו', phone: '049911067', hours: HRS, attendant: 'סימי בונן 058-3214961', gender: 'נשים', lat: 32.92656080, lng: 35.08862840, url: 'https://www.mdakko.org/mikooaot3' },
  { name: 'מקווה כרם', address: 'כרם 2, עכו', phone: '049917554', hours: HRS, attendant: 'רמונד כהן 054-9134540', gender: 'נשים', lat: 32.94007170, lng: 35.07625290, url: 'https://www.mdakko.org/mikooaot4' },
  { name: 'מקווה וולפסון', address: 'דרך הארבעה 57, עכו', phone: '049913493', hours: HRS, attendant: 'מרים אבו 050-5757324', gender: 'נשים', lat: 32.93076450, lng: 35.08086480, url: 'https://www.mdakko.org/mikooaot5' },
  { name: 'מקווה גבעת התמרים', address: 'עליית הנוער 1, עכו', phone: '046577898', hours: HRS, attendant: 'פנינה כהן 054-8596230', gender: 'נשים', lat: 32.91778230, lng: 35.09040990, url: 'https://www.mdakko.org/mikooaot6' },
  // men's: page coord was the council office (32.92732,35.07714) → use co-located וולפסון building coord (same address דרך הארבעה 57).
  { name: 'מקווה גברים', address: 'דרך הארבעה 57, עכו', phone: null, hours: null, attendant: null, gender: 'גברים', lat: 32.93076450, lng: 35.08086480, coordNote: 'men\'s page Waze pointed to council office (יהושפט 29); reassigned to its real address דרך הארבעה 57 = וולפסון building native coord', url: 'https://www.mdakko.org/mikooaot7' },
];

const sp = (s: string): string => s.replace(/["'׳״’”`.,()\[\]\-–\/\\]/g, ' ').replace(/\s+/g, ' ').trim();
const genderOf = (name: unknown, mg: unknown): string => { const s = `${mg ?? ''} ${name ?? ''}`; if (/כלים/.test(s)) return 'כלים'; if (/גברים/.test(s)) return 'גברים'; return 'נשים'; };
const STOP = /מקוואות|מקואות|מקווה|מקוה|נשים|גברים|כלים|טהרת|טהרה|טהורים|שכונת|רובע|בית|הכנסת|הרב/g;
const nameCore = (s: string | undefined): string[] => sp(String(s ?? '').replace(STOP, ' ')).split(' ').filter((t) => t.length >= 3);
const streetTokens = (addr: string | undefined): { name: string; num: string | null } => { const head = String(addr ?? '').split(',')[0].replace(/^(רחוב|רח'|דרך)\s+/, ''); const num = head.match(/\b(\d{1,3})\b/)?.[1] ?? null; const name = sp(head.replace(/\d+/g, '')); return { name, num }; };
const meters = (a: GeoPoint, b: GeoPoint): number => { const R = (d: number) => (d * Math.PI) / 180; const dLat = R(b.latitude - a.latitude), dLng = R(b.longitude - a.longitude); const hh = Math.sin(dLat / 2) ** 2 + Math.cos(R(a.latitude)) * Math.cos(R(b.latitude)) * Math.sin(dLng / 2) ** 2; return 2 * 6371000 * Math.asin(Math.sqrt(hh)); };

function run(): void {
  const live = readJson<any[]>(join(GEN, 'places.osm.json')).filter((p: any) => p.type === 'mikveh');
  const liveCoord = live.filter((l) => l.location);
  const existingIds = new Set(live.map((p) => p.id));
  const liveAkko = live.filter((l) => l.cityId === CITY);

  const analysis: any[] = [];
  const writeReadyKept: Rec[] = [];
  for (const rec of SRC) {
    const loc = { latitude: rec.lat, longitude: rec.lng };
    const g = genderOf(rec.name, rec.gender);
    let disposition: string, reason: string, matchedLiveId: string | null = null;
    if (!isInIsrael(loc) || !inBbox(loc)) {
      disposition = 'excluded'; reason = 'native coordinate failed Akko bbox / Israel check (native-only policy → no geocoding fallback)';
    } else {
      const nearLive = liveCoord.find((l) => genderOf(l.name, l.mikvehGender) === g && meters(loc, l.location) <= 150);
      const recCore = nameCore(rec.name), recSt = streetTokens(rec.address);
      const nameLive = liveAkko.find((l) => genderOf(l.name, l.mikvehGender) === g && (nameCore(l.name).some((t) => recCore.includes(t)) || (() => { const s = streetTokens(l.address); return !!recSt.name && !!s.name && (recSt.name.includes(s.name) || s.name.includes(recSt.name)) && (recSt.num == null || s.num == null || recSt.num === s.num); })()));
      const twin = writeReadyKept.find((k) => genderOf(k.name, k.gender) === g && meters({ latitude: k.lat, longitude: k.lng }, loc) <= 40);
      if (nearLive) { disposition = 'duplicate'; reason = `geo-duplicate of live ${nearLive.id} (${Math.round(meters(loc, nearLive.location))}m, same gender)`; matchedLiveId = nearLive.id; }
      else if (nameLive) { disposition = 'duplicate'; reason = `name/street duplicate of live ${nameLive.id} (${nameLive.name})`; matchedLiveId = nameLive.id; }
      else if (twin) { disposition = 'duplicate'; reason = `within-batch same building+gender as "${twin.name}"`; }
      else { disposition = 'write_ready'; reason = `native Waze coordinate, not a duplicate${rec.coordNote ? ' (' + rec.coordNote + ')' : ''}`; writeReadyKept.push(rec); }
    }
    analysis.push({ name: rec.name, address: rec.address, phone: rec.phone, attendant: rec.attendant, gender: rec.gender, coordSource: rec.coordNote ? 'record-native(waze, co-located building)' : 'record-native(waze)', location: loc, disposition, reason, matchedLiveId });
  }

  const writeReady: Place[] = writeReadyKept.map((rec) => {
    const loc = { latitude: rec.lat, longitude: rec.lng };
    const gtag = genderOf(rec.name, rec.gender) === 'גברים' ? 'm' : genderOf(rec.name, rec.gender) === 'כלים' ? 'k' : 'w';
    const place: Place = { id: `mikveh-${SLUG}-${gtag}-${loc.latitude.toFixed(5)}_${loc.longitude.toFixed(5)}`, name: rec.name, type: 'mikveh', cityId: CITY, address: rec.address, location: loc, source: 'seed' };
    if (normPhone(rec.phone)) place.phone = normPhone(rec.phone);
    if (rec.hours) place.openingHours = rec.hours;
    place.mikvehGender = rec.gender;
    if (rec.attendant) place.attendant = rec.attendant;
    place.sourceName = SOURCE_NAME;
    place.sourceUrl = rec.url;
    place.extra = { license: 'council-public', coordSource: rec.coordNote ? 'record-native(waze, co-located building)' : 'record-native(waze)', provenance: { sourceId: `council:${SLUG}:mikvah`, sourceUrl: rec.url, fetchedAt: NOW } };
    if (rec.coordNote) (place.extra as any).coordNote = rec.coordNote;
    return place;
  });
  const collisions = writeReady.filter((p) => existingIds.has(p.id)).map((p) => p.id);
  const dupAppIds = writeReady.map((p) => p.id).filter((id, i, a) => a.indexOf(id) !== i);

  const summary = {
    generatedNote: 'PHASE 25 DRY-RUN — Akko only (mdakko.org). NATIVE Waze coordinates only (no GovMap). Gender-aware dedup vs live. No write, no publish, no rebuild.',
    source: { name: SOURCE_NAME, url: 'https://www.mdakko.org/mikooaot2', type: 'Wix (index + per-mikvah subpages /mikooaot3..7)', parsed: SRC.length },
    totalParsed: SRC.length,
    liveAkkoBefore: liveAkko.length,
    duplicates: analysis.filter((a) => a.disposition === 'duplicate').length,
    excluded: analysis.filter((a) => a.disposition === 'excluded').length,
    writeReady: writeReady.length,
    writeReadyByGender: writeReadyKept.reduce<Record<string, number>>((a, r) => { const g = genderOf(r.name, r.gender); a[g] = (a[g] ?? 0) + 1; return a; }, {}),
    idCollisions: collisions.length, duplicateAppIds: dupAppIds.length,
    finalRecommendedWriteCount: collisions.length || dupAppIds.length ? 0 : writeReady.length,
    liveMikvehBefore: live.length, estimatedTotalAfterWrite: live.length + (collisions.length || dupAppIds.length ? 0 : writeReady.length),
    notes: [
      'Akko had 0 live mikvehs under exact cityId="עכו" (prior audit count of 1 was a substring false-match: "דרך עכו 55" is a Kiryat Motzkin record).',
      'מקווה גברים (/mikooaot7): its own Waze link is the COUNCIL OFFICE fallback (יהושפט 29); reassigned to its real address דרך הארבעה 57 = וולפסון building native coord. Flagged in extra.coordNote.',
    ],
    rollbackPlan: ['Backup places.osm.json (+cities) before any write', 'Additive append only; do NOT run rebuildAppDataset'],
    dryRun: true, liveDataTouched: false, publishPerformed: false, rebuildTouched: false,
  };

  writeFileSync(join(OUT, 'phase25-akko-preview.json'), JSON.stringify(SRC, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase25-akko-merge-analysis.json'), JSON.stringify(analysis, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase25-akko-write-ready-preview.json'), JSON.stringify(writeReady, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase25-akko-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('=== Phase 25 — Akko (dry-run, native coords only) ===');
  console.log(`parsed ${SRC.length} | live Akko before ${liveAkko.length} | duplicates ${summary.duplicates} | excluded ${summary.excluded}`);
  console.log(`write-ready ${writeReady.length} ${JSON.stringify(summary.writeReadyByGender)} | id collisions ${collisions.length}`);
  console.log(`live ${live.length} → est after write ${summary.estimatedTotalAfterWrite}`);
}

if (isMain(import.meta.url)) run();
