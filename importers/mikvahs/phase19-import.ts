/**
 * Phase 19 — Beit Shemesh + Kiryat Gat official mikveh sources (DRY-RUN).
 *
 * Both are CSR/JS sites handled with a browser UA:
 *   - Kiryat Gat (mdkg.org.il): per-mikvah pages /mikve/{id} embed the record as
 *     (App-Router-escaped) JSON incl. Lat_Long. We enumerate ids, extract
 *     Name/Address/Phone/gender/coords. Embedded coords are VALIDATED against the
 *     Kiryat-Gat bbox; if wrong/missing we GovMap-geocode the street address.
 *   - Beit Shemesh (rabanutbs.co.il/רשימת-מקוואות/): א.ש בינה card list (no table)
 *     → parse name headings + addresses + phones, then GovMap-geocode the streets.
 *
 * COORDS POLICY: a record is write-ready only with an ADDRESS-LEVEL coordinate —
 * either a record coord validated inside the city bbox, or a GovMap ADDR_V1
 * geocode (exact, right city). NO settlement-level, NO Nominatim. Compared vs the
 * live 615. NO DB write, NO publish, NO rebuild.
 *
 * Run:  node importers/mikvahs/phase19-import.ts
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
const HDR = { 'User-Agent': BUA, 'Accept-Language': 'he-IL,he;q=0.9', Referer: 'https://www.google.com/' };
const strip = (s: string): string => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/\s+/g, ' ').trim();
const normPhone = (s: string | null | undefined): string | undefined => { const d = String(s ?? '').replace(/\D/g, ''); if (d.length === 10 && d[0] === '0') return d; if (d.length === 9 && d[0] !== '0') return '0' + d; return d.length >= 9 ? d : undefined; };
const inBbox = (p: GeoPoint, b: { latMin: number; latMax: number; lngMin: number; lngMax: number }): boolean => p.latitude >= b.latMin && p.latitude <= b.latMax && p.longitude >= b.lngMin && p.longitude <= b.lngMax;

const KG_BBOX = { latMin: 31.55, latMax: 31.68, lngMin: 34.72, lngMax: 34.83 };
const BS_BBOX = { latMin: 31.70, latMax: 31.79, lngMin: 34.95, lngMax: 35.05 };

interface Rec { source: string; city: string; name: string; address: string | null; phone: string | null; attendant: string | null; gender: string | null; location: GeoPoint | null; coordSource: string; }

// --- GovMap (reliable address geocode) --------------------------------------
const sp = (s: string): string => s.replace(/["'׳״’”`.,()\[\]\-–]/g, ' ').replace(/\s+/g, ' ').trim();
const normCity = (s: string | undefined): string => sp(String(s ?? ''));
async function govmap(query: string, city: string, bbox: typeof KG_BBOX): Promise<{ loc: GeoPoint; label: string } | null> {
  let d: any;
  try { d = await (await fetch(`https://es.govmap.gov.il/TldSearch/api/DetailsByQuery?query=${encodeURIComponent(query)}&lyrs=257&gid=govmap`, { headers: { 'User-Agent': BUA, Accept: 'application/json' } })).json(); } catch { return null; }
  const a = d?.data?.ADDRESS?.[0];
  if (!a || a.DescLayerID !== 'ADDR_V1' || a.ResultType !== 1) return null;
  if (!normCity(String(a.ResultLable ?? '')).includes(normCity(city))) return null;
  const w = itmToWgs84(Number(a.X), Number(a.Y));
  if (w.latitude == null || w.longitude == null) return null;
  const loc = { latitude: w.latitude, longitude: w.longitude };
  if (!isInIsrael(loc) || !inBbox(loc, bbox)) return null;
  return { loc, label: String(a.ResultLable) };
}

// --- Kiryat Gat -------------------------------------------------------------
async function fetchKiryatGat(): Promise<Rec[]> {
  const out: Rec[] = [];
  for (let id = 1; id <= 140; id++) {
    let h: string;
    try { const r = await fetch(`https://mdkg.org.il/mikve/${id}`, { headers: HDR }); if (r.status !== 200) continue; h = await r.text(); } catch { continue; }
    const name = h.match(/Name[\\":\s]+?(מקווה[^\\"<]{1,40})/); if (!name) continue;
    const addr = h.match(/Address[\\":\s]+?([^\\"<]{3,70}?ישראל)/);
    const pair = h.match(/Lat_Long[\\":{\s]+?lat[\\":\s]+?([0-9.]+)[\\",\s]+?long[\\":\s]+?([0-9.]+)/);
    const phone = h.match(/Phone[\\":\s]+?(0[0-9]{8,9})/);
    const gen = h.match(/Hope[\\":\s]+?(נשים|גברים|כלים)/);
    const address = addr ? strip(addr[1]).replace(/,?\s*ישראל$/, '').trim() : null;
    let location: GeoPoint | null = null; let coordSource = 'none';
    if (pair) { const p = { latitude: Number(pair[1]), longitude: Number(pair[2]) }; if (inBbox(p, KG_BBOX)) { location = p; coordSource = 'record-embedded'; } }
    out.push({ source: 'council:kiryat-gat:mikvah', city: 'קרית גת', name: strip(name[1]), address, phone: normPhone(phone?.[1]) ?? null, attendant: null, gender: gen?.[1] ?? null, location, coordSource });
    await sleep(120);
  }
  return out;
}

// --- Beit Shemesh -----------------------------------------------------------
async function fetchBeitShemesh(): Promise<Rec[]> {
  let h: string;
  try { const r = await fetch('https://www.rabanutbs.co.il/רשימת-מקוואות/', { headers: HDR }); if (r.status !== 200) return []; h = await r.text(); } catch { return []; }
  // each mikvah is a <div class="card"> with <strong>מקווה …</strong>, a
  // "כתובת: <street> בית שמש" line, and a "טל: <phone>" line.
  const out: Rec[] = [];
  for (const card of h.split(/<div class="card"/i).slice(1)) {
    const block = card.split(/<div class="card"/i)[0];
    const nameM = block.match(/<strong>\s*(מקווה[^<]*?)\s*<\/strong>/i); if (!nameM) continue;
    const text = strip(block);
    const addrM = text.match(/כתובת:\s*([^|<]+?)\s*בית\s*שמש/);
    // street + house number for GovMap (drop apartment letters/extra)
    const addrRaw = addrM ? addrM[1].trim() : null;
    const street = addrRaw?.match(/([א-ת'"][א-ת'"\s]{1,30}?\s\d+)/)?.[1]?.trim() ?? addrRaw;
    const phoneM = text.match(/טל:?\s*(0\d-?\d{7})/) ?? text.match(/(0\d-?\d{7})/);
    out.push({ source: 'council:beit-shemesh:mikvah', city: 'בית שמש', name: strip(nameM[1]), address: street, phone: normPhone(phoneM?.[1]) ?? null, attendant: null, gender: 'נשים', location: null, coordSource: 'none' });
  }
  return out;
}

// --- matching vs live 615 ---------------------------------------------------
const normName = (s: string | undefined): string => sp(String(s ?? '').replace(/מקוואות|מקואות|מקווה|מקוה|נשים|גברים|כלים|טהרת/g, ' '));
const digits = (s: string | null | undefined): string => { const d = String(s ?? '').replace(/\D/g, ''); return d.length > 10 ? d.slice(-10) : d; };
const meters = (a: GeoPoint, b: GeoPoint): number => { const R = (d: number) => d * Math.PI / 180; const dLat = R(b.latitude - a.latitude), dLng = R(b.longitude - a.longitude); const hh = Math.sin(dLat / 2) ** 2 + Math.cos(R(a.latitude)) * Math.cos(R(b.latitude)) * Math.sin(dLng / 2) ** 2; return 2 * 6371000 * Math.asin(Math.sqrt(hh)); };

async function run(): Promise<void> {
  const kg = await fetchKiryatGat();
  const bs = await fetchBeitShemesh();
  console.log(`Kiryat Gat parsed ${kg.length} | Beit Shemesh parsed ${bs.length}`);

  // resolve coordinates: prefer validated record coord; else GovMap ADDR_V1.
  for (const r of [...kg, ...bs]) {
    if (r.location) continue;
    if (!r.address) { r.coordSource = 'none (no street address)'; continue; }
    const bbox = r.city === 'קרית גת' ? KG_BBOX : BS_BBOX;
    const gc = await govmap(`${r.address}, ${r.city}`, r.city, bbox);
    await sleep(350);
    if (gc) { r.location = gc.loc; r.coordSource = 'govmap-ADDR_V1'; }
    else r.coordSource = 'govmap-no-match';
  }

  const live = readJson<any[]>(join(GEN, 'places.osm.json')).filter((p: any) => p.type === 'mikveh');
  const liveCoord = live.filter((l) => l.location);
  const existingIds = new Set(live.map((p) => p.id));

  const analysis: any[] = [];
  const writeReadyKept: Rec[] = [];
  for (const r of [...kg, ...bs]) {
    let disposition: string, reason: string, dupId: string | null = null;
    if (!r.location) { disposition = 'excluded'; reason = `no address-level coordinate (${r.coordSource})`; }
    else {
      const nearLive = liveCoord.find((l) => meters(r.location!, l.location) <= 100);
      const twin = writeReadyKept.find((k) => k.location && meters(k.location, r.location!) <= 40);
      if (nearLive) { disposition = 'duplicate'; reason = `duplicate of live ${nearLive.id} (${Math.round(meters(r.location, nearLive.location))}m)`; dupId = nearLive.id; }
      else if (twin) { disposition = 'duplicate'; reason = `within-batch duplicate of ${twin.name}`; }
      else { disposition = 'write_ready'; reason = `address-level coordinate (${r.coordSource}), not a duplicate`; writeReadyKept.push(r); }
    }
    analysis.push({ source: r.source, city: r.city, name: r.name, address: r.address, phone: r.phone, gender: r.gender, coordSource: r.coordSource, hasCoords: r.location != null, location: r.location, disposition, reason, matchedLiveId: dupId });
  }

  const writeReady: Place[] = writeReadyKept.map((r) => {
    const slug = r.source.split(':')[1]; const loc = r.location!;
    const place: Place = { id: `mikveh-${slug}-${loc.latitude.toFixed(5)}_${loc.longitude.toFixed(5)}`, name: r.name, type: 'mikveh', cityId: r.city, address: r.address ?? r.city, location: loc, source: 'seed' };
    if (r.coordSource === 'govmap-ADDR_V1') place.locationPrecision = 'address';
    if (r.phone) place.phone = r.phone;
    if (r.gender) place.mikvehGender = r.gender;
    if (r.attendant) place.attendant = r.attendant;
    place.sourceName = r.city === 'קרית גת' ? 'המועצה הדתית קרית גת' : 'המועצה הדתית בית שמש';
    place.sourceUrl = r.city === 'קרית גת' ? 'https://mdkg.org.il/mikve' : 'https://www.rabanutbs.co.il/רשימת-מקוואות/';
    place.extra = { license: 'council-public', coordSource: r.coordSource, provenance: { sourceId: r.source, fetchedAt: NOW } };
    return place;
  });
  const collisions = writeReady.filter((p) => existingIds.has(p.id)).map((p) => p.id);
  const dupAppIds = writeReady.map((p) => p.id).filter((id, i, a) => a.indexOf(id) !== i);

  const summary = {
    generatedNote: 'PHASE 19 DRY-RUN — Beit Shemesh + Kiryat Gat (CSR sites, browser UA). Address-level coords only (record-coord bbox-validated OR GovMap ADDR_V1). No Nominatim, no settlement-level. No DB write, no rebuild.',
    sources: { kiryatGat: { url: 'https://mdkg.org.il/mikve', parsed: kg.length, withRecordCoords: kg.filter((r) => r.coordSource === 'record-embedded').length, govmapGeocoded: kg.filter((r) => r.coordSource === 'govmap-ADDR_V1').length }, beitShemesh: { url: 'https://www.rabanutbs.co.il/רשימת-מקוואות/', parsed: bs.length, govmapGeocoded: bs.filter((r) => r.coordSource === 'govmap-ADDR_V1').length } },
    totalParsed: kg.length + bs.length,
    addressLevelResolved: analysis.filter((a) => a.hasCoords).length,
    notResolvable: analysis.filter((a) => !a.hasCoords).length,
    writeReady: writeReady.length,
    duplicates: analysis.filter((a) => a.disposition === 'duplicate').length,
    writeReadyBySource: writeReadyKept.reduce<Record<string, number>>((a, r) => { const k = r.source.split(':')[1]; a[k] = (a[k] ?? 0) + 1; return a; }, {}),
    idCollisions: collisions.length, duplicateAppIds: dupAppIds.length,
    finalRecommendedWriteCount: (collisions.length || dupAppIds.length) ? 0 : writeReady.length,
    liveMikvehBefore: live.length, estimatedTotalAfterWrite: live.length + ((collisions.length || dupAppIds.length) ? 0 : writeReady.length),
    notes: ['Kiryat Gat ids 69 & 88 had WRONG embedded coords (Tel-Aviv / north) → bbox-rejected; 69 recovered via GovMap (has address), 88 excluded (no usable address).', 'Settlement-level geocoding intentionally NOT used.'],
    rollbackPlan: ['Backup places.osm.json → places.osm.pre-phase19.backup.json (+cities) before write', 'Additive append only; do NOT run rebuildAppDataset'],
    dryRun: true, liveDataTouched: false, publishPerformed: false, rebuildTouched: false,
  };

  writeFileSync(join(OUT, 'phase19-preview.json'), JSON.stringify([...kg, ...bs], null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase19-merge-analysis.json'), JSON.stringify(analysis, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase19-write-ready-preview.json'), JSON.stringify(writeReady, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase19-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('=== Phase 19 (dry-run) ===');
  console.log(`parsed ${kg.length + bs.length} (KG ${kg.length}, BS ${bs.length}) | address-resolved ${summary.addressLevelResolved} | not-resolvable ${summary.notResolvable}`);
  console.log(`write-ready ${writeReady.length} (${JSON.stringify(summary.writeReadyBySource)}) | duplicates ${summary.duplicates} | id collisions ${collisions.length}`);
  console.log(`est total after: ${live.length} + ${summary.finalRecommendedWriteCount} = ${summary.estimatedTotalAfterWrite}`);
}

if (isMain(import.meta.url)) void run();
