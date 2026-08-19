/**
 * Find places that are the same business recorded twice.
 *
 * Co-location alone means nothing — a mall food court legitimately holds a
 * dozen businesses on one point. A duplicate is co-location PLUS the same
 * name, and the name may be written in Hebrew in one record and Latin in the
 * other ("פסטה בסטה" / "Pasta Basta"), so both sides are transliterated to a
 * common phonetic form before comparing.
 *
 * Read-only. Prints a report and writes it to JSON for review.
 *
 * Usage: node scripts/find-duplicate-places.mjs [--radius 40]
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dir, '..');
const PLACES = path.join(ROOT, 'src/data/generated/places.osm.json');
const OUT = path.join(__dir, 'duplicate-places-report.json');

const args = process.argv.slice(2);
const RADIUS = +(args.includes('--radius') ? args[args.indexOf('--radius') + 1] : 40);

// Same table the app uses to render Latin names, so the two sides meet.
const MAP = {
  'א': 'a', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'o', 'ז': 'z',
  'ח': 'ch', 'ט': 't', 'י': 'i', 'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm',
  'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': '', 'פ': 'p', 'ף': 'f',
  'צ': 'tz', 'ץ': 'tz', 'ק': 'k', 'ר': 'r', 'ש': 'sh', 'ת': 't',
};

/** Reduce a name to a rough phonetic skeleton, Hebrew or Latin alike. */
function skeleton(name) {
  const latin = [...String(name || '')]
    .map(ch => (ch in MAP ? MAP[ch] : ch))
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  // Vowels and these consonant pairs are the noise in any transliteration.
  return latin
    .replace(/ph/g, 'f').replace(/ck/g, 'k').replace(/qu/g, 'k')
    .replace(/[aeiou]/g, '')
    .replace(/(.)\1+/g, '$1');
}

const dist = (a, b, c, d) => {
  const R = 6371000, r = Math.PI / 180;
  return R * Math.hypot((d - b) * r * Math.cos((a + c) / 2 * r), (c - a) * r);
};

const places = JSON.parse(readFileSync(PLACES, 'utf8'));
const withLoc = places.filter(p => p.location && Number.isFinite(p.location.latitude));

// Bucket by a coarse grid so we only compare plausible neighbours.
const CELL = 0.002; // ~200m
const grid = new Map();
for (const p of withLoc) {
  const key = `${Math.round(p.location.latitude / CELL)}:${Math.round(p.location.longitude / CELL)}`;
  if (!grid.has(key)) grid.set(key, []);
  grid.get(key).push(p);
}

const seen = new Set();
const dupes = [];
for (const p of withLoc) {
  const gx = Math.round(p.location.latitude / CELL), gy = Math.round(p.location.longitude / CELL);
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    for (const q of grid.get(`${gx + dx}:${gy + dy}`) ?? []) {
      if (q.id === p.id) continue;
      const key = [p.id, q.id].sort().join('|');
      if (seen.has(key)) continue;
      const d = Math.round(dist(p.location.latitude, p.location.longitude, q.location.latitude, q.location.longitude));
      if (d > RADIUS) continue;
      const sp = skeleton(p.name), sq = skeleton(q.name);
      if (!sp || !sq || sp.length < 3 || sq.length < 3) continue;
      if (sp !== sq && !sp.includes(sq) && !sq.includes(sp)) continue;
      seen.add(key);
      dupes.push({
        distance: d,
        skeleton: sp,
        a: { id: p.id, name: p.name, city: p.cityId, address: p.address, type: p.type, certifiedBy: p.certifiedBy ?? null, fields: Object.keys(p).length },
        b: { id: q.id, name: q.name, city: q.cityId, address: q.address, type: q.type, certifiedBy: q.certifiedBy ?? null, fields: Object.keys(q).length },
      });
    }
  }
}

dupes.sort((x, y) => x.distance - y.distance);
writeFileSync(OUT, JSON.stringify(dupes, null, 2), 'utf8');

console.log(`=== duplicate candidates (same name within ${RADIUS}m) ===`);
console.log(`found: ${dupes.length}\n`);
for (const d of dupes) {
  console.log(`${String(d.distance).padStart(3)}m  "${d.a.name}" [${d.a.id}, ${d.a.fields} fields]`);
  console.log(`      "${d.b.name}" [${d.b.id}, ${d.b.fields} fields]`);
  console.log(`      ${d.a.address ?? '—'} / ${d.b.address ?? '—'}\n`);
}
console.log(`report: ${path.relative(ROOT, OUT)}`);
