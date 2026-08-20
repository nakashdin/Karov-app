/**
 * Golda Glida kosher branches importer
 * Source: goldaglida.co.il/stores — window.__INITIAL_STATE__.pages.stores.storesList
 * Filter: is_kosher === true only
 */
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data/generated');
const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

// ---------------------------------------------------------------------------
// Kosher branches extracted from goldaglida.co.il (is_kosher: true)
// ---------------------------------------------------------------------------
const GOLDA_BRANCHES = [
  { id: 574,  nameHe: 'גולדה אור יהודה',        city: 'אור יהודה',        address: 'אריק איינשטיין 1, אור יהודה',          phone: '03-7797577', kosher: "בד\"צ בית יוסף", hours: 'א-ה 10:00-23:00 | ו 10:00-15:00 | ש שעה אחרי צאת שבת-23:00' },
  { id: 578,  nameHe: 'גולדה אריאל',             city: 'אריאל',            address: 'מוריה 2, אריאל',                        phone: '03-5614447', kosher: "בד\"צ בית יוסף", hours: 'א-ה 8:00-22:00 | ו 8:00-4ש לפני שבת | ש שעה אחרי צאת שבת-22:00' },
  { id: 1497, nameHe: 'גולדה אשדוד טודו סנטר',  city: 'אשדוד',            address: 'מנגו 4, אשדוד',                          phone: '08-6288826', kosher: "בד\"צ בית יוסף", hours: 'א-ה 8:00-00:00 | ו 8:00-14:00 | ש חצי שעה אחרי צאת שבת-00:00' },
  { id: 1144, nameHe: 'גולדה אשקלון אגמים',      city: 'אשקלון',           address: 'שדרות עמק חפר 53, אשקלון',              phone: '08-860-0808', kosher: "בד\"צ בית יוסף", hours: 'א-ה 10:00-00:00 | ו 9:00-13:00 | ש 20:00-00:00' },
  { id: 583,  nameHe: 'גולדה באר יעקב',          city: 'באר יעקב',         address: 'יהלום 3, באר יעקב',                     phone: '08-9555764', kosher: 'מהדרין', hours: 'א-ה 9:00-23:00 | ו 9:00-שעה לפני שבת | ש שעה אחרי צאת שבת-23:00' },
  { id: 587,  nameHe: 'גולדה בית שמש',           city: 'בית שמש',          address: 'שדרות יגאל אלון 1, ביג פאשן, בית שמש', phone: '02-6741544', kosher: "בד\"צ בית יוסף", hours: 'א-ה 9:00-23:00 | ו 9:00-15:00 | ש שעה אחרי צאת שבת-23:00' },
  { id: 591,  nameHe: 'גולדה בת ים פארק הים',    city: 'בת ים',            address: 'נעמי שמר 9, בת ים',                     phone: '03-6046045', kosher: "בד\"צ בית יוסף", hours: 'א-ה 8:00-1:00 | ו 8:00-שעה לפני שבת | ש חצי שעה אחרי צאת שבת-1:30' },
  { id: 592,  nameHe: 'גולדה גבעת שמואל',        city: 'גבעת שמואל',       address: 'הערבה 1, גבעת שמואל',                   phone: '03-7775169', kosher: "בד\"צ בית יוסף", hours: 'א-ה 10:00-22:00 | ו 9:00-13:30 | ש חצי שעה אחרי צאת שבת-22:00' },
  { id: 595,  nameHe: 'גולדה גדרה',              city: 'גדרה',             address: 'מנחם בגין 12, גדרה',                    phone: '08-6565999', kosher: 'מהדרין', hours: 'א-ה 10:00-22:00 | ו 10:00-14:00 | ש שעה אחרי צאת שבת-23:00' },
  { id: 598,  nameHe: 'גולדה דימונה',            city: 'דימונה',           address: 'גולדה מאיר 1, דימונה',                  phone: '08-8677717', kosher: "בד\"צ בית יוסף", hours: 'א-ה 8:00-00:00 | ו 8:00-14:30 | ש חצי שעה אחרי צאת שבת-00:00' },
  { id: 606,  nameHe: 'גולדה חולון פנחס איילון', city: 'חולון',            address: 'פנחס איילון 13, חולון',                  phone: '03-7792477', kosher: "בד\"צ חולון", hours: 'א-ה 8:00-23:15 | ו 8:00-16:00 | ש חצי שעה אחרי צאת שבת-00:00' },
  { id: 612,  nameHe: 'גולדה חריש',              city: 'חריש',             address: 'יחד 18, חריש',                          phone: '04-8164606', kosher: 'מהדרין', hours: 'א-ה 10:00-23:00 | ו 10:00-שעה לפני שבת | ש שעה אחרי צאת שבת-23:00' },
  { id: 1448, nameHe: 'גולדה טבריה מדרחוב',      city: 'טבריה',            address: 'מדרחוב הבנים, טבריה',                   phone: '04-8882555', kosher: "בד\"צ בית יוסף", hours: 'א-ה 9:00-00:30 | ו 9:00-שעה לפני שבת | ש חצי שעה אחרי צאת שבת-00:30' },
  { id: 614,  nameHe: 'גולדה טבריה קפלן',        city: 'טבריה',            address: 'שדרות אליעזר קפלן, טבריה',              phone: '04-8882555', kosher: "בד\"צ בית יוסף", hours: 'א-ה 9:00-00:00 | ו 9:00-שעה לפני שבת | ש שעה אחרי צאת שבת-00:00' },
  { id: 617,  nameHe: 'גולדה יוקנעם',            city: 'יוקנעם',           address: 'מתחם ביג יוקנעם עילית',                  phone: '04-6298822', kosher: 'מהדרין', hours: 'א-ה 9:00-22:00 | ו 9:00-שעה לפני שבת | ש שעה אחרי צאת שבת-00:00' },
  { id: 621,  nameHe: 'גולדה ירושלים בית הכרם',  city: 'ירושלים',          address: 'אביזוהר 8, בית הכרם, ירושלים',          phone: '02-9665661', kosher: "בד\"צ בית יוסף", hours: 'א-ה 8:00-23:00 | ו 8:00-16:00 | ש שעה אחרי צאת שבת-23:00' },
  { id: 620,  nameHe: 'גולדה ירושלים ממילא',     city: 'ירושלים',          address: 'שדרות אלרוב ממילא, ירושלים',            phone: '02-5644496', kosher: "בד\"צ בית יוסף", hours: 'א-ד 8:00-23:00 | ה 8:00-00:00 | ו 8:00-שעה לפני שבת | ש שעה אחרי צאת שבת-00:00' },
  { id: 624,  nameHe: 'גולדה ירושלים קניון מלחה', city: 'ירושלים',         address: 'קניון מלחה, ירושלים',                   phone: '02-6511112', kosher: "בד\"צ בית יוסף", hours: 'א-ה 9:30-22:00 | ו 9:30-14:30 | ש שעה אחרי צאת שבת-22:00' },
  { id: 913,  nameHe: 'גולדה כפר יונה',          city: 'כפר יונה',         address: 'בן גוריון 1, כפר יונה',                 phone: '09-8322110', kosher: 'רבנות', hours: 'א-ה 8:00-23:00 | ו 8:00-שעה לפני שבת | ש שעה אחרי צאת שבת-23:00' },
  { id: 1145, nameHe: 'גולדה לוד',               city: 'לוד',              address: 'הנשיא 2, לוד',                          phone: '08-6716969', kosher: "בד\"צ בית יוסף", hours: 'א-ה 10:00-22:00 | ו 10:00-שעתיים לפני שבת | ש שעה אחרי צאת שבת-22:30' },
  { id: 639,  nameHe: 'גולדה מבשרת ציון',        city: 'מבשרת ציון',       address: 'קניון הראל, מבשרת ציון',                phone: '02-5003565', kosher: "בד\"צ בית יוסף", hours: 'א-ה 8:00-23:00 | ו 8:00-15:00 | ש שעה אחרי צאת שבת-23:30' },
  { id: 1063, nameHe: 'גולדה מגדל העמק',         city: 'מגדל העמק',        address: 'שאול עמר 77, פרץ סנטר, מגדל העמק',     phone: '04-855-7270', kosher: 'מהדרין', hours: 'א-ד 8:00-22:30 | ה 8:00-23:30 | ו 8:00-15:00 | ש חצי שעה אחרי צאת שבת-23:00' },
  { id: 912,  nameHe: 'גולדה מזכרת בתיה',        city: 'מזכרת בתיה',       address: 'מנחם בגין 2, מזכרת בתיה',               phone: '077-7242038', kosher: 'חלב ישראל', hours: 'א-ה 8:00-22:00 | ו 8:00-שעה לפני שבת | ש שעה אחרי צאת שבת-22:00' },
  { id: 632,  nameHe: 'גולדה מעלות תרשיחא',      city: 'מעלות',            address: 'בן גוריון 1, מעלות תרשיחא',             phone: '04-6039900', kosher: "בד\"צ בית יוסף", hours: 'א-ה 8:30-00:00 | ו 8:00-שעה לפני שבת | ש שעה אחרי צאת שבת-00:00' },
  { id: 638,  nameHe: 'גולדה נתיבות',            city: 'נתיבות',           address: 'בעלי המלאכה 13, נתיבות',                phone: '08-6733343', kosher: "בד\"צ בית יוסף", hours: 'א-ה 9:00-23:00 | ו 9:00-שעה לפני שבת | ש שעה אחרי צאת שבת-23:00' },
  { id: 1163, nameHe: 'גולדה נתניה גשר הארי',    city: 'נתניה',            address: 'טום לנטוס 1, נתניה',                    phone: '09-7452646', kosher: "בד\"צ בית יוסף", hours: 'א-ה 8:00-00:00 | ו 8:00-שעה לפני שבת | ש שעה אחרי צאת שבת-00:00' },
  { id: 644,  nameHe: 'גולדה נתניה כיכר',        city: 'נתניה',            address: 'הרצל 7, נתניה',                         phone: '09-9777551', kosher: "בד\"צ בית יוסף", hours: 'א-ה 8:00-00:00 | ו 8:00-3ש לפני שבת | ש שעה אחרי צאת שבת-00:30' },
  { id: 910,  nameHe: 'גולדה נתניה פיאנו',       city: 'נתניה',            address: 'שושנה דמארי 10, נתניה',                 phone: '09-9777552', kosher: "בד\"צ בית יוסף", hours: 'א-ה 8:00-23:00 | ו 8:00-שעה לפני שבת | ש שעה אחרי צאת שבת-00:00' },
  { id: 648,  nameHe: 'גולדה עכו',               city: 'עכו',              address: 'החרושת 2, קניון עזריאלי, עכו',          phone: '04-8848840', kosher: 'מהדרין', hours: 'א-ה 8:00-00:00 | ו 8:00-שעה לפני שבת | ש חצי שעה אחרי צאת שבת-00:00' },
  { id: 647,  nameHe: 'גולדה עפולה',             city: 'עפולה',            address: 'שדרות יצחק רבין 20, עפולה',             phone: '04-7749599', kosher: 'מהדרין', hours: 'א-ה 10:00-21:00 | ו 9:00-13:00 | ש שעה מצאת שבת-23:00' },
  { id: 650,  nameHe: 'גולדה פרדס חנה',          city: 'פרדס חנה',         address: 'גלעד 4, פרדס חנה',                      phone: '04-8233660', kosher: 'מהדרין', hours: 'א-ה 9:00-23:00 | ו 9:00-14:30 | ש חצי שעה אחרי צאת שבת-00:00' },
  { id: 653,  nameHe: 'גולדה פתח תקווה',         city: 'פתח תקווה',        address: 'רפאל איתן 5, פתח תקווה',                phone: '03-6900900', kosher: null, hours: 'א-ה 9:00-23:00 | ו 9:00-15:30 | ש שעה אחרי צאת שבת-23:00' },
  { id: 667,  nameHe: 'גולדה קניון איילון',      city: 'רמת גן',           address: 'דרך אבא הלל 301, רמת גן',               phone: '03-5106604', kosher: "בד\"צ בית יוסף", hours: 'א-ה 9:00-22:00 | ו 9:00-שעה לפני שבת | ש שעה אחרי צאת שבת-22:30' },
  { id: 631,  nameHe: 'גולדה קניון מודיעין',     city: 'מודיעין',          address: 'קניון עזריאלי לב העיר 2, מודיעין',      phone: '08-6578945', kosher: 'מהדרין', hours: 'א-ה 9:30-22:00 | ו 8:00-14:30 | ש חצי שעה אחרי צאת שבת-23:00' },
  { id: 628,  nameHe: 'גולדה קניון ערים כפר סבא', city: 'כפר סבא',         address: 'קניון ערים, כפר סבא',                   phone: '09-9662020', kosher: "רבנות כפ\"ס", hours: 'א-ה 9:00-22:00 | ו 8:00-שעתיים לפני שבת | ש שעה אחרי צאת שבת-23:00' },
  { id: 656,  nameHe: 'גולדה קריית גת',          city: 'קריית גת',         address: 'דרך הדרום 22, קריית גת',                phone: '08-6427336', kosher: "בד\"צ בית יוסף", hours: 'א-ה 8:00-23:00 | ו 8:00-14:00 | ש שעה אחרי צאת שבת-00:00' },
  { id: 658,  nameHe: 'גולדה קריית מוצקין',      city: 'קריית מוצקין',     address: 'שדרות ירושלים 1, קריית מוצקין',         phone: '04-6412662', kosher: "בד\"צ בית יוסף", hours: 'א-ה 10:00-23:00 | ו 9:00-שעה לפני שבת | ש שעה אחרי יציאת שבת-23:00' },
  { id: 1488, nameHe: 'גולדה קריית מלאכי',       city: 'קריית מלאכי',      address: "ז'בוטינסקי 41, קריית מלאכי",            phone: '08-9999153', kosher: "בד\"צ בית יוסף", hours: 'א-ה 10:00-23:00 | ו 10:00-חצי שעה לפני שבת | ש חצי שעה אחרי צאת שבת-00:00' },
  { id: 660,  nameHe: 'גולדה קריית שמונה',       city: 'קריית שמונה',      address: 'תל חי 120, קריית שמונה',                phone: '04-8420968', kosher: "בד\"צ בית יוסף", hours: 'א-ה 10:00-22:00 | ו 10:00-שעתיים לפני שבת | ש שעה אחרי צאת שבת-00:00' },
  { id: 1346, nameHe: 'גולדה קרית אתא',          city: 'קרית אתא',         address: 'דוכיפת 3, שכונת אלונים, קרית אתא',     phone: '04-7741311', kosher: 'מהדרין', hours: 'א-ה 11:00-22:00 | ו 8:00-שעה לפני שבת | ש שעה לאחר צאת שבת-23:00' },
  { id: 662,  nameHe: 'גולדה ראש העין',          city: 'ראש העין',         address: 'שבזי 10, ראש העין',                     phone: '03-902-4405', kosher: "בד\"צ בית יוסף", hours: 'א-ה 9:00-23:00 | ו 9:00-שעה לפני שבת | ש שעה אחרי צאת שבת-00:00' },
  { id: 673,  nameHe: 'גולדה ראשון לציון גבעתי', city: 'ראשון לציון',      address: 'גבעתי 1, ראשון לציון',                  phone: '03-6099949', kosher: "בד\"צ בית יוסף", hours: 'א-ה 9:00-23:00 | ו 9:00-שעתיים לפני שבת | ש חצי שעה אחרי צאת שבת-00:00' },
  { id: 1128, nameHe: 'גולדה שדרות',             city: 'שדרות',            address: 'הפלדה 8, פרץ סנטר, שדרות',             phone: '08-9152212', kosher: "בד\"צ בית יוסף", hours: 'א-ה 10:00-23:00 | ו 9:00-14:00 | ש חצי שעה אחרי צאת שבת-00:00' },
  { id: 677,  nameHe: 'גולדה שוהם',              city: 'שוהם',             address: 'עמק איילון 30, שוהם',                   phone: '03-5597967', kosher: 'רבנות', hours: 'א-ה 9:00-23:30 | ו 9:00-חצי שעה לפני שבת | ש חצי שעה אחרי צאת שבת-23:30' },
  { id: 689,  nameHe: 'גולדה תל אביב בוגרשוב',   city: 'תל אביב',          address: 'בוגרשוב 6, תל אביב',                   phone: '03-6599989', kosher: "בד\"צ בית יוסף", hours: 'א-ה 10:00-23:00 | ו 10:00-שעה לפני שבת | ש שעה אחרי צאת שבת-23:00' },
  { id: 693,  nameHe: 'גולדה תל אביב יד אליהו',  city: 'תל אביב',          address: 'דרך חיים ברלב 107, תל אביב',            phone: '03-5614016', kosher: "בד\"צ בית יוסף", hours: 'א-ה 9:00-23:00 | ו 9:00-16:00 | ש 20:00-23:00' },
  { id: 691,  nameHe: 'גולדה תל אביב קניון עזריאלי', city: 'תל אביב',     address: 'מנחם בגין 132, קניון עזריאלי, תל אביב', phone: '03-7484288', kosher: "בד\"צ בית יוסף", hours: 'א-ה 7:45-23:30 | ו 8:00-שעה לפני שבת | ש שעה אחרי צאת שבת-23:30' },
  { id: 690,  nameHe: 'גולדה תל השומר',          city: 'רמת גן',           address: 'בית חולים תל השומר, רמת גן',            phone: '03-5050126', kosher: 'מהדרין', hours: 'א-ה 8:00-22:00 | ו 8:00-שעה לפני שבת | ש שעה אחרי צאת שבת-00:00' },
];

// City → approximate lat/lng (WGS84)
const CITY_COORDS = {
  'אור יהודה':      { lat: 32.0330, lng: 34.8550 },
  'אריאל':          { lat: 32.1066, lng: 35.1680 },
  'אשדוד':          { lat: 31.8040, lng: 34.6550 },
  'אשקלון':         { lat: 31.6688, lng: 34.5742 },
  'באר יעקב':       { lat: 31.9367, lng: 34.8375 },
  'בית שמש':        { lat: 31.7470, lng: 34.9870 },
  'בת ים':          { lat: 32.0178, lng: 34.7499 },
  'גבעת שמואל':     { lat: 32.0832, lng: 34.8494 },
  'גדרה':           { lat: 31.8115, lng: 34.7772 },
  'דימונה':         { lat: 31.0690, lng: 35.0330 },
  'חולון':          { lat: 32.0108, lng: 34.7741 },
  'חריש':           { lat: 32.4589, lng: 35.0225 },
  'טבריה':          { lat: 32.7922, lng: 35.5317 },
  'יוקנעם':         { lat: 32.6623, lng: 35.1004 },
  'ירושלים':        { lat: 31.7683, lng: 35.2137 },
  'כפר יונה':       { lat: 32.3175, lng: 34.9350 },
  'כפר סבא':        { lat: 32.1757, lng: 34.9077 },
  'לוד':            { lat: 31.9520, lng: 34.8954 },
  'מבשרת ציון':     { lat: 31.8063, lng: 35.1532 },
  'מגדל העמק':      { lat: 32.6800, lng: 35.2385 },
  'מודיעין':        { lat: 31.9054, lng: 35.0109 },
  'מזכרת בתיה':     { lat: 31.8582, lng: 34.8434 },
  'מעלות':          { lat: 33.0156, lng: 35.2722 },
  'נתיבות':         { lat: 31.4200, lng: 34.5900 },
  'נתניה':          { lat: 32.3215, lng: 34.8532 },
  'עכו':            { lat: 32.9258, lng: 35.0824 },
  'עפולה':          { lat: 32.6075, lng: 35.2897 },
  'פרדס חנה':       { lat: 32.4737, lng: 34.9680 },
  'פתח תקווה':      { lat: 32.0896, lng: 34.8872 },
  'קריית גת':       { lat: 31.6100, lng: 34.7640 },
  'קריית מוצקין':   { lat: 32.8362, lng: 35.0733 },
  'קריית מלאכי':    { lat: 31.7320, lng: 34.7450 },
  'קריית שמונה':    { lat: 33.2070, lng: 35.5700 },
  'קרית אתא':       { lat: 32.8040, lng: 35.1040 },
  'ראש העין':       { lat: 32.0950, lng: 34.9580 },
  'ראשון לציון':    { lat: 31.9730, lng: 34.7925 },
  'רמת גן':         { lat: 32.0824, lng: 34.8137 },
  'שדרות':          { lat: 31.5254, lng: 34.5975 },
  'שוהם':           { lat: 31.9990, lng: 34.9440 },
  'תל אביב':        { lat: 32.0853, lng: 34.7818 },
};

// Map Golda's kosher_type strings → our KosherType enum
function mapKosherType(kosherStr) {
  if (!kosherStr) return 'kosher';
  const s = kosherStr.trim();
  if (s.includes('בד"צ בית יוסף') || s.includes('בד"ץ בית יוסף') || s.includes("כשר בד\"צ בית יוסף")) return 'badatz_beit_yosef';
  if (s === 'מהדרין') return 'mehadrin';
  if (s.startsWith('רבנות') && s.length < 10) return 'rabanut';
  if (s.includes("רבנות כפ\"ס") || s.includes("רבנות כפ'ס")) return 'rabanut_mekomi';
  if (s === 'חלב ישראל') return 'rabanut';
  return 'kosher';
}

function makeCityId(city) {
  const map = {
    'תל אביב': 'tel-aviv',
    'ירושלים': 'jerusalem',
    'חיפה': 'haifa',
    'ראשון לציון': 'rishon-lezion',
    'אשדוד': 'ashdod',
    'נתניה': 'netanya',
    'פתח תקווה': 'petah-tikva',
    'באר שבע': 'beer-sheva',
    'רמת גן': 'ramat-gan',
    'חולון': 'holon',
    'בת ים': 'bat-yam',
    'אשקלון': 'ashkelon',
    'חדרה': 'hadera',
    'לוד': 'lod',
    'כפר סבא': 'kfar-saba',
    'מודיעין': 'modiin',
    'הרצליה': 'herzliya',
    'רעננה': 'raanana',
  };
  if (map[city]) return map[city];
  // default: transliterate-ish
  return city.replace(/['" ]/g, '-').replace(/[^a-zA-Z0-9֐-׿-]/g, '');
}

function makeId(branch) {
  const hash = createHash('md5')
    .update(`golda-${branch.id}-${branch.address}`)
    .digest('hex')
    .slice(0, 8);
  return `golda-${hash}`;
}

// ---------------------------------------------------------------------------
// Build Place objects
// ---------------------------------------------------------------------------
const places = GOLDA_BRANCHES.map((b) => {
  const coords = CITY_COORDS[b.city] || { lat: 31.5, lng: 34.8 };
  const kosherType = mapKosherType(b.kosher);

  const place = {
    id: makeId(b),
    name: b.nameHe,
    type: 'cafe',
    cityId: makeCityId(b.city),
    address: b.address,
    location: { latitude: coords.lat, longitude: coords.lng },
    locationPrecision: 'city',
    phone: b.phone || undefined,
    website: 'https://www.goldaglida.co.il',
    instagram: 'https://instagram.com/golda.glida',
    facebook: 'https://www.facebook.com/GLIDAGOLDAISRAEL',
    openingHours: b.hours || undefined,
    category: 'dairy',
    kosherType,
    source: 'manual',
    lastVerifiedAt: '2026-07-14',
  };

  // certifiedBy for non-enum types
  if (b.kosher && b.kosher.trim() === "בד\"צ חולון") {
    place.certifiedBy = "בד\"צ חולון";
  }
  if (b.kosher && b.kosher.trim() === 'חלב ישראל') {
    place.certifiedBy = 'חלב ישראל';
  }
  if (b.kosher && b.kosher.trim().includes("רבנות כפ")) {
    place.certifiedBy = "רבנות כפר סבא";
  }

  return place;
});

// ---------------------------------------------------------------------------
// Load existing DB files, dedup by ID, write back
// ---------------------------------------------------------------------------
function loadJson(filePath) {
  try {
    const raw = readFileSync(filePath);
    const str = raw[0] === 0xEF ? raw.slice(3).toString('utf8') : raw.toString('utf8');
    return JSON.parse(str);
  } catch {
    return [];
  }
}

function writeJson(filePath, data) {
  const json = JSON.stringify(data, null, 2);
  writeFileSync(filePath, Buffer.concat([BOM, Buffer.from(json, 'utf8')]));
}

const restaurantsPath = path.join(DATA_DIR, 'restaurants.osm.json');
const placesPath      = path.join(DATA_DIR, 'places.osm.json');

const restaurants = loadJson(restaurantsPath);
const placesAll   = loadJson(placesPath);

const existingRestaurantIds = new Set(restaurants.map(r => r.id));
const existingPlacesIds     = new Set(placesAll.map(p => p.id));

let addedCount = 0;
let skippedCount = 0;

for (const place of places) {
  if (existingRestaurantIds.has(place.id)) {
    skippedCount++;
    continue;
  }
  restaurants.push(place);
  existingRestaurantIds.add(place.id);
  addedCount++;
}

writeJson(restaurantsPath, restaurants);
console.log(`restaurants.osm.json: +${addedCount} added, ${skippedCount} skipped (already existed)`);

let addedPlaces = 0;
let skippedPlaces = 0;
for (const place of places) {
  if (existingPlacesIds.has(place.id)) {
    skippedPlaces++;
    continue;
  }
  placesAll.push(place);
  existingPlacesIds.add(place.id);
  addedPlaces++;
}

writeJson(placesPath, placesAll);
console.log(`places.osm.json: +${addedPlaces} added, ${skippedPlaces} skipped`);
console.log(`\nTotal Golda kosher branches processed: ${places.length}`);
console.log('Done!');
