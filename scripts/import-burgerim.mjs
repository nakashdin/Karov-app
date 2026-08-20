/**
 * Import / update all kosher iburgerim.co.il branches.
 * - Updates 5 existing OSM entries: correct website, menu, hours, kashrut, address
 * - Adds 39 new kosher branches
 * Source: https://www.iburgerim.co.il/branch/ (scraped 2026-07-23)
 * Run: node scripts/import-burgerim.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../src/data/generated/restaurants.osm.json');

const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);
function readNoBom(p) {
  const buf = readFileSync(p);
  const s = (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) ? buf.slice(3) : buf;
  return JSON.parse(s.toString('utf8'));
}
function writeWithBom(p, data) {
  writeFileSync(p, Buffer.concat([BOM, Buffer.from(JSON.stringify(data, null, 2), 'utf8')]));
}

const MENU     = 'https://www.iburgerim.co.il/תפריטים/';
const FACEBOOK = 'https://www.facebook.com/burgerimisrael';
const INSTAGRAM = 'https://www.instagram.com/burgerimisrael';
const branchUrl = (slug) => `https://www.iburgerim.co.il/branch/${slug}/`;

// ── Updates for 5 existing OSM entries ──────────────────────────────────────
const EXISTING_UPDATES = {
  'osm-node-2069701110': {   // הרצליה פיתוח — משכית 32
    website:      branchUrl('הרצליה-פיתוח'),
    menu:         MENU,
    address:      'משכית 32, הרצליה',
    cityId:       'הרצליה',
    phone:        '09-8992882',
    openingHours: 'Su-Th 10:30-23:00; Fr 10:30-15:00',
    kosherType:   'badatz_beit_yosef',
    certifiedBy:  'בד"צ בית יוסף',
    facebook:     FACEBOOK,
    instagram:    INSTAGRAM,
  },
  'osm-node-5221319346': {   // קרית שמונה — מתחם ONE
    website:      branchUrl('קרית-שמונה'),
    menu:         MENU,
    address:      'אזור תעשיה דרומי, מתחם ONE, קרית שמונה',
    cityId:       'קרית שמונה',
    phone:        '04-6802616',
    openingHours: 'Su-Th 11:30-22:30; Sa 21:00-24:00',
    kosherType:   'mehadrin',
    certifiedBy:  'כשר למהדרין',
    facebook:     FACEBOOK,
    instagram:    INSTAGRAM,
  },
  'osm-node-8142743152': {   // נתניה סונול — דרך הרכבת 14
    website:      branchUrl('נתניה-סונול'),
    menu:         MENU,
    openingHours: 'Su-We 11:00-23:30; Th 11:00-24:00; Fr 11:00-14:30; Sa 21:00-24:00',
    kosherType:   'badatz_beit_yosef',
    certifiedBy:  'בד"צ בית יוסף',
    facebook:     FACEBOOK,
    instagram:    INSTAGRAM,
  },
  'osm-node-11405068715': {  // תל אביב קרליבך
    website:      branchUrl('תל-אביב-קרליבך'),
    menu:         MENU,
    address:      'קרליבך 25, תל אביב',
    cityId:       'תל אביב',
    phone:        '077-3433035',
    openingHours: 'Su-Th 10:30-22:30',
    kosherType:   'kosher',
    certifiedBy:  'כשר',
    facebook:     FACEBOOK,
    instagram:    INSTAGRAM,
  },
  'osm-node-12698940709': {  // שוהם — עמק איילון 161
    website:      branchUrl('שוהם'),
    menu:         MENU,
    openingHours: 'Su-Th 11:00-23:00; Sa 21:00-23:30',
    kosherType:   'badatz_beit_yosef',
    certifiedBy:  'בד"צ בית יוסף',
    facebook:     FACEBOOK,
    instagram:    INSTAGRAM,
  },
};

// ── 39 new kosher branches ───────────────────────────────────────────────────
const NEW_BRANCHES = [
  {
    id: 'burgerim-ofakim',
    address: 'יהדות אפריקה 14, אופקים',
    cityId: 'אופקים',
    phone: '08-6697979',
    openingHours: 'Su-We 11:00-23:30; Th 11:00-24:00; Sa 21:00-24:00',
    website: branchUrl('אופקים'),
    kosherType: 'rabanut_mekomi',
    certifiedBy: 'רבנות מקומית',
    location: { latitude: 31.3118, longitude: 34.6226 },
  },
  {
    id: 'burgerim-eilat',
    address: 'שדרות התמרים 2, אילת',
    cityId: 'אילת',
    phone: '08-6694343',
    openingHours: 'Su-Th 11:00-02:00; Fr 11:00-16:00; Sa 20:00-02:00',
    website: branchUrl('אילת-2'),
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"צ בית יוסף',
    location: { latitude: 29.5581, longitude: 34.9482 },
  },
  {
    id: 'burgerim-ashdod',
    address: 'תש"ח 7, אשדוד',
    cityId: 'אשדוד',
    phone: '08-6639888',
    openingHours: 'Su-We 10:30-23:00; Th 10:30-23:30; Fr 10:30-14:30; Sa 21:00-23:30',
    website: branchUrl('אשדוד'),
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"צ בית יוסף',
    location: { latitude: 31.8040, longitude: 34.6553 },
  },
  {
    id: 'burgerim-ashkelon',
    address: 'אלי כהן 21, אשקלון',
    cityId: 'אשקלון',
    phone: '08-9109499',
    openingHours: 'Su-Th 11:00-23:00; Sa 21:00-23:30',
    website: branchUrl('אשקלון'),
    kosherType: 'rabanut_mekomi',
    certifiedBy: 'רבנות מקומית',
    location: { latitude: 31.6688, longitude: 34.5742 },
  },
  {
    id: 'burgerim-beersheva-ramot',
    address: 'הדעת 6, באר שבע',
    cityId: 'באר שבע',
    phone: '08-6819977',
    openingHours: 'Su-Th 11:00-24:00; Sa 21:00-24:00',
    website: branchUrl('באר-שבע-רמות'),
    kosherType: 'rabanut_mekomi',
    certifiedBy: 'רבנות מקומית',
    location: { latitude: 31.2518, longitude: 34.7913 },
  },
  {
    id: 'burgerim-beersheva-old',
    address: 'בית האשל 21, באר שבע',
    cityId: 'באר שבע',
    phone: '08-6489994',
    openingHours: 'Su-We 11:00-24:00; Th 11:00-01:00; Sa 21:00-01:00',
    website: branchUrl('בש-העיר-העתיקה'),
    kosherType: 'rabanut',
    certifiedBy: 'כשר בשר חלק',
    location: { latitude: 31.2440, longitude: 34.7996 },
  },
  {
    id: 'burgerim-beit-shean',
    address: 'שאול המלך 71, בית שאן',
    cityId: 'בית שאן',
    phone: '04-6133070',
    openingHours: 'Su-We 11:00-23:00; Th 11:00-24:00; Sa 21:00-24:00',
    website: branchUrl('בית-שאן'),
    kosherType: 'mehadrin',
    certifiedBy: 'כשר למהדרין',
    location: { latitude: 32.5029, longitude: 35.5013 },
  },
  {
    id: 'burgerim-bnei-brak',
    address: 'מצדה 9, בני ברק',
    cityId: 'בני ברק',
    phone: '03-5378823',
    openingHours: 'Su-Th 11:30-23:00; Sa 21:00-23:00',
    website: branchUrl('בני-ברק-בסר'),
    kosherType: 'rabanut',
    certifiedBy: 'כשר בשר חלק',
    location: { latitude: 32.0840, longitude: 34.8340 },
  },
  {
    id: 'burgerim-givat-shmuel',
    address: 'מנחם בגין 38, מרכז רוגובין, גבעת שמואל',
    cityId: 'גבעת שמואל',
    phone: '03-7705656',
    openingHours: 'Su-Tu 11:00-22:30; We-Th 11:00-23:00; Fr 11:00-14:30; Sa 21:00-23:00',
    website: branchUrl('גבעת-שמואל'),
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"צ בית יוסף',
    location: { latitude: 32.0782, longitude: 34.8458 },
  },
  {
    id: 'burgerim-gadera',
    address: 'הבילויים 22, גדרה',
    cityId: 'גדרה',
    phone: '08-6515515',
    openingHours: 'Su-Th 11:00-23:00; Sa 21:00-23:00',
    website: branchUrl('גדרה'),
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"צ בית יוסף',
    location: { latitude: 31.8120, longitude: 34.7760 },
  },
  {
    id: 'burgerim-hadera',
    address: 'הלל יפה 11, חדרה',
    cityId: 'חדרה',
    phone: '04-8111997',
    openingHours: 'Su-Th 11:00-23:00; Sa 21:00-23:30',
    website: branchUrl('חדרה'),
    kosherType: 'rabanut_mekomi',
    certifiedBy: 'רבנות מקומית',
    location: { latitude: 32.4340, longitude: 34.9187 },
  },
  {
    id: 'burgerim-haifa',
    address: 'אלמוג 20, רמת הנשיא, חיפה',
    cityId: 'חיפה',
    phone: '04-6262266',
    openingHours: 'Su-Th 11:00-22:00; Fr 11:00-14:30; Sa 21:00-23:00',
    website: branchUrl('חיפה-רמת-הנשיא'),
    kosherType: 'rabanut',
    certifiedBy: 'כשר בשר חלק',
    location: { latitude: 32.7940, longitude: 34.9896 },
  },
  {
    id: 'burgerim-tiberias',
    address: 'יהודה הלוי 4, טבריה',
    cityId: 'טבריה',
    phone: '04-6540150',
    openingHours: 'Su-Th 11:00-23:00; Sa 21:00-23:00',
    website: branchUrl('טבריה'),
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"צ בית יוסף',
    location: { latitude: 32.7922, longitude: 35.5312 },
  },
  {
    id: 'burgerim-tirat-carmel',
    address: 'מלחמת ששת הימים 1, טירת הכרמל',
    cityId: 'טירת הכרמל',
    phone: '04-6579988',
    openingHours: 'Su-Th 11:30-23:30; Fr 11:30-14:30; Sa 21:00-23:30',
    website: branchUrl('טירת-הכרמל'),
    kosherType: 'rabanut_mekomi',
    certifiedBy: 'רבנות מקומית',
    location: { latitude: 32.7617, longitude: 34.9641 },
  },
  {
    id: 'burgerim-yavne',
    address: 'עולש 2, היכל התרבות יבנה',
    cityId: 'יבנה',
    phone: '08-8663330',
    openingHours: 'Su-Th 11:30-23:00; Sa 21:00-23:00',
    website: branchUrl('יבנה'),
    kosherType: 'kosher',
    certifiedBy: 'כשר',
    location: { latitude: 31.8760, longitude: 34.7445 },
  },
  {
    id: 'burgerim-kfar-saba',
    address: 'המנופים 2, כפר סבא',
    cityId: 'כפר סבא',
    phone: '09-7677660',
    openingHours: 'Su-We 11:00-23:00; Th 11:00-24:00; Sa 21:00-24:00',
    website: branchUrl('כפר-סבא-מרכז-g'),
    kosherType: 'rabanut_mekomi',
    certifiedBy: 'רבנות מקומית',
    location: { latitude: 32.1781, longitude: 34.9075 },
  },
  {
    id: 'burgerim-karmiel',
    address: 'מורד הגיא 100, כרמיאל',
    cityId: 'כרמיאל',
    phone: '04-6888866',
    openingHours: 'Su-Th 11:00-23:00; Fr 11:00-15:00; Sa 21:00-23:00',
    website: branchUrl('כרמיאל'),
    kosherType: 'rabanut',
    certifiedBy: 'כשר בשר חלק',
    location: { latitude: 32.9115, longitude: 35.2974 },
  },
  {
    id: 'burgerim-lod',
    address: 'דוד המלך 17, לוד',
    cityId: 'לוד',
    phone: '08-9224145',
    openingHours: 'Su-Th 10:00-24:00; Sa 21:00-24:00',
    website: branchUrl('לוד'),
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"צ בית יוסף',
    location: { latitude: 31.9527, longitude: 34.8956 },
  },
  {
    id: 'burgerim-modiin',
    address: 'קייזר סנטר, עמק זבולון 24, מודיעין',
    cityId: 'מודיעין',
    phone: '08-6226265',
    openingHours: 'Su-Th 11:00-22:00; Sa 21:00-23:00',
    website: branchUrl('בורגרים-מודיעין-קייזר-סנטר'),
    kosherType: 'rabanut_mekomi',
    certifiedBy: 'רבנות מקומית',
    location: { latitude: 31.8966, longitude: 35.0102 },
  },
  {
    id: 'burgerim-mazkeret-batya',
    address: 'מנחם בגין 2, מזכרת בתיה',
    cityId: 'מזכרת בתיה',
    phone: '08-6722058',
    openingHours: 'Su-Th 11:00-23:30; Fr 11:00-14:30; Sa 21:00-23:30',
    website: branchUrl('מזכרת-בתיה'),
    kosherType: 'kosher',
    certifiedBy: 'כשר',
    location: { latitude: 31.8619, longitude: 34.8395 },
  },
  {
    id: 'burgerim-maale-adumim',
    address: 'האלמוג 31, מעלה אדומים',
    cityId: 'מעלה אדומים',
    phone: '077-5055123',
    openingHours: 'Su-Th 12:00-21:00; Sa 21:00-23:00',
    website: branchUrl('מעלה-אדומים'),
    kosherType: 'mehadrin',
    certifiedBy: 'כשר למהדרין',
    location: { latitude: 31.7731, longitude: 35.2955 },
  },
  {
    id: 'burgerim-nahariya',
    address: 'ויצמן 63, נהריה',
    cityId: 'נהריה',
    phone: '077-4345360',
    openingHours: 'Su-Th 11:00-23:00; Fr 11:00-14:30; Sa 21:00-23:00',
    website: branchUrl('נהריה'),
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"צ בית יוסף',
    location: { latitude: 33.0045, longitude: 35.0955 },
  },
  {
    id: 'burgerim-nof-hagalil',
    address: 'הגלבוע 1, מתחם מול הרים, נוף הגליל',
    cityId: 'נוף הגליל',
    phone: '04-8844144',
    openingHours: 'Su-Th 11:00-23:00; Fr 11:00-15:00; Sa 18:00-23:00',
    website: branchUrl('נצרת-עילית-בקרוב'),
    kosherType: 'rabanut_mekomi',
    certifiedBy: 'רבנות מקומית',
    location: { latitude: 32.7054, longitude: 35.3163 },
  },
  {
    id: 'burgerim-netanya-agamim',
    address: 'אגם כנרת 6, נתניה',
    cityId: 'נתניה',
    phone: '09-8808168',
    openingHours: 'Su-We 11:00-23:30; Th 11:00-24:00; Fr 11:00-15:00; Sa 21:00-24:00',
    website: branchUrl('נתניה-אגמים'),
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"צ בית יוסף',
    location: { latitude: 32.3215, longitude: 34.8532 },
  },
  {
    id: 'burgerim-einat',
    address: 'תחנת הדלק, עינת',
    cityId: 'עינת',
    phone: '03-7589217',
    openingHours: 'Su-We 11:00-23:00; Th 11:00-24:00; Sa 21:00-24:00',
    website: branchUrl('עינת'),
    kosherType: 'rabanut_mekomi',
    certifiedBy: 'רבנות מקומית',
    location: { latitude: 32.0526, longitude: 34.9626 },
  },
  {
    id: 'burgerim-akko',
    address: 'החרושת 3, קניון עזריאלי, עכו',
    cityId: 'עכו',
    phone: '04-6649333',
    openingHours: 'Su-Tu 11:00-23:00; We-Th 11:00-24:00; Fr 11:00-15:00; Sa 21:00-24:00',
    website: branchUrl('עכו'),
    kosherType: 'rabanut',
    certifiedBy: 'כשר בשר חלק',
    location: { latitude: 32.9230, longitude: 35.0730 },
  },
  {
    id: 'burgerim-leshem',
    address: 'בכניסה ליישוב לשם',
    cityId: 'לשם',
    phone: '03-6249050',
    openingHours: 'Su-Th 12:00-21:30',
    website: branchUrl('לשם-עלי-זהב'),
    kosherType: 'rabanut',
    certifiedBy: 'כשר בשר חלק',
    location: { latitude: 32.0010, longitude: 34.9664 },
  },
  {
    id: 'burgerim-afula',
    address: 'מנחם בגין 8, עפולה',
    cityId: 'עפולה',
    phone: '04-6404413',
    openingHours: 'Su-Th 11:30-23:00; Sa 21:00-23:00',
    website: branchUrl('עפולה'),
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"צ',
    location: { latitude: 32.6076, longitude: 35.2899 },
  },
  {
    id: 'burgerim-tzofim',
    address: 'ערבי נחל 508, מרכז מסחרי, צופים',
    cityId: 'צופים',
    phone: '09-8621014',
    openingHours: 'Su-Th 11:00-23:00; Sa 21:00-23:00',
    website: branchUrl('צופים'),
    kosherType: 'rabanut_mehadrin',
    certifiedBy: 'רבנות מקומית מהדרין',
    location: { latitude: 32.1618, longitude: 35.0040 },
  },
  {
    id: 'burgerim-caesarea',
    address: 'הרקיע 1, קיסריה',
    cityId: 'קיסריה',
    phone: '04-8411161',
    openingHours: 'Su-Th 11:00-23:00; Sa 21:00-23:00',
    website: branchUrl('קיסריה'),
    kosherType: 'rabanut_mekomi',
    certifiedBy: 'רבנות מקומית',
    location: { latitude: 32.5009, longitude: 34.9097 },
  },
  {
    id: 'burgerim-katzrin',
    address: 'דליות 2, מתחם איתן, קצרין',
    cityId: 'קצרין',
    phone: '04-6376654',
    openingHours: 'Su-Th 11:00-23:00; Sa 21:00-23:00',
    website: branchUrl('קצרין'),
    kosherType: 'mehadrin',
    certifiedBy: 'כשר למהדרין',
    location: { latitude: 32.9928, longitude: 35.6906 },
  },
  {
    id: 'burgerim-kiryat-malachi',
    address: 'אסיף 1, קריית מלאכי',
    cityId: 'קריית מלאכי',
    phone: '08-9930609',
    openingHours: 'Su-We 11:00-23:30; Th 11:00-24:00; Sa 21:00-24:00',
    website: branchUrl('קריית-מלאכי'),
    kosherType: 'rabanut',
    certifiedBy: 'כשר בשר חלק',
    location: { latitude: 31.7278, longitude: 34.7444 },
  },
  {
    id: 'burgerim-kiryat-ata',
    address: 'הנביאים 1, קרית אתא',
    cityId: 'קרית אתא',
    phone: '04-6444324',
    openingHours: 'Su-We 11:00-23:30; Th 11:00-24:00; Sa 21:00-24:00',
    website: branchUrl('קרית-אתא'),
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"צ בית יוסף',
    location: { latitude: 32.8056, longitude: 35.1048 },
  },
  {
    id: 'burgerim-kiryat-gat',
    address: 'שדרות מלכי ישראל 178, ישפרו סנטר, קרית גת',
    cityId: 'קרית גת',
    phone: '08-8600609',
    openingHours: 'Su-Th 11:00-23:00; Sa 21:00-23:00',
    website: branchUrl('קרית-גת'),
    kosherType: 'rabanut_mekomi',
    certifiedBy: 'רבנות מקומית',
    location: { latitude: 31.6100, longitude: 34.7641 },
  },
  {
    id: 'burgerim-rishon-merkaz',
    address: 'שמוטקין 10, ראשון לציון',
    cityId: 'ראשון לציון',
    phone: '03-5362828',
    openingHours: 'Su-We 11:00-22:30; Th 11:00-23:30; Sa 21:00-23:30',
    website: branchUrl('ראשון-לציון-מרכז'),
    kosherType: 'rabanut_mekomi',
    certifiedBy: 'רבנות מקומית',
    location: { latitude: 31.9730, longitude: 34.7898 },
  },
  {
    id: 'burgerim-rishon-zahav',
    address: 'קניון הזהב, ראשון לציון',
    cityId: 'ראשון לציון',
    phone: '03-6128226',
    openingHours: 'Su-Th 12:00-22:00; Fr 12:00-14:00; Sa 21:00-23:00',
    website: branchUrl('ראשון-לציון-קניון-הזהב'),
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"צ בית יוסף',
    location: { latitude: 31.9620, longitude: 34.8050 },
  },
  {
    id: 'burgerim-rehovot',
    address: 'מוטי קינד 10, המתחם החדש של יוחננוף, רחובות',
    cityId: 'רחובות',
    phone: '08-9165558',
    openingHours: 'Su-Th 11:00-23:00; Fr 11:00-14:30; Sa 21:00-23:30',
    website: branchUrl('רחובות'),
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"צ בית יוסף',
    location: { latitude: 31.8928, longitude: 34.8113 },
  },
  {
    id: 'burgerim-sderot',
    address: 'מתחם מול 7 (ליד הרכבת), שדרות',
    cityId: 'שדרות',
    phone: '08-9243555',
    openingHours: 'Su-Th 11:00-23:00; Fr 11:00-15:30; Sa 21:00-24:00',
    website: branchUrl('שדרות'),
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"צ בית יוסף',
    location: { latitude: 31.5256, longitude: 34.5993 },
  },
  {
    id: 'burgerim-tlv-ramat-aviv',
    address: "ג'ורג' וייז 20, תל אביב",
    cityId: 'תל אביב',
    phone: '03-6769717',
    openingHours: 'Su-Th 11:00-23:00',
    website: branchUrl('אוניברסיטת-תא'),
    kosherType: 'kosher',
    certifiedBy: 'כשר',
    location: { latitude: 32.1134, longitude: 34.8044 },
  },
];

// ── Shared fields for all בורגרים entries ───────────────────────────────────
const SHARED = {
  name: 'בורגרים',
  type: 'restaurant',
  category: 'meat',
  tags: ['burger'],
  menu: MENU,
  facebook: FACEBOOK,
  instagram: INSTAGRAM,
  source: 'manual',
  locationPrecision: 'city',
};

// ── Main ─────────────────────────────────────────────────────────────────────
const data = readNoBom(DATA_FILE);

let updatedCount = 0;
let addedCount = 0;

// 1. Update existing OSM entries
for (const entry of data) {
  if (EXISTING_UPDATES[entry.id]) {
    Object.assign(entry, EXISTING_UPDATES[entry.id]);
    updatedCount++;
  }
}

// 2. Add new branches (skip if ID already present)
const existingIds = new Set(data.map(e => e.id));
for (const branch of NEW_BRANCHES) {
  if (existingIds.has(branch.id)) {
    console.log(`  skip (exists): ${branch.id}`);
    continue;
  }
  data.push({ ...SHARED, ...branch });
  addedCount++;
}

writeWithBom(DATA_FILE, data);
console.log(`✓ Updated ${updatedCount} existing entries, added ${addedCount} new branches.`);
console.log(`  Total entries: ${data.length}`);
