/**
 * GovMap address geocoding for OFFICIAL address-only mikveh sources (DRY-RUN).
 *
 * Sources: Tel Aviv council (rabanut.co.il, 19) + Gush Etzion (baitisraeli.co.il,
 * 18, settlement-only) extracted fresh; Phase-16 councils (Bat Yam/Netivot/Menashe/
 * Mazkeret/Rehovot/Golan) read from phase16-official-open-preview.json.
 *
 * Geocode each STREET address via GovMap (es.govmap.gov.il, the official Israeli
 * address DB), accepting ONLY an exact ADDR_V1 result whose label contains the
 * right city, converting ITM→WGS84 (arcgis/itm.ts), validated in-Israel. Records
 * without a street (settlement-only / phone-only) cannot reach address precision
 * and stay excluded. Nominatim is NOT used (it name-collides cities).
 *
 * Compares vs the live 606, dedups, and emits a write-ready preview of ONLY the
 * high-confidence (ADDR_V1) non-duplicate results. NO DB write, NO rebuild.
 *
 * Run:  node importers/mikvahs/govmap-geocode-councils.ts
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
const UA = 'Mozilla/5.0 (karov-kosher-app; mikvah geocode; non-commercial)';
const strip = (s: string): string => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/\s+/g, ' ').trim();
const normPhone = (s: string | null | undefined): string | undefined => { const d = String(s ?? '').replace(/\D/g, ''); if (d.length === 10 && d[0] === '0') return d; if (d.length === 9 && d[0] !== '0') return '0' + d; return d.length >= 9 ? d : undefined; };
const sp = (s: string): string => s.replace(/["'׳״’”`.,()\[\]\-–]/g, ' ').replace(/\s+/g, ' ').trim();
const normCity = (s: string | undefined): string => sp(String(s ?? ''));

interface Rec { source: string; city: string; name: string; address: string | null; phone: string | null; attendant: string | null; }

function htmlTables(html: string): string[][][] {
  const T: string[][][] = [];
  for (const b of html.split(/<table/i).slice(1)) { const body = b.split(/<\/table>/i)[0]; const rows: string[][] = []; for (const tr of body.split(/<tr[\s>]/i).slice(1)) { const c = [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => strip(m[1])); if (c.length) rows.push(c); } T.push(rows); }
  return T;
}
/** Extract a "street + number" from a free address cell (drops neighborhood/extra). */
function streetOf(addr: string): string | null {
  const m = addr.match(/([א-ת'"][א-ת'"\s]{1,30}?\s\d+[א-ת]?)/);
  return m ? m[1].trim() : null;
}

async function extractTelAviv(): Promise<Rec[]> {
  try {
    const h = await (await fetch('https://rabanut.co.il/חיפוש-מקוואות/רשימת-מקוואות-נשים/', { headers: { 'User-Agent': UA } })).text();
    const t = htmlTables(h).find((x) => x.length >= 2 && /כתובת/.test(x[0].join(' ')));
    if (!t) return [];
    const out: Rec[] = [];
    for (let r = 1; r < t.length; r++) {
      const cell = t[r][0] ?? ''; if (!cell) continue;
      const parts = cell.split(/–|-/).map((s) => s.trim());
      const neighborhood = parts[0] || cell; const addressRaw = parts.slice(1).join(' ') || cell;
      out.push({ source: 'council:tel-aviv:mikvah', city: 'תל אביב יפו', name: `מקווה ${neighborhood}`, address: streetOf(addressRaw) ?? streetOf(cell), phone: normPhone(t[r][1]) ?? null, attendant: t[r][2] || null });
    }
    return out;
  } catch { return []; }
}

async function extractGushEtzion(): Promise<Rec[]> {
  try {
    const h = await (await fetch('https://www.baitisraeli.co.il/171/', { headers: { 'User-Agent': UA } })).text();
    const t = htmlTables(h).find((x) => x.length >= 2 && /הישוב|בלנית/.test(x[0].join(' ')));
    if (!t) return [];
    const out: Rec[] = [];
    for (let r = 1; r < t.length; r++) { const settlement = t[r][0]; if (!settlement) continue; out.push({ source: 'council:gush-etzion:mikvah', city: settlement, name: `מקווה ${settlement}`, address: null, phone: normPhone(t[r][4]) ?? normPhone(t[r][3]) ?? null, attendant: t[r][1] || null }); }
    return out;
  } catch { return []; }
}

function fromPhase16(): Rec[] {
  let prev: any[]; try { prev = readJson<any[]>(join(OUT, 'phase16-official-open-preview.json')); } catch { return []; }
  return prev.filter((p) => String(p.provenance?.sourceId ?? '').startsWith('council:') && !p.location)
    .map((p) => ({ source: p.provenance.sourceId, city: p.cityHint ?? '', name: p.name, address: p.address ?? null, phone: p.phone ?? null, attendant: (p.extra?.attendant as string) ?? null }));
}

// --- GovMap (reliable, official address DB) ---------------------------------
async function govmap(query: string, city: string): Promise<{ loc: GeoPoint; label: string } | null> {
  let d: any;
  try { d = await (await fetch(`https://es.govmap.gov.il/TldSearch/api/DetailsByQuery?query=${encodeURIComponent(query)}&lyrs=257&gid=govmap`, { headers: { 'User-Agent': UA, Accept: 'application/json' } })).json(); }
  catch { return null; }
  const a = d?.data?.ADDRESS?.[0];
  if (!a || a.DescLayerID !== 'ADDR_V1' || a.ResultType !== 1) return null; // exact address only
  const label = normCity(String(a.ResultLable ?? '')); const c = normCity(city);
  if (!(label.includes(c) || c.split(' ').every((w) => w.length < 2 || label.includes(w)))) return null; // right city
  const w = itmToWgs84(Number(a.X), Number(a.Y));
  if (w.latitude == null || w.longitude == null) return null;
  const loc = { latitude: w.latitude, longitude: w.longitude };
  if (!isInIsrael(loc)) return null;
  return { loc, label: String(a.ResultLable) };
}

// --- matching vs live 606 ---------------------------------------------------
const normName = (s: string | undefined): string => sp(String(s ?? '').replace(/מקוואות|מקואות|מקווה|מקוה|נשים|גברים|כלים|טהרת/g, ' '));
const digits = (s: string | null | undefined): string => { const d = String(s ?? '').replace(/\D/g, ''); return d.length > 10 ? d.slice(-10) : d; };
const meters = (a: GeoPoint, b: GeoPoint): number => { const R = (d: number) => d * Math.PI / 180; const dLat = R(b.latitude - a.latitude), dLng = R(b.longitude - a.longitude); const h = Math.sin(dLat / 2) ** 2 + Math.cos(R(a.latitude)) * Math.cos(R(b.latitude)) * Math.sin(dLng / 2) ** 2; return 2 * 6371000 * Math.asin(Math.sqrt(h)); };

async function run(): Promise<void> {
  const recs: Rec[] = [...(await extractTelAviv()), ...(await extractGushEtzion()), ...fromPhase16()];
  console.log(`collected ${recs.length} address-only official records`);

  const live = readJson<any[]>(join(GEN, 'places.osm.json')).filter((p: any) => p.type === 'mikveh');
  const liveCoord = live.filter((l) => l.location);

  const results: any[] = [];
  const writeReadyKept: { rec: Rec; loc: GeoPoint; label: string }[] = [];
  for (const r of recs) {
    let geocode: { precision: 'address' | 'none'; loc: GeoPoint | null; label: string | null; note: string } = { precision: 'none', loc: null, label: null, note: '' };
    if (!r.address) { geocode.note = 'no street address (settlement/phone-only) → GovMap address geocode not applicable'; }
    else {
      const gc = await govmap(`${r.address}, ${r.city}`, r.city);
      await sleep(400);
      if (gc) geocode = { precision: 'address', loc: gc.loc, label: gc.label, note: 'GovMap ADDR_V1 exact match, city-validated, ITM→WGS84' };
      else geocode.note = 'GovMap: no exact in-city ADDR_V1 match → rejected (low confidence)';
    }

    // dedup + write-readiness (high-confidence address geocode only)
    let disposition = 'excluded'; let reason = geocode.note; let dupId: string | null = null;
    if (geocode.precision === 'address' && geocode.loc) {
      const nearLive = liveCoord.find((l) => meters(geocode.loc!, l.location) <= 100);
      const twin = writeReadyKept.find((k) => meters(k.loc, geocode.loc!) <= 40);
      if (nearLive) { disposition = 'duplicate'; reason = `duplicate of live ${nearLive.id} (${Math.round(meters(geocode.loc, nearLive.location))}m)`; dupId = nearLive.id; }
      else if (twin) { disposition = 'duplicate'; reason = `within-batch duplicate of ${twin.rec.name}`; }
      else { disposition = 'write_ready'; reason = 'high-confidence address geocode, not a duplicate'; writeReadyKept.push({ rec: r, loc: geocode.loc, label: geocode.label! }); }
    }
    results.push({ source: r.source, city: r.city, name: r.name, address: r.address, phone: r.phone, geocode: { precision: geocode.precision, location: geocode.loc, govmapLabel: geocode.label, note: geocode.note }, disposition, reason, matchedLiveId: dupId });
  }

  // build write-ready Place payloads
  const existingIds = new Set(live.map((p) => p.id));
  const writeReady: Place[] = writeReadyKept.map(({ rec, loc, label }) => {
    const citySlug = rec.source.split(':')[1];
    const place: Place = {
      id: `mikveh-${citySlug}-${loc.latitude.toFixed(5)}_${loc.longitude.toFixed(5)}`,
      name: rec.name, type: 'mikveh', cityId: rec.city, address: rec.address ?? rec.city, location: loc, source: 'seed', locationPrecision: 'address',
    };
    if (rec.phone) place.phone = rec.phone;
    place.mikvehGender = 'נשים';
    if (rec.attendant) place.attendant = rec.attendant;
    place.sourceName = `מועצה דתית — ${rec.city}`;
    place.extra = { license: 'council-public', geocodeSource: 'govmap-ADDR_V1', geocodeLabel: label, provenance: { sourceId: rec.source, fetchedAt: NOW } };
    return place;
  });
  const collisions = writeReady.filter((p) => existingIds.has(p.id)).map((p) => p.id);
  const dupAppIds = writeReady.map((p) => p.id).filter((id, i, a) => a.indexOf(id) !== i);

  const bySource = (key: string) => results.filter((r) => r.source.includes(key));
  const summary = {
    generatedNote: 'GovMap address geocoding for official address-only mikveh sources — DRY-RUN. No DB write, no rebuild. GovMap only (Nominatim rejected). Compared vs live 606.',
    geocoder: 'GovMap es.govmap.gov.il DetailsByQuery (ADDR_V1, ResultType 1, city-in-label, ITM→WGS84). Nominatim NOT used.',
    inputRecords: recs.length,
    bySourceTotals: { telAviv: bySource('tel-aviv').length, gushEtzion: bySource('gush-etzion').length, batYam: bySource('bat-yam').length, netivot: bySource('netivot').length, menashe: bySource('menashe').length, mazkeretBatya: bySource('mazkeret').length, rehovot: bySource('rehovot').length, golan: bySource('golan').length },
    geocoded: results.filter((r) => r.geocode.precision === 'address').length,
    notGeocodable: results.filter((r) => r.geocode.precision === 'none').length,
    writeReady: writeReady.length,
    duplicates: results.filter((r) => r.disposition === 'duplicate').length,
    excluded: results.filter((r) => r.disposition === 'excluded').length,
    writeReadyBySource: writeReadyKept.reduce<Record<string, number>>((a, x) => { const k = x.rec.source.split(':')[1]; a[k] = (a[k] ?? 0) + 1; return a; }, {}),
    beitShemeshNote: 'rabanutbs.co.il/mikvaot/ returned HTTP 404 (bot-blocked) — could not extract; needs a browser fetch.',
    gushEtzionNote: 'settlement-only table (no street addresses) → GovMap cannot reach ADDR_V1; not write-ready via address geocode.',
    idCollisions: collisions.length, duplicateAppIds: dupAppIds.length,
    finalRecommendedWriteCount: (collisions.length || dupAppIds.length) ? 0 : writeReady.length,
    liveMikvehBefore: live.length, estimatedTotalAfterWrite: live.length + ((collisions.length || dupAppIds.length) ? 0 : writeReady.length),
    rollbackPlan: ['Backup places.osm.json → places.osm.pre-govmap-councils.backup.json (+cities) before any write', 'Additive append only; rollback = restore backups; do NOT run rebuildAppDataset'],
    dryRun: true, liveDataTouched: false, publishPerformed: false, rebuildTouched: false,
  };

  writeFileSync(join(OUT, 'govmap-address-geocoding-preview.json'), JSON.stringify(results, null, 2), 'utf8');
  writeFileSync(join(OUT, 'govmap-address-geocoding-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  writeFileSync(join(OUT, 'govmap-councils-write-ready-preview.json'), JSON.stringify(writeReady, null, 2), 'utf8');

  console.log('=== GovMap council geocoding (dry-run) ===');
  console.log(`input ${recs.length} | geocoded(ADDR_V1) ${summary.geocoded} | not-geocodable ${summary.notGeocodable} | duplicates ${summary.duplicates}`);
  console.log(`write-ready ${writeReady.length} (${JSON.stringify(summary.writeReadyBySource)}) | id collisions ${collisions.length}`);
  console.log(`est total after: ${live.length} + ${summary.finalRecommendedWriteCount} = ${summary.estimatedTotalAfterWrite}`);
}

if (isMain(import.meta.url)) void run();
