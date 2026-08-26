/**
 * Kosher-restaurant importer — OpenStreetMap (Overpass), all of Israel.
 *
 * Run:  npm run import:restaurants  (or: node importers/kosher-restaurants/importer.ts)
 * Out:  src/data/generated/restaurants.osm.json only — the live places.osm.json
 *       dataset is never touched by this importer (see the isMain block below).
 *       The category-file write itself is guarded: restaurants.osm.json is also
 *       written additively by 80+ one-shot scripts, so a plain overwrite from
 *       this run's own OSM query would erase whatever they added. See
 *       writeCategoryGuarded() in ../shared/database.ts.
 *
 * Source notes + the open coverage gap live in this folder's README.md.
 */
import type { NormalizedPlace } from '../shared/types.ts';
import { dedupeById, fetchLocalities, fetchOverpass, fillRate, isMain } from '../shared/utils.ts';
import {
  CATEGORY_FILES,
  formatCategoryOverwriteReport,
  formatRebuildReport,
  planAppDatasetRebuild,
  planCategoryOverwrite,
  writeCategoryGuarded,
} from '../shared/database.ts';
import { transformRestaurant } from './transform.ts';
import { validateRestaurants } from './validate.ts';

const QUERY = `[out:json][timeout:180];
area["ISO3166-1"="IL"][admin_level=2]->.il;
(
  nwr["diet:kosher"~"yes|only|designated"]["amenity"](area.il);
);
out center tags;`;

/** Fetch → transform → validate → write the restaurant category file. */
export async function importRestaurants(): Promise<NormalizedPlace[]> {
  const localities = await fetchLocalities();

  const data = await fetchOverpass(QUERY, 'restaurants');
  const elements = data.elements || [];
  console.log(`Raw kosher elements: ${elements.length}`);

  const normalized = dedupeById(
    elements
      .map((el: any) => transformRestaurant(el, localities))
      .filter((p: NormalizedPlace | null): p is NormalizedPlace => p !== null),
  );

  const { valid, rejected } = validateRestaurants(normalized);

  console.log(`\nKosher restaurants: ${valid.length} valid, ${rejected.length} rejected`);
  console.log(`Field fill: name ${fillRate(valid, 'name')}% · address ${fillRate(valid, 'address')}% · phone ${fillRate(valid, 'phone')}% · hours ${fillRate(valid, 'openingHours')}%`);

  // restaurants.osm.json is also written additively by 80+ one-shot
  // scripts; a plain overwrite here would erase every record this run's
  // own OSM query doesn't reproduce. See writeCategoryGuarded()'s doc
  // comment in ../shared/database.ts.
  //
  // Plan, print, THEN write — not write-then-print. On a blocked run the
  // report was always visible either way (writeCategoryGuarded throws it
  // inside the error), but on a PASSING run write-then-print means the
  // human only sees the per-survivor impact after it is already on disk.
  // For a design whose second half is "report what may be," that ordering
  // was backwards. The extra planCategoryOverwrite() call below is
  // read-only and cheap; not worth threading its result through
  // writeCategoryGuarded() just to avoid computing it twice.
  const plan = planCategoryOverwrite(CATEGORY_FILES.restaurant, valid);
  console.log(`\n${formatCategoryOverwriteReport(plan)}`);

  const report = writeCategoryGuarded(CATEGORY_FILES.restaurant, valid);
  console.log(`\nWrote → ${report.path}`);
  return valid;
}

if (isMain(import.meta.url)) {
  importRestaurants()
    .then(() => {
      // This used to call rebuildAppDataset(), which reconstructed
      // places.osm.json from the per-type category files and therefore deleted
      // every record written by any other importer (measured: 60.8% of the
      // dataset). The import above writes ONLY its own category file; the live
      // dataset is untouched. See docs/DATA_ARCHITECTURE.md §6.
      const plan = planAppDatasetRebuild();
      console.log('\nLive dataset NOT modified. A legacy rebuild would have:\n');
      console.log(formatRebuildReport(plan));
    })
    .catch((e) => {
      console.error('Failed:', e);
      process.exit(1);
    });
}
