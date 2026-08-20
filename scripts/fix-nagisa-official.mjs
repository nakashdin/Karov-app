import fs from 'fs';

const DATA_PATH = 'src/data/generated/places.osm.json';
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

// Delete branches not on official nagisasushi.co.il
const TO_DELETE = new Set([
  'manual-nagisa-kfar-saba',
  'manual-nagisa-raanana',
  'manual-nagisa-tlv-kikar-hamedina',
  'manual-nagisa-bb',
  'manual-nagisa-givat-shmuel',
  'manual-nagisa-kiryat-ono',
  'manual-nagisa-ramat-gan', // duplicate/inconsistent — official website has only the בן גוריון 13 branch
]);

// 2 new verified branches from nagisasushi.co.il
const NEW_ENTRIES = [
  {
    id: 'manual-nagisa-rosh-haayin',
    name: 'נגיסה',
    type: 'restaurant',
    category: 'parve',
    address: 'העמל 13, ראש העין',
    cityId: 'ראש העין',
    location: { latitude: 32.0980, longitude: 34.9480 },
    locationPrecision: 'city',
    phone: '077-7000333',
    website: 'https://nagisasushi.co.il/rosh-haayin/',
    instagram: 'https://www.instagram.com/nagisa.sushi',
    kosherType: 'rabanut_mekomi',
    certifiedBy: 'רבנות ראש העין',
    kosherLevel: 'regular',
    kosherAuthorityGroup: 'rabbinate',
    openingHours: 'א\'-ד\' 11:30-22:30; ה\' 11:30-23:30; ו\' 11:30-14:00; מוצש: 17:30-23:30',
    source: 'manual',
    description: 'מסעדת סושי ומטבח אסייתי כשרה בראש העין, המגישה מנות טריות ומשובחות מהמטבח היפני ומזרח אסיה. המקום מציע גם שירות משלוחים וקייטרינג לאירועים.',
  },
  {
    id: 'manual-nagisa-lod',
    name: 'נגיסה אקספרס',
    type: 'restaurant',
    category: 'parve',
    address: 'הנשיא 3, לוד',
    cityId: 'לוד',
    location: { latitude: 31.9531, longitude: 34.8914 },
    locationPrecision: 'city',
    phone: '077-7000333',
    website: 'https://nagisasushi.co.il/lud/',
    instagram: 'https://www.instagram.com/nagisa.sushi',
    kosherType: 'mehadrin',
    certifiedBy: 'כשר למהדרין',
    kosherLevel: 'mehadrin',
    kosherAuthorityGroup: 'unknown',
    openingHours: 'א\'-ה\' 11:30-23:30; ו\' סגור; מוצש: חצי שעה מצאת שבת עד 24:00',
    source: 'manual',
    description: 'מסעדת סושי ומטבח אסייתי כשרה למהדרין בלוד, המגישה מנות טריות ומשובחות מהמטבח היפני ומזרח אסיה. המקום מציע גם שירות משלוחים וקייטרינג לאירועים.',
  },
];

const NAGISA_RG_ID = 'manual-restaurant-nagisa';
const NAGISA_AFULA_ID = 'manual-nagisa-afula';

let deletedCount = 0;
let updated = data
  .filter(p => {
    if (TO_DELETE.has(p.id)) { deletedCount++; return false; }
    return true;
  })
  .map(p => {
    if (p.id === NAGISA_RG_ID) {
      return {
        ...p,
        openingHours: 'א\'-ה\' 11:00-23:30; ו\' סגור; מוצש: חצי שעה מצאת שבת עד 00:00',
        website: 'https://nagisasushi.co.il/ramat-gan/',
      };
    }
    if (p.id === NAGISA_AFULA_ID) {
      return {
        ...p,
        address: 'יהושע חנקין 14, קניון העמקים, עפולה',
        phone: '077-7000333',
        openingHours: 'א\'-ה\' 11:00-23:30; ו\' 11:00-15:00; מוצש: צאת שבת 24:00',
        website: 'https://nagisasushi.co.il/afula/',
      };
    }
    return p;
  });

// Append new entries
updated.push(...NEW_ENTRIES);

fs.writeFileSync(DATA_PATH, JSON.stringify(updated, null, 2), 'utf8');

console.log(`Deleted: ${deletedCount} unverified Nagisa branches`);
console.log(`Updated: manual-restaurant-nagisa (hours + website)`);
console.log(`Updated: manual-nagisa-afula (address + hours + website)`);
console.log(`Added: ${NEW_ENTRIES.map(e => e.id).join(', ')}`);
console.log(`\nAll Nagisa entries now:`);
updated.filter(p => p.name && p.name.includes('נגיסה')).forEach(p =>
  console.log(` [${p.id}] ${p.name} / ${p.cityId} — ${p.kosherType || '(no kosherType)'} | ${p.certifiedBy || ''}`)
);
