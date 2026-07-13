/**
 * Phase 16 — Import (DRY-RUN) from LEGALLY-SAFE / OPEN official sources.
 *
 * Sources: (1) data.gov.il 2018 mikveh CKAN package; (2) OSM Overpass (genuine
 * mikvah objects only); (3) Tel Aviv municipal GIS layer; (4) official non-SabaiApps
 * religious councils — Bat Yam + Golan (HTML tables, parsed here) and
 * Netivot/Rehovot/Menashe/Mazkeret Batya (read from phase16-council-extracts.json).
 *
 * Each record is normalized to type 'mikveh' and classified against the CURRENT
 * 531 live mikveh in src/data/generated/places.osm.json:
 *   exact_match | probable_match | new_record | enrichment_candidate | manual_review.
 *
 * NO DB write, NO publish, NO app-data change. Preview + merge + summary only.
 * Commercial/private aggregators (mikve.net/mikveh.co.il/taharat/mikve4u/kipa) are
 * NOT touched.
 *
 * Run:  node importers/mikvahs/phase16-import.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { USER_AGENT, fetchOverpass, httpJson, isInIsrael, isMain, sleep } from '../shared/utils.ts';
import { makeRecordId, type GeoPoint, type NormalizedImportRecord } from '../unified/schema/normalized-record.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'output');
const GEN = join(HERE, '..', '..', 'src', 'data', 'generated');
const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const NOW = new Date().toISOString().slice(0, 10);

// --- HTML helpers (for Bat Yam / Golan tables) ------------------------------
const strip = (s: string): string =>
  s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/\s+/g, ' ').trim();
function tables(html: string): string[][][] {
  const T: string[][][] = [];
  for (const b of html.split(/<table/i).slice(1)) {
    const body = b.split(/<\/table>/i)[0];
    const rows: string[][] = [];
    for (const tr of body.split(/<tr[\s>]/i).slice(1)) {
      const c = [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => strip(m[1]));
      if (c.length) rows.push(c);
    }
    T.push(rows);
  }
  return T;
}
async function getText(url: string): Promise<string | null> {
  try { const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT } }); return r.ok ? await r.text() : null; } catch { return null; }
}
const normPhone = (s: string | null | undefined): string | undefined => {
  const d = String(s ?? '').replace(/\D/g, '');
  if (d.length === 10 && d[0] === '0') return d;
  if (d.length === 9 && d[0] !== '0') return '0' + d;
  return d.length >= 9 ? d : undefined;
};

// --- a normalized incoming record + its source/license ----------------------
interface Incoming {
  record: NormalizedImportRecord;
  sourceKey: string; license: string;
  city: string; address: string | null; phone: string | null;
  gender: string | null; attendant: string | null; openingHours: string | null;
  location: GeoPoint | null;
}
function mk(sourceId: string, sourceRecordId: string, sourceUrl: string | undefined, license: string, f: {
  name: string; city: string; address?: string | null; phone?: string | null; openingHours?: string | null;
  gender?: string | null; attendant?: string | null; accessibility?: string | null; notes?: string | null; location?: GeoPoint | null;
}): Incoming {
  const extra: Record<string, unknown> = { sourceLicense: license };
  if (f.gender) extra.gender = f.gender;
  if (f.attendant) extra.attendant = f.attendant;
  if (f.accessibility) extra.accessibility = f.accessibility;
  if (f.notes) extra.notes = f.notes;
  const record: NormalizedImportRecord = {
    id: makeRecordId(sourceId, sourceRecordId), type: 'mikveh', name: f.name,
    ...(f.address ? { address: f.address } : {}), cityHint: f.city,
    ...(f.location ? { location: f.location } : {}),
    ...(f.phone ? { phone: f.phone } : {}), ...(f.openingHours ? { openingHours: f.openingHours } : {}),
    ...(f.gender ? { tags: [`gender:${f.gender}`] } : {}),
    confidence: 'medium',
    provenance: { sourceId, adapterId: 'phase16-open-v1', sourceRecordId, ...(sourceUrl ? { sourceUrl } : {}), fetchedAt: NOW },
    extra,
  };
  return { record, sourceKey: sourceId, license, city: f.city, address: f.address ?? null, phone: f.phone ?? null, gender: f.gender ?? null, attendant: f.attendant ?? null, openingHours: f.openingHours ?? null, location: f.location ?? null };
}

// --- source fetchers --------------------------------------------------------
async function fetchDataGov2018(): Promise<Incoming[]> {
  const RES = '9a939c58-d149-4c07-b37f-77dbf0d50e35';
  const out: Incoming[] = [];
  for (let offset = 0; ; offset += 100) {
    const d = await httpJson(`https://data.gov.il/api/3/action/datastore_search?resource_id=${RES}&limit=100&offset=${offset}`, { headers: { 'User-Agent': USER_AGENT } }, 'datagov2018');
    const recs: any[] = d.result?.records ?? [];
    for (const r of recs) {
      const city = strip(String(r.City ?? '')); const addr = strip(String(r.Mikve_Address ?? ''));
      if (!city && !addr) continue;
      out.push(mk('datagov:mikve-2018', `dg2018-${r._id}`, 'https://data.gov.il/dataset/2018', 'gov-il-open', {
        name: addr || `מקווה ${city}`, city, address: addr || null, phone: normPhone(r.Phone) ?? null,
        openingHours: strip(String(r.Opening_Hours_Summer ?? '')) || null,
        accessibility: strip(String(r.Accessibility ?? '')) || null, notes: strip(String(r.Notes ?? '')) || null,
      }));
    }
    if (recs.length < 100) break;
  }
  return out;
}

async function fetchOSM(): Promise<Incoming[]> {
  const q = `[out:json][timeout:120];area["ISO3166-1"="IL"][admin_level=2]->.il;(nwr["amenity"="ritual_bath"](area.il);nwr["bath:type"="mikveh"](area.il);nwr["amenity"="public_bath"]["religion"="jewish"](area.il);nwr["name"~"מקווה|מקוה",i](area.il););out center tags;`;
  const d = await fetchOverpass(q, 'osm-mikvah');
  const out: Incoming[] = [];
  for (const e of d.elements ?? []) {
    const t = e.tags ?? {}; const name = t.name ?? t['name:he'] ?? '';
    const lat = e.lat ?? e.center?.lat; const lng = e.lon ?? e.center?.lon;
    // GENUINE mikvah filter: a real bath tag, OR a mikvah-named facility that is
    // NOT the "מקווה ישראל" school/place and not a street/landuse.
    const isBath = t.amenity === 'ritual_bath' || t['bath:type'] === 'mikveh';
    const named = /מקו[ו]?ה/.test(name) && !/מקווה ישראל/.test(name) && t.amenity !== 'school' && !t.highway && !t.place && !t.landuse && !t.waterway;
    if (!(isBath || named)) continue;
    if (typeof lat !== 'number' || typeof lng !== 'number' || !isInIsrael({ latitude: lat, longitude: lng })) continue;
    const street = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ');
    out.push(mk('osm:mikvahs', `osm-${e.type}-${e.id}`, 'https://www.openstreetmap.org', 'ODbL-1.0', {
      name: name || 'מקווה', city: t['addr:city'] ?? '', address: street || null, phone: normPhone(t.phone ?? t['contact:phone']) ?? null,
      location: { latitude: lat, longitude: lng },
    }));
  }
  return out;
}

async function fetchTLV(): Promise<Incoming[]> {
  const d = await httpJson('https://gisn.tel-aviv.gov.il/arcgis/rest/services/IView2/MapServer/545/query?where=1%3D1&outFields=*&outSR=4326&f=json', { headers: { 'User-Agent': USER_AGENT } }, 'tlv-gis');
  const out: Incoming[] = [];
  for (const ft of d.features ?? []) {
    const a = ft.attributes ?? {}; const g = ft.geometry ?? {};
    if (typeof g.x !== 'number' || typeof g.y !== 'number') continue;
    const genders = [a.nashim ? 'נשים' : '', a.gvarim ? 'גברים' : '', a.kelim ? 'כלים' : ''].filter(Boolean).join('/');
    out.push(mk('gis:tel-aviv:mikvaot', `tlv-${a.oid_mikve}`, 'https://gisn.tel-aviv.gov.il', 'municipal-open', {
      name: a.shem_mikve || 'מקווה', city: 'תל אביב יפו', address: [a.shem_rechov, a.ms_bait].filter(Boolean).join(' ') || null,
      phone: normPhone(a.telephone) ?? null, gender: genders || null, accessibility: a.negishut || null, notes: a.hearot || null,
      location: { latitude: g.y, longitude: g.x },
    }));
  }
  return out;
}

async function fetchBatYam(): Promise<Incoming[]> {
  const h = await getText('https://www.mdby.org.il/info/mikve'); if (!h) return [];
  const T = tables(h).filter((t) => t.length >= 2 && /כתובת/.test(t[0].join(' ')));
  const out: Incoming[] = [];
  T.forEach((t, ti) => {
    const gender = ti === 0 ? 'גברים' : 'כלים'; // Phase-15: table0 men, table1 vessels (best-effort)
    for (let r = 1; r < t.length; r++) {
      const [name, addr, phoneOrHours] = t[r];
      if (!name) continue;
      out.push(mk('council:bat-yam:mikvah', `bat-yam-${ti}-${r}`, 'https://www.mdby.org.il/info/mikve', 'council-public', {
        name, city: 'בת ים', address: addr || null, phone: normPhone(phoneOrHours) ?? null,
        openingHours: ti === 0 && phoneOrHours && !normPhone(phoneOrHours) ? phoneOrHours : null, gender,
      }));
    }
  });
  return out;
}

async function fetchGolan(): Promise<Incoming[]> {
  const h = await getText('https://m.d.golan.org.il/טהרת-המשפחה/'); if (!h) return [];
  const T = tables(h).filter((t) => t.length >= 2 && /בלנית/.test(t[0].join(' ')));
  const out: Incoming[] = [];
  for (const t of T) for (let r = 1; r < t.length; r++) {
    const [settlement, balanit, phoneMikve, phonePersonal] = t[r];
    if (!settlement) continue;
    out.push(mk('council:golan:mikvah', `golan-${r}`, 'https://m.d.golan.org.il/טהרת-המשפחה/', 'council-public', {
      name: `מקווה ${settlement}`, city: settlement, phone: normPhone(phoneMikve) ?? normPhone(phonePersonal) ?? null,
      gender: 'נשים', attendant: balanit || null,
    }));
  }
  return out;
}

function fromExtracts(): Incoming[] {
  const data = readJson<{ councils: any[] }>(join(OUT, 'phase16-council-extracts.json'));
  const out: Incoming[] = [];
  for (const c of data.councils) for (let i = 0; i < c.records.length; i++) {
    const r = c.records[i];
    out.push(mk(`council:${c.id}:mikvah`, `${c.id}-${i}`, c.url, c.license ?? 'council-public', {
      name: r.name, city: r.city ?? c.city, address: r.address ?? null, phone: normPhone(r.phone) ?? null,
      openingHours: r.hours ?? null, gender: r.gender ?? null, attendant: r.attendant ?? null, accessibility: r.accessibility ?? null, notes: r.notes ?? null,
    }));
  }
  return out;
}

// --- matching vs live -------------------------------------------------------
const sp = (s: string): string => s.replace(/["'׳״’”`.,()\[\]\-]/g, ' ').replace(/\s+/g, ' ').trim();
const normCity = (s: string | undefined): string => sp(String(s ?? ''));
const normName = (s: string | undefined): string => sp(String(s ?? '').replace(/מקוואות|מקואות|מקווה|מקוה|נשים|גברים|כלים|טהרת/g, ' '));
const digits = (s: string | null | undefined): string => { const d = String(s ?? '').replace(/\D/g, ''); return d.length > 10 ? d.slice(-10) : d; };
function addrParts(a: string | null | undefined, city: string): { house: string | null; tokens: Set<string> } {
  let s = sp(String(a ?? '')).replace(/\b(ישראל|israel)\b/gi, ' ');
  for (const c of normCity(city).split(' ')) s = s.split(' ').filter((t) => t !== c).join(' ');
  let house: string | null = null; const tokens = new Set<string>();
  for (const t of s.split(/\s+/).filter(Boolean)) { if (/^\d+/.test(t)) { if (!house) house = t.replace(/\D/g, ''); } else if (t.length >= 2) tokens.add(t); }
  return { house, tokens };
}
const jac = (a: Set<string>, b: Set<string>): number => { if (!a.size || !b.size) return 0; let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i); };
const metersKm = (a: GeoPoint, b: GeoPoint): number => {
  const toR = (d: number) => d * Math.PI / 180; const dLat = toR(b.latitude - a.latitude), dLng = toR(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.latitude)) * Math.cos(toR(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
};

interface Live { id: string; name: string; cityId: string; address?: string; phone?: string; location?: GeoPoint; locationPrecision?: string; openingHours?: string; mikvehGender?: string; attendant?: string; sourceUrl?: string; }
const empty = (v: unknown): boolean => v == null || String(v).trim() === '';

function enrichable(live: Live, inc: Incoming): string[] {
  const ef: string[] = [];
  if (inc.location && live.locationPrecision !== 'address' && (!live.location || live.locationPrecision === 'city')) ef.push('coordinates');
  if (empty(live.openingHours) && !empty(inc.openingHours)) ef.push('openingHours');
  if (empty(live.phone) && !empty(inc.phone)) ef.push('phone');
  if (empty(live.mikvehGender) && !empty(inc.gender)) ef.push('gender');
  if (empty(live.attendant) && !empty(inc.attendant)) ef.push('attendant');
  // NOTE: sourceUrl is intentionally NOT an enrichment signal — every record has a
  // provenance URL, so it would spuriously flip duplicates into "enrichment".
  return ef;
}

type Cls = 'exact_match' | 'probable_match' | 'new_record' | 'enrichment_candidate' | 'manual_review';

function classify(inc: Incoming, liveByCity: Map<string, Live[]>, liveCoord: Live[], liveByPhone: Map<string, Live>): { classification: Cls; confidence: number; match: Live | null; tier: string; enrich: string[] } {
  const cands = liveByCity.get(normCity(inc.city)) ?? [];
  let best: { live: Live; conf: number; tier: string } | null = null;
  const consider = (live: Live, conf: number, tier: string) => { if (!best || conf > best.conf) best = { live, conf, tier }; };

  // phone is a spelling-independent identity key — catches dups across city-spelling drift.
  const ph = digits(inc.phone);
  if (ph.length >= 9 && liveByPhone.has(ph)) consider(liveByPhone.get(ph)!, 0.88, 'phone-global');

  for (const live of cands) {
    const a1 = addrParts(inc.address, inc.city), a2 = addrParts(live.address, live.cityId);
    const ss = jac(a1.tokens, a2.tokens); const houseEq = !!a1.house && a1.house === a2.house;
    const phoneEq = digits(inc.phone).length >= 9 && digits(inc.phone) === digits(live.phone);
    const nameEq = normName(inc.record.name).length >= 2 && normName(inc.record.name) === normName(live.name);
    if (phoneEq && (ss >= 0.5 || nameEq)) consider(live, 0.95, 'phone+context');
    else if (ss >= 0.6 && houseEq) consider(live, 0.9, 'address-exact');
    else if (ss >= 0.5) consider(live, 0.78, 'address-partial');
    else if (phoneEq) consider(live, 0.72, 'phone-only');
    else if (nameEq) consider(live, 0.7, 'name');
  }
  // coordinate match (for OSM / GIS), across all live mikveh with coords
  if (inc.location) {
    for (const live of liveCoord) {
      if (!live.location) continue;
      const dM = metersKm(inc.location, live.location);
      if (dM > 600) continue;
      const nameSim = jac(new Set(normName(inc.record.name).split(' ')), new Set(normName(live.name).split(' ')));
      if (dM <= 120 && nameSim >= 0.4) consider(live, 0.92, `coords<=120m`);
      else if (dM <= 60) consider(live, 0.8, 'coords<=60m');
    }
  }

  if (!best) return { classification: 'new_record', confidence: 0.85, match: null, tier: 'no-match', enrich: [] };
  const b = best as { live: Live; conf: number; tier: string };
  const ef = enrichable(b.live, inc);
  let classification: Cls;
  if (b.conf >= 0.9) classification = ef.length ? 'enrichment_candidate' : 'exact_match';
  else if (b.conf >= 0.7) classification = ef.length ? 'enrichment_candidate' : 'probable_match';
  else classification = 'manual_review';
  return { classification, confidence: b.conf, match: b.live, tier: b.tier, enrich: ef };
}

async function run(): Promise<void> {
  const sources: { key: string; name: string; fn: () => Promise<Incoming[]> }[] = [
    { key: 'datagov-2018', name: 'data.gov.il 2018 (CKAN)', fn: fetchDataGov2018 },
    { key: 'osm', name: 'OpenStreetMap (Overpass)', fn: fetchOSM },
    { key: 'tlv-gis', name: 'Tel Aviv GIS layer 545', fn: fetchTLV },
    { key: 'bat-yam', name: 'מועצה דתית בת ים', fn: fetchBatYam },
    { key: 'golan', name: 'מועצה דתית גולן', fn: fetchGolan },
  ];
  const incoming: Incoming[] = [];
  const srcResults: { key: string; name: string; ok: boolean; count: number; error?: string }[] = [];
  for (const s of sources) {
    try { const recs = await s.fn(); incoming.push(...recs); srcResults.push({ key: s.key, name: s.name, ok: true, count: recs.length }); console.log(`● ${s.name}: ${recs.length}`); }
    catch (e) { srcResults.push({ key: s.key, name: s.name, ok: false, count: 0, error: (e as Error).message }); console.warn(`✗ ${s.name}: ${(e as Error).message}`); }
    await sleep(800);
  }
  // agent-extracted councils (already verified, from file)
  const extracts = fromExtracts(); incoming.push(...extracts);
  srcResults.push({ key: 'councils-extracted', name: 'Netivot/Rehovot/Menashe/Mazkeret (verified extracts)', ok: true, count: extracts.length });

  // reference pool = current live 531 (places.osm.json) ∪ full gov 606
  // (mikvahs.normalized.json). The live data is only the GEOCODED subset of the
  // gov dataset, so matching against the full 606 avoids mislabeling
  // already-known ministry records (esp. the 2018 snapshot) as "new".
  const live = readJson<Live[]>(join(GEN, 'places.osm.json')).filter((p: any) => p.type === 'mikveh');
  const liveByCity = new Map<string, Live[]>();
  const addLive = (l: Live) => { const k = normCity(l.cityId); (liveByCity.get(k) ?? liveByCity.set(k, []).get(k)!).push(l); };
  for (const l of live) addLive(l);
  const gov606 = readJson<any[]>(join(OUT, 'mikvahs.normalized.json'));
  for (const g of gov606) addLive({ id: g.sourceId, name: g.name, cityId: g.city ?? '', address: g.address, phone: g.phone, openingHours: g.openingHours, attendant: g.extra?.responsible });
  const liveCoord = live.filter((l) => l.location);
  const liveByPhone = new Map<string, Live>();
  for (const arr of liveByCity.values()) for (const l of arr) { const p = digits(l.phone); if (p.length >= 9 && !liveByPhone.has(p)) liveByPhone.set(p, l); }

  // classify
  const analysis = incoming.map((inc) => {
    const c = classify(inc, liveByCity, liveCoord, liveByPhone);
    // The data.gov 2018 dataset is an OLDER snapshot of the SAME ministry feed we
    // already hold (606). An unmatched 2018 record is NOT confidently new — it is
    // likely stale/closed or a spelling variant → route to manual_review.
    if (c.classification === 'new_record' && inc.sourceKey === 'datagov:mikve-2018') {
      c.classification = 'manual_review'; c.tier = 'datagov-2018 older-snapshot (verify not stale/duplicate)';
    }
    return {
      sourceKey: inc.sourceKey, license: inc.license, name: inc.record.name, city: inc.city, address: inc.address,
      phone: inc.phone, gender: inc.gender, hasCoords: inc.location != null,
      classification: c.classification, confidence: Number(c.confidence.toFixed(2)),
      matchedLiveId: c.match?.id ?? null, matchTier: c.tier, enrichableFields: c.enrich,
    };
  });

  const cnt = (k: Cls) => analysis.filter((a) => a.classification === k).length;
  const cov = (() => {
    const n = incoming.length || 1;
    const pct = (f: (i: Incoming) => unknown) => Math.round((incoming.filter((i) => { const v = f(i); return v != null && String(v).trim() !== ''; }).length / n) * 100);
    return { name: pct((i) => i.record.name), city: pct((i) => i.city), address: pct((i) => i.address), phone: pct((i) => i.phone), openingHours: pct((i) => i.openingHours), coordinates: pct((i) => i.location), gender: pct((i) => i.gender), attendant: pct((i) => i.attendant) };
  })();
  const newByCity: Record<string, number> = {};
  for (const a of analysis) if (a.classification === 'new_record') newByCity[a.city || '?'] = (newByCity[a.city || '?'] ?? 0) + 1;

  const newCount = cnt('new_record');
  const summary = {
    generatedNote: 'PHASE 16 DRY-RUN — open/official sources only. No DB write, no publish, no app-data change. Commercial aggregators NOT used.',
    legallySafeOnly: 'gov-il-open (data.gov.il 2018), ODbL (OSM), municipal-open (TLV GIS), council-public (official council pages).',
    sourcesAttempted: srcResults.length,
    sourcesSuccessful: srcResults.filter((r) => r.ok).length,
    bySource: srcResults,
    recordsExtracted: incoming.length,
    classification: { exact_match: cnt('exact_match'), probable_match: cnt('probable_match'), new_record: newCount, enrichment_candidate: cnt('enrichment_candidate'), manual_review: cnt('manual_review') },
    trulyNewMikvehs: newCount,
    enrichmentOpportunities: cnt('enrichment_candidate'),
    duplicates: cnt('exact_match') + cnt('probable_match'),
    manualReview: cnt('manual_review'),
    fieldCoverage: cov,
    newByCity,
    liveMikvehBefore: live.length,
    estimatedTotalAfterPhase: live.length + newCount,
    recommendedFirstWriteBatch: {
      criteria: 'new_record with native coordinates (write-ready) OR (city present + high confidence). Address-only new records need geocoding first (Phase-14 workflow).',
      coordBearingNew: analysis.filter((a) => a.classification === 'new_record' && a.hasCoords).length,
      note: 'OSM + Tel Aviv GIS new records carry coordinates → write-ready. data.gov.il 2018 + council new records are address-only → geocode before writing.',
    },
    dryRun: true, liveDataTouched: false, publishPerformed: false,
  };

  writeFileSync(join(OUT, 'phase16-official-open-preview.json'), JSON.stringify(incoming.map((i) => ({ ...i.record, _sourceLicense: i.license })), null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase16-official-open-merge-analysis.json'), JSON.stringify(analysis, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase16-official-open-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('\n=== Phase 16 (dry-run) ===');
  console.log(`sources ${summary.sourcesSuccessful}/${summary.sourcesAttempted} | extracted ${incoming.length}`);
  console.log(`new=${newCount} enrich=${cnt('enrichment_candidate')} exact=${cnt('exact_match')} probable=${cnt('probable_match')} manual=${cnt('manual_review')}`);
  console.log(`est total after: ${live.length} + ${newCount} = ${live.length + newCount} | coord-bearing new (write-ready): ${summary.recommendedFirstWriteBatch.coordBearingNew}`);
}

if (isMain(import.meta.url)) void run();
