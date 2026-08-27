#!/usr/bin/env node
/**
 * Merge true duplicate place records.
 *
 * ── Why the obvious rule is wrong ────────────────────────────────────────────
 * "Same address" is NOT a duplicate signal in this dataset. Measured on the
 * live data, grouping by address + type alone produced 559 groups covering
 * 1,417 records — merging them would have destroyed 858 real places:
 *
 *   • "רחוב טשרניחובסקי 12, נתניה" holds 8 different synagogues. One building
 *     with many shtiblach is completely normal in Israel.
 *   • "ירושלים" as an address groups 24 unrelated sites — the Kotel HaKatan,
 *     Kever David, several yeshivas.
 *   • "שדרות עמק איילון 30, שוהם" is Pizza Roma and McDonald's in one mall.
 *
 * Requiring the NAME to match as well takes it to 37 groups / 38 merges, which
 * inspection confirms are genuine.
 *
 * ── The second trap ─────────────────────────────────────────────────────────
 * Normalising "בית כנסת" away as a prefix turns an unnamed record into an
 * empty string, which then groups every unnamed synagogue in a city together.
 * Three separate synagogues in Lod are recorded as plain "בית כנסת". Groups
 * whose normalised name is empty are therefore skipped entirely.
 *
 * ── Merge, not delete ────────────────────────────────────────────────────────
 * The project rule is additive-only. The richest record survives, every field
 * the others carry that it lacks is copied onto it, and their ids are kept in
 * `extra.mergedFrom` so the merge is reversible and auditable.
 *
 *   node scripts/dedupe-places.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');
const PLACES = resolve(root, 'src/data/generated/places.osm.json');

const normAddress = (s) => (s || '').replace(/[\s,.\-׳״']/g, '').toLowerCase();

/** Generic descriptors that carry no identity of their own. */
const GENERIC_PREFIX = /^(בית הכנסת|בית כנסת|ביהכנ"ס|בי"כ|בי''כ|מקווה|מקוה)\s*/;

const normName = (s) =>
  (s || '')
    .replace(/[֐-ׇ]/g, (c) => (c >= 'ְ' && c <= 'ׇ' ? '' : c)) // niqqud
    .replace(/["'׳״]/g, '')
    .replace(GENERIC_PREFIX, '')
    .replace(/[\s\-()]/g, '')
    .toLowerCase();

const EARTH_KM = 6371;
const rad = (d) => (d * Math.PI) / 180;
function distanceKm(a, b) {
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

/** Two records claiming the same street address should not be a km apart. */
const MAX_MERGE_DISTANCE_KM = 1;

const places = JSON.parse(readFileSync(PLACES, 'utf8').replace(/^﻿/, ''));

const groups = new Map();
for (const p of places) {
  if (!p.address) continue;
  const name = normName(p.name);
  if (name.length < 2) continue; // unnamed — see "second trap" above
  const key = `${normAddress(p.address)}|${p.type}|${name}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(p);
}

const fieldCount = (p) => Object.keys(p).length;
const merges = [];
const skipped = [];
const removedIds = new Set();

for (const group of groups.values()) {
  if (group.length < 2) continue;

  // Refuse to merge records that are not actually in the same spot.
  const far = group.some(
    (p) => p.location && group[0].location && distanceKm(group[0].location, p.location) > MAX_MERGE_DISTANCE_KM,
  );
  if (far) {
    skipped.push(`${group[0].name} @ ${group[0].address} — records >${MAX_MERGE_DISTANCE_KM}km apart`);
    continue;
  }

  const ordered = [...group].sort((a, b) => fieldCount(b) - fieldCount(a));
  const [keeper, ...losers] = ordered;

  const gained = [];
  for (const loser of losers) {
    for (const [k, v] of Object.entries(loser)) {
      if (k === 'id') continue;
      if (keeper[k] === undefined || keeper[k] === null || keeper[k] === '') {
        keeper[k] = v;
        gained.push(k);
      }
    }
    removedIds.add(loser.id);
  }

  keeper.extra = {
    ...(keeper.extra ?? {}),
    mergedFrom: [...(keeper.extra?.mergedFrom ?? []), ...losers.map((l) => l.id)],
  };

  merges.push(
    `${keeper.name} @ ${keeper.address}\n       keep ${keeper.id}` +
      `\n       drop ${losers.map((l) => l.id).join(', ')}` +
      (gained.length ? `\n       gained: ${[...new Set(gained)].join(', ')}` : ''),
  );
}

const next = places.filter((p) => !removedIds.has(p.id));

console.log(`\n${merges.length} group(s) merged, ${removedIds.size} record(s) folded in`);
merges.forEach((m) => console.log('   ' + m));
if (skipped.length) {
  console.log(`\n${skipped.length} group(s) skipped:`);
  skipped.forEach((s) => console.log('   ' + s));
}
console.log(`\nplaces: ${places.length} → ${next.length}`);

if (dryRun) {
  console.log('\n(dry run — nothing written)');
  process.exit(0);
}

copyFileSync(PLACES, `${PLACES}.bak-dedupe`);
writeFileSync(PLACES, JSON.stringify(next, null, 2), 'utf8');
console.log('\n✓ written (backup: places.osm.json.bak-dedupe)');
