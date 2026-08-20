/**
 * תיקון מקיף לדאטה רולדין:
 * - מסמן כשרים לפי רשימה מדויקת
 * - מוסיף פרטים חסרים (טלפון, שעות) מהסקרצ'פד
 * - מתקן סימונים שגויים
 * - מוסיף סניפים חסרים
 * Run: node scripts/fix-roladin-final.mjs
 */
import { readFileSync, writeFileSync } from 'fs';

const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);
function readNoBom(p) {
  const buf = readFileSync(p);
  const s = (buf[0]===0xEF&&buf[1]===0xBB&&buf[2]===0xBF) ? buf.slice(3) : buf;
  return JSON.parse(s.toString('utf8'));
}
function writeWithBom(p, data) {
  writeFileSync(p, Buffer.concat([BOM, Buffer.from(JSON.stringify(data, null, 2), 'utf8')]));
}

// כל הסניפים הכשרים — branchTitle → URL
const KOSHER = {
  'קדימה':                            'https://roladin.co.il/סניפים/קדימה/',
  'רעננה קניון רננים':               'https://roladin.co.il/סניפים/רעננה-קניון-רננים/',
  'מודיעין קניון עזריאלי':           'https://roladin.co.il/סניפים/מודיעין-קניון-עזריאלי/',
  'חיפה חורב':                       'https://roladin.co.il/סניפים/חיפה/',
  'פתח תקווה כפר גנים':              'https://roladin.co.il/סניפים/פתח-תקווהכפר-גנים-ג/',
  'כפר סבא התע"ש':                   'https://roladin.co.il/סניפים/כפר-סבא-התעש/',
  'רעננה אחוזה':                     'https://roladin.co.il/סניפים/רעננה-אחוזה/',
  'הרצליה משכית':                    'https://roladin.co.il/סניפים/הרצליה-משכית/',
  'הוד השרון הבנים':                 'https://roladin.co.il/סניפים/הוד-השרון/',
  'אשדוד שכונה ט"ז':                 'https://roladin.co.il/סניפים/אשדוד-שכונה-טז/',
  'גן יבנה':                         'https://roladin.co.il/סניפים/גן-יבנה/',
  'רמת גן בורסה':                    'https://roladin.co.il/סניפים/רמת-גן-בורסה/',
  'תל אביב שוסטר':                   'https://roladin.co.il/סניפים/תל-אביב-שוסטר/',
  'תל אביב אבן גבירול':              'https://roladin.co.il/סניפים/אבן-גבירול/',
  'פתח תקווה אם המושבות':            'https://roladin.co.il/סניפים/שכונת-אם-המושבות-בפת/',
  'עפולה מרכז BIG':                  'https://roladin.co.il/סניפים/עפולה/',
  'ראשל"צ נרקיסים':                  'https://roladin.co.il/סניפים/נרקיסים-ראשון-לציון/',
  'באר שבע מרכז BIG':                'https://roladin.co.il/סניפים/big-באר-שבע/',
  'ירושלים מחנה יהודה':              'https://roladin.co.il/סניפים/מחנה-יהודה/',
  'חריש':                            'https://roladin.co.il/סניפים/חריש/',
  'אשקלון דוידי סנטר':               'https://roladin.co.il/סניפים/אשקלון/',
  'גבעת שמואל':                      'https://roladin.co.il/סניפים/גבעת-שמואל/',
  'שוהם':                            'https://roladin.co.il/סניפים/שוהם-מרכז-מסחרי/',
  'כפר סבא הירוקה':                  'https://roladin.co.il/סניפים/קניון-כפר-סבא-הירוקה/',
  'ירושלים קניון הדר':               'https://roladin.co.il/סניפים/קניון-הדר-ירושלים/',
  'ראש פינה':                        'https://roladin.co.il/סניפים/ראש-פינה/',
  'חדרה קניון עופר':                 'https://roladin.co.il/סניפים/חדרה/',
  "תל אביב איכילוב לאונג' קומה א":  'https://roladin.co.il/סניפים/איכילוב-לאונג-קומה-1/',
  'תל אביב איכילוב מכון הלב':        'https://roladin.co.il/סניפים/איכילוב-מכון-הלב/',
  'קריית גת מרכז BIG':               'https://roladin.co.il/סניפים/גליל-ים-הרצליה-copy/',
  'ירושלים ממילא':                   'https://roladin.co.il/סניפים/ירושלים-ממילא/',
  'גבעתיים בורוכוב':                 'https://roladin.co.il/סניפים/גבעתיים-בורוכוב/',
  'גני תקווה מרכז צים אורבן':        'https://roladin.co.il/סניפים/גני-תקווה-הסניף-ייפתח-בקרוב/',
  'כפר יונה קניון':                  'https://roladin.co.il/סניפים/כפר-יונה-הסניף-ייפתח-בקרוב/',
  'מודיעין ישפרו סנטר':              'https://roladin.co.il/סניפים/מודיעין-ישפרו-סנטר/',
  'קריית אונו קניון אמות':           'https://roladin.co.il/סניפים/קניון-קריית-אונו/',
  'בית חולים וולפסון':               'https://roladin.co.il/סניפים/בית-חולים-וולפסון/',
  'נתניה קניון השרון':               'https://roladin.co.il/סניפים/נתניה/',
  'קריית מוצקין':                    'https://roladin.co.il/סניפים/קריית-מוצקין/',
  "חדרה מול החוף וילג'":             'https://roladin.co.il/סניפים/מול-החוף-וילג/',
  'נהריה':                           'https://roladin.co.il/סניפים/נהריה/',
  'כפר סבא קניון ערים':              'https://roladin.co.il/סניפים/קניון-ערים-כפר-סבא/',
  'מודיעין שכונת מורשת':             'https://roladin.co.il/סניפים/שכונת-מורשת-מודיעין/',
  'קריית מוצקין משכנות האומנים':     'https://roladin.co.il/סניפים/קריית-מוצקין-משכנות-האומנים/',
  'חיפה חוצות המפרץ':                'https://roladin.co.il/סניפים/חוצות-המפרץ-חיפה/',
  'רמת גן ביאליק':                   'https://roladin.co.il/סניפים/רמת-גן-ביאליק/',
  'ירושלים קניון מלחה':              'https://roladin.co.il/סניפים/קניון-מלחה/',
  'כרמיאל':                          'https://roladin.co.il/סניפים/כרמיאל/',
  'עין שמר מתחם אלון':               'https://roladin.co.il/סניפים/עין-שמר/',
  'יוקנעם מרכז BIG':                 'https://roladin.co.il/סניפים/יוקנעם/',
  'שילת':                            'https://roladin.co.il/סניפים/שילת/',
  'מרכז שניידר לרפואת ילדים':        'https://roladin.co.il/סניפים/מרכז-שניידר-לרפואת-ילדים/',
  'חולון שכונה ח300':                'https://roladin.co.il/סניפים/חולון/',
  'גבעתיים קניון עזריאלי':           'https://roladin.co.il/סניפים/סניף-גבעתיים-קניון-גבעתיים/',
  'נס ציונה ישפרו סנטר':             'https://roladin.co.il/סניפים/נס-ציונה-מתחם-ישפרו-סנטר/',
  'ראש העין מרכז שפיר':              'https://roladin.co.il/סניפים/ראש-העין-מרכז-שפיר/',
  'גדרה':                            'https://roladin.co.il/סניפים/גדרה/',
  'רחובות מתחם סנטרו':               'https://roladin.co.il/סניפים/רחובות-מתים-סנטרו/',
  'תל אביב דיזנגוף-זבוטינסקי':      'https://roladin.co.il/סניפים/זבוטינסקי-24-פינת-דיזנגוף/',
  'רמת גן מרום נווה':                'https://roladin.co.il/סניפים/רמת-גן-מרום-נווה/',
  'מעלה אדומים':                     'https://roladin.co.il/סניפים/מעלה-אדומים/',
  'רחובות רכבת':                     'https://roladin.co.il/סניפים/רחובות-רכבת/',
  'ירושלים בית הנציב':               'https://roladin.co.il/סניפים/ירושליםבית-הנציב/',
  'תל אביב איכילוב וייצמן סיטי':    'https://roladin.co.il/סניפים/איכילוב-וייצמן-סיטי/',
  'יהוד קניון סביונים':              'https://roladin.co.il/סניפים/סניף-סביונים-קניון-סביונים/',
  'נתניה קניון עיר ימים':            'https://roladin.co.il/סניפים/נתניה-קניון-עיר-ימים/',
  'תל אביב אופנהיימר':               'https://roladin.co.il/סניפים/אופנהיימר/',
  'ראשל"צ קניון רוטשילד':            'https://roladin.co.il/סניפים/קניון-רוטשילד-ראשון-לציון/',
  'רמת גן קניון איילון':             'https://roladin.co.il/סניפים/רמת-גן-קניון-איילון/',
  'אילת':                            'https://roladin.co.il/סניפים/אילת/',
  'כרמי גת קריית גת':                'https://roladin.co.il/סניפים/כרמי-גת-קרית-גת/',
  'חולון פרימיום סנטר':              'https://roladin.co.il/סניפים/חולון-פרימיום-סנטר/',
  'באר יעקב':                        'https://roladin.co.il/סניפים/באר-יעקב/',
  'רחובות אחוזת הנשיא':              'https://roladin.co.il/סניפים/רחובות-אחוזת-הנשיא/',
  'אור עקיבא אור ים':                'https://roladin.co.il/סניפים/אור-ים/',
  'קריית אתא איקאה':                 'https://roladin.co.il/סניפים/קרית-אתא/',
  'תל אביב קניון עזריאלי':           'https://roladin.co.il/סניפים/קניון-עזריאלי/',
  'הדסה עין כרם':                    'https://roladin.co.il/סניפים/הדסה-עין-כרם/',
  "חיפה צ'ק פוסט":                   'https://roladin.co.il/סניפים/צק-פוסט-חיפה/',
  'ירושלים תחנה מרכזית':             'https://roladin.co.il/סניפים/ירושלים-ממילא-copy/',
  'בני ברק אלייד':                   'https://roladin.co.il/סניפים/בני-ברק/',
  'רחובות קניון עופר':               'https://roladin.co.il/סניפים/קניון-רחובות/',
  'באר שבע גרנד קניון':              'https://roladin.co.il/סניפים/גרנד-קניון-באר-שבע/',
  'פתח תקווה קניון אבנת':            'https://roladin.co.il/סניפים/קניון-אבנת-פתח-תקווה/',
  'באר שבע קניון הנגב':              'https://roladin.co.il/סניפים/קניון-הנגב-בש/',
  'חדרה ויוה':                       'https://roladin.co.il/סניפים/הפתיחה-בקרוב-מתחם-ויוה-חדרה/',
  'מבשרת ציון קניון הראל':           'https://roladin.co.il/סניפים/מבשרת-ציוןקניון-הראל/',
  'מבשרת ציון קניון מבשרת':          'https://roladin.co.il/סניפים/סניף-מבשרת-בקניון-מבשרת/',
  'עפולה סנטר E':                    'https://roladin.co.il/סניפים/עפולה-e-סנטר/',
  'בת ים קניון':                     'https://roladin.co.il/סניפים/קניון-בת-ים/',
  'אשדוד קניון סימול':               'https://roladin.co.il/סניפים/אשדוד/',
};

const KOSHER_TITLES = new Set(Object.keys(KOSHER));

// נרמל שעות
function normalizeHours(h) {
  if (!h) return undefined;
  return h
    .replace(/Fr (\d{2}:\d{2})-sunset[^;]*/g, 'Fr $1-15:00')
    .replace(/Sa sunset[^-]*-(\d{2}:\d{2})/g, 'Sa 21:00-$1')
    .replace(/sunset\+[\d.]+h/g, '21:00')
    .replace(/sunset-[\d.]+h/g, '15:00')
    .replace(/sunset/g, '15:00')
    .replace(/;\s*$/, '')
    .trim() || undefined;
}

// קואורדינטות לפי עיר
const CITY_COORDS = {
  'תל אביב':       { lat: 32.0853, lon: 34.7818 },
  'ירושלים':       { lat: 31.7683, lon: 35.2137 },
  'חיפה':          { lat: 32.7940, lon: 34.9896 },
  'באר שבע':       { lat: 31.2518, lon: 34.7913 },
  'ראשון לציון':   { lat: 31.9730, lon: 34.7898 },
  'פתח תקווה':     { lat: 32.0840, lon: 34.8878 },
  'אשדוד':         { lat: 31.8040, lon: 34.6553 },
  'אשקלון':        { lat: 31.6688, lon: 34.5742 },
  'נתניה':         { lat: 32.3215, lon: 34.8532 },
  'חולון':         { lat: 32.0114, lon: 34.7799 },
  'בני ברק':       { lat: 32.0840, lon: 34.8340 },
  'רמת גן':        { lat: 32.0682, lon: 34.8243 },
  'גבעתיים':       { lat: 32.0680, lon: 34.8126 },
  'בת ים':         { lat: 32.0235, lon: 34.7507 },
  'הרצליה':        { lat: 32.1663, lon: 34.8392 },
  'כפר סבא':       { lat: 32.1781, lon: 34.9075 },
  'מודיעין':       { lat: 31.8966, lon: 35.0102 },
  'עפולה':         { lat: 32.6076, lon: 35.2899 },
  'רחובות':        { lat: 31.8928, lon: 34.8113 },
  'ראש העין':      { lat: 32.0958, lon: 34.9558 },
  'ראש פינה':      { lat: 32.9714, lon: 35.5428 },
  'שוהם':          { lat: 31.9957, lon: 34.9373 },
  'קריית שמונה':   { lat: 33.2076, lon: 35.5709 },
  'קריית מוצקין':  { lat: 32.8367, lon: 35.0831 },
  'קריית גת':      { lat: 31.6100, lon: 34.7641 },
  'קריית אונו':    { lat: 32.0579, lon: 34.8559 },
  'קריית אתא':     { lat: 32.8056, lon: 35.1048 },
  'כרמיאל':        { lat: 32.9115, lon: 35.2974 },
  'נהריה':         { lat: 33.0045, lon: 35.0955 },
  'רמת השרון':     { lat: 32.1465, lon: 34.8406 },
  'רעננה':         { lat: 32.1839, lon: 34.8708 },
  'הוד השרון':     { lat: 32.1508, lon: 34.8896 },
  'גדרה':          { lat: 31.8120, lon: 34.7760 },
  'גן יבנה':       { lat: 31.7870, lon: 34.7045 },
  'גני תקווה':     { lat: 32.0605, lon: 34.8770 },
  'גבעת שמואל':    { lat: 32.0782, lon: 34.8458 },
  'חדרה':          { lat: 32.4340, lon: 34.9187 },
  'חריש':          { lat: 32.4580, lon: 35.0343 },
  'אילת':          { lat: 29.5581, lon: 34.9482 },
  'מעלה אדומים':   { lat: 31.7731, lon: 35.2955 },
  'מבשרת ציון':    { lat: 31.8060, lon: 35.1467 },
  'נס ציונה':      { lat: 31.9285, lon: 34.7982 },
  'יהוד':          { lat: 32.0310, lon: 34.8890 },
  'באר יעקב':      { lat: 31.9363, lon: 34.8386 },
  'כפר יונה':      { lat: 32.3175, lon: 34.9310 },
  'קדימה':         { lat: 32.2820, lon: 34.9163 },
  'אור עקיבא':     { lat: 32.5040, lon: 34.9156 },
  'יוקנעם':        { lat: 32.6575, lon: 35.1004 },
  'עין שמר':       { lat: 32.4550, lon: 35.0220 },
  'שילת':          { lat: 31.8930, lon: 35.0000 },
};

// טען סקרצ'פד
const SCRATCH_PATH = 'C:/Users/User/AppData/Local/Temp/claude/C--Users-User-Desktop-claude-plane/3d5b0d60-6027-4360-b55d-fe1d978d5a05/scratchpad/roladin_branches.json';
const raw = JSON.parse(readFileSync(SCRATCH_PATH).toString('utf8'));

// בנה מפה: address → scratchpad entry (לסניפים כשרים)
const addrToEntry = new Map();
for (const r of raw) {
  if (KOSHER_TITLES.has(r.branchTitle)) {
    addrToEntry.set(r.address, r);
  }
}

// בנה גם מפה לפי branchTitle → scratchpad entry
const titleToEntry = new Map();
for (const r of raw) {
  titleToEntry.set(r.branchTitle, r);
}

function buildNewEntry(r, id) {
  const coords = CITY_COORDS[r.city] || { lat: 31.5, lon: 34.9 };
  return {
    id,
    name: 'רולדין',
    type: 'cafe',
    cityId: r.city,
    address: r.address,
    location: { latitude: coords.lat, longitude: coords.lon },
    locationPrecision: 'address',
    phone: r.phone || undefined,
    website: KOSHER[r.branchTitle],
    instagram: 'https://www.instagram.com/roladin_bakery',
    openingHours: normalizeHours(r.openingHours),
    category: 'dairy',
    kosherType: 'kosher',
    source: 'manual',
  };
}

let idCounter = 9200300;
function makeId() { return String(idCounter++); }

const RPATH = 'src/data/generated/restaurants.osm.json';
const PPATH = 'src/data/generated/places.osm.json';

function process(data) {
  const stats = { updated: 0, fixed: 0, removed: 0, unchanged: 0 };

  // שלב 1: עדכן entries קיימים
  const updated = data.map(entry => {
    if (entry.name !== 'רולדין') return entry;

    const scratchEntry = addrToEntry.get(entry.address);

    if (scratchEntry) {
      // כשר — עדכן עם כל הפרטים
      stats.updated++;
      return {
        ...entry,
        phone: scratchEntry.phone || entry.phone,
        openingHours: normalizeHours(scratchEntry.openingHours) || entry.openingHours,
        website: KOSHER[scratchEntry.branchTitle] || entry.website,
        instagram: 'https://www.instagram.com/roladin_bakery',
        kosherType: 'kosher',
        category: 'dairy',
      };
    }

    // בדוק אם הentry סומן כשר בטעות (כתובתו בסקרצ'פד כ-non-kosher)
    if (entry.kosherType === 'kosher') {
      const nonKosherEntry = raw.find(r => r.address === entry.address && !KOSHER_TITLES.has(r.branchTitle));
      if (nonKosherEntry) {
        stats.removed++;
        const { kosherType, ...rest } = entry;
        return { ...rest, phone: nonKosherEntry.phone || entry.phone, openingHours: normalizeHours(nonKosherEntry.openingHours) || entry.openingHours };
      }
    }

    stats.unchanged++;
    return entry;
  });

  // שלב 2: הוסף סניפים כשרים שחסרים לחלוטין
  const existingAddresses = new Set(data.filter(e => e.name === 'רולדין').map(e => e.address));
  const toAdd = [];

  for (const [title] of Object.entries(KOSHER)) {
    const scratchEntry = titleToEntry.get(title);
    if (!scratchEntry) continue;
    if (existingAddresses.has(scratchEntry.address)) continue;

    toAdd.push(buildNewEntry(scratchEntry, makeId()));
  }

  return { result: [...updated, ...toAdd], stats, added: toAdd.length };
}

const { result: rResult, stats, added } = process(readNoBom(RPATH));
const { result: pResult } = process(readNoBom(PPATH));

writeWithBom(RPATH, rResult);
writeWithBom(PPATH, pResult);

const kosherCount = rResult.filter(e => e.name === 'רולדין' && e.kosherType === 'kosher').length;
const totalRol = rResult.filter(e => e.name === 'רולדין').length;

console.log(`✅ עודכנו: ${stats.updated} | תוקנו (הוסר סימון שגוי): ${stats.removed} | נוספו: ${added}`);
console.log(`סה"כ רולדין: ${totalRol} | כשרים: ${kosherCount} | ללא כשרות: ${totalRol - kosherCount}`);
