/**
 * Phase 18 — Import (DRY-RUN) from additional OFFICIAL/OPEN mikveh sources with
 * COORDINATES. No DB write, no publish, no rebuild. Commercial aggregators not used.
 *
 * Sources (all verified reachable, official, coordinate-bearing):
 *   - Jerusalem Religious Council JSON API (rabanut.org.il) — 42, lat/lng
 *   - Holon municipal GIS (ArcGIS) — Inst_Type='מקווה' — 13, WGS84
 *   - Lod municipal GIS (ArcGIS) — תת_קטגוריה='מקווה' — 8, WGS84
 *   - Ashkelon Religious Council (mdas.org.il) — Waze lat/lng per mikvah — 9
 *
 * Each record → type 'mikveh', classified against the live 556 (+ full gov 606
 * for dedup accuracy): exact_match | probable_match | new_record |
 * enrichment_candidate | manual_review.
 *
 * Run:  node importers/mikvahs/phase18-import.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { USER_AGENT, isInIsrael, isMain, sleep } from '../shared/utils.ts';
import { makeRecordId, type GeoPoint, type NormalizedImportRecord } from '../unified/schema/normalized-record.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'output');
const GEN = join(HERE, '..', '..', 'src', 'data', 'generated');
const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const NOW = new Date().toISOString().slice(0, 10);
const UA = 'Mozilla/5.0 (karov-kosher-app; mikvah import; non-commercial)';

const normPhone = (s: unknown): string | undefined => {
  const d = String(s ?? '').replace(/\D/g, '');
  if (d.length === 10 && d[0] === '0') return d;
  if (d.length === 9 && d[0] !== '0') return '0' + d;
  return d.length >= 9 ? d : undefined;
};
const strip = (s: string): string => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/\s+/g, ' ').trim();

interface Incoming { record: NormalizedImportRecord; sourceKey: string; license: string; city: string; address: string | null; phone: string | null; gender: string | null; location: GeoPoint | null; }
function mk(sourceId: string, srid: string, url: string, license: string, f: { name: string; city: string; address?: string | null; phone?: string | null; gender?: string | null; attendant?: string | null; location?: GeoPoint | null }): Incoming {
  const extra: Record<string, unknown> = { sourceLicense: license };
  if (f.gender) extra.gender = f.gender;
  if (f.attendant) extra.attendant = f.attendant;
  const record: NormalizedImportRecord = {
    id: makeRecordId(sourceId, srid), type: 'mikveh', name: f.name,
    ...(f.address ? { address: f.address } : {}), cityHint: f.city,
    ...(f.location ? { location: f.location } : {}), ...(f.phone ? { phone: f.phone } : {}),
    ...(f.gender ? { tags: [`gender:${f.gender}`] } : {}), confidence: 'medium',
    provenance: { sourceId, adapterId: 'phase18-official-v1', sourceRecordId: srid, sourceUrl: url, fetchedAt: NOW }, extra,
  };
  return { record, sourceKey: sourceId, license, city: f.city, address: f.address ?? null, phone: f.phone ?? null, gender: f.gender ?? null, location: f.location ?? null };
}

// --- fetchers ---------------------------------------------------------------
async function fetchJerusalem(): Promise<Incoming[]> {
  const d: any = await (await fetch('https://rabanut.org.il/wp-admin/admin-ajax.php?action=rabanut_mikve_map_filter', { headers: { 'User-Agent': UA } })).json();
  const arr: any[] = Array.isArray(d.posts) ? d.posts : Object.values(d.posts ?? {});
  const out: Incoming[] = [];
  for (const p of arr) {
    const lat = Number(p.latitude), lng = Number(p.longitude);
    const loc = Number.isFinite(lat) && Number.isFinite(lng) && isInIsrael({ latitude: lat, longitude: lng }) ? { latitude: lat, longitude: lng } : null;
    const cats = JSON.stringify(p.post_categories ?? '');
    const gender = /גברים/.test(cats) ? 'גברים' : /נשים/.test(cats) ? 'נשים' : /כלים/.test(cats) ? 'כלים' : null;
    out.push(mk('council:jerusalem:mikvah', `jlm-${strip(String(p.post_title ?? '')).slice(0, 24)}-${lat.toFixed(4)}`, p.post_permalink ?? 'https://rabanut.org.il', 'council-public', {
      name: strip(String(p.post_title ?? 'מקווה')), city: 'ירושלים', address: strip(String(p.address ?? '')) || null,
      phone: normPhone(p.phone_number) ?? null, gender, attendant: p.manager_name ? strip(String(p.manager_name)) : null, location: loc,
    }));
  }
  return out;
}

async function fetchArcgisMikvah(sourceId: string, city: string, endpoint: string, where: string, fieldMap: { name: string[]; address?: string[]; phone?: string[] }): Promise<Incoming[]> {
  const url = `${endpoint}/query?where=${encodeURIComponent(where)}&outFields=*&outSR=4326&f=json`;
  const d: any = await (await fetch(url, { headers: { 'User-Agent': USER_AGENT } })).json();
  const pick = (a: any, keys?: string[]): string | undefined => { if (!keys) return undefined; for (const k of keys) { const hit = Object.keys(a).find((x) => x.toLowerCase() === k.toLowerCase()); if (hit && a[hit] != null && String(a[hit]).trim()) return String(a[hit]).trim(); } return undefined; };
  const out: Incoming[] = [];
  for (const ft of d.features ?? []) {
    const a = ft.attributes ?? {}, g = ft.geometry ?? {};
    if (typeof g.x !== 'number' || typeof g.y !== 'number' || !isInIsrael({ latitude: g.y, longitude: g.x })) continue;
    const oid = a.OBJECTID ?? a.FID ?? `${g.x.toFixed(5)}_${g.y.toFixed(5)}`;
    out.push(mk(sourceId, `${city}-${oid}`, endpoint, 'municipal-open', {
      name: pick(a, fieldMap.name) ?? `מקווה ${city}`, city, address: pick(a, fieldMap.address) ?? null,
      phone: normPhone(pick(a, fieldMap.phone)) ?? null, gender: 'נשים', location: { latitude: g.y, longitude: g.x },
    }));
  }
  return out;
}

async function fetchAshkelon(): Promise<Incoming[]> {
  const h = await (await fetch('https://www.mdas.org.il/ניווט-לסניפי-מקוואות/', { headers: { 'User-Agent': UA } })).text();
  // each mikvah card has a waze ll=lat%2Clng; pull coords + the nearest preceding heading + a phone.
  const out: Incoming[] = [];
  const re = /waze\.com\/ul\?ll=([0-9.]+)%2C([0-9.]+)/g;
  let m: RegExpExecArray | null; let i = 0;
  while ((m = re.exec(h)) !== null) {
    const lat = Number(m[1]), lng = Number(m[2]);
    if (!isInIsrael({ latitude: lat, longitude: lng })) continue;
    const before = h.slice(Math.max(0, m.index - 1200), m.index);
    const heading = [...before.matchAll(/<(?:h[1-6]|strong|b)[^>]*>([\s\S]*?)<\/(?:h[1-6]|strong|b)>/gi)].map((x) => strip(x[1])).filter((t) => /מקווה|מעיין|אפרידר|ברנע|רמת|פארק|[א-ת]{3,}/.test(t)).pop();
    const phone = before.match(/0\d[-\s]?\d{7}|0\d{2}[-\s]?\d{6,7}/)?.[0];
    out.push(mk('council:ashkelon:mikvah', `ashk-${i++}-${lat.toFixed(4)}`, 'https://www.mdas.org.il/ניווט-לסניפי-מקוואות/', 'council-public', {
      name: heading || `מקווה אשקלון ${i}`, city: 'אשקלון', phone: normPhone(phone) ?? null, gender: 'נשים', location: { latitude: lat, longitude: lng },
    }));
  }
  return out;
}

// --- text + geo matching vs live 556 (+ gov 606) ----------------------------
const sp = (s: string): string => s.replace(/["'׳״’”`.,()\[\]\-]/g, ' ').replace(/\s+/g, ' ').trim();
const normCity = (s: string | undefined): string => sp(String(s ?? ''));
const normName = (s: string | undefined): string => sp(String(s ?? '').replace(/מקוואות|מקואות|מקווה|מקוה|נשים|גברים|כלים|טהרת/g, ' '));
const digits = (s: string | null | undefined): string => { const d = String(s ?? '').replace(/\D/g, ''); return d.length > 10 ? d.slice(-10) : d; };
function addr(a: string | null | undefined, city: string): { house: string | null; toks: Set<string> } { let s = sp(String(a ?? '')); for (const c of normCity(city).split(' ')) s = s.split(' ').filter((t) => t !== c).join(' '); let house: string | null = null; const toks = new Set<string>(); for (const t of s.split(/\s+/).filter(Boolean)) { if (/^\d+/.test(t)) { if (!house) house = t.replace(/\D/g, ''); } else if (t.length >= 2) toks.add(t); } return { house, toks }; }
const jac = (a: Set<string>, b: Set<string>): number => { if (!a.size || !b.size) return 0; let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i); };
const metersOf = (a: GeoPoint, b: GeoPoint): number => { const R = (d: number) => d * Math.PI / 180; const dLat = R(b.latitude - a.latitude), dLng = R(b.longitude - a.longitude); const h = Math.sin(dLat / 2) ** 2 + Math.cos(R(a.latitude)) * Math.cos(R(b.latitude)) * Math.sin(dLng / 2) ** 2; return 2 * 6371000 * Math.asin(Math.sqrt(h)); };

interface Live { id: string; name: string; cityId: string; address?: string; phone?: string; location?: GeoPoint; locationPrecision?: string; openingHours?: string; mikvehGender?: string; }
const empty = (v: unknown): boolean => v == null || String(v).trim() === '';
type Cls = 'exact_match' | 'probable_match' | 'new_record' | 'enrichment_candidate' | 'manual_review';

function classify(inc: Incoming, byCity: Map<string, Live[]>, coord: Live[]): { c: Cls; conf: number; match: Live | null; tier: string; enrich: string[] } {
  let best: { l: Live; conf: number; tier: string } | null = null;
  const take = (l: Live, conf: number, tier: string) => { if (!best || conf > best.conf) best = { l, conf, tier }; };
  for (const l of byCity.get(normCity(inc.city)) ?? []) {
    const a1 = addr(inc.address, inc.city), a2 = addr(l.address, l.cityId); const ss = jac(a1.toks, a2.toks); const houseEq = !!a1.house && a1.house === a2.house;
    const phoneEq = digits(inc.phone).length >= 9 && digits(inc.phone) === digits(l.phone);
    const nameEq = normName(inc.record.name).length >= 2 && normName(inc.record.name) === normName(l.name);
    if (phoneEq && (ss >= 0.5 || nameEq)) take(l, 0.95, 'phone+context'); else if (ss >= 0.6 && houseEq) take(l, 0.9, 'address-exact'); else if (ss >= 0.5) take(l, 0.78, 'address-partial'); else if (phoneEq) take(l, 0.72, 'phone'); else if (nameEq) take(l, 0.7, 'name');
  }
  if (inc.location) for (const l of coord) { if (!l.location) continue; const dM = metersOf(inc.location, l.location); if (dM > 400) continue; const ns = jac(new Set(normName(inc.record.name).split(' ')), new Set(normName(l.name).split(' '))); if (dM <= 120 && ns >= 0.4) take(l, 0.92, 'coords<=120m'); else if (dM <= 60) take(l, 0.82, 'coords<=60m'); }
  if (!best) return { c: 'new_record', conf: 0.85, match: null, tier: 'no-match', enrich: [] };
  const b = best as { l: Live; conf: number; tier: string };
  const ef: string[] = [];
  if (inc.location && b.l.locationPrecision !== 'address' && (!b.l.location || b.l.locationPrecision === 'city')) ef.push('coordinates');
  if (empty(b.l.phone) && !empty(inc.phone)) ef.push('phone');
  if (empty(b.l.mikvehGender) && !empty(inc.gender)) ef.push('gender');
  let c: Cls; if (b.conf >= 0.9) c = ef.length ? 'enrichment_candidate' : 'exact_match'; else if (b.conf >= 0.7) c = ef.length ? 'enrichment_candidate' : 'probable_match'; else c = 'manual_review';
  return { c, conf: b.conf, match: b.l, tier: b.tier, enrich: ef };
}

async function run(): Promise<void> {
  const HOLON = 'https://services2.arcgis.com/cjDo9oPmimdHxumn/arcgis/rest/services/Shilat/FeatureServer/4';
  const LOD = 'https://services2.arcgis.com/rY5uI5cxAq4qEyXH/arcgis/rest/services/מוסדות_ציבור/FeatureServer/1';
  const sources: { key: string; name: string; coords: boolean; fn: () => Promise<Incoming[]> }[] = [
    { key: 'jerusalem', name: 'המועצה הדתית ירושלים (JSON API)', coords: true, fn: fetchJerusalem },
    { key: 'holon-gis', name: 'עיריית חולון — GIS (מקוואות)', coords: true, fn: () => fetchArcgisMikvah('gis:holon:mikvaot', 'חולון', HOLON, "Inst_Type='מקווה'", { name: ['Name'], address: ['Address', 'Street'], phone: ['Telephone1', 'Telephone2'] }) },
    { key: 'lod-gis', name: 'עיריית לוד — GIS (מקוואות)', coords: true, fn: () => fetchArcgisMikvah('gis:lod:mikvaot', 'לוד', LOD, "תת_קטגוריה='מקווה'", { name: ['name'] }) },
    // Ashkelon (mdas.org.il) EXCLUDED from import: 9 valid Waze coords confirmed,
    // but the Elementor card structure has no clean heading near the link → regex
    // name-extraction is unreliable. Catalogued for a targeted parser/browser pass.
  ];
  void fetchAshkelon; // referenced to keep the fetcher available for a future targeted parse
  const incoming: Incoming[] = [];
  const srcResults: { key: string; name: string; coords: boolean; ok: boolean; count: number; error?: string }[] = [];
  for (const s of sources) {
    try { const r = await s.fn(); incoming.push(...r); srcResults.push({ key: s.key, name: s.name, coords: s.coords, ok: true, count: r.length }); console.log(`● ${s.name}: ${r.length}`); }
    catch (e) { srcResults.push({ key: s.key, name: s.name, coords: s.coords, ok: false, count: 0, error: (e as Error).message }); console.warn(`✗ ${s.name}: ${(e as Error).message}`); }
    await sleep(600);
  }

  // reference pool: live 556 + full gov 606
  const live = readJson<Live[]>(join(GEN, 'places.osm.json')).filter((p: any) => p.type === 'mikveh');
  const byCity = new Map<string, Live[]>(); const add = (l: Live) => { const k = normCity(l.cityId); (byCity.get(k) ?? byCity.set(k, []).get(k)!).push(l); };
  for (const l of live) add(l);
  for (const g of readJson<any[]>(join(OUT, 'mikvahs.normalized.json'))) add({ id: g.sourceId, name: g.name, cityId: g.city ?? '', address: g.address, phone: g.phone, openingHours: g.openingHours });
  const coord = live.filter((l) => l.location);

  const analysis = incoming.map((inc) => { const r = classify(inc, byCity, coord); return { sourceKey: inc.sourceKey, license: inc.license, name: inc.record.name, city: inc.city, address: inc.address, phone: inc.phone, hasCoords: inc.location != null, classification: r.c, confidence: Number(r.conf.toFixed(2)), matchedLiveId: r.match?.id ?? null, matchTier: r.tier, enrichableFields: r.enrich }; });

  const cnt = (k: Cls) => analysis.filter((a) => a.classification === k).length;
  const newByCity: Record<string, number> = {}; for (const a of analysis) if (a.classification === 'new_record') newByCity[a.city] = (newByCity[a.city] ?? 0) + 1;
  const cov = (() => { const n = incoming.length || 1; const pct = (f: (i: Incoming) => unknown) => Math.round((incoming.filter((i) => { const v = f(i); return v != null && String(v).trim() !== ''; }).length / n) * 100); return { name: pct((i) => i.record.name), city: pct((i) => i.city), address: pct((i) => i.address), phone: pct((i) => i.phone), coordinates: pct((i) => i.location), gender: pct((i) => i.gender) }; })();
  const newCoord = analysis.filter((a) => a.classification === 'new_record' && a.hasCoords).length;

  const catalog = {
    generatedNote: 'PHASE 18 — official/open coordinate-bearing mikveh sources. Dry-run; no DB write/publish/rebuild. Commercial aggregators NOT used.',
    importedSources: srcResults,
    addressOnlyOfficialBacklog: [
      { source: 'council:ashkelon (mdas.org.il)', count: 9, coords: true, status: 'VERIFIED — 9 Waze lat/lng confirmed, but Elementor card name-parse unreliable via regex → targeted parser or browser extraction (agent already cleanly read 5/9). High value (coords).' },
      { source: 'council:tel-aviv (rabanut.co.il)', count: 19, coords: false, status: 'verified, address-only → geocode before import' },
      { source: 'council:beit-shemesh (rabanutbs.co.il)', count: 10, coords: false, status: 'verified, א.ש בינה CMS (reuse adapter), bot-blocked → browser fetch + geocode' },
      { source: 'council:kiryat-gat (mdkg.org.il)', count: null, coords: false, status: 'Next.js CSR → needs headless or internal API' },
      { source: 'Phase-16 councils (Bat Yam/Golan/Netivot/Rehovot/Menashe/Mazkeret)', count: 37, coords: false, status: 'extracted, address-only → geocode' },
      { source: 'gush-etzion (baitisraeli.co.il)', count: 18, coords: false, status: 'WB regional council table; confirm WB scope' },
    ],
  };
  const summary = {
    generatedNote: 'PHASE 18 DRY-RUN — no DB write, no publish, no rebuild. Compared against live 556 + full gov 606.',
    sourcesAttempted: srcResults.length, sourcesSuccessful: srcResults.filter((r) => r.ok).length,
    recordsExtracted: incoming.length,
    classification: { exact_match: cnt('exact_match'), probable_match: cnt('probable_match'), new_record: cnt('new_record'), enrichment_candidate: cnt('enrichment_candidate'), manual_review: cnt('manual_review') },
    trulyNewMikvehs: cnt('new_record'), enrichmentOpportunities: cnt('enrichment_candidate'), duplicates: cnt('exact_match') + cnt('probable_match'), manualReview: cnt('manual_review'),
    fieldCoverage: cov, newByCity, bySource: srcResults.map((r) => ({ ...r, new: analysis.filter((a) => a.sourceKey.includes(r.key === 'holon-gis' ? 'holon' : r.key === 'lod-gis' ? 'lod' : r.key) && a.classification === 'new_record').length })),
    liveMikvehBefore: live.length, estimatedTotalAfterPhase: live.length + cnt('new_record'),
    recommendedFirstWriteBatch: { coordBearingNew: newCoord, note: 'coordinate-bearing new records are write-ready (additive append, like Phase-16c). Address-only sources in the catalog need geocoding first.' },
    dryRun: true, liveDataTouched: false, publishPerformed: false, rebuildTouched: false,
  };

  writeFileSync(join(OUT, 'phase18-source-catalog.json'), JSON.stringify(catalog, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase18-preview.json'), JSON.stringify(incoming.map((i) => ({ ...i.record, _sourceLicense: i.license })), null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase18-merge-analysis.json'), JSON.stringify(analysis, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase18-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('\n=== Phase 18 (dry-run) ===');
  console.log(`sources ${summary.sourcesSuccessful}/${summary.sourcesAttempted} | extracted ${incoming.length}`);
  console.log(`new=${cnt('new_record')} enrich=${cnt('enrichment_candidate')} exact=${cnt('exact_match')} probable=${cnt('probable_match')} manual=${cnt('manual_review')}`);
  console.log(`est total after: ${live.length} + ${cnt('new_record')} = ${live.length + cnt('new_record')} | coord-bearing new (write-ready): ${newCoord}`);
}

if (isMain(import.meta.url)) void run();
