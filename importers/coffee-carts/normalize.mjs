/**
 * Normalizes coffee-carts.raw.json:
 * 1. מתקן HTML entities בשמות
 * 2. מחליף cityId ו-address לערכים עבריים נכונים מדף האינדקס
 * פלט: output/coffee-carts.normalized.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// כתובות מדף האינדקס של coffeetrail (ידני, כפי שנגרד)
const LOCATION_MAP = {
  // --- אצווה ישנה (מהדרין) ---
  'coffeetrail-shisho-caffe':          { cityId: 'מושב הזורעים',        address: 'מושב הזורעים' },
  'coffeetrail-al-havadi':             { cityId: 'הושעיה',               address: 'הושעיה' },
  'coffeetrail-nina':                  { cityId: 'מושב חגור',            address: 'האיריס 1, מושב חגור' },
  'coffeetrail-caffe-lago':            { cityId: 'פתח תקווה',            address: 'בזל 2, פתח תקווה' },
  'coffeetrail-gana-park-rg':          { cityId: 'רמת גן',               address: 'שדרת הצבי 9, רמת גן' },
  'coffeetrail-ingale':                { cityId: 'נחלים',                 address: 'חרמון 13, נחלים' },
  'coffeetrail-havaia':                { cityId: 'חוות מעוז שאול',       address: 'חוות מעוז שאול' },
  'coffeetrail-agalol':                { cityId: 'בית גמליאל',           address: 'משק לוי, בית גמליאל' },
  'coffeetrail-katerina':              { cityId: 'כפר דניאל',            address: 'פארק הקופים, כפר דניאל' },
  'coffeetrail-lucche-coffee':         { cityId: 'גדרה',                 address: 'גן ביל"ו, גדרה' },
  'coffeetrail-mchtipatly212':         { cityId: 'מושב אורה',            address: 'משתלת דרך המשי, מלאכה ב\', מושב אורה' },
  'coffeetrail-mesheksegal':           { cityId: 'טל שחר',               address: 'נחל שורק 82, מושב טל שחר' },
  'coffeetrail-hkafelyadhnahal':       { cityId: 'עין צורים',            address: 'שלולית החורף, עין צורים' },
  'coffeetrail-emanuel':               { cityId: 'מושב ישע',             address: 'מושב ישע' },
  'coffeetrail-karamela':              { cityId: 'אבן שמואל',            address: 'משעול העפרוני, אבן שמואל' },
  'coffeetrail-galita':                { cityId: 'שובה',                 address: 'שובה' },
  'coffeetrail-cafe-barkay':           { cityId: 'ים המלח',              address: 'תיירות ים המלח' },
  'coffeetrail-itamar-coffee':         { cityId: 'נגב',                  address: 'אנדרטת החץ השחור, נגב' },

  // --- אצווה חדשה (כשר רגיל) ---
  'coffeetrail-mona-cafe':             { cityId: 'בית חשמונאי',          address: 'בית חשמונאי' },
  'coffeetrail-rozale':                { cityId: 'כפר הריף',              address: 'הרימון 73, כפר הריף' },
  'coffeetrail-moishe':                { cityId: 'קיבוץ לביא',            address: 'קיבוץ לביא' },
  'coffeetrail-nelly':                 { cityId: 'משמר איילון',           address: 'משמר איילון' },
  'coffeetrail-florin':                { cityId: 'פדואל',                 address: 'פדואל' },
  'coffeetrail-reama':                 { cityId: 'ירושלים',               address: 'דוד המלך 24, ירושלים' },
  'coffeetrail-siftach-efrat':         { cityId: 'אפרת',                  address: 'הדגן 1, אפרת' },
  'coffeetrail-barbara':               { cityId: 'מושב ברכיה',            address: 'מושב ברכיה משק 89' },
  'coffeetrail-berta-coffe-tivon':     { cityId: 'קרית טבעון',            address: 'ש.ב אורבך 10, קרית טבעון' },
  'coffeetrail-stella':                { cityId: 'מושב מגשימים',          address: 'הברוש 20, מושב מגשימים' },
  'coffeetrail-cafe-batsheva':         { cityId: 'יבנה',                  address: 'פארק השרון, יבנה' },
  'coffeetrail-la-bustan-cafe':        { cityId: 'מושב מזור',             address: 'גן חושים, מושב מזור' },
  'coffeetrail-field':                 { cityId: 'שדה אפרים',             address: 'שדה אפרים' },
  'coffeetrail-cafe-moize':            { cityId: 'מושב רמות',             address: 'מתחם לול ארט, מושב רמות' },
  'coffeetrail-cafe-flora-farm':       { cityId: 'מושב שדה משה',          address: 'חוות הסוס, מושב שדה משה' },
  'coffeetrail-cafe-smadar':           { cityId: 'כרמיאל',                address: 'דרור 100, כרמיאל' },
  'coffeetrail-blooms':                { cityId: 'פרדס חנה',              address: 'חרושת 1, פרדס חנה' },
  'coffeetrail-ruhama':                { cityId: 'גת גדעון',              address: 'גני טל, גת גדעון' },
  'coffeetrail-dusa':                  { cityId: 'מעלה גלבוע',            address: 'פרחי הבר, מעלה גלבוע' },
  'coffeetrail-jonis':                 { cityId: 'מושב נבטים',            address: 'לוטוס, מושב נבטים' },
  'coffeetrail-caffe-lago-rosh-haayin':{ cityId: 'ראש העין',              address: 'מעיין 2, ראש העין' },
  'coffeetrail-olives-b-y':            { cityId: 'באר יעקב',              address: 'אהוד מנור 1, באר יעקב' },
  'coffeetrail-cafe-lumiere':          { cityId: 'יבנה',                  address: 'שי עגנון 15, יבנה' },
  'coffeetrail-veahavta':              { cityId: 'מושב נעמה',             address: 'מושב נעמה, בקעת הירדן' },
  'coffeetrail-gitita':                { cityId: 'גיתית',                 address: 'שפת המדבר, גיתית' },
  'coffeetrail-boombar-coffee':        { cityId: 'מושב מבקיעים',          address: 'ליד מגדל המים, מושב מבקיעים' },
  'coffeetrail-grypo':                 { cityId: 'בן זכאי',               address: 'הרימון 104, בן זכאי' },
  'coffeetrail-coffee-471':            { cityId: 'גבעת שמואל',            address: 'פארק דרום, גבעת שמואל' },
  'coffeetrail-tanto':                 { cityId: 'שילת',                  address: 'דרך הזית 3, שילת' },
  'coffeetrail-malla':                 { cityId: 'נטור',                  address: 'עין קשתות, נטור' },
  'coffeetrail-nolee':                 { cityId: 'סביון',                 address: 'פארק הציפורים, סביון' },
  'coffeetrail-garden-cy':             { cityId: 'שתולים',                address: 'משתלת רואים ירוק, שתולים' },
  'coffeetrail-etzel-dandan':          { cityId: 'קיבוץ גבים',            address: 'קיבוץ גבים' },
  'coffeetrail-mandra':                { cityId: 'לשם',                   address: 'עלי זהב, לשם' },
  'coffeetrail-morcafe':               { cityId: 'קיבוץ עלומים',          address: 'קיבוץ עלומים' },
  'coffeetrail-vany-g-n':              { cityId: 'בת ים',                 address: 'כינור דוד 4, בת ים' },
  'coffeetrail-cafe-leibo':            { cityId: 'רמת הגולן',             address: 'רמת הנשיא, רמת הגולן' },
  'coffeetrail-chenushas-coffee-truck':{ cityId: 'מושב סגולה',            address: 'מושב סגולה' },
  'coffeetrail-leahlecafe':            { cityId: 'כפר פינס',              address: 'הסליק, כפר פינס' },
  'coffeetrail-ayana':                 { cityId: 'קיבוץ עין הנציב',       address: 'קיבוץ עין הנציב' },
  'coffeetrail-nevo_winery':           { cityId: 'מושב מטע',              address: 'הברוש 57, מושב מטע' },
  'coffeetrail-capische-caffe':        { cityId: 'שערי תקווה',            address: 'חניון האיילים, שערי תקווה' },
  'coffeetrail-olivan':                { cityId: 'כפר אחים',              address: 'הכרמים 26, כפר אחים' },
  'coffeetrail-cafe-ve-yam':           { cityId: 'שפיים',                 address: 'שפיים' },
  'coffeetrail-lychee':                { cityId: 'מושב באר טוביה',        address: 'אליק 1, מושב באר טוביה' },
  'coffeetrail-pedushka-cafe':         { cityId: 'מושב שחר',              address: 'הסחלב 1, מושב שחר' },
  'coffeetrail-coffeeqana':            { cityId: 'נופים',                 address: 'פארק קנה, נופים' },
  'coffeetrail-aviyula':               { cityId: 'צופים',                 address: 'צופים' },
  'coffeetrail-galita-coffee-cart':    { cityId: 'קיבוץ צובה',            address: 'קיבוץ צובה' },
  'coffeetrail-geula':                 { cityId: 'מושב תקומה',            address: 'משק 10, מושב תקומה' },
  'coffeetrail-nachshon-coffee':       { cityId: 'קיבוץ נחשון',           address: 'קיבוץ נחשון' },
  'coffeetrail-coffeejoni':            { cityId: 'מושב מחולה',            address: 'כביש 90 מול מושב מחולה' },
  'coffeetrail-osha':                  { cityId: 'בוסתן הגליל',           address: 'שדרות האקליפטוס 13, בוסתן הגליל' },
  'coffeetrail-kedma-coffee':          { cityId: 'סוסיא',                 address: 'אתר סוסיא הקדומה, דרום הר חברון' },
  'coffeetrail-inta':                  { cityId: 'משאבי שדה',             address: 'משאבי שדה' },
  'coffeetrail-ariela':                { cityId: 'אריאל',                 address: 'פארק הנחל, אריאל' },
  'coffeetrail-food-truck-hamaafiya':  { cityId: 'גדרה',                  address: 'יצחק רבין, גדרה' },
  'coffeetrail-fifa-cafe':             { cityId: 'יהוד',                  address: 'האלמוג 2, יהוד' },
  'coffeetrail-bari':                  { cityId: 'ביכורה',                address: 'ביכורה' },
  'coffeetrail-cafe-flora-bapetel':    { cityId: 'נתיב העשרה',            address: 'נתיב העשרה' },
  'coffeetrail-cafe-yuda':             { cityId: 'בית חורון',             address: 'בוסתן השמונה, בית חורון' },
  'coffeetrail-hamelech_basadeh':      { cityId: 'שדה יעקב',              address: 'דרך השדות, שדה יעקב' },
};

function decodeHtmlEntities(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

const rawPath = path.join(__dirname, 'output', 'coffee-carts.raw.json');
const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));

const normalized = raw.map(record => {
  const locationOverride = LOCATION_MAP[record.id];
  return {
    ...record,
    name: decodeHtmlEntities(record.name),
    cityId: locationOverride?.cityId ?? record.cityId,
    address: locationOverride?.address ?? record.address,
  };
});

const outPath = path.join(__dirname, 'output', 'coffee-carts.normalized.json');
fs.writeFileSync(outPath, JSON.stringify(normalized, null, 2));
console.log(`✅ normalized: ${outPath}`);
console.log(`   ${normalized.length} רשומות`);
normalized.forEach(r => console.log(`   ${r.id.padEnd(40)} ${r.name} → ${r.cityId}`));
