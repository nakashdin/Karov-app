import { readFileSync, writeFileSync } from 'fs';

const DATA_PATH = 'C:\\Users\\User\\Desktop\\claude plane\\kosher-app\\src\\data\\generated\\places.osm.json';
const raw = readFileSync(DATA_PATH, 'utf-8').replace(/^\uFEFF/, '');
let places = JSON.parse(raw);

// Official data from https://pizza-story.co.il/?page_id=200
// Hebrew days: א=Su ב=Mo ג=Tu ד=We ה=Th ו=Fr ש=Sa
// "חצי שעה לאחר צאת שבת" → approx 22:00

// Social media from official accounts
const SOCIAL = {
  instagram: 'https://www.instagram.com/pizzastoryil/',
  facebook: 'https://www.facebook.com/pizzastoryil',
  tiktok: 'https://www.tiktok.com/@pizzastoryil',
};

const PIZZA_STORY_IDS = new Set([
  '9000106',
  'manual-pizza-story-modiin',
  'manual-pizza-story-rosh-haayin',
  'manual-pizza-story-beersheva',
  'manual-pizza-story-pt',
  'manual-pizza-story-jrm-talpiot',
  'manual-pizza-story-tzafria',
  'manual-pizza-story-azor',
]);

// Per-branch hours / extra updates from official site
const BRANCH_UPDATES = {
  '9000106': {
    openingHours: 'Su-Th 10:00-23:00; Fr 10:00-15:00; Sa 22:00-00:00',
  },
  'manual-pizza-story-modiin': {
    openingHours: 'Su-Th 10:00-23:00; Fr 10:00-15:00; Sa 22:00-23:00',
  },
  'manual-pizza-story-rosh-haayin': {
    // official site says "לנדא" (Rav Landau), no hours listed
    phone: '03-6777909',
    kosherType: 'mehadrin',
    certifiedBy: 'הרב לנדא',
  },
  'manual-pizza-story-beersheva': {
    // Saturday closed
    openingHours: 'Su-Th 11:00-23:00; Fr 09:00-15:00',
  },
  // manual-pizza-story-pt (פתח תקווה) not found on official site – no changes
  'manual-pizza-story-jrm-talpiot': {
    openingHours: 'Su-Th 10:30-23:00; Fr 10:30-14:30; Sa 22:00-23:30',
  },
  'manual-pizza-story-tzafria': {
    // Friday & Saturday closed
    openingHours: 'Su-Th 12:00-22:00',
  },
  'manual-pizza-story-azor': {
    openingHours: 'Su-Th 10:30-23:00; Fr 10:30-16:30; Sa 22:00-00:00',
  },
};

let updatedCount = 0;

places = places.map(p => {
  if (!PIZZA_STORY_IDS.has(p.id)) return p;
  updatedCount++;

  const branchExtra = BRANCH_UPDATES[p.id] || {};

  return {
    ...p,
    ...branchExtra,
    // Apply official social media to every Pizza Story branch
    instagram: SOCIAL.instagram,
    facebook: SOCIAL.facebook,
    tiktok: SOCIAL.tiktok,
    lastVerifiedAt: '2026-07-29',
  };
});

writeFileSync(DATA_PATH, JSON.stringify(places, null, 2), 'utf-8');

console.log(`✅ עודכנו ${updatedCount} סניפי פיצה סטורי:`);
console.log('  - רמלה: שעות');
console.log('  - מודיעין: שעות');
console.log('  - ראש העין: טלפון + כשרות הרב לנדא');
console.log('  - באר שבע: שעות');
console.log('  - ירושלים תלפיות: שעות');
console.log('  - צפריה: שעות');
console.log('  - אזור: שעות');
console.log('  - כולם: אינסטגרם (pizzastoryil) + פייסבוק + טיקטוק');
console.log('  - פתח תקווה: לא נמצא באתר הרשמי – שעות לא עודכנו');
console.log(`סה"כ רשומות: ${places.length}`);
