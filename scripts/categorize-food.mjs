import { readFileSync, writeFileSync, copyFileSync } from 'fs';

const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);
function readNoBom(p) {
  const buf = readFileSync(p);
  const s = (buf[0]===0xEF&&buf[1]===0xBB&&buf[2]===0xBF) ? buf.slice(3) : buf;
  return JSON.parse(s.toString('utf8'));
}
function writeWithBom(p, data) {
  writeFileSync(p, Buffer.concat([BOM, Buffer.from(JSON.stringify(data, null, 2), 'utf8')]));
}

// ── Rules — order matters: first match wins ──────────────────────────────────

const DAIRY_PATTERNS = [
  /פיצ[הא]/i, /pizza/i,
  /גלידה/i, /gelato/i, /גלידרי/i, /גולדה/i, /golda/i, /קצפת/i, /ice.?cream/i,
  /רולדין/i,
  /ריבר/i, /rebar/i, /river/i,
  /ארומה/i, /aroma/i,
  /לנדוור/i, /landwer/i,
  /קופיקס/i, /coffix/i, /cofix/i, /קוויקס/i,
  /קפה גרג/i, /cafe greg/i,
  /קפה/i, /cafe/i, /coffee/i, /קפה/i,  // generic café = usually dairy
  /קרפ/i, /crepe/i, /crêpe/i,
  /וופל/i, /waffle/i,
  /קונדיטוריה/i, /קנדיטוריה/i,
  /בגל/i, /bagel/i,
  /מאפה/i, /מאפיה/i,
  /עוגה/i, /patisserie/i, /פטיסרי/i, /פטיסריה/i,
  /פסטה/i, /pasta/i,
  /איטליה/i, /italy/i, /italian/i,
  /brasserie/i, /ברסרי/i,
  /breadcafe/i, /bread.cafe/i,
  /ברבוניה/i, // fish restaurant
  /קקאו/i, /cacao/i, /cocoa/i,
  /Cake Art/i, /כיכר/i,
  /ביגה/i, /biga/i,
  /חצ'אפור/i, /khachapuri/i,  // Georgian cheese bread
  /פלורנטינ/i, /florentine/i,
  /il pentolino/i, /קוסטה דל/i,
  /דה לה פה/i,
];

const MEAT_PATTERNS = [
  /בורגר/i, /burger/i, /המבורג/i,
  /שיפוד/i, /שיפודי/i, /שיפודים/i,
  /שווארמ/i, /שאורמ/i, /שוורמ/i,
  /בשר/i, /meat/i,
  /סטייק/i, /steak/i, /אנטריקוט/i, /entrecote/i,
  /מקדונלד/i, /mcdonald/i,
  /להבות/i,
  /בריסקט/i, /brisket/i,
  /גריל/i, /grill/i,
  /ריבס/i, /ribs/i,
  /אסאדו/i,
  /כנפי/i, /wings/i, /ווינג/i, /צ'יקן/i, /chicken/i,
  /שניצל/i, /schnitzel/i,
  /לחמג'ון/i,
  /עראיי/i,  // עראייס = meat-stuffed pita
  /קבב/i, /kebab/i,
  /rotisserie/i,
  /\bBBB\b/i,
  /סמאש/i, /smash/i,
  /300 גרם/i,
  /רד.?מיט/i, /red.?meat/i,
  /פיטמאסטר/i, /pitmaster/i,
  /מנגל/i, /mangal/i,
  /ג'ימי/i,
  /\bBodega\b/i,
  /shipud/i, /shwarma/i, /shawarma/i,
  /ציקן/i,  // chicken
  /\bביף\b/i, /\bbeef\b/i,
  /הבורגנים/i,
  /צלילי.האש/i,
  /להבות/i, /הלהבה/i,
];

const PARVE_PATTERNS = [
  /חומוס/i, /פלאפל/i, /מסבחה/i, /שקשוק/i,
  /סושי/i, /sushi/i,
  /יאקי/i, /oshi/i, /\bjapan\b/i, /יפני/i,
  /אצה/i,  // sushi/seaweed
  /פוקה/i, /poke/i,
  /noodle/i, /נודל/i,
  /wok/i,
  /סביחה/i,
  /כוסכוס/i, /couscous/i,
  /מקסיק/i, /mexican/i, /mexicanas/i,
  /ויטמין/i, /vitamin/i,
  /מיץ/i, /juice/i,
  /ג'פניקה/i,  // Japanese fusion
  /בלו בס/i, /blue bass/i,  // fish restaurant
  /הקוסקוס/i, /כוסכוס/i,
  /סביחה/i,
  /שומשום.בר/i,  // sesame bar - parve
];

// Specific names that override pattern matching
const SPECIFIC_DAIRY = new Set([
  'ReBar ריבר', 'רולדין', 'ארומה', 'לנדוור', 'קופיקס', 'קפה גרג',
]);
const SPECIFIC_MEAT = new Set([
  "מקדונלד'ס", "McDonald's מקדונלד'ס", 'בורגרס בר', 'להבות',
]);

function classify(name) {
  if (!name) return null;
  if (SPECIFIC_DAIRY.has(name)) return 'dairy';
  if (SPECIFIC_MEAT.has(name)) return 'meat';
  if (DAIRY_PATTERNS.some(r => r.test(name))) return 'dairy';
  if (MEAT_PATTERNS.some(r => r.test(name))) return 'meat';
  if (PARVE_PATTERNS.some(r => r.test(name))) return 'parve';
  return null;
}

const FOOD_TYPES = new Set(['restaurant','fast_food','cafe','coffee_cart']);

function processFile(path) {
  const data = readNoBom(path);
  const stats = { dairy:0, meat:0, parve:0, skip:0 };
  const updated = data.map(p => {
    if (!FOOD_TYPES.has(p.type) || p.category) return p; // skip non-food or already categorized
    const cat = classify(p.name);
    if (!cat) { stats.skip++; return p; }
    stats[cat]++;
    return { ...p, category: cat };
  });
  copyFileSync(path, path.replace('.json', '.pre-categorize.backup.json'));
  writeWithBom(path, updated);
  return stats;
}

console.log('=== restaurants.osm.json ===');
const r = processFile('src/data/generated/restaurants.osm.json');
console.log(r);

console.log('=== places.osm.json ===');
const p = processFile('src/data/generated/places.osm.json');
console.log(p);

console.log('\nעדיין ללא קטגוריה (restaurants):');
const rests = readNoBom('src/data/generated/restaurants.osm.json');
rests.filter(x => FOOD_TYPES.has(x.type) && !x.category).forEach(x => console.log(' -', x.name));
