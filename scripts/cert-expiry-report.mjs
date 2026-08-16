/**
 * Kashrut certificate expiry watch.
 *
 * Reports every place whose certificate has expired or is about to, so the
 * re-verification research can be scheduled before the card goes stale.
 *
 * Usage:
 *   node scripts/cert-expiry-report.mjs            # default 45-day window
 *   node scripts/cert-expiry-report.mjs --days 90
 *   node scripts/cert-expiry-report.mjs --json     # machine-readable
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const PLACES = path.join(__dir, '../src/data/generated/places.osm.json');

const args = process.argv.slice(2);
const WINDOW = args.includes('--days') ? +args[args.indexOf('--days') + 1] : 45;
const JSON_OUT = args.includes('--json');

const today = new Date(new Date().toISOString().slice(0, 10));
const daysUntil = iso => Math.round((new Date(iso) - today) / 86400000);

const places = JSON.parse(readFileSync(PLACES, 'utf8'));
const tracked = places.filter(p => p.certificateValidUntil);

const expired = [];
const expiring = [];
for (const p of tracked) {
  const d = daysUntil(p.certificateValidUntil);
  const row = {
    id: p.id, name: p.name, city: p.cityId,
    authority: p.certifiedBy, validUntil: p.certificateValidUntil,
    daysLeft: d, certUrl: p.kosherCertUrl ?? null,
  };
  if (d < 0) expired.push(row);
  else if (d <= WINDOW) expiring.push(row);
}
expired.sort((a, b) => a.daysLeft - b.daysLeft);
expiring.sort((a, b) => a.daysLeft - b.daysLeft);

// Places with a kashrut authority but no expiry tracked at all
const untracked = places.filter(
  p => p.certifiedBy && !p.certificateValidUntil &&
       ['restaurant', 'cafe', 'bakery', 'fast_food', 'winery'].includes(p.type)
);

if (JSON_OUT) {
  console.log(JSON.stringify({ generatedFor: today.toISOString().slice(0, 10), window: WINDOW, expired, expiring, untrackedCount: untracked.length }, null, 2));
} else {
  const line = r => `  ${r.validUntil}  ${String(r.daysLeft).padStart(5)}d  ${r.name} (${r.city})`;
  console.log(`\n=== Certificate expiry — ${today.toISOString().slice(0, 10)} ===`);
  console.log(`tracked: ${tracked.length} | expired: ${expired.length} | expiring within ${WINDOW}d: ${expiring.length} | untracked: ${untracked.length}\n`);
  if (expired.length) {
    console.log(`--- EXPIRED (${expired.length}) — needs research now`);
    expired.forEach(r => console.log(line(r)));
    console.log('');
  }
  if (expiring.length) {
    console.log(`--- EXPIRING within ${WINDOW} days (${expiring.length})`);
    expiring.forEach(r => console.log(line(r)));
    console.log('');
  }
  if (!expired.length && !expiring.length) console.log('nothing expiring in the window.\n');
}

process.exitCode = expired.length ? 1 : 0;
