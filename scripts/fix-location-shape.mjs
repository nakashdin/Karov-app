#!/usr/bin/env node
/**
 * Normalise `location: { lat, lng }` → `location: { latitude, longitude }`.
 *
 * Three one-off patch scripts (patch-shemesh-missed, patch-story-and-bakikar,
 * update-pazzaz) wrote the wrong key names straight into the dataset. Records
 * in that shape are silently discarded by sanitizePlace() in
 * src/data/repository/OsmPlacesRepository.ts, so the places never appear in the
 * app at all — no error, no warning, just missing.
 *
 * Idempotent: running it on already-correct data changes nothing.
 *
 *   node scripts/fix-location-shape.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');

const FILES = [
  'src/data/generated/places.osm.json',
  'src/data/generated/restaurants.osm.json',
];

for (const rel of FILES) {
  const path = resolve(root, rel);
  const raw = readFileSync(path, 'utf8').replace(/^﻿/, '');
  const records = JSON.parse(raw);

  const fixed = [];
  for (const rec of records) {
    const loc = rec.location;
    if (!loc || typeof loc !== 'object') continue;
    const hasProper = typeof loc.latitude === 'number' && typeof loc.longitude === 'number';
    const hasShort = typeof loc.lat === 'number' && typeof loc.lng === 'number';
    if (hasProper || !hasShort) continue;

    // Preserve any extra keys the shorthand shape carried (city, address, …).
    const { lat, lng, ...rest } = loc;
    rec.location = { latitude: lat, longitude: lng, ...rest };
    fixed.push(`${rec.id} — ${rec.name}`);
  }

  console.log(`\n${rel}: ${fixed.length} record(s) to normalise`);
  fixed.forEach((f) => console.log('   ' + f));

  if (fixed.length === 0 || dryRun) continue;

  copyFileSync(path, `${path}.bak-location-shape`);
  writeFileSync(path, JSON.stringify(records, null, 2), 'utf8');
  console.log(`   ✓ written (backup: ${rel}.bak-location-shape)`);
}

if (dryRun) console.log('\n(dry run — nothing written)');
