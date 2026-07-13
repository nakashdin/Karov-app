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

// Categories from AI research
const CATEGORIES = [
  {"name":"דודא","category":"meat"},
  {"name":"Levi's Place","category":"meat"},
  {"name":"דבוש","category":"dairy"},
  {"name":"פאפאגאיו","category":"meat"},
  {"name":"Times Square","category":"meat"},
  {"name":"Denis Kingdom","category":"meat"},
  {"name":"מרקש","category":"meat"},
  {"name":"המקום","category":"meat"},
  {"name":"פופא","category":"meat"},
  {"name":"לורנס","category":"meat"},
  {"name":"Retro","category":"meat"},
  {"name":"טרבין","category":"meat"},
  {"name":"המרפסת","category":"dairy"},
  {"name":"פטרוזיליה","category":"dairy"},
  {"name":"מלכה","category":"meat"},
  {"name":"קאסה דל פפה ת\"א","category":"dairy"},
  {"name":"מסעדת עיני-רחל","category":"meat"},
  {"name":"מיטבלים","category":"dairy"},
  {"name":"בלאק","category":"meat"},
  {"name":"קייטרינג תדמית","category":"meat"},
  {"name":"סנדוויצ'ה","category":"meat"},
  {"name":"בטעם הסיני","category":"parve"},
  {"name":"יאשקה","category":"meat"},
  {"name":"הזבוטינסקי","category":"meat"},
  {"name":"סנדביץ' מאמא","category":"meat"},
  {"name":"אסתריקה","category":"dairy"},
  {"name":"מפגש גולני","category":"meat"},
  {"name":"קרנף","category":"meat"},
  {"name":"עממיה","category":"meat"},
  {"name":"קאסה דל פפה","category":"dairy"},
  {"name":"סומסה","category":"parve"},
  {"name":"הערוק","category":"meat"},
  {"name":"אנג'ליקה מסעדת","category":"dairy"},
  {"name":"New Deli","category":"meat"},
  {"name":"מפגש המזל","category":"meat"},
  {"name":"שאקטי","category":"parve"},
  {"name":"מסעדת הבית","category":"meat"},
  {"name":"ויוינו","category":"dairy"},
  {"name":"מסעדת גרסיה","category":"meat"},
  {"name":"Restoran","category":"meat"},
  {"name":"הו מאמא","category":"meat"},
  {"name":"שף עמנואל","category":"meat"},
  {"name":"קזבלן","category":"meat"},
  {"name":"דבוש בסר בני ברק","category":"dairy"},
  {"name":"Kaful","category":"meat"},
  {"name":"הקוסם","category":"meat"},
  {"name":"רחל בשדרה","category":"dairy"},
  {"name":"השפכטל של רחל","category":"dairy"},
  {"name":"טנדור","category":"parve"},
  {"name":"פיתה בסטה","category":"parve"},
  {"name":"Bread Station","category":"dairy"},
  {"name":"מסעדת הנסיך","category":"meat"},
  {"name":"ליאתי","category":"meat"},
  {"name":"כשר למהדריז","category":"meat"},
  {"name":"מיצלי","category":"dairy"},
  {"name":"מסעדת גלילי","category":"meat"},
  {"name":"פאבלה","category":"meat"},
  {"name":"המפגש","category":"meat"},
  {"name":"מיכאל באמצע היום","category":"dairy"},
  {"name":"Hummus Elihau","category":"parve"},
  {"name":"Papa John's","category":"dairy"},
  {"name":"לה קרנה","category":"meat"},
  {"name":"עגבניה","category":"dairy"},
  {"name":"Ruben","category":"meat"},
  {"name":"Panino","category":"meat"},
  {"name":"Farbisen","category":"dairy"},
  {"name":"המטבח","category":"meat"},
  {"name":"נייט שיפט","category":"meat"},
  {"name":"הינוקא","category":"dairy"},
  {"name":"גשן","category":"meat"},
  {"name":"אלמז מנדל","category":"meat"},
  {"name":"נונה","category":"dairy"},
  {"name":"בורקס פנסו","category":"dairy"},
  {"name":"מסעדת שמוליק כהן","category":"meat"},
  {"name":"בורקס מיס","category":"dairy"},
  {"name":"מסעדת ויצמן","category":"meat"},
  {"name":"אבי הגדול","category":"meat"},
  {"name":"איווה","category":"dairy"},
  {"name":"תחנת האוכל","category":"meat"},
  {"name":"מפגש שמש","category":"meat"},
  {"name":"אסתר המלכה","category":"meat"},
  {"name":"זוקו","category":"meat"},
  {"name":"פוקישופ","category":"parve"},
  {"name":"קנסאי","category":"parve"},
  {"name":"פסאדור","category":"meat"},
  {"name":"מידל איסט","category":"parve"},
  {"name":"מי מה מו","category":"dairy"},
  {"name":"הירושלמית","category":"meat"},
  {"name":"בן יעקב","category":"meat"},
  {"name":"דונטלו","category":"dairy"},
  {"name":"קרנה בר","category":"meat"},
  {"name":"באביקה","category":"dairy"},
  {"name":"שרון פול","category":"meat"},
  {"name":"עלמא","category":"dairy"},
  {"name":"פורט 19","category":"meat"},
  {"name":"דומינוס","category":"dairy"},
  {"name":"רובן","category":"meat"},
  {"name":"עדה","category":"dairy"},
  {"name":"יקי'ס","category":"dairy"},
  {"name":"Karve Takeaway","category":"meat"},
  {"name":"כבשה שחורה","category":"meat"},
  {"name":"Panorama","category":"meat"},
  {"name":"Kraus Deli","category":"meat"},
  {"name":"ריבאר","category":"parve"},
];

const catMap = new Map(CATEGORIES.map(c => [c.name, c.category]));
const FOOD_TYPES = new Set(['restaurant','fast_food','cafe','coffee_cart']);

let applied = 0, skipped = 0;

function processArr(arr) {
  return arr.map(p => {
    if (!FOOD_TYPES.has(p.type) || p.category) return p;
    const cat = catMap.get(p.name);
    if (!cat || cat === 'unknown') { skipped++; return p; }
    applied++;
    return { ...p, category: cat };
  });
}

const RPATH = 'src/data/generated/restaurants.osm.json';
const PPATH = 'src/data/generated/places.osm.json';

writeWithBom(RPATH, processArr(readNoBom(RPATH)));
writeWithBom(PPATH, processArr(readNoBom(PPATH)));

console.log(`✅ הוחלו: ${applied} | נדלגו (unknown): ${skipped}`);

// Show remaining uncategorized
const rests = readNoBom(RPATH);
const remaining = rests.filter(p => FOOD_TYPES.has(p.type) && !p.category);
console.log(`נותרו ללא קטגוריה: ${remaining.length}`);
remaining.forEach(p => console.log(' -', p.name, '|', p.cityId));
