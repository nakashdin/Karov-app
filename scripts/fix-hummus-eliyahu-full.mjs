import { readFileSync, writeFileSync } from 'fs';

const DATA_PATH = 'C:\\Users\\User\\Desktop\\claude plane\\kosher-app\\src\\data\\generated\\places.osm.json';
const raw = readFileSync(DATA_PATH, 'utf-8').replace(/^\uFEFF/, '');
let places = JSON.parse(raw);

// Records to DELETE (duplicates / not open yet / unknown source)
const DELETE_IDS = new Set([
  'osm-node-4916855022',        // רחובות ישן (כפול של קניון עופר)
  'osm-node-5392535276',        // ראש פינה ישן (כפול + כתובת שגויה)
  'osm-node-5613754222',        // עפולה - טרם נפתח
  'osm-node-12133763086',       // קריית מאיר - מקור לא ידוע
  'manual-hummus-eliyahu-bnei-brak',    // כפול של humus-eli-בני-ברק
  'manual-hummus-eli-or-yehuda',        // כפול של humus-eli-אור-יהודה
  'manual-hummus-eli-herzliya',         // כפול של humus-eli-שער-העיר
  'manual-hummus-eli-jrm-talpiot',      // כפול של humus-eli-הדר-תלפיות
  'manual-hummus-eli-jrm-mahane',       // כפול של humus-eli-מחנה-יהודה
  'manual-hummus-eli-tiberias',         // כפול של humus-eli-טבריה-הגליל
  'manual-hummus-eliyahu-kiryat-sefer', // כפול של humus-eli-מודיעין-עילית (אבני נזר 46)
]);

// Official data from https://www.humus-eli-yahoo.com/restaurants/
const OFFICIAL = {
  'humus-eli-חומוס-אליהו-אור-יהודה':           { phone: '03-5098537',   openingHours: "א'-ה' 10:00-20:00 | ו' 08:30-15:00" },
  'humus-eli-חומוס-אליהו-אזור':                { phone: '03-7731713',   openingHours: '' },
  'humus-eli-חומוס-אליהו-אילת':                { phone: '08-9217177',   openingHours: "א'-ה' 10:00-18:00 | ו' 10:00-15:00" },
  'humus-eli-חומוס-אליהו-אלונים':              { phone: '04-6206309',   openingHours: "א'-ה' 09:00-19:00 | ו' 09:00-13:30" },
  'humus-eli-חומוס-אליהו-אריאל':               { phone: '077-6495160',  openingHours: "א'-ה' 10:00-19:00 | ו' 10:00-14:00" },
  'humus-eli-חומוס-אליהו-אשדוד':               { phone: '08-6636368',   openingHours: "א'-ה' 09:30-16:00 | ו' 09:30-13:30" },
  'humus-eli-חומוס-אליהו-אשקלון':              { phone: '08-6166444',   openingHours: "א'-ה' 10:30-22:30 | ו' 10:00-14:00" },
  'humus-eli-חומוס-אליהו-באר-טוביה':           { phone: '08-6536330',   openingHours: "א'-ה' 10:00-18:45 | ו' 10:00-13:00" },
  'humus-eli-חומוס-אליהו-באר-יעקב':            { phone: '08-6271990',   openingHours: "א'-ה' 10:00-20:00 | ו' 09:30-14:00" },
  'humus-eli-חומוס-אליהו-באר-שבע-מצדה':        { phone: '077-4015344',  openingHours: "א'-ה' 10:30-20:00 | ו' 10:00-14:00" },
  'humus-eli-חומוס-אליהו-באר-שבע-פז-צפון':     { phone: '08-9246661',   openingHours: "א' 09:30-20:00 | ב'-ה' 09:30-21:30 | ו' 09:30-15:00" },
  'humus-eli-חומוס-אליהו-בית-השיטה':           { phone: '04-6332290',   openingHours: "א'-ג' 10:00-16:00 | ד'-ה' 10:00-17:00 | ו' 09:30-15:00" },
  'humus-eli-חומוס-אליהו-בית-שאן':             { phone: '04-6737373',   openingHours: "א'-ה' 09:30-20:00 | ו' 09:00-14:30" },
  'humus-eli-חומוס-אליהו-בית-שמש':             { phone: '02-5782197',   openingHours: "א'-ד' 10:30-20:00 | ה' 10:30-22:00 | ו' 09:30-15:00" },
  'humus-eli-חומוס-אליהו-בית-שמש-סאן-מול':     { phone: '052-5118990',  openingHours: "א'-ה' 11:00-21:00 | ו' 10:00-13:00" },
  'humus-eli-חומוס-אליהו-בני-ברק':             { phone: '03-5229909',   openingHours: "א'-ה' 10:00-22:00 | ו' 09:00-14:00" },
  'humus-eli-חומוס-אליהו-בנימינה':             { phone: '04-6561516',   openingHours: "א'-ה' 10:00-19:00 | ו' 09:00-14:00" },
  'humus-eli-חומוס-אליהו-בת-ים':               { phone: '03-5093683',   openingHours: "א'-ה' 09:30-20:00 | ו' 09:00-15:30" },
  'humus-eli-חומוס-אליהו-גבעת-שאול-ירושלים':  { phone: '077-2302445',  openingHours: "א'-ה' 09:00-20:00 | ו' 09:00-15:00" },
  'humus-eli-חומוס-אליהו-גוש-עציון':           { phone: '02-5821655',   openingHours: "א'-ה' 10:00-20:30 | ו' 08:00-14:00" },
  'humus-eli-חומוס-אליהו-גן-יבנה':             { phone: '054-5852397',  openingHours: "א'-ה' 08:30-18:00 | ו' 07:30-14:30" },
  'humus-eli-חומוס-אליהו-גשר-הזיו':            { phone: '04-6475581',   openingHours: "א'-ה' 09:00-20:00 | ו' 08:00-14:00" },
  'humus-eli-חומוס-אליהו-דימונה':              { phone: '08-8666900',   openingHours: "א'-ה' 09:00-21:00 | ו' 09:00-15:00 | ש' מוצ\"ש-23:00" },
  'humus-eli-חומוס-אליהו-הרצליה-פיתוח':        { phone: '09-9736397',   openingHours: "א'-ה' 09:30-17:00 | ו' 09:30-14:30" },
  'humus-eli-חומוס-אליהו-הרצליה-שער-העיר':     { phone: '09-8877846',   openingHours: "א'-ה' 10:00-17:00 | ו' 10:00-15:00" },
  'humus-eli-חומוס-אליהו-חדרה':                { phone: '04-9080809',   openingHours: "א'-ה' 10:00-20:00 | ו' 10:00-14:00" },
  'humus-eli-חומוס-אליהו-חולון':               { phone: '03-5088849',   openingHours: "א'-ה' 10:30-20:00 | ו' 10:30-14:00" },
  'humus-eli-חומוס-אליהו-טבריה-הגליל':         { phone: '04-6277888',   openingHours: "א'-ה' 10:00-18:00 | ו' 10:00-15:00" },
  'humus-eli-חומוס-אליהו-טבריה-עלית-פוריה':    { phone: '04-6999778',   openingHours: "א'-ה' 09:30-18:00 | ו' 08:30-13:30" },
  'humus-eli-חומוס-אליהו-טירת-הכרמל':          { phone: '04-6951549',   openingHours: "א'-ה' 10:00-18:30 | ו' 09:30-14:00" },
  'humus-eli-חומוס-אליהו-יוקנעם':              { phone: '04-9890916',   openingHours: "א'-ה' 09:00-19:00 | ו' 08:30-14:00" },
  'humus-eli-חומוס-אליהו-ים-המלח-עין-בוקק':   { phone: '08-6143083',   openingHours: "א'-ה' 09:00-21:00 | ו' 09:00-15:00" },
  'humus-eli-חומוס-אליהו-ירושלים-הדר-תלפיות': { phone: '02-6754455',   openingHours: "א' 10:00-21:00 | ב'-ה' 10:00-21:30 | ו' 09:00-14:00" },
  'humus-eli-חומוס-אליהו-ירושלים-הר-חוצבים':  { phone: '02-6200405',   openingHours: "א'-ה' 11:30-21:00" },
  'humus-eli-חומוס-אליהו-ירושלים-מבשרת-ציון': { phone: '050-9232233',  openingHours: "א'-ה' 09:00-19:30 | ו' 08:00-14:00" },
  'humus-eli-חומוס-אליהו-ירושלים-מחנה-יהודה': { phone: '02-5492353',   openingHours: "א'-ה' 10:30-19:00 | ו' 09:00-13:00" },
  'humus-eli-חומוס-אליהו-ירושלים-מלחה':        { phone: '02-6634577',   openingHours: "א' 10:30-21:00 | ב'-ה' 10:30-22:00 | ו' 09:30-14:00" },
  'humus-eli-חומוס-אליהו-ירושלים-סנטר-1':      { phone: '077-4170400',  openingHours: "א'-ה' 10:30-21:00" },
  'humus-eli-חומוס-אליהו-ירושלים-פסגת-זאב':    { phone: '02-5666882',   openingHours: "א'-ה' 10:30-20:00 | ו' 09:00-14:00" },
  'humus-eli-חומוס-אליהו-ירושלים-קניון-רמות':  { phone: '073-3962571',  openingHours: "א'-ה' 10:00-21:00 | ו' 09:00-13:30" },
  'humus-eli-חומוס-אליהו-ירושלים-שורש-שואבה': { phone: '077-9800380',  openingHours: "א'-ה' 09:00-20:00 | ו' 09:00-14:00" },
  'humus-eli-חומוס-אליהו-ירושלים-יפו-33':      { phone: '077-9386235',  openingHours: "א'-ה' 10:00-21:30 | ו' 10:00-14:00" },
  'humus-eli-חומוס-אליהו-ישפרו-סנטר-מודיעין': { phone: '08-6665959',   openingHours: "א'-ה' 10:00-20:00 | ו' 09:00-15:00" },
  'humus-eli-חומוס-אליהו-כפר-יונה':            { phone: '077-9386471',  openingHours: "א'-ה' 09:00-20:00 | ו' 09:00-14:00" },
  'humus-eli-חומוס-אליהו-כפר-סבא-עתיר-ידע':   { phone: '09-8877265',   openingHours: "א'-ה' 10:00-18:00 | ו' 10:00-14:00" },
  'humus-eli-חומוס-אליהו-כפר-סבא-הירוקה':     { phone: '09-7436666',   openingHours: "א'-ה' 10:00-19:30 | ו' 10:00-15:00" },
  'humus-eli-חומוס-אליהו-לוד':                 { phone: '08-6608876',   openingHours: "א'-ה' 10:00-16:00 | ו' 10:00-14:30" },
  'humus-eli-חומוס-אליהו-מודיעין-עילית':       { phone: '079-6966969',  openingHours: "א'-ה' 12:00-22:00" },
  'humus-eli-חומוס-אליהו-מודיעין-קייזר':       { phone: '053-3444515',  openingHours: "א'-ד' 11:00-19:00 | ה' 11:00-20:00 | ו' 09:00-15:00" },
  'humus-eli-חומוס-אליהו-מישור-אדומים':        { phone: '02-6455499',   openingHours: "א'-ה' 10:00-19:00 | ו' 10:00-13:30" },
  'humus-eli-חומוס-אליהו-מענית':               { phone: '04-6712552',   openingHours: "א'-ה' 10:00-16:30 | ו' 09:00-14:00" },
  'humus-eli-חומוס-אליהו-נס-ציונה':            { phone: '077-9386474',  openingHours: "א'-ה' 09:30-18:30 | ו' 09:30-15:30" },
  'humus-eli-חומוס-אליהו-נשר':                 { phone: '04-6055552',   openingHours: "א'-ה' 10:00-16:00 | ו' 09:00-14:00" },
  'humus-eli-חומוס-אליהו-נתיבות':              { phone: '08-6644133',   openingHours: "א'-ה' 10:30-20:00 | ו' 10:30-13:30" },
  'humus-eli-חומוס-אליהו-נתניה':               { phone: '09-8992155',   openingHours: "א'-ה' 08:30-19:00 | ו' 08:30-12:30" },
  'humus-eli-חומוס-אליהו-עלי':                 { phone: '055-9499368',  openingHours: "א'-ה' 11:00-20:00 | ו' 09:00-14:00" },
  'humus-eli-חומוס-אליהו-פתח-תקווה':           { phone: '077-9386212',  openingHours: "א'-ה' 10:30-20:00 | ו' 09:00-15:00" },
  'humus-eli-חומוס-אליהו-צמח':                 { phone: '04-8555100',   openingHours: "א'-ה' 10:00-18:00 | ו' 10:00-14:30" },
  'humus-eli-חומוס-אליהו-צפת':                 { phone: '04-7791937',   openingHours: "א'-ה' 10:00-22:00 | ו' 10:00-13:00" },
  'humus-eli-חומוס-אליהו-קדימה':               { phone: '09-8933040',   openingHours: "א'-ה' 11:00-17:00 | ו' 09:30-14:00" },
  'humus-eli-חומוס-אליהו-קרית-אונו':           { phone: '03-6438467',   openingHours: "א'-ה' 10:00-20:00 | ו' 10:00-14:00" },
  'humus-eli-חומוס-אליהו-קרית-אתא':            { phone: '04-9075555',   openingHours: "א'-ה' 10:00-17:00 | ו' 08:00-14:00" },
  'humus-eli-חומוס-אליהו-קרית-גת':             { phone: '08-8607706',   openingHours: "א'-ה' 09:00-16:00 | ו' 09:00-14:00" },
  'humus-eli-חומוס-אליהו-קרית-שמונה':          { phone: '04-6217602',   openingHours: "א'-ה' 10:00-18:00 | ו' 10:00-14:30" },
  'humus-eli-חומוס-אליהו-קרני-שומרון':         { phone: '077-9386463',  openingHours: "א'-ה' 10:00-21:00 | ו' 09:00-14:00" },
  'humus-eli-חומוס-אליהו-קריית-מוצקין':        { phone: '077-3034157',  openingHours: "א'-ה' 10:00-18:00 | ו' 09:00-15:00" },
  'humus-eli-חומוס-אליהו-ראש-העין':            { phone: '077-9800491',  openingHours: "א'-ה' 10:30-21:00 | ו' 09:00-15:00" },
  'humus-eli-חומוס-אליהו-ראש-פינה':            { phone: '04-8583310',   openingHours: "א'-ה' 09:00-17:00 | ו' 09:00-15:00" },
  'humus-eli-חומוס-אליהו-ראשלצ-קניון-הזהב':   { phone: '03-6893499',   openingHours: "א'-ה' 10:00-21:00 | ו' 10:00-15:00" },
  'humus-eli-חומוס-אליהו-ראשלצ-ראשונים':       { phone: '03-9615677',   openingHours: "א'-ה' 10:30-21:00 | ו' 09:00-14:00" },
  'humus-eli-חומוס-אליהו-רחובות-קניון-עופר':   { phone: '077-3034049',  openingHours: "א'-ה' 09:30-22:00 | ו' 09:30-15:30 | ש' 20:00-23:00" },
  'humus-eli-חומוס-אליהו-רמלה':                { phone: '08-6216216',   openingHours: "א'-ה' 09:00-21:30 | ו' 08:30-14:00" },
  'humus-eli-חומוס-אליהו-רמת-גן-בורסה':        { phone: '03-7755731',   openingHours: "א'-ה' 10:30-19:00 | ו' 10:00-14:00" },
  'humus-eli-חומוס-אליהו-רמת-גן-קניון-איילון': { phone: '03-6441163',   openingHours: "א'-ה' 10:00-21:30 | ו' 10:00-15:00" },
  'humus-eli-חומוס-אליהו-רעננה':               { phone: '09-8877013',   openingHours: "א'-ה' 10:00-20:30 | ו' 08:30-14:30" },
  'humus-eli-חומוס-אליהו-שדרות':               { phone: '077-9386450',  openingHours: "א'-ה' 09:00-18:00 | ו' 09:00-14:00" },
  'humus-eli-חומוס-אליהו-שוהם':                { phone: '03-7756882',   openingHours: "א'-ה' 09:00-20:00 | ו' 09:00-15:00" },
  'humus-eli-חומוס-אליהו-תל-אביב-היכל-מנורה': { phone: '050-4020507',  openingHours: "א'-ה' 09:00-19:30 | ו' 09:00-14:30" },
  'humus-eli-חומוס-אליהו-תל-אביב-דיזינגוף-סנטר': { phone: '03-6358509', openingHours: "א'-ה' 10:00-20:00 | ו' 09:00-15:00" },
  'humus-eli-חומוס-אליהו-תל-אביב-פלורנטין':   { phone: '03-6967700',   openingHours: "א'-ה' 09:30-17:30 | ו' 09:30-14:00" },
  'humus-eli-חומוס-אליהו-תל-אביב-שוק-הפשפשים': { phone: '03-9599188',  openingHours: "א'-ה' 10:30-19:00 | ו' 10:00-15:30" },
  'humus-eli-חומוס-אליהו-תל-אביב-שרונה':       { phone: '054-5723838',  openingHours: "א'-ה' 09:00-17:00 | ו' 08:00-17:00" },
};

const MENU_URL = 'https://www.humus-eli-yahoo.com/menu/';
const WEBSITE  = 'https://www.humus-eli-yahoo.com/';

// 1. Delete unwanted records
const before = places.length;
places = places.filter(p => !DELETE_IDS.has(p.id));
console.log(`🗑  נמחקו ${before - places.length} רשומות`);

// 2. Update existing records with phone / hours / menu
let updated = 0;
places = places.map(p => {
  if (!p.name?.includes('חומוס אליהו')) return p;
  const upd = OFFICIAL[p.id] || {};
  return {
    ...p,
    website: WEBSITE,
    menu: MENU_URL,
    ...(upd.phone        ? { phone: upd.phone }               : {}),
    ...(upd.openingHours ? { openingHours: upd.openingHours } : {}),
    lastVerifiedAt: '2026-07-30',
  };
  updated++;
});

// Count updated
updated = places.filter(p => p.name?.includes('חומוס אליהו') && p.lastVerifiedAt === '2026-07-30').length;

// 3. Add missing branch: מידטאון ת"א
const hasMidtown = places.some(p => p.id === 'humus-eli-חומוס-אליהו-מידטאון-תא');
if (!hasMidtown) {
  places.push({
    id: 'humus-eli-חומוס-אליהו-מידטאון-תא',
    name: 'חומוס אליהו מידטאון תל אביב',
    type: 'fast_food',
    category: 'parve',
    cityId: 'תל אביב-יפו',
    address: 'מנחם בגין 144, תל אביב',
    location: { latitude: 32.0748, longitude: 34.7935 },
    phone: '03-5544222',
    website: WEBSITE,
    menu: MENU_URL,
    openingHours: "א'-ה' 11:00-17:00",
    kosherType: 'mehadrin',
    source: 'manual',
    locationPrecision: 'address',
    lastVerifiedAt: '2026-07-30',
  });
  console.log('✅ נוסף: מידטאון תל אביב');
}

writeFileSync(DATA_PATH, JSON.stringify(places, null, 2), 'utf-8');

const finalCount = places.filter(p => p.name?.includes('חומוס אליהו')).length;
console.log(`✅ עודכנו ${updated} רשומות חומוס אליהו עם טלפון/שעות/תפריט`);
console.log(`📊 סה"כ חומוס אליהו בDB: ${finalCount}`);
console.log(`📊 סה"כ רשומות: ${places.length}`);
