/**
 * Ashkelon Religious Council (mdas.org.il) — DEDICATED mikvah parser (DRY-RUN).
 *
 * The page is an Elementor layout: each mikvah is a HEADING (the name) followed
 * by a card body with `כתובת המקוה:` (address), `טלפון במקוה:` (phone),
 * `שם המטבילה:` (attendant), `מקוה כלים:` (vessel flag), `נגישות:` (accessibility),
 * and a Waze link with ll=lat,lng. The generic Phase-18 parser failed because it
 * grabbed the "נגישות:" text as the name; this parser splits by heading and pairs
 * each NAME with its own card → correct name/address/phone/coords.
 *
 * Normalizes to type 'mikveh', classifies vs the live 602 (+ gov 606), excludes
 * duplicates, and emits an apply preview. NO DB write, NO publish, NO rebuild.
 *
 * Run:  node importers/mikvahs/ashkelon-import.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isInIsrael, isMain } from '../shared/utils.ts';
import { makeRecordId, type GeoPoint, type NormalizedImportRecord } from '../unified/schema/normalized-record.ts';
import type { Place } from '../../src/types/place.ts';
import { itmToWgs84 } from '../arcgis/itm.ts';

/** Ashkelon city bbox — a GovMap geocode must land inside it to be accepted. */
const ASHK_BBOX = { latMin: 31.60, latMax: 31.73, lngMin: 34.52, lngMax: 34.63 };

/**
 * Reliable address-level geocode via GovMap (es.govmap.gov.il) — the official
 * Israeli address database. Accepts ONLY an exact ADDR_V1 address result in the
 * right city, converts ITM→WGS84, and validates it falls inside the Ashkelon bbox.
 * Returns null on anything less (so low-confidence stays excluded).
 */
async function govmapGeocode(query: string, cityName: string): Promise<{ loc: GeoPoint; label: string } | null> {
  let d: any;
  try { d = await (await fetch(`https://es.govmap.gov.il/TldSearch/api/DetailsByQuery?query=${encodeURIComponent(query)}&lyrs=257&gid=govmap`, { headers: { 'User-Agent': 'karov-kosher-app/1.0', Accept: 'application/json' } })).json(); }
  catch { return null; }
  const a = d?.data?.ADDRESS?.[0];
  if (!a || a.DescLayerID !== 'ADDR_V1' || a.ResultType !== 1) return null;       // must be an exact address match
  if (!String(a.ResultLable ?? '').includes(cityName)) return null;              // must be the right city
  const w = itmToWgs84(Number(a.X), Number(a.Y));
  if (w.latitude == null || w.longitude == null) return null;
  const loc = { latitude: w.latitude, longitude: w.longitude };
  if (loc.latitude < ASHK_BBOX.latMin || loc.latitude > ASHK_BBOX.latMax || loc.longitude < ASHK_BBOX.lngMin || loc.longitude > ASHK_BBOX.lngMax) return null; // must be inside the city
  return { loc, label: String(a.ResultLable) };
}

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'output');
const GEN = join(HERE, '..', '..', 'src', 'data', 'generated');
const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const NOW = new Date().toISOString().slice(0, 10);
const UA = 'Mozilla/5.0 (karov-kosher-app; mikvah import; non-commercial)';
const URL = 'https://www.mdas.org.il/ניווט-לסניפי-מקוואות/';

const strip = (s: string): string => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/\s+/g, ' ').trim();
const normPhone = (s: string | undefined): string | undefined => { const d = String(s ?? '').replace(/\D/g, ''); if (d.length === 10 && d[0] === '0') return d; if (d.length === 9 && d[0] !== '0') return '0' + d; return d.length >= 9 ? d : undefined; };

interface AshRec { name: string; address: string | null; phone: string | null; attendant: string | null; hours: string | null; gender: string; hasVessel: boolean; status: string | null; location: GeoPoint | null; geocoded?: { source: string; label: string } | null; }

/**
 * Parse the mikvah cards: split by Elementor headings; a card is a mikvah ONLY if
 * its body carries the mikvah-specific label "כתובת המקוה" (this excludes footer
 * headings like "הצהרת נגישות"/"צור קשר" that happen to sit near a Waze link).
 * The Waze link is OPTIONAL — a mikvah without one is captured address-only.
 */
function parseAshkelon(html: string): AshRec[] {
  const heads = [...html.matchAll(/class="elementor-heading-title[^"]*"[^>]*>([\s\S]*?)<\/[a-z0-9]+>/gi)].map((m) => ({ name: strip(m[1]), idx: m.index ?? 0 }));
  const out: AshRec[] = [];
  for (let i = 0; i < heads.length; i++) {
    const body = html.slice(heads[i].idx, heads[i + 1]?.idx ?? html.length);
    if (!/כתובת\s*המקוה/.test(strip(body))) continue; // not a mikvah card
    const waze = body.match(/waze\.com\/ul\?ll=([0-9.]+)%2C([0-9.]+)/);
    let location: GeoPoint | null = null;
    if (waze) { const lat = Number(waze[1]), lng = Number(waze[2]); if (isInIsrael({ latitude: lat, longitude: lng })) location = { latitude: lat, longitude: lng }; }
    const text = strip(body);
    const after = (label: RegExp): string | null => {
      const m = text.match(label);
      if (!m) return null;
      const v = text.slice((m.index ?? 0) + m[0].length).split(/טלפון במקוה|שם המטבילה|מקוה כלים|נגישות|כתובת המקוה|בית שימוש/)[0].trim();
      return v || null;
    };
    const address = after(/כתובת המקוה:\s*/);
    const phone = normPhone(text.match(/טלפון במקוה:\s*(0\d[-\s]?\d{6,8})/)?.[1] ?? text.match(/0\d[-\s]?\d{7}/)?.[0]) ?? null;
    const attRaw = after(/שם המטבילה:\s*/);
    const attendant = attRaw ? attRaw.replace(/\d[\d\s-]{6,}/g, '').replace(/[‭‬]/g, '').trim() || null : null;
    const hasVessel = /מקוה כלים:\s*יש/.test(text);
    const status = /שיפוץ/.test(heads[i].name) || /בשיפוץ/.test(text) ? 'closed-for-renovation' : null;
    out.push({ name: heads[i].name, address, phone, attendant, hours: null, gender: 'נשים', hasVessel, status, location });
  }
  return out;
}

// --- normalize + matching ---------------------------------------------------
const sp = (s: string): string => s.replace(/["'׳״’”`.,()\[\]\-]/g, ' ').replace(/\s+/g, ' ').trim();
const normCity = (s: string | undefined): string => sp(String(s ?? ''));
const normName = (s: string | undefined): string => sp(String(s ?? '').replace(/מקוואות|מקואות|מקווה|מקוה|נשים|גברים|כלים|טהרת/g, ' '));
const digits = (s: string | null | undefined): string => { const d = String(s ?? '').replace(/\D/g, ''); return d.length > 10 ? d.slice(-10) : d; };
const meters = (a: GeoPoint, b: GeoPoint): number => { const R = (d: number) => d * Math.PI / 180; const dLat = R(b.latitude - a.latitude), dLng = R(b.longitude - a.longitude); const h = Math.sin(dLat / 2) ** 2 + Math.cos(R(a.latitude)) * Math.cos(R(b.latitude)) * Math.sin(dLng / 2) ** 2; return 2 * 6371000 * Math.asin(Math.sqrt(h)); };
const jac = (a: Set<string>, b: Set<string>): number => { if (!a.size || !b.size) return 0; let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i); };

interface Live { id: string; name: string; cityId: string; address?: string; phone?: string; location?: GeoPoint; locationPrecision?: string; }
type Cls = 'exact_match' | 'probable_match' | 'new_record' | 'enrichment_candidate' | 'manual_review';

async function run(): Promise<void> {
  const html = await (await fetch(URL, { headers: { 'User-Agent': UA } })).text();
  const parsed = parseAshkelon(html);
  console.log(`parsed ${parsed.length} Ashkelon mikvah cards`);

  // Resolve coordless mikvahs via GovMap (reliable, official address DB). Only an
  // exact in-city address match is accepted → those records become write-ready.
  for (const r of parsed) {
    if (r.location || !r.address) continue;
    const gc = await govmapGeocode(`${r.address}, אשקלון`, 'אשקלון');
    if (gc) { r.location = gc.loc; r.geocoded = { source: 'govmap-ADDR_V1', label: gc.label }; console.log(`  geocoded "${r.name}" → ${gc.loc.latitude.toFixed(5)},${gc.loc.longitude.toFixed(5)} (GovMap: ${gc.label})`); }
    else console.log(`  geocode FAILED/low-confidence for "${r.name}" (${r.address}) — kept excluded`);
  }

  // normalized records
  const records: { rec: NormalizedImportRecord; src: AshRec }[] = parsed.map((r) => {
    const srid = `ashkelon-${normName(r.name).slice(0, 16)}-${r.location ? r.location.latitude.toFixed(4) : 'noloc'}`;
    const extra: Record<string, unknown> = { sourceLicense: 'council-public', gender: r.gender };
    if (r.attendant) extra.attendant = r.attendant;
    if (r.hasVessel) extra.hasVessel = true;
    if (r.status) extra.status = r.status;
    const rec: NormalizedImportRecord = {
      id: makeRecordId('council:ashkelon:mikvah', srid), type: 'mikveh', name: r.name,
      ...(r.address ? { address: r.address } : {}), cityHint: 'אשקלון',
      ...(r.location ? { location: r.location } : {}), ...(r.phone ? { phone: r.phone } : {}), tags: [`gender:${r.gender}`],
      confidence: 'medium', provenance: { sourceId: 'council:ashkelon:mikvah', adapterId: 'ashkelon-dedicated-v1', sourceRecordId: srid, sourceUrl: URL, fetchedAt: NOW }, extra,
    };
    return { rec, src: r };
  });

  // reference pool: live 602 + gov 606
  const live = readJson<Live[]>(join(GEN, 'places.osm.json')).filter((p: any) => p.type === 'mikveh');
  const byCity = new Map<string, Live[]>(); const add = (l: Live) => { const k = normCity(l.cityId); (byCity.get(k) ?? byCity.set(k, []).get(k)!).push(l); };
  for (const l of live) add(l);
  for (const g of readJson<any[]>(join(OUT, 'mikvahs.normalized.json'))) add({ id: g.sourceId, name: g.name, cityId: g.city ?? '', address: g.address, phone: g.phone });
  const liveCoord = live.filter((l) => l.location);

  const analysis = records.map(({ rec, src }) => {
    const cands = byCity.get('אשקלון') ?? [];
    let best: { l: Live; conf: number; tier: string } | null = null;
    const take = (l: Live, conf: number, tier: string) => { if (!best || conf > best.conf) best = { l, conf, tier }; };
    for (const l of cands) {
      const ss = jac(new Set(sp(src.address ?? '').split(' ')), new Set(sp(l.address ?? '').split(' ')));
      const phoneEq = digits(src.phone).length >= 9 && digits(src.phone) === digits(l.phone);
      const nameEq = normName(rec.name).length >= 2 && normName(rec.name) === normName(l.name);
      if (phoneEq && (ss >= 0.4 || nameEq)) take(l, 0.95, 'phone+context'); else if (ss >= 0.5) take(l, 0.78, 'address'); else if (phoneEq) take(l, 0.72, 'phone'); else if (nameEq) take(l, 0.7, 'name');
    }
    if (src.location) for (const l of liveCoord) { if (!l.location) continue; const dM = meters(src.location, l.location); if (dM > 300) continue; const ns = jac(new Set(normName(rec.name).split(' ')), new Set(normName(l.name).split(' '))); if (dM <= 120 && ns >= 0.4) take(l, 0.92, 'coords<=120m'); else if (dM <= 60) take(l, 0.82, 'coords<=60m'); }
    let c: Cls, conf: number, tier: string, match: Live | null, enrich: string[] = [];
    if (!best) { c = 'new_record'; conf = 0.85; tier = 'no-match'; match = null; }
    else { const b = best as { l: Live; conf: number; tier: string }; match = b.l; tier = b.tier; conf = b.conf;
      if (src.location && b.l.locationPrecision !== 'address') enrich.push('coordinates');
      if (!b.l.phone && src.phone) enrich.push('phone');
      c = b.conf >= 0.9 ? (enrich.length ? 'enrichment_candidate' : 'exact_match') : b.conf >= 0.7 ? (enrich.length ? 'enrichment_candidate' : 'probable_match') : 'manual_review';
    }
    return { name: rec.name, address: src.address, phone: src.phone, attendant: src.attendant, status: src.status, hasCoords: src.location != null, classification: c, confidence: Number(conf.toFixed(2)), matchedLiveId: match?.id ?? null, matchTier: tier, enrichableFields: enrich };
  });

  // --- write-ready: new_record + valid coords, dedup vs live + within batch ---
  const excluded: { name: string; reason: string }[] = [];
  const wrRecs: { rec: NormalizedImportRecord; src: AshRec }[] = [];
  records.forEach(({ rec, src }, i) => {
    if (analysis[i].classification !== 'new_record') { excluded.push({ name: rec.name, reason: `${analysis[i].classification} (matched ${analysis[i].matchedLiveId})` }); return; }
    if (!src.location) { excluded.push({ name: rec.name, reason: 'no Waze coordinates (address-only) → needs geocoding before write' }); return; }
    const nearLive = live.filter((l) => l.location).find((l) => meters(src.location!, l.location!) <= 100);
    if (nearLive) { excluded.push({ name: rec.name, reason: `duplicate of live ${nearLive.id}` }); return; }
    const twin = wrRecs.find((k) => k.src.location && meters(k.src.location, src.location!) <= 40);
    if (twin) { excluded.push({ name: rec.name, reason: `within-batch duplicate of ${twin.rec.name}` }); return; }
    wrRecs.push({ rec, src });
  });

  const existingIds = new Set(readJson<any[]>(join(GEN, 'places.osm.json')).map((p) => p.id));
  const writeReady: Place[] = wrRecs.map(({ rec, src }) => {
    const loc = src.location!;
    const place: Place = {
      id: `mikveh-ashkelon-${loc.latitude.toFixed(5)}_${loc.longitude.toFixed(5)}`,
      name: rec.name, type: 'mikveh', cityId: 'אשקלון', address: src.address ?? 'אשקלון', location: loc, source: 'seed',
    };
    if (src.phone) place.phone = src.phone;
    place.mikvehGender = 'נשים';
    if (src.attendant) place.attendant = src.attendant;
    if (src.geocoded) place.locationPrecision = 'address'; // GovMap exact address geocode (vs native Waze)
    place.sourceUrl = URL;
    place.sourceName = 'המועצה הדתית אשקלון';
    place.extra = { license: 'council-public', attribution: 'המועצה הדתית אשקלון (mdas.org.il)', provenance: { sourceId: 'council:ashkelon:mikvah', sourceRecordId: rec.provenance.sourceRecordId, fetchedAt: NOW }, ...(src.geocoded ? { geocodeSource: src.geocoded.source, geocodeLabel: src.geocoded.label } : {}), ...(src.hasVessel ? { hasVessel: true } : {}), ...(src.status ? { status: src.status } : {}) };
    return place;
  });
  const collisions = writeReady.filter((p) => existingIds.has(p.id)).map((p) => p.id);
  const dupAppIds = writeReady.map((p) => p.id).filter((id, i, a) => a.indexOf(id) !== i);

  const liveCount = live.length;
  const cnt = (k: Cls) => analysis.filter((a) => a.classification === k).length;
  const summary = {
    generatedNote: 'ASHKELON dedicated parser — DRY-RUN. No DB write, no publish, no rebuild. Compared vs live 602 + gov 606.',
    source: { name: 'המועצה הדתית אשקלון', url: URL, license: 'council-public', platform: 'WordPress/Elementor (cards + Waze)' },
    parsed: parsed.length,
    classification: { exact_match: cnt('exact_match'), probable_match: cnt('probable_match'), new_record: cnt('new_record'), enrichment_candidate: cnt('enrichment_candidate'), manual_review: cnt('manual_review') },
    writeReadyIncluded: writeReady.length,
    excluded: excluded.length, excludedDetail: excluded,
    duplicatesFound: excluded.filter((e) => e.reason.includes('duplicate')).length,
    idCollisions: collisions.length, duplicateAppIds: dupAppIds.length,
    fieldCoverage: { name: 100, address: Math.round(parsed.filter((r) => r.address).length / parsed.length * 100), phone: Math.round(parsed.filter((r) => r.phone).length / parsed.length * 100), attendant: Math.round(parsed.filter((r) => r.attendant).length / parsed.length * 100), coordinates: 100 },
    notes: parsed.filter((r) => r.status).map((r) => `${r.name}: ${r.status}`),
    finalRecommendedWriteCount: (collisions.length || dupAppIds.length) ? 0 : writeReady.length,
    liveMikvehBefore: liveCount, estimatedTotalAfterWrite: liveCount + ((collisions.length || dupAppIds.length) ? 0 : writeReady.length),
    rollbackPlan: ['Backup places.osm.json → places.osm.pre-ashkelon.backup.json (+cities) before write', 'Additive append only; rollback = restore backups; do NOT run rebuildAppDataset'],
    dryRun: true, liveDataTouched: false, publishPerformed: false, rebuildTouched: false,
  };

  writeFileSync(join(OUT, 'ashkelon-mikveh-preview.json'), JSON.stringify(records.map((x) => ({ ...x.rec, _src: x.src })), null, 2), 'utf8');
  writeFileSync(join(OUT, 'ashkelon-mikveh-merge-analysis.json'), JSON.stringify(analysis, null, 2), 'utf8');
  writeFileSync(join(OUT, 'ashkelon-mikveh-write-ready-preview.json'), JSON.stringify(writeReady, null, 2), 'utf8');
  writeFileSync(join(OUT, 'ashkelon-mikveh-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('=== Ashkelon dedicated parser (dry-run) ===');
  console.log(`parsed ${parsed.length} | new=${cnt('new_record')} enrich=${cnt('enrichment_candidate')} exact=${cnt('exact_match')} probable=${cnt('probable_match')} manual=${cnt('manual_review')}`);
  console.log(`write-ready ${writeReady.length} | excluded ${excluded.length} (dups ${summary.duplicatesFound}) | id collisions ${collisions.length}`);
  console.log(`est total after: ${liveCount} + ${summary.finalRecommendedWriteCount} = ${summary.estimatedTotalAfterWrite}`);
}

if (isMain(import.meta.url)) void run();
