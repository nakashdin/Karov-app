/**
 * READ-ONLY: settles the Architect's hypothesis before Stage 3's general
 * fetch loop is built — docs/CERT_REFRESH_DESIGN.md's identity design,
 * §9/§10 background. If Tzohar publishes a renewal as a NEW upload + NEW
 * listing while leaving the old listing (and its certificate) reachable,
 * then a duplicate coordinate cluster is the renewal's footprint, and a
 * record that still resolves fine against ITS OWN stored URL could be
 * silently reading a stale document while a newer one sits at the other
 * listing in the same cluster — the worst failure shape, because nothing
 * about it fails.
 *
 * Writes nothing — this only fetches certificate PDFs and compares.
 *
 * Usage: node importers/tzohar/duplicate-cluster-check.mjs --feed <raw-feed.json>
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pdfText, parseValiditySignal, parseIdentity } from './pdf-extract.mjs';
import { nameScore } from '../../scripts/shared/tzohar-identity-match.mjs';

const args = process.argv.slice(2);
const feedPath = args.includes('--feed') ? args[args.indexOf('--feed') + 1] : null;
if (!feedPath) {
  console.error('Usage: node importers/tzohar/duplicate-cluster-check.mjs --feed <raw-feed.json>');
  process.exit(2);
}

const feed = JSON.parse(readFileSync(resolve(feedPath), 'utf8'));
console.log(`Live feed: ${feed.length} entries`);

// Same clustering as the match report: exact-coordinate groups.
const key = (e) => `${e.lat.toFixed(5)},${e.lng.toFixed(5)}`;
const groups = new Map();
for (const e of feed) {
  const k = key(e);
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(e);
}
const coordClusters = [...groups.values()].filter((g) => g.length > 1);

// Only clusters where the listings are plausibly the SAME business (not
// different businesses that happen to be co-located, e.g. a food court) —
// the renewal-footprint hypothesis only makes sense for the former.
const NAME_SIM_FLOOR = 0.5;
const sameBusinessClusters = coordClusters.filter((c) => {
  let maxScore = 0;
  for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) maxScore = Math.max(maxScore, nameScore(c[i].store, c[j].store));
  return maxScore >= NAME_SIM_FLOOR;
}).map((c) => c.filter((e) => e.certUrl)); // only listings that actually have a certificate URL to fetch

console.log(`Coordinate clusters (>1 listing at the same point): ${coordClusters.length}`);
console.log(`...of which same-business (name similarity >= ${NAME_SIM_FLOOR}), at least 2 with a fetchable URL: ${sameBusinessClusters.filter((c) => c.length > 1).length}`);
console.log(`\nFetching every certificate in every same-business cluster...\n`);

let sameValidity = 0, differentValidity = 0, unknownValidity = 0, fetchFailed = 0;
const differing = [];

for (const cluster of sameBusinessClusters) {
  if (cluster.length < 2) continue; // only one had a URL — nothing to compare
  const fetched = [];
  for (const entry of cluster) {
    try {
      const res = await fetch(entry.certUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const lines = pdfText(buf);
      fetched.push({ entry, validity: parseValiditySignal(lines), identity: parseIdentity(lines) });
    } catch (e) {
      fetchFailed++;
      console.log(`  ✗ fetch/parse failed: ${entry.store} (${entry.tzoharId}) ${entry.certUrl} — ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  if (fetched.length < 2) continue;

  const kinds = new Set(fetched.map((f) => f.validity.kind));
  const values = new Set(fetched.map((f) => f.validity.value));
  if (kinds.has('unknown')) {
    unknownValidity++;
    console.log(`  ? ${fetched[0].entry.store}: at least one listing has no parseable validity signal at all — ${fetched.map((f) => `${f.entry.tzoharId}=${JSON.stringify(f.validity)}`).join(', ')}`);
  } else if (kinds.size === 1 && values.size === 1) {
    sameValidity++;
    console.log(`  = ${fetched[0].entry.store}: all ${fetched.length} listings agree (${fetched[0].validity.kind}: ${fetched[0].validity.value})`);
  } else {
    differentValidity++;
    const detail = fetched.map((f) => `${f.entry.tzoharId} (${f.entry.certUrl.split('/').pop()}): ${f.validity.kind}=${f.validity.value}`).join(' | ');
    console.log(`  ✗ DIFFERENT ${fetched[0].entry.store}: ${detail}`);
    differing.push({ store: fetched[0].entry.store, listings: fetched.map((f) => ({ tzoharId: f.entry.tzoharId, certUrl: f.entry.certUrl, validity: f.validity })) });
  }
}

console.log(`\n=== Hypothesis test result ===`);
console.log(`clusters where all listings agree on validity     : ${sameValidity}`);
console.log(`clusters where listings DISAGREE (renewal footprint, if so)      : ${differentValidity}`);
console.log(`clusters with an unparseable listing (inconclusive): ${unknownValidity}`);
console.log(`fetch/parse failures                                : ${fetchFailed}`);

if (differentValidity > 0) {
  console.log(`\nHYPOTHESIS SUPPORTED for ${differentValidity} cluster(s): duplicate listings can carry genuinely different validity info.`);
  console.log(`This means "our stored URL is still reachable" is NOT sufficient evidence it's current — the other listing in the cluster must be checked too.`);
} else if (sameValidity > 0) {
  console.log(`\nHYPOTHESIS NOT SUPPORTED on this data: every cluster with a comparison had listings agreeing on validity.`);
  console.log(`This does not rule out staleness where BOTH listings share an old value — it only shows the two listings aren't diverging from each other.`);
}
