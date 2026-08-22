import { readFileSync, writeFileSync } from 'fs';

const DATA_PATH = 'C:\\Users\\User\\Desktop\\claude plane\\kosher-app\\src\\data\\generated\\places.osm.json';

const raw = readFileSync(DATA_PATH, 'utf-8').replace(/^\uFEFF/, '');
let places = JSON.parse(raw);

// Fix קריית מוצקין - city spelling mismatch prevented auto-match
// hours: א'-ה' 11:00-23:00; ש' מוצ"ש חצי שעה מצאת השבת – 01:00
places = places.map(p => {
  if (p.id === '9000068') {
    return {
      ...p,
      website: 'https://pizza-shemesh.co.il/קרית-מוצקין/',
      openingHours: 'Su-Th 11:00-23:00; Sa 22:00-01:00',
      lastVerifiedAt: '2026-07-29',
    };
  }
  return p;
});

// Add רעננה branch (not in DB at all)
// hours: א'-ה' 11:00-23:00; ו' סגור; ש' מוצש חצי שעה מצאת השבת – 23:30
const raanana = {
  id: 'manual-pizza-shemesh-raanana-achuzah',
  name: 'פיצה שמש',
  type: 'restaurant',
  category: 'dairy',
  cityId: 'רעננה',
  address: 'רחוב אחוזה 100, רעננה',
  location: { latitude: 32.1838, longitude: 34.8709 },
  phone: '',
  kosherType: 'rabanut_mehadrin',
  certifiedBy: 'הרב רובין',
  website: 'https://pizza-shemesh.co.il/סניף-רעננה-רחוב-אחוזה/',
  openingHours: 'Su-Th 11:00-23:00; Sa 22:00-23:30',
  source: 'manual',
  locationPrecision: 'city',
  lastVerifiedAt: '2026-07-29',
};

places.push(raanana);

writeFileSync(DATA_PATH, JSON.stringify(places, null, 2), 'utf-8');
console.log(`✅ תוקן: קריית מוצקין (9000068) + נוסף: רעננה. סה"כ: ${places.length}`);
