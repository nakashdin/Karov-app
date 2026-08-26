/**
 * READ-ONLY: Stage 3's fetch orchestration — the async wrapper around the
 * pure decision logic in stage3-verify.mjs. Produces a proposed-changes
 * report. NEVER writes places.osm.json — per the Architect's hard boundary,
 * the write is a separate step taken to the owner with this report as
 * evidence, not performed by this script.
 *
 * For each of our Tzohar-certified records:
 *   1. Stage 2 match against the live feed (tzohar-identity-match.mjs).
 *   2. Candidates = the matched entry + every coordinate cluster-mate
 *      (same exact-coordinate grouping as duplicate-cluster-check.mjs) —
 *      cluster membership decides what to fetch, never what to trust.
 *   3. Fetch + parse every candidate's certificate independently.
 *   4. resolveCertificate() decides the outcome — identity-verified per
 *      candidate, agreement required across all identity-verified
 *      candidates, never a blind max (see stage3-verify.mjs's header).
 *
 * Usage:
 *   node importers/tzohar/stage3-report.mjs --feed <raw-feed.json> [--only-expired] [--save <file>]
 *
 *   --only-expired  restrict to records whose stored certificateValidUntil
 *                    is already in the past — the Architect's priority 1
 *                    (the 12 live-misrepresentation cases).
 *   --save <file>    write the full report as JSON, in addition to stdout.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pdfText, parseValiditySignal, parseIdentity } from './pdf-extract.mjs';
import { matchTzoharRecord } from '../../scripts/shared/tzohar-identity-match.mjs';
import { resolveCertificate } from './stage3-verify.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PLACES_PATH = resolve(ROOT, 'src/data/generated/places.osm.json');

const args = process.argv.slice(2);
const feedPath = args.includes('--feed') ? args[args.indexOf('--feed') + 1] : null;
const onlyExpired = args.includes('--only-expired');
const savePath = args.includes('--save') ? args[args.indexOf('--save') + 1] : null;
const todayISO = new Date().toISOString().slice(0, 10);

if (!feedPath) {
  console.error('Usage: node importers/tzohar/stage3-report.mjs --feed <raw-feed.json> [--only-expired] [--save <file>]');
  process.exit(2);
}

function readNoBom(p) {
  const buf = readFileSync(p);
  const s = (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) ? buf.slice(3) : buf;
  return JSON.parse(s.toString('utf8'));
}
function normalizeLiveEntries(raw) {
  return raw.map((r) => ('tzoharId' in r ? r : {
    tzoharId: String(r.id), store: r.store, address: r.address, city: r.city,
    lat: r.lat !== undefined ? Number(r.lat) : null, lng: r.lng !== undefined ? Number(r.lng) : null,
    phone: r.phone || null, certUrl: r.address2 || null,
  }));
}
const clusterKey = (e) => `${e.lat?.toFixed(5)},${e.lng?.toFixed(5)}`;

const places = readNoBom(PLACES_PATH);
let ourRecords = places.filter((p) => p.certifiedBy === 'צהר');
if (onlyExpired) ourRecords = ourRecords.filter((p) => p.certificateValidUntil && p.certificateValidUntil < todayISO);
console.log(`Our Tzohar-certified records to check: ${ourRecords.length}${onlyExpired ? ' (already-expired only)' : ''}`);

const liveEntries = normalizeLiveEntries(readNoBom(resolve(feedPath)));
console.log(`Live feed: ${liveEntries.length} entries`);

const byCluster = new Map();
for (const e of liveEntries) {
  const k = clusterKey(e);
  if (!byCluster.has(k)) byCluster.set(k, []);
  byCluster.get(k).push(e);
}

const fetchCache = new Map(); // certUrl -> {identityBlob, validity} | 'unreachable', so a shared cluster-mate is only fetched once
async function fetchAndParse(certUrl) {
  if (fetchCache.has(certUrl)) return fetchCache.get(certUrl);
  let result;
  try {
    const res = await fetch(certUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const lines = pdfText(buf);
    result = { fetchStatus: 'ok', identityBlob: parseIdentity(lines), validity: parseValiditySignal(lines) };
  } catch (e) {
    result = { fetchStatus: 'unreachable', error: e.message };
  }
  fetchCache.set(certUrl, result);
  await new Promise((r) => setTimeout(r, 300));
  return result;
}

const results = [];
const byKind = {};

for (const our of ourRecords) {
  const stage2 = matchTzoharRecord(our, liveEntries);
  let outcome;
  if (stage2.status === 'unmatched') {
    outcome = { kind: 'NOT_FOUND', reason: 'Stage 2: no live candidate cleared the confidence floor' };
  } else if (stage2.status === 'ambiguous') {
    outcome = { kind: 'AMBIGUOUS_BUSINESS_MATCH', reason: stage2.reason, candidates: stage2.candidates.map((c) => ({ tzoharId: c.entry.tzoharId, store: c.entry.store, score: c.score })) };
  } else {
    const matched = stage2.matchedEntry;
    const clusterMates = (byCluster.get(clusterKey(matched)) || []).filter((e) => e.tzoharId !== matched.tzoharId);
    const candidateEntries = [matched, ...clusterMates].filter((e) => e.certUrl);
    const candidates = [];
    for (const entry of candidateEntries) {
      const fetched = await fetchAndParse(entry.certUrl);
      candidates.push({ tzoharId: entry.tzoharId, certUrl: entry.certUrl, ...fetched });
    }
    outcome = resolveCertificate(our, candidates, { today: todayISO });
    outcome.stage2Score = stage2.score;
    outcome.candidatesChecked = candidateEntries.length;
  }

  results.push({ ourId: our.id, ourName: our.name, priorValidUntil: our.certificateValidUntil ?? null, outcome });
  byKind[outcome.kind] = (byKind[outcome.kind] || 0) + 1;
  console.log(`  [${outcome.kind}] ${our.id} (${our.name}): ${outcome.reason}`);
}

console.log(`\n=== Stage 3 summary ===`);
for (const [kind, n] of Object.entries(byKind)) console.log(`  ${kind.padEnd(28)} ${n}`);

const proposed = results.filter((r) => r.outcome.kind === 'VERIFIED' && r.outcome.changed);
console.log(`\n=== Proposed changes (VERIFIED + changed) — NOT applied, for the Architect to take to the owner ===`);
for (const r of proposed) {
  console.log(`  ${r.ourId} (${r.ourName}): ${r.priorValidUntil ?? '(none)'} -> ${r.outcome.value}`);
}

const staleListed = results.filter((r) => r.outcome.kind === 'LISTED_BUT_DOCUMENT_STALE');
if (staleListed.length > 0) {
  console.log(`\n=== LISTED_BUT_DOCUMENT_STALE (${staleListed.length}) — business still supervised, but no current document exists on the feed to point at ===`);
  for (const r of staleListed) console.log(`  ${r.ourId} (${r.ourName}): stuck at ${r.outcome.value}`);
}

const wrongBusiness = results.filter((r) => r.outcome.kind === 'WRONG_BUSINESS');
if (wrongBusiness.length > 0) {
  console.log(`\n=== WRONG_BUSINESS (${wrongBusiness.length}) — Stage 2 matched, but no candidate's own printed identity confirms it ===`);
  for (const r of wrongBusiness) console.log(`  ${r.ourId} (${r.ourName})`);
}

const ambiguousDate = results.filter((r) => r.outcome.kind === 'AMBIGUOUS_DATE');
if (ambiguousDate.length > 0) {
  console.log(`\n=== AMBIGUOUS_DATE (${ambiguousDate.length}) — identity-verified candidates disagree, never resolved by a max ===`);
  for (const r of ambiguousDate) console.log(`  ${r.ourId} (${r.ourName})`);
}

if (savePath) {
  const dest = resolve(savePath);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, JSON.stringify({ generatedAt: todayISO, onlyExpired, byKind, results }, null, 2));
  console.log(`\nFull report saved to ${dest} (analysis artifact — src/data/generated/ was only ever read)`);
}
