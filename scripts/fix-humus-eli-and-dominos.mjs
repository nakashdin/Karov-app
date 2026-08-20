import { readFileSync, writeFileSync } from 'fs';

const DATA_PATH = 'C:\\Users\\User\\Desktop\\claude plane\\kosher-app\\src\\data\\generated\\places.osm.json';
const raw = readFileSync(DATA_PATH, 'utf-8').replace(/^\uFEFF/, '');
let places = JSON.parse(raw);

// ─── 1. חומוס אליהו — מיפוי כשרויות + שעות מהאתר הרשמי ───────────────────
// מקור: https://www.humus-eli-yahoo.com/restaurants/ (פתיחת כל "+" של כל סניף)
const HUMUS_ELI_DATA = {
  'humus-eli-חומוס-אליהו-אור-יהודה':         { kosherType: 'badatz_beit_yosef', certifiedBy: 'בד"ץ בית יוסף',         hours: 'Su-Th 10:00-20:00; Fr 08:30-15:00' },
  'humus-eli-חומוס-אליהו-אזור':               { kosherType: 'rabanut',           certifiedBy: 'רבנות מקומית',           hours: null },
  'humus-eli-חומוס-אליהו-אילת':               { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:00-18:00; Fr 10:00-15:00' },
  'humus-eli-חומוס-אליהו-אלונים':             { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 09:00-19:00; Fr 09:00-13:30' },
  'humus-eli-חומוס-אליהו-אריאל':              { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:00-19:00; Fr 10:00-14:00' },
  'humus-eli-חומוס-אליהו-אשדוד':              { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 09:30-16:00; Fr 09:30-13:30' },
  'humus-eli-חומוס-אליהו-אשקלון':             { kosherType: 'mehadrin',          certifiedBy: 'הרב לנדא',                hours: 'Su-Th 10:30-22:30; Fr 10:00-14:00' },
  'humus-eli-חומוס-אליהו-באר-טוביה':          { kosherType: 'rabanut_mehadrin',  certifiedBy: 'רבנות מהדרין',            hours: 'Su-Th 10:00-18:45; Fr 10:00-13:00' },
  'humus-eli-חומוס-אליהו-באר-יעקב':           { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:00-20:00; Fr 09:30-14:00' },
  'humus-eli-חומוס-אליהו-באר-שבע-מצדה':       { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:30-20:00; Fr 10:00-14:00' },
  'humus-eli-חומוס-אליהו-באר-שבע-פז-צפון':    { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su 09:30-20:00; Mo-Th 09:30-21:30; Fr 09:30-15:00' },
  'humus-eli-חומוס-אליהו-בית-השיטה':          { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-We 10:00-16:00; Th 10:00-17:00; Fr 09:30-15:00' },
  'humus-eli-חומוס-אליהו-בית-שאן':            { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 09:30-20:00; Fr 09:00-14:30' },
  'humus-eli-חומוס-אליהו-בית-שמש':            { kosherType: 'mehadrin',          certifiedBy: 'בד"ץ בית שמש',            hours: 'Su-We 10:30-20:00; Th 10:30-22:00; Fr 09:30-15:00' },
  'humus-eli-חומוס-אליהו-בית-שמש-סאן-מול':    { kosherType: 'badatz_kehilot',    certifiedBy: 'בד"ץ קהילות',             hours: 'Su-Th 11:00-21:00; Fr 10:00-13:00' },
  'humus-eli-חומוס-אליהו-בני-ברק':            { kosherType: 'mehadrin',          certifiedBy: 'הרב מחפוד',               hours: 'Su-Th 10:00-22:00; Fr 09:00-14:00' },
  'humus-eli-חומוס-אליהו-בנימינה':            { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:00-19:00; Fr 09:00-14:00' },
  'humus-eli-חומוס-אליהו-בת-ים':              { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 09:30-20:00; Fr 09:00-15:30' },
  'humus-eli-חומוס-אליהו-גבעת-שאול-ירושלים':  { kosherType: 'mehadrin',          certifiedBy: 'הרב מחפוד',               hours: 'Su-Th 09:00-20:00; Fr 09:00-15:00' },
  'humus-eli-חומוס-אליהו-גוש-עציון':          { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:00-20:30; Fr 08:00-14:00' },
  'humus-eli-חומוס-אליהו-גן-יבנה':            { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 08:30-18:00; Fr 07:30-14:30' },
  'humus-eli-חומוס-אליהו-גשר-הזיו':           { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 09:00-20:00; Fr 08:00-14:00' },
  'humus-eli-חומוס-אליהו-דימונה':             { kosherType: 'badatz_beit_yosef', certifiedBy: 'בד"ץ בית יוסף',           hours: 'Su-Th 09:00-21:00; Fr 09:00-15:00; Sa 22:00-23:00' },
  'humus-eli-חומוס-אליהו-הרצליה-פיתוח':       { kosherType: 'rabanut_mehadrin',  certifiedBy: 'רבנות מהדרין',            hours: 'Su-Th 09:30-17:00; Fr 09:30-14:30' },
  'humus-eli-חומוס-אליהו-הרצליה-שער-העיר':    { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:00-17:00; Fr 10:00-15:00' },
  'humus-eli-חומוס-אליהו-חדרה':               { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:00-20:00; Fr 10:00-14:00' },
  'humus-eli-חומוס-אליהו-חולון':              { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:30-20:00; Fr 10:30-14:00' },
  'humus-eli-חומוס-אליהו-טבריה-עלית-פוריה':   { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 09:30-18:00; Fr 08:30-13:30' },
  'humus-eli-חומוס-אליהו-טבריה-הגליל':        { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:00-18:00; Fr 10:00-15:00' },
  'humus-eli-חומוס-אליהו-טירת-הכרמל':         { kosherType: 'rabanut',           certifiedBy: 'רבנות מקומית',            hours: 'Su-Th 10:00-18:30; Fr 09:30-14:00' },
  'humus-eli-חומוס-אליהו-יוקנעם':             { kosherType: 'rabanut_mehadrin',  certifiedBy: 'רבנות מהדרין',            hours: 'Su-Th 09:00-19:00; Fr 08:30-14:00' },
  'humus-eli-חומוס-אליהו-ים-המלח-עין-בוקק':  { kosherType: 'rabanut',           certifiedBy: 'רבנות מקומית',            hours: 'Su-Th 09:00-21:00; Fr 09:00-15:00' },
  'humus-eli-חומוס-אליהו-ירושלים-הדר-תלפיות':{ kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su 10:00-21:00; Mo-Th 10:00-21:30; Fr 09:00-14:00' },
  'humus-eli-חומוס-אליהו-ירושלים-מבשרת-ציון': { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 09:00-19:30; Fr 08:00-14:00' },
  'humus-eli-חומוס-אליהו-ירושלים-שורש-שואבה': { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 09:00-20:00; Fr 09:00-14:00' },
  'humus-eli-חומוס-אליהו-ירושלים-מחנה-יהודה': { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:30-19:00; Fr 09:00-13:00' },
  'humus-eli-חומוס-אליהו-ירושלים-פסגת-זאב':   { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:30-20:00; Fr 09:00-14:00' },
  'humus-eli-חומוס-אליהו-ירושלים-יפו-33':     { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:00-21:30; Fr 10:00-14:00' },
  'humus-eli-חומוס-אליהו-ירושלים-הר-חוצבים':  { kosherType: 'mehadrin',          certifiedBy: 'הרב רובין',               hours: 'Su-Th 11:30-21:00' },
  'humus-eli-חומוס-אליהו-ירושלים-מלחה':       { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su 10:30-21:00; Mo-Th 10:30-22:00; Fr 09:30-14:00' },
  'humus-eli-חומוס-אליהו-ירושלים-סנטר-1':     { kosherType: 'badatz_kehilot',    certifiedBy: 'בד"ץ קהילות',             hours: 'Su-Th 10:30-21:00' },
  'humus-eli-חומוס-אליהו-ירושלים-קניון-רמות':  { kosherType: 'badatz_kehilot',    certifiedBy: 'בד"ץ קהילות',             hours: 'Su-Th 10:00-21:00; Fr 09:00-13:30' },
  'humus-eli-חומוס-אליהו-ישפרו-סנטר-מודיעין':  { kosherType: 'rabanut',           certifiedBy: 'רבנות מקומית',            hours: 'Su-Th 10:00-20:00; Fr 09:00-15:00' },
  'humus-eli-חומוס-אליהו-כפר-יונה':           { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 09:00-20:00; Fr 09:00-14:00' },
  'humus-eli-חומוס-אליהו-כפר-סבא-עתיר-ידע':   { kosherType: 'rabanut',           certifiedBy: 'רבנות מקומית',            hours: 'Su-Th 10:00-18:00; Fr 10:00-14:00' },
  'humus-eli-חומוס-אליהו-כפר-סבא-הירוקה':     { kosherType: 'rabanut',           certifiedBy: 'רבנות מקומית',            hours: 'Su-Th 10:00-19:30; Fr 10:00-15:00' },
  'humus-eli-חומוס-אליהו-לוד':                { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:00-16:00; Fr 10:00-14:30' },
  'humus-eli-חומוס-אליהו-מודיעין-עילית':       { kosherType: 'badatz_kehilot',    certifiedBy: 'בד"ץ קהילות קריית ספר',  hours: 'Su-Th 12:00-22:00' },
  'humus-eli-חומוס-אליהו-מודיעין-קייזר':       { kosherType: 'badatz_beit_yosef', certifiedBy: 'בד"ץ בית יוסף',           hours: 'Su-We 11:00-19:00; Th 11:00-20:00; Fr 09:00-15:00' },
  'humus-eli-חומוס-אליהו-מישור-אדומים':        { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:00-19:00; Fr 10:00-13:30' },
  'humus-eli-חומוס-אליהו-מענית':              { kosherType: 'rabanut_mehadrin',  certifiedBy: 'רבנות מהדרין',            hours: 'Su-Th 10:00-16:30; Fr 09:00-14:00' },
  'humus-eli-חומוס-אליהו-נס-ציונה':           { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 09:30-18:30; Fr 09:30-15:30' },
  'humus-eli-חומוס-אליהו-נשר':                { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:00-16:00; Fr 09:00-14:00' },
  'humus-eli-חומוס-אליהו-נתיבות':             { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:30-20:00; Fr 10:30-13:30' },
  'humus-eli-חומוס-אליהו-נתניה':              { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 08:30-19:00; Fr 08:30-12:30' },
  'humus-eli-חומוס-אליהו-עלי':                { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 11:00-20:00; Fr 09:00-14:00' },
  'humus-eli-חומוס-אליהו-פתח-תקווה':          { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:30-20:00; Fr 09:00-15:00' },
  'humus-eli-חומוס-אליהו-צמח':                { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:00-18:00; Fr 10:00-14:30' },
  'humus-eli-חומוס-אליהו-צפת':                { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:00-22:00; Fr 10:00-13:00' },
  'humus-eli-חומוס-אליהו-קדימה':              { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 11:00-17:00; Fr 09:30-14:00' },
  'humus-eli-חומוס-אליהו-קרית-אונו':          { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:00-20:00; Fr 10:00-14:00' },
  'humus-eli-חומוס-אליהו-קרית-אתא':           { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:00-17:00; Fr 08:00-14:00' },
  'humus-eli-חומוס-אליהו-קרית-גת':            { kosherType: 'rabanut',           certifiedBy: 'רבנות מקומית',            hours: 'Su-Th 09:00-16:00; Fr 09:00-14:00' },
  'humus-eli-חומוס-אליהו-קרית-שמונה':         { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:00-18:00; Fr 10:00-14:30' },
  'humus-eli-חומוס-אליהו-קרני-שומרון':        { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:00-21:00; Fr 09:00-14:00' },
  // קרית מוצקין — שומרים רק זה (עם שעות), מוחקים את הכפיל "קריית-מוצקין"
  'humus-eli-חומוס-אליהו-קרית-מוצקין':        { kosherType: 'rabanut',           certifiedBy: 'רבנות מקומית',            hours: 'Su-Th 10:00-18:00; Fr 09:00-15:00' },
  'humus-eli-חומוס-אליהו-ראש-העין':           { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:30-21:00; Fr 09:00-15:00' },
  'humus-eli-חומוס-אליהו-ראש-פינה':           { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 09:00-17:00; Fr 09:00-15:00' },
  'humus-eli-חומוס-אליהו-ראשלצ-קניון-הזהב':   { kosherType: 'badatz_beit_yosef', certifiedBy: 'בד"ץ בית יוסף',           hours: 'Su-Th 10:00-21:00; Fr 10:00-15:00' },
  'humus-eli-חומוס-אליהו-ראשלצ-ראשונים':      { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:30-21:00; Fr 09:00-14:00' },
  'humus-eli-חומוס-אליהו-רחובות-קניון-עופר':  { kosherType: 'badatz_beit_yosef', certifiedBy: 'בד"ץ בית יוסף',           hours: 'Su-Th 09:30-22:00; Fr 09:30-15:30; Sa 20:00-23:00' },
  'humus-eli-חומוס-אליהו-רמלה':               { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 09:00-21:30; Fr 08:30-14:00' },
  'humus-eli-חומוס-אליהו-רמת-גן-קניון-איילון':{ kosherType: 'mehadrin',          certifiedBy: 'חתם סופר',                hours: 'Su-Th 10:00-21:30; Fr 10:00-15:00' },
  'humus-eli-חומוס-אליהו-רמת-גן-בורסה':       { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:30-19:00; Fr 10:00-14:00' },
  'humus-eli-חומוס-אליהו-רעננה':              { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:00-20:30; Fr 08:30-14:30' },
  'humus-eli-חומוס-אליהו-שדרות':              { kosherType: 'badatz_beit_yosef', certifiedBy: 'בד"ץ בית יוסף',           hours: 'Su-Th 09:00-18:00; Fr 09:00-14:00' },
  'humus-eli-חומוס-אליהו-שוהם':               { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 09:00-20:00; Fr 09:00-15:00' },
  'humus-eli-חומוס-אליהו-תל-אביב-היכל-מנורה': { kosherType: 'badatz_beit_yosef', certifiedBy: 'בד"ץ בית יוסף',           hours: 'Su-Th 09:00-19:30; Fr 09:00-14:30' },
  'humus-eli-חומוס-אליהו-תל-אביב-שוק-הפשפשים':{ kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:30-19:00; Fr 10:00-15:30' },
  'humus-eli-חומוס-אליהו-תל-אביב-דיזינגוף-סנטר':{ kosherType: 'mehadrin',        certifiedBy: 'מהדרין',                  hours: 'Su-Th 10:00-20:00; Fr 09:00-15:00' },
  'humus-eli-חומוס-אליהו-תל-אביב-פלורנטין':   { kosherType: 'mehadrin',          certifiedBy: 'מהדרין',                  hours: 'Su-Th 09:30-17:30; Fr 09:30-14:00' },
  'humus-eli-חומוס-אליהו-תל-אביב-שרונה':      { kosherType: 'rabanut',           certifiedBy: 'רבנות מקומית',            hours: 'Su-Th 09:00-17:00; Fr 08:00-17:00' },
};

// ─── 2. רשומות למחיקה ─────────────────────────────────────────────────────
const DELETE_IDS = new Set([
  // כפיל קריית מוצקין — ללא שעות פעילות, שגוי
  'humus-eli-חומוס-אליהו-קריית-מוצקין',
  // דומינוס ישן — ללא שעות פעילות, כפיל לרשומות dominos-v2-*
  '9000093', '9000094', '9000095', '9000098', '9000099', '9000100', '9000101', '9000102',
]);

// ─── 3. עדכון ─────────────────────────────────────────────────────────────
let updatedHumus = 0;
let deletedCount = 0;

places = places
  .filter(p => {
    if (DELETE_IDS.has(p.id)) { deletedCount++; return false; }
    return true;
  })
  .map(p => {
    const data = HUMUS_ELI_DATA[p.id];
    if (!data) return p;

    updatedHumus++;
    const updates = {
      kosherType: data.kosherType,
      certifiedBy: data.certifiedBy,
      lastVerifiedAt: '2026-07-29',
      website: 'https://www.humus-eli-yahoo.com/restaurants/',
    };
    if (data.hours) updates.openingHours = data.hours;

    return { ...p, ...updates };
  });

writeFileSync(DATA_PATH, JSON.stringify(places, null, 2), 'utf-8');

console.log(`✅ חומוס אליהו: עודכנו ${updatedHumus} סניפים (כשרות + שעות)`);
console.log(`🗑️  נמחקו ${deletedCount} רשומות:`);
console.log(`   - כפיל קריית מוצקין (ללא שעות)`);
console.log(`   - ${9} דומינוס ישנים (ללא שעות, כפיל לרשומות v2)`);
console.log(`סה"כ: ${places.length} רשומות`);
