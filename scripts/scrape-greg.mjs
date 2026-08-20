/**
 * Greg Cafe branch scraper
 * Step 1: fetch /branches/ to extract branch list (with urls)
 * Step 2: fetch each branch page, extract kashrut/phone/hours
 * Output: greg-scraped.json (review before importing)
 */
import { writeFileSync } from 'fs';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Branches to EXCLUDE (non-kosher cities or closed)
const EXCLUDE_IDS = new Set([
  7240, // באקה אל-גרביה
  3050, // טירה
  658,  // ואדי ערה / ערערה
  621,  // נצרת ביג
  631,  // G2 ראשל"צ — סגור זמנית
]);

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*',
        'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
      },
      timeout: 15000,
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : `https://gregcafe.co.il${res.headers.location}`;
        return fetchUrl(redirectUrl).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Extract branches() Alpine data from main page HTML
function extractBranches(html) {
  // Look for the Alpine.js branches function
  const match = html.match(/branches\s*\(\s*\)\s*\{[\s\S]*?return\s*\{[\s\S]*?branches\s*:\s*(\[[\s\S]*?\])\s*[,}]/);
  if (!match) {
    // Try alternate: raw JSON array in the page
    const m2 = html.match(/"branches"\s*:\s*(\[[\s\S]*?\])\s*[,}]/);
    if (m2) return JSON.parse(m2[1]);
    throw new Error('Could not find branches data in HTML');
  }
  return JSON.parse(match[1]);
}

// Parse kashrut from branch page HTML
function parseKashrut(html) {
  // Look for common kosher patterns
  const decodedHtml = html.replace(/&quot;/g, '"').replace(/&#8220;/g, '"').replace(/&#8221;/g, '"');

  if (/כשר\s*למהדרין|מהדרין/i.test(decodedHtml)) {
    if (/בד[״"]ץ\s*העד[הא]\s*החרד|edah|badatz.?edah/i.test(decodedHtml)) return { type: 'badatz_edah', label: 'בד"צ העדה החרדית' };
    if (/בד[״"]ץ\s*בית\s*יוסף|beit.?yosef/i.test(decodedHtml)) return { type: 'badatz_beit_yosef', label: 'בד"צ בית יוסף' };
    if (/רב\s*מחפוד|machpud/i.test(decodedHtml)) return { type: 'rav_machpud', label: 'הרב מחפוד' };
    if (/רבנות\s*מהדרין\s*ירושלים|jerusalem.?mehadrin/i.test(decodedHtml)) return { type: 'rabanut_mehadrin_jerusalem', label: 'רבנות מהדרין ירושלים' };
    if (/רבנות\s*מהדרין/i.test(decodedHtml)) return { type: 'rabanut_mehadrin', label: 'רבנות מהדרין' };
    return { type: 'mehadrin', label: 'מהדרין' };
  }
  if (/בד[״"]ץ\s*בית\s*יוסף/i.test(decodedHtml)) return { type: 'badatz_beit_yosef', label: 'בד"צ בית יוסף' };
  if (/בד[״"]ץ\s*העד[הא]\s*החרד/i.test(decodedHtml)) return { type: 'badatz_edah', label: 'בד"צ העדה החרדית' };
  if (/הרב\s*לנד[אה]|rav.?landa/i.test(decodedHtml)) return { type: 'rav_landa', label: 'הרב לנדא' };
  if (/הרב\s*מחפוד/i.test(decodedHtml)) return { type: 'rav_machpud', label: 'הרב מחפוד' };
  if (/רבנות\s*ירושלים/i.test(decodedHtml)) return { type: 'rabanut_mehadrin_jerusalem', label: 'רבנות ירושלים' };
  if (/רבנות\s*מהדרין/i.test(decodedHtml)) return { type: 'rabanut_mehadrin', label: 'רבנות מהדרין' };
  if (/רבנות/i.test(decodedHtml)) return { type: 'rabanut', label: 'רבנות' };
  if (/כשר/i.test(decodedHtml)) return { type: 'kosher', label: 'כשר' };
  return null; // not kosher / not found
}

function parsePhone(html) {
  // Look for tel: links or phone patterns
  const telMatch = html.match(/href="tel:([0-9\-+]+)"/);
  if (telMatch) return telMatch[1].replace(/[^0-9\-]/g, '');
  // Israeli phone patterns
  const phoneMatch = html.match(/0[0-9]{1,2}[-\s]?[0-9]{3}[-\s]?[0-9]{4}/);
  if (phoneMatch) return phoneMatch[0].replace(/\s/g, '');
  return null;
}

function parseHours(html) {
  // Look for opening hours patterns in Hebrew
  const stripped = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  // Common Greg Cafe pattern: "ראשון-חמישי" or "א-ה" or "Sunday-Thursday"
  const patterns = [
    /(?:שעות\s*פעילות|שעות\s*פתיחה)[:\s]+([\s\S]{10,200}?)(?:\.|$|<)/,
    /(?:א['-]ה|ראשון[-–]חמישי|sun[-–]thu)[^<]{5,100}/i,
  ];
  for (const p of patterns) {
    const m = stripped.match(p);
    if (m) return m[0].trim().replace(/\s+/g, ' ').substring(0, 150);
  }
  return null;
}

async function main() {
  console.log('Fetching Greg Cafe branches page...');
  let branches;

  try {
    const { status, body } = await fetchUrl('https://gregcafe.co.il/branches/');
    if (status !== 200) throw new Error(`HTTP ${status}`);
    console.log(`Got ${body.length} bytes`);
    branches = extractBranches(body);
    console.log(`Found ${branches.length} branches in Alpine.js data`);
  } catch (e) {
    console.error('Failed to fetch branches list:', e.message);
    // Fallback: use hardcoded branch list from user-provided HTML
    console.log('Using hardcoded branch list...');
    branches = FALLBACK_BRANCHES;
  }

  // Filter out excluded IDs
  const toScrape = branches.filter(b => !EXCLUDE_IDS.has(b.id));
  console.log(`Scraping ${toScrape.length} branches (excluded ${branches.length - toScrape.length})...`);

  const results = [];
  for (let i = 0; i < toScrape.length; i++) {
    const b = toScrape[i];
    const url = b.url.startsWith('http') ? b.url : `https://gregcafe.co.il${b.url}`;
    process.stdout.write(`[${i + 1}/${toScrape.length}] ${b.title} (${url})... `);

    try {
      const { status, body } = await fetchUrl(url);
      if (status !== 200) {
        console.log(`HTTP ${status} — skipping`);
        results.push({ ...b, _error: `HTTP ${status}` });
      } else {
        const kashrut = parseKashrut(body);
        const phone = parsePhone(body);
        const hours = parseHours(body);
        console.log(`${kashrut ? kashrut.label : 'NO KASHRUT'} | ${phone || 'no phone'}`);
        results.push({
          id: b.id,
          title: b.title,
          url,
          lat: b.location?.lat,
          lng: b.location?.lng,
          address: b.location?.address,
          city: b.location?.city,
          kashrut: kashrut?.type || null,
          kashrutLabel: kashrut?.label || null,
          phone: phone || null,
          hours: hours || null,
          _isKosher: kashrut !== null,
        });
      }
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
      results.push({ ...b, _error: e.message });
    }

    // Be polite: 300ms between requests
    if (i < toScrape.length - 1) await sleep(300);
  }

  const outPath = path.join(__dirname, 'greg-scraped.json');
  writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');

  const kosher = results.filter(r => r._isKosher);
  const nonKosher = results.filter(r => !r._isKosher && !r._error);
  const errors = results.filter(r => r._error);

  console.log('\n=== SUMMARY ===');
  console.log(`Total scraped: ${results.length}`);
  console.log(`Kosher: ${kosher.length}`);
  console.log(`Not kosher: ${nonKosher.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`\nOutput: ${outPath}`);

  if (errors.length) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`  ${e.title}: ${e._error}`));
  }
}

// Fallback branch list (from user-provided HTML, Alpine.js data)
// Used if the main page fetch fails
const FALLBACK_BRANCHES = [
  { id: 10861, title: 'שבעת הכוכבים הרצליה', url: '/branch/שבעת-הכוכבים-הרצליה/', location: { lat: 32.1616331, lng: 34.8195312, city: 'הרצליה', address: 'שבעת הכוכבים, הרצליה' } },
  { id: 7634,  title: 'מגדל העמק', url: '/branch/מגדל-העמק/', location: { lat: 32.6927233, lng: 35.2279386, city: 'מגדל העמק', address: 'מגדל העמק' } },
  { id: 7583,  title: 'גן העיר אשדוד', url: '/branch/גן-העיר-אשדוד/', location: { lat: 31.7908807, lng: 34.6381046, city: 'אשדוד', address: 'גן העיר, אשדוד' } },
  { id: 7197,  title: 'פארק תעשיות אפק', url: '/branch/פארק-תעשיות-אפק/', location: { lat: 32.1060921, lng: 34.9687576, city: 'ראש העין', address: 'פארק תעשיות אפק, ראש העין' } },
  { id: 7174,  title: 'דניגוף', url: '/branch/דניגוף/', location: { lat: 32.7904643, lng: 35.5338050, city: 'טבריה', address: 'דניגוף, טבריה' } },
  { id: 5996,  title: 'חדרה', url: '/branch/חדרה/', location: { lat: 32.4378941, lng: 34.9219993, city: 'חדרה', address: 'חדרה' } },
  { id: 5938,  title: 'רננים', url: '/branch/רננים/', location: { lat: 32.1974472, lng: 34.8780966, city: 'רעננה', address: 'רננים, רעננה' } },
  { id: 671,   title: 'גוש עציון', url: '/branch/גוש-עציון/', location: { lat: 31.645207, lng: 35.1309302, city: 'גוש עציון', address: 'צומת גוש עציון' } },
  { id: 670,   title: 'קניון הדר', url: '/branch/קניון-הדר/', location: { lat: 31.768319, lng: 35.21371, city: 'ירושלים', address: 'קניון הדר, ירושלים' } },
  { id: 667,   title: 'סינמה סיטי', url: '/branch/סינמה-סיטי/', location: { lat: 31.7830449, lng: 35.2036425, city: 'ירושלים', address: 'סינמה סיטי, ירושלים' } },
  { id: 666,   title: 'עזריאלי מלחה', url: '/branch/עזריאלי-מלחה/', location: { lat: 31.7974497, lng: 35.1478788, city: 'ירושלים', address: 'מלחה, ירושלים' } },
  { id: 664,   title: 'ב.ס.ר בני ברק', url: '/branch/בני-ברק/', location: { lat: 32.093639, lng: 34.8247297, city: 'בני ברק', address: 'מצדה 5, בני ברק' } },
  { id: 659,   title: 'ים המלח', url: '/branch/ים-המלח/', location: { lat: 31.1991222, lng: 35.3641236, city: 'עין בוקק', address: 'עין בוקק' } },
  { id: 657,   title: 'פוריה', url: '/branch/פוריה/', location: { lat: 32.7853923, lng: 35.4984742, city: 'טבריה', address: 'פוריה, טבריה' } },
  { id: 656,   title: 'נשר', url: '/branch/נשר/', location: { lat: 32.771792, lng: 35.0468566, city: 'נשר', address: 'נשר' } },
  { id: 655,   title: 'נצרת וואן', url: '/branch/נצרת-וואן/', location: { lat: 32.6989354, lng: 35.3106856, city: 'נוף הגליל', address: 'נוף הגליל' } },
  { id: 654,   title: 'בית שאן', url: '/branch/בית-שאן/', location: { lat: 32.4991152, lng: 35.5046608, city: 'בית שאן', address: 'בית שאן' } },
  { id: 653,   title: 'המשתלה', url: '/branch/המשתלה/', location: { lat: 32.781845, lng: 35.327738, city: 'בית רימון', address: 'המשתלה, בית רימון' } },
  { id: 651,   title: 'G כפר סבא', url: '/branch/כפר-סבא/', location: { lat: 32.1719777, lng: 34.9280953, city: 'כפר סבא', address: 'כפר סבא' } },
  { id: 650,   title: 'בית שמש', url: '/branch/בית-שמש/', location: { lat: 31.7560341, lng: 34.9904465, city: 'בית שמש', address: 'בית שמש' } },
  { id: 649,   title: 'TLV', url: '/branch/tlv/', location: { lat: 32.0678229, lng: 34.7834787, city: 'תל אביב-יפו', address: 'תל אביב' } },
  { id: 648,   title: 'דיזנגוף סנטר', url: '/branch/דיזנגוף-סנטר/', location: { lat: 32.0754236, lng: 34.7748328, city: 'תל אביב-יפו', address: 'דיזנגוף סנטר, תל אביב' } },
  { id: 646,   title: 'הקניון הגדול', url: '/branch/הקניון-הגדול/', location: { lat: 32.0932981, lng: 34.8653481, city: 'פתח תקווה', address: 'הקניון הגדול, פתח תקווה' } },
  { id: 645,   title: 'סירקין', url: '/branch/סירקין/', location: { lat: 32.0794457, lng: 34.9025999, city: 'פתח תקווה', address: 'סירקין, פתח תקווה' } },
  { id: 644,   title: 'גבעת שמואל', url: '/branch/גבעת-שמואל/', location: { lat: 32.0756581, lng: 34.8545348, city: 'גבעת שמואל', address: 'גבעת שמואל' } },
  { id: 643,   title: 'שרונים', url: '/branch/שרונים/', location: { lat: 32.1333401, lng: 34.9014664, city: 'הוד השרון', address: 'הרקון 2, הוד השרון' } },
  { id: 642,   title: 'נתניה השרון', url: '/branch/נתניה-השרון/', location: { lat: 32.3264108, lng: 34.8618993, city: 'נתניה', address: 'נתניה' } },
  { id: 640,   title: 'ohla la by greg', url: '/branch/ohla-la/', location: { lat: 32.3265465, lng: 34.8475564, city: 'נתניה', address: 'נתניה' } },
  { id: 639,   title: 'פרדס חנה', url: '/branch/פרדס-חנה/', location: { lat: 32.4871179, lng: 34.9705137, city: 'פרדס חנה כרכור', address: 'פרדס חנה כרכור' } },
  { id: 638,   title: 'אריאל', url: '/branch/אריאל/', location: { lat: 32.1007172, lng: 35.1701921, city: 'אריאל', address: 'אריאל' } },
  { id: 636,   title: 'גרנד קניון באר שבע', url: '/branch/גרנד-קניון-באר-שבע/', location: { lat: 31.2503705, lng: 34.7717336, city: 'באר שבע', address: 'גרנד קניון, באר שבע' } },
  { id: 633,   title: 'ביג אילת', url: '/branch/ביג-אילת/', location: { lat: 29.5664539, lng: 34.9596748, city: 'אילת', address: 'ביג, אילת' } },
  { id: 630,   title: 'דימונה', url: '/branch/דימונה/', location: { lat: 31.0742063, lng: 35.032363, city: 'דימונה', address: 'דימונה' } },
  { id: 629,   title: 'אופקים', url: '/branch/אופקים/', location: { lat: 31.3152934, lng: 34.6237812, city: 'אופקים', address: 'אופקים' } },
  { id: 628,   title: 'שדרות', url: '/branch/שדרות/', location: { lat: 31.5256004, lng: 34.6031203, city: 'שדרות', address: 'שדרות' } },
  { id: 627,   title: 'נתיבות', url: '/branch/נתיבות/', location: { lat: 31.4183917, lng: 34.5990347, city: 'נתיבות', address: 'נתיבות' } },
  { id: 626,   title: 'קסטינה', url: '/branch/קסטינה/', location: { lat: 31.728028, lng: 34.7550671, city: 'באר טוביה', address: 'קסטינה, באר טוביה' } },
  { id: 625,   title: 'רמלה', url: '/branch/רמלה/', location: { lat: 31.9257549, lng: 34.8639629, city: 'רמלה', address: 'רמלה' } },
  { id: 624,   title: 'חריש', url: '/branch/חריש/', location: { lat: 32.4705038, lng: 35.0392878, city: 'חריש', address: 'חריש' } },
  { id: 620,   title: 'צמח', url: '/branch/צמח/', location: { lat: 32.7037464, lng: 35.5847459, city: 'צמח', address: 'צמח' } },
  { id: 617,   title: 'קרית אתא', url: '/branch/קרית-אתא/', location: { lat: 32.8061731, lng: 35.1035172, city: 'קרית אתא', address: 'קרית אתא' } },
  { id: 616,   title: 'קרית חיים', url: '/branch/קרית-חיים/', location: { lat: 32.8212387, lng: 35.0704097, city: 'חיפה', address: 'קרית חיים, חיפה' } },
  { id: 615,   title: 'עתלית', url: '/branch/עתלית/', location: { lat: 32.7104359, lng: 34.9481538, city: 'עתלית', address: 'עתלית' } },
  { id: 614,   title: 'יקנעם', url: '/branch/יקנעם/', location: { lat: 32.6595831, lng: 35.1051293, city: 'יוקנעם עילית', address: 'יוקנעם עילית' } },
  { id: 613,   title: 'גרג סינמול', url: '/branch/גרג-סינמול/', location: { lat: 32.7934932, lng: 35.0377411, city: 'חיפה', address: 'סינמול, חיפה' } },
  { id: 612,   title: 'קניון חיפה', url: '/branch/קניון-חיפה/', location: { lat: 32.7896594, lng: 34.9656482, city: 'חיפה', address: 'קניון חיפה' } },
  { id: 611,   title: 'גרנד קניון חיפה', url: '/branch/גרנד-קניון-חיפה/', location: { lat: 32.7897693, lng: 35.0080075, city: 'חיפה', address: 'גרנד קניון, חיפה' } },
  { id: 610,   title: 'חוצות המפרץ', url: '/branch/חוצות-המפרץ/', location: { lat: 32.8076028, lng: 35.0536442, city: 'חיפה', address: 'חוצות המפרץ, חיפה' } },
  { id: 608,   title: 'עפולה', url: '/branch/עפולה/', location: { lat: 32.6061191, lng: 35.2929707, city: 'עפולה', address: 'עפולה' } },
  { id: 607,   title: 'קניון נהריה', url: '/branch/קניון-נהריה/', location: { lat: 32.9901794, lng: 35.0953318, city: 'נהריה', address: 'קניון נהריה' } },
  { id: 606,   title: 'מכללת ברוד', url: '/branch/מכללת-ברוד/', location: { lat: 32.914671, lng: 35.292417, city: 'כרמיאל', address: 'מכללת ברוד, כרמיאל' } },
  { id: 604,   title: 'ראש פינה', url: '/branch/ראש-פינה/', location: { lat: 32.9697787, lng: 35.5503856, city: 'ראש פינה', address: 'ראש פינה' } },
  { id: 603,   title: 'קרית שמונה', url: '/branch/קרית-שמונה/', location: { lat: 33.2106123, lng: 35.5681886, city: 'קרית שמונה', address: 'קרית שמונה' } },
];

main().catch(console.error);
