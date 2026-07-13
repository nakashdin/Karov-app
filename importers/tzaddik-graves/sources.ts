/**
 * Source configuration for the tzaddik graves (קברי צדיקים) importer.
 *
 * Two primary sources — both openly licensed:
 *   1. OpenStreetMap (ODbL) — has coordinates, sparse coverage.
 *   2. Wikidata (CC0) — two queries: grave items + rabbis buried in Israel.
 *
 * ADDITIVE-ONLY: writes only to output/ (dry-run). Never touches src/data/generated/.
 */

/** Raw source identifier for a grave record. */
export type GraveOrigin = 'osm' | 'wikidata-graves' | 'wikidata-rabbis';

export const LICENSES = {
  osm: {
    id: 'ODbL',
    attribution: '© OpenStreetMap contributors (ODbL)',
    commercialOk: true,
  },
  wikidata: {
    id: 'CC0',
    attribution: 'Wikidata (CC0)',
    commercialOk: true,
  },
} as const;

// --- OpenStreetMap (Overpass) -----------------------------------------------

export const OVERPASS_QUERY = `[out:json][timeout:120];
(
  node["historic"="tomb"]["religion"="jewish"](29.3,34.2,33.5,35.95);
  way["historic"="tomb"]["religion"="jewish"](29.3,34.2,33.5,35.95);
  node["historic"="memorial"]["religion"="jewish"](29.3,34.2,33.5,35.95);
  node["tomb"="yes"]["religion"="jewish"](29.3,34.2,33.5,35.95);
  node["historic"="tomb"](29.3,34.2,33.5,35.95);
);
out center tags;`;

// --- Wikidata (SPARQL) -------------------------------------------------------

export const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql';

/** Query 1 – explicit grave/tomb items located in Israel (Q173387=tomb, Q7205756=Jewish cemetery). */
export const SPARQL_GRAVES = `SELECT DISTINCT ?grave ?graveLabel ?lat ?lon ?personLabel ?hebrewName WHERE {
  { ?grave wdt:P31 wd:Q173387 . } UNION { ?grave wdt:P31 wd:Q7205756 . }
  ?grave wdt:P17 wd:Q801 .
  ?grave wdt:P625 ?coord .
  BIND(geof:latitude(?coord) AS ?lat)
  BIND(geof:longitude(?coord) AS ?lon)
  OPTIONAL { ?grave wdt:P921 ?person . OPTIONAL { ?person wdt:P1705 ?hebrewName } }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "he,en". }
} LIMIT 300`;

/** Query 2 – Jewish people with a burial place (P119) in Israel. */
export const SPARQL_RABBIS = `SELECT DISTINCT ?person ?personLabel ?burialPlace ?burialPlaceLabel ?lat ?lon WHERE {
  ?person wdt:P31 wd:Q5 .
  ?person wdt:P140 wd:Q9268 .
  ?person wdt:P119 ?burialPlace .
  ?burialPlace wdt:P17 wd:Q801 .
  ?burialPlace wdt:P625 ?coord .
  BIND(geof:latitude(?coord) AS ?lat)
  BIND(geof:longitude(?coord) AS ?lon)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "he,en". }
} LIMIT 300`;
