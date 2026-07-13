/**
 * Phase 20 — official street-address mikveh councils (DRY-RUN, additive recon).
 *
 * Five official council sources, all server-rendered HTML, parsed during recon
 * on 2026-06-22 (parsing strategy per source documented below). This importer
 * carries the verified extracted records (each with its council sourceUrl), then
 * does the real, reproducible work: resolve ADDRESS-LEVEL coordinates and dedup
 * against the live 615 before producing write-ready records.
 *
 * Sources & parse strategy (see output/phase20-source-catalog.json):
 *  1. ראשון לציון  mdrl.org.il/mikvaot/<slug>  — WP ListingFlow; lfi-more-info-row
 *     "label: value" rows + <h1> name + lfi-opening-hours-notes. 11 women + 6 men
 *     (men = same buildings). NO coords on site.
 *  2. רמת גן        mdrg.org.il/women-mikve + /men-mikve + vessels — WP accordion;
 *     <strong>name</strong>, "כתובת:", "טלפון:", "בלנית(…)". 7 buildings. NO coords.
 *  3. גבעתיים       mdgiva.org/מקוואות — Elementor image-box; title + <br>-split
 *     "label : value"; Waze ll= deep-links give per-record lat/lng. 3 records.
 *  4. קרית אתא      kiryat-ata.org.il/.../מקוואות — Elementor accordion;
 *     <strong>label:</strong> value. 5 records. NO coords.
 *  5. אשדוד         ashdodmd.org/mikvaot — single Elementor prose page;
 *     "רובע X': <street n> - <accessibility>" lines. 11 women. NO coords.
 *
 * COORDS POLICY (unchanged): a record is write-ready only with an ADDRESS-LEVEL
 * coordinate — a Waze record coord validated inside the city bbox, OR a GovMap
 * ADDR_V1 geocode (exact, right city, in-bbox). NO settlement-level, NO Nominatim.
 * Compared vs the live 615. NO DB write, NO publish, NO rebuild.
 *
 * Run:  node importers/mikvahs/phase20-import.ts
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
  rishon: { slug: 'rishon-lezion', city: 'ראשון לציון', bbox: { latMin: 31.93, latMax: 32.01, lngMin: 34.72, lngMax: 34.86 }, sourceName: 'המועצה הדתית ראשון לציון', sourceUrl: 'https://mdrl.org.il/מקוואות/' },
  ramatgan: { slug: 'ramat-gan', city: 'רמת גן', bbox: { latMin: 32.03, latMax: 32.11, lngMin: 34.78, lngMax: 34.87 }, sourceName: 'רבנות העיר רמת גן', sourceUrl: 'https://mdrg.org.il/women-mikve/' },
  givatayim: { slug: 'givatayim', city: 'גבעתיים', bbox: { latMin: 32.05, latMax: 32.10, lngMin: 34.79, lngMax: 34.84 }, sourceName: 'המועצה הדתית גבעתיים', sourceUrl: 'https://mdgiva.org/מקוואות/' },
  kiryatata: { slug: 'kiryat-ata', city: 'קרית אתא', bbox: { latMin: 32.77, latMax: 32.85, lngMin: 35.07, lngMax: 35.16 }, sourceName: 'המועצה הדתית / עיריית קרית אתא', sourceUrl: 'https://www.kiryat-ata.org.il/residentservice/religiousservices/מקוואות/' },
  ashdod: { slug: 'ashdod', city: 'אשדוד', bbox: { latMin: 31.74, latMax: 31.86, lngMin: 34.59, lngMax: 34.70 }, sourceName: 'המועצה הדתית אשדוד', sourceUrl: 'https://ashdodmd.org/mikvaot/' },
};

interface Rec {
  cityKey: string; name: string; address: string; geo: string; phone: string | null;
  hours: string | null; attendant: string | null; accessibility: string | null;
  gender: string | null; location: GeoPoint | null; coordSource: string; pageUrl: string;
}
const r = (cityKey: string, name: string, address: string, geo: string, phone: string | null, hours: string | null, attendant: string | null, accessibility: string | null, gender: string | null, pageUrl: string, location: GeoPoint | null = null): Rec =>
  ({ cityKey, name, address, geo, phone: normPhone(phone) ?? null, hours, attendant, accessibility, gender, location, coordSource: location ? 'record-waze' : 'pending', pageUrl });

// --- Recon-extracted source records (verified 2026-06-22) -------------------
const SRC: Rec[] = [
  // ===== ראשון לציון — mdrl.org.il (women 11 + men 6) =====
  r('rishon', 'מקווה רבי עקיבא', 'בן אהרון אורפלי 4, ראשון לציון', 'אורפלי 4, ראשון לציון', '039508274', 'חורף 17:00–21:00 / קיץ 19:30–22:00 / שישי מכניסת שבת למשך שעה / מוצ"ש שעתיים', 'דינה לוי', 'נגישות מלאה', 'נשים', 'https://mdrl.org.il/mikvaot/מקווה-רבי-עקיבא-2/'),
  r('rishon', 'מקווה הטהורים (כרמים)', 'היוגבים 4, ראשון לציון', 'היוגבים 4, ראשון לציון', '037746637', 'חורף 17:00–21:00 / קיץ 19:30–22:00', 'סיסיל נחום', 'נגישות חלקית', 'נשים', 'https://mdrl.org.il/mikvaot/מקווה-הטהורים/'),
  r('rishon', "מקווה ג'נט (נווה דקלים)", 'החלוצים 45, ראשון לציון', 'החלוצים 45, ראשון לציון', '039068653', 'חורף 17:00–21:00 / קיץ 19:30–22:00', 'שרה בובליל', 'נגישות חלקית', 'נשים', 'https://mdrl.org.il/mikvaot/מקווה-גנט-נווה-דקלים/'),
  r('rishon', 'מקווה החידא (הרצל)', 'החידא 4, ראשון לציון', 'החידא 4, ראשון לציון', '039644156', 'חורף 17:00–21:00 / קיץ 19:30–22:00', 'אילנה אזולאי', 'אין נגישות', 'נשים', 'https://mdrl.org.il/mikvaot/מקווה-החידא/'),
  r('rishon', 'מקווה טהרת מלכה', 'יוסף הנשיא 5, ראשון לציון', 'יוסף הנשיא 5, ראשון לציון', '039508762', 'חורף 17:00–21:00 / קיץ 19:30–22:00', 'טלי מויאל', 'אין נגישות', 'נשים', 'https://mdrl.org.il/mikvaot/מקווה-טהרת-מלכה-שיכון-המזרח/'),
  r('rishon', 'מקווה הבן איש חי (נחלת יהודה)', 'לוז 30, ראשון לציון', 'לוז 30, ראשון לציון', '039508275', 'חורף 17:00–21:00 / קיץ 19:30–22:00', 'מרגלית עדני', 'אין נגישות', 'נשים', 'https://mdrl.org.il/mikvaot/מקווה-נחלת-יהודה/'),
  r('rishon', 'מקווה הבעש"ט (נאות אשלים)', 'התזמורת 51, ראשון לציון', 'התזמורת 51, ראשון לציון', '039525925', 'חורף 17:00–21:00 / קיץ 19:30–22:00', 'סיגלית טובי', 'אין נגישות', 'נשים', 'https://mdrl.org.il/mikvaot/מקווה-נאות-אשלים/'),
  r('rishon', 'מקווה אור החיים (פופל)', 'פופל 20, ראשון לציון', 'פופל 20, ראשון לציון', '039588380', 'חורף 17:00–21:00 / קיץ 19:30–22:00', 'לאה אלמוג', 'אין נגישות', 'נשים', 'https://mdrl.org.il/mikvaot/מקווה-פופל/'),
  r('rishon', 'מקווה טהרת לאה (נווה חוף)', 'הארגמן 10, ראשון לציון', 'הארגמן 10, ראשון לציון', '039413812', 'חורף 17:00–21:00 / קיץ 19:30–22:00', 'גליה זוארץ', 'נגישות חלקית', 'נשים', 'https://mdrl.org.il/mikvaot/מקווה-טהרת-לאה-נווה-חוף-2/'),
  r('rishon', 'מקווה רשב"י (רמת אליהו)', 'אנילביץ פינת חנה סנש, ראשון לציון', 'אנילביץ, ראשון לציון', '037301551', 'חורף 17:00–21:00 / קיץ 19:30–22:00', 'אורלי שבו', 'נגישות חלקית', 'נשים', 'https://mdrl.org.il/mikvaot/מקווה-רשבי-רמת-אליהו/'),
  r('rishon', 'מקווה בובה', 'קפאח 2, ראשון לציון', 'קפאח 2, ראשון לציון', '0548444307', 'חורף 17:00–21:00 / קיץ 19:30–22:00', 'ענת אלמלם', 'נגישות מלאה', 'נשים', 'https://mdrl.org.il/mikvaot/מקווה-בובה/'),
  r('rishon', 'מקווה רבי עקיבא (גברים)', 'בן אהרון אורפלי 4, ראשון לציון', 'אורפלי 4, ראשון לציון', '039508274', "א'-ה' 07:30–10:30 / ו' וערבי חג 07:30–11:00", 'יעקב כהן', 'אין נגישות', 'גברים', 'https://mdrl.org.il/mikvaot/מקווה-רבי-עקיבא/'),
  r('rishon', 'מקווה הבן איש חי (גברים)', 'לוז 30, ראשון לציון', 'לוז 30, ראשון לציון', '039508275', "א'-ה' 07:30–10:30 / ו' וערבי חג 07:30–11:00", 'רענן דוד', 'אין נגישות', 'גברים', 'https://mdrl.org.il/mikvaot/מקווה-נחלת-יהודה-גברים/'),
  r('rishon', 'מקווה רשב"י (גברים)', 'אנילביץ פינת חנה סנש, ראשון לציון', 'אנילביץ, ראשון לציון', '037301551', "א'-ה' 07:30–10:30 / ו' וערבי חג 07:30–11:00", 'רענן דוד', 'נגישות חלקית', 'גברים', 'https://mdrl.org.il/mikvaot/מקווה-רשבי-רמת-אליהו-2/'),
  r('rishon', 'מקווה הבעש"ט (גברים)', 'התזמורת 51, ראשון לציון', 'התזמורת 51, ראשון לציון', '039525925', "א'-ה' 07:30–10:30 / ו' וערבי חג 07:30–11:00", 'בצלאל כהן', 'אין נגישות', 'גברים', 'https://mdrl.org.il/mikvaot/מקווה-נאות-אשלים-גברים/'),
  r('rishon', 'מקווה טהרת לאה (גברים)', 'הארגמן 10, ראשון לציון', 'הארגמן 10, ראשון לציון', '039413812', "א'-ה' 07:30–10:30 / ו' וערבי חג 07:30–11:00", 'אבי אדרי', 'אין נגישות', 'גברים', 'https://mdrl.org.il/mikvaot/מקווה-טהרת-לאה-נווה-חוף/'),
  r('rishon', 'מקווה אור החיים (גברים)', 'פופל 20, ראשון לציון', 'פופל 20, ראשון לציון', '039588380', "א'-ה' 07:30–10:30 / ו' וערבי חג 07:30–11:00", 'בצלאל כהן', 'אין נגישות', 'גברים', 'https://mdrl.org.il/mikvaot/מקווה-פופל-גברים/'),

  // ===== רמת גן — mdrg.org.il (7 buildings: women + men + vessels) =====
  r('ramatgan', 'מקווה רמת השקמה', 'עזריאל 24, רמת גן', 'עזריאל 24, רמת גן', '036311256', 'נשים: קיץ מהשקיעה עד 22:30 / חורף עד 21:00 / ליל שבת שעה / מוצ"ש שעתיים', 'לימור 052-6636668', 'נגישות מלאה', 'נשים', 'https://mdrg.org.il/women-mikve/'),
  r('ramatgan', 'מקווה רמת יצחק', 'עוזיאל 5, רמת גן', 'עוזיאל 5, רמת גן', '036189340', 'נשים: קיץ מהשקיעה עד 22:30 / חורף עד 21:00', null, null, 'נשים', 'https://mdrg.org.il/women-mikve/'),
  r('ramatgan', 'מקווה רמת עמידר', 'מבצע עין 7, רמת גן', 'מבצע עין 7, רמת גן', '036774395', 'נשים: קיץ מהשקיעה עד 22:30 / חורף עד 21:00', null, null, 'נשים', 'https://mdrg.org.il/women-mikve/'),
  r('ramatgan', 'מקווה קריית קריניצי', 'גילדסגיים 12, רמת גן', 'גילדסגיים 12, רמת גן', '037363014', 'נשים: קיץ 19:00-22:00 / חורף 18:00-21:00', 'ורדה 050-4112074', null, 'נשים', 'https://mdrg.org.il/women-mikve/'),
  r('ramatgan', 'מקווה רמת אפעל', 'החוגה 2, רמת גן', 'החוגה 2, רמת גן', '036353919', 'נשים בתיאום טלפוני עם הבלנית 050-4633505', 'בלנית 050-4633505', null, 'נשים', 'https://mdrg.org.il/women-mikve/'),
  r('ramatgan', 'מקווה שכון ותיקים', 'העם הצרפתי 34, רמת גן', 'העם הצרפתי 34, רמת גן', '036737482', 'נשים: קיץ מהשקיעה עד 22:30 / חורף עד 21:00', null, null, 'נשים', 'https://mdrg.org.il/women-mikve/'),
  r('ramatgan', 'מקווה שדרות הגיבורים', 'שדרות הגיבורים 7, רמת גן', 'שדרות הגיבורים 7, רמת גן', '039402291', 'נשים: קיץ 19:00-22:00 / חורף 18:00-21:00', 'נורית 054-8449637', null, 'נשים', 'https://mdrg.org.il/women-mikve/'),
  r('ramatgan', 'מקווה גברים רמת השקמה', 'עזריאל 24, רמת גן', 'עזריאל 24, רמת גן', '036311256', "גברים: א'-ה' 6:00-8:00 / ערב שבת מ-11:00", null, 'נגישות מלאה', 'גברים', 'https://mdrg.org.il/men-mikve/'),
  r('ramatgan', 'מקווה גברים רמת יצחק', 'עוזיאל 5, רמת גן', 'עוזיאל 5, רמת גן', '036189340', "גברים: א'-ה' 6:00-8:00 / ערב שבת מ-11:00", null, null, 'גברים', 'https://mdrg.org.il/men-mikve/'),
  r('ramatgan', 'מקווה גברים רמת עמידר', 'מבצע עין 7, רמת גן', 'מבצע עין 7, רמת גן', '036774395', "גברים: א'-ה' 6:00-7:30 / ערב שבת מ-11:00", null, null, 'גברים', 'https://mdrg.org.il/men-mikve/'),
  r('ramatgan', 'מקווה כלים רמת שקמה', 'עזריאל 24, רמת גן', 'עזריאל 24, רמת גן', null, 'פתוח במהלך שעות היום עד שקיעת החמה', null, null, 'כלים', 'https://mdrg.org.il/מקוואות-כלים/'),
  r('ramatgan', 'מקווה כלים רמת אפעל', 'החוגה 2, רמת גן', 'החוגה 2, רמת גן', null, 'פתוח במהלך שעות היום עד שקיעת החמה', null, null, 'כלים', 'https://mdrg.org.il/מקוואות-כלים/'),

  // ===== גבעתיים — mdgiva.org (Waze coords present) =====
  r('givatayim', 'מקווה גברים טייבר', 'טייבר 55, גבעתיים', 'טייבר 55, גבעתיים', '0526688154', "א'-ה' 04:30-10:00 / ערב שבת 04:30-17:00", 'אבנר צמח', null, 'גברים', 'https://mdgiva.org/מקוואות/', { latitude: 32.0718731, longitude: 34.8072756 }),
  r('givatayim', 'מקווה נשים טייבר', 'טייבר 55, גבעתיים', 'טייבר 55, גבעתיים', '0527606228', 'מצאת הכוכבים למשך שעתיים / ליל שבת חצי שעה / מוצ"ש שעה', 'שושנה עטרי', null, 'נשים', 'https://mdgiva.org/מקוואות/', { latitude: 32.0718731, longitude: 34.8072756 }),
  r('givatayim', 'מקווה נשים מנרה', 'מנרה 2, גבעתיים', 'מנרה 2, גבעתיים', '0539537317', 'מצאת הכוכבים למשך שעתיים / ליל שבת חצי שעה / מוצ"ש סגור', 'אולגה קמחזי', null, 'נשים', 'https://mdgiva.org/מקוואות/', { latitude: 32.0763725, longitude: 34.8032615 }),

  // ===== קרית אתא — kiryat-ata.org.il =====
  r('kiryatata', 'מקווה גבעת רם', 'רחוב האלה (פינת אלמוג), קרית אתא', 'האלה, קרית אתא', '048480090', 'חצי שעה לפני השקיעה למשך 3 שעות', 'ישראל אסתר', null, 'נשים', 'https://www.kiryat-ata.org.il/residentservice/religiousservices/מקוואות/'),
  r('kiryatata', 'מקווה נווה אברהם (שכונת התימנים)', 'אלשייך 12, קרית אתא', 'אלשייך 12, קרית אתא', '0505478018', 'ערבי שבתות וחג, מוצ"ש', 'מיכל שבח', null, 'נשים', 'https://www.kiryat-ata.org.il/residentservice/religiousservices/מקוואות/'),
  r('kiryatata', 'מקווה מרכזי', 'המייסדים 16, קרית אתא', 'המייסדים 16, קרית אתא', '048444749', 'חורף: למשך 4 שעות / קיץ: למשך 3 שעות', 'דהן אוסנת', null, 'נשים', 'https://www.kiryat-ata.org.il/residentservice/religiousservices/מקוואות/'),
  r('kiryatata', 'מקווה קרית פרוסטיג/בנימין', 'קיבוץ גלויות 62, קרית אתא', 'קיבוץ גלויות 62, קרית אתא', '048452118', 'חורף: למשך 3.5 שעות / קיץ: למשך 3 שעות', 'פרץ פנינה', null, 'נשים', 'https://www.kiryat-ata.org.il/residentservice/religiousservices/מקוואות/'),
  r('kiryatata', 'מקווה שיכונים', 'רחוב יבניאלי, קרית אתא', 'יבניאלי, קרית אתא', '048452119', 'חורף: למשך 4 שעות / קיץ: למשך 3 שעות', 'רחל ביטון', null, 'נשים', 'https://www.kiryat-ata.org.il/residentservice/religiousservices/מקוואות/'),

  // ===== אשדוד — ashdodmd.org/mikvaot (women 11; the city gap, 0 live) =====
  r('ashdod', "מקווה רובע א'", 'רחוב משמר הירדן (צמוד לבית הכנסת זכרון קדושים), רובע א\', אשדוד', 'משמר הירדן, אשדוד', null, null, 'בלנית', 'אין נגישות', 'נשים', 'https://ashdodmd.org/mikvaot/'),
  r('ashdod', "מקווה רובע ג'", 'רחוב הפלמ"ח 25, רובע ג\', אשדוד', 'הפלמח 25, אשדוד', null, null, 'בלנית', 'אין נגישות', 'נשים', 'https://ashdodmd.org/mikvaot/'),
  r('ashdod', "מקווה רובע ד'", "רחוב הרב שאולי 5 (צמוד לבית הכנסת מגן אברהם), רובע ד', אשדוד", 'הרב שאולי 5, אשדוד', null, null, 'בלנית', 'יש כניסה נגישה, חדר נגיש, ללא מעלון', 'נשים', 'https://ashdodmd.org/mikvaot/'),
  r('ashdod', "מקווה רובע ו'", "רחוב ירמיהו הלפרין 5, רובע ו', אשדוד", 'ירמיהו הלפרין 5, אשדוד', null, null, 'בלנית', 'אין נגישות', 'נשים', 'https://ashdodmd.org/mikvaot/'),
  r('ashdod', "מקווה רובע ח'", "רחוב האתרוג 5 (פינת הכלנית), רובע ח', אשדוד", 'האתרוג 5, אשדוד', null, null, 'בלנית', 'אין נגישות', 'נשים', 'https://ashdodmd.org/mikvaot/'),
  r('ashdod', "מקווה רובע ט'", 'רחוב הגר"א 35, רובע ט\', אשדוד', 'הגרא 35, אשדוד', null, null, 'בלנית', 'יש כניסה נגישה, חדר נגיש, ללא מעלון', 'נשים', 'https://ashdodmd.org/mikvaot/'),
  r('ashdod', "מקווה רובע יא'", "רחוב הר חרמון 5 (צמוד לטיפת חלב), רובע יא', אשדוד", 'הר חרמון 5, אשדוד', null, null, 'בלנית', 'יש כניסה נגישה, חדר נגיש, ללא מעלון', 'נשים', 'https://ashdodmd.org/mikvaot/'),
  r('ashdod', "מקווה רובע יב'", "רחוב שבט דן 26, רובע יב', אשדוד", 'שבט דן 26, אשדוד', null, null, 'בלנית', 'יש כניסה נגישה, חדר נגיש, ללא מעלון', 'נשים', 'https://ashdodmd.org/mikvaot/'),
  r('ashdod', "מקווה רובע יג'", "רחוב המלך שלמה 20, רובע יג', אשדוד", 'המלך שלמה 20, אשדוד', null, null, 'בלנית', 'אין נגישות', 'נשים', 'https://ashdodmd.org/mikvaot/'),
  r('ashdod', "מקווה רובע טו'", "רחוב ברוריה 5 (צמוד לבית הכנסת), רובע טו', אשדוד", 'ברוריה 5, אשדוד', null, null, 'בלנית', 'אין נגישות', 'נשים', 'https://ashdodmd.org/mikvaot/'),
  r('ashdod', 'מקווה רובע הסיטי', 'רחוב העצמאות 39, רובע הסיטי, אשדוד', 'העצמאות 39, אשדוד', '0732654684', null, 'בלנית', 'נגישות מלאה כולל מנוף (בתיאום מראש)', 'נשים', 'https://ashdodmd.org/mikvaot/'),
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

// --- matching vs the live 615 -----------------------------------------------
const STOP = /מקוואות|מקואות|מקווה|מקוה|נשים|גברים|כלים|טהרת|טהורים|שכונת|שכון|שיכון|רובע|קרית|קריית|בית|הכנסת|רבי|רב|הרב|מרכזי/g;
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
  const liveByCity = (city: string) => live.filter((l) => String(l.cityId ?? '').includes(city) || String(l.address ?? '').includes(city));

  const analysis: any[] = [];
  const survivors: Rec[] = []; // not matched to live → candidates needing coords

  // Step 1 — dedup vs live by name-core + street (coords differ between sources,
  // so name/street match is primary; geo distance is a secondary confirmation).
  for (const rec of SRC) {
    const cfg = CITIES[rec.cityKey];
    const cands = liveByCity(cfg.city);
    const recCore = nameCore(rec.name), recSt = streetTokens(rec.address);
    let dup: any = null; let how = '';
    for (const l of cands) {
      const lCore = nameCore(l.name), lSt = streetTokens(l.address);
      if (streetMatch(recSt, lSt)) { dup = l; how = `street "${recSt.name}${recSt.num ? ' ' + recSt.num : ''}"`; break; }
      if (recCore.length && shareToken(recCore, lCore)) { dup = l; how = `name token [${recCore.filter((t) => lCore.includes(t)).join(',')}]`; break; }
      if (rec.location && l.location && meters(rec.location, l.location) <= 150) { dup = l; how = `${Math.round(meters(rec.location, l.location))}m`; break; }
    }
    if (dup) {
      analysis.push({ cityKey: rec.cityKey, name: rec.name, address: rec.address, gender: rec.gender, disposition: 'duplicate', reason: `matches live ${dup.id} (${dup.name}) by ${how}`, matchedLiveId: dup.id });
    } else {
      survivors.push(rec);
    }
  }

  // Step 2 — resolve ADDRESS-LEVEL coords for survivors (Waze validated, else GovMap).
  for (const rec of survivors) {
    const cfg = CITIES[rec.cityKey];
    if (rec.location) {
      rec.coordSource = inBbox(rec.location, cfg.bbox) && isInIsrael(rec.location) ? 'record-waze' : 'waze-out-of-bbox';
      if (rec.coordSource !== 'record-waze') rec.location = null;
      continue;
    }
    let gc = await govmap(rec.geo, cfg.city, cfg.bbox);
    await sleep(350);
    if (!gc && /["'׳״]/.test(rec.geo)) { gc = await govmap(sp(rec.geo.split(',')[0]) + ', ' + cfg.city, cfg.city, cfg.bbox); await sleep(350); }
    if (gc) { rec.location = gc.loc; rec.coordSource = 'govmap-ADDR_V1'; }
    else rec.coordSource = rec.geo.match(/\d/) ? 'govmap-no-match' : 'no-house-number';
  }

  // Step 3 — within-batch dedup (collapse same building / gender variants) + classify.
  const writeReadyKept: Rec[] = [];
  for (const rec of survivors) {
    const cfg = CITIES[rec.cityKey];
    let disposition: string, reason: string;
    if (!rec.location) {
      disposition = 'excluded'; reason = `no address-level coordinate (${rec.coordSource})`;
    } else {
      const st = streetTokens(rec.address);
      const twin = writeReadyKept.find((k) => k.cityKey === rec.cityKey && (streetMatch(streetTokens(k.address), st) || (k.location && meters(k.location, rec.location!) <= 40)));
      if (twin) { disposition = 'duplicate'; reason = `within-batch same building as "${twin.name}" (gender variant collapsed)`; }
      else { disposition = 'write_ready'; reason = `address-level coordinate (${rec.coordSource}), not a duplicate`; writeReadyKept.push(rec); }
    }
    analysis.push({ cityKey: rec.cityKey, name: rec.name, address: rec.address, geo: rec.geo, phone: rec.phone, gender: rec.gender, accessibility: rec.accessibility, coordSource: rec.coordSource, hasCoords: rec.location != null, location: rec.location, disposition, reason, matchedLiveId: null });
  }

  // Step 4 — normalize write-ready to Place (additive; provenance kept).
  const writeReady: Place[] = writeReadyKept.map((rec) => {
    const cfg = CITIES[rec.cityKey]; const loc = rec.location!;
    const place: Place = { id: `mikveh-${cfg.slug}-${loc.latitude.toFixed(5)}_${loc.longitude.toFixed(5)}`, name: rec.name, type: 'mikveh', cityId: cfg.city, address: rec.address, location: loc, source: 'seed' };
    if (rec.coordSource === 'govmap-ADDR_V1') place.locationPrecision = 'address';
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

  // Phase 19 carry-over (do NOT write; included only in the accumulated count).
  let phase19: Place[] = [];
  try { phase19 = readJson<Place[]>(join(OUT, 'phase19-write-ready-preview.json')); } catch { /* optional */ }

  const byCity = (key: string) => ({
    parsed: SRC.filter((s) => s.cityKey === key).length,
    duplicateVsLive: analysis.filter((a) => a.cityKey === key && a.disposition === 'duplicate' && a.matchedLiveId).length,
    withinBatchDup: analysis.filter((a) => a.cityKey === key && a.disposition === 'duplicate' && !a.matchedLiveId).length,
    excluded: analysis.filter((a) => a.cityKey === key && a.disposition === 'excluded').length,
    writeReady: writeReadyKept.filter((s) => s.cityKey === key).length,
  });

  const accumulated = phase19.length + writeReady.length;
  const summary = {
    generatedNote: 'PHASE 20 DRY-RUN — 5 official street-address councils (Rishon LeZion, Ramat Gan, Givatayim, Kiryat Ata, Ashdod). Address-level coords only (Waze bbox-validated OR GovMap ADDR_V1). No Nominatim, no settlement-level. No DB write, no publish, no rebuild.',
    sources: Object.fromEntries(Object.keys(CITIES).map((k) => [CITIES[k].city, { url: CITIES[k].sourceUrl, ...byCity(k) }])),
    totalParsed: SRC.length,
    duplicatesVsLive: analysis.filter((a) => a.disposition === 'duplicate' && a.matchedLiveId).length,
    withinBatchDuplicates: analysis.filter((a) => a.disposition === 'duplicate' && !a.matchedLiveId).length,
    excludedNoAddressCoord: analysis.filter((a) => a.disposition === 'excluded').length,
    writeReady: writeReady.length,
    writeReadyByCity: writeReadyKept.reduce<Record<string, number>>((a, s) => { const c = CITIES[s.cityKey].city; a[c] = (a[c] ?? 0) + 1; return a; }, {}),
    idCollisions: collisions.length, duplicateAppIds: dupAppIds.length,
    finalRecommendedWriteCount: collisions.length || dupAppIds.length ? 0 : writeReady.length,
    liveMikvehBefore: live.length,
    estimatedTotalAfterWrite: live.length + (collisions.length || dupAppIds.length ? 0 : writeReady.length),
    keyFinding: 'Of the 5 cities, only אשדוד was a real gap (0 live). ראשון לציון / רמת גן / גבעתיים / קרית אתא are already covered in the live 615 (recon records dedup against existing buildings). Net-new = Ashdod address-geocoded mikvahs.',
    enrichmentOpportunity: 'Many live records in the 4 covered cities lack attendant/hours/accessibility that these councils publish — a future ENRICHMENT pass (fill-empty-only, per golden rules) could backfill them. Not done here.',
    phase19CarryOver: { writeReadyRecords: phase19.length, note: 'Phase 19 (Beit Shemesh + Kiryat Gat) write-ready — still NOT written.' },
    accumulatedWriteReadyForNextWrite: accumulated,
    accumulatedNote: `Phase 19 (${phase19.length}) + Phase 20 (${writeReady.length}) = ${accumulated} records ready for ONE additive write when authorized.`,
    rollbackPlan: ['Backup places.osm.json → places.osm.pre-phase20.backup.json (+cities) before any write', 'Additive append only; do NOT run rebuildAppDataset'],
    dryRun: true, liveDataTouched: false, publishPerformed: false, rebuildTouched: false,
  };

  writeFileSync(join(OUT, 'phase20-preview.json'), JSON.stringify(SRC, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase20-merge-analysis.json'), JSON.stringify(analysis, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase20-write-ready-preview.json'), JSON.stringify(writeReady, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase20-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase20-source-catalog.json'), JSON.stringify(Object.fromEntries(Object.keys(CITIES).map((k) => [CITIES[k].city, { sourceName: CITIES[k].sourceName, url: CITIES[k].sourceUrl, parsed: SRC.filter((s) => s.cityKey === k).length }])), null, 2), 'utf8');

  console.log('=== Phase 20 (dry-run) ===');
  console.log(`parsed ${SRC.length} across 5 councils`);
  console.log(`dup vs live ${summary.duplicatesVsLive} | within-batch dup ${summary.withinBatchDuplicates} | excluded(no addr-coord) ${summary.excludedNoAddressCoord}`);
  console.log(`write-ready ${writeReady.length} ${JSON.stringify(summary.writeReadyByCity)} | id collisions ${collisions.length}`);
  console.log(`live before ${live.length} → est after write ${summary.estimatedTotalAfterWrite}`);
  console.log(`ACCUMULATED for next write: Phase19 ${phase19.length} + Phase20 ${writeReady.length} = ${accumulated}`);
}

if (isMain(import.meta.url)) void run();
