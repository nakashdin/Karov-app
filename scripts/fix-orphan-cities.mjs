#!/usr/bin/env node
/**
 * Resolve place records whose `cityId` is not in cities.osm.json.
 *
 * `cityId` is the Hebrew locality name (id === name), so an "orphan" is simply
 * a locality the city list never gained. There are two genuinely different
 * cases, and treating them the same would corrupt the data:
 *
 *   REMAP — the record names a variant of, or a neighbourhood inside, a
 *           locality that already exists. Point it at the canonical id.
 *   ADD   — the record names a real locality that is missing from the list.
 *           Add the city. This is additive; nothing is reassigned.
 *
 * Fuzzy matching was deliberately NOT used to decide this. It proposed
 * להב → להבים (a kibbutz and a town), דלית אל כרמל → כרמל and שדי חמד → חמד,
 * all of which are different places. Every mapping below is by hand.
 *
 *   node scripts/fix-orphan-cities.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');

const PLACES = resolve(root, 'src/data/generated/places.osm.json');
const CITIES = resolve(root, 'src/data/generated/cities.osm.json');

/**
 * orphan cityId → canonical cityId already in the list.
 * Chosen by which form the rest of the dataset already uses.
 */
const REMAP = {
  'מושב נטור': 'נטור',
  'מושב שעל': 'שעל',
  'שדה משה': 'מושב שדה משה',
  // A neighbourhood of Beit Shemesh, not a separate locality.
  'רמת בית שמש': 'בית שמש',
  // Ben Gurion Airport sits in the Lod municipality; the address keeps the
  // terminal, so nothing user-facing is lost by filing it under the city.
  'נמל תעופה': 'לוד',
};

/** Real localities simply absent from cities.osm.json. Verified one by one. */
const ADD = [
  'אלון הגליל',
  'עין יהב',
  'אלפי מנשה',
  'באר מילכה',
  'בניה',
  'גני יוחנן',
  'דלית אל כרמל',
  'הרדוף',
  'היוגב',
  'יסוד המעלה',
  'כפר בילו',
  'כפר קיש',
  'להב',
  'מנוחה',
  'מעלה החמישה',
  'נחושה',
  'ניר בנים',
  'ציפורי',
  'שדה בוקר',
  'שדי חמד',
  'שואבה',
  'שקף',
  'תל יצחק',
];

const places = JSON.parse(readFileSync(PLACES, 'utf8').replace(/^﻿/, ''));
const cities = JSON.parse(readFileSync(CITIES, 'utf8').replace(/^﻿/, ''));
const cityIds = new Set(cities.map((c) => c.id));

// ── Sanity: never remap onto a target that does not exist ────────────────────
for (const [from, to] of Object.entries(REMAP)) {
  if (!cityIds.has(to)) {
    console.error(`✖ remap target "${to}" (for "${from}") is not in cities.osm.json`);
    process.exit(1);
  }
}
// Idempotent: a name already present has been added by an earlier run.
const toAdd = ADD.filter((name) => !cityIds.has(name));

// ── Apply ────────────────────────────────────────────────────────────────────
const remapped = [];
for (const p of places) {
  const target = REMAP[p.cityId];
  if (!target) continue;
  remapped.push(`${p.name}: ${p.cityId} → ${target}`);
  p.cityId = target;
}

const added = toAdd.map((name) => ({ id: name, name }));
const nextCities = [...cities, ...added].sort((a, b) => a.name.localeCompare(b.name, 'he'));
const nextIdsForDerive = new Set(nextCities.map((c) => c.id));

/**
 * Recover a missing cityId from the address.
 *
 * Only the LAST comma-separated segment is considered. A naive substring scan
 * over the whole address matches רחוב — the Hebrew word for "street", and also
 * a real moshav in the list — and would have filed three Tzfat mikvehs under
 * the wrong locality.
 */
function cityFromAddress(address) {
  if (!address || !address.includes(',')) return null;
  const tail = address.split(',').pop().trim();
  if (!tail || tail === 'רחוב') return null;
  if (nextIdsForDerive.has(tail)) return tail;
  // "מחוז חיפה" → חיפה. Longest first so חיפה never wins over a longer name.
  const contained = [...nextIdsForDerive]
    .filter((id) => id !== 'רחוב' && tail.includes(id))
    .sort((a, b) => b.length - a.length);
  return contained[0] ?? null;
}

const derived = [];
for (const p of places) {
  if (p.cityId) continue;
  const city = cityFromAddress(p.address);
  if (!city) continue;
  derived.push(`${p.name} — "${p.address}" → ${city}`);
  p.cityId = city;
}

// ── Verify no orphan survives ────────────────────────────────────────────────
const nextIds = new Set(nextCities.map((c) => c.id));
const stillOrphaned = [...new Set(places.filter((p) => p.cityId && !nextIds.has(p.cityId)).map((p) => p.cityId))];

console.log(`\nremapped ${remapped.length} record(s):`);
remapped.forEach((r) => console.log('   ' + r));
console.log(`\nadded ${added.length} cities: ${cities.length} → ${nextCities.length}`);
console.log(`\norphaned cityIds remaining: ${stillOrphaned.length}`);
stillOrphaned.forEach((o) => console.log('   ' + o));

if (dryRun) {
  console.log('\n(dry run — nothing written)');
  process.exit(0);
}
if (stillOrphaned.length) {
  console.error('\n✖ refusing to write while orphans remain');
  process.exit(1);
}

copyFileSync(PLACES, `${PLACES}.bak-orphan-cities`);
copyFileSync(CITIES, `${CITIES}.bak-orphan-cities`);
writeFileSync(PLACES, JSON.stringify(places, null, 2), 'utf8');
writeFileSync(CITIES, JSON.stringify(nextCities, null, 2), 'utf8');
console.log('\n✓ written (backups: *.bak-orphan-cities)');
