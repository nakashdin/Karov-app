#!/usr/bin/env node
/**
 * Loss audit for the 358 records whose `kosherLevel: 'mehadrin'` was derived
 * from the certifying BODY rather than read from the source text.
 *
 * Produced under the traceability standard: a cleanup that removes a structured
 * claim must record WHERE the affected records came from, WHY they failed the
 * evidence rules, and WHETHER the information can be reacquired — not just a
 * before/after count. See docs/audit-358-level-removal.md for the prose report
 * and docs/KASHRUT_FACTS.md §5b for the population definition.
 *
 * Deterministic and side-effect free. Reads committed data only; writes one
 * JSON artifact next to itself. No absolute paths — this runs in CI and on
 * anyone's checkout.
 *
 *   node scripts/reports/audit-358-level-removal.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const read = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8').replace(/^\uFEFF/, ''));

const places = read('src/data/generated/places.osm.json');
const cities = read('src/data/generated/cities.osm.json');
const registry = read('scripts/reports/kashrut-registry.json');

const aliasByRaw = new Map(registry.aliases.map((a) => [a.raw, a]));
const authById = new Map(registry.authorities.map((a) => [a.id, a]));
const reviewQueue = new Set(registry.reviewQueue.map((r) => (typeof r === 'string' ? r : r.raw)));
const cityName = new Map(cities.map((c) => [c.id, c.name ?? c.nameHe ?? c.id]));

/**
 * The population, restated so this file is checkable on its own: currently at
 * mehadrin, has raw certifiedBy text, that text is NOT deferred to human review,
 * it resolves to a registry alias, and that alias names an authority while
 * declining to state a level. i.e. the level cannot have come from the text.
 */
function isBodyInferredMehadrin(place) {
  if (place.kosherLevel !== 'mehadrin') return false;
  const raw = place.certifiedBy;
  if (!raw || reviewQueue.has(raw)) return false;
  const alias = aliasByRaw.get(raw);
  if (!alias) return false;
  return alias.level !== 'mehadrin' && !!alias.authorityId;
}

/**
 * `kosherType` values that already assert a LEVEL rather than a body. Their
 * presence means the level predates migrate-kosher-fields.mjs — see the two
 * inference sites in the prose report.
 */
const LEVEL_BEARING_TYPES = new Set(['mehadrin', 'rabanut_mehadrin', 'rabanut_mehadrin_jerusalem']);

const affected = places.filter(isBodyInferredMehadrin);

const rows = affected.map((p) => {
  const alias = aliasByRaw.get(p.certifiedBy);
  const authority = authById.get(alias.authorityId);
  const upstream = LEVEL_BEARING_TYPES.has(p.kosherType);
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    cityId: p.cityId,
    city: cityName.get(p.cityId) ?? null,
    removed: { kosherLevel: 'mehadrin' },
    retained: {
      certifierId: alias.authorityId,
      certifierNameHe: authority?.nameHe ?? null,
      kosherAuthorityGroup: p.kosherAuthorityGroup ?? null,
      certifiedBy: p.certifiedBy,
    },
    // Why the claim fails the evidence rules: the raw text names this body and
    // says nothing about a level, and the registry recorded that by declining.
    aliasLevel: alias.level,
    kosherType: p.kosherType ?? null,
    failure: 'BAD_INTERNAL_INFERENCE',
    inferenceSite: upstream ? 'B_upstream_kosherType' : 'A_migration_map',
    evidence: {
      kosherCertUrl: p.kosherCertUrl ?? null,
      certificateValidUntil: p.certificateValidUntil ?? null,
      kosherDetails: p.kosherDetails ? true : false,
      sourceUrl: p.sourceUrl ?? null,
      source: p.source ?? null,
      provenance: Array.isArray(p.provenance) ? p.provenance.length : p.provenance ? 1 : 0,
    },
  };
});

const tally = (list, key) =>
  Object.fromEntries(
    Object.entries(list.reduce((m, x) => ((m[key(x)] = (m[key(x)] ?? 0) + 1), m), {})).sort(
      (a, b) => b[1] - a[1],
    ),
  );

// Chain guess from the id. This is INFERENCE, not recorded provenance — the
// dataset has no field that says which pipeline wrote these records.
const chainGuess = (id) => id.match(/^manual-([a-z0-9]+)-/)?.[0].slice(0, -1) ?? id.match(/^([a-z0-9]+)-/)?.[1] ?? id;

const mehadrinAll = places.filter((p) => p.kosherLevel === 'mehadrin');
const hadByCity = mehadrinAll.reduce((m, p) => ((m[p.cityId] = (m[p.cityId] ?? 0) + 1), m), {});
const lostByCity = affected.reduce((m, p) => ((m[p.cityId] = (m[p.cityId] ?? 0) + 1), m), {});

const regions = Object.entries(lostByCity)
  .map(([cityId, lost]) => ({
    cityId,
    city: cityName.get(cityId) ?? cityId,
    lost,
    had: hadByCity[cityId] ?? lost,
    pctLost: Math.round((lost / (hadByCity[cityId] ?? lost)) * 100),
  }))
  .sort((a, b) => b.lost - a.lost || b.pctLost - a.pctLost);

const report = {
  generatedFrom: 'src/data/generated/places.osm.json + scripts/reports/kashrut-registry.json',
  population: 'kosherLevel=mehadrin, certifiedBy resolves to a non-deferred alias that names an authority and declines a level',
  affected: affected.length,
  operation: "kosherLevel: 'mehadrin' -> null (explicit). certifierId, kosherAuthorityGroup and certifiedBy are retained.",
  failureClassification: {
    BAD_INTERNAL_INFERENCE: affected.length,
    BAD_SOURCE: 0,
    MISSING_SOURCE: 0,
    AMBIGUOUS_SOURCE: 0,
    EXPIRED_SOURCE: 0,
  },
  inferenceSites: tally(rows, (r) => r.inferenceSite),
  byAuthority: tally(rows, (r) => r.retained.certifierId),
  byPlaceType: tally(rows, (r) => r.type),
  byAuthorityGroup: tally(rows, (r) => r.retained.kosherAuthorityGroup ?? '(none)'),
  bySourceField: tally(rows, (r) => r.evidence.source ?? '(none)'),
  byIdPrefixInferred: tally(rows, (r) => chainGuess(r.id)),
  evidenceAvailable: {
    kosherCertUrl: rows.filter((r) => r.evidence.kosherCertUrl).length,
    certificateValidUntil: rows.filter((r) => r.evidence.certificateValidUntil).length,
    kosherDetails: rows.filter((r) => r.evidence.kosherDetails).length,
    sourceUrl: rows.filter((r) => r.evidence.sourceUrl).length,
    provenanceEntries: rows.filter((r) => r.evidence.provenance > 0).length,
  },
  regions,
  citiesFullyCleared: regions.filter((r) => r.pctLost === 100).length,
  rows,
};

const out = resolve(here, 'audit-358-level-removal.json');
writeFileSync(out, JSON.stringify(report, null, 2) + '\n');

console.log(`affected: ${report.affected}`);
console.log(`inference sites: ${JSON.stringify(report.inferenceSites)}`);
console.log(`evidence available: ${JSON.stringify(report.evidenceAvailable)}`);
console.log(`cities affected: ${regions.length} (fully cleared: ${report.citiesFullyCleared})`);
console.log(`\nwritten to ${out}`);
