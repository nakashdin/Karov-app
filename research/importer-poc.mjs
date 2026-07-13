/**
 * PROOF OF CONCEPT IMPORTER — research only. NOT production, NOT wired to the
 * app, NO automation, NO database. Consolidates the source research into one
 * file: per category it uses the source the research recommended, fetches a
 * SMALL sample from ONE city (Lod), normalizes to a common shape, exports JSON,
 * and prints an assessment (records / fields / reliability / license).
 *
 * Run:  node research/importer-poc.mjs
 * Out:  research/out/importer-*.json
 *
 * Findings baked in (see also memory): synagogues→OSM, mikvehs→data.gov.il
 * (official, open, high quality), kosher businesses→no good free source yet.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'out');
const CITY = { name: 'לוד', lat: 31.9510, lng: 34.8953, radiusM: 4000 };
const UA = 'karov-poc/0.1 (research)';

/** Common normalized record shape (the target schema for any future source). */
// { id, source, category, name, lat, lng, address, phone, openingHours, extra }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function httpJson(url, options, label) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, options);
      if ([429, 502, 503, 504].includes(res.status)) throw new Error(`HTTP ${res.status} busy`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn(`  [${label}] attempt ${attempt}: ${e.message}`);
      await sleep(attempt * 4000);
    }
  }
  throw new Error(`[${label}] gave up`);
}

// --- SOURCE: OpenStreetMap (synagogues + kosher businesses) ----------------
async function osmSource() {
  const q = `[out:json][timeout:60];
(
  nwr(around:${CITY.radiusM},${CITY.lat},${CITY.lng})["amenity"="place_of_worship"]["religion"="jewish"];
  nwr(around:${CITY.radiusM},${CITY.lat},${CITY.lng})["diet:kosher"~"yes|only|designated"];
);
out center tags;`;
  const data = await httpJson(
    'https://overpass-api.de/api/interpreter',
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA }, body: 'data=' + encodeURIComponent(q) },
    'OSM',
  );
  const rows = [];
  for (const el of data.elements || []) {
    const t = el.tags || {};
    const isSyn = t.religion === 'jewish' && t.amenity === 'place_of_worship';
    const isKosher = ['yes', 'only', 'designated'].includes(t['diet:kosher']);
    if (!isSyn && !isKosher) continue;
    rows.push({
      id: `osm-${el.type}-${el.id}`,
      source: 'OpenStreetMap',
      category: isSyn ? 'synagogue' : 'kosher_business',
      name: t['name:he'] || t.name || null,
      lat: el.lat ?? el.center?.lat ?? null,
      lng: el.lon ?? el.center?.lon ?? null,
      address: [[t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' '), t['addr:city']].filter(Boolean).join(', ') || null,
      phone: t['contact:phone'] || t.phone || null,
      openingHours: t.opening_hours || null,
      extra: {},
    });
  }
  return { name: 'OpenStreetMap', license: 'ODbL 1.0 (attribution + share-alike)', reliability: 'Good for synagogue existence/location; kosher businesses barely tagged; phone/hours rare.', rows };
}

// --- SOURCE: data.gov.il official mikvehs ----------------------------------
async function mikvehSource() {
  const id = 'e80a5e59-3b0f-4be9-983a-dc0971907626';
  const data = await httpJson(
    `https://data.gov.il/api/3/action/datastore_search?resource_id=${id}&q=${encodeURIComponent(CITY.name)}&limit=50`,
    { headers: { 'User-Agent': UA } },
    'mikveh',
  );
  const rows = (data.result?.records || []).map((r) => ({
    id: `mikveh-${r._id}`,
    source: 'data.gov.il (מקוואות טהרה)',
    category: 'mikveh',
    name: r.mikveName || null,
    lat: null, // dataset has no coordinates
    lng: null,
    address: [r.mikveAddress, r.mikveCity].filter(Boolean).join(', ') || null,
    phone: r.mikvePhone || null,
    openingHours: r.activityHoursSummer || null,
    extra: { accessibility: r.accessability, forWomen: r.mikveForWomenYesNo, forMen: r.mikveForMenYesNo },
  }));
  return { name: 'data.gov.il (מקוואות טהרה)', license: 'Open (data.gov.il)', reliability: 'Official, high fill (phone/hours/address) — but NO coordinates (needs geocoding).', rows };
}

// --- SOURCE: data.gov.il official kosher businesses (shows the gap) --------
async function kosherSource() {
  const id = 'c54032cb-5306-4be9-a20d-a0be0ba49cc1';
  const data = await httpJson(
    `https://data.gov.il/api/3/action/datastore_search?resource_id=${id}&q=${encodeURIComponent(CITY.name)}&limit=50`,
    { headers: { 'User-Agent': UA } },
    'kosher',
  );
  const rows = (data.result?.records || []).map((r) => ({
    id: `kosher-${r._id}`,
    source: 'data.gov.il (בתי עסק כשרות)',
    category: 'kosher_business',
    name: r.business_name || null,
    lat: null,
    lng: null,
    address: [r.street_name, r.city_name].filter(Boolean).join(', ') || null,
    phone: r.business_phone || null,
    openingHours: null,
    extra: { kosherType: r.kosher_type, meat: r.meat, dairy: r.dairy, parve: r.parve, supervisor: r.supervisor_name },
  }));
  return { name: 'data.gov.il (בתי עסק כשרות)', license: 'Open (data.gov.il)', reliability: 'Ideal schema (kosher type, meat/dairy/parve, supervisor) but tiny coverage (63 nationwide, pilot).', rows };
}

const nonEmpty = (v) => v !== null && v !== undefined && String(v).trim() !== '';
const fill = (rows, f) => (rows.length ? Math.round((rows.filter((r) => nonEmpty(r[f])).length / rows.length) * 100) : 0);

async function main() {
  mkdirSync(OUT, { recursive: true });
  const sources = [];
  for (const fn of [osmSource, mikvehSource, kosherSource]) {
    try {
      sources.push(await fn());
    } catch (e) {
      console.warn(`source failed: ${e.message}`);
    }
  }

  const all = sources.flatMap((s) => s.rows);
  writeFileSync(join(OUT, 'importer-normalized.json'), JSON.stringify(all, null, 2));

  console.log(`\n==========  PoC IMPORTER — sample city: ${CITY.name}  ==========`);
  const report = [];
  for (const s of sources) {
    const byCat = {};
    for (const r of s.rows) byCat[r.category] = (byCat[r.category] || 0) + 1;
    const coverage = ['name', 'lat', 'address', 'phone', 'openingHours'].map((f) => `${f} ${fill(s.rows, f)}%`).join(' · ');
    console.log(`\n● ${s.name}`);
    console.log(`  records: ${s.rows.length}  ${JSON.stringify(byCat)}`);
    console.log(`  field fill: ${coverage}`);
    console.log(`  reliability: ${s.reliability}`);
    console.log(`  license: ${s.license}`);
    report.push({ source: s.name, records: s.rows.length, byCategory: byCat, license: s.license, reliability: s.reliability });
  }
  writeFileSync(join(OUT, 'importer-report.json'), JSON.stringify({ city: CITY.name, sources: report }, null, 2));
  console.log(`\nTotal normalized records: ${all.length}`);
  console.log('Exported → research/out/importer-normalized.json , importer-report.json');
}

main().catch((e) => { console.error('Failed:', e); process.exit(1); });
