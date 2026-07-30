import MiniSearch from 'minisearch';
import { Place } from '../../types';

// ---------------------------------------------------------------------------
// Hebrew normalisation
// ---------------------------------------------------------------------------

/** Strip niqqud (U+05B0–U+05C7), geresh/gershayim, hyphens; lowercase; trim. */
function normalise(s: string): string {
  return s
    .replace(/[ְ-ׇ]/g, '')   // niqqud
    .replace(/[״׳'']/g, '')            // geresh / gershayim / smart quotes
    .replace(/[-–—]/g, ' ')            // hyphens → space
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// Index schema
// ---------------------------------------------------------------------------

/**
 * Flat document fed to MiniSearch.  All optional Place fields are coerced to
 * strings so the engine can index them uniformly.
 */
interface SearchDoc {
  id: string;
  name: string;
  address: string;
  cityName: string;
  description: string;
  certifiedBy: string;
  nusach: string;
  contactPerson: string;
  services: string;
  attendant: string;
  mikvehGender: string;
  sourceName: string;
  tags: string;
}

const FIELDS: Array<keyof Omit<SearchDoc, 'id'>> = [
  'name',
  'certifiedBy',
  'nusach',
  'contactPerson',
  'cityName',
  'address',
  'description',
  'services',
  'sourceName',
  'attendant',
  'mikvehGender',
  'tags',
];

/** Per-field boost weights. */
const BOOST: Partial<Record<keyof SearchDoc, number>> = {
  name: 10,
  certifiedBy: 7,
  nusach: 6,
  contactPerson: 6,
  cityName: 5,
  address: 4,
  description: 3,
  services: 2,
  sourceName: 2,
  attendant: 2,
  mikvehGender: 2,
  tags: 2,
};

// ---------------------------------------------------------------------------
// Index singleton — built once at module load
// ---------------------------------------------------------------------------

let _index: MiniSearch<SearchDoc> | null = null;
/** Fast lookup: id → original Place reference. */
let _placeById: Map<string, Place> = new Map();

function toDoc(place: Place, cityNameById: Map<string, string>): SearchDoc {
  const cityName = cityNameById.get(place.cityId) ?? place.cityId;
  return {
    id: place.id,
    name: normalise(place.name),
    address: normalise(place.address),
    cityName: normalise(cityName),
    description: normalise(place.description ?? ''),
    certifiedBy: normalise(place.certifiedBy ?? ''),
    nusach: normalise(place.nusach ?? ''),
    contactPerson: normalise(place.contactPerson ?? ''),
    services: normalise((place.services ?? []).join(' ')),
    attendant: normalise(place.attendant ?? ''),
    mikvehGender: normalise(place.mikvehGender ?? ''),
    sourceName: normalise(place.sourceName ?? ''),
    tags: normalise((place.tags ?? []).join(' ')),
  };
}

/**
 * Build the full-text index.  Call once at startup (e.g. from the repository
 * module level).  Subsequent calls with the same data are instant (cached).
 */
export function buildIndex(places: Place[], cityNameById: Map<string, string>): void {
  if (_index) return; // already built

  const idx = new MiniSearch<SearchDoc>({
    idField: 'id',
    fields: FIELDS as string[],
    storeFields: [],           // we look up the original Place from _placeById
    searchOptions: {
      boost: BOOST as Record<string, number>,
      fuzzy: 0.2,
      prefix: true,
    },
    // Custom tokeniser: split on whitespace and punctuation
    tokenize: (text) => text.split(/[\s\-,./|]+/).filter(Boolean),
    processTerm: (term) => (term.length < 2 ? null : term),
  });

  const docs = places.map((p) => toDoc(p, cityNameById));
  idx.addAll(docs);

  _index = idx;
  _placeById = new Map(places.map((p) => [p.id, p]));
}

/**
 * Full-text search.  Returns matching Place ids ordered by relevance score
 * (highest first).  Returns null when the index hasn't been built yet or the
 * query is empty — callers should fall back to unfiltered results.
 */
export function searchPlaces(query: string): string[] | null {
  if (!_index || !query.trim()) return null;

  const q = normalise(query);
  if (!q) return null;

  // Multi-word queries use AND so "פיצה האט" returns only Pizza Hut branches,
  // not every pizza place. Single-word queries use OR (same behaviour, single term).
  const wordCount = q.trim().split(/\s+/).filter((w) => w.length >= 2).length;
  const combineWith = wordCount > 1 ? 'AND' : 'OR';

  const results = _index.search(q, { combineWith });
  return results.map((r) => r.id as string);
}

/** For testing: reset the index (allows rebuilding with different data). */
export function _resetIndex(): void {
  _index = null;
  _placeById = new Map();
}
