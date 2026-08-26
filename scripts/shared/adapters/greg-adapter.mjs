/**
 * Greg (gregcafe.co.il) adapter for the shared kashrut pipeline
 * (kashrut-pipeline.mjs).
 *
 * An adapter's ONLY job is to report what the source says — it interprets
 * nothing. It does not decide kosher, does not map to kosherType, does not
 * decide a level, does not touch the dataset. All of that lives in the
 * pipeline's Gates 0-4, in exactly one place (see rebar-adapter.mjs's header
 * for the fuller rationale — same contract, different source shape).
 *
 * Source shape: a WordPress site with one page per branch
 * (gregcafe.co.il/branch/<slug>/), discovered via branch-sitemap.xml — not a
 * single machine-readable feed the way rebar's is. Confirmed by direct
 * investigation (2026-08-26/27), not assumed:
 *   - No lat/lng anywhere on a branch page (unlike rebar) — matching against
 *     the dataset falls back to store-matcher.mjs's city+token signal.
 *   - Kashrut text appears in two different DOM shapes on a page that has
 *     it at all: a dedicated badge span right after the H1 ("כשר למהדרין"),
 *     or plain body text elsewhere on the page ("כשר מהדרין" in the opening-
 *     hours block on the Dizengoff Center page) — a badge-only regex misses
 *     the second shape, so this adapter scans the full tag-stripped page
 *     text, not one fixed selector.
 *   - Full 59-page sweep found ZERO instances of any named supervising body
 *     (בד"ץ/רבנות/הרב <name>/עדה חרדית/חתם סופר) anywhere, and ZERO explicit
 *     non-kosher markers anywhere (broadened pattern set, not just one
 *     phrase) — bodyText is null for every branch this adapter has ever
 *     seen, and kashrutMarker is never 'negative' for this source. Both are
 *     still computed per-branch, not hardcoded, so a future branch that
 *     breaks the pattern is still caught rather than silently assumed away.
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const SITEMAP_URL = 'https://gregcafe.co.il/branch-sitemap.xml';
export const CHAIN_ID_PREFIX = 'greg-';
export const CHAIN_DOMAIN = 'gregcafe.co.il';

function stripTags(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#8203;/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Every snippet (~60 chars either side, tag-stripped) around a literal "כשר" occurrence — the badge lives in one, but not always the same DOM shape, so this scans raw HTML rather than one selector. */
function kosherSnippets(html) {
  const snippets = new Set();
  let idx = 0;
  while (true) {
    const found = html.indexOf('כשר', idx);
    if (found === -1) break;
    snippets.add(stripTags(html.slice(Math.max(0, found - 60), found + 60)));
    idx = found + 3;
  }
  return [...snippets];
}

const LEVEL_WORDS = ['מהדרין', 'גלאט'];
const NEGATIVE_PATTERNS = [
  /לא\s*כשר/, /אינ[ווה]\s*כשר/, /ללא\s*כשרות/, /ללא\s*הכשר/, /בלי\s*כשרות/,
  /לא\s*בהכשר/, /לא\s*כשרה/, /לא\s*כוללת?\s*כשרות/, /בוטל.{0,10}כשר/,
  /נשלל.{0,10}כשר/, /פג.{0,10}תוקף.{0,20}כשר/, /טרם\s*קיבל/, /בהמתנה.{0,15}כשר/,
];
const BODY_PATTERNS = [/בד"?ץ/, /בד״ץ/, /רבנות/, /הרב\s+[א-ת]/, /עדה\s+ה?חרדית/, /חתם\s+סופר/];

function findLevelText(snippets) {
  return snippets.find((s) => LEVEL_WORDS.some((w) => s.includes(w))) ?? null;
}

function findNegative(plainText) {
  for (const re of NEGATIVE_PATTERNS) {
    const m = re.exec(plainText);
    if (m) return plainText.slice(Math.max(0, m.index - 40), m.index + 40);
  }
  return null;
}

function findBodyText(plainText) {
  for (const re of BODY_PATTERNS) {
    const m = re.exec(plainText);
    if (m) return plainText.slice(Math.max(0, m.index - 40), m.index + 40);
  }
  return null;
}

function extractName(html) {
  const m = /<h1[^>]*>([\s\S]{0,300}?)<\/h1>/i.exec(html);
  return m ? stripTags(m[1]) : null;
}

/** Greg's H1 is "סניף <location>" or "סניף <location>, <city>" — the part after the last comma is the city hint when present, else there is none and store-matcher falls back to matching against the whole name. */
function extractCity(name) {
  if (!name) return null;
  const idx = name.lastIndexOf(',');
  return idx === -1 ? null : name.slice(idx + 1).trim();
}

async function fetchSitemapUrls(fetchImpl) {
  const res = await fetchImpl(SITEMAP_URL, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`greg-adapter: branch sitemap HTTP ${res.status}`);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  // The bare /branch/ URL is the archive index, not a real branch page.
  return urls.filter((u) => u !== 'https://gregcafe.co.il/branch/');
}

/**
 * @param {typeof fetch} [fetchImpl] - injectable for testing without a real network call.
 * @returns {Promise<Array<{sourceKey, name, address: null, city, lat: null, lng: null, kashrutMarker: 'asserted'|'negative'|'not_asserted', levelText: string|null, bodyText: string|null, sourceUrl: string, raw: object}>>}
 */
export async function fetchBranches(fetchImpl = fetch) {
  const urls = await fetchSitemapUrls(fetchImpl);
  const branches = [];
  for (const url of urls) {
    const res = await fetchImpl(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`greg-adapter: branch page HTTP ${res.status} for ${url}`);
    const html = await res.text();
    const name = extractName(html);
    const plainText = stripTags(html);
    const snippets = kosherSnippets(html);
    const negative = findNegative(plainText);
    const levelText = findLevelText(snippets);
    const bodyText = findBodyText(plainText);

    branches.push({
      sourceKey: url,
      name,
      address: null, // greg branch pages carry no separate street address field
      city: extractCity(name),
      lat: null,
      lng: null,
      kashrutMarker: negative ? 'negative' : snippets.length > 0 ? 'asserted' : 'not_asserted',
      levelText,
      bodyText,
      sourceUrl: url,
      raw: { name, snippets, negative },
    });
  }
  return branches;
}
