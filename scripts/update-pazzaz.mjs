import { readFileSync, writeFileSync } from 'fs';
const DATA_PATH = 'C:\\Users\\User\\Desktop\\claude plane\\kosher-app\\src\\data\\generated\\places.osm.json';

const raw = readFileSync(DATA_PATH, 'utf-8').replace(/^\uFEFF/, '');
let places = JSON.parse(raw);

// Update existing Pazzaz records
const UPDATES = {
  // אשדוד - address fix + kosherType (בד"ץ confirmed on site)
  'osm-node-7541798990': {
    address: 'הגדוד העברי 5, אשדוד',
    kosherType: 'mehadrin',
    certifiedBy: 'בד"ץ',
    openingHours: 'Su-Th 10:00-00:00',
    website: 'https://www.piza-pazzaz.co.il',
    lastVerifiedAt: '2026-07-29',
  },
  // ראשון לציון — already in DB, add hours + kosherType
  '9000113': {
    kosherType: 'kosher',
    openingHours: 'Su-Th 10:00-00:00; Fr 09:00-14:00; Sa 22:00-00:00',
    website: 'https://www.piza-pazzaz.co.il',
    lastVerifiedAt: '2026-07-29',
  },
  // נתניה - leave kosherType pending (uncertain from site)
  // שוהם - leave kosherType pending (uncertain from site)
};

places = places.map(p => {
  if (UPDATES[p.id]) return { ...p, ...UPDATES[p.id] };
  return p;
});

// Add missing kosher Pazzaz branches
const NEW_PAZZAZ = [
  {
    id: 'manual-pazzaz-or-akiva',
    name: 'פיצה פצץ', type: 'restaurant', cityId: 'אור עקיבא',
    address: 'מרכז מסחרי אור עקיבא',
    location: {lat: 32.5100, lng: 34.9205},
    phone: '04-6101601',
    kosherType: 'kosher', category: 'dairy',
    openingHours: 'Su-Th 10:00-00:00; Sa 22:00-00:00',
    source: 'manual', locationPrecision: 'city',
    website: 'https://www.piza-pazzaz.co.il', lastVerifiedAt: '2026-07-29',
  },
  {
    id: 'manual-pazzaz-kiryat-ata',
    name: 'פיצה פצץ', type: 'restaurant', cityId: 'קריית אתא',
    address: 'חנקין 2, קריית אתא',
    location: {lat: 32.8016, lng: 35.1085},
    phone: '077-3331551',
    kosherType: 'kosher', category: 'dairy',
    openingHours: 'Su-Th 10:30-23:30; Fr 11:30-14:00; Sa 22:00-00:00',
    source: 'manual', locationPrecision: 'city',
    website: 'https://www.piza-pazzaz.co.il', lastVerifiedAt: '2026-07-29',
  },
  {
    id: 'manual-pazzaz-jerusalem',
    name: 'פיצה פצץ', type: 'restaurant', cityId: 'ירושלים',
    address: 'נעמי 4, יס פלאנט, ירושלים',
    location: {lat: 31.7767, lng: 35.2345},
    phone: '02-5313403',
    kosherType: 'kosher', category: 'dairy',
    openingHours: 'Su-W 13:00-23:00; Th 13:00-01:00; Fr off; Sa 22:30-01:00',
    source: 'manual', locationPrecision: 'city',
    website: 'https://www.piza-pazzaz.co.il', lastVerifiedAt: '2026-07-29',
  },
  {
    id: 'manual-pazzaz-raanana',
    name: 'פיצה פצץ', type: 'restaurant', cityId: 'רעננה',
    address: 'אחוזה 106, רעננה',
    location: {lat: 32.1838, lng: 34.8709},
    phone: '09-7450342',
    kosherType: 'kosher', category: 'dairy',
    openingHours: 'Su-Th 10:00-00:00',
    source: 'manual', locationPrecision: 'city',
    website: 'https://www.piza-pazzaz.co.il', lastVerifiedAt: '2026-07-29',
  },
  {
    id: 'manual-pazzaz-kfar-yona',
    name: 'פיצה פצץ', type: 'restaurant', cityId: 'כפר יונה',
    address: "שד' בגין 44, כפר יונה",
    location: {lat: 32.3145, lng: 34.9323},
    phone: '053-6112028',
    kosherType: 'kosher', category: 'dairy',
    openingHours: 'Su-Th 12:00-23:00; Sa 22:00-23:00',
    source: 'manual', locationPrecision: 'city',
    website: 'https://www.piza-pazzaz.co.il', lastVerifiedAt: '2026-07-29',
  },
  {
    id: 'manual-pazzaz-nes-ziona',
    name: 'פיצה פצץ', type: 'restaurant', cityId: 'נס ציונה',
    address: 'נורדאו 3, נס ציונה',
    location: {lat: 31.9278, lng: 34.7985},
    phone: '077-6707407',
    kosherType: 'kosher', category: 'dairy',
    openingHours: 'Su-Th 11:00-02:00; Sa 22:00-02:00',
    source: 'manual', locationPrecision: 'city',
    website: 'https://www.piza-pazzaz.co.il', lastVerifiedAt: '2026-07-29',
  },
  {
    id: 'manual-pazzaz-rehovot',
    name: 'פיצה פצץ', type: 'restaurant', cityId: 'רחובות',
    address: 'הרצל 171, רחובות',
    location: {lat: 31.8929, lng: 34.8063},
    phone: '08-9585888',
    kosherType: 'kosher', category: 'dairy',
    openingHours: 'Su-Th 11:00-03:00; Fr 10:30-16:30; Sa 22:00-03:00',
    source: 'manual', locationPrecision: 'city',
    website: 'https://www.piza-pazzaz.co.il', lastVerifiedAt: '2026-07-29',
  },
  {
    id: 'manual-pazzaz-dimona',
    name: 'פיצה פצץ', type: 'restaurant', cityId: 'דימונה',
    address: "דרך בן גוריון 1045, דימונה",
    location: {lat: 31.0697, lng: 35.0320},
    phone: '08-6570550',
    kosherType: 'kosher', category: 'dairy',
    openingHours: 'Su-Th 16:00-00:30; Fr 10:00-15:00; Sa 22:00-00:00',
    source: 'manual', locationPrecision: 'city',
    website: 'https://www.piza-pazzaz.co.il', lastVerifiedAt: '2026-07-29',
  },
  {
    id: 'manual-pazzaz-yeruham',
    name: 'פיצה פצץ', type: 'restaurant', cityId: 'ירוחם',
    address: 'צבי ברונשטיין 312/19, ירוחם',
    location: {lat: 30.9887, lng: 34.9259},
    phone: '08-6595522',
    kosherType: 'kosher', category: 'dairy',
    openingHours: 'Su-Th 16:00-00:00; Sa 22:00-01:00',
    source: 'manual', locationPrecision: 'city',
    website: 'https://www.piza-pazzaz.co.il', lastVerifiedAt: '2026-07-29',
  },
];

places.push(...NEW_PAZZAZ);
writeFileSync(DATA_PATH, JSON.stringify(places, null, 2), 'utf-8');
console.log(`✅ פיצה פצץ: 2 עודכנו, ${NEW_PAZZAZ.length} נוספו. סה"כ: ${places.length}`);
