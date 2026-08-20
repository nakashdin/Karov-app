import { readFileSync, writeFileSync } from 'fs';

const DATA_PATH = 'C:\\Users\\User\\Desktop\\claude plane\\kosher-app\\src\\data\\generated\\places.osm.json';
const raw = readFileSync(DATA_PATH, 'utf-8').replace(/^\uFEFF/, '');
let places = JSON.parse(raw);

// Complete data scraped from official site https://www.iburgerim.co.il/branch/
// Format: id → { phone, openingHours, address (corrected if needed) }
const BURGERIM_DATA = {
  // ---- OSM / manual originals (by old IDs) ----
  'osm-node-2069701110': {
    phone: '09-8992882',
    openingHours: "א'-ה' 10:30-23:00 | ו' 10:30-15:00",
    address: 'משכית 32, הרצליה',
  },
  'osm-node-5221319346': {
    phone: '04-6802616',
    openingHours: "א'-ה' 11:30-22:30 | מוצ\"ש חצי שעה מצאת שבת-חצות",
    address: 'אזור תעשיה דרומי, מתחם ONE, קרית שמונה',
  },
  'osm-node-8142743152': {
    phone: '09-8344944',
    openingHours: "א'-ד' 11:00-23:30 | ה' 11:00-24:00 | ו' 11:00-14:30 | מוצ\"ש חצי שעה מצאת שבת-24:00",
    address: 'דרך הרכבת 14, נתניה',
  },
  'osm-node-11405068715': {
    phone: '077-3433035',
    openingHours: "א'-ה' 10:30-22:30",
    address: 'קרליבך 25, תל אביב',
  },
  'osm-node-12698940709': {
    phone: '03-5072979',
    openingHours: "א'-ה' 11:00-23:00 | מוצ\"ש חצי שעה מצאת שבת-23:30",
    address: 'עמק איילון 161, שוהם',
  },
  'manual-misadat-burgerim-gedera': {
    phone: '08-6515515',
    openingHours: "א'-ה' 11:00-23:00 | מוצ\"ש חצי שעה מצאת שבת-23:00",
    address: 'הבילויים 22, גדרה',
  },
  'manual-burgerim-givat-shmuel': {
    phone: '03-7705656',
    openingHours: "א'-ג' 11:00-22:30 | ד'-ה' 11:00-23:00 | ו' 11:00-14:30 | מוצ\"ש חצי שעה מצאת שבת-23:00",
    address: 'מנחם בגין 38, מרכז רוגובין, גבעת שמואל',
  },
  // ---- New branches (by burgerim-* IDs) ----
  'burgerim-אופקים': {
    phone: '08-6697979',
    openingHours: "א'-ד' 11:00-23:30 | ה' 11:00-24:00 | ו' סגור | מוצ\"ש חצי שעה מצאת שבת-24:00",
    address: 'יהדות אפריקה 14, אופקים',
  },
  'burgerim-אילת': {
    phone: '08-6694343',
    openingHours: "א'-ה' 11:00-02:00 | ו' 11:00-16:00 | מוצ\"ש 20:00-02:00",
    address: 'שדרות התמרים 2, אילת',
  },
  'burgerim-אשדוד': {
    phone: '08-6639888',
    openingHours: "א'-ד' 10:30-23:00 | ה' 10:30-23:30 | ו' 10:30-14:30 | מוצ\"ש חצי שעה מצאת שבת-23:30",
    address: 'תש"ח 7, אשדוד',
  },
  'burgerim-אשקלון': {
    phone: '08-9109499',
    openingHours: "א'-ה' 11:00-23:00 | מוצ\"ש חצי שעה מצאת שבת-23:30",
    address: 'אלי כהן 21, אשקלון',
  },
  'burgerim-באר-שבע-רמות': {
    phone: '08-6819977',
    openingHours: "א'-ה' 11:00-24:00 | מוצ\"ש חצי שעה מצאת שבת-24:00",
    address: 'הדעת 6, באר שבע',
  },
  'burgerim-באר-שבע-עיר-עתיקה': {
    phone: '08-6489994',
    openingHours: "א'-ד' 11:00-00:00 | ה' 11:00-01:00 | ו' סגור | מוצ\"ש חצי שעה מצאת שבת-01:00",
    address: 'בית האשל 21, באר שבע',
  },
  'burgerim-בית-שאן': {
    phone: '04-6133070',
    openingHours: "א'-ד' 11:00-23:00 | ה' 11:00-00:00 | ו' סגור | מוצ\"ש חצי שעה מצאת שבת-24:00",
    address: 'שאול המלך 71, בית שאן',
  },
  'burgerim-בני-ברק': {
    phone: '03-5378823',
    openingHours: "א'-ה' 11:30-23:00 | מוצ\"ש חצי שעה מצאת שבת-23:00",
    address: 'מצדה 9, בני ברק',
  },
  'burgerim-חדרה': {
    phone: '04-8111997',
    openingHours: "א'-ה' 11:00-23:00 | מוצ\"ש חצי שעה מצאת שבת-23:30",
    address: 'הלל יפה 11, חדרה',
  },
  'burgerim-חיפה-רמת-הנשיא': {
    phone: '04-6262266',
    openingHours: "א'-ה' 11:00-22:00 | ו' 11:00-14:30 | מוצ\"ש חצי שעה מצאת שבת-23:00",
    address: 'אלמוג 20, רמת הנשיא, חיפה',
  },
  'burgerim-טבריה': {
    phone: '04-6540150',
    openingHours: "א'-ה' 11:00-23:00 | מוצ\"ש חצי שעה מצאת שבת-23:00",
    address: 'יהודה הלוי 4, טבריה',
  },
  'burgerim-טירת-הכרמל': {
    phone: '04-6579988',
    openingHours: "א'-ה' 11:30-23:30 | ו' 11:30-14:30 | מוצ\"ש חצי שעה מצאת שבת-23:30",
    address: 'מלחמת ששת הימים 1, טירת הכרמל',
  },
  'burgerim-יבנה': {
    phone: '08-8663330',
    openingHours: "א'-ה' 11:30-23:00 | מוצ\"ש חצי שעה מצאת שבת-23:00",
    address: 'עולש 2, יבנה',
  },
  'burgerim-כפר-סבא': {
    phone: '09-7677660',
    openingHours: "א'-ד' 11:00-23:00 | ה' 11:00-24:00 | מוצ\"ש חצי שעה מצאת שבת-24:00",
    address: 'המנופים 2, כפר סבא',
  },
  'burgerim-כרמיאל': {
    phone: '04-6888866',
    openingHours: "א'-ה' 11:00-23:00 | ו' 11:00-15:00 | מוצ\"ש חצי שעה מצאת שבת-23:00",
    address: 'מורד הגיא 100, כרמיאל',
  },
  'burgerim-לוד': {
    phone: '08-9224145',
    openingHours: "א'-ה' 10:00-24:00 | מוצ\"ש חצי שעה מצאת שבת-24:00",
    address: 'דוד המלך 17, לוד',
  },
  'burgerim-מודיעין': {
    phone: '08-6226265',
    openingHours: "א'-ה' 11:00-22:00 | מוצ\"ש חצי שעה מצאת שבת-23:00",
    address: 'עמק זבולון 24, קייזר סנטר, מודיעין',
  },
  'burgerim-מזכרת-בתיה': {
    phone: '08-6722058',
    openingHours: "א'-ה' 11:00-23:30 | ו' 11:00-14:30 | מוצ\"ש חצי שעה מצאת שבת-23:30",
    address: 'מנחם בגין 2, מזכרת בתיה',
  },
  'burgerim-מעלה-אדומים': {
    phone: '077-5055123',
    openingHours: "א'-ה' 12:00-21:00 | מוצ\"ש חצי שעה מצאת שבת-23:00",
    address: 'האלמוג 31, מעלה אדומים',
  },
  'burgerim-נהריה': {
    phone: '077-4345360',
    openingHours: "א'-ה' 11:00-23:00 | ו' 11:00-14:30 | מוצ\"ש חצי שעה מצאת שבת-23:00",
    address: 'ויצמן 63, נהריה',
  },
  'burgerim-נוף-הגליל': {
    phone: '04-8844144',
    openingHours: "א'-ה' 11:00-23:00 | ו' 11:00-15:00 | מוצ\"ש 18:00-23:00",
    address: 'הגלבוע 1, מתחם מול הרים, נוף הגליל',
  },
  'burgerim-נתניה-אגמים': {
    phone: '09-8808168',
    openingHours: "א'-ד' 11:00-23:30 | ה' 11:00-24:00 | ו' 11:00-15:00 | מוצ\"ש חצי שעה מצאת שבת-24:00",
    address: 'אגם כנרת 6, נתניה',
  },
  'burgerim-עינת': {
    phone: '03-7589217',
    openingHours: "א'-ד' 11:00-23:00 | ה' 11:00-24:00 | מוצ\"ש חצי שעה מצאת שבת-24:00",
    address: 'תחנת הדלק, עינת',
  },
  'burgerim-עכו': {
    phone: '04-6649333',
    openingHours: "א'-ג' 11:00-23:00 | ד'-ה' 11:00-24:00 | ו' 11:00-15:00 | מוצ\"ש חצי שעה מצאת שבת-24:00",
    address: 'החרושת 3, קניון עזריאלי, עכו',
  },
  'burgerim-עלי-זהב-לשם': {
    phone: '03-6249050',
    openingHours: "א'-ה' 12:00-21:30",
    address: 'בכניסה ליישוב לשם',
  },
  'burgerim-עפולה': {
    phone: '04-6404413',
    openingHours: "א'-ה' 11:30-23:00 | מוצ\"ש חצי שעה מצאת שבת-23:00",
    address: 'מנחם בגין 8, עפולה',
  },
  'burgerim-צופים': {
    phone: '09-8621014',
    openingHours: "א'-ה' 11:00-23:00 | מוצ\"ש חצי שעה מצאת שבת-23:00",
    address: 'ערבי נחל 508, מרכז מסחרי, צופים',
  },
  'burgerim-קיסריה': {
    phone: '04-8411161',
    openingHours: "א'-ה' 11:00-23:00 | מוצ\"ש חצי שעה מצאת שבת-23:00",
    address: 'הרקיע 1, קיסריה',
  },
  'burgerim-קצרין': {
    phone: '04-6376654',
    openingHours: "א'-ה' 11:00-23:00 | מוצ\"ש חצי שעה מצאת שבת-23:00",
    address: 'דליות 2, מתחם איתן, קצרין',
  },
  'burgerim-קריית-מלאכי': {
    phone: '08-9930609',
    openingHours: "א'-ד' 11:00-23:30 | ה' 11:00-00:00 | מוצ\"ש חצי שעה מצאת שבת-00:00",
    address: 'אסיף 1, קרית מלאכי',
  },
  'burgerim-קרית-אתא': {
    phone: '04-6444324',
    openingHours: "א'-ד' 11:00-23:30 | ה' 11:00-24:00 | מוצ\"ש חצי שעה מצאת שבת-24:00",
    address: 'הנביאים 1, קרית אתא',
  },
  'burgerim-קרית-גת': {
    phone: '08-8600609',
    openingHours: "א'-ה' 11:00-23:00 | מוצ\"ש חצי שעה מצאת שבת-23:00",
    address: 'שדרות מלכי ישראל 178, ישפרו סנטר, קרית גת',
  },
  'burgerim-ראשון-לציון-מרכז': {
    phone: '03-5362828',
    openingHours: "א'-ד' 11:00-22:30 | ה' 11:00-23:30 | מוצ\"ש חצי שעה מצאת שבת-23:30",
    address: 'שמוטקין 10, ראשון לציון',
  },
  'burgerim-ראשון-לציון-קניון-הזהב': {
    phone: '03-6128226',
    openingHours: "א'-ה' 12:00-22:00 | ו' 12:00-14:00 | מוצ\"ש חצי שעה מצאת שבת-23:00",
    address: 'קניון הזהב, ראשון לציון',
  },
  'burgerim-רחובות': {
    phone: '08-9165558',
    openingHours: "א'-ה' 11:00-23:00 | ו' 11:00-14:30 | מוצ\"ש חצי שעה מצאת שבת-23:30",
    address: 'מוטי קינד 10, רחובות',
  },
  'burgerim-שדרות': {
    phone: '08-9243555',
    openingHours: "א'-ה' 11:00-23:00 | ו' 11:00-15:30 | מוצ\"ש חצי שעה מצאת שבת-24:00",
    address: 'מתחם מול 7, שדרות',
  },
  'burgerim-תל-אביב-רמת-אביב': {
    phone: '03-6769717',
    openingHours: "א'-ה' 11:00-23:00",
    address: "ג'ורג' וייז 20, תל אביב",
  },
};

let updated = 0;
places = places.map(p => {
  const upd = BURGERIM_DATA[p.id];
  if (!upd) return p;
  updated++;
  return {
    ...p,
    phone: upd.phone,
    openingHours: upd.openingHours,
    address: upd.address || p.address,
    lastVerifiedAt: '2026-07-30',
  };
});

writeFileSync(DATA_PATH, JSON.stringify(places, null, 2), 'utf-8');

const total = places.filter(p => p.name?.includes('בורגרים')).length;
const withPhone = places.filter(p => p.name?.includes('בורגרים') && p.phone).length;
const withHours = places.filter(p => p.name?.includes('בורגרים') && p.openingHours).length;

console.log(`✏️  עודכנו ${updated} רשומות בורגרים`);
console.log(`📊 טלפון: ${withPhone}/${total} | שעות: ${withHours}/${total}`);
console.log(`📊 סה"כ רשומות: ${places.length}`);
