/**
 * Recover the ORIGIN of every record in places.osm.json and express it in the
 * unified source vocabulary, using only deterministic evidence already present
 * in the data.
 *
 * Writes an additive `sourceRef` object and nothing else:
 *
 *   sourceRef: {
 *     sourceId:    'arcgis:tel-aviv:synagogues',  // unified registry id
 *     resolvedBy:  'provenance.source',            // which rule fired
 *     confidence:  'stated' | 'derived',           // stated = the record said so
 *     contributors?: ['arcgis:herzliya']           // ENRICHMENT sources, kept apart
 *   }
 *
 * ── Why a new field and not `provenance` ────────────────────────────────────
 * The existing top-level `provenance` carries FOUR incompatible shapes, two of
 * which describe ENRICHMENT rather than origin:
 *
 *   by+source+sourceUrl                    1665  ORIGIN     (arcgis municipal)
 *   council+source+sourceUrl               1123  ORIGIN     (religious council)
 *   enrichedBy+fields+source+sourceRecordId 177  ENRICHMENT (id says osm-, source says arcgis:*)
 *   council+enrichedBy+fields+sourceId      127  ENRICHMENT (sourceId is the ENRICHING record's id)
 *
 * Reading `provenance.source` as origin would mislabel 177 OpenStreetMap
 * records as municipal ArcGIS records, and `provenance.sourceId` already means
 * "the id of the record that enriched me" on 127 rows. Writing origin into
 * either key would corrupt data that is currently correct. `sourceRef` is
 * therefore additive and collision-free.
 *
 * Usage:
 *   node scripts/map-provenance.mjs                 # dry-run + report (default)
 *   node scripts/map-provenance.mjs --report out.json
 *   node scripts/map-provenance.mjs --apply         # writes sourceRef, nothing else
 */
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PLACES = resolve(root, 'src/data/generated/places.osm.json');

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const REPORT_PATH = argv.includes('--report') ? argv[argv.indexOf('--report') + 1] : null;
/** Full id → resolution map, for independent verification of every record. */
const EMIT_MAP_PATH = argv.includes('--emit-map') ? argv[argv.indexOf('--emit-map') + 1] : null;

const FOOD_TYPES = new Set([
  'restaurant', 'fast_food', 'cafe', 'coffee_cart',
  'juice_bar', 'ice_cream_parlor', 'bakery', 'winery',
]);

const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const host = (u) => {
  try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return null; }
};
const slug = (s) =>
  String(s).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9:_-]/g, '');

/**
 * Council slug from an `rc-…` id.
 *
 * Ids come in two suffix forms — numeric (`rc-petah-tikva-9273`) and hash
 * (`rc-yehud-hmi5h6z`) — so the rule is "drop the last hyphen token". The
 * result is then checked against a vocabulary derived from the data itself
 * (`buildCouncilVocabulary`), so a malformed id yields null rather than an
 * invented council.
 */
function councilSlugCandidate(id) {
  const m = /^rc-(?:mikvah-)?(.+)-([^-]+)$/.exec(id);
  if (!m) return null;
  const candidate = m[1];
  return /^[a-z][a-z0-9-]*$/.test(candidate) ? candidate : null;
}

/**
 * Which council slugs are real? A candidate is accepted when it appears on at
 * least two records (a one-off cannot establish a council) or when the
 * Phase-17A partition already registered it. Both are repository evidence.
 */
function buildCouncilVocabulary(places) {
  const counts = new Map();
  for (const p of places) {
    const c = councilSlugCandidate(String(p.id));
    if (c) counts.set(c, (counts.get(c) || 0) + 1);
  }
  const registered = new Set();
  const previewPath = resolve(root, 'importers/unified/output/partition-preview/partition-summary.json');
  if (existsSync(previewPath)) {
    try {
      const summary = JSON.parse(readFileSync(previewPath, 'utf8'));
      for (const key of Object.keys(summary.recordsBySourceId ?? {})) {
        if (key.startsWith('council:')) registered.add(key.split(':')[1]);
      }
    } catch { /* preview is optional evidence */ }
  }
  const vocab = new Set(registered);
  for (const [slugName, n] of counts) if (n >= 2) vocab.add(slugName);
  return vocab;
}

let COUNCIL_VOCAB = new Set();

function councilSlugFromId(id) {
  const c = councilSlugCandidate(id);
  return c && COUNCIL_VOCAB.has(c) ? c : null;
}

/** OSM bucket for a place type, matching the Phase-17A taxonomy. */
function osmBucket(type) {
  if (type === 'synagogue') return 'osm:synagogues';
  if (type === 'mikveh') return 'osm:mikvahs';
  if (type === 'tzaddik_grave') return 'osm:tzaddik-graves';
  if (type === 'chabad_house') return 'osm:chabad';
  if (FOOD_TYPES.has(type)) return 'osm:restaurants';
  return 'osm:places';
}

// ───────────────────────────────────────────────────────────────────────────
// Rules. Ordered strongest-evidence-first; the FIRST that returns wins.
// A rule returns null when its evidence is absent OR ambiguous — never a guess.
// ───────────────────────────────────────────────────────────────────────────

const RULES = [
  {
    name: 'extra.provenance.sourceId',
    // The record already states a unified source id. Strongest possible evidence.
    run: (p) => {
      const v = str(p.extra?.provenance?.sourceId);
      return v ? { sourceId: v, confidence: 'stated' } : null;
    },
  },
  {
    name: 'extra.provenance.adapterId',
    // sabaiapps-mikvah-v1 + rc-mikvah-<slug>-<n> → council:<slug>:mikvah
    run: (p) => {
      const adapter = str(p.extra?.provenance?.adapterId);
      const rec = str(p.extra?.provenance?.sourceRecordId);
      if (!adapter || !rec) return null;
      if (adapter === 'sabaiapps-mikvah-v1') {
        const s = councilSlugFromId(rec);
        return s ? { sourceId: `council:${s}:mikvah`, confidence: 'stated' } : null;
      }
      return null;
    },
  },
  {
    name: 'extra.provenance.origins',
    // Chabad records record the upstream they were folded in from.
    run: (p) => {
      const origins = p.extra?.provenance?.origins;
      if (!Array.isArray(origins) || origins.length === 0) return null;
      // Only unambiguous single-origin records are mapped here.
      const uniq = [...new Set(origins.map(String))];
      if (uniq.length !== 1) return null;
      if (uniq[0] === 'osm') return { sourceId: osmBucket(p.type), confidence: 'stated' };
      if (uniq[0] === 'wikidata') return { sourceId: 'wikidata:places', confidence: 'stated' };
      if (uniq[0] === 'datagov') return { sourceId: 'datagov:amutot', confidence: 'stated' };
      return null;
    },
  },
  {
    name: 'provenance.source',
    // ORIGIN provenance only. `enrichedBy` marks the object as describing an
    // ENRICHMENT, in which case `source` names the enricher, not the origin.
    run: (p) => {
      const prov = p.provenance;
      if (!prov || typeof prov !== 'object') return null;
      if (prov.enrichedBy) return null; // ← the 177-record trap
      const src = str(prov.source);
      if (!src) return null;
      if (src.startsWith('arcgis:')) {
        return { sourceId: `${src}:synagogues`, confidence: 'stated' };
      }
      if (src === 'religious-council') {
        const s = councilSlugFromId(String(p.id));
        if (!s) return null; // council named but not resolvable to the id slug → not a guess
        return {
          sourceId: `council:${s}:${p.type === 'mikveh' ? 'mikvah' : 'synagogues'}`,
          confidence: 'stated',
        };
      }
      return null;
    },
  },
  {
    name: 'extra.dataSource',
    run: (p) => {
      const v = str(p.extra?.dataSource);
      if (!v) return null;
      if (v === 'data.gov.il') return { sourceId: 'datagov:mikve', confidence: 'stated' };
      const h = v.includes('.') ? v.replace(/^www\./, '').toLowerCase() : null;
      return h ? { sourceId: `chain:${slug(h.split('.')[0])}`, confidence: 'stated' } : null;
    },
  },
  {
    name: 'id-prefix',
    // The Phase-17A taxonomy, proven to classify 4,932 records with 0 orphans.
    run: (p) => {
      const id = String(p.id);
      if (/^osm-(node|way|relation)-/.test(id)) return { sourceId: osmBucket(p.type), confidence: 'derived' };
      if (/^arcgis:/.test(id)) {
        const m = /^arcgis:([^:]+)::/.exec(id);
        return m ? { sourceId: `arcgis:${m[1]}:synagogues`, confidence: 'derived' } : null;
      }
      if (/^rc-mikvah-/.test(id)) {
        const s = councilSlugFromId(id);
        return s ? { sourceId: `council:${s}:mikvah`, confidence: 'derived' } : null;
      }
      if (/^rc-/.test(id)) {
        const s = councilSlugFromId(id);
        return s ? { sourceId: `council:${s}:synagogues`, confidence: 'derived' } : null;
      }
      if (/^mikveh-osm-/.test(id)) return { sourceId: 'osm:mikvahs', confidence: 'derived' };
      if (/^mikveh-(tlv|tel-aviv)-/.test(id)) return { sourceId: 'gis:tel-aviv:mikvaot', confidence: 'derived' };
      if (/^mikveh-\d+$/.test(id)) return { sourceId: 'datagov:mikve', confidence: 'derived' };
      if (/^mikveh-/.test(id)) {
        // mikveh-<city>-<coords> → a municipal/council mikveh listing
        const m = /^mikveh-([a-z-]+?)-[\d.]/.exec(id);
        return m ? { sourceId: `council:${m[1]}:mikvah`, confidence: 'derived' } : null;
      }
      if (/^chabad-/.test(id)) return { sourceId: 'chabad:centers', confidence: 'derived' };
      if (/^tzohar-/.test(id)) return { sourceId: 'tzohar:certificates', confidence: 'derived' };
      if (/^tzaddik-/.test(id)) return { sourceId: 'wikidata:tzaddik-graves', confidence: 'derived' };
      return null;
    },
  },
  {
    name: 'sourceUrl-host',
    // An operator/chain website we actually read. Evidenced, so `chain:` is honest.
    run: (p) => {
      const h = host(str(p.sourceUrl));
      if (!h) return null;
      if (h === 'openstreetmap.org') return { sourceId: osmBucket(p.type), confidence: 'derived' };
      if (h === 'rabanut.org.il') return { sourceId: 'council:jerusalem:synagogues', confidence: 'derived' };
      if (h.endsWith('.muni.il') || /^(md|mp)[a-z]*\.org(\.il)?$/.test(h)) return null; // council sites: slug is not derivable from the host alone
      return { sourceId: `chain:${slug(h.split('.')[0])}`, confidence: 'derived' };
    },
  },
  {
    name: 'manual-batch',
    // `manual-<batch>-…` proves manual entry in a named batch. It does NOT prove
    // which website the data came from, so it maps to manual:<batch>, never
    // chain:<batch> — that distinction is the difference between a fact and a guess.
    run: (p) => {
      const m = /^manual-([a-z0-9]+(?:-[a-z0-9]+)?)-/.exec(String(p.id));
      return m ? { sourceId: `manual:${m[1]}`, confidence: 'derived' } : null;
    },
  },
  {
    name: 'numeric-legacy-batch',
    // 7-digit ids, all source:manual, all food. A real batch, origin undocumented.
    run: (p) => (/^\d{6,8}$/.test(String(p.id)) ? { sourceId: 'manual:legacy-numeric', confidence: 'derived' } : null),
  },
  {
    name: 'hashed-batch-id',
    // <batch>-<hex hash> ids created by the per-chain / per-venue import scripts.
    // The batch name is everything before the trailing hash, so `pizza-roma-46407d39`
    // resolves to manual:pizza-roma rather than the wrong manual:pizza.
    run: (p) => {
      const m = /^(.+)-[0-9a-f]{6,}$/i.exec(String(p.id));
      if (!m) return null;
      const batch = slug(m[1]);
      return batch ? { sourceId: `manual:${batch}`, confidence: 'derived' } : null;
    },
  },
  {
    name: 'leading-token',
    // Last resort. `landwer-airport-city` → manual:landwer. Records manual entry
    // and its batch; it deliberately does NOT claim a website was read.
    run: (p) => {
      const m = /^([a-zA-Z][a-zA-Z0-9]*)-.+/.exec(String(p.id));
      if (!m) return null;
      const batch = slug(m[1]);
      return batch.length >= 3 ? { sourceId: `manual:${batch}`, confidence: 'derived' } : null;
    },
  },
];

/** Enrichment sources are recorded separately — they are never the origin. */
function contributorsOf(p) {
  const out = new Set();
  const prov = p.provenance;
  if (prov && typeof prov === 'object' && prov.enrichedBy) {
    if (str(prov.source)) out.add(str(prov.source));
    else if (str(prov.enrichedBy)) out.add(str(prov.enrichedBy));
  }
  return [...out];
}

// ───────────────────────────────────────────────────────────────────────────

const places = JSON.parse(readFileSync(PLACES, 'utf8'));

COUNCIL_VOCAB = buildCouncilVocabulary(places);

const beforeIds = places.map((p) => String(p.id));
const beforeCount = places.length;

const resolved = [];
const unmapped = [];
const conflicts = [];
const byRule = {};
const bySource = {};

for (const p of places) {
  const hits = [];
  for (const rule of RULES) {
    let r = null;
    try { r = rule.run(p); } catch { r = null; }
    if (r && r.sourceId) hits.push({ rule: rule.name, ...r });
  }

  if (hits.length === 0) {
    unmapped.push({ id: String(p.id), type: p.type, name: p.name, reason: 'no deterministic evidence' });
    continue;
  }

  const chosen = hits[0];
  const others = hits.slice(1).filter((h) => h.sourceId !== chosen.sourceId);
  if (others.length > 0) {
    conflicts.push({
      id: String(p.id),
      type: p.type,
      chosen: `${chosen.sourceId} (${chosen.rule})`,
      alternatives: others.map((o) => `${o.sourceId} (${o.rule})`),
    });
  }

  const contributors = contributorsOf(p);
  resolved.push({ id: String(p.id), sourceId: chosen.sourceId, resolvedBy: chosen.rule, confidence: chosen.confidence, contributors });
  byRule[chosen.rule] = (byRule[chosen.rule] || 0) + 1;
  bySource[chosen.sourceId] = (bySource[chosen.sourceId] || 0) + 1;
}

// ── report ──────────────────────────────────────────────────────────────────
const pct = (n) => ((n / beforeCount) * 100).toFixed(1);

console.log('\n=== provenance mapping — ' + (APPLY ? 'APPLY' : 'DRY RUN') + ' ===\n');
console.log(`  records            : ${beforeCount}`);
console.log(`  mapped             : ${resolved.length}  (${pct(resolved.length)}%)`);
console.log(`    stated evidence  : ${resolved.filter((r) => r.confidence === 'stated').length}`);
console.log(`    derived evidence : ${resolved.filter((r) => r.confidence === 'derived').length}`);
console.log(`  UNMAPPED           : ${unmapped.length}  (${pct(unmapped.length)}%)`);
console.log(`  multi-rule records : ${conflicts.length}  (chose the strongest; alternatives logged)`);
console.log(`  with contributors  : ${resolved.filter((r) => r.contributors.length).length}  (enrichment kept separate from origin)`);

console.log('\n  by rule:');
Object.entries(byRule).sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log(`    ${k.padEnd(28)} ${String(v).padStart(5)}`));

console.log(`\n  distinct sourceIds : ${Object.keys(bySource).length}`);
Object.entries(bySource).sort((a, b) => b[1] - a[1]).slice(0, 25)
  .forEach(([k, v]) => console.log(`    ${k.padEnd(38)} ${String(v).padStart(5)}`));
if (Object.keys(bySource).length > 25) console.log(`    …and ${Object.keys(bySource).length - 25} more`);

if (unmapped.length) {
  console.log('\n  UNMAPPED records (need a human decision):');
  unmapped.slice(0, 20).forEach((u) => console.log(`    ${u.id.padEnd(40)} ${String(u.type).padEnd(12)} ${String(u.name).slice(0, 28)}`));
  if (unmapped.length > 20) console.log(`    …and ${unmapped.length - 20} more (see the report file)`);
}

const report = {
  generatedNote: APPLY ? 'APPLIED' : 'DRY RUN — no file written',
  totals: {
    records: beforeCount,
    mapped: resolved.length,
    unmapped: unmapped.length,
    multiRule: conflicts.length,
    stated: resolved.filter((r) => r.confidence === 'stated').length,
    derived: resolved.filter((r) => r.confidence === 'derived').length,
  },
  byRule,
  bySource,
  unmapped,
  conflicts: conflicts.slice(0, 500),
};

if (REPORT_PATH) {
  mkdirSync(dirname(resolve(root, REPORT_PATH)), { recursive: true });
  writeFileSync(resolve(root, REPORT_PATH), JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n  report → ${REPORT_PATH}`);
}

if (EMIT_MAP_PATH) {
  mkdirSync(dirname(resolve(root, EMIT_MAP_PATH)), { recursive: true });
  writeFileSync(resolve(root, EMIT_MAP_PATH), JSON.stringify(resolved, null, 2), 'utf8');
  console.log(`  full id→source map → ${EMIT_MAP_PATH}  (${resolved.length} rows)`);
}

// ── apply ───────────────────────────────────────────────────────────────────
if (!APPLY) {
  console.log('\n(dry run — nothing written. Re-run with --apply to write sourceRef.)\n');
  process.exit(0);
}

const backupDir = join(root, 'data-backups', 'provenance-map');
mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
copyFileSync(PLACES, join(backupDir, `places.osm.${stamp}.json`));

const byId = new Map(resolved.map((r) => [r.id, r]));
let touched = 0;
for (const p of places) {
  const r = byId.get(String(p.id));
  if (!r) continue;
  const ref = { sourceId: r.sourceId, resolvedBy: r.resolvedBy, confidence: r.confidence };
  if (r.contributors.length) ref.contributors = r.contributors;
  p.sourceRef = ref;
  touched++;
}

// ── verification: additive only, nothing lost ───────────────────────────────
const afterIds = places.map((p) => String(p.id));
const problems = [];
if (places.length !== beforeCount) problems.push(`record count changed: ${beforeCount} → ${places.length}`);
if (afterIds.length !== beforeIds.length || afterIds.some((id, i) => id !== beforeIds[i])) {
  problems.push('id list changed (order or membership)');
}

const original = JSON.parse(readFileSync(PLACES, 'utf8'));
const origById = new Map(original.map((p) => [String(p.id), p]));
for (const p of places) {
  const o = origById.get(String(p.id));
  if (!o) { problems.push(`${p.id}: not present before`); continue; }
  for (const k of Object.keys(o)) {
    if (JSON.stringify(o[k]) !== JSON.stringify(p[k])) problems.push(`${p.id}: pre-existing field "${k}" was modified`);
  }
  const added = Object.keys(p).filter((k) => !(k in o));
  const unexpected = added.filter((k) => k !== 'sourceRef');
  if (unexpected.length) problems.push(`${p.id}: unexpected new fields ${unexpected.join(',')}`);
}

if (problems.length) {
  console.error(`\n✗ REFUSING TO WRITE — ${problems.length} verification failure(s):`);
  problems.slice(0, 15).forEach((m) => console.error('   ' + m));
  process.exit(1);
}

writeFileSync(PLACES, JSON.stringify(places), 'utf8');
console.log(`\n✓ wrote sourceRef on ${touched} records.`);
console.log(`  verification: ${beforeCount} records in, ${places.length} out; id list identical; no pre-existing field modified.`);
console.log(`  backup: data-backups/provenance-map/places.osm.${stamp}.json\n`);
