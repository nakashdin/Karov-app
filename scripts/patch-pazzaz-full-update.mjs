import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../src/data/generated/places.osm.json');
const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

// Data from official piza-pazzaz.co.il branch pages (scraped 2026-07-30)
// Only fields confirmed from official site are updated
const updates = {
  // אשדוד - official site explicitly shows "סמל הבד"ץ"
  'osm-node-7541798990': {
    phone: '08-8640009',
    address: 'הגדוד העברי 5, אשדוד',
    openingHours: 'א\'-ה\' 10:00-24:00',
    website: 'https://www.piza-pazzaz.co.il/%d7%94%d7%a1%d7%a0%d7%99%d7%a4%d7%99%d7%9d-%d7%a9%d7%9c%d7%a0%d7%95/%d7%a1%d7%a0%d7%99%d7%a4%d7%99%d7%9d-%d7%91%d7%93%d7%a8%d7%95%d7%9d/%d7%a1%d7%a0%d7%99%d7%a3-%d7%90%d7%a9%d7%93%d7%95%d7%93/',
    kosherType: 'mehadrin',
    lastVerifiedAt: '2026-07-30',
  },

  // נתניה - no hours available on official site
  '9000112': {
    phone: '09-898-8099',
    address: 'שד\' טום לנטוס 26, נתניה',
    website: 'https://www.piza-pazzaz.co.il/%d7%94%d7%a1%d7%a0%d7%99%d7%a4%d7%99%d7%9d-%d7%a9%d7%9c%d7%a0%d7%95/%d7%a1%d7%a0%d7%99%d7%a4%d7%99%d7%9d-%d7%91%d7%9e%d7%a8%d7%9b%d7%96/%d7%a1%d7%a0%d7%99%d7%a3-%d7%a0%d7%aa%d7%a0%d7%99%d7%94/',
    lastVerifiedAt: '2026-07-30',
  },

  // ראשון לציון - user confirmed בד"צ בית יוסף from menu image on official page
  '9000113': {
    phone: '03-9410925',
    address: 'החלמונית 22, ראשון לציון',
    openingHours: 'א\'-ה\' 10:00-24:00 | ו\' 09:00-כניסת שבת | מוצ"ש פתוח',
    website: 'https://www.piza-pazzaz.co.il/%d7%94%d7%a1%d7%a0%d7%99%d7%a4%d7%99%d7%9d-%d7%a9%d7%9c%d7%a0%d7%95/%d7%a1%d7%a0%d7%99%d7%a4%d7%99%d7%9d-%d7%91%d7%9e%d7%a8%d7%9b%d7%96/%d7%a1%d7%a0%d7%99%d7%a3-%d7%a8%d7%90%d7%a9%d7%95%d7%9f-%d7%9c%d7%a6%d7%99%d7%95%d7%9f/',
    kosherType: 'badatz_beit_yosef',
    lastVerifiedAt: '2026-07-30',
  },

  // אור עקיבא
  'manual-pazzaz-or-akiva': {
    phone: '04-6101601',
    address: 'מרכז מסחרי אור עקיבא',
    openingHours: 'א\'-ה\' 10:00-24:00 | מוצ"ש עד 24:00',
    website: 'https://www.piza-pazzaz.co.il/%d7%94%d7%a1%d7%a0%d7%99%d7%a4%d7%99%d7%9d-%d7%a9%d7%9c%d7%a0%d7%95/%d7%a1%d7%a0%d7%99%d7%a4%d7%99%d7%9d-%d7%91%d7%a6%d7%a4%d7%95%d7%9f/%d7%a1%d7%a0%d7%99%d7%a3-%d7%90%d7%95%d7%a8-%d7%a2%d7%a7%d7%99%d7%91%d7%90/',
    lastVerifiedAt: '2026-07-30',
  },

  // קריית אתא
  'manual-pazzaz-kiryat-ata': {
    phone: '077-3331551',
    address: 'חנקין 2, קריית אתא',
    openingHours: 'א\'-ה\' 10:30-23:30 | ו\' 11:30-14:00 | מוצ"ש עד 24:00',
    website: 'https://www.piza-pazzaz.co.il/%d7%94%d7%a1%d7%a0%d7%99%d7%a4%d7%99%d7%9d-%d7%a9%d7%9c%d7%a0%d7%95/%d7%a1%d7%a0%d7%99%d7%a4%d7%99%d7%9d-%d7%91%d7%a6%d7%a4%d7%95%d7%9f/%d7%a1%d7%a0%d7%99%d7%a3-%d7%a7%d7%a8%d7%99%d7%aa-%d7%90%d7%aa%d7%90/',
    lastVerifiedAt: '2026-07-30',
  },

  // ירושלים - closed Friday, Motzei Shabbat hours (strong kosher indicator)
  'manual-pazzaz-jerusalem': {
    phone: '02-5313403',
    address: 'נעמי 4, ירושלים',
    openingHours: 'א\'-ד\' 13:00-23:00 | ה\' 13:00-01:00 | ו\' סגור | מוצ"ש עד 01:00',
    website: 'https://www.piza-pazzaz.co.il/%d7%94%d7%a1%d7%a0%d7%99%d7%a4%d7%99%d7%9d-%d7%a9%d7%9c%d7%a0%d7%95/%d7%a1%d7%a0%d7%99%d7%a4%d7%99%d7%9d-%d7%91%d7%9e%d7%a8%d7%9b%d7%96/%d7%a1%d7%a0%d7%99%d7%a3-%d7%99%d7%a8%d7%95%d7%a9%d7%9c%d7%99%d7%9d/',
    lastVerifiedAt: '2026-07-30',
  },

  // רעננה
  'manual-pazzaz-raanana': {
    phone: '09-7450342',
    address: 'אחוזה 106, רעננה',
    openingHours: 'א\'-ה\' 10:00-24:00',
    website: 'https://www.piza-pazzaz.co.il/%d7%94%d7%a1%d7%a0%d7%99%d7%a4%d7%99%d7%9d-%d7%a9%d7%9c%d7%a0%d7%95/%d7%a1%d7%a0%d7%99%d7%a4%d7%99%d7%9d-%d7%91%d7%9e%d7%a8%d7%9b%d7%96/%d7%a1%d7%a0%d7%99%d7%a3-%d7%a8%d7%a2%d7%a0%d7%a0%d7%94/',
    lastVerifiedAt: '2026-07-30',
  },

  // כפר יונה
  'manual-pazzaz-kfar-yona': {
    phone: '053-6112028',
    address: 'שד\' בגין 44, כפר יונה',
    openingHours: 'א\'-ה\' 12:00-23:00 | מוצ"ש עד 23:00',
    website: 'https://www.piza-pazzaz.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%9b%d7%a4%d7%a8-%d7%99%d7%95%d7%a0%d7%94/',
    lastVerifiedAt: '2026-07-30',
  },

  // נס ציונה
  'manual-pazzaz-nes-ziona': {
    phone: '077-6707407',
    address: 'נורדאו 3, נס ציונה',
    openingHours: 'א\'-ה\' 11:00-02:00 | מוצ"ש עד 02:00',
    website: 'https://www.piza-pazzaz.co.il/%d7%94%d7%a1%d7%a0%d7%99%d7%a4%d7%99%d7%9d-%d7%a9%d7%9c%d7%a0%d7%95/%d7%a1%d7%a0%d7%99%d7%a4%d7%99%d7%9d-%d7%91%d7%9e%d7%a8%d7%9b%d7%96/%d7%a1%d7%a0%d7%99%d7%a3-%d7%a0%d7%a1-%d7%a6%d7%99%d7%95%d7%a0%d7%94/',
    lastVerifiedAt: '2026-07-30',
  },

  // רחובות
  'manual-pazzaz-rehovot': {
    phone: '08-9585888',
    address: 'הרצל 171, רחובות',
    openingHours: 'א\'-ה\' 11:00-03:00 | ו\' 10:30-16:30 | מוצ"ש עד 03:00',
    website: 'https://www.piza-pazzaz.co.il/%d7%94%d7%a1%d7%a0%d7%99%d7%a4%d7%99%d7%9d-%d7%a9%d7%9c%d7%a0%d7%95/%d7%a1%d7%a0%d7%99%d7%a4%d7%99%d7%9d-%d7%91%d7%93%d7%a8%d7%95%d7%9d/%d7%a1%d7%a0%d7%99%d7%a3-%d7%a8%d7%97%d7%95%d7%91%d7%95%d7%aa/',
    lastVerifiedAt: '2026-07-30',
  },

  // דימונה - matches "סניף דימונה" (קניון פרץ סנטר) on official site
  'manual-pazzaz-dimona': {
    phone: '08-6570550',
    address: 'קניון פרץ סנטר, דימונה',
    openingHours: 'א\'-ה\' 09:30-22:00 | ו\' עד 15:00 | מוצ"ש עד 23:00',
    website: 'https://www.piza-pazzaz.co.il/%d7%94%d7%a1%d7%a0%d7%99%d7%a4%d7%99%d7%9d-%d7%a9%d7%9c%d7%a0%d7%95/%d7%a1%d7%a0%d7%99%d7%a4%d7%99%d7%9d-%d7%91%d7%93%d7%a8%d7%95%d7%9d/%d7%a1%d7%a0%d7%99%d7%a3-%d7%93%d7%99%d7%9e%d7%95%d7%a0%d7%94/',
    lastVerifiedAt: '2026-07-30',
  },

  // ירוחם
  'manual-pazzaz-yeruham': {
    phone: '08-6595522',
    address: 'צבי ברונשטיין 312/19, ירוחם',
    openingHours: 'א\'-ה\' 16:00-24:00 | מוצ"ש עד 01:00',
    website: 'https://www.piza-pazzaz.co.il/%d7%94%d7%a1%d7%a0%d7%99%d7%a4%d7%99%d7%9d-%d7%a9%d7%9c%d7%a0%d7%95/%d7%a1%d7%a0%d7%99%d7%a4%d7%99%d7%9d-%d7%91%d7%93%d7%a8%d7%95%d7%9d/%d7%a1%d7%a0%d7%99%d7%a3-%d7%99%d7%a8%d7%95%d7%97%d7%9d/',
    lastVerifiedAt: '2026-07-30',
  },
};

let updatedCount = 0;

for (const place of data) {
  const u = updates[place.id];
  if (!u) continue;

  if (u.phone !== undefined) place.phone = u.phone;
  if (u.address !== undefined) place.address = u.address;
  if (u.openingHours !== undefined) place.openingHours = u.openingHours;
  if (u.website !== undefined) place.website = u.website;
  if (u.kosherType !== undefined) place.kosherType = u.kosherType;
  if (u.lastVerifiedAt !== undefined) place.lastVerifiedAt = u.lastVerifiedAt;

  updatedCount++;
  console.log(`✓ ${place.id} — ${place.name} (${place.cityId})`);
}

fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
console.log(`\nDone — updated ${updatedCount} Pazzaz records.`);
