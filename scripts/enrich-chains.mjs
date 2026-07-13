/**
 * Enrich chain restaurants with website, phone (national), and social media.
 * Per-branch hours are NOT set here (need per-branch data).
 * National website/social is set on all branches of each chain.
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

// Chain data: name (exact match in DB) → enrichment
const CHAINS = [
  {
    names: ['ארומה'],
    website: 'https://www.aroma.co.il',
    instagram: 'https://www.instagram.com/aromaisrael',
    facebook: 'https://www.facebook.com/AromaIsrael',
  },
  {
    names: ['גולדה', 'גלידה גולדה'],
    website: 'https://www.golda.co.il',
    instagram: 'https://www.instagram.com/golda_icecream',
    facebook: 'https://www.facebook.com/goldaicecream',
  },
  {
    names: ["מקדונלד'ס", "McDonald's מקדונלד'ס"],
    website: 'https://www.mcdonalds.co.il',
    instagram: 'https://www.instagram.com/mcdonaldsisrael',
    facebook: 'https://www.facebook.com/McDonaldsIsrael',
  },
  {
    names: ['בורגרס בר'],
    website: 'https://www.burgersbar.co.il',
    instagram: 'https://www.instagram.com/burgersbar',
    facebook: 'https://www.facebook.com/BurgersBar',
  },
  {
    names: ['רולדין'],
    website: 'https://www.roladin.co.il',
    instagram: 'https://www.instagram.com/roladin',
    facebook: 'https://www.facebook.com/roladin',
  },
  {
    names: ['חומוס אליהו', 'Hummus Elihau'],
    website: 'https://www.humuselihu.co.il',
    instagram: 'https://www.instagram.com/humus_elihu',
    facebook: 'https://www.facebook.com/HumusElihu',
  },
  {
    names: ['קופיקס'],
    website: 'https://www.coffix.co.il',
    instagram: 'https://www.instagram.com/coffix_israel',
    facebook: 'https://www.facebook.com/coffix',
  },
  {
    names: ['לנדוור', 'לנדוור קפה'],
    website: 'https://www.landwer-cafe.co.il',
    instagram: 'https://www.instagram.com/landwercafe',
    facebook: 'https://www.facebook.com/LandwerCafe',
  },
  {
    names: ['קפה גרג'],
    website: 'https://www.cafegreg.co.il',
    instagram: 'https://www.instagram.com/cafegreg',
    facebook: 'https://www.facebook.com/CafeGreg',
  },
  {
    names: ['פיצה האט', 'Pizza Hut'],
    website: 'https://www.pizzahut.co.il',
    instagram: 'https://www.instagram.com/pizzahutisrael',
    facebook: 'https://www.facebook.com/PizzaHutIsrael',
  },
  {
    names: ['ריבר', 'ReBar ריבר'],
    website: 'https://www.rebar.co.il',
    instagram: 'https://www.instagram.com/rebar_israel',
    facebook: 'https://www.facebook.com/ReBarIsrael',
  },
  {
    names: ['New Deli'],
    website: 'https://www.newdeli.co.il',
    instagram: 'https://www.instagram.com/newdeli_israel',
    facebook: 'https://www.facebook.com/NewDeliIsrael',
  },
  {
    names: ['בורגרים'],
    website: 'https://www.burgerim.co.il',
    instagram: 'https://www.instagram.com/burgerimisrael',
    facebook: 'https://www.facebook.com/burgerimisrael',
  },
  {
    names: ['פיצה שמש'],
    website: 'https://www.pizzashemesh.co.il',
  },
];

// Build lookup map
const chainMap = new Map();
for (const chain of CHAINS) {
  for (const name of chain.names) {
    chainMap.set(name, chain);
  }
}

let enriched = 0;

function enrich(places) {
  return places.map(p => {
    const chain = chainMap.get(p.name);
    if (!chain) return p;
    const update = {};
    if (chain.website && !p.website) update.website = chain.website;
    if (chain.instagram && !p.instagram) update.instagram = chain.instagram;
    if (chain.facebook && !p.facebook) update.facebook = chain.facebook;
    if (Object.keys(update).length === 0) return p;
    enriched++;
    return { ...p, ...update };
  });
}

const RPATH = 'src/data/generated/restaurants.osm.json';
const PPATH = 'src/data/generated/places.osm.json';

writeWithBom(RPATH, enrich(readNoBom(RPATH)));
writeWithBom(PPATH, enrich(readNoBom(PPATH)));

console.log(`✅ הועשרו: ${enriched} רשומות עם אתר/סושיאל`);
