/**
 * Fetchers for the Chabad-house importer — one per OPENLY-LICENSED source.
 * Each maps its raw records onto `ChabadRaw` and tolerates failure (returns
 * what it got, logs the rest) so a single flaky source never aborts the run.
 *
 * Pure read-only network I/O. No disk writes, no live-data access.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { httpJson, fetchOverpass, USER_AGENT, osmId, osmCoords } from '../shared/utils.ts';
import type { OsmElement } from '../shared/types.ts';
import {
  DATAGOV_AMUTOT, WIKIDATA_SPARQL, WIKIDATA_ENDPOINT, OVERPASS_QUERY,
  looksLikeHouse, CHABAD_RE,
} from './sources.ts';
import type { ChabadRaw, ManualEntry } from './sources.ts';

const normPhone = (s: string | null | undefined): string | undefined => {
  const d = String(s ?? '').replace(/\D/g, '');
  if (d.length === 10 && d[0] === '0') return d;
  if (d.length === 9 && d[0] !== '0') return '0' + d;
  return d.length >= 9 ? d : undefined;
};
const clean = (s: unknown): string => String(s ?? '').replace(/\s+/g, ' ').trim();

// --- 0. Manual (user-curated, highest trust) — manual.json ------------------

export function fetchManual(): ChabadRaw[] {
  const file = join(dirname(fileURLToPath(import.meta.url)), 'manual.json');
  if (!existsSync(file)) return [];
  let entries: ManualEntry[];
  try {
    entries = JSON.parse(readFileSync(file, 'utf8')) as ManualEntry[];
  } catch (e) {
    console.warn(`  [chabad-manual] parse failed: ${(e as Error).message}`);
    return [];
  }
  const out: ChabadRaw[] = [];
  let i = 0;
  for (const m of entries) {
    if (!m.name?.trim() || !m.city?.trim()) continue;
    const slug = (m.city + '-' + m.name).replace(/["'׳״\s]+/g, '-').slice(0, 40);
    out.push({
      sourceId: `manual-${++i}-${slug}`,
      origin: 'manual',
      name: clean(m.name),
      city: clean(m.city),
      address: m.address ? clean(m.address) : undefined,
      lat: m.lat ?? null,
      lng: m.lng ?? null,
      phone: normPhone(m.phone),
      website: m.website ? clean(m.website) : undefined,
      contactPerson: m.contactPerson ? clean(m.contactPerson) : undefined,
      services: m.services?.length ? m.services.map(clean) : undefined,
      sourceUrl: m.sourceUrl,
      likelyHouse: true, // user-curated → always a house
      raw: m as unknown as Record<string, unknown>,
    });
  }
  console.log(`[chabad-manual] ${out.length} curated entries`);
  return out;
}

// --- 1. OpenStreetMap (ODbL) — has coordinates ------------------------------

export async function fetchOsm(): Promise<ChabadRaw[]> {
  let data: { elements?: OsmElement[] };
  try {
    data = await fetchOverpass(OVERPASS_QUERY, 'chabad-osm');
  } catch (e) {
    console.warn(`  [chabad-osm] failed: ${(e as Error).message}`);
    return [];
  }
  const out: ChabadRaw[] = [];
  for (const el of data.elements ?? []) {
    const tags = el.tags ?? {};
    const name = tags['name:he'] || tags.name || '';
    if (!CHABAD_RE.test(name) && !CHABAD_RE.test(tags.operator ?? '')) continue;
    const co = osmCoords(el);
    const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ').trim();
    out.push({
      sourceId: osmId(el),
      origin: 'osm',
      name: clean(name || 'בית חב״ד'),
      city: clean(tags['addr:city'] || tags['addr:place'] || '') || undefined,
      address: street || undefined,
      lat: co?.latitude ?? null,
      lng: co?.longitude ?? null,
      phone: normPhone(tags.phone || tags['contact:phone']),
      website: clean(tags.website || tags['contact:website']) || undefined,
      contactPerson: clean(tags.operator || '') || undefined,
      sourceUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
      likelyHouse: looksLikeHouse(name),
      raw: tags,
    });
  }
  console.log(`[chabad-osm] ${out.length} Chabad-tagged elements`);
  return out;
}

// --- 2. data.gov.il amutot registry (gov open) — addresses, NO coords -------

/** Locate a field name in CKAN `fields` by matching Hebrew header patterns. */
function pickField(fields: { id: string }[], patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const hit = fields.find((f) => p.test(f.id));
    if (hit) return hit.id;
  }
  return null;
}

export async function fetchDataGov(): Promise<ChabadRaw[]> {
  const base = `${DATAGOV_AMUTOT.portalUrl}/api/3/action/datastore_search`;
  const byId = new Map<string, ChabadRaw>();
  let fieldMap: Record<string, string | null> | null = null;

  for (const q of DATAGOV_AMUTOT.queries) {
    const url = `${base}?resource_id=${DATAGOV_AMUTOT.resourceId}&q=${encodeURIComponent(q)}&limit=${DATAGOV_AMUTOT.pageSize}`;
    let res: any;
    try {
      res = await httpJson(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } }, `amutot:${q}`);
    } catch (e) {
      console.warn(`  [chabad-datagov] q="${q}" failed: ${(e as Error).message}`);
      continue;
    }
    const fields: { id: string }[] = res?.result?.fields ?? [];
    const records: Record<string, unknown>[] = res?.result?.records ?? [];
    if (!fieldMap && fields.length) {
      fieldMap = Object.fromEntries(
        Object.entries(DATAGOV_AMUTOT.fieldHints).map(([k, pats]) => [k, pickField(fields, pats)]),
      );
      console.log(`  [chabad-datagov] field map: ${JSON.stringify(fieldMap)}`);
    }
    const fm = fieldMap ?? {};
    for (const r of records) {
      const name = clean(fm.name ? r[fm.name] : '');
      if (!name || !CHABAD_RE.test(name)) continue; // only Chabad-named entities
      const regNum = clean(fm.regNum ? r[fm.regNum] : '') || name;
      const id = `amuta-${regNum}`;
      if (byId.has(id)) continue;
      const street = clean(fm.street ? r[fm.street] : '');
      const houseNo = clean(fm.houseNo ? r[fm.houseNo] : '');
      const city = clean(fm.city ? r[fm.city] : '');
      const addr = [street, houseNo].filter(Boolean).join(' ').trim();
      byId.set(id, {
        sourceId: id,
        origin: 'datagov',
        name,
        city: city || undefined,
        address: addr || undefined,
        lat: null,
        lng: null,
        sourceUrl: `${DATAGOV_AMUTOT.portalUrl}/dataset/moj-amutot`,
        likelyHouse: looksLikeHouse(name),
        raw: r,
      });
    }
  }
  const out = [...byId.values()];
  console.log(`[chabad-datagov] ${out.length} unique Chabad-named amutot (no coords)`);
  return out;
}

// --- 3. Wikidata (CC0) — fully free, sparse ---------------------------------

export async function fetchWikidata(): Promise<ChabadRaw[]> {
  const url = `${WIKIDATA_ENDPOINT}?format=json&query=${encodeURIComponent(WIKIDATA_SPARQL)}`;
  let res: any;
  try {
    res = await httpJson(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/sparql-results+json' } }, 'chabad-wikidata');
  } catch (e) {
    console.warn(`  [chabad-wikidata] failed: ${(e as Error).message}`);
    return [];
  }
  const out: ChabadRaw[] = [];
  for (const b of res?.results?.bindings ?? []) {
    const qid = clean(b.item?.value).split('/').pop() ?? '';
    const name = clean(b.itemLabel?.value);
    if (!qid || !name) continue;
    let lat: number | null = null, lng: number | null = null;
    const m = clean(b.coord?.value).match(/Point\(([-\d.]+)\s+([-\d.]+)\)/); // WKT: lon lat
    if (m) { lng = Number(m[1]); lat = Number(m[2]); }
    out.push({
      sourceId: `wd-${qid}`,
      origin: 'wikidata',
      name,
      city: clean(b.cityLabel?.value) || undefined,
      lat, lng,
      sourceUrl: clean(b.item?.value),
      likelyHouse: looksLikeHouse(name),
    });
  }
  console.log(`[chabad-wikidata] ${out.length} items`);
  return out;
}
