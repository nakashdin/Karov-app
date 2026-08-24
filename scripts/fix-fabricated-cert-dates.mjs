/**
 * Strip `certificateValidUntil` from records that have no actual certificate
 * document (`kosherCertUrl`) backing that date.
 *
 * Root cause: commit 0bad8b9 ("wire humus-eliyahu data") stamped
 * `certificateValidUntil` on the 28 Humus Eliyahu chain branches straight from
 * the chain's own website listing, with no certificate PDF/image ever
 * retrieved. Round, repeated dates (2026-09-11 x13, 2026-12-31 x6,
 * 2027-01-31 x6) confirm these were never read off a real certificate.
 *
 * Per the 2026-08-24 kashrut-data policy: "no expiry date does NOT mean
 * expired" implies the inverse too — an expiry date must never exist without
 * real certificate evidence, or it risks silently flipping a business to
 * "תעודת כשרות פגה" for a date nobody actually verified. These 29 records
 * keep their existing kashrut classification (certifiedBy/kosherType/
 * kosherLevel/kosherAuthority) untouched — only the fabricated date goes.
 * That reverts them to state C ("existing kashrut info, no certificate data
 * available to Karov"), which is what they always actually were.
 *
 * Usage: node scripts/fix-fabricated-cert-dates.mjs [--dry]
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const PLACES_PATH = path.join(__dir, '../src/data/generated/places.osm.json');

const DRY = process.argv.includes('--dry');

const places = JSON.parse(readFileSync(PLACES_PATH, 'utf8'));

const targets = places.filter((p) => p.certificateValidUntil && !p.kosherCertUrl);

console.log(`records with certificateValidUntil but no kosherCertUrl (no real cert evidence): ${targets.length}\n`);

for (const p of targets) {
  console.log(`  ✓ ${p.id.padEnd(45).slice(0, 45)} ${p.name.padEnd(30).slice(0, 30)} was: ${p.certificateValidUntil} (${p.certifiedBy ?? 'no authority'})`);
  delete p.certificateValidUntil;
}

if (!DRY) writeFileSync(PLACES_PATH, JSON.stringify(places), 'utf8');

console.log(`\n${DRY ? '(dry run — nothing written)' : `written to ${path.relative(process.cwd(), PLACES_PATH)}`}`);
console.log(`kashrut classification (certifiedBy/kosherType/kosherLevel/kosherAuthority) left untouched on all ${targets.length} records.`);
