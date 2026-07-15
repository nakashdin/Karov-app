/**
 * Scrapes branch details from pastabasta.co.il
 * Run: node scripts/scrape-pastabasta.mjs
 */
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const KOSHER_BRANCHES = [
  { slug: 'azrieli',       name: 'פסטה בסטה עזריאלי תל אביב' },
  { slug: 'hahashmonaim', name: 'פסטה בסטה TLV תל אביב' },
  { slug: 'ayalon-mall',  name: 'פסטה בסטה רמת גן' },
  { slug: 'bialik_mall',  name: 'פסטה בסטה רמת גן גבעתיים' },
  { slug: 'ganei_tikva',  name: 'פסטה בסטה גני תקווה' },
  { slug: 'kfarsaba',     name: 'פסטה בסטה כפר סבא' },
  { slug: 'rishon',       name: 'פסטה בסטה ראשון לציון' },
  { slug: 'holon',        name: 'פסטה בסטה חולון' },
  { slug: 'jerusalem',    name: 'פסטה בסטה מחנה יהודה ירושלים' },
  { slug: 'yafo_jerusalem', name: 'פסטה בסטה ירושלים מרכז העיר' },
  { slug: 'mevaseret',    name: 'פסטה בסטה מבשרת ציון' },
  { slug: 'hadasa',       name: 'פסטה בסטה עין כרם' },
  { slug: 'modiin',       name: 'פסטה בסטה מודיעין' },
  { slug: 'edomim',       name: 'פסטה בסטה מעלה אדומים' },
  { slug: 'rehovot',      name: 'פסטה בסטה רחובות' },
  { slug: 'beer_sheva_big', name: 'פסטה בסטה באר שבע מרכז' },
  { slug: 'beer_sheva',   name: 'פסטה בסטה באר שבע' },
  { slug: 'mozkin',       name: 'פסטה בסטה קריית מוצקין' },
];

async function fetchBranch(slug) {
  const url = `https://pastabasta.co.il/${slug}/`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${slug}`);
  return res.text();
}

function extractText(html, label) {
  const idx = html.indexOf(label);
  if (idx === -1) return null;
  const chunk = html.slice(idx, idx + 800);
  // strip tags
  return chunk.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
}

function parseHtml(html, name) {
  // Address
  const addrMatch = html.match(/class="[^"]*address[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i) ||
                    html.match(/itemprop="streetAddress"[^>]*>([\s\S]*?)<\//i);
  const address = addrMatch ? addrMatch[1].replace(/<[^>]+>/g, '').trim() : null;

  // Hours - look for opening hours section
  const hoursSection = extractText(html, 'שעות') || extractText(html, 'opening');

  // Kashrut
  const kosherMatch = html.match(/כשר(?:ות)?[^<]{0,100}/i);
  const kosher = kosherMatch ? kosherMatch[0].trim().slice(0, 80) : null;

  // Phone
  const phoneMatch = html.match(/0[2-9]-?\d{7}|05\d-?\d{7}/);
  const phone = phoneMatch ? phoneMatch[0] : null;

  // Lat/Lng from google maps embed or data
  const latMatch = html.match(/lat[itude]*['":\s]+([0-9]{2}\.[0-9]+)/i);
  const lngMatch = html.match(/lng|lon[gitude]*['":\s]+([0-9]{2,3}\.[0-9]+)/i);
  const lat = latMatch ? parseFloat(latMatch[1]) : null;
  const lng = lngMatch ? parseFloat(lngMatch[1]) : null;

  return { name, address, hoursSection, kosher, phone, lat, lng };
}

async function main() {
  const results = [];
  for (const b of KOSHER_BRANCHES) {
    try {
      const html = await fetchBranch(b.slug);
      const data = parseHtml(html, b.name);
      data.slug = b.slug;
      results.push(data);
      console.log(`✓ ${b.name} | ${data.address || 'no address'} | ${data.phone || 'no phone'}`);
    } catch (e) {
      console.error(`✗ ${b.name}: ${e.message}`);
      results.push({ name: b.name, slug: b.slug, error: e.message });
    }
    await new Promise(r => setTimeout(r, 300));
  }

  const out = path.join(__dirname, 'pastabasta-scraped.json');
  writeFileSync(out, JSON.stringify(results, null, 2));
  console.log(`\nSaved to ${out}`);
}

main();
