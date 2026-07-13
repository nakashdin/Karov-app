/**
 * Assign typical opening hours based on restaurant name/type patterns.
 * Covers places that aren't named chains but follow a recognizable category.
 * All hours assume Israeli kosher business (closed Friday night + Shabbat).
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

// Pattern → typical hours
const TYPE_HOURS = [
  { re: /שיפוד|שיפודי|שיפודים|גריל|grill|מנגל|אסאדו|צלילי|להבות/i, hours: 'Su-Th 12:00-22:00; Fr 12:00-16:00' },
  { re: /שווארמ|שאורמ|שוורמ|shawarma|shwarma/i,                      hours: 'Su-Th 10:00-22:00; Fr 10:00-15:00' },
  { re: /פלאפל|חומוס|מסבחה|hummus|falafel/i,                          hours: 'Su-Th 09:00-20:00; Fr 09:00-14:00' },
  { re: /פיצ|pizza/i,                                                  hours: 'Su-Th 12:00-23:00; Fr 12:00-16:00' },
  { re: /בורגר|burger|המבורג|smash|סמאש|סמאשר/i,                      hours: 'Su-Th 12:00-22:00; Fr 12:00-16:00' },
  { re: /שניצל|schnitzel/i,                                            hours: 'Su-Th 12:00-22:00; Fr 12:00-16:00' },
  { re: /קפה|cafe|coffee|קפה/i,                                        hours: 'Su-Th 08:00-22:00; Fr 08:00-15:00' },
  { re: /גלידה|gelato|ice.?cream|גולדה/i,                              hours: 'Su-Th 11:00-22:00; Fr 10:00-15:00' },
  { re: /סושי|sushi/i,                                                  hours: 'Su-Th 12:00-22:30; Fr 12:00-16:00' },
  { re: /מסעדה|restaurant|restoran/i,                                   hours: 'Su-Th 12:00-22:00; Fr 12:00-16:00' },
  { re: /כנפי|wings|ציקן|chicken/i,                                    hours: 'Su-Th 12:00-22:00; Fr 12:00-16:00' },
  { re: /קרפ|crepe/i,                                                  hours: 'Su-Th 10:00-22:00; Fr 10:00-15:00' },
  { re: /מאפה|מאפיה|לחם|bagel|בגל/i,                                  hours: 'Su-Th 07:00-20:00; Fr 07:00-14:00' },
  { re: /בורקס/i,                                                       hours: 'Su-Th 07:00-18:00; Fr 07:00-14:00' },
];

const FOOD = new Set(['restaurant','fast_food','cafe','coffee_cart']);

function classify(p) {
  for (const rule of TYPE_HOURS) {
    if (rule.re.test(p.name)) return rule.hours;
  }
  // fallback by place type
  if (p.type === 'cafe') return 'Su-Th 08:00-22:00; Fr 08:00-15:00';
  if (p.type === 'fast_food') return 'Su-Th 10:00-22:00; Fr 10:00-15:00';
  if (p.type === 'restaurant') return 'Su-Th 12:00-22:00; Fr 12:00-16:00';
  return null;
}

let added = 0;

function enrich(places) {
  return places.map(p => {
    if (!FOOD.has(p.type) || p.openingHours) return p;
    const h = classify(p);
    if (!h) return p;
    added++;
    return { ...p, openingHours: h };
  });
}

const RPATH = 'src/data/generated/restaurants.osm.json';
const PPATH = 'src/data/generated/places.osm.json';

writeWithBom(RPATH, enrich(readNoBom(RPATH)));
writeWithBom(PPATH, enrich(readNoBom(PPATH)));

// Final audit
const rests = readNoBom(RPATH).filter(p=>FOOD.has(p.type));
const stillMissing = rests.filter(p=>!p.openingHours);
console.log(`✅ נוספו שעות ל-${added} | נותרו ללא שעות: ${stillMissing.length}`);
if (stillMissing.length) stillMissing.forEach(p=>console.log(' -',p.name,'|',p.cityId));
