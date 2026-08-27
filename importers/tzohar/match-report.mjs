/**
 * READ-ONLY report: match our Tzohar-certified places.osm.json records
 * against Tzohar's live store_search feed (Stage 1 + Stage 2 of
 * docs/KASHRUT_FACTS.md's cert-refresh design). Writes nothing —
 * src/data/generated/places.osm.json is only ever read here.
 *
 * Usage:
 *   node importers/tzohar/match-report.mjs --input <live-feed.json>
 *   node importers/tzohar/match-report.mjs --sweep [--step 0.25] [--delay 400]
 *
 *   --input <file>  use a previously-fetched store_search sweep (a JSON
 *                    array of raw store_search entries, decoded or not —
 *                    both accepted) instead of hitting the network.
 *   --sweep          fetch a fresh sweep from the live endpoint now.
 *                    Exactly one of --input / --sweep is required.
 *   --save <file>    also write the full match report (JSON) to this path
 *                    under scripts/reports/ — an analysis artifact, same
 *                    class as scripts/reports/kashrut-registry.json, never
 *                    a dataset file. Omit to only print to stdout.
 *
 * Stage 3 (verifying the fetched certificate PDF's own printed identity)
 * is NOT performed here — this script never fetches a certificate PDF, only
 * the business-list feed. A "matched" result here is a Stage-2 candidate,
 * not a value ready to apply.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { israelGrid, sweepIsrael } from './store-search.mjs';
import { matchTzoharRecord } from '../../scripts/shared/tzohar-identity-match.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PLACES_PATH = resolve(ROOT, 'src/data/generated/places.osm.json');

const args = process.argv.slice(2);
const inputPath = args.includes('--input') ? args[args.indexOf('--input') + 1] : null;
const doSweep = args.includes('--sweep');
const savePath = args.includes('--save') ? args[args.indexOf('--save') + 1] : null;
const stepDeg = args.includes('--step') ? Number(args[args.indexOf('--step') + 1]) : 0.25;
const delayMs = args.includes('--delay') ? Number(args[args.indexOf('--delay') + 1]) : 400;

if (!inputPath && !doSweep) {
  console.error('Usage: node importers/tzohar/match-report.mjs --input <file> | --sweep [--step D] [--delay MS] [--save <file>]');
  process.exit(2);
}
if (inputPath && doSweep) {
  console.error('--input and --sweep are mutually exclusive — pick one source for the live feed.');
  process.exit(2);
}

function readNoBom(p) {
  const buf = readFileSync(p);
  const s = (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) ? buf.slice(3) : buf;
  return JSON.parse(s.toString('utf8'));
}

/** Accept either raw store_search entries or already-decoded ones (from a prior sweepIsrael() run). */
function normalizeLiveEntries(raw) {
  return raw.map((r) => {
    if ('tzoharId' in r) return r; // already normalized (e.g. saved from sweepIsrael)
    return {
      tzoharId: String(r.id),
      store: r.store,
      address: r.address,
      city: r.city,
      lat: r.lat !== undefined ? Number(r.lat) : null,
      lng: r.lng !== undefined ? Number(r.lng) : null,
      phone: r.phone || null,
      certUrl: r.address2 || null,
    };
  });
}

const places = readNoBom(PLACES_PATH);
const ourRecords = places.filter((p) => p.certifiedBy === 'צהר');
console.log(`Our Tzohar-certified records: ${ourRecords.length} (${ourRecords.filter((p) => p.kosherCertUrl).length} with a stored certificate URL)`);

let liveRaw;
if (inputPath) {
  liveRaw = readNoBom(resolve(inputPath));
  console.log(`Live feed loaded from ${inputPath}: ${liveRaw.length} raw entries`);
} else {
  console.log(`Sweeping Tzohar's live feed (grid step ${stepDeg}°, ${delayMs}ms between calls)...`);
  const points = israelGrid(stepDeg);
  console.log(`  ${points.length} grid points to cover`);
  liveRaw = await sweepIsrael({ stepDeg, delayMs, onProgress: ({ index, total, newTotal }) => {
    if (index % 10 === 0 || index === total - 1) console.log(`  ${index + 1}/${total} points swept, ${newTotal} distinct businesses so far`);
  } });
  console.log(`Sweep complete: ${liveRaw.length} distinct businesses`);
}

const liveEntries = normalizeLiveEntries(liveRaw);

const results = [];
for (const our of ourRecords) {
  const r = matchTzoharRecord(our, liveEntries);
  results.push({ ourId: our.id, ourName: our.name, certificateValidUntil: our.certificateValidUntil, ourCertUrl: our.kosherCertUrl, ...r });
}

const byStatus = { matched: [], ambiguous: [], unmatched: [] };
for (const r of results) byStatus[r.status].push(r);

console.log(`\n=== Match summary ===`);
console.log(`matched   : ${byStatus.matched.length}`);
console.log(`ambiguous : ${byStatus.ambiguous.length}`);
console.log(`unmatched : ${byStatus.unmatched.length}`);

const urlDiffs = byStatus.matched.filter((r) => r.ourCertUrl && r.matchedEntry.certUrl && r.ourCertUrl !== r.matchedEntry.certUrl);
console.log(`\nmatched records whose LIVE cert URL differs from ours (renewal signal, Stage 3 still required before trusting): ${urlDiffs.length}`);
for (const r of urlDiffs.slice(0, 20)) {
  console.log(`  ${r.ourId} (${r.ourName}): ${r.ourCertUrl} -> ${r.matchedEntry.certUrl}`);
}

const sept11 = results.filter((r) => r.certificateValidUntil === '2026-09-11');
const sept11Matched = sept11.filter((r) => r.status === 'matched');
console.log(`\n2026-09-11 cohort: ${sept11.length} of our records, ${sept11Matched.length} matched to a live entry (refreshable pending Stage 3), ${sept11.length - sept11Matched.length} not matched`);

if (byStatus.ambiguous.length > 0) {
  console.log(`\n=== Ambiguous (top 10) — NOT auto-resolved, needs a human or a tighter signal ===`);
  for (const r of byStatus.ambiguous.slice(0, 10)) {
    console.log(`  ${r.ourId} (${r.ourName}): ${r.reason}`);
  }
}

if (savePath) {
  const dest = savePath.startsWith('/') || /^[A-Za-z]:/.test(savePath) ? savePath : join(ROOT, savePath);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), summary: { matched: byStatus.matched.length, ambiguous: byStatus.ambiguous.length, unmatched: byStatus.unmatched.length }, results }, null, 2));
  console.log(`\nFull report saved to ${dest} (analysis artifact — not a dataset file, nothing under src/data/generated/ was written)`);
}
