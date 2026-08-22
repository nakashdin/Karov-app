import { readFileSync, writeFileSync } from 'fs';

const DATA_PATH = 'C:\\Users\\User\\Desktop\\claude plane\\kosher-app\\src\\data\\generated\\places.osm.json';
const raw = readFileSync(DATA_PATH, 'utf-8').replace(/^\uFEFF/, '');
let places = JSON.parse(raw);

// Fix Pizza Story Ramla: wrong address + wrong phone
places = places.map(p => {
  if (p.id === '9000106') {
    return {
      ...p,
      address: 'משה לוי 16, רמלה',
      phone: '086103010',
      kosherType: 'badatz_beit_yosef',
      certifiedBy: 'בד"ץ בית יוסף',
      website: 'https://pizza-story.co.il',
      lastVerifiedAt: '2026-07-29',
    };
  }
  return p;
});

// Add פיצה בכיכר חולון
const bakikar = {
  id: 'manual-pizza-bakikar-holon',
  name: 'פיצה בכיכר',
  type: 'restaurant',
  category: 'dairy',
  cityId: 'חולון',
  address: 'סוקולוב 22, חולון',
  location: { latitude: 32.0174, longitude: 34.7791 },
  phone: '',
  kosherType: 'mehadrin',
  openingHours: 'Su-Th 11:00-21:15; Sa 21:15-23:00',
  website: 'https://pizza-bakikar.co.il',
  source: 'manual',
  locationPrecision: 'address',
  lastVerifiedAt: '2026-07-29',
};

places.push(bakikar);

writeFileSync(DATA_PATH, JSON.stringify(places, null, 2), 'utf-8');
console.log('✅ תוקן: פיצה סטורי רמלה (כתובת + טלפון + כשרות)');
console.log('✅ נוסף: פיצה בכיכר חולון (מהדרין)');
console.log(`סה"כ: ${places.length}`);
