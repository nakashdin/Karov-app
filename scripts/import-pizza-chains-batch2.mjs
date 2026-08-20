/**
 * Import pizza chains batch 2:
 * - פיצה רומא (10 סניפים חדשים, שוהם כבר קיים ותוקן)
 * - דומינוס (10 סניפים כשרים, עם שמות מפורטים לפי סניף)
 * - פיצה פרגו (20 סניפים)
 * - פאפא ג'ונס (8 סניפים)
 */
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data/generated');
const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

function makeId(prefix, name) {
  return prefix + '-' + createHash('md5').update(name).digest('hex').slice(0, 8);
}
function buildPlace(b) {
  const p = {
    id: makeId(b.prefix, b.name),
    name: b.name,
    type: 'fast_food',
    cityId: b.city,
    address: b.address,
    location: { latitude: b.lat, longitude: b.lng },
    openingHours: b.hours,
    category: 'dairy',
    kosherType: b.kosher,
    tags: ['pizza'],
    source: 'manual',
    lastVerifiedAt: '2026-07-24',
  };
  if (b.phone)     p.phone     = b.phone;
  if (b.website)   p.website   = b.website;
  if (b.sourceUrl) p.sourceUrl = b.sourceUrl;
  return p;
}
function readJson(p) {
  const raw = readFileSync(p);
  const str = raw[0] === 0xEF ? raw.slice(3).toString('utf8') : raw.toString('utf8');
  return JSON.parse(str);
}
function writeJson(p, data) {
  writeFileSync(p, Buffer.concat([BOM, Buffer.from(JSON.stringify(data, null, 2), 'utf8')]));
}
function mergeInto(existing, newRecords) {
  const existingIds = new Set(existing.map(r => r.id));
  const toAdd = newRecords.filter(r => !existingIds.has(r.id));
  return { merged: [...existing, ...toAdd], added: toAdd.length, skipped: newRecords.length - toAdd.length };
}

const PLACES = [
  // ══════════════════════════════════════
  // פיצה רומא — חלבי (שוהם כבר קיים)
  // ══════════════════════════════════════
  {
    prefix: 'pizza-roma', name: 'פיצה רומא עכו',
    city: 'עכו', address: 'נחליאלי 4, עכו',
    phone: '04-9916110', lat: 32.9270, lng: 35.0719,
    hours: "א'-ה' 10:00-00:00 | ו' סגור | ש' מוצ\"ש עד 00:00",
    kosher: 'badatz_beit_yosef', website: 'https://pizza-roma.co.il',
  },
  {
    prefix: 'pizza-roma', name: 'פיצה רומא גדרה',
    city: 'גדרה', address: 'שדרות מנחם בגין 42, גדרה',
    phone: '08-8596566', lat: 31.8068, lng: 34.7816,
    hours: "א'-ה' 10:00-00:00 | ו' 10:00-15:00 | ש' מוצ\"ש עד 00:00",
    kosher: 'rabanut', website: 'https://pizza-roma.co.il',
  },
  {
    prefix: 'pizza-roma', name: 'פיצה רומא רמת גן',
    city: 'רמת גן', address: 'בן גוריון 12, רמת גן',
    phone: '03-6725577', lat: 32.0789, lng: 34.8141,
    hours: "א'-ה' 11:30-00:00 | ו' לבדוק מול המסעדה | ש' מוצ\"ש",
    kosher: 'mehadrin', website: 'https://pizza-roma.co.il',
  },
  {
    prefix: 'pizza-roma', name: 'פיצה רומא ראשון לציון',
    city: 'ראשון לציון', address: 'רוטשילד 85, ראשון לציון',
    phone: '03-9666201', lat: 31.9694, lng: 34.8014,
    hours: "א'-ה' 10:30-01:30 | ו' לבדוק מול המסעדה | ש' מוצ\"ש עד 01:30",
    kosher: 'rabanut', website: 'https://pizza-roma.co.il',
  },
  {
    prefix: 'pizza-roma', name: 'פיצה רומא חולון',
    city: 'חולון', address: 'שאלתיאל דוד 16, חולון',
    phone: '03-5512787', lat: 32.0160, lng: 34.7713,
    hours: "א'-ה' 11:00-22:45 | ו' לבדוק מול המסעדה | ש' מוצ\"ש עד 22:50",
    kosher: 'rabanut', website: 'https://pizza-roma.co.il',
  },
  {
    prefix: 'pizza-roma', name: 'פיצה רומא הרצליה',
    city: 'הרצליה', address: "שדרות אבא אבן 1, הרצליה",
    phone: '09-9517676', lat: 32.1648, lng: 34.8372,
    hours: "א'-ה' 11:00-22:30 | ו' 11:00-15:00 | ש' מוצ\"ש עד 23:30",
    kosher: 'rabanut', website: 'https://pizza-roma.co.il',
  },
  {
    prefix: 'pizza-roma', name: 'פיצה רומא רחובות',
    city: 'רחובות', address: "שדרות פנחס בן דוד קפרא 1, רחובות",
    phone: '08-9370410', lat: 31.8983, lng: 34.8109,
    hours: "א'-ה' 11:00-22:30 | ו' 11:00-14:00 | ש' מוצ\"ש",
    kosher: 'rabanut', website: 'https://pizza-roma.co.il',
  },
  {
    prefix: 'pizza-roma', name: 'פיצה רומא קריית גת',
    city: 'קריית גת', address: 'שדרות לכיש 63, קריית גת',
    phone: '08-6888563', lat: 31.6117, lng: 34.7699,
    hours: "א'-ה' עד 01:00 | ו' לבדוק מול המסעדה | ש' מוצ\"ש",
    kosher: 'mehadrin', website: 'https://pizza-roma.co.il',
  },
  {
    prefix: 'pizza-roma', name: 'פיצה רומא שדרות',
    city: 'שדרות', address: 'בן יהודה 4, שדרות',
    phone: '076-8619898', lat: 31.5288, lng: 34.5954,
    hours: "א'-ד' 11:30-03:00 | ה' 11:30-04:00 | ו' סגור | ש' מוצ\"ש עד 04:00",
    kosher: 'rabanut', website: 'https://pizza-roma.co.il',
  },
  {
    prefix: 'pizza-roma', name: 'פיצה רומא בית שאן',
    city: 'בית שאן', address: 'שאול המלך 74, בית שאן',
    phone: '053-9367819', lat: 32.5020, lng: 35.4928,
    hours: "א'-ה' 07:30-19:30 | ו' 09:00-13:00 | ש' סגור",
    kosher: 'mehadrin', website: 'https://pizza-roma.co.il',
  },

  // ══════════════════════════════════════
  // דומינוס — חלבי (שמות מפורטים לפי סניף)
  // ══════════════════════════════════════
  {
    prefix: 'dominos-v2', name: "דומינוס תל אביב הירקון",
    city: 'תל אביב', address: "כ\"ג יורדי הסירה 10, נמל תל אביב",
    phone: '1-700-707-070', lat: 32.1019, lng: 34.7842,
    hours: "א'-ה' 12:00-00:00 | ו' לבדוק מול המסעדה | ש' מוצ\"ש",
    kosher: 'badatz_beit_yosef', website: 'https://www.dominos.co.il',
    sourceUrl: 'https://www.dominos.co.il/branches',
  },
  {
    prefix: 'dominos-v2', name: "דומינוס פתח תקווה שטמפפר",
    city: 'פתח תקווה', address: 'יהושע שטמפפר 73, פתח תקווה',
    phone: '076-804-8974', lat: 32.0916, lng: 34.8892,
    hours: "א'-ה' 12:00-23:50 | ו' 12:00-15:00 | ש' מוצ\"ש עד 23:50",
    kosher: 'mehadrin', website: 'https://www.dominos.co.il',
    sourceUrl: 'https://www.dominos.co.il/branches',
  },
  {
    prefix: 'dominos-v2', name: "דומינוס פתח תקווה כפר גנים",
    city: 'פתח תקווה', address: 'העצמאות 65, קניון גנים, פתח תקווה',
    phone: '076-804-8974', lat: 32.0892, lng: 34.8783,
    hours: "א'-ה' 12:00-23:30 | ו' 12:00-15:30 | ש' 19:00-23:30",
    kosher: 'mehadrin', website: 'https://www.dominos.co.il',
    sourceUrl: 'https://www.dominos.co.il/branches',
  },
  {
    prefix: 'dominos-v2', name: "דומינוס פתח תקווה אם המושבות",
    city: 'פתח תקווה', address: 'ראשון לציון 1, פתח תקווה',
    phone: '076-804-8974', lat: 32.0889, lng: 34.8832,
    hours: "א'-ה' 12:00-23:30 | ו' 11:30-14:55 | ש' מוצ\"ש עד 23:55",
    kosher: 'mehadrin', website: 'https://www.dominos.co.il',
    sourceUrl: 'https://www.dominos.co.il/branches',
  },
  {
    prefix: 'dominos-v2', name: "דומינוס גבעתיים",
    city: 'גבעתיים', address: 'בורוכוב 52, גבעתיים',
    phone: '076-804-8974', lat: 32.0735, lng: 34.8098,
    hours: "א'-ה' 12:00-23:30 | ו' 12:00-15:00 | ש' מוצ\"ש",
    kosher: 'badatz_beit_yosef', website: 'https://www.dominos.co.il',
    sourceUrl: 'https://www.dominos.co.il/branches',
  },
  {
    prefix: 'dominos-v2', name: "דומינוס חולון פארק פרס",
    city: 'חולון', address: "שד' ירושלים 216, פארק פרס, חולון",
    phone: '076-804-8974', lat: 32.0044, lng: 34.7661,
    hours: "א'-ה' 12:00-23:50 | ו' 12:00-15:00 | ש' מוצ\"ש עד 23:50",
    kosher: 'badatz_beit_yosef', website: 'https://www.dominos.co.il',
    sourceUrl: 'https://www.dominos.co.il/branches',
  },
  {
    prefix: 'dominos-v2', name: "דומינוס אשדוד",
    city: 'אשדוד', address: 'הציונות 11, אשדוד',
    phone: '1-700-707-070', lat: 31.8028, lng: 34.6490,
    hours: "א'-ה' 12:00-23:30 | ו' 12:00-15:00 | ש' 18:55-23:30",
    kosher: 'badatz_beit_yosef', website: 'https://www.dominos.co.il',
    sourceUrl: 'https://www.dominos.co.il/branches',
  },
  {
    prefix: 'dominos-v2', name: "דומינוס אשקלון",
    city: 'אשקלון', address: "שד' ירושלים 119, אשקלון",
    phone: '1-700-707-070', lat: 31.6760, lng: 34.5699,
    hours: "א'-ה' 12:00-00:00 | ו' 11:00-15:00 | ש' מוצ\"ש עד 00:00",
    kosher: 'badatz_beit_yosef', website: 'https://www.dominos.co.il',
    sourceUrl: 'https://www.dominos.co.il/branches',
  },
  {
    prefix: 'dominos-v2', name: "דומינוס עפולה",
    city: 'עפולה', address: "שד' יצחק רבין 20, עפולה",
    phone: '076-804-8963', lat: 32.6054, lng: 35.2891,
    hours: "א'-ה' 12:00-23:45 | ו' 11:00-15:00 | ש' מוצ\"ש עד 23:45",
    kosher: 'badatz_beit_yosef', website: 'https://www.dominos.co.il',
    sourceUrl: 'https://www.dominos.co.il/branches',
  },
  {
    prefix: 'dominos-v2', name: "דומינוס קריית ביאליק",
    city: 'קריית ביאליק', address: "שד' ירושלים 1, קריית ביאליק",
    phone: '1-700-707-070', lat: 32.8313, lng: 35.0728,
    hours: "א'-ה' 12:00-23:45 | ו' 12:00-15:00 | ש' מוצ\"ש עד 23:45",
    kosher: 'badatz_beit_yosef', website: 'https://www.dominos.co.il',
    sourceUrl: 'https://www.dominos.co.il/branches',
  },

  // ══════════════════════════════════════
  // פיצה פרגו — חלבי
  // ══════════════════════════════════════
  {
    prefix: 'prego', name: 'פיצה פרגו קריית אתא',
    city: 'קריית אתא', address: 'דוכיפת 3, קריית אתא',
    phone: '04-8487777', lat: 32.8015, lng: 35.0952,
    hours: "א'-ה' 11:00-23:00 | ו' עד כניסת שבת | ש' מוצ\"ש עד 23:00",
    kosher: 'rabanut_mehadrin', website: 'https://www.prego.co.il',
    sourceUrl: 'https://www.prego.co.il/branch/',
  },
  {
    prefix: 'prego', name: 'פיצה פרגו חולון וולפסון',
    city: 'חולון', address: 'הלוחמים 62, קניון וולפסון, חולון',
    phone: '053-8092893', lat: 32.0125, lng: 34.7810,
    hours: "א'-ה' 11:00-23:00 | ו' עד כניסת שבת | ש' סגור",
    kosher: 'badatz_beit_yosef', website: 'https://www.prego.co.il',
    sourceUrl: 'https://www.prego.co.il/branch/',
  },
  {
    prefix: 'prego', name: 'פיצה פרגו תל אביב קרליבך',
    city: 'תל אביב', address: 'קרליבך 12, תל אביב',
    phone: '03-7444101', lat: 32.0789, lng: 34.7843,
    hours: "א'-ה' 11:00-00:00 | ו' 11:00-15:00 | ש' מוצ\"ש עד 00:00",
    kosher: 'rabanut', website: 'https://www.prego.co.il',
    sourceUrl: 'https://www.prego.co.il/branch/',
  },
  {
    prefix: 'prego', name: 'פיצה פרגו תל אביב שיכון דן',
    city: 'תל אביב', address: 'פנחס רוזן 72, מרכז טופ-דן, תל אביב',
    phone: '03-9509506', lat: 32.1078, lng: 34.8018,
    hours: "א'-ה' 11:00-00:30 | ו' עד חצי שעה לפני שבת | ש' מוצ\"ש",
    kosher: 'badatz_beit_yosef', website: 'https://www.prego.co.il',
    sourceUrl: 'https://www.prego.co.il/branch/',
  },
  {
    prefix: 'prego', name: 'פיצה פרגו ראשון לציון לישנסקי',
    city: 'ראשון לציון', address: 'יוסף לישנסקי 27, ראשון לציון',
    phone: '03-9410808', lat: 31.9762, lng: 34.8122,
    hours: "א'-ה' 10:30-00:00 | ו' 10:30-17:00 | ש' 20:00-00:00",
    kosher: 'badatz_beit_yosef', website: 'https://www.prego.co.il',
    sourceUrl: 'https://www.prego.co.il/branch/',
  },
  {
    prefix: 'prego', name: 'פיצה פרגו גבעתיים',
    city: 'גבעתיים', address: 'כצנלסון 28, גבעתיים',
    phone: '03-5731111', lat: 32.0708, lng: 34.8107,
    hours: "א'-ה' 09:30-23:45 | ו' עד כניסת שבת | ש' מוצ\"ש עד 02:00",
    kosher: 'badatz_beit_yosef', website: 'https://www.prego.co.il',
    sourceUrl: 'https://www.prego.co.il/branch/',
  },
  {
    prefix: 'prego', name: 'פיצה פרגו יהוד',
    city: 'יהוד', address: 'דרך משה דיין 3, יהוד',
    phone: '03-9212122', lat: 32.0344, lng: 34.8886,
    hours: "א'-ה' 09:00-23:00 | ו' עד כניסת שבת | ש' מוצ\"ש עד 23:00",
    kosher: 'rabanut_mehadrin', website: 'https://www.prego.co.il',
    sourceUrl: 'https://www.prego.co.il/branch/',
  },
  {
    prefix: 'prego', name: 'פיצה פרגו ראשון לציון הרצל',
    city: 'ראשון לציון', address: 'הרצל 18, ראשון לציון',
    phone: '03-9566662', lat: 31.9713, lng: 34.8027,
    hours: "א'-ה' 11:00-23:00 | ו' עד כניסת שבת | ש' מוצ\"ש עד 00:00",
    kosher: 'badatz_beit_yosef', website: 'https://www.prego.co.il',
    sourceUrl: 'https://www.prego.co.il/branch/',
  },
  {
    prefix: 'prego', name: 'פיצה פרגו ראשון לציון אשלים',
    city: 'ראשון לציון', address: 'התזמורת 29, נאות אשלים, ראשון לציון',
    phone: '03-9566662', lat: 31.9885, lng: 34.8177,
    hours: "א'-ה' 11:00-23:00 | ו' 11:30 עד כניסת שבת | ש' מוצ\"ש עד 00:30",
    kosher: 'rabanut', website: 'https://www.prego.co.il',
    sourceUrl: 'https://www.prego.co.il/branch/',
  },
  {
    prefix: 'prego', name: 'פיצה פרגו נס ציונה',
    city: 'נס ציונה', address: 'הבנים 87, נס ציונה',
    phone: '08-9401292', lat: 31.9334, lng: 34.7938,
    hours: "א'-ה' 11:00-23:00 | ו' עד כניסת שבת | ש' מוצ\"ש עד 23:00",
    kosher: 'badatz_beit_yosef', website: 'https://www.prego.co.il',
    sourceUrl: 'https://www.prego.co.il/branch/',
  },
  {
    prefix: 'prego', name: 'פיצה פרגו באר יעקב',
    city: 'באר יעקב', address: 'יצחק שמיר 16, באר יעקב',
    lat: 31.9443, lng: 34.8392,
    hours: "א'-ה' 11:00-23:00 | ו' עד כניסת שבת | ש' מוצ\"ש",
    kosher: 'badatz_beit_yosef', website: 'https://www.prego.co.il',
    sourceUrl: 'https://www.prego.co.il/branch/',
  },
  {
    prefix: 'prego', name: 'פיצה פרגו רחובות',
    city: 'רחובות', address: 'הר הצופים 74, רחובות',
    phone: '08-9464464', lat: 31.8978, lng: 34.8178,
    hours: "א'-ה' 11:00-23:00 | ו' עד כניסת שבת | ש' מוצ\"ש עד 23:00",
    kosher: 'badatz_beit_yosef', website: 'https://www.prego.co.il',
    sourceUrl: 'https://www.prego.co.il/branch/',
  },
  {
    prefix: 'prego', name: 'פיצה פרגו מודיעין',
    city: 'מודיעין', address: 'לאה אמנו 1, מודיעין',
    phone: '08-6485051', lat: 31.8944, lng: 35.0056,
    hours: "א'-ה' 11:00-23:00 | ו' 10:30-14:30 | ש' 18:00-23:00",
    kosher: 'badatz_beit_yosef', website: 'https://www.prego.co.il',
    sourceUrl: 'https://www.prego.co.il/branch/',
  },
  {
    prefix: 'prego', name: 'פיצה פרגו מבשרת ציון',
    city: 'מבשרת ציון', address: 'הראל 100, מבשרת ציון',
    phone: '02-6333990', lat: 31.8009, lng: 35.1457,
    hours: "א'-ה' 11:00-23:00 | ו' 11:00-16:00 | ש' מוצ\"ש עד 00:00",
    kosher: 'rabanut', website: 'https://www.prego.co.il',
    sourceUrl: 'https://www.prego.co.il/branch/',
  },
  {
    prefix: 'prego', name: 'פיצה פרגו גדרה',
    city: 'גדרה', address: 'מנחם בגין 48, גדרה',
    phone: '08-6656685', lat: 31.8071, lng: 34.7813,
    hours: "א'-ה' 11:00-23:00 | ו' עד כניסת שבת | ש' מוצ\"ש עד 23:00",
    kosher: 'rabanut_mehadrin', website: 'https://www.prego.co.il',
    sourceUrl: 'https://www.prego.co.il/branch/',
  },
  {
    prefix: 'prego', name: 'פיצה פרגו אשדוד',
    city: 'אשדוד', address: 'הגדוד העברי 1, אשדוד',
    phone: '08-8667000', lat: 31.7963, lng: 34.6570,
    hours: "א'-ה' 10:30-00:30 | ו' עד שעה לפני שבת | ש' מוצ\"ש עד 00:30",
    kosher: 'badatz_beit_yosef', website: 'https://www.prego.co.il',
    sourceUrl: 'https://www.prego.co.il/branch/',
  },
  {
    prefix: 'prego', name: 'פיצה פרגו אריאל',
    city: 'אריאל', address: 'הבנאי 6, אריאל',
    phone: '03-6885155', lat: 32.1063, lng: 35.1724,
    hours: "א'-ה' 11:00-23:00 | ו' עד כניסת שבת | ש' מוצ\"ש",
    kosher: 'rabanut_mehadrin', website: 'https://www.prego.co.il',
    sourceUrl: 'https://www.prego.co.il/branch/',
  },
  {
    prefix: 'prego', name: 'פיצה פרגו אור עקיבא',
    city: 'אור עקיבא', address: "שדרות הנשיא ויצמן 4, אור עקיבא",
    phone: '04-6224242', lat: 32.5019, lng: 34.9376,
    hours: "א'-ה' 11:00-23:00 | ו' 10:00-14:00 | ש' מוצ\"ש עד 00:00",
    kosher: 'badatz_beit_yosef', website: 'https://www.prego.co.il',
    sourceUrl: 'https://www.prego.co.il/branch/',
  },
  {
    prefix: 'prego', name: 'פיצה פרגו חדרה',
    city: 'חדרה', address: 'גמלא 3, חדרה',
    phone: '04-6668833', lat: 32.4384, lng: 34.9214,
    hours: "א'-ה' 11:00-23:15 | ו' עד כניסת שבת | ש' מוצ\"ש",
    kosher: 'rabanut_mehadrin', website: 'https://www.prego.co.il',
    sourceUrl: 'https://www.prego.co.il/branch/',
  },
  {
    prefix: 'prego', name: 'פיצה פרגו אילת',
    city: 'אילת', address: 'מרכז מור 1, אילת',
    phone: '08-8530044', lat: 29.5581, lng: 34.9509,
    hours: "א'-ה' 11:00-00:00 | ו' עד כניסת שבת | ש' מוצ\"ש עד 00:00",
    kosher: 'mehadrin', website: 'https://www.prego.co.il',
    sourceUrl: 'https://www.prego.co.il/branch/',
  },

  // ══════════════════════════════════════
  // פאפא ג'ונס — חלבי
  // ══════════════════════════════════════
  {
    prefix: 'papa-johns', name: "פאפא ג'ונס ירושלים קרן היסוד",
    city: 'ירושלים', address: 'קרן היסוד 38, ירושלים',
    phone: '079-736-7051', lat: 31.7722, lng: 35.2155,
    hours: "א'-ה' 12:00-00:00 | ו' 12:00 עד כניסת שבת | ש' סגור",
    kosher: 'rabanut_mehadrin_jerusalem', website: 'https://www.papajohns.co.il',
    sourceUrl: 'https://www.papajohns.co.il/branch/',
  },
  {
    prefix: 'papa-johns', name: "פאפא ג'ונס ירושלים גבעת רם",
    city: 'ירושלים', address: 'ישעיהו ליבוביץ 28, גבעת רם, ירושלים',
    lat: 31.7768, lng: 35.1974,
    hours: "א'-ה' 12:00-00:00 | ו' עד כניסת שבת | ש' מוצ\"ש",
    kosher: 'rabanut_mehadrin_jerusalem', website: 'https://www.papajohns.co.il',
    sourceUrl: 'https://www.papajohns.co.il/branch/',
  },
  {
    prefix: 'papa-johns', name: "פאפא ג'ונס פתח תקווה",
    city: 'פתח תקווה', address: 'תוצרת הארץ 3, פתח תקווה',
    phone: '03-3029755', lat: 32.0917, lng: 34.8723,
    hours: "א'-ה' 12:00-00:00 | ו' 12:00 עד שעה לפני שבת | ש' מוצ\"ש עד 00:00",
    kosher: 'rabanut', website: 'https://www.papajohns.co.il',
    sourceUrl: 'https://www.papajohns.co.il/branch/',
  },
  {
    prefix: 'papa-johns', name: "פאפא ג'ונס רמת אפעל",
    city: 'רמת גן', address: 'דרך שיבא 10, רמת אפעל',
    lat: 32.0545, lng: 34.8603,
    hours: "א'-ה' 12:00-00:00 | ו' עד כניסת שבת | ש' מוצ\"ש",
    kosher: 'mehadrin', website: 'https://www.papajohns.co.il',
    sourceUrl: 'https://www.papajohns.co.il/branch/',
  },
  {
    prefix: 'papa-johns', name: "פאפא ג'ונס יהוד",
    city: 'יהוד', address: 'אורי מקלב 8, יהוד',
    phone: '03-5176999', lat: 32.0330, lng: 34.8889,
    hours: "א'-ה' 12:00-00:00 | ו' עד כניסת שבת | ש' מוצ\"ש",
    kosher: 'mehadrin', website: 'https://www.papajohns.co.il',
    sourceUrl: 'https://www.papajohns.co.il/branch/',
  },
  {
    prefix: 'papa-johns', name: "פאפא ג'ונס מודיעין",
    city: 'מודיעין', address: 'דם המכבים 32, מודיעין',
    phone: '*6699', lat: 31.8932, lng: 35.0091,
    hours: "א'-ה' 12:00-00:00 | ו' עד כניסת שבת | ש' מוצ\"ש עד 00:00",
    kosher: 'mehadrin', website: 'https://www.papajohns.co.il',
    sourceUrl: 'https://www.papajohns.co.il/branch/',
  },
  {
    prefix: 'papa-johns', name: "פאפא ג'ונס גדרה",
    city: 'גדרה', address: "שדרות בן גוריון 105, גדרה",
    lat: 31.8071, lng: 34.7818,
    hours: "א'-ה' 12:00-00:00 | ו' 12:00 עד שעה לפני שבת | ש' מוצ\"ש עד 00:00",
    kosher: 'rabanut', website: 'https://www.papajohns.co.il',
    sourceUrl: 'https://www.papajohns.co.il/branch/',
  },
  {
    prefix: 'papa-johns', name: "פאפא ג'ונס קריית אתא",
    city: 'קריית אתא', address: "שדרות ההסתדרות 271, קריית אתא",
    phone: '053-6560106', lat: 32.8043, lng: 35.1038,
    hours: "א'-ה' 12:00-00:00 | ו' עד כניסת שבת | ש' מוצ\"ש",
    kosher: 'mehadrin', website: 'https://www.papajohns.co.il',
    sourceUrl: 'https://www.papajohns.co.il/branch/',
  },
];

console.log('=== Import Pizza Chains Batch 2 ===');
const places = PLACES.map(buildPlace);

const byChain = {};
for (const p of places) {
  const chain = p.name.split(' ').slice(0, 2).join(' ');
  byChain[chain] = (byChain[chain] || 0) + 1;
}
console.log('רשומות שהוכנו:');
for (const [k, v] of Object.entries(byChain)) console.log(`  ${k}: ${v}`);

for (const filePath of [
  path.join(DATA_DIR, 'restaurants.osm.json'),
  path.join(DATA_DIR, 'places.osm.json'),
]) {
  const data = readJson(filePath);
  const { merged, added, skipped } = mergeInto(data, places);
  writeJson(filePath, merged);
  console.log(`${path.basename(filePath)}: +${added} added, ${skipped} skipped, total: ${merged.length}`);
}
console.log('Done!');
