import { readFileSync, writeFileSync } from 'fs';

const DATA_PATH = 'C:\\Users\\User\\Desktop\\claude plane\\kosher-app\\src\\data\\generated\\places.osm.json';

const raw = readFileSync(DATA_PATH, 'utf-8').replace(/^\uFEFF/, '');
let places = JSON.parse(raw);

// Branches with no kosher certificate per roladin.co.il FAQ page
const NON_KOSHER = [
  { city: 'תל אביב', addr: 'ברודצקי' },
  { city: 'בת ים', addr: 'טיילת' },
  { city: 'אזורי חן' },
  { city: 'גבעתיים', addr: 'שינקין' },
  { city: 'הרצליה', addr: 'גליל ים' },
  { addr: 'שבעת הכוכבים' },
  { city: 'תל אביב', addr: 'יהודה מכבי' },
  { city: 'טייבה' },
  { city: 'כפר קאסם' },
  { city: 'נצרת' },
  { city: 'ראשון לציון', addr: 'ראשונים' },
  { city: 'רמת השרון', addr: 'סוקולוב' },
  { addr: 'דיזינגוף סנטר' },
  { city: 'טירת כרמל' },
];

function isRoladin(p) {
  return p.name && (p.name.includes('רולדין') || p.name.includes('Roladin'));
}

function isNonKosher(p) {
  if (!isRoladin(p)) return false;
  const city = (p.cityId || '').toLowerCase();
  const addr = (p.address || '').toLowerCase();
  for (const kw of NON_KOSHER) {
    let match = true;
    if (kw.city && !city.includes(kw.city)) match = false;
    if (kw.addr && !addr.includes(kw.addr)) match = false;
    if (match) return true;
  }
  return false;
}

const deleted = [];
let updated = 0;

places = places
  .filter(p => {
    if (!isRoladin(p)) return true;
    if (isNonKosher(p)) {
      deleted.push({ id: p.id, city: p.cityId, addr: p.address });
      return false;
    }
    return true;
  })
  .map(p => {
    if (!isRoladin(p)) return p;
    updated++;
    return {
      ...p,
      kosherType: 'rabanut',
      certifiedBy: 'רבנות מקומית',
      website: p.website || 'https://roladin.co.il',
      lastVerifiedAt: '2026-07-29',
    };
  });

writeFileSync(DATA_PATH, JSON.stringify(places, null, 2), 'utf-8');

console.log(`✅ רולדין: עודכנו ${updated} סניפים כשרים (רבנות מקומית)`);
console.log(`🗑️  נמחקו ${deleted.length} סניפים ללא תעודת כשרות:`);
deleted.forEach(r => console.log(`  ${r.id} | ${r.city} | ${r.addr}`));
console.log(`\nסה"כ: ${places.length} רשומות`);
