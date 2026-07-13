/**
 * Variant-aware parser for SabaiApps "Directories Pro" council directories.
 *
 *  - WAZE path (PT/Netanya/Givat-Shmuel/Yehud): cards are primary; coordinates
 *    come from each card's Waze link (ll=lat,lng). Name from the listing anchor,
 *    or the post_title text when there is no anchor (Yehud).
 *  - MARKERS path (Merchavim/Rosh-HaAyin/Ganei-Tikva): the embedded markers JSON
 *    array is primary (name/address/coords per entry); nusach/phone are enriched
 *    from the cards by normalized-name match, best-effort only.
 *
 * Never invents data; unresolved joins are flagged, not guessed.
 */
import type { CouncilRaw, Variant } from './sources.ts';

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

/** Normalize a synagogue name for join keys / hashing. */
export function normName(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/בית\s*הכנסת|ביה["׳']?כ["׳']?נ|בהכ["׳']?נ/g, '')
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

function cardPhone(card: string): string | undefined {
  const raw =
    card.match(/entity_field_field_gabphone[\s\S]*?data-phone-number="([^"]+)"/)?.[1] ||
    card.match(/entity_field_field_gabphone[\s\S]*?tel:([0-9\-+&#;]+)/)?.[1];
  // some councils obfuscate the number as HTML entities (e.g. &#48;) → decode.
  return raw ? normPhone(decodeEntities(raw).replace(/\s+/g, '')) : undefined;
}

// --- variant detection ------------------------------------------------------

export function detectVariant(html: string): Variant {
  const waze = (html.match(/waze\.com\/ul\?ll=/g) || []).length;
  const markers = (html.match(/"lat":3[0-3]\.[0-9]+,"lng":3[3-6]\.[0-9]+/g) || []).length;
  const cards = (html.match(/data-name="entity_field_post_title"/g) || []).length;
  if (waze >= Math.max(2, cards * 0.3)) return 'waze';
  return markers > 0 ? 'markers' : 'waze';
}

// --- WAZE path --------------------------------------------------------------

function parseWazeCard(card: string, councilId: string): CouncilRaw | null {
  let name: string | null = null;
  let permalink: string | null = null;
  let nameSource: CouncilRaw['nameSource'] = 'text';

  const anchor = card.match(
    /<a href="([^"]+\/directory-synagogues\/listing\/[^"]+)"[^>]*data-content-name="synagogues_dir_ltg"[^>]*>([\s\S]*?)<\/a>/,
  );
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

  const wpId = permalink ? (card.match(/drts-entity-(\d+)/)?.[1] ?? permalink.match(/listing\/([^/]+)\/?$/)?.[1]) : undefined;
  const sourceId = wpId
    ? `rc-${councilId}-${wpId}`
    : `rc-${councilId}-h${shortHash(normName(name) + '|' + (address ?? ''))}`;

  return {
    sourceId, sourceUrl: permalink, name, address: cleanAddress(address), lat, lng,
    nusach: fieldValue(card, 'field_field_type'),
    gabbaiPhone: cardPhone(card),
    gabbaiAddress: fieldValue(card, 'field_field_gabaddress'),
    dailyLessons: fieldValue(card, 'field_field_daily_lessons'),
    torahLessons: fieldValue(card, 'field_field_torah_lessons'),
    variant: 'waze', nameSource, coordSource: co ? 'waze' : null,
  };
}

function parseWaze(html: string, councilId: string): CouncilRaw[] {
  return html.split('data-name="entity_field_post_title"').slice(1)
    .map((c) => parseWazeCard(c, councilId))
    .filter((r): r is CouncilRaw => r !== null);
}

// --- MARKERS path -----------------------------------------------------------

interface CardEntry { nusach?: string; phone?: string; permalink?: string; address?: string }

/** Address from a card's location span (same source as the waze path). */
function cardAddress(card: string): string | undefined {
  const span = card.match(/drts-location-address[^"]*"[^>]*>([\s\S]*?)<\/span>/);
  return span ? cleanAddress(stripTags(span[1]) || null) ?? undefined : undefined;
}

/** Index of card fields keyed by normalized name (for best-effort enrichment). */
function buildCardIndex(html: string): Map<string, CardEntry[]> {
  const idx = new Map<string, CardEntry[]>();
  for (const card of html.split('data-name="entity_field_post_title"').slice(1)) {
    const anchor = card.match(/<a href="([^"]+\/directory-synagogues\/listing\/[^"]+)"[^>]*data-content-name="synagogues_dir_ltg"[^>]*>([\s\S]*?)<\/a>/);
    const name = anchor ? stripTags(anchor[2]) : stripTags((card.match(/^[^>]*>([\s\S]*?)<\/div>/)?.[1]) ?? '');
    if (!name) continue;
    const key = normName(name);
    const entry: CardEntry = {
      nusach: fieldValue(card, 'field_field_type'), phone: cardPhone(card),
      permalink: anchor ? decodeURIComponent(anchor[1]) : undefined, address: cardAddress(card),
    };
    (idx.get(key) ?? idx.set(key, []).get(key)!).push(entry);
  }
  return idx;
}

function parseMarkers(html: string, councilId: string): CouncilRaw[] {
  const idx = buildCardIndex(html);
  const re = /"content":"((?:[^"\\]|\\.)*)","lat":(3[0-3]\.[0-9]+),"lng":(3[3-6]\.[0-9]+)/g;
  const out: CouncilRaw[] = [];
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

    const rec: CouncilRaw = {
      sourceId: `rc-${councilId}-h${shortHash(normName(name) + '|' + (address ?? ''))}`,
      sourceUrl: null, name, address, lat: Number(m[2]), lng: Number(m[3]),
      variant: 'markers', nameSource: 'marker', coordSource: 'markers',
    };

    // best-effort enrichment from cards by unique normalized name
    const matches = idx.get(normName(name));
    if (matches && matches.length === 1) {
      const c = matches[0];
      if (c.nusach) rec.nusach = c.nusach;
      if (c.phone) rec.gabbaiPhone = c.phone;
      if (c.permalink) rec.sourceUrl = c.permalink;
      if (!rec.address && c.address) rec.address = c.address; // address fallback from card
      rec.enriched = true;
    } else if (matches && matches.length > 1) {
      rec.ambiguousEnrich = true; // do NOT guess which card
    }
    out.push(rec);
  }
  return out;
}

// --- public API -------------------------------------------------------------

/** Parse one directory page using the page's detected variant. */
export function parsePage(html: string, councilId: string): { variant: Variant; records: CouncilRaw[] } {
  const variant = detectVariant(html);
  return { variant, records: variant === 'waze' ? parseWaze(html, councilId) : parseMarkers(html, councilId) };
}

/** Extract the SabaiApps pagination cache id from page 1's pagination links. */
export function extractCacheId(html: string): string | null {
  return html.match(/settings_cache_id=([a-f0-9]+)/)?.[1] ?? null;
}
