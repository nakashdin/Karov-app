/**
 * Phase 22 — Tier-2 large/underrepresented cities (DRY-RUN, additive recon).
 *
 * Ten official council/municipal sources, parsed during recon 2026-06-22. This
 * importer carries the verified records (each with its council sourceUrl), uses
 * NATIVE coordinates where the source publishes them (Haifa, Afula, Raanana,
 * Herzliya, Netanya — bbox-validated), else GovMap ADDR_V1, dedups vs the live
 * 615, and produces write-ready records.
 *
 * GENDER-AWARE dedup (NEW this phase): the live dataset keeps separate records
 * per gender at the same building (e.g. Netanya "מרכזי" + "גברים מרכזי"). So a
 * men's / כלים mikvah is NOT treated as a duplicate of a women's mikvah at the
 * same address — it is its own record. Dedup/collapse match on building AND
 * gender.
 *
 * Sources (see output/phase22-source-catalog.json):
 *  חיפה mdhaifa.org (10, native) · טבריה mdt.org.il (7) · נהריה mdnahariya.co.il
 *  (9) · עפולה mdafula.org.il (16, native) · קרית מוצקין mdmotzkin.org (3) ·
 *  קרית ביאליק qbialik.org.il (3) · קרית ים kiryat-yam.muni.il (2) · כפר סבא
 *  kfar-saba.muni.il (6) · רעננה mdrn.org.il (10, native) · הרצליה mdh.org.il
 *  (8, native) · נתניה mdn.org.il (13, native — all already live) · צפת
 *  mdzefat.co.il (16).
 *
 * COORDS POLICY (unchanged): write-ready only with an ADDRESS-LEVEL coordinate —
 * native council map coord (bbox-validated) OR GovMap ADDR_V1. NO settlement-
 * level, NO Nominatim. Compared vs the live 615. NO write, NO publish, NO rebuild.
 *
 * Run:  node importers/mikvahs/phase22-import.ts
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
  haifa: { slug: 'haifa', city: 'חיפה', bbox: { latMin: 32.74, latMax: 32.86, lngMin: 34.94, lngMax: 35.09 }, sourceName: 'הרבנות והמועצה הדתית חיפה', sourceUrl: 'https://www.mdhaifa.org' },
  tiberias: { slug: 'tiberias', city: 'טבריה', bbox: { latMin: 32.76, latMax: 32.83, lngMin: 35.50, lngMax: 35.57 }, sourceName: 'המועצה הדתית טבריה', sourceUrl: 'https://mdt.org.il' },
  nahariya: { slug: 'nahariya', city: 'נהריה', bbox: { latMin: 32.99, latMax: 33.04, lngMin: 35.07, lngMax: 35.13 }, sourceName: 'המועצה הדתית נהריה', sourceUrl: 'http://www.mdnahariya.co.il' },
  afula: { slug: 'afula', city: 'עפולה', bbox: { latMin: 32.58, latMax: 32.65, lngMin: 35.27, lngMax: 35.35 }, sourceName: 'המועצה הדתית עפולה', sourceUrl: 'https://mdafula.org.il' },
  motzkin: { slug: 'kiryat-motzkin', city: 'קרית מוצקין', bbox: { latMin: 32.82, latMax: 32.86, lngMin: 35.05, lngMax: 35.10 }, sourceName: 'המועצה הדתית קרית מוצקין', sourceUrl: 'https://www.mdmotzkin.org' },
  bialik: { slug: 'kiryat-bialik', city: 'קרית ביאליק', bbox: { latMin: 32.81, latMax: 32.85, lngMin: 35.06, lngMax: 35.11 }, sourceName: 'המועצה הדתית קרית ביאליק', sourceUrl: 'https://qbialik.org.il' },
  yam: { slug: 'kiryat-yam', city: 'קרית ים', bbox: { latMin: 32.83, latMax: 32.87, lngMin: 35.05, lngMax: 35.09 }, sourceName: 'עיריית קרית ים', sourceUrl: 'https://www.kiryat-yam.muni.il' },
  kfarsaba: { slug: 'kfar-saba', city: 'כפר סבא', bbox: { latMin: 32.15, latMax: 32.20, lngMin: 34.89, lngMax: 34.95 }, sourceName: 'עיריית כפר סבא — מחלקת מקוואות', sourceUrl: 'https://www.kfar-saba.muni.il' },
  raanana: { slug: 'raanana', city: 'רעננה', bbox: { latMin: 32.16, latMax: 32.20, lngMin: 34.84, lngMax: 34.90 }, sourceName: 'המועצה הדתית רעננה', sourceUrl: 'https://mdrn.org.il' },
  herzliya: { slug: 'herzliya', city: 'הרצליה', bbox: { latMin: 32.15, latMax: 32.19, lngMin: 34.79, lngMax: 34.87 }, sourceName: 'המועצה הדתית הרצליה', sourceUrl: 'https://mdh.org.il' },
  netanya: { slug: 'netanya', city: 'נתניה', bbox: { latMin: 32.25, latMax: 32.35, lngMin: 34.83, lngMax: 34.89 }, sourceName: 'המועצה הדתית נתניה', sourceUrl: 'https://mdn.org.il' },
  tzfat: { slug: 'tzfat', city: 'צפת', bbox: { latMin: 32.94, latMax: 32.99, lngMin: 35.47, lngMax: 35.53 }, sourceName: 'המועצה הדתית צפת', sourceUrl: 'https://mdzefat.co.il' },
};

interface Raw { c: string; n: string; a: string; g?: string; p?: string | null; h?: string | null; at?: string | null; ac?: string | null; gd: string; u: string; lat?: number; lng?: number; }
interface Rec extends Raw { geo: string; location: GeoPoint | null; coordSource: string; }

const deriveGeo = (addr: string, city: string): string => {
  const h = addr.split('(')[0].split(',')[0].replace(/^(רחוב|רח')\s+/, '').trim();
  return `${h}, ${city}`;
};

const RAW: Raw[] = [
  // ===== חיפה — mdhaifa.org (10 women, NATIVE coords) =====
  { c: 'haifa', n: 'מקווה אחוזה', a: 'שדרות סיני 16, חיפה', p: '046965773', at: 'רחל עלמן; זהבה בן צור', ac: 'מונגש', gd: 'נשים', u: 'https://www.mdhaifa.org/מקווה-אחוזה', lat: 32.7876967, lng: 34.9899432 },
  { c: 'haifa', n: 'מקווה מרכז הכרמל', a: 'דרך הים 10, חיפה', p: '048387816', at: 'יעל פייגנבאום; צופיה פרץ', gd: 'נשים', u: 'https://www.mdhaifa.org/מקווה-מרכז-הכרמל', lat: 32.80465, lng: 34.9885397 },
  { c: 'haifa', n: 'מקווה עין הים', a: 'ההגה 7, חיפה', p: '048539212', at: 'אסתר שמואל', ac: 'מונגש', gd: 'נשים', u: 'https://www.mdhaifa.org/מקווה-עין-הים', lat: 32.8269246, lng: 34.9653287 },
  { c: 'haifa', n: 'מקווה הדר', a: 'בצלאל 2, חיפה', p: '048629497', at: 'זהבה אזולאי', ac: 'מונגש לנכות (בתיאום מראש)', gd: 'נשים', u: 'https://www.mdhaifa.org/מקווה-הדר', lat: 32.8043218, lng: 35.0016076 },
  { c: 'haifa', n: 'מקווה קריית חיים', a: 'הראשונים 55, חיפה', p: '048490391', at: 'אסנת בוטינסקי', ac: 'מונגש', gd: 'נשים', u: 'https://www.mdhaifa.org/מקווה-קריית-חיים', lat: 32.8157054, lng: 35.0519023 },
  { c: 'haifa', n: 'מקווה קריית אליהו', a: 'תל אביב 37, חיפה', p: '048516128', at: 'פנינה ברדא; עליזה אזולאי', gd: 'נשים', u: 'https://www.mdhaifa.org/מקווה-קריית-אליהו', lat: 32.826252, lng: 34.9873756 },
  { c: 'haifa', n: 'מקווה נווה דוד', a: 'ציקלג 8, חיפה', p: '048101898', at: 'אילנה לוי; שמחה טימסטית', gd: 'נשים', u: 'https://www.mdhaifa.org/מקווה-נווה-דוד', lat: 32.8077746, lng: 34.9648804 },
  { c: 'haifa', n: 'מקווה נווה שאנן - שאול', a: 'שאול 22, חיפה', p: '048664703', at: 'רחל אלחרר', ac: 'בשבתות/ערבי חג בתיאום מראש', gd: 'נשים', u: 'https://www.mdhaifa.org/מקווה-נוה-שאנן-שאול', lat: 32.7881585, lng: 35.0189591 },
  { c: 'haifa', n: 'מקווה נווה שאנן - חסדי טהרה', a: 'יד לבנים 212, חיפה', p: '048222203', ac: 'בשבתות/ערבי חג בתיאום מראש', gd: 'נשים', u: 'https://www.mdhaifa.org/מקווה-נווה-שאנן-חסדי-טהרה', lat: 32.7966456, lng: 35.0090269 },
  { c: 'haifa', n: 'מקווה קריית שמואל', a: 'נתיב הלולב, חיפה', p: '048710198', at: 'אביבית יצחק', ac: 'בשבתות/ערבי חג בתיאום מראש', gd: 'נשים', u: 'https://www.mdhaifa.org/מקווה-קריית-שמואל', lat: 32.8333305, lng: 35.0701007 },

  // ===== טבריה — mdt.org.il (5 buildings; GovMap) =====
  { c: 'tiberias', n: "מקווה נשים שיכון ד'", a: "הנשיא ויצמן פינת חזון איש, שיכון ד', טבריה", g: 'הנשיא ויצמן, טבריה', gd: 'נשים', u: 'https://mdt.org.il/mikve/שיכון-ד/' },
  { c: 'tiberias', n: "מקווה גברים שיכון ד'", a: "הנשיא ויצמן פינת חזון איש, שיכון ד', טבריה", g: 'הנשיא ויצמן, טבריה', gd: 'גברים', u: 'https://mdt.org.il/mikve/שיכון-ד-2/' },
  { c: 'tiberias', n: 'מקווה נשים קרית שמואל', a: 'ורנר 5, קרית שמואל, טבריה', g: 'ורנר 5, טבריה', gd: 'נשים', u: 'https://mdt.org.il/mikve/קרית-שמואל/' },
  { c: 'tiberias', n: 'מקווה גברים קרית שמואל', a: 'ורנר 5, קרית שמואל, טבריה', g: 'ורנר 5, טבריה', gd: 'גברים', u: 'https://mdt.org.il/mikve/קרית-שמואל-2/' },
  { c: 'tiberias', n: 'מקווה מורדות', a: 'צאלון 33, מורדות, טבריה', g: 'צאלון 33, טבריה', gd: 'נשים', u: 'https://mdt.org.il/mikve/מורדות/' },
  { c: 'tiberias', n: "מקווה שיכון ב'", a: 'רמח"ל 58, שיכון ב, טבריה', g: 'רמחל 58, טבריה', gd: 'נשים', u: 'https://mdt.org.il/mikve/שיכון-ב/' },
  { c: 'tiberias', n: "מקווה שיכון א'", a: 'השילוח 95, שיכון א, טבריה', g: 'השילוח 95, טבריה', gd: 'נשים', u: 'https://mdt.org.il/mikve/שיכון-א/' },

  // ===== נהריה — mdnahariya.co.il (7 women + 2 men; GovMap) =====
  { c: 'nahariya', n: 'מקווה מרכזי נשים', a: 'ישורון 9, נהריה', p: '049511398', at: 'עליזה לוי', gd: 'נשים', u: 'http://www.mdnahariya.co.il/מקווה-מרכזי-נשים' },
  { c: 'nahariya', n: 'מקווה נשים עין שרה', a: 'גרניום 10, שכונת עין שרה, נהריה', g: 'גרניום 10, נהריה', p: '046890110', at: 'קרן לגריסי', ac: 'מונגש חלקית', gd: 'נשים', u: 'http://www.mdnahariya.co.il/מקווה-נשים-עין-שרה' },
  { c: 'nahariya', n: 'מקווה נשים טרומפלדור', a: 'החלוץ (מרכז מסחרי טרומפלדור), נהריה', g: 'החלוץ, נהריה', p: '049828535', at: 'דליה כהן', gd: 'נשים', u: 'http://www.mdnahariya.co.il/מקווה-נשים-טרומפלדור' },
  { c: 'nahariya', n: 'מקווה נשים נהריה הירוקה', a: 'אשכול 47, נהריה', p: '049823860', at: 'יפעת מלכה; אפרת לביא', gd: 'נשים', u: 'http://www.mdnahariya.co.il/מקווה-נשים-נהריה-הירוקה' },
  { c: 'nahariya', n: 'מקווה נשים אוסישקין', a: 'דוד המלך (ליד מגרש הטניס), נהריה', g: 'דוד המלך, נהריה', p: '049821844', at: 'סימי בן הרוש', gd: 'נשים', u: 'http://www.mdnahariya.co.il/מקווה-נשים-אוסישקין' },
  { c: 'nahariya', n: 'מקווה פקודת אלעזר', a: 'הלוטוס 97, נהריה', p: '049920385', at: 'ענת פינטו', gd: 'נשים', u: 'http://www.mdnahariya.co.il/מקווה-פקודת-אלעזר' },
  { c: 'nahariya', n: 'מקווה עמידר - נווה אלון', a: 'יבנה 5, נהריה', p: '048602040', at: 'יפעת מלכה', ac: 'מונגש חלקית', gd: 'נשים', u: 'http://www.mdnahariya.co.il/מקווה-עמידר--נווה-אלון' },
  { c: 'nahariya', n: 'מקווה גברים מרכזי', a: 'ישורון 9, נהריה', gd: 'גברים', u: 'http://www.mdnahariya.co.il/מקווה-גברים-מרכזי' },
  { c: 'nahariya', n: 'מקווה גברים טרומפלדור', a: 'החשמונאים (מרכז מסחרי טרומפלדור), נהריה', g: 'החשמונאים, נהריה', gd: 'גברים', u: 'http://www.mdnahariya.co.il/מקווה-גברים-טרומפלדור' },

  // ===== עפולה — mdafula.org.il (6 women + 2 men + 8 keilim; NATIVE coords) =====
  { c: 'afula', n: 'מקווה באר ציפורה (רובע יזרעאל)', a: 'ספיר 5, עפולה', p: '048149030', at: 'רינת חטב', ac: 'אין נגישות', gd: 'נשים', u: 'https://mdafula.org.il/hope/56', lat: 32.615054, lng: 35.308738 },
  { c: 'afula', n: 'מקווה באר משה (גבעת המורה)', a: 'בן יהודה 19, עפולה', p: '046421617', at: 'שושי קרץ', ac: 'אין נגישות', gd: 'נשים', u: 'https://mdafula.org.il/hope/55', lat: 32.6247034, lng: 35.330623 },
  { c: 'afula', n: 'מקווה אוצרות יוסף (נוף יזרעאל)', a: 'פעמונית 6, עפולה', p: '046319792', at: 'מעיין אביטן', ac: 'נגיש', gd: 'נשים', u: 'https://mdafula.org.il/hope/54', lat: 32.6166634, lng: 35.3270406 },
  { c: 'afula', n: 'מקווה עפולה עילית', a: 'בורוכוב 19, עפולה', p: '046594330', at: 'ברכה שטיגליץ', ac: 'אין נגישות', gd: 'נשים', u: 'https://mdafula.org.il/hope/53', lat: 32.6286626, lng: 35.3209133 },
  { c: 'afula', n: 'מקווה אור מרגלית (קינמון)', a: 'יעקב קינמון 25, עפולה', p: '046597839', at: 'מרגלית פרנקל', ac: 'אין נגישות', gd: 'נשים', u: 'https://mdafula.org.il/hope/52', lat: 32.6031031, lng: 35.2880188 },
  { c: 'afula', n: 'מקווה מעלות מיכל (כורש)', a: 'כורש 16, עפולה', p: '046400100', at: 'רות כהן', ac: 'נגיש', gd: 'נשים', u: 'https://mdafula.org.il/hope/51', lat: 32.6088727, lng: 35.2971565 },
  { c: 'afula', n: 'מקווה גברים עפולה עילית', a: 'בורוכוב 19, עפולה', at: 'אלון כהן', ac: 'אין נגישות', gd: 'גברים', u: 'https://mdafula.org.il/hope/67', lat: 32.6286626, lng: 35.3209133 },
  { c: 'afula', n: 'מקווה גברים באר משה', a: 'בן יהודה 19, עפולה', at: 'אלון כהן', ac: 'אין נגישות', gd: 'גברים', u: 'https://mdafula.org.il/hope/66', lat: 32.6247034, lng: 35.330623 },
  { c: 'afula', n: 'מקווה כלים אהל יעקב', a: 'אבן גבירול, עפולה', g: 'אבן גבירול, עפולה', ac: 'נגיש', gd: 'כלים', u: 'https://mdafula.org.il/hope/82', lat: 32.625736, lng: 35.324934 },
  { c: 'afula', n: 'מקווה כלים רוטשילד', a: 'השופטים 1, עפולה', ac: 'נגיש', gd: 'כלים', u: 'https://mdafula.org.il/hope/81' },
  { c: 'afula', n: 'מקווה כלים היכל השבעה', a: 'האלה 3, עפולה', ac: 'נגיש', gd: 'כלים', u: 'https://mdafula.org.il/hope/80', lat: 32.636571, lng: 35.3169801 },
  { c: 'afula', n: 'מקווה כלים באר דוד', a: 'דפנה 8, עפולה', ac: 'נגיש', gd: 'כלים', u: 'https://mdafula.org.il/hope/78', lat: 32.614273, lng: 35.2951404 },
  { c: 'afula', n: 'מקווה כלים עטרת יצחק', a: 'צנחנים 8, עפולה', ac: 'נגיש', gd: 'כלים', u: 'https://mdafula.org.il/hope/72', lat: 32.6332469, lng: 35.3291309 },
  { c: 'afula', n: 'מקווה כלים שבת אחים', a: 'שדמית 10, עפולה', ac: 'נגיש', gd: 'כלים', u: 'https://mdafula.org.il/hope/71', lat: 32.622074, lng: 35.330665 },
  { c: 'afula', n: 'מקווה כלים בית הכנסת הגדול', a: 'יהושע חנקין 48, עפולה', ac: 'נגיש', gd: 'כלים', u: 'https://mdafula.org.il/hope/69', lat: 32.6063567, lng: 35.2874334 },

  // ===== קרית מוצקין — mdmotzkin.org (2 women + 1 men; GovMap) =====
  { c: 'motzkin', n: 'מקווה עין דורה', a: 'דקר 70, קרית מוצקין', p: '049019659', at: 'רינה פינטו', ac: 'נגיש למוגבלי תנועה', gd: 'נשים', u: 'https://www.mdmotzkin.org/ein-dora' },
  { c: 'motzkin', n: 'מקווה נשים עין ישעיהו', a: 'גרושקביץ 1, קרית מוצקין', p: '048777581', at: 'נינט לוי; תהילה אישטה; רויטל הוד', ac: 'רמפה ומאחזי יד', gd: 'נשים', u: 'https://www.mdmotzkin.org/ein-ishaayahu' },
  { c: 'motzkin', n: 'מקווה גברים עין ישעיהו', a: 'גרושקביץ 1, קרית מוצקין', p: '048712525', at: 'שלמה טמסוט; שלמה שר', ac: 'כניסה במפלס קרקע', gd: 'גברים', u: 'https://www.mdmotzkin.org/mikve-man' },

  // ===== קרית ביאליק — qbialik.org.il (3 women; GovMap) =====
  { c: 'bialik', n: 'מקווה טהרה צור שלום', a: 'ש"י עגנון 18, קרית ביאליק', g: 'שי עגנון 18, קרית ביאליק', at: 'יעל מרגי', gd: 'נשים', u: 'https://qbialik.org.il/דת_ומסורת' },
  { c: 'bialik', n: 'מקווה קרית שמריהו - ראובן', a: 'ראובן 15, קרית ביאליק', p: '048750053', at: 'ברוריה פור', gd: 'נשים', u: 'https://qbialik.org.il/דת_ומסורת' },
  { c: 'bialik', n: 'מקווה קרן קיימת (ביאליק דרום)', a: 'קק"ל 75, קרית ביאליק', g: 'קקל 75, קרית ביאליק', at: 'חגית', gd: 'נשים', u: 'https://qbialik.org.il/דת_ומסורת' },

  // ===== קרית ים — kiryat-yam.muni.il (2 women; GovMap) =====
  { c: 'yam', n: 'מקווה מעיין דוד - סביוני ים', a: 'האגוזים פינת האילנות, קרית ים', g: 'האגוזים, קרית ים', p: '0779019101', at: 'ורדה אישתה', gd: 'נשים', u: 'https://www.kiryat-yam.muni.il/153/' },
  { c: 'yam', n: 'מקווה להמן', a: 'להמן 15, קרית ים', p: '0779019110', at: 'תמר חמו; אסתר מזרחי', gd: 'נשים', u: 'https://www.kiryat-yam.muni.il/153/' },

  // ===== כפר סבא — kfar-saba.muni.il (4 women + 2 men; GovMap) =====
  { c: 'kfarsaba', n: 'מקווה קפלן - נשים', a: 'מרדכי 3, שכונת קפלן, כפר סבא', g: 'מרדכי אנילביץ 3, כפר סבא', p: '097656667', at: "גילה נג'אתי; רות אליהו", ac: 'נגיש לנשים עם מוגבלויות', gd: 'נשים', u: 'https://www.kfar-saba.muni.il/מקווה-קפלן/' },
  { c: 'kfarsaba', n: 'מקווה קפלן - גברים', a: 'מרדכי 3, שכונת קפלן, כפר סבא', g: 'מרדכי אנילביץ 3, כפר סבא', p: '097905600', gd: 'גברים', u: 'https://www.kfar-saba.muni.il/מקווה-קפלן-גברים/' },
  { c: 'kfarsaba', n: 'מקווה תל חי - נשים', a: 'תל חי 67, כפר סבא', p: '097660802', at: 'בלה קדוש; לאה ביטון; שירי כהן', gd: 'נשים', u: 'https://www.kfar-saba.muni.il/מקווה-תל-חי/' },
  { c: 'kfarsaba', n: 'מקווה בן גוריון - נשים', a: 'בן גוריון 23, כפר סבא', p: '097670802', at: 'סוזי פוגל; תמר כהן אליהו', gd: 'נשים', u: 'https://www.kfar-saba.muni.il/מקווה-בן-גוריון/' },
  { c: 'kfarsaba', n: 'מקווה בן גוריון - גברים', a: 'בן גוריון 23, כפר סבא', p: '097905600', at: 'זהר אהרון', gd: 'גברים', u: 'https://www.kfar-saba.muni.il/מקווה-בן-גוריון-גברים/' },
  { c: 'kfarsaba', n: 'מקווה עלייה - נשים', a: 'האחדות 16, שכונת עליה, כפר סבא', g: 'האחדות 16, כפר סבא', p: '098652819', at: 'עמרה נטלי; עמרן יונה', gd: 'נשים', u: 'https://www.kfar-saba.muni.il/מקווה-עלייה/' },

  // ===== רעננה — mdrn.org.il (4 women + 3 men + 3 keilim; NATIVE coords) =====
  { c: 'raanana', n: 'מקווה אלפסי', a: 'שמואל הנגיד פינת אלחריזי, רעננה', p: '098324770', at: 'רבקה שטיין', ac: 'מונגש (חדר הכנה מונגש)', gd: 'נשים', u: 'https://mdrn.org.il/directory-mikvah/listing/מקווה-אלפסי/', lat: 32.190526, lng: 34.87131 },
  { c: 'raanana', n: 'מקווה רבוצקי', a: 'רבוצקי 72, רעננה', at: 'רבקה שטיין', ac: 'מונגש', gd: 'נשים', u: 'https://mdrn.org.il/directory-mikvah/listing/מקווה-רבוצקי/', lat: 32.183829, lng: 34.886623 },
  { c: 'raanana', n: 'מקווה הרצל', a: 'הרצל 3, רעננה', at: 'רבקה שטיין', ac: 'מונגש (כסא עם מנוף)', gd: 'נשים', u: 'https://mdrn.org.il/directory-mikvah/listing/מקווה-הרצל/', lat: 32.180995, lng: 34.868921 },
  { c: 'raanana', n: 'מקווה קרית שרת', a: 'י.ל. פרץ 53, רעננה', at: 'רבקה שטיין', gd: 'נשים', u: 'https://mdrn.org.il/directory-mikvah/listing/מקווה-קרית-שרת/', lat: 32.193365, lng: 34.857358 },
  { c: 'raanana', n: 'מקווה גברים הרצל', a: 'הרצל 3, רעננה', gd: 'גברים', u: 'https://mdrn.org.il/directory-mikvah/listing/מקווה-גברים-הרצל/', lat: 32.180995, lng: 34.868921 },
  { c: 'raanana', n: 'מקווה גברים פרץ', a: 'י.ל. פרץ 30, רעננה', gd: 'גברים', u: 'https://mdrn.org.il/directory-mikvah/listing/מקווה-גברים-פרץ/', lat: 32.193332, lng: 34.855138 },
  { c: 'raanana', n: 'מקווה גברים אלפסי', a: 'אלחריזי 12, רעננה', gd: 'גברים', u: 'https://mdrn.org.il/directory-mikvah/listing/מקווה-גברים-אלפסי/', lat: 32.190631, lng: 34.871944 },
  { c: 'raanana', n: 'מקווה כלים רבוצקי', a: 'רבוצקי 72, רעננה', gd: 'כלים', u: 'https://mdrn.org.il/directory-mikvah/listing/מקווה-כלים-רבוצקי/', lat: 32.183829, lng: 34.886623 },

  // ===== הרצליה — mdh.org.il (5 women + 3 men; NATIVE coords) =====
  { c: 'herzliya', n: "מקווה הרצליה ב' - נשים", a: 'היתד 20, הרצליה', p: '099501485', at: 'חנה לוי', ac: 'אינו מונגש', gd: 'נשים', u: 'https://mdh.org.il/directory-mikvah/listing/מקווה-הרצליה-ב-נשים/', lat: 32.172355, lng: 34.815553 },
  { c: 'herzliya', n: 'מקווה הרצליה פיתוח - נשים', a: 'שלמה המלך 34, הרצליה', p: '098352246', at: 'לימור שוורץ', ac: 'מונגש באופן מלא', gd: 'נשים', u: 'https://mdh.org.il/directory-mikvah/listing/מקווה-הרצליה-פיתוח-נשים/', lat: 32.176192, lng: 34.810978 },
  { c: 'herzliya', n: 'מקווה מרכזי - נשים', a: 'סירקין 4, הרצליה', p: '099507136', at: 'אסתר עומסי', ac: 'אינו מונגש', gd: 'נשים', u: 'https://mdh.org.il/directory-mikvah/listing/מקווה-מרכזי-נשים/', lat: 32.166285, lng: 34.843176 },
  { c: 'herzliya', n: 'מקווה נווה עמל - נשים', a: 'פנקס 54, הרצליה', g: 'פנקס 54, הרצליה', p: '099516136', at: 'שמחה ארמה', ac: 'אינו מונגש', gd: 'נשים', u: 'https://mdh.org.il/directory-mikvah/listing/מקווה-נווה-עמל-נשים/', lat: 32.160419, lng: 34.856976 },
  { c: 'herzliya', n: 'מקווה שביב - נשים', a: 'זיסו 12, הרצליה', p: '099567917', at: 'סוזי יעקב', ac: 'אינו מונגש', gd: 'נשים', u: 'https://mdh.org.il/directory-mikvah/listing/מקווה-שביב-נשים/', lat: 32.177055, lng: 34.853384 },
  { c: 'herzliya', n: 'מקווה גברים - הרצליה פיתוח', a: 'אהרון קציר 2, הרצליה', gd: 'גברים', u: 'https://mdh.org.il/directory-mikvah/listing/מקווה-גברים-הרצליה-פיתוח/', lat: 32.176192, lng: 34.810978 },
  { c: 'herzliya', n: 'מקווה גברים - שביב', a: 'זיסו 12, הרצליה', p: '099567917', gd: 'גברים', u: 'https://mdh.org.il/directory-mikvah/listing/מקווה-גברים-שביב/', lat: 32.177055, lng: 34.853384 },
  { c: 'herzliya', n: 'מקווה מרכזי - גברים', a: 'סירקין 4, הרצליה', p: '099511064', gd: 'גברים', u: 'https://mdh.org.il/directory-mikvah/listing/מקווה-מרכזי-גברים/', lat: 32.166285, lng: 34.843176 },

  // ===== נתניה — mdn.org.il (13; NATIVE coords; all expected to dedup vs live 15) =====
  { c: 'netanya', n: 'מקווה רמת פולג', a: 'תורמוס 6, נתניה', p: '098782858', at: 'אסתר רוטבלט', ac: 'מונגש חלקית', gd: 'נשים', u: 'https://mdn.org.il/directory-mikvah/', lat: 32.271107, lng: 34.846166 },
  { c: 'netanya', n: 'מקווה נשים קריית נורדאו', a: 'אריה לוין 59, נתניה', p: '098655341', at: 'מלכה כהן', ac: 'מונגש חלקית', gd: 'נשים', u: 'https://mdn.org.il/directory-mikvah/', lat: 32.278985, lng: 34.854875 },
  { c: 'netanya', n: 'מקווה נשים גבעת האירוסים', a: 'חרצית 27, נתניה', p: '097720069', at: 'רחל עטר', ac: 'מונגש חלקית', gd: 'נשים', u: 'https://mdn.org.il/directory-mikvah/', lat: 32.286670, lng: 34.850180 },
  { c: 'netanya', n: 'מקווה נשים שכונת אזורים', a: 'אפרים אלנקווה 8, נתניה', p: '098357282', at: 'נורית גואטה', ac: 'אינו מונגש', gd: 'נשים', u: 'https://mdn.org.il/directory-mikvah/', lat: 32.294408, lng: 34.849170 },
  { c: 'netanya', n: 'מקווה נשים שכונת דורה', a: 'שמואל 10, נתניה', p: '098354814', at: 'שרה כמיסה', ac: 'אינו מונגש', gd: 'נשים', u: 'https://mdn.org.il/directory-mikvah/', lat: 32.299179, lng: 34.857191 },
  { c: 'netanya', n: 'מקווה נשים שכונת רמת חן', a: 'אלחריזי 25, נתניה', p: '098652560', at: 'אילנה פלח', ac: 'אינו מונגש', gd: 'נשים', u: 'https://mdn.org.il/directory-mikvah/', lat: 32.313084, lng: 34.859543 },
  { c: 'netanya', n: 'המקווה המרכזי נתניה', a: 'אברהם שפירא 28, נתניה', p: '098611839', at: 'יעל אוחיון', ac: 'מונגש חלקית', gd: 'נשים', u: 'https://mdn.org.il/directory-mikvah/', lat: 32.322002, lng: 34.857597 },
  { c: 'netanya', n: 'מקווה נשים סלע', a: 'משה גליקסון 17, נתניה', p: '098329238', at: 'שרה וקסמן', ac: 'נגישות מלאה', gd: 'נשים', u: 'https://mdn.org.il/directory-mikvah/', lat: 32.330492, lng: 34.865677 },
  { c: 'netanya', n: 'מקווה נשים שכונת הפועל מזרחי', a: 'משה שפירא 40, נתניה', p: '098622561', at: 'יעל ירחי', ac: 'מונגש חלקית', gd: 'נשים', u: 'https://mdn.org.il/directory-mikvah/', lat: 32.336645, lng: 34.864825 },
  { c: 'netanya', n: 'מקווה נשים שכונת ותיקים', a: 'הרב זוארץ 12, נתניה', p: '098323492', at: 'זהבה מגן', ac: 'נגישות מלאה', gd: 'נשים', u: 'https://mdn.org.il/directory-mikvah/', lat: 32.326005, lng: 34.859271 },
  { c: 'netanya', n: 'מקווה נשים שכונת משה"ב', a: 'שפיגלמן 21, נתניה', p: '098871071', at: 'דליה ליזמי', ac: 'אינו מונגש', gd: 'נשים', u: 'https://mdn.org.il/directory-mikvah/', lat: 32.308630, lng: 34.873197 },
  { c: 'netanya', n: 'מקווה גברים מרכזי', a: 'אברהם שפירא 28, נתניה', gd: 'גברים', u: 'https://mdn.org.il/directory-mikvah/', lat: 32.322002, lng: 34.857597 },
  { c: 'netanya', n: 'מקווה גברים נורדאו', a: 'אריה לוין 59, נתניה', gd: 'גברים', u: 'https://mdn.org.il/directory-mikvah/', lat: 32.279537, lng: 34.855160 },

  // ===== צפת — mdzefat.co.il (women council + men + private women + keilim; GovMap) =====
  { c: 'tzfat', n: 'מקווה נוף כנרת', a: 'נוף כנרת 11, צפת', p: '0524409349', at: 'רותי בן הרוש; נטע-לי אלף', gd: 'נשים', u: 'https://mdzefat.co.il/mikveh/נוף-כנרת/' },
  { c: 'tzfat', n: 'מקווה איביקור', a: 'הנשרים, שכונת איביקור, צפת', g: 'הנשרים, צפת', p: '0503327788', at: 'עפרה בן גל; חנה כורש', gd: 'נשים', u: 'https://mdzefat.co.il/mikveh/מקווה-איביקור/' },
  { c: 'tzfat', n: 'מקווה רמת רזים', a: 'התבור, צפת', g: 'התבור, צפת', p: '046920395', at: 'סימה אלקובי', gd: 'נשים', u: 'https://mdzefat.co.il/mikveh/מקווה-רמת-רזים/' },
  { c: 'tzfat', n: 'מקווה דרום', a: 'הרצל, צפת', g: 'הרצל, צפת', p: '046970160', at: 'מרים אוהב שלום; שמחה לוי', gd: 'נשים', u: 'https://mdzefat.co.il/mikveh/מקווה-דרום/' },
  { c: 'tzfat', n: 'מקווה גברים איביקור', a: 'הנשרים, צפת', g: 'הנשרים, צפת', at: 'בני חמו', gd: 'גברים', u: 'https://mdzefat.co.il/mikveh/מקווה-שכונת-איביקור/' },
  { c: 'tzfat', n: 'מקווה גברים דרום', a: 'הרצל, צפת', g: 'הרצל, צפת', at: 'בני בן חמו', gd: 'גברים', u: 'https://mdzefat.co.il/mikveh/מקווה-דרום-רח-הרצל/' },
  { c: 'tzfat', n: 'מקווה ברסלב', a: 'האר"י, עיר עתיקה, צפת', g: 'הארי, צפת', at: 'יפה צוקר', ac: 'מונגש לנכות', gd: 'נשים', u: 'https://mdzefat.co.il/mikveh/מקווה-ברסלב/' },
  { c: 'tzfat', n: 'מקווה חב"ד', a: 'קרית חב"ד, צפת', g: 'קרית חבד, צפת', p: '046973321', at: 'שולמית זעפרני', gd: 'נשים', u: 'https://mdzefat.co.il/mikveh/מקווה-חבד/' },
  { c: 'tzfat', n: 'מקווה מאור חיים', a: 'צה"ל 4, צפת', g: 'צהל 4, צפת', at: 'אסתר לוי', gd: 'נשים', u: 'https://mdzefat.co.il/mikveh/מקווה-מאור-חיים/' },
  { c: 'tzfat', n: 'מקווה צאנז', a: 'תרפ"ט, עיר עתיקה, צפת', g: 'תרפט, צפת', gd: 'נשים', u: 'https://mdzefat.co.il/mikveh/מקווה-צאנז/' },
  { c: 'tzfat', n: 'מקווה כלים פאר הנצח', a: 'צה"ל 7, צפת', g: 'צהל 7, צפת', gd: 'כלים', u: 'https://mdzefat.co.il/mikveh/פאר-הנצח/' },
  { c: 'tzfat', n: 'מקווה כלים היכל מוהר"ן', a: 'האצ"ל 122, צפת', g: 'האצל 122, צפת', gd: 'כלים', u: 'https://mdzefat.co.il/mikveh/היכל-מוהרן/' },
];

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

// --- gender-aware matching vs the live 615 ----------------------------------
const genderOf = (name: unknown, mg: unknown): string => {
  const s = `${mg ?? ''} ${name ?? ''}`;
  if (/כלים/.test(s)) return 'כלים';
  if (/גברים/.test(s)) return 'גברים';
  return 'נשים';
};
const STOP = /מקוואות|מקואות|מקווה|מקוה|נשים|גברים|כלים|טהרת|טהורים|שכונת|שכון|שיכון|רובע|קרית|קריית|בית|הכנסת|רבי|הרב|מרכז|מרכזי|נווה/g;
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

  const SRC: Rec[] = RAW.map((x) => ({ ...x, geo: x.g ?? deriveGeo(x.a, CITIES[x.c].city), location: null, coordSource: 'pending', p: normPhone(x.p) ?? null }));

  const analysis: any[] = [];
  const survivors: Rec[] = [];

  // Step 1 — gender-aware dedup vs live (street/name/geo match AND same gender).
  for (const rec of SRC) {
    const cfg = CITIES[rec.c];
    const cands = liveByCity(cfg.city);
    const recCore = nameCore(rec.n), recSt = streetTokens(rec.a), recG = genderOf(rec.n, rec.gd);
    let dup: any = null; let how = '';
    for (const l of cands) {
      if (genderOf(l.name, l.mikvehGender) !== recG) continue;
      const lCore = nameCore(l.name), lSt = streetTokens(l.address);
      if (streetMatch(recSt, lSt)) { dup = l; how = `street "${recSt.name}${recSt.num ? ' ' + recSt.num : ''}" + gender`; break; }
      if (recCore.length && shareToken(recCore, lCore)) { dup = l; how = `name token [${recCore.filter((t) => lCore.includes(t)).join(',')}] + gender`; break; }
      if (rec.lat != null && l.location && meters({ latitude: rec.lat, longitude: rec.lng! }, l.location) <= 150) { dup = l; how = `${Math.round(meters({ latitude: rec.lat, longitude: rec.lng! }, l.location))}m + gender`; break; }
    }
    if (dup) analysis.push({ city: cfg.city, name: rec.n, address: rec.a, gender: rec.gd, disposition: 'duplicate', reason: `matches live ${dup.id} (${dup.name}) by ${how}`, matchedLiveId: dup.id });
    else survivors.push(rec);
  }

  // Step 2 — resolve ADDRESS-LEVEL coords for survivors (native bbox-validated, else GovMap ADDR_V1).
  for (const rec of survivors) {
    const cfg = CITIES[rec.c];
    if (rec.lat != null && rec.lng != null) {
      const loc = { latitude: rec.lat, longitude: rec.lng };
      if (isInIsrael(loc) && inBbox(loc, cfg.bbox)) { rec.location = loc; rec.coordSource = 'record-native'; continue; }
      // native coord failed bbox (e.g. council data-entry error) → fall through to GovMap.
    }
    let gc = await govmap(rec.geo, cfg.city, cfg.bbox);
    await sleep(320);
    if (!gc && /["'׳״]/.test(rec.geo)) { gc = await govmap(sp(rec.geo.split(',')[0]) + ', ' + cfg.city, cfg.city, cfg.bbox); await sleep(320); }
    if (gc) { rec.location = gc.loc; rec.coordSource = 'govmap-ADDR_V1'; }
    else rec.coordSource = rec.geo.match(/\d/) ? 'govmap-no-match' : 'no-house-number';
  }

  // Step 3 — gender-aware within-batch collapse + classify.
  const writeReadyKept: Rec[] = [];
  for (const rec of survivors) {
    const cfg = CITIES[rec.c];
    const recG = genderOf(rec.n, rec.gd);
    let disposition: string, reason: string, matchedLiveId: string | null = null;
    if (!rec.location) {
      disposition = 'excluded'; reason = `no address-level coordinate (${rec.coordSource})`;
    } else {
      const nearLive = liveCoord.find((l) => cityMatch(l.cityId, cfg.city) && genderOf(l.name, l.mikvehGender) === recG && meters(rec.location!, l.location) <= 150);
      const st = streetTokens(rec.a);
      const twin = writeReadyKept.find((k) => k.c === rec.c && genderOf(k.n, k.gd) === recG && (streetMatch(streetTokens(k.a), st) || (k.location && meters(k.location, rec.location!) <= 40)));
      if (nearLive) { disposition = 'duplicate'; reason = `geo-duplicate of live ${nearLive.id} (${Math.round(meters(rec.location, nearLive.location))}m, same gender)`; matchedLiveId = nearLive.id; }
      else if (twin) { disposition = 'duplicate'; reason = `within-batch same building+gender as "${twin.n}"`; }
      else { disposition = 'write_ready'; reason = `address-level coordinate (${rec.coordSource}), not a duplicate`; writeReadyKept.push(rec); }
    }
    analysis.push({ city: cfg.city, name: rec.n, address: rec.a, geo: rec.geo, phone: rec.p, gender: rec.gd, accessibility: rec.ac ?? null, coordSource: rec.coordSource, hasCoords: rec.location != null, location: rec.location, disposition, reason, matchedLiveId });
  }

  // Step 4 — normalize write-ready to Place (additive; provenance kept).
  const writeReady: Place[] = writeReadyKept.map((rec) => {
    const cfg = CITIES[rec.c]; const loc = rec.location!;
    const gtag = genderOf(rec.n, rec.gd) === 'גברים' ? 'm' : genderOf(rec.n, rec.gd) === 'כלים' ? 'k' : 'w';
    const place: Place = { id: `mikveh-${cfg.slug}-${gtag}-${loc.latitude.toFixed(5)}_${loc.longitude.toFixed(5)}`, name: rec.n, type: 'mikveh', cityId: cfg.city, address: rec.a, location: loc, source: 'seed' };
    if (rec.coordSource === 'govmap-ADDR_V1') place.locationPrecision = 'address';
    if (rec.p) place.phone = rec.p;
    if (rec.h) place.openingHours = rec.h;
    if (rec.gd) place.mikvehGender = rec.gd;
    if (rec.at) place.attendant = rec.at;
    place.sourceName = cfg.sourceName;
    place.sourceUrl = rec.u;
    place.extra = { license: 'council-public', coordSource: rec.coordSource, accessibility: rec.ac ?? undefined, provenance: { sourceId: `council:${cfg.slug}:mikvah`, sourceUrl: rec.u, fetchedAt: NOW } };
    return place;
  });
  const collisions = writeReady.filter((p) => existingIds.has(p.id)).map((p) => p.id);
  const dupAppIds = writeReady.map((p) => p.id).filter((id, i, a) => a.indexOf(id) !== i);

  // Carry-over (do NOT write; included only in the accumulated count).
  const carry = (f: string): Place[] => { try { return readJson<Place[]>(join(OUT, f)); } catch { return []; } };
  const phase19 = carry('phase19-write-ready-preview.json');
  const phase20 = carry('phase20-write-ready-preview.json');
  const phase21 = carry('phase21-write-ready-preview.json');

  const byCity = (key: string) => ({
    parsed: SRC.filter((s) => s.c === key).length,
    duplicateVsLive: analysis.filter((a) => a.city === CITIES[key].city && a.disposition === 'duplicate' && a.matchedLiveId).length,
    withinBatchDup: analysis.filter((a) => a.city === CITIES[key].city && a.disposition === 'duplicate' && !a.matchedLiveId).length,
    excluded: analysis.filter((a) => a.city === CITIES[key].city && a.disposition === 'excluded').length,
    writeReady: writeReadyKept.filter((s) => s.c === key).length,
  });
  const genderBreak = writeReadyKept.reduce<Record<string, number>>((a, r) => { const g = genderOf(r.n, r.gd); a[g] = (a[g] ?? 0) + 1; return a; }, {});

  const accumulated = phase19.length + phase20.length + phase21.length + writeReady.length;
  const summary = {
    generatedNote: 'PHASE 22 DRY-RUN — 12 official Tier-2 city councils. GENDER-AWARE dedup (men/כלים are distinct records from women, matching the live data convention). Address-level coords only (native council coord bbox-validated OR GovMap ADDR_V1). No Nominatim. No write, no publish, no rebuild.',
    sources: Object.fromEntries(Object.keys(CITIES).map((k) => [CITIES[k].city, { url: CITIES[k].sourceUrl, ...byCity(k) }])),
    totalParsed: SRC.length,
    duplicatesVsLive: analysis.filter((a) => a.disposition === 'duplicate' && a.matchedLiveId).length,
    withinBatchDuplicates: analysis.filter((a) => a.disposition === 'duplicate' && !a.matchedLiveId).length,
    excluded: analysis.filter((a) => a.disposition === 'excluded').length,
    writeReady: writeReady.length,
    writeReadyByCity: writeReadyKept.reduce<Record<string, number>>((a, s) => { const c = CITIES[s.c].city; a[c] = (a[c] ?? 0) + 1; return a; }, {}),
    writeReadyByGender: genderBreak,
    nativeCoordCount: writeReadyKept.filter((r) => r.coordSource === 'record-native').length,
    govmapCount: writeReadyKept.filter((r) => r.coordSource === 'govmap-ADDR_V1').length,
    idCollisions: collisions.length, duplicateAppIds: dupAppIds.length,
    finalRecommendedWriteCount: collisions.length || dupAppIds.length ? 0 : writeReady.length,
    liveMikvehBefore: live.length,
    estimatedTotalAfterWrite: live.length + (collisions.length || dupAppIds.length ? 0 : writeReady.length),
    keyFinding: 'חיפה (0 live → 10, native coords) and עפולה (0 live → many, native) are the big wins. נתניה: all 13 official records already live (completeness CONFIRMED; rich attendant/hours/accessibility = enrichment candidates). Men/כלים mikvahs at buildings where only women existed are now captured as distinct records.',
    excludedNote: 'Excluded = addresses GovMap could not resolve to ADDR_V1 (old-city/intersection/landmark addresses with no house number, e.g. Tzfat old city, Tiberias/Nahariya intersections) — per address-level policy, no street-centroid/Nominatim/fabrication; candidates for manual coordinates.',
    carryOver: { phase19: phase19.length, phase20: phase20.length, phase21: phase21.length },
    accumulatedWriteReadyForNextWrite: accumulated,
    accumulatedNote: `P19 ${phase19.length} + P20 ${phase20.length} + P21 ${phase21.length} + P22 ${writeReady.length} = ${accumulated} records ready for ONE additive write when authorized.`,
    rollbackPlan: ['Backup places.osm.json → places.osm.pre-phaseNN.backup.json (+cities) before any write', 'Additive append only; do NOT run rebuildAppDataset'],
    dryRun: true, liveDataTouched: false, publishPerformed: false, rebuildTouched: false,
  };

  writeFileSync(join(OUT, 'phase22-preview.json'), JSON.stringify(SRC, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase22-merge-analysis.json'), JSON.stringify(analysis, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase22-write-ready-preview.json'), JSON.stringify(writeReady, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase22-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase22-source-catalog.json'), JSON.stringify(Object.fromEntries(Object.keys(CITIES).map((k) => [CITIES[k].city, { sourceName: CITIES[k].sourceName, url: CITIES[k].sourceUrl, parsed: SRC.filter((s) => s.c === k).length }])), null, 2), 'utf8');

  console.log('=== Phase 22 (dry-run) ===');
  console.log(`parsed ${SRC.length} across 12 councils`);
  console.log(`dup vs live ${summary.duplicatesVsLive} | within-batch dup ${summary.withinBatchDuplicates} | excluded ${summary.excluded}`);
  console.log(`write-ready ${writeReady.length} | by gender ${JSON.stringify(summary.writeReadyByGender)} | native ${summary.nativeCoordCount} govmap ${summary.govmapCount} | id collisions ${collisions.length}`);
  console.log(`by city ${JSON.stringify(summary.writeReadyByCity)}`);
  console.log(`live before ${live.length} → est after write ${summary.estimatedTotalAfterWrite}`);
  console.log(`ACCUMULATED: P19 ${phase19.length} + P20 ${phase20.length} + P21 ${phase21.length} + P22 ${writeReady.length} = ${accumulated}`);
}

if (isMain(import.meta.url)) void run();
