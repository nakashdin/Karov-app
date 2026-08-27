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
 *   - CORRECTED 2026-08-27 (was live for one dry-run cycle, never applied):
 *     body detection originally used a hand-written pattern list requiring
 *     final tsadi ץ only. The real מגדל העמק branch page states "סניף כשר
 *     בד"צ בית יוסף" — regular tsadi צ, verified codepoint-by-codepoint —
 *     which none of those patterns matched, on any of 59 pages. A dry run
 *     built on that adapter output would have overwritten a real, registered
 *     badatz (badatz-beit-yosef) with kosherAuthorityGroup:'unknown'. Body
 *     detection now goes through the shared, registry-backed resolver
 *     (authority-normalize.mjs) — the same fix-once-not-per-adapter argument
 *     as the pipeline itself — and reports the VERBATIM matched substring
 *     from the page, never the registry's own spelling (interprets nothing;
 *     resolving that substring to an authorityId is the pipeline's job, at
 *     Gate 2/3, through the identical resolver).
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildResolverEntries, resolveAuthorityFromText } from '../authority-normalize.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = resolve(HERE, '..', '..', 'reports', 'kashrut-registry.json');

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

// Clean, minimal verbatim phrase — not a wide context window. This value can
// now be WRITTEN to claimedLevelText (Item 4 Unit 3), so it must be the
// actual phrase, not "phrase plus 60 chars of surrounding markup." Matches
// both observed real shapes: "כשר למהדרין" (the badge, ל present) and "כשר
// מהדרין" (Dizengoff Center's body-text instance, ל absent).
const LEVEL_PHRASE_RE = /כשר\s*ל?(?:מהדרין|גלאט)/;
const NEGATIVE_PATTERNS = [
  /לא\s*כשר/, /אינ[ווה]\s*כשר/, /ללא\s*כשרות/, /ללא\s*הכשר/, /בלי\s*כשרות/,
  /לא\s*בהכשר/, /לא\s*כשרה/, /לא\s*כוללת?\s*כשרות/, /בוטל.{0,10}כשר/,
  /נשלל.{0,10}כשר/, /פג.{0,10}תוקף.{0,20}כשר/, /טרם\s*קיבל/, /בהמתנה.{0,15}כשר/,
];

// Document-order-first (leftmost match wins) was, until this comment,
// correct only by accident of LEVEL_PHRASE_RE lacking a `g` flag — nobody
// had chosen it deliberately. That was the actual risk, not any single
// observed page: `.exec()` returns the leftmost match, and Dizengoff
// Center's page (the sole page of 39 with a level phrase at all that never
// says "כשר למהדרין" — its only occurrence is "כשר מהדרין", ל absent,
// in the opening-hours block, see module header) happens to depend on
// leftmost winning only in the sense that if this page ever gained a
// second, later level-phrase occurrence, taking the LAST match instead of
// the first could silently pick the wrong one. Checked directly, 2026-08-27
// (Reviewer): the captured Dizengoff page does NOT actually contain "כשר
// למהדרין" anywhere, and 0 of 59 captured greg pages carry a "branches near
// you" / footer block naming sibling locations — so a same-page sibling-
// chrome collision is a HYPOTHETICAL this rule also guards against, not
// something observed on any real page. Stating leftmost-wins explicitly,
// and pinning it with a test, closes the gap where a future refactor
// (switching to a global regex and taking the last match, or reordering
// snippets before matching) could silently invert the precedence with
// nothing to catch it — regardless of whether the specific hypothetical
// above is ever realized. See __tests__/greg-adapter.test.mjs for the
// pinned case.
export function findLevelText(plainText) {
  const m = LEVEL_PHRASE_RE.exec(plainText);
  return m ? m[0] : null;
}

function findNegative(plainText) {
  for (const re of NEGATIVE_PATTERNS) {
    const m = re.exec(plainText);
    if (m) return plainText.slice(Math.max(0, m.index - 40), m.index + 40);
  }
  return null;
}

/** Body detection via the shared, registry-backed resolver — see module header for why the old hand-written pattern list was replaced. Returns the VERBATIM matched substring (or null), never the registry's own spelling. */
function findBodyText(plainText, resolverEntries) {
  const result = resolveAuthorityFromText(plainText, resolverEntries);
  return result ? result.matchedText : null;
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
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8').replace(/^﻿/, ''));
  const resolverEntries = buildResolverEntries(registry);
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
    const levelText = findLevelText(plainText);
    const bodyText = findBodyText(plainText, resolverEntries);

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
