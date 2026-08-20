import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';

const DATA_PATH = 'src/data/generated/places.osm.json';
const JER = { latitude: 31.7683, longitude: 35.2137 };

function makeId(prefix, key) {
  return prefix + '-' + createHash('md5').update(key).digest('hex').slice(0, 8);
}

const DELETE_OSM = new Set([
  'osm-node-673087388',
  'osm-node-1703978185',
  'osm-node-5245552326',
  'osm-node-6653239687',
  'osm-node-12636593463',
  'osm-node-12639636342',
  'osm-node-13057613010',
  'osm-node-13474038328',
  'osm-node-13594087491',
  'osm-node-13884849098',
]);

const NEW_ENTRIES = [
  {
    id: makeId('jer', 'angelica-jlm'),
    name: "אנג'ליקה",
    type: 'restaurant',
    category: 'meat',
    kosherType: 'mehadrin',
    cityId: 'ירושלים',
    address: "ג'ורג' וושינגטון 4, ירושלים",
    location: JER,
    locationPrecision: 'city',
    phone: '02-6230056',
    openingHours: 'ראשון-חמישי 17:30 עד לקוח אחרון',
    website: 'https://angelicarest.com',
    instagram: 'https://www.instagram.com/angelica_chef_restaurant/',
    facebook: 'https://www.facebook.com/AngelicaRestaurant/',
    description: 'מסעדת שף בשרית יוקרתית שנפתחה ב-2008, הממוקמת לצד מלון קינג דיוויד. המסעדה מציעה מטבח גורמה עם טכניקות צרפתיות, מנות בשר מעולות ורשימת יינות ישראליים מובחרת. מתאימה לארוחות עסקיות, ערבים רומנטיים ואירועים פרטיים.',
    source: 'manual',
    lastVerifiedAt: '2026-08-05',
  },
  {
    id: makeId('jer', 'gan-sipur-jlm'),
    name: 'קפה גן סיפור',
    type: 'cafe',
    category: 'dairy',
    kosherType: 'badatz_beit_yosef',
    cityId: 'ירושלים',
    address: 'גן סאקר, ירושלים',
    location: JER,
    locationPrecision: 'city',
    phone: '072-3360999',
    openingHours: 'ראשון-חמישי 08:00-00:00',
    website: 'https://www.gansipur.co.il',
    facebook: 'https://www.facebook.com/cafegansipurjerusalem/',
    description: 'בית קפה חלבי ציורי בלב גן סאקר בירושלים, שנפתח ב-2018 במבנה אדריכלי מרשים. מגישים ארוחות בוקר, פסטה טרייה, מנות דגים, קינוחים וקפה איטלקי. מקום ידידותי לילדים ולבעלי חיים עם אווירה פסטורלית ייחודית.',
    source: 'manual',
    lastVerifiedAt: '2026-08-05',
  },
  {
    id: makeId('jer', 'pizza-yahli-jlm'),
    name: 'פיצה יהלי סנדויץ',
    type: 'fast_food',
    category: 'dairy',
    kosherType: 'mehadrin',
    cityId: 'ירושלים',
    address: 'רמת הגולן 8, ירושלים',
    location: JER,
    locationPrecision: 'city',
    facebook: 'https://www.facebook.com/pizzayahli/',
    description: 'פיצרייה בשכונת ארנונה ירושלים המגישה פיצות מגוונות וסנדוויצ\'ים. כשר בהשגחת רבנות ירושלים ובד"ץ אגודת חסידים. מתאים לארוחה מהירה ומשביעה בשכונה.',
    source: 'manual',
    lastVerifiedAt: '2026-08-05',
  },
  {
    id: makeId('jer', 'katsefet-paran9-jlm'),
    name: 'קצפת',
    type: 'ice_cream_parlor',
    category: 'dairy',
    kosherType: 'badatz_rubin',
    cityId: 'ירושלים',
    address: 'פארן 9, ירושלים',
    location: JER,
    locationPrecision: 'city',
    phone: '02-6253722',
    openingHours: 'א-ה 09:00-23:30, ו 08:30 עד לפני שבת',
    website: 'https://katsefet.co.il',
    instagram: 'https://www.instagram.com/katsefet_gelateria/',
    facebook: 'https://www.facebook.com/Katzefet.Ice.Cream/',
    description: 'סניף ברמת אשכול של רשת גלידריות ותיקה הפועלת מאז 1991, עם עשרות סניפים ברחבי הארץ. מציעה גלידות איכותיות, פרוזן יוגורט, שייקי פירות וקינוחים חמים כגון וופלים בלגיים וקרפים. הכל כשר למהדרין בהשגחת הרב רובין.',
    source: 'manual',
    lastVerifiedAt: '2026-08-05',
  },
  {
    id: makeId('jer', 'bigapple-paran9-jlm'),
    name: 'ביג אפל פיצה',
    type: 'fast_food',
    category: 'dairy',
    kosherType: 'badatz_rubin',
    cityId: 'ירושלים',
    address: 'פארן 9, ירושלים',
    location: JER,
    locationPrecision: 'city',
    phone: '02-5327798',
    website: 'https://www.bigapplepizza.co.il',
    menu: 'https://www.bigapplepizza.co.il/en/menu/',
    description: 'סניף ברמת אשכול של רשת פיצה ירושלמית שנוסדה ב-1986, אחת הרשתות הוותיקות בעיר. מגישים פיצות טריות עם שלל טופינגים בהשגחת רבנות ירושלים ובד"ץ מהדרין הרב רובין. אפשרות לאכילה במקום ומשלוחים לכל אזורי ירושלים.',
    source: 'manual',
    lastVerifiedAt: '2026-08-05',
  },
  {
    id: makeId('jer', 'pizza-rimini-jlm'),
    name: 'פיצה רמיני פלוס',
    type: 'fast_food',
    category: 'dairy',
    kosherType: 'rabanut_mehadrin_jerusalem',
    cityId: 'ירושלים',
    address: 'פארן 11, ירושלים',
    location: JER,
    locationPrecision: 'city',
    facebook: 'https://www.facebook.com/p/Pizza-Rimini-Plus-100054447911370/',
    description: 'פיצרייה חלבית בשכונת רמת אשכול ירושלים המגישה פיצות מגוונות. כשר בהשגחת הרבנות הראשית לירושלים מהדרין. פיצרייה שכונתית אהובה עם קהל קבוע.',
    source: 'manual',
    lastVerifiedAt: '2026-08-05',
  },
  {
    id: makeId('jer', 'karve-tuval1-jlm'),
    name: 'Karve Takeaway',
    type: 'restaurant',
    category: 'meat',
    kosherType: 'badatz_edah',
    cityId: 'ירושלים',
    address: 'תובל 1, ירושלים',
    location: JER,
    locationPrecision: 'city',
    phone: '053-5000014',
    website: 'https://karvedeli.com',
    instagram: 'https://www.instagram.com/yoelissmokehouse/',
    facebook: 'https://www.facebook.com/Yoelis.Smoke.House',
    description: 'בית עשן בוטיקי ירושלמי המתמחה בבשרים מעושנים בטכניקות אומנותיות - פסטרמי, נקניקיות ביתיות, בשר מיושן, שרקוטרי ודגים מעושנים. כל המוצרים מוכנים טרי לפי הזמנה בהשגחת בד"ץ עדה חרדית. משלוחים זמינים לכל הארץ.',
    source: 'manual',
    lastVerifiedAt: '2026-08-05',
  },
  {
    id: makeId('jer', 'shabbos-bistro-jlm'),
    name: 'שאבעסBISTRO',
    type: 'restaurant',
    category: 'meat',
    kosherType: 'badatz_kehilot',
    cityId: 'ירושלים',
    address: 'אבן שפרוט 5, ירושלים',
    location: JER,
    locationPrecision: 'city',
    phone: '054-8777347',
    instagram: 'https://www.instagram.com/shabbos.bistro/',
    facebook: 'https://www.facebook.com/p/%D7%A9%D7%90%D7%91%D7%A2%D7%A1-%D7%91%D7%99%D7%A1%D7%98%D7%A8%D7%95-100054266510563/',
    description: 'מעדניית שבת בוטיקית ברחביה ירושלים המתמחה במאכלי שבת ביתיים - חמין ירושלמי במגוון טעמים, קוגלים, דגים, סלטים וכבד קצוץ ביתי. כשר בהשגחת רבנות ירושלים ובד"ץ קהילות. הזמנות מראש נדרשות לאיסוף לשבת.',
    source: 'manual',
    lastVerifiedAt: '2026-08-05',
  },
];

const raw = readFileSync(DATA_PATH, 'utf8').replace(/^﻿/, '');
const data = JSON.parse(raw);

const before = data.length;
const filtered = data.filter(p => !DELETE_OSM.has(p.id));
const finalData = [...filtered, ...NEW_ENTRIES];

writeFileSync(DATA_PATH, JSON.stringify(finalData, null, 2), 'utf8');

console.log('Before: ' + before);
console.log('Deleted OSM: ' + (before - filtered.length));
console.log('Added: ' + NEW_ENTRIES.length);
console.log('Final: ' + finalData.length);