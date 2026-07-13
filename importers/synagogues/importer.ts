/**
 * Synagogue importer — OpenStreetMap (Overpass API), all of Israel.
 *
 * Pulls Jewish places of worship (amenity=place_of_worship + religion=jewish),
 * normalizes them to the unified Place shape, validates, and writes a LOCAL
 * JSON file for inspection. It does NOT touch the app's live dataset, does NOT
 * change any screen, and does NOT connect to Supabase. Missing data is never
 * invented.
 *
 * Run:  npm run import:synagogues   (or: node importers/synagogues/importer.ts)
 * Out:  importers/synagogues/output/synagogues.json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SynagoguePlace } from '../shared/types.ts';
import { fetchLocalities, fetchOverpass, isMain } from '../shared/utils.ts';
import { transformSynagogue } from './transform.ts';
import { validateSynagogues } from './validate.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = join(HERE, 'output', 'synagogues.json');

const QUERY = `[out:json][timeout:180];
area["ISO3166-1"="IL"][admin_level=2]->.il;
(
  nwr["amenity"="place_of_worship"]["religion"="jewish"](area.il);
);
out center tags;`;

/** Group rejection reasons into a `{ reason: count }` map for the summary log. */
function reasonCounts(rejected: { reason: string }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rejected) out[r.reason] = (out[r.reason] || 0) + 1;
  return out;
}

/** Fetch → transform → validate → write the local output file. */
export async function importSynagogues(): Promise<SynagoguePlace[]> {
  const verifiedAt = new Date().toISOString().slice(0, 10); // run date, YYYY-MM-DD

  const localities = await fetchLocalities();
  const data = await fetchOverpass(QUERY, 'synagogues');
  const elements = data.elements || [];

  const candidates = elements
    .map((el: any) => transformSynagogue(el, localities, verifiedAt))
    .filter((p: SynagoguePlace | null): p is SynagoguePlace => p !== null);

  const { valid, rejected, duplicates } = validateSynagogues(candidates);

  mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(valid, null, 2), 'utf8');

  // --- summary log ----------------------------------------------------------
  const skipped = elements.length - candidates.length;
  console.log('\n========== synagogues import ==========');
  console.log(`נמשכו (raw OSM elements) : ${elements.length}`);
  if (skipped > 0) console.log(`דולגו (לא בתי כנסת)      : ${skipped}`);
  console.log(`תקינים (valid)           : ${valid.length}`);
  console.log(`נפסלו (rejected)         : ${rejected.length}`, reasonCounts(rejected));
  console.log(`כפילויות (duplicates)    : ${duplicates}`);
  console.log(`verifiedAt               : ${verifiedAt}`);
  console.log(`נכתב → ${OUTPUT_FILE}`);
  return valid;
}

if (isMain(import.meta.url)) {
  importSynagogues().catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  });
}
