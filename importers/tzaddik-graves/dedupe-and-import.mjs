import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '../../src/data/generated/places.osm.json');

const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
// Snapshot of pre-import records — dedupe runs only against these
const existingSnapshot = data.map(r => r);

// ─── Haversine ───────────────────────────────────────────────
function dist(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// ─── Count before ─────────────────────────────────────────────
const beforeCount = data.filter(p =>
  p.type === 'tzaddik_grave' || (p.tags && p.tags.includes('tzaddik_grave'))
).length;

// ─── 19 Candidates ────────────────────────────────────────────
const candidates = [
  { id:'c01', name:'קבר דוד המלך',             lat:31.7715,  lng:35.2294,  wikidata:'Q17992',    city:'ירושלים',   existingId:'osm-way-161058978' },
  { id:'c02', name:'קבר הרמח"ל',               lat:32.7886,  lng:35.5289,  wikidata:'Q311703',   city:'טבריה' },
  { id:'c03', name:'קבר מרן הבית יוסף',        lat:null,     lng:null,     wikidata:'Q181426',   city:'צפת' },
  { id:'c04', name:'קבר הרמ"ק',                lat:null,     lng:null,     wikidata:'Q448849',   city:'צפת' },
  { id:'c05', name:'מערת אליהו הנביא',         lat:32.8192,  lng:34.9885,  wikidata:'Q5054952',  city:'חיפה' },
  { id:'c06', name:'מערת הלל הזקן ותלמידיו',  lat:32.9775,  lng:35.4416,  wikidata:null,        city:'מירון' },
  { id:'c07', name:'קבר יונה הנביא',           lat:32.7437,  lng:35.2989,  wikidata:'Q6373413',  city:'כפר משהד' },
  { id:'c08', name:'קבר חבקוק הנביא',          lat:32.8897,  lng:35.4793,  wikidata:'Q11680015', city:'קדרים',     existingId:'osm-node-1339404829' },
  { id:'c09', name:'קבר דבורה הנביאה',         lat:null,     lng:null,     wikidata:null,        city:'קדש נפתלי' },
  { id:'c10', name:'קבר רבי יוחנן בן זכאי',   lat:32.7903,  lng:35.5368,  wikidata:'Q2629985',  city:'טבריה' },
  { id:'c11', name:'קבר רבן גמליאל',           lat:31.8810,  lng:34.7440,  wikidata:'Q6373556',  city:'יבנה' },
  { id:'c12', name:'קבר רבי פנחס בן יאיר',    lat:32.9682,  lng:35.4887,  wikidata:null,        city:'צפת' },
  { id:'c13', name:'קבר רבי חנינא בן דוסא',   lat:32.8459,  lng:35.1845,  wikidata:'Q12411009', city:'עראבה' },
  { id:'c14', name:'קבר רבי ישמעאל כהן גדול', lat:32.9519,  lng:35.3022,  wikidata:null,        city:'סאג\'ור' },
  { id:'c15', name:'קבר רבי שלמה אלקבץ',      lat:32.9684,  lng:35.4887,  wikidata:null,        city:'צפת' },
  { id:'c16', name:'קבר רבי יהושע דסכנין',    lat:32.8654,  lng:35.3010,  wikidata:null,        city:'סכנין' },
  { id:'c17', name:'קבר ישי ורות',             lat:31.5233,  lng:35.1049,  wikidata:'Q12410948', city:'חברון' },
  { id:'c18', name:'קבר אבנר בן נר',           lat:31.5244,  lng:35.1100,  wikidata:'Q12411012', city:'חברון' },
  { id:'c19', name:'קבר כלב בן יפונה',         lat:32.0853,  lng:35.1875,  wikidata:'Q6373391',  city:'כיפל חריס' },
];

const report = { updated:[], added:[], duplicates:[], manual:[] };

for (const c of candidates) {

  // ── 1. Wikidata exact match (vs pre-import snapshot) ────────
  if (c.wikidata) {
    const m = existingSnapshot.find(e => e.extra?.wikidataId === c.wikidata);
    if (m) { report.duplicates.push({ c, reason: 'Wikidata ID', match: m }); continue; }
  }

  // ── 2. Same-site synagogue update (c01 & c08) ───────────────
  if (c.existingId) {
    const m = existingSnapshot.find(e => e.id === c.existingId);
    if (m) {
      if (!m.tags) m.tags = [];
      if (!m.tags.includes('tzaddik_grave')) m.tags.push('tzaddik_grave');
      if (!m.extra) m.extra = {};
      if (c.wikidata) m.extra.wikidataId = c.wikidata;
      m.lastVerifiedAt = '2026-07-09';
      report.updated.push({ c, existingId: m.id, existingName: m.name });
      continue;
    }
  }

  // ── 3. Geographic < 50 m AND same-type (vs pre-import snapshot) ──
  if (c.lat != null && c.lng != null) {
    const geoMatch = existingSnapshot.find(e => {
      const eLat = e.location?.latitude, eLng = e.location?.longitude;
      if (!eLat || !eLng) return false;
      const isTzaddik = e.type === 'tzaddik_grave' || (e.tags && e.tags.includes('tzaddik_grave'));
      return isTzaddik && dist(c.lat, c.lng, eLat, eLng) < 50;
    });
    if (geoMatch) {
      report.duplicates.push({ c, reason: 'Geographic <50m', match: geoMatch });
      continue;
    }

    // c18: אבנר בן נר — 28m from machpelah coordinates → manual
    if (c.id === 'c18') {
      report.manual.push({ c, reason: 'קואורדינטות ~28מ\' ממערת המכפלה; מקורות סותרים (Wikipedia 31.5244 vs המכלול 31.5333). לאמת מיקום לפני ייבוא.' });
      continue;
    }
  }

  // ── 4. GPS null → manual ────────────────────────────────────
  if (c.lat == null || c.lng == null) {
    report.manual.push({ c, reason: 'GPS חסר — יש לאמת קואורדינטות לפני ייבוא' });
    continue;
  }

  // ── 5. Name exact in tzaddik records (vs pre-import snapshot) ──
  const tzaddikAll = existingSnapshot.filter(e => e.type === 'tzaddik_grave' || (e.tags && e.tags.includes('tzaddik_grave')));
  if (tzaddikAll.find(e => e.name === c.name)) {
    report.duplicates.push({ c, reason: 'name exact', match: tzaddikAll.find(e => e.name === c.name) });
    continue;
  }

  // ── ADD NEW ──────────────────────────────────────────────────
  const newId = c.wikidata
    ? 'tzaddik-wikidata-grave-' + c.wikidata
    : 'tzaddik-manual-' + c.id;

  const newRecord = {
    id: newId,
    name: c.name,
    type: 'tzaddik_grave',
    cityId: c.city,
    address: c.city,
    location: { latitude: c.lat, longitude: c.lng },
    source: c.wikidata ? 'wikidata' : 'manual',
    lastVerifiedAt: '2026-07-09',
    tags: ['tzaddik_grave'],
    extra: {
      ...(c.wikidata ? { wikidataId: c.wikidata } : {}),
      confidenceScore: c.wikidata ? 80 : 70,
      confidenceLevel: c.wikidata ? 'high' : 'medium',
      confidenceReason: c.wikidata ? 'Wikidata ישות קבר | +שם עברי' : 'מקור ידני | +שם עברי',
      manualSeed: true,
      isMustHave: true,
    }
  };
  data.push(newRecord);
  report.added.push({ c, newId });
}

// ─── Write ────────────────────────────────────────────────────
fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');

// ─── Count after ──────────────────────────────────────────────
const afterCount = data.filter(p =>
  p.type === 'tzaddik_grave' || (p.tags && p.tags.includes('tzaddik_grave'))
).length;

// ─── Report ───────────────────────────────────────────────────
console.log('=== דוח ייבוא קברי צדיקים | 2026-07-09 ===\n');

console.log('=UPDATED=' + report.updated.length);
report.updated.forEach(r => console.log('  ' + r.existingId + ' | ' + r.existingName + ' | ' + r.c.name));

console.log('\n=ADDED=' + report.added.length);
report.added.forEach(r => console.log('  ' + r.newId + ' | ' + r.c.name + ' | ' + r.c.city));

console.log('\n=DUPLICATES=' + report.duplicates.length);
report.duplicates.forEach(r => console.log('  ' + r.c.id + ' ' + r.c.name + ' | ' + r.reason + ' | ' + r.match?.id));

console.log('\n=MANUAL=' + report.manual.length);
report.manual.forEach(r => console.log('  ' + r.c.id + ' ' + r.c.name + ' (' + r.c.city + ') | ' + r.reason));

console.log('\n=COUNTS=');
console.log('  לפני: ' + beforeCount);
console.log('  אחרי: ' + afterCount);
console.log('  שינוי: +' + (afterCount - beforeCount));
console.log('  סה"כ רשומות בקובץ: ' + data.length);
