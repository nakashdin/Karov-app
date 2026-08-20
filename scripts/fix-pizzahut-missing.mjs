import { readFileSync, writeFileSync } from 'fs';

const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);
function readJson(p) {
  const raw = readFileSync(p);
  const str = raw[0] === 0xEF ? raw.slice(3).toString('utf8') : raw.toString('utf8');
  return JSON.parse(str);
}
function writeJson(p, data) {
  writeFileSync(p, Buffer.concat([BOM, Buffer.from(JSON.stringify(data, null, 2), 'utf8')]));
}

const RESTAURANTS = 'C:/Users/User/Desktop/claude plane/kosher-app/src/data/generated/restaurants.osm.json';
const PLACES      = 'C:/Users/User/Desktop/claude plane/kosher-app/src/data/generated/places.osm.json';

// כפולות OSM למחיקה (יש לנו manual מדויק יותר)
const DELETE_IDS = new Set([
  'osm-node-5255495084',   // טכניון חיפה → שמור 9100052
  'osm-node-6239725890',   // יוקנעם → שמור 9100048
  'osm-node-2318762527',   // קריית שמונה → שמור 9100023
  'osm-node-10970907888',  // גבעתיים (ללא כתובת) → מוחלף ע"י 9100085 תל אביב מגדלים
]);

// תיקון כתובת פארק אדיסון
const FIXES = {
  '9100027': { address: 'פארק אדיסון, אור יהודה' },
};

// 19 סניפים חסרים מהאתר הרשמי — IDs מ-9100084 ועלה
const NEW_BRANCHES = [
  {
    id: '9100084',
    name: 'פיצה האט תל אביב מגדלים',
    cityId: 'תל אביב',
    address: 'תוצרת הארץ 9, תל אביב',
    location: { latitude: 32.0661, longitude: 34.8090 },
    type: 'fast_food',
    kashrut: 'כשר למהדרין',
    openingHours: "א'-ה' 11:00-23:00 | ו' 11:00-14:00 | ש' מוצ\"ש עד 23:00",
    phone: null,
    website: 'https://www.pizzahut.co.il',
  },
  {
    id: '9100085',
    name: 'פיצה האט תל אביב יד אליהו',
    cityId: 'תל אביב',
    address: 'יגאל אלון 51, תל אביב',
    location: { latitude: 32.0630, longitude: 34.7862 },
    type: 'fast_food',
    kashrut: 'כשר למהדרין בית יוסף',
    openingHours: "א'-ה' 11:00-23:00 | ו' 11:00-14:00 | ש' מוצ\"ש עד 23:00",
    phone: null,
    website: 'https://www.pizzahut.co.il',
  },
  {
    id: '9100086',
    name: 'פיצה האט תל אביב רמת החייל',
    cityId: 'תל אביב',
    address: 'הנחושת 1, תל אביב',
    location: { latitude: 32.1066, longitude: 34.8341 },
    type: 'fast_food',
    kashrut: 'כשר למהדרין בית יוסף',
    openingHours: "א'-ה' 11:00-23:00 | ו' 11:00-14:00 | ש' מוצ\"ש עד 23:00",
    phone: null,
    website: 'https://www.pizzahut.co.il',
  },
  {
    id: '9100087',
    name: 'פיצה האט ראשון לציון מזרח',
    cityId: 'ראשון לציון',
    address: 'יעקב פריימן 1, ראשון לציון',
    location: { latitude: 31.9730, longitude: 34.8068 },
    type: 'fast_food',
    kashrut: 'כשר למהדרין',
    openingHours: "א'-ה' 11:00-23:00 | ו' 11:00-14:00 | ש' מוצ\"ש עד 23:00",
    phone: null,
    website: 'https://www.pizzahut.co.il',
  },
  {
    id: '9100088',
    name: 'פיצה האט נתניה מרכז',
    cityId: 'נתניה',
    address: 'כיכר העצמאות 3, נתניה',
    location: { latitude: 32.3293, longitude: 34.8600 },
    type: 'fast_food',
    kashrut: 'כשר למהדרין בית יוסף',
    openingHours: "א'-ה' 11:00-23:00 | ו' 11:00-14:00 | ש' מוצ\"ש עד 23:00",
    phone: null,
    website: 'https://www.pizzahut.co.il',
  },
  {
    id: '9100089',
    name: 'פיצה האט ירושלים רמות',
    cityId: 'ירושלים',
    address: 'קניון רמות, ירושלים',
    location: { latitude: 31.8214, longitude: 35.1908 },
    type: 'fast_food',
    kashrut: 'כשר הרב רובין',
    openingHours: "א'-ה' 11:00-23:00 | ו' 11:00-14:00 | ש' מוצ\"ש עד 23:00",
    phone: null,
    website: 'https://www.pizzahut.co.il',
  },
  {
    id: '9100090',
    name: 'פיצה האט ירושלים תלפיות',
    cityId: 'ירושלים',
    address: 'יד חרוצים 18, ירושלים',
    location: { latitude: 31.7523, longitude: 35.2200 },
    type: 'fast_food',
    kashrut: 'כשר למהדרין הרב רובין',
    openingHours: "א'-ה' 11:00-23:00 | ו' 11:00-14:00 | ש' מוצ\"ש עד 23:00",
    phone: null,
    website: 'https://www.pizzahut.co.il',
  },
  {
    id: '9100091',
    name: 'פיצה האט ירושלים תחנה מרכזית',
    cityId: 'ירושלים',
    address: 'יפו 228, ירושלים',
    location: { latitude: 31.7866, longitude: 35.2020 },
    type: 'fast_food',
    kashrut: 'כשר למהדרין הרב רובין',
    openingHours: "א'-ה' 11:00-23:00 | ו' 11:00-14:00 | ש' מוצ\"ש עד 23:00",
    phone: null,
    website: 'https://www.pizzahut.co.il',
  },
  {
    id: '9100092',
    name: 'פיצה האט ירושלים קרית יובל',
    cityId: 'ירושלים',
    address: 'אורוגוואי 1, ירושלים',
    location: { latitude: 31.7694, longitude: 35.1728 },
    type: 'fast_food',
    kashrut: 'כשר הרב רובין',
    openingHours: "א'-ה' 11:00-23:00 | ו' 11:00-14:00 | ש' מוצ\"ש עד 23:00",
    phone: null,
    website: 'https://www.pizzahut.co.il',
  },
  {
    id: '9100093',
    name: 'פיצה האט ירושלים ניות',
    cityId: 'ירושלים',
    address: 'זלמן שניאור 1, ירושלים',
    location: { latitude: 31.7573, longitude: 35.1988 },
    type: 'fast_food',
    kashrut: 'כשר הרב רובין',
    openingHours: "א'-ה' 11:00-23:00 | ו' 11:00-14:00 | ש' מוצ\"ש עד 23:00",
    phone: null,
    website: 'https://www.pizzahut.co.il',
  },
  {
    id: '9100094',
    name: 'פיצה האט ירושלים מלחה',
    cityId: 'ירושלים',
    address: 'קניון מלחה, ירושלים',
    location: { latitude: 31.7456, longitude: 35.1883 },
    type: 'fast_food',
    kashrut: 'כשר למהדרין הרב רובין',
    openingHours: "א'-ה' 11:00-23:00 | ו' 11:00-14:00 | ש' מוצ\"ש עד 23:00",
    phone: null,
    website: 'https://www.pizzahut.co.il',
  },
  {
    id: '9100095',
    name: 'פיצה האט ירושלים בן הלל',
    cityId: 'ירושלים',
    address: 'מרדכי בן הלל 15, ירושלים',
    location: { latitude: 31.7772, longitude: 35.2273 },
    type: 'fast_food',
    kashrut: 'כשר הרב רובין',
    openingHours: "א'-ה' 11:00-23:00 | ו' 11:00-14:00 | ש' מוצ\"ש עד 23:00",
    phone: null,
    website: 'https://www.pizzahut.co.il',
  },
  {
    id: '9100096',
    name: 'פיצה האט באר שבע מול 7',
    cityId: 'באר שבע',
    address: 'מול 7, ליד רמי לוי, באר שבע',
    location: { latitude: 31.2530, longitude: 34.7915 },
    type: 'fast_food',
    kashrut: 'כשר למהדרין בית יוסף',
    openingHours: "א'-ה' 11:00-23:00 | ו' 11:00-14:00 | ש' מוצ\"ש עד 23:00",
    phone: null,
    website: 'https://www.pizzahut.co.il',
  },
  {
    id: '9100097',
    name: 'פיצה האט באר שבע רמות',
    cityId: 'באר שבע',
    address: 'שדרות הערים התאומות 26, באר שבע',
    location: { latitude: 31.2740, longitude: 34.7840 },
    type: 'fast_food',
    kashrut: 'כשר למהדרין',
    openingHours: "א'-ה' 11:00-23:00 | ו' 11:00-14:00 | ש' מוצ\"ש עד 23:00",
    phone: null,
    website: 'https://www.pizzahut.co.il',
  },
  {
    id: '9100098',
    name: 'פיצה האט באר יעקב',
    cityId: 'באר יעקב',
    address: 'אסף הרופא, באר יעקב',
    location: { latitude: 31.9326, longitude: 34.8388 },
    type: 'fast_food',
    kashrut: 'כשר בית יוסף',
    openingHours: "א'-ה' 11:00-23:00 | ו' 11:00-14:00 | ש' מוצ\"ש עד 23:00",
    phone: null,
    website: 'https://www.pizzahut.co.il',
  },
  {
    id: '9100099',
    name: 'פיצה האט פתח תקווה אם המושבות',
    cityId: 'פתח תקווה',
    address: 'מרדכי בן דרור 4, פתח תקווה',
    location: { latitude: 32.0905, longitude: 34.8860 },
    type: 'fast_food',
    kashrut: 'כשר למהדרין בית יוסף',
    openingHours: "א'-ה' 11:00-23:00 | ו' 11:00-14:00 | ש' מוצ\"ש עד 23:00",
    phone: null,
    website: 'https://www.pizzahut.co.il',
  },
  {
    id: '9100100',
    name: 'פיצה האט פתח תקווה סירקין',
    cityId: 'פתח תקווה',
    address: 'עין גנים 96, פתח תקווה',
    location: { latitude: 32.0767, longitude: 34.9050 },
    type: 'fast_food',
    kashrut: 'כשר למהדרין בית יוסף',
    openingHours: "א'-ה' 11:00-23:00 | ו' 11:00-14:00 | ש' מוצ\"ש עד 23:00",
    phone: null,
    website: 'https://www.pizzahut.co.il',
  },
  {
    id: '9100101',
    name: 'פיצה האט חיפה מוריה',
    cityId: 'חיפה',
    address: 'מוריה 13, חיפה',
    location: { latitude: 32.7817, longitude: 34.9740 },
    type: 'fast_food',
    kashrut: 'כשר',
    openingHours: "א'-ה' 11:00-23:00 | ו' 11:00-14:00 | ש' מוצ\"ש עד 23:00",
    phone: null,
    website: 'https://www.pizzahut.co.il',
  },
  {
    id: '9100102',
    name: 'פיצה האט רמלה לוד',
    cityId: 'רמלה',
    address: 'משה אדרת 1, רמלה',
    location: { latitude: 31.9285, longitude: 34.8647 },
    type: 'fast_food',
    kashrut: 'כשר הרב רובין',
    openingHours: "א'-ה' 11:00-23:00 | ו' 11:00-14:00 | ש' מוצ\"ש עד 23:00",
    phone: null,
    website: 'https://www.pizzahut.co.il',
  },
];

for (const filePath of [RESTAURANTS, PLACES]) {
  let data = readJson(filePath);
  const before = data.length;

  // מחיקת כפולות OSM
  data = data.filter(r => !DELETE_IDS.has(r.id));

  // תיקון כתובת פארק אדיסון
  for (const r of data) {
    if (FIXES[r.id]) Object.assign(r, FIXES[r.id]);
  }

  // הוספת הסניפים החסרים (רק אם לא קיים)
  const existingIds = new Set(data.map(r => r.id));
  let added = 0;
  for (const branch of NEW_BRANCHES) {
    if (!existingIds.has(branch.id)) {
      data.push(branch);
      added++;
    }
  }

  writeJson(filePath, data);
  console.log(`${filePath.split('/').pop()}: ${before} → ${data.length} (+${added} חדשים, -${before - data.length + added} נמחקו)`);
}

// אמות
const check = readJson(RESTAURANTS);
const ph = check.filter(r => r.name && r.name.includes('פיצה האט'));
console.log(`\nסה"כ פיצה האט: ${ph.length}`);

const jlem = ph.filter(r => r.cityId === 'ירושלים');
console.log(`ירושלים: ${jlem.length} סניפים`);
jlem.forEach(r => console.log(' ', r.id, r.address));

const noAddr = ph.filter(r => !r.address);
console.log(`ללא כתובת: ${noAddr.length}`);
noAddr.forEach(r => console.log(' ', r.id, r.name));
