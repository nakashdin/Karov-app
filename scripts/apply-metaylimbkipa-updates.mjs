import fs from 'fs';

const DATA_PATH = 'src/data/generated/places.osm.json';
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

// Results from workflow
const UPDATES = [
  {"id":"lechembasar-6d4cc2b0","certifiedBy":"כשר למהדרין בהשגחת הרב מחפוד","kosherType":"rav_machpud","instagram":"https://www.instagram.com/lechem_basar_tlv/"},
  {"id":"lechembasar-bcd9030b","certifiedBy":"כשר למהדרין בהשגחת הרב מחפוד","kosherType":"rav_machpud"},
  {"id":"lechembasar-38f7d23e","certifiedBy":"כשר למהדרין בהשגחת הרב מחפוד","kosherType":"rav_machpud"},
  {"id":"lechembasar-79d932e6","certifiedBy":"כשר למהדרין בהשגחת הרב מחפוד","kosherType":"rav_machpud","instagram":"https://www.instagram.com/lechem_basar_rishon/"},
  {"id":"lechembasar-2455d1ef","certifiedBy":"כשר למהדרין בהשגחת הרב מחפוד","kosherType":"rav_machpud"},
  {"id":"manual-nagisa-ramat-gan","kosherType":"badatz_beit_yosef","certifiedBy":"בד\"ץ בית יוסף","phone":"077-7000333","openingHours":"א'-ה' 11:00-23:30; ו' סגור; מוצ\"ש: חצי שעה מצאת שבת עד 00:00"},
  {"id":"manual-nagisa-afula","phone":"077-7000333","openingHours":"א'-ה' 11:00-23:30; ו' 11:00-15:00; מוצ\"ש: צאת שבת עד 24:00"},
  {"id":"manual-oshi-oshi-namal-tlv","instagram":"https://www.instagram.com/oshioshi_sushibar/"},
  {"id":"manual-oshi-oshi-ramat-gan","instagram":"https://www.instagram.com/oshioshi_sushibar/"},
  {"id":"manual-oshi-oshi-holon-sokolov","instagram":"https://www.instagram.com/oshioshi_sushibar/"},
  {"id":"manual-oshi-oshi-holon-azrieli","instagram":"https://www.instagram.com/oshioshi_sushibar/"},
  {"id":"manual-mucha-pt","phone":"*2548"},
  {"id":"agadir-7f4986df","certifiedBy":"כשרות הרב מחפוד","kosherType":"rav_machpud","instagram":"https://www.instagram.com/agadirburger/","openingHours":"א'-ד' 12:00-00:00; ה' 12:00-01:00; ו' סגור; ש' 19:30-01:00"},
  {"id":"manual-memphis-tlv","phone":"*2904","kosherType":"badatz_beit_yosef"},
  {"id":"manual-fast-food-manfis","openingHours":"א'-ה' 10:00-02:00; ש' מוצ\"ש-02:00","instagram":"https://www.instagram.com/menfis.israel/"},
  {"id":"manual-memphis-lod","openingHours":"א'-ה' 10:00-02:00; ש' מוצ\"ש-02:00","website":"https://www.menfis.co.il","instagram":"https://www.instagram.com/menfis.israel/"},
  {"id":"manual-fast-food-zalmans","phone":"077-7715550","openingHours":"א'-ה' 11:00-01:00; ש' 18:00-00:00"},
  {"id":"manual-restaurant-ezra-uvanav","instagram":"https://www.instagram.com/ezra_bney_brak/"},
  {"id":"jer-3f247121","instagram":"https://www.instagram.com/cafe_gan_sipur/"},
  {"id":"manual-restaurant-piano-piano","openingHours":"א'-ה' 12:00-24:00; ו' 10:00 עד שעתיים לפני כניסת שבת; ש' מצאת שבת-24:00"},
  {"id":"manual-restaurant-rashel","openingHours":"א'-ד' 16:00-23:00; ה' 16:00-01:00"},
  {"id":"manual-cafe-bokeria","instagram":"https://www.instagram.com/bokeria_y_center/"},
  {"id":"manual-restaurant-alfredo","openingHours":"א'-ה' 10:00-23:45; ו' 09:00-13:00; מוצ\"ש שעה לאחר צאת שבת עד 24:00","instagram":"https://www.instagram.com/alfredo.petahtikva/"},
  {"id":"manual-restaurant-mama-greg","instagram":"https://www.instagram.com/_mamagreg/"},
  {"id":"manual-cafe-lion-or-yehuda","website":"https://lyon.co.il","openingHours":"א'-ה' 08:00-23:30; ו' 08:00-14:00; מוצ\"ש שעה לאחר צאת שבת עד חצות"},
  {"id":"manual-taboon-maya-bb","website":"https://maya-bakery.co.il","openingHours":"א'-ה' 07:00-00:45; ו' 07:00-13:00"},
  {"id":"manual-restaurant-goldis","instagram":"https://www.instagram.com/goldys1982/"},
  {"id":"manual-restaurant-japan-japan-givat-shmuel","instagram":"https://www.instagram.com/japanjapan_givatshmuel/","openingHours":"א'-ה' 11:00-23:00; ו' 10:30-14:30; ש' מוצ\"ש-00:00"},
  {"id":"manual-restaurant-parmesan","openingHours":"א'-ה' 11:00-23:00; ש' שעה אחרי צאת שבת עד חצות","menu":"https://parmesan.co.il/תפריט/"},
  {"id":"manual-cafe-cafe-reim","openingHours":"א'-ה' 11:00-23:00; ש' 19:00-23:00","menu":"https://reim-bistro.co.il/תפריט-ערב/"},
  {"id":"manual-restaurant-batzir","openingHours":"א'-ד' 12:00-22:45; ה' 12:00-01:00","menu":"https://www.bazirest.co.il/תפריט"},
];

const UPDATABLE = ['certifiedBy','kosherType','instagram','facebook','phone','openingHours','website','description','menu'];

let totalUpdated = 0;
let totalFieldsAdded = 0;
const changeLog = [];

const updated = data.map(p => {
  const found = UPDATES.find(u => u.id === p.id);
  if (!found) return p;

  const next = { ...p };
  const fieldsAdded = [];
  for (const field of UPDATABLE) {
    if (found[field] && !p[field]) {
      next[field] = found[field];
      fieldsAdded.push(field);
    }
  }
  if (fieldsAdded.length > 0) {
    totalUpdated++;
    totalFieldsAdded += fieldsAdded.length;
    changeLog.push({ id: p.id, name: p.name, added: fieldsAdded });
  }
  return next;
});

// Report
console.log(`\n=== APPLY RESULTS ===`);
console.log(`Entries updated: ${totalUpdated}`);
console.log(`Fields added: ${totalFieldsAdded}`);
console.log(`\nDetails:`);
changeLog.forEach(c => console.log(`  [${c.name}] (${c.id}) +${c.added.join(', ')}`));

// Write
fs.writeFileSync(DATA_PATH, JSON.stringify(updated, null, 2), 'utf8');
console.log(`\nWrote ${DATA_PATH}`);

// Note OSM duplicates
console.log(`\n⚠️  NOTES:`);
console.log(`  - manual-fast-food-manfis AND manual-memphis-lod: both at הנשיא 6 לוד — likely duplicates`);
console.log(`  - osm-node-10244439955 / osm-way-426439891: OSM קפה גן סיפור entries without verified kashrut — not updated with kosherType`);
console.log(`  - נגיסה branches (kfar-saba/raanana/tlv/bb/givat-shmuel/kiryat-ono): kosherType still missing — agent couldn't find branch-specific kashrut`);
