import fs from 'fs';

const DATA_PATH = './src/data/generated/places.osm.json';
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8').replace(/^﻿/, ''));

const DELETE_IDS = new Set([
  'osm-node-540970749',   // דודא — confirmed closed
  'osm-node-1085414330',  // Times Square — no web presence
  'osm-node-1088134125',  // IL PENTOLINO (branch 240) — confirmed closed
  'osm-node-1763004894',  // ראנץ' האוס בר בורגר — confirmed closed
  'osm-node-1763010099',  // Buffalo Steak House — unverifiable
  'osm-node-1763014171',  // וונגס גריל — confirmed closed
  'osm-node-1763017985',  // Shipudey Hatikva — confirmed closed
  'osm-node-1764005156',  // Retro — no web presence
  'osm-node-1764033404',  // Brasserie (Soleil) — confirmed closed
]);

const UPDATES = {
  'osm-node-1763972919': { // קפה בולבארד
    phone: '08-6386699',
    website: 'https://www.cafeboulevard.co.il',
    kosherType: 'rabanut_mekomi',
    category: 'dairy',
    certifiedBy: 'רבנות אילת',
    openingHours: 'א-ה 10:00-21:00, ו 10:00-16:00, ש 12:00-21:00',
    source: 'manual',
    sourceUrl: 'https://www.cafeboulevard.co.il',
    lastVerifiedAt: '2026-08-02',
  },
  'osm-node-1763031739': { // לורנס
    name: 'לורנס',
    address: 'דרך הים 8, מלון הרודס ויטאליס, אילת',
    phone: '050-4068336',
    website: 'https://www.lawrence-eilat.co.il',
    facebook: 'https://www.facebook.com/LawrenceHerodsVitalis',
    kosherType: 'rabanut_mekomi',
    category: 'meat',
    certifiedBy: 'רבנות אילת',
    openingHours: 'א-ש 18:30-22:30',
    source: 'manual',
    sourceUrl: 'https://www.lawrence-eilat.co.il',
    lastVerifiedAt: '2026-08-02',
  },
  '9000109': { // פיצה מילאנו אילת
    address: 'קמפה 48, קניון אייס מול, אילת',
    instagram: 'https://www.instagram.com/pizza_milan_k_a',
    kosherType: 'rabanut_mekomi',
    certifiedBy: 'רבנות אילת',
    openingHours: 'א-ה 10:30-22:00, ו 10:00-15:30, ש מוצ"ש-22:00',
    source: 'manual',
    lastVerifiedAt: '2026-08-02',
  },
};

let deleted = 0;
let updated = 0;

const result = data
  .filter(p => {
    if (DELETE_IDS.has(p.id)) { deleted++; return false; }
    return true;
  })
  .map(p => {
    if (UPDATES[p.id]) {
      updated++;
      return { ...p, ...UPDATES[p.id] };
    }
    return p;
  });

fs.writeFileSync(DATA_PATH, JSON.stringify(result, null, 2));
console.log(`Deleted: ${deleted} closed Eilat restaurants`);
console.log(`Updated: ${updated} open Eilat restaurants`);
console.log(`Total records: ${data.length} → ${result.length}`);
