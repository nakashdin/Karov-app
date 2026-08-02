/**
 * Import verified kosher chains from קריית מאיר OSM cleanup.
 * - Deletes 15 stale/non-kosher OSM entries
 * - Updates 12 existing cafecafe-* entries with verified data
 * - Adds ~70 new verified branch entries
 * - Fixes cityId קריית מאיר → תל אביב for remaining records
 *
 * Sources: official chain websites, verified 2026-08-02
 * Run: node scripts/import-kiriat-meir-chains.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';

const DATA_PATH = './src/data/generated/places.osm.json';
const VERIFIED = '2026-08-02';

function load() {
  return JSON.parse(readFileSync(DATA_PATH, 'utf8').replace(/^﻿/, ''));
}
function save(data) {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}
function id(prefix, key) {
  return prefix + '-' + createHash('md5').update(key).digest('hex').slice(0, 8);
}
function cityLoc(city) {
  const map = {
    'תל אביב':        { latitude: 32.0853, longitude: 34.7818 },
    'ירושלים':        { latitude: 31.7683, longitude: 35.2137 },
    'חיפה':           { latitude: 32.7940, longitude: 34.9896 },
    'באר שבע':        { latitude: 31.2520, longitude: 34.7915 },
    'נתניה':          { latitude: 32.3215, longitude: 34.8532 },
    'אשדוד':          { latitude: 31.8044, longitude: 34.6553 },
    'פתח תקווה':      { latitude: 32.0875, longitude: 34.8878 },
    'רמת גן':         { latitude: 32.0693, longitude: 34.8237 },
    'חולון':          { latitude: 32.0119, longitude: 34.7735 },
    'בת ים':          { latitude: 32.0194, longitude: 34.7527 },
    'בני ברק':        { latitude: 32.0818, longitude: 34.8338 },
    'הרצליה':         { latitude: 32.1663, longitude: 34.8436 },
    'רעננה':          { latitude: 32.1839, longitude: 34.8706 },
    'כפר סבא':        { latitude: 32.1784, longitude: 34.9062 },
    'נהריה':          { latitude: 33.0076, longitude: 35.0977 },
    'עכו':            { latitude: 32.9270, longitude: 35.0826 },
    'טבריה':          { latitude: 32.7940, longitude: 35.5337 },
    'קריית שמונה':    { latitude: 33.2071, longitude: 35.5705 },
    'קריית ים':       { latitude: 32.8292, longitude: 35.0793 },
    'עפולה':          { latitude: 32.6098, longitude: 35.2898 },
    'מגדל העמק':      { latitude: 32.6752, longitude: 35.2378 },
    'נתיבות':         { latitude: 31.4236, longitude: 34.5929 },
    'דימונה':         { latitude: 31.0641, longitude: 35.0291 },
    'ערד':            { latitude: 31.2583, longitude: 35.2136 },
    'גבעתיים':        { latitude: 32.0677, longitude: 34.8118 },
    'גבעת שמואל':     { latitude: 32.0830, longitude: 34.8515 },
    'קריית ביאליק':   { latitude: 32.8217, longitude: 35.0762 },
    'מצפה רמון':      { latitude: 30.6100, longitude: 34.7994 },
    'חדרה':           { latitude: 32.4352, longitude: 34.9196 },
    'גדרה':           { latitude: 31.8159, longitude: 34.7729 },
    'רמלה':           { latitude: 31.9277, longitude: 34.8678 },
    'מבשרת ציון':     { latitude: 31.8046, longitude: 35.1546 },
    'ראש העין':       { latitude: 32.0940, longitude: 34.9564 },
    'מודיעין':        { latitude: 31.8928, longitude: 34.9992 },
    'אפרת':           { latitude: 31.6575, longitude: 35.1620 },
    'רחובות':         { latitude: 31.8928, longitude: 34.8143 },
    'אילת':           { latitude: 29.5581, longitude: 34.9482 },
    'בקעת הירדן':     { latitude: 31.9556, longitude: 35.5214 },
    'נמל תעופה':      { latitude: 32.0055, longitude: 34.8854 },
  };
  return map[city] ?? { latitude: 31.5, longitude: 34.75 };
}
function entry(prefix, cityId, obj) {
  return {
    id: id(prefix, obj.address),
    name: obj.name,
    type: obj.type ?? 'restaurant',
    cityId,
    address: obj.address,
    location: cityLoc(cityId),
    locationPrecision: 'city',
    phone: obj.phone ?? undefined,
    website: obj.website ?? undefined,
    menu: obj.menu ?? undefined,
    instagram: obj.instagram ?? undefined,
    facebook: obj.facebook ?? undefined,
    openingHours: obj.openingHours ?? undefined,
    category: obj.category,
    kosherType: obj.kosherType,
    certifiedBy: obj.certifiedBy ?? undefined,
    source: 'manual',
    sourceUrl: obj.website ?? undefined,
    lastVerifiedAt: VERIFIED,
  };
}

// ── OSM entries to delete ────────────────────────────────────────────────────
const DELETE_OSM = new Set([
  'osm-node-2078969784',  // Meat Kitchen — permanently closed
  'osm-node-10812430080', // Wok to Walk — non-kosher branch (Nahalat Binyamin)
  'osm-node-10795083145', // Meatos — no kosherType
  'osm-node-10968175320', // Bread Station — no kosherType
  'osm-node-13339015829', // Bagel Cafe TLV HaArbaa — replaced
  'osm-node-13436566658', // Bagel Cafe Jerusalem — replaced (encoding issue)
  'osm-node-6469411085',  // New Deli מנחם בגין 134 — replaced
  'osm-node-11711437812', // New Deli רמת גן — replaced
  'osm-node-12673043882', // New Deli פתח תקווה — replaced
  'osm-node-6469411086',  // בורגרס בר מנחם בגין 132 — replaced by manual entry
  'osm-node-10964969762', // בורגרס בר מבשרת ציון — replaced by manual entry
  'osm-node-5202278925',  // קפה קפה ראשון לציון OSM — replaced
  'osm-node-6181052482',  // קפה קפה יקנעם OSM — replaced
  'osm-node-6469411088',  // קפה קפה קריית מאיר OSM — replaced
  'osm-node-2837962901',  // PokeShop אבן גבירול OSM — replaced
  'osm-node-10669458560', // PokeShop בני ברק OSM — replaced
]);

// ── cafecafe-* existing entries: update fields from official site ─────────────
const CAFECAFE_UPDATES = {
  'cafecafe-62b8584d': { // Tel Aviv Azrieli
    name: 'קפה קפה תל אביב עזריאלי',
    address: 'קומה 2, מתחם המזון, קניון עזריאלי, דרך מנחם בגין 132, תל אביב',
    phone: '03-6094770',
    openingHours: 'א׳-ה׳ 09:00-21:00 | ו׳ 08:00-15:00 | מוצ״ש שעה לאחר שבת עד 23:00',
    kosherType: 'rav_machpud',
    certifiedBy: 'כשרות הרב מחפוד',
    menu: 'https://www.cafecafe.co.il/Warehouse/userUploadFiles/Image/Menu/%D7%AA%D7%A4%D7%A8%D7%99%D7%98%20%D7%9B%D7%A9%D7%A8.pdf',
    lastVerifiedAt: VERIFIED,
  },
  'cafecafe-5c2f2139': { // Bat Yam
    name: 'קפה קפה בת ים טיילת',
    phone: '054-6444825',
    openingHours: 'א׳-ה׳ 08:00-00:00 | ו׳ 08:00 עד 2 שעות לפני שבת | מוצ״ש שעה לאחר שבת עד 00:00',
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד״צ בית יוסף',
    menu: 'https://www.cafecafe.co.il/Warehouse/userUploadFiles/Image/Menu/%D7%AA%D7%A4%D7%A8%D7%99%D7%98%20%D7%9B%D7%A9%D7%A8.pdf',
    lastVerifiedAt: VERIFIED,
  },
  'cafecafe-4ffa66b3': { // Ashdod
    name: 'קפה קפה אשדוד ביג פאשן',
    phone: '08-9159656',
    openingHours: 'א׳-ה׳ 09:30 עד אחרון | ו׳ 08:30-13:30 | מוצ״ש שעה לאחר שבת עד אחרון',
    kosherType: 'mehadrin',
    certifiedBy: 'כשר למהדרין',
    menu: 'https://www.cafecafe.co.il/Warehouse/userUploadFiles/Image/Menu/%D7%AA%D7%A4%D7%A8%D7%99%D7%98%20%D7%9B%D7%A9%D7%A8.pdf',
    lastVerifiedAt: VERIFIED,
  },
  'cafecafe-f4d3714f': { // Migdal Haemek
    name: 'קפה קפה מגדל העמק',
    phone: '04-6023535',
    openingHours: 'א׳-ה׳ 08:00-00:00 | ו׳ 08:00 עד שעה לפני שבת | מוצ״ש שעה לאחר שבת עד אחרון',
    kosherType: 'mehadrin',
    certifiedBy: 'כשר למהדרין',
    menu: 'https://www.cafecafe.co.il/Warehouse/userUploadFiles/Image/Menu/%D7%AA%D7%A4%D7%A8%D7%99%D7%98%20%D7%9B%D7%A9%D7%A8.pdf',
    lastVerifiedAt: VERIFIED,
  },
  'cafecafe-51daae8d': { // Nativot
    name: 'קפה קפה נתיבות',
    phone: '08-9920808',
    openingHours: 'א׳-ה׳ 08:00-00:00 | ו׳ 08:00-15:00 | מוצ״ש שעה לאחר שבת עד אחרון',
    kosherType: 'mehadrin',
    certifiedBy: 'כשר למהדרין',
    menu: 'https://www.cafecafe.co.il/Warehouse/userUploadFiles/Image/Menu/%D7%AA%D7%A4%D7%A8%D7%99%D7%98%20%D7%9B%D7%A9%D7%A8.pdf',
    lastVerifiedAt: VERIFIED,
  },
  'cafecafe-f2d1ffaf': { // Nahariya
    name: 'קפה קפה נהריה',
    phone: '04-9512350',
    openingHours: 'א׳-ה׳ 08:00 עד אחרון | ו׳ 08:00 עד שעה לפני שבת | מוצ״ש 30 דק׳ לאחר שבת עד אחרון',
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד״צ בית יוסף',
    menu: 'https://www.cafecafe.co.il/Warehouse/userUploadFiles/Image/Menu/%D7%AA%D7%A4%D7%A8%D7%99%D7%98%20%D7%9B%D7%A9%D7%A8.pdf',
    lastVerifiedAt: VERIFIED,
  },
  'cafecafe-ce29d0fc': { // Kiryat Yam
    name: 'קפה קפה קריית ים',
    phone: '04-8704296',
    openingHours: 'א׳-ה׳ 07:30 עד אחרון | ו׳ 07:30 עד שעה לפני שבת | מוצ״ש 30 דק׳ לאחר שבת עד אחרון',
    kosherType: 'kosher',
    certifiedBy: 'כשר',
    menu: 'https://www.cafecafe.co.il/Warehouse/userUploadFiles/Image/Menu/%D7%AA%D7%A4%D7%A8%D7%99%D7%98%20%D7%9B%D7%A9%D7%A8.pdf',
    lastVerifiedAt: VERIFIED,
  },
  'cafecafe-ebc5d550': { // Holon Wolfson
    name: 'קפה קפה חולון וולפסון',
    phone: '054-4778245',
    openingHours: 'א׳-ה׳ 06:00-23:00 | ו׳ 06:00-16:00 | שבת סגור',
    kosherType: 'kosher',
    certifiedBy: 'כשר',
    menu: 'https://www.cafecafe.co.il/Warehouse/userUploadFiles/Image/Menu/%D7%AA%D7%A4%D7%A8%D7%99%D7%98%20%D7%9B%D7%A9%D7%A8.pdf',
    lastVerifiedAt: VERIFIED,
  },
  'cafecafe-1f024114': { // Jordan Valley
    name: 'קפה קפה בקעת הירדן',
    phone: '02-9400808',
    openingHours: 'א׳-ה׳ 08:00-21:00 | ו׳ 08:00-15:00 | שבת סגור',
    kosherType: 'kosher',
    certifiedBy: 'כשר',
    menu: 'https://www.cafecafe.co.il/Warehouse/userUploadFiles/Image/Menu/%D7%AA%D7%A4%D7%A8%D7%99%D7%98%20%D7%9B%D7%A9%D7%A8.pdf',
    lastVerifiedAt: VERIFIED,
  },
  'cafecafe-1378bb13': { // Beer Sheba ONE PLAZA
    name: 'קפה קפה באר שבע ONE PLAZA',
    phone: '08-6628983',
    openingHours: 'א׳-ה׳ 08:30-22:00 | ו׳ 08:00-13:30 | מוצ״ש שעה לאחר שבת עד 01:00',
    kosherType: 'kosher',
    certifiedBy: 'כשר',
    menu: 'https://www.cafecafe.co.il/Warehouse/userUploadFiles/Image/Menu/%D7%AA%D7%A4%D7%A8%D7%99%D7%98%20%D7%9B%D7%A9%D7%A8.pdf',
    lastVerifiedAt: VERIFIED,
  },
  'cafecafe-000c1e00': { // Akko
    name: 'קפה קפה עכו',
    phone: '04-8507294',
    openingHours: 'א׳-ה׳ 08:30 עד אחרון | ו׳ 08:00 עד 3 שעות לפני שבת | מוצ״ש שעה לאחר שבת עד אחרון',
    kosherType: 'kosher',
    certifiedBy: 'כשר',
    menu: 'https://www.cafecafe.co.il/Warehouse/userUploadFiles/Image/Menu/%D7%AA%D7%A4%D7%A8%D7%99%D7%98%20%D7%9B%D7%A9%D7%A8.pdf',
    lastVerifiedAt: VERIFIED,
  },
  'cafecafe-7abe4d67': { // Tiberias
    name: 'קפה קפה טבריה ביג פאשן',
    phone: '04-6723400',
    instagram: 'https://www.instagram.com/cafecafe_big_fashion/',
    openingHours: 'א׳-ה׳ 08:30-22:00 | ו׳ 09:00-14:30 | מוצ״ש שעה לאחר שבת עד 23:00',
    kosherType: 'kosher',
    certifiedBy: 'כשר',
    menu: 'https://www.cafecafe.co.il/Warehouse/userUploadFiles/Image/Menu/%D7%AA%D7%A4%D7%A8%D7%99%D7%98%20%D7%9B%D7%A9%D7%A8.pdf',
    lastVerifiedAt: VERIFIED,
  },
};

// ── New cafecafe-* branches ───────────────────────────────────────────────────
const CAFECAFE_WEBSITE = 'https://www.cafecafe.co.il';
const CAFECAFE_FB = 'https://www.facebook.com/cafe.cafe.il/';
const CAFECAFE_MENU = 'https://www.cafecafe.co.il/Warehouse/userUploadFiles/Image/Menu/%D7%AA%D7%A4%D7%A8%D7%99%D7%98%20%D7%9B%D7%A9%D7%A8.pdf';

const NEW_CAFECAFE = [
  { cityId: 'גבעתיים', name: 'קפה קפה גבעתיים', address: 'יוני נתניהו 25, גבעתיים', phone: '03-7172454', openingHours: 'א׳-ה׳ 08:30-23:00 | ו׳ 08:00 עד 3 שעות לפני שבת | מוצ״ש 1.5 שעה לאחר שבת עד 24:00', kosherType: 'rav_machpud', certifiedBy: 'כשרות הרב מחפוד' },
  { cityId: 'חדרה', name: 'קפה קפה חדרה', address: 'רוטשילד 40, חדרה', phone: '04-6218162', openingHours: 'א׳-ה׳ 08:00-21:00 | ו׳ 08:00-15:00', kosherType: 'rabanut_mekomi', certifiedBy: 'כשר רבנות' },
  { cityId: 'נתניה', name: 'קפה קפה נתניה כביש החוף', address: 'מתחם תחנת דלק סונול, כביש החוף, נתניה', phone: '09-8825460', openingHours: 'א׳-ה׳ 07:30-23:00 | ו׳ 07:30-14:00 | מוצ״ש 30 דק׳ לאחר שבת עד 23:30', kosherType: 'kosher', certifiedBy: 'כשר חלבי' },
  { cityId: 'עפולה', name: 'קפה קפה עפולה', address: 'יהושוע חנקין 14, עפולה', phone: '04-6404083', openingHours: 'א׳-ה׳ 08:00-00:00 | ו׳ 08:00 עד 2 שעות לפני שבת | מוצ״ש 30 דק׳ לאחר שבת עד 00:00', kosherType: 'mehadrin', certifiedBy: 'כשר למהדרין' },
  { cityId: 'קריית שמונה', name: 'קפה קפה קריית שמונה', address: 'הנשיא 4, קריית שמונה', phone: '04-6789220', openingHours: 'א׳-ה׳ 07:30-21:00 | ו׳ 07:30-14:00 | מוצ״ש 30 דק׳ לאחר שבת עד 22:00', kosherType: 'kosher', certifiedBy: 'כשר' },
  { cityId: 'נמל תעופה', name: 'קפה קפה נתב"ג', address: 'טרמינל 1, שדה התעופה בן גוריון', phone: '050-4222222', openingHours: 'א׳-ה׳ 03:00-21:00 | ו׳ 05:00-14:00 | שבת 06:00-21:00', kosherType: 'kosher', certifiedBy: 'כשר חלבי' },
  { cityId: 'באר שבע', name: 'קפה קפה באר שבע גרנד קניון', address: 'שד׳ דוד טוביהו 125, באר שבע', phone: '08-9918698', openingHours: 'א׳-ה׳ 08:30-22:00 | ו׳ 08:30-14:30 | מוצ״ש 30 דק׳ לאחר שבת עד 23:00', kosherType: 'badatz_beit_yosef', certifiedBy: 'בד״צ בית יוסף' },
  { cityId: 'חיפה', name: 'קפה קפה חיפה טכניון', address: 'בית הסטודנט, הטכניון, חיפה', phone: '04-9995161', openingHours: 'א׳-ה׳ 07:30-21:00 | ו׳-ש׳ סגור', kosherType: 'kosher', certifiedBy: 'כשר' },
  { cityId: 'ערד', name: 'קפה קפה ערד', address: 'תעשיה 60, מרכז צים אורבן, ערד', phone: '08-6902406', openingHours: 'א׳-ה׳ 07:30-21:00 | ו׳ 07:30-17:00 | שבת 18:00 עד סגירה', kosherType: 'rabanut_mekomi', certifiedBy: 'רבנות עירונית ערד' },
  { cityId: 'הרצליה', name: 'קפה קפה הרצליה מרינה', address: 'יורדי הים 1, הרצליה פיתוח', phone: '09-9560404', openingHours: 'א׳-ה׳ 09:30-22:00 | ו׳ 09:00-14:00 | שבת 18:30 עד אחרון', kosherType: 'chatam_sofer', certifiedBy: 'בד״צ חתם סופר' },
  { cityId: 'חולון', name: 'קפה קפה חולון סוקולוב', address: 'סוקולוב 48, חולון', phone: '03-5036699', openingHours: 'א׳-ה׳ 08:00 עד אחרון | ו׳ 08:00 עד שעה לפני שבת | מוצ״ש 20 דק׳ לאחר שבת עד 00:00', kosherType: 'chatam_sofer', certifiedBy: 'בד״צ חתם סופר' },
  { cityId: 'תל אביב', name: 'קפה קפה תל אביב נמל', address: 'יורדי הסירה 1, נמל תל אביב', phone: '03-5440054', openingHours: 'א׳-ה׳ 08:00-00:00 | ו׳ 08:00-16:00 | שבת סגור', kosherType: 'rav_machpud', certifiedBy: 'כשרות הרב מחפוד' },
  { cityId: 'נתניה', name: 'קפה קפה נתניה חוף סירונית', address: 'חוף סירונית, נתניה', phone: '09-7444104', openingHours: 'א׳-ה׳ 08:00-23:30 | ו׳ 08:00-16:30 | מוצ״ש 30 דק׳ לאחר שבת עד 00:00', kosherType: 'rabanut_mekomi', certifiedBy: 'רבנות נתניה' },
  { cityId: 'נתניה', name: 'קפה קפה נתניה אגמים', address: 'קרל פופר 4, נתניה', phone: null, openingHours: 'א׳-ה׳ 08:00-23:00 | ו׳ 08:00-14:30 | מוצ״ש חצי שעה לאחר שבת עד 23:00', kosherType: 'kosher', certifiedBy: 'כשר' },
  { cityId: 'גדרה', name: 'קפה קפה גדרה', address: 'הביל״ויים 5, גדרה', phone: '08-8694590', openingHours: 'א׳-ה׳ 08:00-21:00 | ו׳ 08:00-13:30 | שבת סגור', kosherType: 'rabanut_mekomi', certifiedBy: 'רבנות גדרה' },
  { cityId: 'רמלה', name: 'קפה קפה רמלה', address: 'צופית 40, רמלה', phone: '08-9214639', openingHours: 'א׳-ה׳ 08:00-21:00 | ו׳ 08:00-13:00 | שבת סגור', kosherType: 'kosher', certifiedBy: 'כשר' },
];

// ── PokeShop ─────────────────────────────────────────────────────────────────
const POKESHOP_WEB = 'https://pokeshop.co.il';
const POKESHOP_IG = 'https://www.instagram.com/pokeshop_israel/';
const POKESHOP_FB = 'https://www.facebook.com/pokeshopIL/';
const POKESHOP_MENU = 'https://pokeshop.co.il/our-poke-bowls/';

const NEW_POKESHOP = [
  { cityId: 'תל אביב', name: 'PokeShop רוטשילד', address: 'הרצל 10 (פינת רוטשילד), תל אביב', phone: '03-6530883', openingHours: 'א׳-ה׳ 11:00-23:00', kosherType: 'rabanut_tel_aviv', certifiedBy: 'רבנות תל אביב', facebook: 'https://www.facebook.com/pokeshopIL/' },
  { cityId: 'תל אביב', name: 'PokeShop אבן גבירול', address: 'אבן גבירול 62, תל אביב', phone: '03-6590220', openingHours: 'א׳-ה׳ 11:00-23:30 | ו׳ 11:00-15:30', kosherType: 'rabanut_tel_aviv', certifiedBy: 'רבנות תל אביב-יפו', facebook: 'https://www.facebook.com/pokeshopIL/' },
  { cityId: 'הרצליה', name: 'PokeShop הרצליה', address: 'מסכית 27 (כניסה מספיר), הרצליה פיתוח', phone: '09-9749900', openingHours: 'א׳-ה׳ 11:00-17:00', kosherType: 'rabanut_mekomi', certifiedBy: 'רבנות הרצליה', facebook: 'https://www.facebook.com/pokeshopIL/' },
  { cityId: 'בני ברק', name: 'PokeShop בר כוכבא', address: 'בר כוכבא 16, בני ברק', phone: null, openingHours: null, kosherType: 'rabanut_mekomi', certifiedBy: 'רבנות בני ברק', facebook: 'https://www.facebook.com/PokeShopBarKochva/' },
  { cityId: 'נתניה', name: 'PokeShop נתניה', address: 'מפי 5, SOHO, נתניה', phone: '074-7449044', openingHours: 'א׳-ה׳ 11:00-17:00', kosherType: 'rabanut_mekomi', certifiedBy: 'רבנות נתניה', facebook: 'https://www.facebook.com/pokeshopIL/' },
  { cityId: 'רעננה', name: 'PokeShop רעננה', address: 'התעשיה 5, רעננה', phone: null, openingHours: null, kosherType: 'rabanut_mekomi', certifiedBy: 'רבנות רעננה', facebook: 'https://www.facebook.com/PokeShop.Raanana/' },
];

// ── Wok to Walk ───────────────────────────────────────────────────────────────
const WTW_WEB = 'https://www.woktowalk.com';
const WTW_IG = 'https://www.instagram.com/woktowalkisrael/';
const WTW_FB = 'https://www.facebook.com/woktowalkisrael/';

const NEW_WOK = [
  { cityId: 'תל אביב', name: 'Wok to Walk תל אביב', address: 'האשמונאים 86, תל אביב', phone: null, openingHours: 'א׳-ה׳ 11:00-00:00 | ו׳-ש׳ 12:00-00:00', kosherType: 'kosher', certifiedBy: 'כשר', menu: 'https://wolt.com/en/isr/tel-aviv/restaurant/wok-to-walk-hahashmonain' },
  { cityId: 'ירושלים', name: 'Wok to Walk ירושלים', address: 'דוד רמז 4, התחנה הראשונה, ירושלים', phone: null, openingHours: 'א׳-ד׳ 18:00-23:30 | ה׳ 18:00-00:00 | ו׳ 11:00-15:30 | מוצ״ש 20:00-00:00', kosherType: 'kosher', certifiedBy: 'כשר', menu: 'https://wolt.com/en/isr/jerusalem/restaurant/wok-to-walk-jerusalem' },
];

// ── Bagel Cafe ────────────────────────────────────────────────────────────────
const BAGEL_WEB = 'https://www.bagelcafe.co.il';
const BAGEL_IG = 'https://www.instagram.com/bagelcafeil/';
const BAGEL_FB = 'https://www.facebook.com/bagelcafejerusalem';
const BAGEL_PHONE = '1700-500-751';
const BAGEL_MENU = 'https://www.bagelcafe.co.il/he/';

const NEW_BAGEL = [
  { cityId: 'ירושלים', name: 'Bagel Cafe רחביה', address: 'הקרן קיימת לישראל 31, ירושלים', openingHours: 'א׳-ה׳ 07:00-22:00 | ו׳ 07:00-14:30 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'ירושלים', name: 'Bagel Cafe עמק רפאים', address: 'עמק רפאים 54, המושבה הגרמנית, ירושלים', openingHours: 'א׳-ה׳ 07:00-22:00 | ו׳ 07:00-14:30 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'ירושלים', name: 'Bagel Cafe רמת אשכול', address: 'פארן 7, מרכז מסחרי רמת אשכול, ירושלים', openingHours: 'א׳-ה׳ 07:00-21:30 | ו׳ 07:00-14:30 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'ירושלים', name: 'Bagel Cafe מלחה', address: 'ספורט ישראל 1, מלחה מול, ירושלים', openingHours: 'א׳-ה׳ 07:00-21:30 | ו׳ 07:00-14:00 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'תל אביב', name: 'Bagel Cafe תל אביב הארבעה', address: 'הארבעה 13, תל אביב', openingHours: 'א׳-ה׳ 07:00-18:00 | ו׳ 07:00-14:00 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'רעננה', name: 'Bagel Cafe רעננה', address: 'המלאכה 2, קניון ראנינים, רעננה', openingHours: 'א׳-ה׳ 07:00-21:30 | ו׳ 07:00-14:00 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'מבשרת ציון', name: 'Bagel Cafe מבשרת ציון', address: 'הראל 1, קניון הראל, מבשרת ציון', openingHours: 'א׳-ה׳ 07:00-21:30 | ו׳ 08:00-14:00 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'אפרת', name: 'Bagel Cafe אפרת', address: 'נצר ישי 1, מרכז תאנה, אפרת', openingHours: 'א׳-ה׳ 07:00-22:00 | ו׳ 07:00-14:00 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'מודיעין', name: 'Bagel Cafe מודיעין מוריה', address: 'לאה אמנו 1, מרכז מוריה, מודיעין', openingHours: 'א׳-ה׳ 07:30-21:30 | ו׳ 07:00-14:00 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'מודיעין', name: 'Bagel Cafe מודיעין עזריאלי', address: 'קניון עזריאלי, מודיעין', openingHours: 'א׳-ה׳ 07:30-21:00 | ו׳ 07:00-14:30 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'נתניה', name: 'Bagel Cafe נתניה', address: 'בני ברמן 2, קניון עיר ימים, נתניה', openingHours: 'א׳-ה׳ 07:00-21:30 | ו׳ 07:00-14:00 | מוצ״ש עד 21:30', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'כפר סבא', name: 'Bagel Cafe כפר סבא', address: 'ראפאפורט 3, קניון גרין, כפר סבא', openingHours: 'א׳-ה׳ 07:00-21:00 | ו׳ 07:00-14:00 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'פתח תקווה', name: 'Bagel Cafe פתח תקווה', address: 'ז׳בוטינסקי 72, הקניון הגדול, פתח תקווה', openingHours: 'א׳-ה׳ 08:00-21:30 | ו׳ 08:00-13:30 | מוצ״ש שעה לאחר שבת עד 23:00', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'חדרה', name: 'Bagel Cafe חדרה', address: 'שכטמן 10, חדרה', openingHours: 'א׳-ה׳ 08:00-21:30 | ו׳ 08:00-13:30 | מוצ״ש שעה לאחר שבת עד 23:00', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'קריית ביאליק', name: 'Bagel Cafe קריית ביאליק', address: 'כביש עכו 192, קניון אופר הקריון, קריית ביאליק', openingHours: 'א׳-ה׳ 08:30-21:00 | ו׳ 08:30-14:30 | מוצ״ש שעה לאחר שבת עד 23:00', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
];

// ── Meatos ───────────────────────────────────────────────────────────────────
const NEW_MEATOS = [
  {
    cityId: 'תל אביב',
    name: 'Meatos Grill & Bar',
    type: 'restaurant',
    address: 'ויצמן 2, מגדל עמות, תל אביב',
    phone: '03-6932002',
    openingHours: 'א׳-ה׳ 12:00-00:00 | ו׳ סגור | מוצ״ש 00:00',
    kosherType: 'rabanut_tel_aviv',
    certifiedBy: 'רבנות תל אביב (רגילה)',
    website: 'https://meatos.co.il',
    instagram: 'https://www.instagram.com/meatos_grillbar/',
    facebook: 'https://www.facebook.com/meatostlv/',
    menu: 'https://taamtaam.com/restaurants/telaviv/meatos',
  },
];

// ── Bread Station (תחנת לחם) ──────────────────────────────────────────────────
const BREAD_WEB = 'https://breadstation.co.il';
const BREAD_IG = 'https://www.instagram.com/bread_station_il/';
const BREAD_FB = 'https://www.facebook.com/Tahanat.Lechem/';

const NEW_BREAD = [
  { cityId: 'גבעתיים', name: 'תחנת לחם גבעתיים', address: 'ויצמן 15, גבעתיים', phone: '03-6566996', openingHours: 'א׳-ה׳ 07:00-21:00 | ו׳ 07:00-15:00 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'הרצליה', name: 'תחנת לחם הרצליה', address: 'בן גוריון 22, מתחם סיטי גייט, הרצליה', phone: '054-5718987', openingHours: 'א׳-ה׳ 07:00-21:00 | ו׳ 07:00-16:00 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'חיפה', name: 'תחנת לחם חיפה רמב"ם', address: 'כניסה שניה 8, מרכז רפואי רמב"ם, חיפה', phone: null, openingHours: 'א׳-ה׳ 07:00-22:00 | ו׳ 07:00-15:00 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'כפר סבא', name: 'תחנת לחם כפר סבא מאיר', address: 'צ׳רניחובסקי 59, מרכז רפואי מאיר, כפר סבא', phone: null, openingHours: 'א׳-ה׳ 06:15-22:00 | ו׳ 06:30-15:00 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'נתניה', name: 'תחנת לחם נתניה', address: 'מתחם רגובין 3, נתניה', phone: null, openingHours: 'א׳-ה׳ 07:00-18:00 | ו׳ 07:00-15:00 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'עכו', name: 'תחנת לחם עכו', address: 'צפירה 3, מתחם מקס ברקה, עכו', phone: null, openingHours: 'א׳-ה׳ 06:30-19:00 | ו׳ 06:30-15:00 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'עפולה', name: 'תחנת לחם עפולה', address: 'רבין 21, בניין 4, מרכז רפואי העמק, עפולה', phone: null, openingHours: 'א׳-ה׳ 07:00-21:00 | ו׳ 07:00-15:00 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'פתח תקווה', name: 'תחנת לחם פתח תקווה בילינסון', address: 'ז׳בוטינסקי 39, בית חולים בילינסון, פתח תקווה', phone: null, openingHours: 'א׳-ה׳ 05:30-22:00 | ו׳ 06:00-15:00 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'פתח תקווה', name: 'תחנת לחם פתח תקווה גיסין', address: 'גיסין 17, פתח תקווה', phone: '054-4962616', openingHours: 'א׳-ה׳ 07:00-21:00 | ו׳ 07:00-16:00 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'ראש העין', name: 'תחנת לחם ראש העין', address: 'בזק 1, קניון לב אפק, ראש העין', phone: null, openingHours: 'א׳-ה׳ 07:00-20:00 | ו׳ 07:00-15:00 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'רחובות', name: 'תחנת לחם רחובות', address: 'מרכז רפואי קפלן, רחובות', phone: null, openingHours: 'א׳-ה׳ 07:00-21:00 | ו׳ 07:00-15:00 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'רמת גן', name: 'תחנת לחם רמת גן ביאליק 19', address: 'ביאליק 19, רמת גן', phone: '03-5627686', openingHours: 'א׳-ה׳ 07:00-22:00 | ו׳ 07:00-16:00 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'רמת גן', name: 'תחנת לחם רמת גן ביאליק 54', address: 'ביאליק 54, רמת גן', phone: null, openingHours: 'א׳-ה׳ 07:30-20:30 | ו׳ 07:30-15:00 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'רמת גן', name: 'תחנת לחם רמת גן ירושלים', address: 'ירושלים 49, רמת גן', phone: '077-4100717', openingHours: 'א׳-ה׳ 07:00-21:00 | ו׳ 07:00-16:00 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'רעננה', name: 'תחנת לחם רעננה', address: 'שאשא ארגוב 23, מתחם נווה זמר, רעננה', phone: null, openingHours: 'א׳-ה׳ 07:00-20:00 | ו׳ 07:00-15:00 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
  { cityId: 'מצפה רמון', name: 'תחנת לחם מצפה רמון', address: 'מתחם אבן דרך, מצפה רמון', phone: null, openingHours: 'א׳-ה׳ 07:00-22:00 | ו׳ 07:00-15:00 | שבת סגור', kosherType: 'mehadrin', certifiedBy: 'מהדרין' },
];

// ════════════════════════════════════════════════════════════════════════════════
// Main
// ════════════════════════════════════════════════════════════════════════════════
let data = load();
const before = data.length;

// 1. Delete OSM entries
data = data.filter(p => !DELETE_OSM.has(p.id));
console.log(`Deleted ${before - data.length} OSM entries`);

// 2. Update existing cafecafe-* entries
let updatedCafe = 0;
data = data.map(p => {
  const upd = CAFECAFE_UPDATES[p.id];
  if (!upd) return p;
  updatedCafe++;
  return { ...p, ...upd };
});
console.log(`Updated ${updatedCafe} cafecafe-* entries`);

// 3. Add new cafecafe-* entries
const newCafeEntries = NEW_CAFECAFE.map(b => entry('cafecafe', b.cityId, {
  ...b,
  type: 'cafe',
  website: CAFECAFE_WEBSITE,
  facebook: CAFECAFE_FB,
  menu: CAFECAFE_MENU,
}));
data.push(...newCafeEntries);
console.log(`Added ${newCafeEntries.length} new cafecafe entries`);

// 4. Add PokeShop entries
const newPokeEntries = NEW_POKESHOP.map(b => entry('pokeshop', b.cityId, {
  ...b,
  type: 'fast_food',
  category: 'parve',
  website: POKESHOP_WEB,
  instagram: b.instagram ?? POKESHOP_IG,
  facebook: b.facebook,
  menu: POKESHOP_MENU,
}));
data.push(...newPokeEntries);
console.log(`Added ${newPokeEntries.length} PokeShop entries`);

// 5. Add Wok to Walk entries
const newWokEntries = NEW_WOK.map(b => entry('woktowalk', b.cityId, {
  ...b,
  type: 'fast_food',
  category: 'meat',
  website: WTW_WEB,
  instagram: WTW_IG,
  facebook: WTW_FB,
}));
data.push(...newWokEntries);
console.log(`Added ${newWokEntries.length} Wok to Walk entries`);

// 6. Add Bagel Cafe entries
const newBagelEntries = NEW_BAGEL.map(b => entry('bagelcafe', b.cityId, {
  ...b,
  type: 'cafe',
  category: 'dairy',
  phone: b.phone ?? BAGEL_PHONE,
  website: BAGEL_WEB,
  instagram: BAGEL_IG,
  facebook: BAGEL_FB,
  menu: BAGEL_MENU,
}));
data.push(...newBagelEntries);
console.log(`Added ${newBagelEntries.length} Bagel Cafe entries`);

// 7. Add Meatos entry
for (const b of NEW_MEATOS) {
  data.push({
    id: id('meatos', b.address),
    name: b.name,
    type: b.type,
    cityId: b.cityId,
    address: b.address,
    location: cityLoc(b.cityId),
    locationPrecision: 'city',
    phone: b.phone,
    website: b.website,
    menu: b.menu,
    instagram: b.instagram,
    facebook: b.facebook,
    openingHours: b.openingHours,
    category: 'meat',
    kosherType: b.kosherType,
    certifiedBy: b.certifiedBy,
    source: 'manual',
    sourceUrl: b.website,
    lastVerifiedAt: VERIFIED,
  });
}
console.log(`Added ${NEW_MEATOS.length} Meatos entries`);

// 8. Add Bread Station entries
const newBreadEntries = NEW_BREAD.map(b => entry('breadstation', b.cityId, {
  ...b,
  type: 'bakery',
  category: 'dairy',
  website: BREAD_WEB,
  instagram: BREAD_IG,
  facebook: BREAD_FB,
}));
data.push(...newBreadEntries);
console.log(`Added ${newBreadEntries.length} Bread Station entries`);

// 9. Fix cityId קריית מאיר → תל אביב
let fixedCity = 0, fixedAddr = 0;
data = data.map(p => {
  if (p.cityId !== 'קריית מאיר') return p;
  let updated = { ...p, cityId: 'תל אביב' };
  fixedCity++;
  if (p.address?.endsWith(', קריית מאיר')) {
    updated.address = p.address.replace(/, קריית מאיר$/, ', תל אביב יפו');
    fixedAddr++;
  }
  return updated;
});
console.log(`Fixed cityId: ${fixedCity} records, addresses: ${fixedAddr}`);

save(data);
console.log(`\nTotal: ${before} → ${data.length} records (+${data.length - before})`);
