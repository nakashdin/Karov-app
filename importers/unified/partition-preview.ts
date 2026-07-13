/**
 * Phase 17A — Inventory + Partition PREVIEW (READ-ONLY).
 *
 * Classifies every record in src/data/generated/places.osm.json into a stable
 * sourceId, using (1) existing provenance, (2) id-prefix rules, (3) known source
 * patterns. Produces PREVIEW artifacts only — it does NOT write the real source
 * files, does NOT touch places.osm.json, does NOT change runtime behavior.
 *
 * HARD REQUIREMENT: every record is accounted for (classified or reported as an
 * orphan). The run fails loudly if the partitioned record count != input count.
 *
 * Run:  node importers/unified/partition-preview.ts
 * Out:  importers/unified/output/partition-preview/
 *         sources/<sourceId>.preview.json   (records that WOULD go to each source)
 *         dataset-registry.preview.json
 *         orphan-report.json
 *         partition-summary.json
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain } from '../shared/utils.ts';
import { COUNCILS } from '../religious-councils/sources.ts';
import { MIKVAH_COUNCILS } from '../mikvahs/sabaiapps/sources.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const GEN = join(HERE, '..', '..', 'src', 'data', 'generated');
const OUTDIR = join(HERE, 'output', 'partition-preview');
const SRCDIR = join(OUTDIR, 'sources');

interface Place { id: string; name?: string; type?: string; extra?: any; sourceName?: string; }

/** Known council slugs (synagogue + mikvah importers) — to validate slug extraction. */
const KNOWN_COUNCILS = new Set<string>([...Object.keys(COUNCILS), ...Object.keys(MIKVAH_COUNCILS)]);

type Risk = 'none' | 'low' | 'medium' | 'high' | 'orphan';
interface Classification { sourceId: string | null; method: string; risk: Risk; note?: string; }

const stripSuffix = (s: string): string => s.replace(/-(\d+|h[a-z0-9]+)$/i, '');

function classify(p: Place): Classification {
  const id = String(p.id);
  // 1) existing provenance wins
  if (p.extra?.provenance?.sourceId) return { sourceId: p.extra.provenance.sourceId, method: 'provenance', risk: 'none' };

  // 2) mikveh variants (specific before generic)
  if (id.startsWith('mikveh-osm-')) return { sourceId: 'osm:mikvahs', method: 'id-prefix', risk: 'low' };
  if (id.startsWith('mikveh-tlv-')) return { sourceId: 'gis:tel-aviv:mikvaot', method: 'id-prefix', risk: 'low' };
  if (/^mikveh-\d/.test(id)) return { sourceId: 'datagov:mikve', method: 'id-prefix', risk: 'low' };

  // 3) council mikvah  (rc-mikvah-<slug>-<wpId|hHash>)
  if (id.startsWith('rc-mikvah-')) {
    const slug = stripSuffix(id.replace(/^rc-mikvah-/, ''));
    const known = KNOWN_COUNCILS.has(slug);
    return { sourceId: `council:${slug}:mikvah`, method: 'id-prefix+slug-heuristic', risk: known ? 'low' : 'high', note: known ? undefined : `council slug "${slug}" not in known registry — verify` };
  }
  // 4) council synagogue (rc-<slug>-<wpId>)
  if (id.startsWith('rc-')) {
    const slug = stripSuffix(id.replace(/^rc-/, ''));
    const known = KNOWN_COUNCILS.has(slug);
    return { sourceId: `council:${slug}:synagogues`, method: 'id-prefix+slug-heuristic', risk: known ? 'low' : 'medium', note: known ? undefined : `council slug "${slug}" not in known registry — verify` };
  }
  // 5) ArcGIS city synagogues (arcgis:<city>[::layer]::<oid>)
  if (id.startsWith('arcgis:')) {
    const city = id.split(':')[1] ?? 'unknown';
    return { sourceId: `arcgis:${city}:synagogues`, method: 'id-prefix', risk: 'low', note: 'ArcGIS city import — confirm against the ArcGIS adapter config' };
  }
  // 6) OSM synagogues/restaurants (osm-<type>-<id>) — split by record type
  if (id.startsWith('osm-')) {
    const t = p.type === 'restaurant' ? 'restaurants' : p.type === 'synagogue' ? 'synagogues' : p.type;
    return { sourceId: `osm:${t}`, method: 'id-prefix+type', risk: 'low' };
  }
  // 7) unaccounted → orphan
  return { sourceId: null, method: 'none', risk: 'orphan' };
}

const safe = (sourceId: string): string => sourceId.replace(/[:]/g, '__');

function run(): void {
  const places = JSON.parse(readFileSync(join(GEN, 'places.osm.json'), 'utf8')) as Place[];
  mkdirSync(SRCDIR, { recursive: true });

  const bySource = new Map<string, Place[]>();
  const orphans: { id: string; type?: string; name?: string }[] = [];
  const risky: { id: string; sourceId: string | null; risk: Risk; method: string; note?: string }[] = [];
  const methodCount: Record<string, number> = {};
  const riskCount: Record<string, number> = {};

  for (const p of places) {
    const c = classify(p);
    methodCount[c.method] = (methodCount[c.method] ?? 0) + 1;
    riskCount[c.risk] = (riskCount[c.risk] ?? 0) + 1;
    if (c.sourceId == null) { orphans.push({ id: p.id, type: p.type, name: p.name }); continue; }
    (bySource.get(c.sourceId) ?? bySource.set(c.sourceId, []).get(c.sourceId)!).push(p);
    if (c.risk === 'medium' || c.risk === 'high') risky.push({ id: p.id, sourceId: c.sourceId, risk: c.risk, method: c.method, note: c.note });
  }

  // ---- accounting (hard requirement) ----
  const classified = [...bySource.values()].reduce((a, v) => a + v.length, 0);
  const accounted = classified + orphans.length;
  if (accounted !== places.length) throw new Error(`accounting mismatch: ${accounted} != ${places.length} — STOP`);

  // ---- per-source preview files + dataset-registry preview ----
  const registry: any[] = [];
  for (const [sourceId, recs] of [...bySource.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const file = `sources/${safe(sourceId)}.preview.json`;
    writeFileSync(join(SRCDIR, `${safe(sourceId)}.preview.json`), JSON.stringify(recs, null, 2), 'utf8');
    const types = [...new Set(recs.map((r) => r.type))];
    const methods = [...new Set(recs.map((r) => classify(r).method))];
    registry.push({
      sourceId, file, recordCount: recs.length, types,
      classificationMethods: methods,
      kind: sourceId.startsWith('osm:') ? 'osm' : sourceId.startsWith('datagov') ? 'data-gov' : sourceId.startsWith('council:') ? 'council-website' : sourceId.startsWith('arcgis:') ? 'arcgis' : sourceId.startsWith('gis:') ? 'municipal-gis' : 'unknown',
      status: 'preview', sampleIds: recs.slice(0, 3).map((r) => r.id),
    });
  }

  const datasetRegistryPreview = {
    generatedNote: 'PHASE 17A PREVIEW — derived from live places.osm.json by classification. NOT the real dataset registry. No source files written to src/data/generated/sources/.',
    schemaVersion: 1, generatedFrom: 'src/data/generated/places.osm.json', totalRecords: places.length,
    sourceCount: registry.length, sources: registry,
  };

  const summary = {
    generatedNote: 'PHASE 17A — inventory + partition PREVIEW. Read-only. places.osm.json NOT modified, no records deleted/rewritten, rebuildAppDataset NOT switched.',
    totalRecords: places.length,
    recordsClassified: classified,
    recordsOrphan: orphans.length,
    accountedFor: accounted === places.length,
    distinctSources: registry.length,
    recordsBySourceId: Object.fromEntries(registry.map((r) => [r.sourceId, r.recordCount])),
    classificationMethods: methodCount,
    riskBreakdown: riskCount,
    riskyAmbiguousMappings: {
      count: risky.length,
      councilSlugHeuristic: risky.filter((r) => r.method.includes('slug')).length,
      unknownCouncilSlugs: [...new Set(risky.filter((r) => r.note?.includes('not in known')).map((r) => r.sourceId))],
      samples: risky.slice(0, 15),
    },
    recommendedFixesBeforeRealMigration: [
      `Back-fill provenance.sourceId on ALL records before migrating — only ${places.filter((p) => p.extra?.provenance?.sourceId).length}/${places.length} carry it today; the rest rely on id-prefix heuristics.`,
      'Validate every council slug against the council registry (synagogue COUNCILS + MIKVAH_COUNCILS). Any "unknown council slug" must be reconciled (the synagogue importer may have run more councils than the 14 in sources.ts).',
      'Confirm ArcGIS city sourceIds against the ArcGIS adapter config (8 cities: tel-aviv, haifa, ashdod, ashkelon, jerusalem, nahariya, modiin, nof-hagalil); note Tel-Aviv ids carry an extra layer segment (arcgis:tel-aviv::568::oid).',
      'Council-slug suffix-stripping assumes the id tail is a numeric wpId or h-hash; verify no council slug legitimately ends in digits.',
      'PARITY GATE (Phase 17B): a v2 rebuild from these source files must reproduce places.osm.json EXACTLY (same id-set, same count, stable contentHash) before any real cutover.',
    ],
    dryRun: true, placesModified: false, sourceFilesWritten: false, runtimeChanged: false,
  };

  writeFileSync(join(OUTDIR, 'dataset-registry.preview.json'), JSON.stringify(datasetRegistryPreview, null, 2), 'utf8');
  writeFileSync(join(OUTDIR, 'orphan-report.json'), JSON.stringify({ totalRecords: places.length, orphanCount: orphans.length, orphans }, null, 2), 'utf8');
  writeFileSync(join(OUTDIR, 'partition-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('=== Phase 17A partition preview (read-only) ===');
  console.log(`total ${places.length} | classified ${classified} | orphan ${orphans.length} | accounted ${accounted === places.length}`);
  console.log(`distinct sources ${registry.length} | risk: ${JSON.stringify(riskCount)}`);
  console.log(`risky/ambiguous mappings ${risky.length} | unknown council slugs: ${summary.riskyAmbiguousMappings.unknownCouncilSlugs.length}`);
  console.log(`previews → ${OUTDIR}`);
}

if (isMain(import.meta.url)) run();
