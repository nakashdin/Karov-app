import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dir, '..');
const DATA_PATH = path.join(ROOT, 'src/data/generated/places.osm.json');
const raw = readFileSync(DATA_PATH, 'utf-8').replace(/^\uFEFF/, '');
let places = JSON.parse(raw);

// IDs to delete (יהוד — not on official site)
const DELETE_IDS = new Set(['manual-burgerim-yehud']);

// Updates for existing OSM/manual records — correct addresses + kosherType from official site
const UPDATES = {
  'osm-node-2069701110': {
    name: 'בורגרים הרצליה פיתוח',
    address: 'משכית 32, הרצליה',
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"ץ בית יוסף',
  },
  'osm-node-5221319346': {
    name: 'בורגרים קריית שמונה',
    address: 'אזור תעשיה דרומי, מתחם ONE, קריית שמונה',
    kosherType: 'mehadrin',
    certifiedBy: undefined,
  },
  'osm-node-8142743152': {
    name: 'בורגרים נתניה סונול',
    address: 'דרך הרכבת 14, נתניה',
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"ץ בית יוסף',
  },
  'osm-node-11405068715': {
    name: 'בורגרים תל אביב קרליבך',
    address: 'קרליבך 25, תל אביב',
    kosherType: 'kosher',
    certifiedBy: undefined,
  },
  'osm-node-12698940709': {
    name: 'בורגרים שוהם',
    address: 'עמק איילון 161, שוהם',
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"ץ בית יוסף',
  },
  'manual-misadat-burgerim-gedera': {
    name: 'בורגרים גדרה',
    address: 'הבילויים 22, גדרה',
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"ץ בית יוסף',
  },
  'manual-burgerim-givat-shmuel': {
    name: 'בורגרים גבעת שמואל',
    address: 'מנחם בגין 38, מרכז רוגובין, גבעת שמואל',
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"ץ בית יוסף',
  },
};

// New branches from official site https://www.iburgerim.co.il/branch/
// Skipped: דליית אל כרמל (משחקיה), נצרת (no kosher), שדה תעופה רמון (no kosher)
const NEW_BRANCHES = [
  {
    id: 'burgerim-אופקים',
    name: 'בורגרים אופקים',
    address: 'יהדות אפריקה 14, אופקים',
    location: { latitude: 31.2046, longitude: 34.6350 },
    kosherType: 'rabanut_mekomi',
  },
  {
    id: 'burgerim-אילת',
    name: 'בורגרים אילת',
    address: 'שדרות התמרים 2, אילת',
    location: { latitude: 29.5577, longitude: 34.9519 },
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"ץ בית יוסף',
  },
  {
    id: 'burgerim-אשדוד',
    name: 'בורגרים אשדוד',
    address: 'רחוב תש"ח 7, אשדוד',
    location: { latitude: 31.8015, longitude: 34.6556 },
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"ץ בית יוסף',
  },
  {
    id: 'burgerim-אשקלון',
    name: 'בורגרים אשקלון',
    address: 'אלי כהן 21, אשקלון',
    location: { latitude: 31.6659, longitude: 34.5733 },
    kosherType: 'rabanut_mekomi',
  },
  {
    id: 'burgerim-באר-שבע-רמות',
    name: 'בורגרים באר שבע רמות',
    address: 'הדעת 6, באר שבע',
    location: { latitude: 31.2521, longitude: 34.7902 },
    kosherType: 'rabanut',
  },
  {
    id: 'burgerim-באר-שבע-עיר-עתיקה',
    name: 'בורגרים באר שבע העיר העתיקה',
    address: 'בית האשל 21, באר שבע',
    location: { latitude: 31.2424, longitude: 34.7925 },
    kosherType: 'kosher',
  },
  {
    id: 'burgerim-בית-שאן',
    name: 'בורגרים בית שאן',
    address: 'שאול המלך 71, בית שאן',
    location: { latitude: 32.4965, longitude: 35.4979 },
    kosherType: 'mehadrin',
  },
  {
    id: 'burgerim-בני-ברק',
    name: 'בורגרים בני ברק',
    address: 'מצדה 9, בני ברק',
    location: { latitude: 32.0833, longitude: 34.8334 },
    kosherType: 'kosher',
  },
  {
    id: 'burgerim-חדרה',
    name: 'בורגרים חדרה',
    address: 'הלל יפה 11, חדרה',
    location: { latitude: 32.4406, longitude: 34.9190 },
    kosherType: 'rabanut_mekomi',
  },
  {
    id: 'burgerim-חיפה-רמת-הנשיא',
    name: 'בורגרים חיפה רמת הנשיא',
    address: 'אלמוג 20, רמת הנשיא, חיפה',
    location: { latitude: 32.7804, longitude: 34.9700 },
    kosherType: 'kosher',
  },
  {
    id: 'burgerim-טבריה',
    name: 'בורגרים טבריה',
    address: 'יהודה הלוי 4, טבריה',
    location: { latitude: 32.7940, longitude: 35.5318 },
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"ץ בית יוסף',
  },
  {
    id: 'burgerim-טירת-הכרמל',
    name: 'בורגרים טירת הכרמל',
    address: 'מלחמת ששת הימים 1, טירת הכרמל',
    location: { latitude: 32.7604, longitude: 34.9687 },
    kosherType: 'rabanut_mekomi',
  },
  {
    id: 'burgerim-יבנה',
    name: 'בורגרים יבנה',
    address: 'עולש 2, היכל התרבות יבנה',
    location: { latitude: 31.8760, longitude: 34.7457 },
    kosherType: 'kosher',
  },
  {
    id: 'burgerim-כפר-סבא',
    name: 'בורגרים כפר סבא מרכז G',
    address: 'המנופים 2, כפר סבא',
    location: { latitude: 32.1741, longitude: 34.9125 },
    kosherType: 'rabanut_mekomi',
  },
  {
    id: 'burgerim-כרמיאל',
    name: 'בורגרים כרמיאל',
    address: 'מורד הגיא 100, כרמיאל',
    location: { latitude: 32.9132, longitude: 35.2919 },
    kosherType: 'kosher',
  },
  {
    id: 'burgerim-לוד',
    name: 'בורגרים לוד',
    address: 'דוד המלך 17, לוד',
    location: { latitude: 31.9517, longitude: 34.8937 },
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"ץ בית יוסף',
  },
  {
    id: 'burgerim-מודיעין',
    name: 'בורגרים מודיעין קייזר סנטר',
    address: 'עמק זבולון 24, קייזר סנטר, מודיעין',
    location: { latitude: 31.8967, longitude: 35.0101 },
    kosherType: 'rabanut_mekomi',
  },
  {
    id: 'burgerim-מזכרת-בתיה',
    name: 'בורגרים מזכרת בתיה',
    address: 'מנחם בגין 2, מזכרת בתיה',
    location: { latitude: 31.8567, longitude: 34.8364 },
    kosherType: 'kosher',
  },
  {
    id: 'burgerim-מעלה-אדומים',
    name: 'בורגרים מעלה אדומים',
    address: 'האלמוג 31, מעלה אדומים',
    location: { latitude: 31.7721, longitude: 35.2950 },
    kosherType: 'mehadrin',
  },
  {
    id: 'burgerim-נהריה',
    name: 'בורגרים נהריה',
    address: 'ויצמן 63, נהריה',
    location: { latitude: 33.0060, longitude: 35.0939 },
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"ץ בית יוסף',
  },
  {
    id: 'burgerim-נוף-הגליל',
    name: 'בורגרים נוף הגליל',
    address: 'הגלבוע 1, מתחם מול הרים, נוף הגליל',
    location: { latitude: 32.6993, longitude: 35.3130 },
    kosherType: 'rabanut_mekomi',
  },
  {
    id: 'burgerim-נתניה-אגמים',
    name: 'בורגרים נתניה אגמים',
    address: 'אגם כנרת 6, נתניה',
    location: { latitude: 32.3214, longitude: 34.8655 },
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"ץ בית יוסף',
  },
  {
    id: 'burgerim-עינת',
    name: 'בורגרים עינת',
    address: 'תחנת הדלק, עינת',
    location: { latitude: 32.0322, longitude: 34.9594 },
    kosherType: 'rabanut_mekomi',
  },
  {
    id: 'burgerim-עכו',
    name: 'בורגרים עכו',
    address: 'החרושת 3, קניון עזריאלי, עכו',
    location: { latitude: 32.9258, longitude: 35.0766 },
    kosherType: 'kosher',
  },
  {
    id: 'burgerim-עלי-זהב-לשם',
    name: 'בורגרים עלי זהב לשם',
    address: 'בכניסה ליישוב לשם',
    location: { latitude: 32.0597, longitude: 34.9700 },
    kosherType: 'kosher',
  },
  {
    id: 'burgerim-עפולה',
    name: 'בורגרים עפולה',
    address: 'מנחם בגין 8, עפולה',
    location: { latitude: 32.6075, longitude: 35.2892 },
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"ץ בית יוסף',
  },
  {
    id: 'burgerim-צופים',
    name: 'בורגרים צופים',
    address: 'ערבי נחל 508, מרכז מסחרי, צופים',
    location: { latitude: 32.1150, longitude: 35.1530 },
    kosherType: 'rabanut_mehadrin',
  },
  {
    id: 'burgerim-קיסריה',
    name: 'בורגרים קיסריה',
    address: 'הרקיע 1, קיסריה',
    location: { latitude: 32.5003, longitude: 34.9019 },
    kosherType: 'rabanut',
  },
  {
    id: 'burgerim-קצרין',
    name: 'בורגרים קצרין',
    address: 'דליות 2, מתחם איתן, קצרין',
    location: { latitude: 32.9913, longitude: 35.6932 },
    kosherType: 'mehadrin',
  },
  {
    id: 'burgerim-קריית-מלאכי',
    name: 'בורגרים קריית מלאכי',
    address: 'אסיף 1, קרית מלאכי',
    location: { latitude: 31.7310, longitude: 34.7434 },
    kosherType: 'kosher',
  },
  {
    id: 'burgerim-קרית-אתא',
    name: 'בורגרים קרית אתא',
    address: 'הנביאים 1, קרית אתא',
    location: { latitude: 32.8010, longitude: 35.1100 },
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"ץ בית יוסף',
  },
  {
    id: 'burgerim-קרית-גת',
    name: 'בורגרים קרית גת',
    address: 'שדרות מלכי ישראל 178, ישפרו סנטר, קרית גת',
    location: { latitude: 31.6104, longitude: 34.7714 },
    kosherType: 'rabanut_mekomi',
  },
  {
    id: 'burgerim-ראשון-לציון-מרכז',
    name: 'בורגרים ראשון לציון מרכז',
    address: 'שמוטקין 10, ראשון לציון',
    location: { latitude: 31.9623, longitude: 34.7987 },
    kosherType: 'rabanut',
  },
  {
    id: 'burgerim-ראשון-לציון-קניון-הזהב',
    name: 'בורגרים ראשון לציון קניון הזהב',
    address: 'קניון הזהב, ראשון לציון',
    location: { latitude: 31.9738, longitude: 34.7870 },
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"ץ בית יוסף',
  },
  {
    id: 'burgerim-רחובות',
    name: 'בורגרים רחובות',
    address: 'מוטי קינד 10, רחובות',
    location: { latitude: 31.8964, longitude: 34.8086 },
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"ץ בית יוסף',
  },
  {
    id: 'burgerim-שדרות',
    name: 'בורגרים שדרות',
    address: 'מתחם מול 7, שדרות',
    location: { latitude: 31.5234, longitude: 34.5957 },
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"ץ בית יוסף',
  },
  {
    id: 'burgerim-תל-אביב-רמת-אביב',
    name: 'בורגרים תל אביב רמת אביב',
    address: "ג'ורג' וייז 20, תל אביב",
    location: { latitude: 32.1130, longitude: 34.8038 },
    kosherType: 'kosher',
  },
];

const WEBSITE = 'https://www.iburgerim.co.il/';

// 1. Delete יהוד
const before = places.length;
places = places.filter(p => !DELETE_IDS.has(p.id));
console.log(`🗑  נמחקו ${before - places.length} רשומות (יהוד — לא באתר הרשמי)`);

// 2. Update existing records
let updatedCount = 0;
places = places.map(p => {
  const upd = UPDATES[p.id];
  if (!upd) return p;
  updatedCount++;
  return {
    ...p,
    ...upd,
    website: WEBSITE,
    lastVerifiedAt: '2026-07-30',
  };
});
console.log(`✏️  עודכנו ${updatedCount} רשומות קיימות`);

// 3. Add new branches
for (const branch of NEW_BRANCHES) {
  const exists = places.some(p => p.id === branch.id);
  if (exists) continue;
  places.push({
    ...branch,
    type: 'fast_food',
    category: 'meat',
    website: WEBSITE,
    source: 'manual',
    locationPrecision: 'address',
    lastVerifiedAt: '2026-07-30',
  });
}
const newCount = NEW_BRANCHES.length;
console.log(`✅ נוספו ${newCount} סניפים חדשים`);

writeFileSync(DATA_PATH, JSON.stringify(places, null, 2), 'utf-8');

const total = places.filter(p => p.name?.includes('בורגרים')).length;
console.log(`📊 סה"כ בורגרים בDB: ${total}`);
console.log(`📊 סה"כ רשומות: ${places.length}`);
