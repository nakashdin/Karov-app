/**
 * Mikvah importer — STEP 2 ONLY: data.gov.il → local output. NO geocoding, NO
 * coordinates, NO app wiring.
 *
 * Pulls all official mikveh records, cleans the text fields, normalizes to the
 * importer's internal `MikvahPlace` (without lat/lng), and writes two local
 * files for inspection. It does NOT touch the app, PlaceType, screens, the
 * repository, or the live dataset. Missing data is never invented.
 *
 * Run:  node importers/mikvahs/importer.ts
 * Out:  importers/mikvahs/output/mikvahs.raw.json         (cleaned MikvahRaw[])
 *       importers/mikvahs/output/mikvahs.normalized.json  (valid MikvahPlace[])
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MikvahPlace, MikvahRaw } from '../shared/types.ts';
import { USER_AGENT, httpJson, isMain } from '../shared/utils.ts';
import { toMikvahPlace, toMikvahRaw } from './transform.ts';
import { validateMikvahs } from './validate.ts';

const RESOURCE_ID = 'e80a5e59-3b0f-4be9-983a-dc0971907626';
const PAGE = 100;

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_OUT = join(HERE, 'output', 'mikvahs.raw.json');
const NORM_OUT = join(HERE, 'output', 'mikvahs.normalized.json');

/** Pull every record from the data.gov.il datastore (paginated). */
async function fetchAll(): Promise<any[]> {
  const records: any[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const url =
      `https://data.gov.il/api/3/action/datastore_search` +
      `?resource_id=${RESOURCE_ID}&limit=${PAGE}&offset=${offset}`;
    const data = await httpJson(url, { headers: { 'User-Agent': USER_AGENT } }, 'mikveh');
    const page = data.result?.records || [];
    records.push(...page);
    if (page.length < PAGE) break;
  }
  return records;
}

const fillRate = (rows: MikvahRaw[], f: keyof MikvahRaw): number =>
  rows.length ? Math.round(rows.filter((r) => String(r[f]).trim() !== '').length / rows.length * 100) : 0;

/** Fetch → clean → normalize → validate → write the two local files. */
export async function importMikvahs(): Promise<MikvahPlace[]> {
  const verifiedAt = new Date().toISOString().slice(0, 10); // run date, YYYY-MM-DD

  const records = await fetchAll();
  const raw: MikvahRaw[] = records.map(toMikvahRaw);
  const normalized: MikvahPlace[] = raw.map((r) => toMikvahPlace(r, verifiedAt));
  const { valid, rejected, duplicates } = validateMikvahs(normalized);

  mkdirSync(dirname(RAW_OUT), { recursive: true });
  writeFileSync(RAW_OUT, JSON.stringify(raw, null, 2), 'utf8');
  writeFileSync(NORM_OUT, JSON.stringify(valid, null, 2), 'utf8');

  // --- summary log ----------------------------------------------------------
  const noAddress = raw.filter((r) => !r.address).length;
  const cities = new Set(raw.map((r) => r.city).filter(Boolean));

  console.log('\n========== mikvahs import (step 2 — no coordinates) ==========');
  console.log(`נמשכו (fetched)        : ${records.length}`);
  console.log(`תקינים (valid)         : ${valid.length}`);
  console.log(`נפסלו (rejected)       : ${rejected.length}`);
  console.log(`כפילויות (duplicates)  : ${duplicates}`);
  console.log(`בלי כתובת (no address) : ${noAddress}`);
  console.log(`ערים ייחודיות (cities) : ${cities.size}`);
  console.log('אחוזי מילוי            :',
    `name ${fillRate(raw, 'name')}% ·`,
    `city ${fillRate(raw, 'city')}% ·`,
    `address ${fillRate(raw, 'address')}% ·`,
    `phone ${fillRate(raw, 'phone')}% ·`,
    `hours ${fillRate(raw, 'hoursSummer')}% ·`,
    `accessibility ${fillRate(raw, 'accessibility')}%`);
  console.log(`\nנכתב → ${RAW_OUT}`);
  console.log(`נכתב → ${NORM_OUT}`);
  console.log('הערה: אין lat/lng בשלב זה — geocoding יבוצע בשלב 3.');
  return valid;
}

if (isMain(import.meta.url)) {
  importMikvahs().catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  });
}
