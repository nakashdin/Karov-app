/**
 * PREVIEW ONLY (DRY-RUN) — build the Chabad-house candidate set from the legal
 * open sources, geocode the coordless ones via GovMap, dedup WITHIN the batch and
 * AGAINST the app's live data, and emit REPORTS ONLY. It does NOT touch live data,
 * does NOT merge, does NOT delete/overwrite. Additive-only by construction.
 *
 * Dedup policy (per the task spec): Chabad houses are matched against existing
 * `chabad_house` AND `synagogue` records. A Chabad record that is CLEARLY the same
 * physical place as an existing synagogue is HELD for manual review (never merged
 * into / never changes the synagogue). Anything uncertain stays a separate
 * `chabad_house` candidate.
 *
 * Run:  node importers/chabad/build-preview.ts
 * Out:  importers/chabad/output/reports/{preview,summary,write-ready}.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchLocalities, isInIsrael, isMain, nearestLocality } from '../shared/utils.ts';
import type { Locality } from '../shared/types.ts';
import type { Place } from '../../src/types/place.ts';
import { fetchOsm, fetchDataGov, fetchWikidata, fetchManual } from './fetch.ts';
import { govmapGeocode, geocodeSleep, nominatimGeocode, nominatimSleep } from './geocode.ts';
import { LICENSES } from './sources.ts';
import type { ChabadOrigin, ChabadRaw } from './sources.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPORTS = join(HERE, 'output', 'reports');
const GEN = join(HERE, '..', '..', 'src', 'data', 'generated');
const PLACES = join(GEN, 'places.osm.json');
const NOW = new Date().toISOString().slice(0, 10);

// --- text / geo helpers -----------------------------------------------------
const sp = (s: string): string => s.replace(/["'׳״’”`.,()\[\]\-–]/g, ' ').replace(/\s+/g, ' ').trim();
const normName = (s: string | undefined): string =>
  sp(String(s ?? '').replace(/בית\s*חב["'׳״]?ד|בתי\s*חב["'׳״]?ד|בית\s*הכנסת|chabad house|chabad|lubavitch/gi, ' '));
const tok = (s: string): string[] => normName(s).split(' ').filter((t) => t.length > 1);
function nameSim(a: string, b: string): number {
  const A = new Set(tok(a)), B = new Set(tok(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const jac = inter / (A.size + B.size - inter);
  const na = normName(a).replace(/\s/g, ''), nb = normName(b).replace(/\s/g, '');
  if (na.length > 2 && nb.length > 2 && (na.includes(nb) || nb.includes(na))) return Math.max(jac, 0.85);
  return jac;
}
const toRad = (d: number): number => (d * Math.PI) / 180;
function meters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/** A merged cross-source candidate. */
interface Cluster extends ChabadRaw {
  origins: string[];
  sourceIds: string[];
  coordSource?: 'native' | 'govmap-address' | 'nominatim-address';
  locationPrecision?: 'address' | 'city';
  geocodeLabel?: string;
}

/** Merge a raw record into an existing cluster (fill empties; keep best coords). */
function mergeInto(c: Cluster, r: ChabadRaw): void {
  if (!c.origins.includes(r.origin)) c.origins.push(r.origin);
  c.sourceIds.push(r.sourceId);
  if ((c.lat == null || c.lng == null) && r.lat != null && r.lng != null) { c.lat = r.lat; c.lng = r.lng; }
  c.address ||= r.address;
  c.city ||= r.city;
  c.phone ||= r.phone;
  c.website ||= r.website;
  c.contactPerson ||= r.contactPerson;
  c.services ||= r.services;
  c.sourceUrl ||= r.sourceUrl;
  c.likelyHouse ||= r.likelyHouse;
}

/** Cluster raw records across sources by coord-proximity (≤60m) or name+city. */
function cluster(raws: ChabadRaw[]): Cluster[] {
  // Manual (most authoritative) + native-coord sources seed clusters first;
  // datagov (coordless) merges into them.
  const order: Record<ChabadOrigin, number> = { manual: 0, osm: 1, wikidata: 2, datagov: 3 };
  const sorted = [...raws].sort((a, b) => order[a.origin] - order[b.origin]);
  const clusters: Cluster[] = [];
  for (const r of sorted) {
    let hit: Cluster | undefined;
    for (const c of clusters) {
      if (r.lat != null && r.lng != null && c.lat != null && c.lng != null) {
        if (meters(r.lat, r.lng, c.lat, c.lng) <= 60 && nameSim(r.name, c.name) >= 0.3) { hit = c; break; }
      } else if (normName(r.name) && normName(r.name) === normName(c.name) && (r.city ?? '') === (c.city ?? '')) {
        hit = c; break;
      }
    }
    if (hit) mergeInto(hit, r);
    else clusters.push({ ...r, origins: [r.origin], sourceIds: [r.sourceId] });
  }
  return clusters;
}

interface PreviewRow {
  primaryId: string; name: string; city?: string; origins: string[];
  hasCoords: boolean; coordSource?: string; locationPrecision?: string;
  classification: 'new' | 'match_chabad' | 'overlap_synagogue' | 'conflict' | 'coordless' | 'nonhouse_excluded';
  matchedId?: string; matchedType?: string; matchedName?: string; distanceM?: number; nameSim?: number;
  reason: string;
}

async function run(): Promise<void> {
  mkdirSync(REPORTS, { recursive: true });
  console.log('=== Chabad fallback importer — DRY-RUN ===');

  // 1. fetch (each source is failure-tolerant) -------------------------------
  const manual = fetchManual();
  const [osm, datagov, wikidata] = await Promise.all([fetchOsm(), fetchDataGov(), fetchWikidata()]);
  const raws = [...manual, ...osm, ...datagov, ...wikidata];
  const bySource = { manual: manual.length, osm: osm.length, datagov: datagov.length, wikidata: wikidata.length };

  // 2. cross-source cluster --------------------------------------------------
  const clusters = cluster(raws);

  // 3. geocode coordless clusters via GovMap (address-level only) -------------
  let localities: Locality[] = [];
  try { localities = await fetchLocalities(); } catch (e) { console.warn(`  [localities] ${(e as Error).message}`); }
  let geocoded = 0, geocodeTried = 0, viaGovmap = 0, viaNominatim = 0;
  for (const c of clusters) {
    if (c.lat != null && c.lng != null) { c.coordSource = 'native'; c.locationPrecision = 'address'; continue; }
    if (c.address && c.city) {
      geocodeTried++;
      // primary: GovMap (official IL address DB)
      const gc = await govmapGeocode(c.address, c.city);
      await geocodeSleep();
      if (gc) {
        c.lat = gc.loc.latitude; c.lng = gc.loc.longitude; c.coordSource = 'govmap-address';
        c.locationPrecision = 'address'; c.geocodeLabel = gc.label; geocoded++; viaGovmap++;
        continue;
      }
      // fallback: Nominatim — ONLY for user-curated manual entries (high trust,
      // specific street+number). Open sources stay GovMap-only to avoid pulling
      // in low-quality amutot via a looser geocoder.
      if (!c.origins.includes('manual')) continue;
      const nm = await nominatimGeocode(c.address, c.city);
      await nominatimSleep();
      if (nm) {
        c.lat = nm.loc.latitude; c.lng = nm.loc.longitude; c.coordSource = 'nominatim-address';
        c.locationPrecision = 'address'; c.geocodeLabel = nm.label; geocoded++; viaNominatim++;
      }
    }
  }
  console.log(`  [geocode] resolved ${geocoded}/${geocodeTried} (govmap ${viaGovmap}, nominatim ${viaNominatim})`);
  // assign cityId from nearest locality when source had no city but has coords
  for (const c of clusters) {
    if (!c.city && c.lat != null && c.lng != null && localities.length) {
      c.city = nearestLocality(c.lat, c.lng, localities) || undefined;
    }
  }

  // 4. dedup vs live (synagogues + chabad_house) -----------------------------
  const live = (existsSync(PLACES) ? JSON.parse(readFileSync(PLACES, 'utf8')) : []) as Place[];
  const pool = live.filter((p) => (p.type === 'synagogue' || p.type === 'chabad_house') && p.location);

  const rows: PreviewRow[] = [];
  const writeReady: Place[] = [];
  const tagUpdates: { id: string; addTag: 'chabad_house' }[] = [];
  const usedIds = new Set(live.map((p) => p.id));

  for (const c of clusters) {
    const primaryId = `chabad-${c.sourceIds[0]}`;
    const base: PreviewRow = {
      primaryId, name: c.name, city: c.city, origins: c.origins,
      hasCoords: c.lat != null && c.lng != null, coordSource: c.coordSource,
      locationPrecision: c.locationPrecision, classification: 'new', reason: '',
    };

    if (c.lat == null || c.lng == null) {
      base.classification = 'coordless';
      base.reason = c.address ? 'GovMap could not resolve an exact in-city address' : 'no street address → not geocodable';
      rows.push(base);
      continue;
    }

    // nearest live synagogue/chabad
    let best: { e: Place; d: number; sim: number } | null = null;
    for (const e of pool) {
      const d = meters(c.lat, c.lng, e.location.latitude, e.location.longitude);
      if (d > 600) continue;
      const sim = nameSim(c.name, e.name);
      if (!best || sim > best.sim || (sim === best.sim && d < best.d)) best = { e, d, sim };
    }
    if (best) {
      base.matchedId = best.e.id; base.matchedType = best.e.type; base.matchedName = best.e.name;
      base.distanceM = Math.round(best.d); base.nameSim = Number(best.sim.toFixed(2));
    }

    const isChabadMatch = best && best.e.type === 'chabad_house' && ((best.d <= 150 && best.sim >= 0.6) || best.sim >= 0.85);
    const isSynOverlap = best && best.e.type === 'synagogue' && best.d <= 80 && best.sim >= 0.8;
    const isConflict = best && !isChabadMatch && !isSynOverlap && best.d <= 120 && best.sim >= 0.4;

    if (isChabadMatch) {
      base.classification = 'match_chabad';
      base.reason = 'matches an existing chabad_house → enrich empty fields only (no new pin)';
    } else if (isSynOverlap) {
      base.classification = 'overlap_synagogue';
      base.reason = 'clearly the same place as an existing synagogue → will add chabad_house tag to existing record';
      if (best.e.id && !tagUpdates.some((u) => u.id === best.e.id)) {
        tagUpdates.push({ id: best.e.id, addTag: 'chabad_house' });
      }
    } else if (isConflict) {
      base.classification = 'conflict';
      base.reason = 'near an existing place but uncertain → HELD for manual review';
    } else if (!c.likelyHouse) {
      base.classification = 'nonhouse_excluded';
      base.reason = 'Chabad-named but not a physical house (geographic feature / institution) → excluded from write-ready';
      rows.push(base);
      continue;
    } else {
      base.classification = 'new';
      base.reason = 'new chabad_house candidate';
      // build a write-ready Place
      let id = primaryId;
      if (usedIds.has(id)) id = `chabad-${c.lat.toFixed(5)}_${c.lng.toFixed(5)}`;
      usedIds.add(id);
      const place: Place & { extra: Record<string, unknown> } = {
        id,
        name: c.name,
        type: 'chabad_house',
        cityId: c.city ?? '',
        address: c.address ? (c.city ? `${c.address}, ${c.city}` : c.address) : (c.city ?? ''),
        location: { latitude: c.lat, longitude: c.lng },
        source: c.origins.includes('osm') ? 'osm' : 'seed',
        locationPrecision: c.locationPrecision === 'city' ? 'city' : 'address',
        lastVerifiedAt: NOW,
        extra: {
          provenance: { origins: c.origins, sourceIds: c.sourceIds, coordSource: c.coordSource },
          license: c.origins.includes('osm') ? LICENSES.osm.id : c.origins.includes('wikidata') ? LICENSES.wikidata.id : LICENSES.datagov.id,
          likelyHouse: c.likelyHouse ?? false,
          geocodeLabel: c.geocodeLabel,
        },
      };
      if (c.phone) place.phone = c.phone;
      if (c.website) place.website = c.website;
      if (c.contactPerson) place.contactPerson = c.contactPerson;
      if (c.services?.length) place.services = c.services;
      if (c.sourceUrl) { place.sourceUrl = c.sourceUrl; place.sourceName = c.origins.join('+'); }
      writeReady.push(place);
    }
    rows.push(base);
  }

  // 5. reports (NO live writes) ----------------------------------------------
  const count = (k: PreviewRow['classification']): number => rows.filter((r) => r.classification === k).length;
  const writeReadyWithCity = writeReady.filter((p) => p.cityId).length;
  const summary = {
    generatedNote: 'Chabad-house fallback importer — DRY-RUN. Open sources only (OSM ODbL + data.gov.il amutot + Wikidata CC0). GovMap address geocoding. No live data touched, no merge, no rebuildAppDataset.',
    date: NOW,
    rawBySource: bySource,
    rawTotal: raws.length,
    clusters: clusters.length,
    geocode: { tried: geocodeTried, resolved: geocoded },
    classification: {
      new: count('new'),
      matchChabad: count('match_chabad'),
      overlapSynagogueHeld: count('overlap_synagogue'),
      conflictHeld: count('conflict'),
      nonhouseExcluded: count('nonhouse_excluded'),
      coordlessExcluded: count('coordless'),
    },
    writeReady: writeReady.length,
    writeReadyWithCity,
    withCoords: clusters.filter((c) => c.lat != null && c.lng != null).length,
    nativeCoords: clusters.filter((c) => c.coordSource === 'native').length,
    govmapGeocoded: clusters.filter((c) => c.coordSource === 'govmap-address').length,
    nominatimGeocoded: clusters.filter((c) => c.coordSource === 'nominatim-address').length,
    coverageNote: `legal-fallback ceiling; vs ~941 national total this is partial by design`,
    dryRun: true, liveDataTouched: false, mergePerformed: false, rebuildTouched: false,
  };

  writeFileSync(join(REPORTS, 'preview.json'), JSON.stringify(rows, null, 2), 'utf8');
  writeFileSync(join(REPORTS, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  writeFileSync(join(REPORTS, 'write-ready.json'), JSON.stringify(writeReady, null, 2), 'utf8');
  writeFileSync(join(REPORTS, 'tag-updates.json'), JSON.stringify(tagUpdates, null, 2), 'utf8');

  console.log('\n========== DRY-RUN SUMMARY ==========');
  for (const [k, v] of Object.entries(summary)) console.log(`  ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
  console.log('\n--- up to 12 NEW candidates ---');
  for (const r of rows.filter((x) => x.classification === 'new').slice(0, 12)) {
    console.log(`  "${r.name}" | ${r.city ?? '?'} | ${r.origins.join('+')} | ${r.coordSource}`);
  }
  console.log('\n--- HELD (overlap_synagogue / conflict) ---');
  for (const r of rows.filter((x) => x.classification === 'overlap_synagogue' || x.classification === 'conflict').slice(0, 12)) {
    console.log(`  "${r.name}" → ${r.matchedType} "${r.matchedName}" | ${r.distanceM}m | sim ${r.nameSim} (${r.classification})`);
  }
}

if (isMain(import.meta.url)) void run();
