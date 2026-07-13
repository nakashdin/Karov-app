/**
 * Phase 21 — Tier-1 haredi cities (DRY-RUN, additive recon).
 *
 * Four official council/municipal sources (all server-rendered, parsed during
 * recon 2026-06-22) + an Ashdod-continue check. This importer carries the
 * verified extracted records (one per distinct building, richest gender row),
 * resolves ADDRESS-LEVEL coords (GovMap ADDR_V1 — none of these sources publish
 * coordinates), dedups vs the live 615, and produces write-ready records.
 *
 * Sources & parse strategy (see output/phase21-source-catalog.json):
 *  1. בני ברק        bnei-brak.muni.il/mikvahs — single municipal table
 *     (name,address | phones). 12 women's rows. NO coords. ~11 already live.
 *  2. מודיעין עילית  modil.org.il/רשימת-המקוואות — 4 tables (women/men-muni/
 *     men-other/keilim); ~12 distinct buildings. 0 live. NO coords.
 *  3. ביתר עילית     betar-illit.muni.il/מקוואות — א.ש בינה table (name+addr |
 *     phone | chabad). 8 women's. 1 live. NO coords.
 *  4. אלעד           elad.muni.il/.../Religion.aspx — SharePoint lists
 *     (women 5 + men 3 → 6 buildings). 1 live. NO coords.
 *  5. אשדוד (המשך)   ashdodmd.org — VERIFIED EXHAUSTED: no men's/keilim/extra
 *     quarters in text (image-only). 0 additional records.
 *
 * COORDS POLICY (unchanged): write-ready only with an ADDRESS-LEVEL coordinate
 * — GovMap ADDR_V1 (exact, right city, in-bbox). NO settlement-level, NO
 * Nominatim. Compared vs the live 615. NO DB write, NO publish, NO rebuild.
 *
 * Run:  node importers/mikvahs/phase21-import.ts
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

type Bbox = { latMin: number; latMax: number; lngMin: number; lngMax: number };
const inBbox = (p: GeoPoint, b: Bbox): boolean =>
  p.latitude >= b.latMin && p.latitude <= b.latMax && p.longitude >= b.lngMin && p.longitude <= b.lngMax;
const normPhone = (s: string | null | undefined): string | undefined => {
  const d = String(s ?? '').replace(/\D/g, '');
  if (d.length === 10 && d[0] === '0') return d;
  if (d.length === 9 && d[0] !== '0') return '0' + d;
  return d.length >= 9 ? d : undefined;
};

interface CityCfg { slug: string; city: string; bbox: Bbox; sourceName: string; sourceUrl: string; }
const CITIES: Record<string, CityCfg> = {
  bneibrak: { slug: 'bnei-brak', city: 'בני ברק', bbox: { latMin: 32.06, latMax: 32.11, lngMin: 34.81, lngMax: 34.86 }, sourceName: 'עיריית בני ברק — מחלקת מקוואות', sourceUrl: 'https://www.bnei-brak.muni.il/mikvahs/' },
  modiinillit: { slug: 'modiin-illit', city: 'מודיעין עילית', bbox: { latMin: 31.91, latMax: 31.95, lngMin: 35.01, lngMax: 35.07 }, sourceName: 'עיריית מודיעין עילית', sourceUrl: 'https://www.modil.org.il/רשימת-המקוואות/' },
  beitarillit: { slug: 'beitar-illit', city: 'ביתר עילית', bbox: { latMin: 31.68, latMax: 31.72, lngMin: 35.09, lngMax: 35.14 }, sourceName: 'עיריית ביתר עילית', sourceUrl: 'https://www.betar-illit.muni.il/מקוואות/' },
  elad: { slug: 'elad', city: 'אלעד', bbox: { latMin: 32.03, latMax: 32.07, lngMin: 34.93, lngMax: 34.97 }, sourceName: 'עיריית אלעד — מחלקת דת', sourceUrl: 'https://www.elad.muni.il/Departments/Pages/Religion.aspx' },
};

interface Rec {
  cityKey: string; name: string; address: string; geo: string; phone: string | null;
  hours: string | null; attendant: string | null; accessibility: string | null;
  gender: string | null; location: GeoPoint | null; coordSource: string; pageUrl: string;
}
const r = (cityKey: string, name: string, address: string, geo: string, phone: string | null, hours: string | null, attendant: string | null, accessibility: string | null, gender: string | null, pageUrl: string): Rec =>
  ({ cityKey, name, address, geo, phone: normPhone(phone) ?? null, hours, attendant, accessibility, gender, location: null, coordSource: 'pending', pageUrl });

// --- Recon-extracted source records (verified 2026-06-22; 1 per distinct building) ---
const SRC: Rec[] = [
  // ===== בני ברק — bnei-brak.muni.il/mikvahs (12 women's; ~11 already live) =====
  r('bneibrak', "מקווה ויז'ניץ", 'רבינא 14, בני ברק', 'רבינא 14, בני ברק', '035744870', null, null, null, 'נשים', 'https://www.bnei-brak.muni.il/mikvahs/'),
  r('bneibrak', 'מקווה זכרון מאיר', 'חפץ חיים 7, בני ברק', 'חפץ חיים 7, בני ברק', '036187479', null, null, null, 'נשים', 'https://www.bnei-brak.muni.il/mikvahs/'),
  r('bneibrak', 'מקווה מי נחת', 'אחיה השילוני 4, בני ברק', 'אחיה השילוני 4, בני ברק', '035709617', null, null, null, 'נשים', 'https://www.bnei-brak.muni.il/mikvahs/'),
  r('bneibrak', 'מקווה מרכז', 'קאליש 14, בני ברק', 'קאליש 14, בני ברק', '035794489', null, null, null, 'נשים', 'https://www.bnei-brak.muni.il/mikvahs/'),
  r('bneibrak', 'מקווה נווה אחיעזר', 'נחשוני 28, בני ברק', 'נחשוני 28, בני ברק', '035744869', null, null, null, 'נשים', 'https://www.bnei-brak.muni.il/mikvahs/'),
  r('bneibrak', 'מקווה פרדס כץ', 'דנגור 12, בני ברק', 'דנגור 12, בני ברק', '035790636', null, null, null, 'נשים', 'https://www.bnei-brak.muni.il/mikvahs/'),
  r('bneibrak', 'מקווה קריית הרצוג', 'נויפלד 15, בני ברק', 'נויפלד 15, בני ברק', '036196867', null, null, null, 'נשים', 'https://www.bnei-brak.muni.il/mikvahs/'),
  r('bneibrak', 'מקווה רמת אלחנן', 'אבני נזר 13, בני ברק', 'אבני נזר 13, בני ברק', '035705417', null, null, null, 'נשים', 'https://www.bnei-brak.muni.il/mikvahs/'),
  r('bneibrak', "מקווה שיכון ג'", 'בארי 7, בני ברק', 'בארי 7, בני ברק', '035744868', null, null, null, 'נשים', 'https://www.bnei-brak.muni.il/mikvahs/'),
  r('bneibrak', "מקווה שיכון ה'", 'זבולון המר 13, בני ברק', 'זבולון המר 13, בני ברק', '035794661', null, null, null, 'נשים', 'https://www.bnei-brak.muni.il/mikvahs/'),
  r('bneibrak', 'מקווה סוקולוב', 'אבן שפרוט 4, בני ברק', 'אבן שפרוט 4, בני ברק', '039608182', null, null, null, 'נשים', 'https://www.bnei-brak.muni.il/mikvahs/'),
  r('bneibrak', 'מקווה הסופרים', 'רחוב הסופרים (מתחת לגשר), בני ברק', 'הסופרים, בני ברק', '0533121976', null, null, null, 'נשים', 'https://www.bnei-brak.muni.il/mikvahs/'),

  // ===== מודיעין עילית — modil.org.il (12 distinct buildings; 0 live) =====
  r('modiinillit', 'מקווה נשים מסילת יוסף', 'מסילת יוסף 13, מודיעין עילית', 'מסילת יוסף 13, מודיעין עילית', '089741758', null, "גב' טובים", null, 'נשים', 'https://www.modil.org.il/רשימת-המקוואות/'),
  r('modiinillit', 'מקווה נשים אבני נזר', 'אבני נזר 14, מודיעין עילית', 'אבני נזר 14, מודיעין עילית', '089740156', null, "גב' בן שמחון", null, 'נשים', 'https://www.modil.org.il/רשימת-המקוואות/'),
  r('modiinillit', 'מקווה נשים שדרות יחזקאל', 'שדרות יחזקאל 33, מודיעין עילית', 'יחזקאל 33, מודיעין עילית', '089743656', null, "גב' שמואלי", null, 'נשים', 'https://www.modil.org.il/רשימת-המקוואות/'),
  r('modiinillit', 'מקווה נשים יהודה הנשיא', 'יהודה הנשיא 26 א, מודיעין עילית', 'יהודה הנשיא 26, מודיעין עילית', '089742091', null, "גב' גיאת", null, 'נשים', 'https://www.modil.org.il/רשימת-המקוואות/'),
  r('modiinillit', 'מקווה נשים אלישיב', 'אלישיב 23, מודיעין עילית', 'אלישיב 23, מודיעין עילית', '089740578', null, "גב' תורג'מן", null, 'נשים', 'https://www.modil.org.il/רשימת-המקוואות/'),
  r('modiinillit', 'מקווה נשים נאות הפסגה', 'הריטב"א 4, מודיעין עילית', 'הריטבא 4, מודיעין עילית', '089745035', null, "גב' רוזנבלום", null, 'נשים', 'https://www.modil.org.il/רשימת-המקוואות/'),
  r('modiinillit', 'מקווה נשים חזון דוד', 'חזון דוד 19, מודיעין עילית', 'חזון דוד 19, מודיעין עילית', '089741839', null, "גב' שניר", null, 'נשים', 'https://www.modil.org.il/רשימת-המקוואות/'),
  r('modiinillit', 'מקווה גברים אבני נזר', 'אבני נזר 16, מודיעין עילית', 'אבני נזר 16, מודיעין עילית', null, "א'-ה' בבוקר עד 10:30", 'הרב מרדכי דוד אדלר', null, 'גברים', 'https://www.modil.org.il/רשימת-המקוואות/'),
  r('modiinillit', 'מקווה גברים קהילות יעקב', 'קהילות יעקב 1, מודיעין עילית', 'קהילות יעקב 1, מודיעין עילית', null, "א'-ה' בבוקר עד 10:30", 'הרב מרדכי דוד אדלר', null, 'גברים', 'https://www.modil.org.il/רשימת-המקוואות/'),
  r('modiinillit', "מקווה גברים זכרון דוד", 'שדי חמד 13, מודיעין עילית', 'שדי חמד 13, מודיעין עילית', null, null, null, null, 'גברים', 'https://www.modil.org.il/רשימת-המקוואות/'),
  r('modiinillit', 'מקווה גברים היכל יהושע', 'רשב"י 21, מודיעין עילית', 'רבי שמעון בר יוחאי 21, מודיעין עילית', null, null, null, null, 'גברים', 'https://www.modil.org.il/רשימת-המקוואות/'),
  r('modiinillit', 'מקווה כלים אבני נזר 46', 'אבני נזר 46, מודיעין עילית', 'אבני נזר 46, מודיעין עילית', null, null, null, null, 'כלים', 'https://www.modil.org.il/רשימת-המקוואות/'),

  // ===== ביתר עילית — betar-illit.muni.il/מקוואות (8 women's; 1 live) =====
  r('beitarillit', 'מקווה הבעש"ט', 'הבעש"ט 8, ביתר עילית', 'הבעשט 8, ביתר עילית', '025806059', "א'-ה' עד 22:00 / ליל שבת חצי שעה אחרי הדלקת נרות / מוצ\"ש 22:30", null, null, 'נשים', 'https://www.betar-illit.muni.il/מקוואות/'),
  r('beitarillit', 'מקווה אריאלי', 'אריאלי 3, ביתר עילית', 'אריאלי 3, ביתר עילית', '025808444', "א'-ה' עד 23:00 / ליל שבת חצי שעה אחרי הדלקת נרות / מוצ\"ש 23:00", null, null, 'נשים', 'https://www.betar-illit.muni.il/מקוואות/'),
  r('beitarillit', 'מקווה קנייבסקי', 'קנייבסקי 9, ביתר עילית', 'קנייבסקי 9, ביתר עילית', '025725649', "א'-ה' עד 22:00 / מוצ\"ש 22:30", null, null, 'נשים', 'https://www.betar-illit.muni.il/מקוואות/'),
  r('beitarillit', 'מקווה ברים', 'ברים 7, ביתר עילית', 'ברים 7, ביתר עילית', '025800669', "א'-ה' עד 22:00 / מוצ\"ש 22:30 / שישי הכנות 12:00-13:00", null, null, 'נשים', 'https://www.betar-illit.muni.il/מקוואות/'),
  r('beitarillit', 'מקווה מוצפי', 'מוצפי 35, ביתר עילית', 'מוצפי 35, ביתר עילית', '026507450', "א'-ה' עד 22:00 / מוצ\"ש 22:30", null, null, 'נשים', 'https://www.betar-illit.muni.il/מקוואות/'),
  r('beitarillit', 'מקווה אמרי סופר', 'אמרי סופר 3, ביתר עילית', 'אמרי סופר 3, ביתר עילית', '025824827', "א'-ה' עד 22:00 / מוצ\"ש 22:30", null, null, 'נשים', 'https://www.betar-illit.muni.il/מקוואות/'),
  r('beitarillit', 'מקווה הרב שך', 'הרב שך 80, ביתר עילית', 'הרב שך 80, ביתר עילית', '025488352', "א'-ה' עד 22:00 / מוצ\"ש 22:30", null, null, 'נשים', 'https://www.betar-illit.muni.il/מקוואות/'),
  r('beitarillit', 'מקווה קדושת לוי', 'קדושת לוי, ביתר עילית', 'קדושת לוי, ביתר עילית', '025807722', "א'-ה' עד 23:00 / מוצ\"ש 23:00", 'בתיאום מראש', 'מונגש לבעלי מוגבלויות (בתיאום מראש)', 'נשים', 'https://www.betar-illit.muni.il/מקוואות/'),

  // ===== אלעד — elad.muni.il (6 buildings; 1 live) =====
  r('elad', 'מקווה חוני המעגל', 'חוני המעגל 8, אלעד', 'חוני המעגל 8, אלעד', '039096319', null, 'מלכה יעקובזון', null, 'נשים', 'https://www.elad.muni.il/Departments/Pages/Religion.aspx'),
  r('elad', 'מקווה ניסים גאון', 'ניסים גאון 39, אלעד', 'ניסים גאון 39, אלעד', '039095079', 'חצי שעה לפני השקיעה עד 22:00 חורף / 23:00 קיץ', 'מלכה יעקובזון', 'נגיש', 'נשים', 'https://www.elad.muni.il/Departments/Pages/Religion.aspx'),
  r('elad', 'מקווה בן עוזיאל', 'בן עוזיאל 13, אלעד', 'בן עוזיאל 13, אלעד', '039090513', 'חצי שעה לפני השקיעה עד 22:00 חורף / 23:00 קיץ', 'מלכה יעקובזון', 'נגיש', 'נשים', 'https://www.elad.muni.il/Departments/Pages/Religion.aspx'),
  r('elad', 'מקווה הרי"ף', 'הרי"ף 31, אלעד', 'הריף 31, אלעד', '039325733', 'חצי שעה לפני השקיעה עד 22:00 חורף / 23:00 קיץ', 'מלכה יעקובזון', 'נגיש', 'נשים', 'https://www.elad.muni.il/Departments/Pages/Religion.aspx'),
  r('elad', 'מקווה אבטליון', 'אבטליון 14, אלעד', 'אבטליון 14, אלעד', '039095744', 'חצי שעה לפני השקיעה עד 22:00 חורף / 23:00 קיץ', 'מלכה יעקובזון', 'נגיש + מעלון', 'נשים', 'https://www.elad.muni.il/Departments/Pages/Religion.aspx'),
  r('elad', "מקווה גברים ר' מאיר", "ר' מאיר 17, אלעד", 'מאיר 17, אלעד', null, "א'-ה' 04:00-10:30", null, null, 'גברים', 'https://www.elad.muni.il/Departments/Pages/Religion.aspx'),
];

// Elad חוני המעגל is flagged closed-for-renovation by the council → exclude from write-ready.
const INACTIVE = new Set(['מקווה חוני המעגל']);

// --- GovMap (reliable IL address geocode) -----------------------------------
const sp = (s: string): string => s.replace(/["'׳״’”`.,()\[\]\-–\/\\]/g, ' ').replace(/\s+/g, ' ').trim();
const normCity = (s: string | undefined): string => sp(String(s ?? ''));
async function govmap(query: string, city: string, bbox: Bbox): Promise<{ loc: GeoPoint; label: string } | null> {
  let d: any;
  try {
    d = await (await fetch(`https://es.govmap.gov.il/TldSearch/api/DetailsByQuery?query=${encodeURIComponent(query)}&lyrs=257&gid=govmap`, { headers: { 'User-Agent': BUA, Accept: 'application/json' } })).json();
  } catch { return null; }
  const a = d?.data?.ADDRESS?.[0];
  if (!a || a.DescLayerID !== 'ADDR_V1' || a.ResultType !== 1) return null;
  if (!normCity(String(a.ResultLable ?? '')).includes(normCity(city))) return null;
  const w = itmToWgs84(Number(a.X), Number(a.Y));
  if (w.latitude == null || w.longitude == null) return null;
  const loc = { latitude: w.latitude, longitude: w.longitude };
  if (!isInIsrael(loc) || !inBbox(loc, bbox)) return null;
  return { loc, label: String(a.ResultLable) };
}

// --- matching vs the live 615 -----------------------------------------------
const STOP = /מקוואות|מקואות|מקווה|מקוה|נשים|גברים|כלים|טהרת|טהורים|שכונת|שכון|שיכון|רובע|קרית|קריית|בית|הכנסת|רבי|הרב|מרכז|מרכזי/g;
const nameCore = (s: string | undefined): string[] => sp(String(s ?? '').replace(STOP, ' ')).split(' ').filter((t) => t.length >= 3);
const streetTokens = (addr: string | undefined): { name: string; num: string | null } => {
  const head = String(addr ?? '').split(',')[0].replace(/^(רחוב|רח')\s+/, '').replace(/\(.*?\)/g, ' ');
  const num = head.match(/\b(\d{1,3})\b/)?.[1] ?? null;
  const name = sp(head.replace(/\d+/g, '').replace(/פינת.*$/, ''));
  return { name, num };
};
const meters = (a: GeoPoint, b: GeoPoint): number => {
  const R = (d: number) => (d * Math.PI) / 180;
  const dLat = R(b.latitude - a.latitude), dLng = R(b.longitude - a.longitude);
  const hh = Math.sin(dLat / 2) ** 2 + Math.cos(R(a.latitude)) * Math.cos(R(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(hh));
};
const shareToken = (a: string[], b: string[]): boolean => a.some((t) => b.includes(t));
const streetMatch = (a: { name: string; num: string | null }, b: { name: string; num: string | null }): boolean => {
  if (!a.name || !b.name) return false;
  const an = sp(a.name), bn = sp(b.name);
  const nameHit = an === bn || an.includes(bn) || bn.includes(an);
  return nameHit && (a.num == null || b.num == null || a.num === b.num);
};

async function run(): Promise<void> {
  const live = readJson<any[]>(join(GEN, 'places.osm.json')).filter((p: any) => p.type === 'mikveh');
  const liveCoord = live.filter((l) => l.location);
  const existingIds = new Set(live.map((p) => p.id));
  const cityMatch = (cityId: unknown, city: string): boolean => { const a = sp(String(cityId ?? '')), b = sp(city); return !!a && (a === b || a.includes(b) || b.includes(a)); };
  const liveByCity = (city: string) => live.filter((l) => cityMatch(l.cityId, city) || String(l.address ?? '').includes(city));

  const analysis: any[] = [];
  const survivors: Rec[] = [];

  // Step 1 — dedup vs live by name-core + street (coords differ between sources).
  for (const rec of SRC) {
    const cfg = CITIES[rec.cityKey];
    const cands = liveByCity(cfg.city);
    const recCore = nameCore(rec.name), recSt = streetTokens(rec.address);
    let dup: any = null; let how = '';
    for (const l of cands) {
      const lCore = nameCore(l.name), lSt = streetTokens(l.address);
      if (streetMatch(recSt, lSt)) { dup = l; how = `street "${recSt.name}${recSt.num ? ' ' + recSt.num : ''}"`; break; }
      if (recCore.length && shareToken(recCore, lCore)) { dup = l; how = `name token [${recCore.filter((t) => lCore.includes(t)).join(',')}]`; break; }
    }
    if (dup) analysis.push({ cityKey: rec.cityKey, name: rec.name, address: rec.address, gender: rec.gender, disposition: 'duplicate', reason: `matches live ${dup.id} (${dup.name}) by ${how}`, matchedLiveId: dup.id });
    else survivors.push(rec);
  }

  // Step 2 — resolve ADDRESS-LEVEL coords for survivors (GovMap ADDR_V1 only).
  for (const rec of survivors) {
    const cfg = CITIES[rec.cityKey];
    let gc = await govmap(rec.geo, cfg.city, cfg.bbox);
    await sleep(350);
    if (!gc && /["'׳״]/.test(rec.geo)) { gc = await govmap(sp(rec.geo.split(',')[0]) + ', ' + cfg.city, cfg.city, cfg.bbox); await sleep(350); }
    if (gc) { rec.location = gc.loc; rec.coordSource = 'govmap-ADDR_V1'; }
    else rec.coordSource = rec.geo.match(/\d/) ? 'govmap-no-match' : 'no-house-number';
  }

  // Step 3 — geo-dedup vs live (catches name/street misses) + within-batch collapse + classify.
  const writeReadyKept: Rec[] = [];
  for (const rec of survivors) {
    const cfg = CITIES[rec.cityKey];
    let disposition: string, reason: string, matchedLiveId: string | null = null;
    if (INACTIVE.has(rec.name)) {
      disposition = 'excluded'; reason = 'flagged closed for renovations by the council';
    } else if (!rec.location) {
      disposition = 'excluded'; reason = `no address-level coordinate (${rec.coordSource})`;
    } else {
      const nearLive = liveCoord.find((l) => cityMatch(l.cityId, cfg.city) && meters(rec.location!, l.location) <= 150);
      const st = streetTokens(rec.address);
      const twin = writeReadyKept.find((k) => k.cityKey === rec.cityKey && (streetMatch(streetTokens(k.address), st) || (k.location && meters(k.location, rec.location!) <= 40)));
      if (nearLive) { disposition = 'duplicate'; reason = `geo-duplicate of live ${nearLive.id} (${Math.round(meters(rec.location, nearLive.location))}m)`; matchedLiveId = nearLive.id; }
      else if (twin) { disposition = 'duplicate'; reason = `within-batch same building as "${twin.name}" (gender variant collapsed)`; }
      else { disposition = 'write_ready'; reason = `address-level coordinate (${rec.coordSource}), not a duplicate`; writeReadyKept.push(rec); }
    }
    analysis.push({ cityKey: rec.cityKey, name: rec.name, address: rec.address, geo: rec.geo, phone: rec.phone, gender: rec.gender, accessibility: rec.accessibility, coordSource: rec.coordSource, hasCoords: rec.location != null, location: rec.location, disposition, reason, matchedLiveId });
  }

  // Step 4 — normalize write-ready to Place (additive; provenance kept).
  const writeReady: Place[] = writeReadyKept.map((rec) => {
    const cfg = CITIES[rec.cityKey]; const loc = rec.location!;
    const place: Place = { id: `mikveh-${cfg.slug}-${loc.latitude.toFixed(5)}_${loc.longitude.toFixed(5)}`, name: rec.name, type: 'mikveh', cityId: cfg.city, address: rec.address, location: loc, source: 'seed', locationPrecision: 'address' };
    if (rec.phone) place.phone = rec.phone;
    if (rec.hours) place.openingHours = rec.hours;
    if (rec.gender) place.mikvehGender = rec.gender;
    if (rec.attendant) place.attendant = rec.attendant;
    place.sourceName = cfg.sourceName;
    place.sourceUrl = rec.pageUrl;
    place.extra = { license: 'council-public', coordSource: rec.coordSource, accessibility: rec.accessibility ?? undefined, provenance: { sourceId: `council:${cfg.slug}:mikvah`, sourceUrl: rec.pageUrl, fetchedAt: NOW } };
    return place;
  });
  const collisions = writeReady.filter((p) => existingIds.has(p.id)).map((p) => p.id);
  const dupAppIds = writeReady.map((p) => p.id).filter((id, i, a) => a.indexOf(id) !== i);

  // Carry-over (do NOT write; included only in the accumulated count).
  const carry = (f: string): Place[] => { try { return readJson<Place[]>(join(OUT, f)); } catch { return []; } };
  const phase19 = carry('phase19-write-ready-preview.json');
  const phase20 = carry('phase20-write-ready-preview.json');

  const byCity = (key: string) => ({
    parsed: SRC.filter((s) => s.cityKey === key).length,
    duplicateVsLive: analysis.filter((a) => a.cityKey === key && a.disposition === 'duplicate' && a.matchedLiveId).length,
    withinBatchDup: analysis.filter((a) => a.cityKey === key && a.disposition === 'duplicate' && !a.matchedLiveId).length,
    excluded: analysis.filter((a) => a.cityKey === key && a.disposition === 'excluded').length,
    writeReady: writeReadyKept.filter((s) => s.cityKey === key).length,
  });

  const accumulated = phase19.length + phase20.length + writeReady.length;
  const summary = {
    generatedNote: 'PHASE 21 DRY-RUN — Tier-1 haredi councils (Bnei Brak, Modiin Illit, Beitar Illit, Elad) + Ashdod-continue (0 additional, source exhausted). Address-level coords only (GovMap ADDR_V1). No Nominatim, no settlement-level. No DB write, no publish, no rebuild.',
    sources: Object.fromEntries(Object.keys(CITIES).map((k) => [CITIES[k].city, { url: CITIES[k].sourceUrl, ...byCity(k) }])),
    ashdodContinue: { url: 'https://ashdodmd.org/mikvaot/', additionalFound: 0, note: 'VERIFIED: men/keilim/extra-quarters are image-only on the council site; no additional machine-readable records. Commercial aggregators excluded by golden rules.' },
    totalParsed: SRC.length,
    duplicatesVsLive: analysis.filter((a) => a.disposition === 'duplicate' && a.matchedLiveId).length,
    withinBatchDuplicates: analysis.filter((a) => a.disposition === 'duplicate' && !a.matchedLiveId).length,
    excluded: analysis.filter((a) => a.disposition === 'excluded').length,
    writeReady: writeReady.length,
    writeReadyByCity: writeReadyKept.reduce<Record<string, number>>((a, s) => { const c = CITIES[s.cityKey].city; a[c] = (a[c] ?? 0) + 1; return a; }, {}),
    idCollisions: collisions.length, duplicateAppIds: dupAppIds.length,
    finalRecommendedWriteCount: collisions.length || dupAppIds.length ? 0 : writeReady.length,
    liveMikvehBefore: live.length,
    estimatedTotalAfterWrite: live.length + (collisions.length || dupAppIds.length ? 0 : writeReady.length),
    keyFinding: 'מודיעין עילית was the real gap (0 live → distinct buildings geocoded). ביתר עילית + אלעד add several. בני ברק official source caps at ~12 (already ~live) — the speculated 40-60 exists only on forbidden commercial aggregators. אשדוד source exhausted (0 additional).',
    carryOver: { phase19: phase19.length, phase20: phase20.length, note: 'Phase 19 (Beit Shemesh+Kiryat Gat) + Phase 20 (Ashdod) write-ready — still NOT written.' },
    accumulatedWriteReadyForNextWrite: accumulated,
    accumulatedNote: `Phase 19 (${phase19.length}) + Phase 20 (${phase20.length}) + Phase 21 (${writeReady.length}) = ${accumulated} records ready for ONE additive write when authorized.`,
    rollbackPlan: ['Backup places.osm.json → places.osm.pre-phaseNN.backup.json (+cities) before any write', 'Additive append only; do NOT run rebuildAppDataset'],
    dryRun: true, liveDataTouched: false, publishPerformed: false, rebuildTouched: false,
  };

  writeFileSync(join(OUT, 'phase21-preview.json'), JSON.stringify(SRC, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase21-merge-analysis.json'), JSON.stringify(analysis, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase21-write-ready-preview.json'), JSON.stringify(writeReady, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase21-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase21-source-catalog.json'), JSON.stringify(Object.fromEntries(Object.keys(CITIES).map((k) => [CITIES[k].city, { sourceName: CITIES[k].sourceName, url: CITIES[k].sourceUrl, parsed: SRC.filter((s) => s.cityKey === k).length }])), null, 2), 'utf8');

  console.log('=== Phase 21 (dry-run) ===');
  console.log(`parsed ${SRC.length} across 4 councils (+ Ashdod-continue: 0 additional)`);
  console.log(`dup vs live ${summary.duplicatesVsLive} | within-batch dup ${summary.withinBatchDuplicates} | excluded ${summary.excluded}`);
  console.log(`write-ready ${writeReady.length} ${JSON.stringify(summary.writeReadyByCity)} | id collisions ${collisions.length}`);
  console.log(`live before ${live.length} → est after write ${summary.estimatedTotalAfterWrite}`);
  console.log(`ACCUMULATED: P19 ${phase19.length} + P20 ${phase20.length} + P21 ${writeReady.length} = ${accumulated}`);
}

if (isMain(import.meta.url)) void run();
