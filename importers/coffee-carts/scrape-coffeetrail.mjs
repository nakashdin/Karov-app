/**
 * Scraper: עגלות קפה כשרות מהדרין מ-coffeetrail.co.il
 * robots.txt: אין חסימה על עמודי listing
 * מקור: https://coffeetrail.co.il/mag/kosher-mehadrin/
 *
 * מריץ: node importers/coffee-carts/scrape-coffeetrail.mjs
 * פלט: importers/coffee-carts/output/coffee-carts.raw.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// כבר קיימות ב-places.osm.json — לא גורדים מחדש
const EXISTING_SLUGS = new Set([
  'shisho-caffe', 'al-havadi', 'karney-hitin', 'nina', 'caffe-lago',
  'gana-park-rg', 'ingale', 'havaia', 'agalol', 'katerina', 'lucche-coffee',
  'mchtipatly212', 'mesheksegal', 'hkafelyadhnahal', 'emanuel', 'karamela',
  'galita', 'cafe-barkay', 'itamar-coffee',
]);

// כל העגלות הכשרות (כשר + כשר למהדרין) מדף הסינון של coffeetrail
const ALL_KOSHER_SLUGS = [
  'mona-cafe', 'rozale', 'moishe', 'nelly', 'florin', 'reama',
  'siftach-efrat', 'barbara', 'berta-coffe-tivon', 'stella', 'cafe-batsheva',
  'la-bustan-cafe', 'field', 'cafe-moize', 'cafe-flora-farm', 'cafe-smadar',
  'blooms', 'ruhama', 'dusa', 'lachisha', 'jonis', 'caffe-lago-rosh-haayin',
  'hafuchot', 'olives-b-y', 'cafe-lumiere', 'veahavta', 'gitita',
  'boombar-coffee', 'grypo', 'coffee-471', 'tanto', 'malla', 'nolee',
  'garden-cy', 'etzel-dandan', 'mandra', 'morcafe', 'vany-g-n', 'cafe-leibo',
  'chenushas-coffee-truck', 'leahlecafe', 'ayana', 'nevo_winery',
  'capische-caffe', 'olivan', 'cafe-ve-yam', 'lychee', 'pedushka-cafe',
  'coffeeqana', 'aviyula', 'galita-coffee-cart', 'geula', 'nachshon-coffee',
  'coffeejoni', 'osha', 'kedma-coffee', 'inta', 'ariela',
  'food-truck-hamaafiya', 'fifa-cafe', 'bari', 'cafe-flora-bapetel',
  'dir-balak', 'cafe-yuda', 'hamelech_basadeh',
];

const URLS = ALL_KOSHER_SLUGS
  .filter(slug => !EXISTING_SLUGS.has(slug))
  .map(slug => `https://coffeetrail.co.il/coffeecart/${slug}/`);

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
  'Accept': 'text/html,application/xhtml+xml',
};

async function fetchPage(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function extractJsonLd(html) {
  const matches = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  const results = [];
  for (const m of matches) {
    try {
      const parsed = JSON.parse(m[1]);
      results.push(parsed);
    } catch {}
  }
  return results;
}

function findLocalBusiness(jsonLds) {
  for (const jld of jsonLds) {
    if (jld['@type'] === 'LocalBusiness') return jld;
    if (Array.isArray(jld)) {
      const found = jld.find(x => x['@type'] === 'LocalBusiness');
      if (found) return found;
    }
    if (jld['@graph']) {
      const found = jld['@graph'].find(x => x['@type'] === 'LocalBusiness');
      if (found) return found;
    }
  }
  return null;
}

// חלץ "certifiedBy" מתוך HTML הגולמי
function extractCertifiedBy(html) {
  const match = html.match(/העגלה עם תעודת כשרות[^<]*של ([^<\n]+)/);
  if (match) return match[1].trim();
  const match2 = html.match(/תעודת כשרות[^<]*?מהדרין[^<]*?של ([^<\n]+)/);
  if (match2) return match2[1].trim();
  return null;
}

// המר מערך שעות → מחרוזת כמו שמשתמשים בה ב-places.osm.json
function formatHours(openingHours) {
  if (!Array.isArray(openingHours) || openingHours.length === 0) return undefined;
  return openingHours.join('; ');
}

// נרמל טלפון ישראלי
function normalizePhone(tel) {
  if (!tel) return undefined;
  let t = tel.replace(/\D/g, '');
  if (t.startsWith('972')) t = '0' + t.slice(3);
  if (t.length === 9) {
    // 0X-XXXXXXX → 0X-XXX-XXXX
    return t.slice(0, 2) + '-' + t.slice(2, 5) + '-' + t.slice(5);
  }
  if (t.length === 10) {
    return t.slice(0, 3) + '-' + t.slice(3, 6) + '-' + t.slice(6);
  }
  return tel;
}

// מצא cityId מהכתובת — הוצא עיר/מושב/ישוב עיקרי
function extractCityId(address) {
  if (!address) return '';
  // אם יש פסיק, הפריט האחרון הוא לרוב העיר
  const parts = address.split(',').map(p => p.trim());
  if (parts.length > 1) return parts[parts.length - 1];
  // אחרת — כל הכתובת
  return parts[0];
}

// קבע kosherType לפי שם הגוף המכשיר
function inferKosherType(certifiedBy) {
  if (!certifiedBy) return 'rabanut_mekomi';
  if (certifiedBy.includes('בד"צ בית יוסף') || certifiedBy.includes("בד'צ בית יוסף")) return 'badatz_beit_yosef';
  if (certifiedBy.includes('בד"ץ') || certifiedBy.includes("בד'ץ") || certifiedBy.includes('בד"צ')) return 'mehadrin';
  if (certifiedBy.includes('מהדרין')) return 'mehadrin';
  if (certifiedBy.includes('רבנות')) return 'rabanut_mekomi';
  return 'rabanut_mekomi';
}

// בדוק שאין שבת בשעות (פתוח בשבת = לא מתאים)
function isOpenShabbat(openingHours) {
  if (!Array.isArray(openingHours)) return false;
  return openingHours.some(h => /^Sa\s+\d/.test(h));
}

async function main() {
  const outDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const results = [];
  const skipped = [];

  for (const url of URLS) {
    console.log(`Fetching: ${url}`);
    let html;
    try {
      html = await fetchPage(url);
    } catch (e) {
      console.error(`  ERROR: ${e.message}`);
      skipped.push({ url, reason: e.message });
      continue;
    }

    const jsonLds = extractJsonLd(html);
    const biz = findLocalBusiness(jsonLds);

    if (!biz) {
      console.warn(`  WARN: no LocalBusiness JSON-LD found`);
      skipped.push({ url, reason: 'no LocalBusiness' });
      continue;
    }

    const { name, telephone, geo, openingHours, sameAs = [], address: bizAddress } = biz;

    // סנן: פתוח בשבת
    if (isOpenShabbat(openingHours)) {
      console.warn(`  SKIP: פתוח בשבת — ${name}`);
      skipped.push({ url, reason: 'open on shabbat', name });
      continue;
    }

    const lat = parseFloat(geo?.latitude ?? biz.address?.lat ?? '');
    const lng = parseFloat(geo?.longitude ?? biz.address?.lng ?? '');

    if (isNaN(lat) || isNaN(lng)) {
      console.warn(`  WARN: no coordinates for ${name}`);
      skipped.push({ url, reason: 'no coordinates', name });
      continue;
    }

    const certifiedBy = extractCertifiedBy(html);
    const addressStr = bizAddress?.address ?? '';
    const cityId = extractCityId(addressStr);

    const facebook = sameAs.find(s => s.includes('facebook.com'));
    const instagram = sameAs.find(s => s.includes('instagram.com'));

    const slug = url.split('/coffeecart/')[1]?.replace(/\/$/, '') ?? '';

    const record = {
      id: `coffeetrail-${slug}`,
      name,
      type: 'coffee_cart',
      cityId,
      address: addressStr || cityId,
      location: { latitude: lat, longitude: lng },
      source: 'manual',
      sourceUrl: url,
      sourceName: 'Coffee Trail',
      category: 'dairy',
      kosherType: inferKosherType(certifiedBy),
      ...(certifiedBy ? { certifiedBy } : {}),
      ...(telephone ? { phone: normalizePhone(telephone) } : {}),
      ...(openingHours ? { openingHours: formatHours(openingHours) } : {}),
      ...(facebook ? { facebook } : {}),
      ...(instagram ? { instagram } : {}),
    };

    console.log(`  OK: ${name} (${lat}, ${lng})`);
    results.push(record);

    // המתן קצת בין בקשות
    await new Promise(r => setTimeout(r, 800));
  }

  const outPath = path.join(outDir, 'coffee-carts.raw.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ נשמר: ${outPath}`);
  console.log(`   ${results.length} עגלות, ${skipped.length} דולגו`);
  if (skipped.length) console.log('   דולגו:', skipped);
}

main().catch(e => { console.error(e); process.exit(1); });
