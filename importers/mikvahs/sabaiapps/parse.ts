/**
 * Variant-aware parser for the **mikvah** SabaiApps "Directories Pro" directory.
 *
 * Adapted from `religious-councils/parse.ts` (the synagogue parser) — kept as a
 * separate file so the synagogue importer stays untouched. Differences:
 *   - listing anchors point at `/directory-mikvah/listing/` with
 *     `data-content-name="mikvah_dir_ltg"` (not synagogues).
 *   - mikvah cards expose different labelled fields: directory_category (gender),
 *     field_balanit_name (attendant), field_gabphone, field_hopephone,
 *     field_open_hours. We also capture every `field_*` value generically so a
 *     council with extra fields is not silently dropped.
 *
 *  - WAZE path: cards are primary; coordinates from each card's Waze link.
 *  - MARKERS path: the embedded markers JSON is primary; card fields enrich by
 *    unique normalized-name match (best-effort, never guessed).
 *
 * Never invents data; unresolved joins are flagged, not guessed.
 */
import type { MikvahCouncilRaw, MikvahVariant } from './sources.ts';
import { MIKVAH_DIR_SLUG, MIKVAH_POST_TYPE } from './sources.ts';

// --- small text helpers (local copies; the synagogue parser does not export) -

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"').replace(/&#0?34;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}
const stripTags = (s: string): string =>
  decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** Strip a leading comma left when the street part is empty (", City, Israel"). */
function cleanAddress(s: string | null): string | null {
  if (!s) return s;
  const v = s.replace(/^[\s,]+/, '').replace(/\s*,\s*,+/g, ', ').replace(/\s+/g, ' ').trim();
  return v || null;
}

/** Basic Israeli phone normalization — add the missing leading 0 on 9 digits. */
function normPhone(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  const d = raw.replace(/\D/g, '');
  if (d.length === 10 && d[0] === '0') return d;
  if (d.length === 9 && d[0] !== '0') return '0' + d;
  return raw.trim() || undefined; // unusual format → keep as-is (not invented)
}

/** Decode the JSON-escaped HTML stored inside marker `content`. */
function jsonUnescape(s: string): string {
  return s
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\n/g, ' ').replace(/\\t/g, ' ')
    .split('\\/').join('/').split('\\"').join('"').split('\\\\').join('\\');
}

/** Normalize a mikvah name for join keys / hashing (drops the מקווה prefix). */
export function normName(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/מקווה|מקוה|מקואות|מקוואות/g, '')
    .replace(/["'׳״’”`]/g, '').replace(/\s+/g, ' ').trim();
}

/** Stable short hash (djb2) for synthetic sourceIds when no permalink exists. */
function shortHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** Value of a labelled card field: `entity_<name> … field-value">VALUE</div>`. */
function fieldValue(card: string, name: string): string | undefined {
  const m = card.match(new RegExp(`entity_${name}"[\\s\\S]*?drts-entity-field-value">([\\s\\S]*?)</div>`));
  if (!m) return undefined;
  return stripTags(m[1]) || undefined;
}

/** Phone from the gabphone field (data-phone-number or tel:), entity-decoded. */
function cardPhone(card: string): string | undefined {
  const raw =
    card.match(/entity_field_field_gabphone[\s\S]*?data-phone-number="([^"]+)"/)?.[1] ||
    card.match(/entity_field_field_gabphone[\s\S]*?tel:([0-9\-+&#;]+)/)?.[1] ||
    card.match(/data-phone-number="([^"]+)"/)?.[1];
  return raw ? normPhone(decodeEntities(raw).replace(/\s+/g, '')) : undefined;
}

/** Capture every labelled `field_*` value on a card (generic source metadata). */
function allFields(card: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of card.matchAll(
    /entity_field_(field_[a-z0-9_]+)"[\s\S]{0,600}?drts-entity-field-value">([\s\S]*?)<\/div>/g,
  )) {
    const v = stripTags(m[2]);
    if (v) out[m[1]] = v;
  }
  return out;
}

/** Directory category (gender) from the category anchor on a card. */
function cardCategory(card: string): string | undefined {
  const m = card.match(/entity_field_directory_category"[\s\S]*?data-content-name="mikvah_dir_cat"[^>]*>([\s\S]*?)<\/a>/);
  return m ? stripTags(m[1]) || undefined : undefined;
}

// --- variant detection (identical heuristic to the synagogue parser) ---------

export function detectVariant(html: string): MikvahVariant {
  const waze = (html.match(/waze\.com\/ul\?ll=/g) || []).length;
  const markers = (html.match(/"lat":3[0-3]\.[0-9]+,"lng":3[3-6]\.[0-9]+/g) || []).length;
  const cards = (html.match(/data-name="entity_field_post_title"/g) || []).length;
  if (waze >= Math.max(2, cards * 0.3)) return 'waze';
  return markers > 0 ? 'markers' : 'waze';
}

// --- shared field enrichment for a raw record --------------------------------

function applyCardFields(rec: MikvahCouncilRaw, card: string): void {
  const cat = cardCategory(card);
  if (cat) rec.category = cat;
  const phone = cardPhone(card);
  if (phone) rec.phone = phone;
  const balanit = fieldValue(card, 'field_field_balanit_name');
  if (balanit) rec.balanit = balanit;
  const hours = fieldValue(card, 'field_field_open_hours');
  if (hours) rec.openHours = hours;
  const hope = fieldValue(card, 'field_field_hopephone');
  if (hope) rec.hopePhone = normPhone(hope);
  const fields = allFields(card);
  if (Object.keys(fields).length) rec.fields = fields;
}

// --- WAZE path ---------------------------------------------------------------

const ANCHOR_RE = new RegExp(
  `<a href="([^"]+/${MIKVAH_DIR_SLUG}/listing/[^"]+)"[^>]*data-content-name="${MIKVAH_POST_TYPE}"[^>]*>([\\s\\S]*?)</a>`,
);

function parseWazeCard(card: string, councilId: string): MikvahCouncilRaw | null {
  let name: string | null = null;
  let permalink: string | null = null;
  let nameSource: MikvahCouncilRaw['nameSource'] = 'text';

  const anchor = card.match(ANCHOR_RE);
  if (anchor) {
    permalink = decodeURIComponent(anchor[1]);
    name = stripTags(anchor[2]) || null;
    nameSource = 'anchor';
  } else {
    const txt = card.match(/^[^>]*>([\s\S]*?)<\/div>/);
    if (txt) name = stripTags(txt[1]) || null;
  }
  if (!name) return null;

  const co = card.match(/waze\.com\/ul\?ll=([0-9.]+)%2C([0-9.]+)/);
  const lat = co ? Number(co[1]) : null;
  const lng = co ? Number(co[2]) : null;

  let address: string | null = null;
  const span = card.match(/drts-location-address[^"]*"[^>]*>([\s\S]*?)<\/span>/);
  if (span) address = stripTags(span[1]) || null;
  if (!address) {
    const wz = card.match(/waze\.com\/ul[^"]*"[^>]*>([\s\S]*?)<\/a>/);
    if (wz) address = stripTags(wz[1]) || null;
  }

  const wpId = permalink
    ? (card.match(/drts-entity-(\d+)/)?.[1] ?? permalink.match(/listing\/([^/]+)\/?$/)?.[1])
    : undefined;
  const sourceId = wpId
    ? `rc-mikvah-${councilId}-${wpId}`
    : `rc-mikvah-${councilId}-h${shortHash(normName(name) + '|' + (address ?? ''))}`;

  const rec: MikvahCouncilRaw = {
    sourceId, sourceUrl: permalink, name, address: cleanAddress(address), lat, lng,
    variant: 'waze', nameSource, coordSource: co ? 'waze' : null,
  };
  applyCardFields(rec, card);
  return rec;
}

function parseWaze(html: string, councilId: string): MikvahCouncilRaw[] {
  return html.split('data-name="entity_field_post_title"').slice(1)
    .map((c) => parseWazeCard(c, councilId))
    .filter((r): r is MikvahCouncilRaw => r !== null);
}

// --- MARKERS path ------------------------------------------------------------

interface CardEntry {
  category?: string;
  phone?: string;
  hopePhone?: string;
  balanit?: string;
  openHours?: string;
  permalink?: string;
  address?: string;
  fields?: Record<string, string>;
}

function cardAddress(card: string): string | undefined {
  const span = card.match(/drts-location-address[^"]*"[^>]*>([\s\S]*?)<\/span>/);
  return span ? cleanAddress(stripTags(span[1]) || null) ?? undefined : undefined;
}

/** Index of card fields keyed by normalized name (for best-effort enrichment). */
function buildCardIndex(html: string): Map<string, CardEntry[]> {
  const idx = new Map<string, CardEntry[]>();
  for (const card of html.split('data-name="entity_field_post_title"').slice(1)) {
    const anchor = card.match(ANCHOR_RE);
    const name = anchor ? stripTags(anchor[2]) : stripTags((card.match(/^[^>]*>([\s\S]*?)<\/div>/)?.[1]) ?? '');
    if (!name) continue;
    const key = normName(name);
    const entry: CardEntry = {
      category: cardCategory(card),
      phone: cardPhone(card),
      hopePhone: normPhone(fieldValue(card, 'field_field_hopephone')),
      balanit: fieldValue(card, 'field_field_balanit_name'),
      openHours: fieldValue(card, 'field_field_open_hours'),
      permalink: anchor ? decodeURIComponent(anchor[1]) : undefined,
      address: cardAddress(card),
      fields: allFields(card),
    };
    (idx.get(key) ?? idx.set(key, []).get(key)!).push(entry);
  }
  return idx;
}

function parseMarkers(html: string, councilId: string): MikvahCouncilRaw[] {
  const idx = buildCardIndex(html);
  const re = /"content":"((?:[^"\\]|\\.)*)","lat":(3[0-3]\.[0-9]+),"lng":(3[3-6]\.[0-9]+)/g;
  const out: MikvahCouncilRaw[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const content = jsonUnescape(m[1]);
    let name: string | null = null;
    const a = content.match(/<a[^>]*>([\s\S]*?)<\/a>/);
    if (a) name = stripTags(a[1]) || null;
    if (!name) name = stripTags(content).split(/,|\s{2,}/)[0]?.trim() || null;
    if (!name) continue;

    const ad = content.match(/drts-map-marker-address[^>]*>([\s\S]*?)<\/address>/);
    const address = cleanAddress(ad ? stripTags(ad[1]) || null : null);

    const rec: MikvahCouncilRaw = {
      sourceId: `rc-mikvah-${councilId}-h${shortHash(normName(name) + '|' + (address ?? ''))}`,
      sourceUrl: null, name, address, lat: Number(m[2]), lng: Number(m[3]),
      variant: 'markers', nameSource: 'marker', coordSource: 'markers',
    };

    const matches = idx.get(normName(name));
    if (matches && matches.length === 1) {
      const c = matches[0];
      if (c.category) rec.category = c.category;
      if (c.phone) rec.phone = c.phone;
      if (c.hopePhone) rec.hopePhone = c.hopePhone;
      if (c.balanit) rec.balanit = c.balanit;
      if (c.openHours) rec.openHours = c.openHours;
      if (c.permalink) rec.sourceUrl = c.permalink;
      if (c.fields && Object.keys(c.fields).length) rec.fields = c.fields;
      if (!rec.address && c.address) rec.address = c.address;
      rec.enriched = true;
    } else if (matches && matches.length > 1) {
      rec.ambiguousEnrich = true; // do NOT guess which card
    }
    out.push(rec);
  }
  return out;
}

// --- public API --------------------------------------------------------------

/** Parse one directory page using the page's detected variant. */
export function parsePage(html: string, councilId: string): { variant: MikvahVariant; records: MikvahCouncilRaw[] } {
  const variant = detectVariant(html);
  return { variant, records: variant === 'waze' ? parseWaze(html, councilId) : parseMarkers(html, councilId) };
}

/** Extract the SabaiApps pagination cache id from page 1's pagination links. */
export function extractCacheId(html: string): string | null {
  return html.match(/settings_cache_id=([a-f0-9]+)/)?.[1] ?? null;
}
