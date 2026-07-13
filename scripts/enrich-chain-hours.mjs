/**
 * Add default opening hours for major chains (all branches that lack hours).
 * Hours are in OSM format: Su-Th = Sun–Thu (Israeli work week).
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

// name patterns → default hours (OSM format)
// Su=ראשון Mo=שני Tu=שלישי We=רביעי Th=חמישי Fr=שישי Sa=שבת
const CHAIN_HOURS = [
  { names: ['ארומה'],                        hours: 'Su-Th 07:00-22:00; Fr 07:00-15:00' },
  { names: ["מקדונלד'ס","McDonald's מקדונלד'ס"], hours: 'Su-Th 08:00-23:00; Fr 08:00-16:00' },
  { names: ['בורגרס בר'],                    hours: 'Su-Th 12:00-22:00; Fr 12:00-16:00' },
  { names: ['בורגרים'],                      hours: 'Su-Th 12:00-22:00; Fr 12:00-16:00' },
  { names: ['רולדין'],                       hours: 'Su-Th 07:00-21:00; Fr 07:00-14:00' },
  { names: ['גולדה', 'גלידה גולדה'],         hours: 'Su-Th 11:00-22:00; Fr 10:00-15:00' },
  { names: ['קופיקס'],                       hours: 'Su-Th 07:00-22:00; Fr 07:00-15:00' },
  { names: ['לנדוור', 'לנדוור קפה'],         hours: 'Su-Th 07:30-22:00; Fr 07:30-15:00' },
  { names: ['קפה גרג'],                      hours: 'Su-Th 08:00-22:00; Fr 08:00-15:00' },
  { names: ['קפה קפה'],                      hours: 'Su-Th 08:00-22:00; Fr 08:00-15:00' },
  { names: ['פיצה האט', 'Pizza Hut'],        hours: 'Su-Th 12:00-23:00; Fr 12:00-16:00; Sa 21:00-23:00' },
  { names: ['חומוס אליהו', 'Hummus Elihau'], hours: 'Su-Th 08:00-21:00; Fr 08:00-15:00' },
  { names: ['New Deli'],                      hours: 'Su-Th 10:00-22:00; Fr 10:00-15:00' },
  { names: ['פיצה שמש'],                     hours: 'Su-Th 12:00-22:00; Fr 12:00-16:00' },
  { names: ['ריבר', 'ReBar ריבר'],           hours: 'Su-Th 09:00-23:00; Fr 09:00-16:00' },
  { names: ['קפה נרו'],                      hours: 'Su-Th 07:00-22:00; Fr 07:00-15:00' },
  { names: ['מקפה', 'McCafe'],               hours: 'Su-Th 08:00-22:00; Fr 08:00-15:00' },
  { names: ['פיצה ריו', 'פיצה ריו רביבים'], hours: 'Su-Th 12:00-23:00; Fr 12:00-16:00' },
  { names: ['פיצה רומא'],                    hours: 'Su-Th 12:00-23:00; Fr 12:00-16:00' },
  { names: ['פיצה האפ'],                     hours: 'Su-Th 12:00-23:00; Fr 12:00-16:00' },
  { names: ['דומינוס', 'Dominos'],           hours: 'Su-Th 11:00-23:00; Fr 11:00-16:00' },
  { names: ['Papa John\'s'],                 hours: 'Su-Th 12:00-23:00; Fr 12:00-16:00' },
];

const hoursMap = new Map();
for (const c of CHAIN_HOURS) {
  for (const n of c.names) hoursMap.set(n, c.hours);
}

let added = 0;

function enrich(places) {
  return places.map(p => {
    if (p.openingHours) return p;
    const h = hoursMap.get(p.name);
    if (!h) return p;
    added++;
    return { ...p, openingHours: h };
  });
}

const RPATH = 'src/data/generated/restaurants.osm.json';
const PPATH = 'src/data/generated/places.osm.json';

writeWithBom(RPATH, enrich(readNoBom(RPATH)));
writeWithBom(PPATH, enrich(readNoBom(PPATH)));

console.log(`✅ נוספו שעות ל-${added} סניפים`);
