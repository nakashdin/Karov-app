import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dir, '..');
const DATA_PATH = path.join(ROOT, 'src/data/generated/places.osm.json');
const SCRAPED_PATH = path.join(ROOT, 'importers/mikvahs/output/pizza-story-branches.json');

const raw = readFileSync(DATA_PATH, 'utf-8').replace(/^\uFEFF/, '');
let places = JSON.parse(raw);
const scraped = JSON.parse(readFileSync(SCRAPED_PATH, 'utf-8'));

// IDs already in DB - skip these when importing
const EXISTING_IDS_BY_ADDRESS = new Set([
  'משה לוי 16',        // 9000106 - רמלה
  'עמק זבולון 24',     // manual-pizza-story-modiin
  'הרב שלום שבזי 30', // manual-pizza-story-rosh-haayin
  'השלום 31',          // manual-pizza-story-beersheva
  'יד חרוצים 21',      // manual-pizza-story-jrm-talpiot
  'הארז 1',            // manual-pizza-story-tzafria
  'המצודה 6',          // manual-pizza-story-azor
  // פתח תקווה (יהושע שטמפפר 24) not in scraped data — kept separately
]);

const SOCIAL = {
  instagram: 'https://www.instagram.com/pizzastoryil/',
  facebook: 'https://www.facebook.com/pizzastoryil',
  tiktok: 'https://www.tiktok.com/@pizzastoryil',
};

// Approximate city center coordinates
const CITY_COORDS = {
  'אופקים':        { lat: 31.312, lng: 34.617 },
  'אור יהודה':     { lat: 32.034, lng: 34.858 },
  'אריאל':         { lat: 32.106, lng: 35.187 },
  'אשדוד':         { lat: 31.804, lng: 34.655 },
  'אשקלון':        { lat: 31.669, lng: 34.571 },
  'באר יעקב':      { lat: 31.948, lng: 34.838 },
  'באר שבע':       { lat: 31.245, lng: 34.792 },
  'בני ברק':       { lat: 32.083, lng: 34.834 },
  'גדרה':          { lat: 31.812, lng: 34.775 },
  'חולון':         { lat: 32.020, lng: 34.779 },
  'חיפה':          { lat: 32.794, lng: 34.989 },
  'חריש':          { lat: 32.456, lng: 35.023 },
  'טירת הכרמל':   { lat: 32.762, lng: 34.971 },
  'יקנעם':         { lat: 32.661, lng: 35.103 },
  'ירושלים':       { lat: 31.768, lng: 35.214 },
  'לוד':           { lat: 31.953, lng: 34.894 },
  'מגדל העמק':    { lat: 32.677, lng: 35.239 },
  'מודיעין':       { lat: 31.893, lng: 35.011 },
  'מודיעין עילית': { lat: 31.931, lng: 35.044 },
  'מזכרת בתיה':   { lat: 31.859, lng: 34.751 },
  'נהריה':         { lat: 33.009, lng: 35.099 },
  'נוף הגליל':    { lat: 32.708, lng: 35.329 },
  'נתיבות':        { lat: 31.423, lng: 34.590 },
  'עכו':           { lat: 32.923, lng: 35.071 },
  'פרדס חנה':     { lat: 32.475, lng: 34.961 },
  'צפריה':         { lat: 31.947, lng: 34.848 },
  'קריית ביאליק': { lat: 32.831, lng: 35.081 },
  'קריית מוצקין': { lat: 32.838, lng: 35.073 },
  'קריית מלאכי':  { lat: 31.732, lng: 34.744 },
  'ראש העין':      { lat: 32.095, lng: 34.957 },
  'ראשון לציון':   { lat: 31.964, lng: 34.805 },
  'רחובות':        { lat: 31.896, lng: 34.807 },
  'רמת גן':        { lat: 32.070, lng: 34.823 },
  'שדרות':         { lat: 31.524, lng: 34.597 },
};

function mapKosher(hebrewType) {
  if (hebrewType === 'בדץ בית יוסף')                       return { kosherType: 'badatz_beit_yosef', certifiedBy: 'בד"ץ בית יוסף' };
  if (hebrewType === 'לנדא')                               return { kosherType: 'mehadrin',          certifiedBy: 'הרב לנדא' };
  if (hebrewType === 'הרב הנדל')                           return { kosherType: 'mehadrin',          certifiedBy: 'הרב הנדל' };
  if (hebrewType === 'כשר בהשגחת הרבנות המקומית')          return { kosherType: 'rabanut_mekomi',    certifiedBy: 'רבנות מקומית' };
  return null;
}

// Parse Hebrew hours string → ISO opening hours
// Hebrew: א'=Su ב'=Mo(+Tu) ד'=We ה'=Th ו'=Fr ש'=Sa
function convertHours(h) {
  if (!h) return '';

  function extractTime(str) {
    if (!str) return null;
    str = str.trim();
    if (str.includes('סגור') || str.includes('פתוח לסירוגין')) return null;
    if (str.includes('חצי שעה')) {
      const endM = str.match(/עד\s*([\d:]+)/);
      const end = endM ? endM[1] : '23:00';
      return `22:00-${end}`;
    }
    const m = str.match(/([\d:]+)\s*[-–]\s*([\d:]+)/);
    return m ? `${m[1]}-${m[2]}` : null;
  }

  // Split on Hebrew day markers
  const days = {};
  const parts = h.split(/(?=[אבגדהושו]')/);
  for (const part of parts) {
    const m = part.match(/^([אבגדהושו]')\s*(.*)/s);
    if (!m) continue;
    const [, day, rest] = m;
    if (!days[day]) days[day] = rest.trim();
  }

  const suTime  = extractTime(days["א'"]);
  const moTime  = extractTime(days["ב'"]);
  const weTime  = extractTime(days["ד'"]);
  const thTime  = extractTime(days["ה'"]);
  const frTime  = extractTime(days["ו'"]);
  const saTime  = extractTime(days["ש'"]);

  const segments = [];

  // Group Su-Th if all same
  if (suTime && suTime === moTime && suTime === weTime && suTime === thTime) {
    segments.push(`Su-Th ${suTime}`);
  } else {
    // Sunday different from rest
    if (suTime) segments.push(`Su ${suTime}`);
    if (moTime && moTime === weTime && moTime === thTime) {
      segments.push(`Mo-Th ${moTime}`);
    } else {
      if (moTime) segments.push(`Mo ${moTime}`);
      if (weTime) segments.push(`We ${weTime}`);
      if (thTime) segments.push(`Th ${thTime}`);
    }
  }

  if (frTime) segments.push(`Fr ${frTime}`);
  if (saTime) segments.push(`Sa ${saTime}`);

  return segments.join('; ');
}

// Clean address: normalize "City Street 10" → "Street 10, City"
function cleanAddress(rawAddr, city) {
  let addr = rawAddr.trim();
  // Remove city prefix if present (e.g. "אשקלון אלי כהן 37" → "אלי כהן 37")
  if (addr.startsWith(city + ' ')) {
    addr = addr.slice(city.length).trim();
  }
  // Remove city suffix if embedded (e.g. "קרן היסוד 5 באר יעקב" → "קרן היסוד 5")
  if (addr.endsWith(' ' + city)) {
    addr = addr.slice(0, addr.length - city.length).trim();
  }
  // Add city if not present
  if (!addr.includes(city)) {
    addr = `${addr}, ${city}`;
  } else if (!addr.endsWith(city) && !addr.includes(', ' + city)) {
    addr = addr.replace(city, '').trim().replace(/,$/, '').trim() + ', ' + city;
  }
  return addr;
}

// Build slug ID from branch name
function makeId(name) {
  return 'manual-pizza-story-' + name
    .replace(/–\s*/g, '')
    .replace(/!\s*/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/-$/, '');
}

const newRecords = [];
let skippedExisting = 0;
let skippedInvalid = 0;

for (const branch of scraped) {
  const { name, city, address, phone, kosherType: hebrewKosher, hours } = branch;

  // Skip coming-soon branches
  if (name.includes('בקרוב')) { skippedInvalid++; continue; }

  // Skip branches with no kosher certification
  const kosher = mapKosher(hebrewKosher);
  if (!kosher) { skippedInvalid++; continue; }

  // Skip if address matches existing DB record
  const addressKey = address.trim().split(',')[0].trim().split(' ').slice(0, 3).join(' ');
  const alreadyExists = [...EXISTING_IDS_BY_ADDRESS].some(a => address.includes(a) || a.includes(addressKey));
  if (alreadyExists) { skippedExisting++; continue; }

  const coords = CITY_COORDS[city] || { lat: 31.5, lng: 35.0 };
  const openingHours = convertHours(hours);
  const cleanedAddr = cleanAddress(address, city);
  const id = makeId(name);

  newRecords.push({
    id,
    name: 'פיצה סטורי',
    type: 'fast_food',
    category: 'dairy',
    cityId: city,
    address: cleanedAddr,
    location: { latitude: coords.lat, longitude: coords.lng },
    phone: phone || '',
    website: 'https://pizza-story.co.il',
    ...SOCIAL,
    menu: 'https://pizza-story.co.il/?page_id=200',
    ...kosher,
    ...(openingHours ? { openingHours } : {}),
    source: 'manual',
    locationPrecision: 'city',
    lastVerifiedAt: '2026-07-29',
  });
}

places.push(...newRecords);
writeFileSync(DATA_PATH, JSON.stringify(places, null, 2), 'utf-8');

console.log(`✅ נוספו ${newRecords.length} סניפי פיצה סטורי חדשים`);
console.log(`⏭  דולגו ${skippedExisting} קיימים + ${skippedInvalid} לא תקינים (בקרוב/ללא כשרות)`);
console.log(`סה"כ רשומות: ${places.length}`);
console.log('\nסניפים חדשים:');
newRecords.forEach(r => console.log(`  ${r.id} | ${r.cityId} | ${r.kosherType} | ${r.openingHours || 'אין שעות'}`));
