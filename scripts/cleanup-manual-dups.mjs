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

// manual-* IDs שכופלים רשומה טובה יותר
const DELETE_IDS = new Set([
  // חומוס אליהו — manual כפל של humus-eli-*
  'manual-hummus-eli-azor',
  'manual-hummus-eli-ashdod',
  'manual-hummus-eli-ashkelon',
  'manual-hummus-eli-beer-yaakov',
  'manual-hummus-eliyahu-raanana',
  'manual-hummus-eli-bat-yam',
  'manual-hummus-eli-netanya',
  'manual-hummus-eli-safed',
  // דבוש — manual כפל של dabush-*
  'manual-dabush-bb',
  'manual-dabush-pt',
  'manual-dabush-netanya',
  'manual-dabush-holon',
  // השמן — manual כפל של hashamen*
  'manual-hashamen-rishon',
  'manual-hashamen-mevasseret',
  // ממפיס — כפל
  'memphis-0fc0a28c',
  // ביגה ראשל"צ — manual ללא שעות
  'manual-biga-rishon-aylal',
  // הלו תימן בני ברק — manual ללא שעות
  'manual-halo-teman-jabotinsky-bb',
  // OSM ללא שעות שנכפלים ע"י manual עם שעות
  'osm-node-11843060618',   // ג'ימי הגדול רמת השרון → שמור manual-jimmy-hagadol-ramat-hasharon
  // פלאפל חתוכה שוהם — manual ללא שעות כפל של falafel-chatuka-*
  'manual-falafel-hatuka-shoham',
  // צחי בשרים בת ים — manual ללא שעות
  'manual-tzachi-bat-yam',
  // שלום פלאפל ירושלים — שניהם בלי שעות, נשמור את ה-manual
  'osm-node-13057613011',
  // OSM כרמיאל כפל של greg-44c4c173 — נמחק
  'osm-node-4818808608',
]);

const FILES = [
  'C:/Users/User/Desktop/claude plane/kosher-app/src/data/generated/restaurants.osm.json',
  'C:/Users/User/Desktop/claude plane/kosher-app/src/data/generated/places.osm.json',
];

for (const filePath of FILES) {
  const data = readJson(filePath);
  const before = data.length;
  const filtered = data.filter(r => !DELETE_IDS.has(r.id));
  writeJson(filePath, filtered);
  console.log(`${filePath.split('/').pop()}: נמחקו ${before - filtered.length} → סה"כ ${filtered.length}`);
}
console.log('Done!');
