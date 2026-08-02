/**
 * Import New Deli (ניו דלי) kosher branches.
 * - Deletes 3 stale OSM entries
 * - Adds 39 verified branches
 * Source: https://newdeli.com/סניפים/ — official website, verified 2026-08-02
 * Run: node scripts/import-newdeli.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';

const DATA_PATH = './src/data/generated/places.osm.json';
const VERIFIED = '2026-08-02';
const WEBSITE = 'https://newdeli.com';
const INSTAGRAM = 'https://www.instagram.com/newdeli_official/';
const FACEBOOK = 'https://www.facebook.com/NewDeliSandwich';

function load() {
  return JSON.parse(readFileSync(DATA_PATH, 'utf8').replace(/^﻿/, ''));
}
function save(data) {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}
function makeId(addr) {
  return 'newdeli-' + createHash('md5').update(addr).digest('hex').slice(0, 8);
}
const CITY_LOC = {
  'ירושלים':       { latitude: 31.7683, longitude: 35.2137 },
  'תל אביב':       { latitude: 32.0853, longitude: 34.7818 },
  'חיפה':          { latitude: 32.7940, longitude: 34.9896 },
  'באר שבע':       { latitude: 31.2520, longitude: 34.7915 },
  'אשדוד':         { latitude: 31.8044, longitude: 34.6553 },
  'פתח תקווה':     { latitude: 32.0875, longitude: 34.8878 },
  'ראשון לציון':   { latitude: 31.9730, longitude: 34.7925 },
  'רמת גן':        { latitude: 32.0693, longitude: 34.8237 },
  'גבעתיים':       { latitude: 32.0677, longitude: 34.8118 },
  'רעננה':         { latitude: 32.1839, longitude: 34.8706 },
  'מודיעין':       { latitude: 31.8928, longitude: 34.9992 },
  'רמלה':          { latitude: 31.9277, longitude: 34.8678 },
  'נהריה':         { latitude: 33.0076, longitude: 35.0977 },
  'אריאל':         { latitude: 32.1065, longitude: 35.1692 },
  'אלעד':          { latitude: 32.0499, longitude: 34.9488 },
  'ביתר עילית':    { latitude: 31.6973, longitude: 35.1178 },
  'מעלה אדומים':   { latitude: 31.7744, longitude: 35.2992 },
  'ראש פינה':      { latitude: 32.9663, longitude: 35.5503 },
  'רמת בית שמש':  { latitude: 31.7321, longitude: 34.9910 },
  'אפרת':          { latitude: 31.6575, longitude: 35.1620 },
  'שואבה':         { latitude: 31.8011, longitude: 35.0511 },
  'צור הדסה':      { latitude: 31.7241, longitude: 35.0869 },
  'קריית ביאליק':  { latitude: 32.8217, longitude: 35.0762 },
  'שער בנימין':    { latitude: 31.9270, longitude: 35.2320 },
};

const DELETE_OSM = new Set([
  'osm-node-6469411085',  // New Deli מנחם בגין 134
  'osm-node-11711437812', // New Deli רמת גן
  'osm-node-12673043882', // New Deli פתח תקווה
]);

// kosherType mapping
function kt(raw) {
  if (/מחפוד/.test(raw)) return 'rav_machpud';
  return 'rabanut_mekomi';
}

const BRANCHES = [
  { name: 'ניו דלי אריאל',               cityId: 'אריאל',         address: 'רמת הגולן 2, כיכר הגבורה, אריאל',              phone: '077-8801755', hours: 'א׳-ה׳ 11:00-22:00',                                                                  kosher: 'כשר בהשגחת רבנות אריאל' },
  { name: 'ניו דלי קריית יובל',          cityId: 'ירושלים',       address: 'הנרייטה סולד 1, קריית יובל, ירושלים',            phone: '077-3034041', hours: 'א׳-ה׳ 11:00-23:00',                                                                  kosher: 'כשרות מהדרין מחפוד' },
  { name: 'ניו דלי שער בנימין',          cityId: 'שער בנימין',    address: 'יד היוצר 2, אזור תעשייה שער בנימין',             phone: '077-9800480', hours: 'א׳-ה׳ 11:00-21:45',                                                                  kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי עזריאלי תל אביב',    cityId: 'תל אביב',       address: 'דרך בגין 132, קומה 2, קניון עזריאלי, תל אביב',   phone: '054-9162868', hours: 'א׳-ה׳ 11:00-21:00 | ו׳ 10:00-15:00',                                               kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי דיזינגוף סנטר',      cityId: 'תל אביב',       address: 'שער 7 דיזינגוף סנטר, תל אביב',                   phone: '03-5600500', hours: 'א׳-ה׳ 11:00-22:00 | ו׳ 11:00-15:30',                                                kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי ממילא',               cityId: 'ירושלים',       address: 'שדרות אלרוב ממילא, ירושלים',                     phone: null,         hours: 'א׳-ה׳ 11:00-22:30 | ו׳ 11:00-14:30 | ש׳ 21:00-23:00',                                   kosher: 'כשרות מהדרין מחפוד' },
  { name: 'ניו דלי מודיעין סנטר',       cityId: 'מודיעין',       address: 'צאלון 21, מודיעין',                               phone: '08-9700500', hours: 'א׳-ה׳ 11:00-22:00 | ו׳ 10:45-14:45 | ש׳ 20:20-22:30',                                   kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי קניון איילון',        cityId: 'רמת גן',        address: 'דרך אבא הלל 310, קניון איילון, רמת גן',          phone: null,         hours: 'א׳-ה׳ 11:00-22:00 | ו׳ 11:00-15:00 | ש׳ 21:30-23:00',                                   kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי עזריאלי מודיעין',    cityId: 'מודיעין',       address: 'לב העיר 1, קניון עזריאלי, מודיעין',              phone: '08-9447944', hours: 'א׳-ה׳ 10:00-22:00 | ו׳ 10:30-15:00 | ש׳ 20:30-23:00',                                   kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי הקניון הגדול',       cityId: 'פתח תקווה',     address: 'ז׳בוטינסקי 72, הקניון הגדול, פתח תקווה',         phone: '03-7733114', hours: 'א׳-ה׳ 11:00-22:00 | ו׳ 11:00-15:30 | ש׳ 21:30-23:00',                                   kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי עזריאלי רמלה',       cityId: 'רמלה',          address: 'דוד רזיאל 1, קומה 2, קניון עזריאלי, רמלה',      phone: '08-9200100', hours: 'א׳-ה׳ 10:30-22:00 | ו׳ 10:30-15:00 | ש׳ 20:45-22:30',                                   kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי קניון רננים',         cityId: 'רעננה',         address: 'המלאכה 2, קומה מינוס 1, קניון רננים, רעננה',     phone: '09-8998252', hours: 'א׳-ה׳ 11:00-22:00 | ו׳ 11:00-15:00',                                                kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי עזריאלי גבעתיים',    cityId: 'גבעתיים',       address: 'דרך יצחק רבין 53, קניון עזריאלי, גבעתיים',      phone: '03-7786380', hours: 'א׳-ה׳ 11:00-21:45 | ו׳ 11:00-15:30',                                                kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי שער ראשון',          cityId: 'ראשון לציון',   address: 'גולדה מאיר 1, שער ראשון, ראשון לציון',           phone: '077-9386338', hours: 'א׳-ה׳ 10:30-22:00 | ו׳ 10:30-15:00',                                               kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי אלעד',               cityId: 'אלעד',          address: 'רבי יהודה הנשיא 94, אלעד',                       phone: '077-9800412', hours: 'א׳-ה׳ 11:00-23:30',                                                                 kosher: 'כשרות מהדרין מחפוד' },
  { name: 'ניו דלי ז׳בוטינסקי רמת גן', cityId: 'רמת גן',        address: 'ז׳בוטינסקי 155, רמת גן',                         phone: '077-9800397', hours: 'א׳-ה׳ 11:00-23:00',                                                                 kosher: 'כשרות מהדרין מחפוד' },
  { name: 'ניו דלי תחנה מרכזית ירושלים', cityId: 'ירושלים',     address: 'יפו 224, קומה 2, תחנה מרכזית, ירושלים',          phone: '02-6500660', hours: 'א׳-ד׳ 10:00-23:00 | ה׳ 10:00-23:30 | ו׳ 10:00-15:00 | ש׳ 21:30-23:30',          kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי בן יהודה',           cityId: 'ירושלים',       address: 'בן יהודה 2, ירושלים',                             phone: '02-6744755', hours: 'א׳-ד׳ 11:00-23:30 | ה׳ 11:00-01:30 | ו׳ 11:00-16:00 | ש׳ 21:30-01:00',          kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי מחנה יהודה',         cityId: 'ירושלים',       address: 'אגריפס 62, מחנה יהודה, ירושלים',                 phone: '02-9998094', hours: 'א׳-ד׳ 11:00-02:00 | ה׳ 11:00-04:00 | ו׳ 11:00-16:00 | ש׳ 21:00-03:00',          kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי עמק רפאים',          cityId: 'ירושלים',       address: 'עמק רפאים 44, ירושלים',                           phone: '02-5639555', hours: 'א׳-ה׳ 11:00-23:00 | ש׳ 21:30-23:00',                                               kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי יפו ירושלים',        cityId: 'ירושלים',       address: 'יפו 34, ירושלים',                                 phone: '02-6221551', hours: 'א׳-ה׳ 11:00-23:30 | ש׳ 21:15-00:30',                                               kosher: 'כשרות מהדרין מחפוד' },
  { name: 'ניו דלי סינמה סיטי',         cityId: 'ירושלים',       address: 'שדרות יצחק רבין 10, סינמה סיטי, ירושלים',        phone: '054-5766551', hours: 'א׳-ד׳ 10:00-22:45 | ה׳ 10:00-00:30 | ש׳ 21:00-00:30',                          kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי שרי ישראל',          cityId: 'ירושלים',       address: 'שרי ישראל 15, ירושלים',                           phone: '02-6299744', hours: 'א׳-ה׳ 11:00-01:00 | ש׳ 21:45-01:00',                                               kosher: 'כשר למהדרין – בהשגחת הרב מחפוד' },
  { name: 'ניו דלי רמת בית שמש',       cityId: 'רמת בית שמש',  address: 'נחל צאלים 2, רמת בית שמש',                       phone: '02-5404080', hours: 'א׳-ה׳ 11:00-23:00',                                                                 kosher: 'כשר למהדרין – בהשגחת הרב מחפוד' },
  { name: 'ניו דלי תלפיות',             cityId: 'ירושלים',       address: 'יד חרוצים 18, קניון אחים ישראל, תלפיות, ירושלים', phone: '02-9966111', hours: 'א׳-ה׳ 10:30-22:30',                                                             kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי קניון מלחה',         cityId: 'ירושלים',       address: 'אגודת ספורט ביתר 1, קניון מלחה, ירושלים',        phone: '02-5877337', hours: 'א׳-ה׳ 11:00-23:00 | ש׳ 21:20-00:00',                                               kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי שואבה',              cityId: 'שואבה',         address: 'שואבה 1, תחנת דלק פז, צומת שורש',                phone: '02-5805808', hours: 'א׳-ה׳ 11:00-00:00 | ו׳ 11:00-16:00 | ש׳ 21:00-00:00',                               kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי אפרת',               cityId: 'אפרת',          address: 'התאנה 1, אפרת',                                   phone: '02-9999513', hours: 'א׳-ה׳ 10:30-00:00 | ש׳ 21:30-00:00',                                               kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי פסגת זאב',           cityId: 'ירושלים',       address: 'משה דיין, פסגת זאב, ירושלים',                     phone: '02-5489185', hours: 'א׳-ה׳ 11:00-23:00 | ש׳ 19:30-00:00',                                               kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי צור הדסה',           cityId: 'צור הדסה',      address: 'הרכסים 15, צור הדסה',                              phone: '02-6744766', hours: 'א׳-ד׳ 11:00-22:00 | ה׳ 11:00-23:00 | ש׳ 20:45-23:00',                               kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי מעלה אדומים',        cityId: 'מעלה אדומים',   address: 'קניון מעלה אדומים, מעלה אדומים',                 phone: '055-6654444', hours: 'א׳-ה׳ 11:00-21:30 | ש׳ 20:15-23:00',                                               kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי לב המפרץ חיפה',     cityId: 'חיפה',          address: 'שדרות ההסתדרות, סינמול לב המפרץ, קומה 2, חיפה',  phone: '04-6599056', hours: 'א׳-ה׳ 11:00-21:00 | ו׳ 11:00-13:00',                                            kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי קריון קריית ביאליק', cityId: 'קריית ביאליק',  address: 'דרך עכו 192, קניון הקריון, קריית ביאליק',        phone: '04-7705104', hours: 'א׳-ה׳ 10:45-21:35 | ו׳ 10:45-15:00 | ש׳ 20:55-22:45',                               kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי עזריאלי חיפה',      cityId: 'חיפה',          address: 'משה פלימן 4, קניון עזריאלי, חיפה',                phone: '04-6189999', hours: 'א׳-ה׳ 10:30-21:00 | ו׳ 10:30-14:00',                                             kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי ראש פינה',           cityId: 'ראש פינה',      address: 'סנטר הגליל, ראש פינה',                             phone: '050-2607300', hours: 'א׳-ה׳ 11:00-22:00 | ש׳ 20:45-23:00',                                              kosher: 'כשר למהדרין – בהשגחת הרב מחפוד' },
  { name: 'ניו דלי ארנה נהריה',         cityId: 'נהריה',         address: 'קניון ארנה, נהריה',                                phone: '04-6357771', hours: 'א׳-ה׳ 11:00-21:00 | ו׳ 11:00-13:00',                                             kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי הסיטי אשדוד',       cityId: 'אשדוד',         address: 'מנחם בגין 1, קניון הסיטי, אשדוד',                phone: '08-9192333', hours: 'א׳-ה׳ 10:00-22:00 | ו׳ 10:00-15:30 | ש׳ 21:30-23:00',                               kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי תחנה מרכזית באר שבע', cityId: 'באר שבע',     address: 'בן צבי 4, תחנה מרכזית, באר שבע',                 phone: '08-6791445', hours: 'א׳ 09:00-22:00 | ב׳-ד׳ 10:00-22:00 | ה׳ 09:00-23:00 | ו׳ 09:00-15:00',          kosher: 'כשר בהשגחת הרבנות הראשית' },
  { name: 'ניו דלי ביתר עילית',         cityId: 'ביתר עילית',    address: 'בניין דוד 23, ביתר עילית',                        phone: '077-3034140', hours: 'א׳-ד׳ 10:00-23:00 | ה׳ 10:00-00:00',                                              kosher: 'כשר למהדרין – בהשגחת הרב מחפוד' },
];

// ════════════════════════════════════════════════════════════════════════════════
let data = load();
const before = data.length;

// 1. Delete old OSM entries
data = data.filter(p => !DELETE_OSM.has(p.id));
console.log(`Deleted ${before - data.length} OSM entries`);

// 2. Add new branches
const newEntries = BRANCHES.map(b => ({
  id: makeId(b.address),
  name: b.name,
  type: 'fast_food',
  cityId: b.cityId,
  address: b.address,
  location: CITY_LOC[b.cityId] ?? { latitude: 31.5, longitude: 34.75 },
  locationPrecision: 'city',
  phone: b.phone ?? undefined,
  website: WEBSITE,
  instagram: INSTAGRAM,
  facebook: FACEBOOK,
  openingHours: b.hours ?? undefined,
  category: 'meat',
  kosherType: kt(b.kosher),
  certifiedBy: b.kosher,
  source: 'manual',
  sourceUrl: WEBSITE,
  lastVerifiedAt: VERIFIED,
}));

data.push(...newEntries);
console.log(`Added ${newEntries.length} New Deli entries`);

save(data);
console.log(`Total: ${before} → ${data.length} records (+${data.length - before})`);
