/**
 * One shared Hebrew-orthography normalizer + registry resolver for
 * certifying-body text. Every adapter and every matcher goes through this
 * — never a per-adapter hand-written pattern list (Item 4 Unit 3,
 * 2026-08-27, the pipeline's own founding argument applied one layer
 * earlier: the logic belongs in one place, adapters only report).
 *
 * Found live, not theorized: greg-adapter.mjs's original BODY_PATTERNS
 * (`/בד"?ץ/`, five more like it) required final tsadi ץ (U+05E5) only. The
 * real greg מגדל העמק branch page states "סניף כשר בד"צ בית יוסף" — regular
 * tsadi צ (U+05E6), verified codepoint-by-codepoint against the live page,
 * not assumed. Every one of those six patterns returned false against the
 * real string, on all 59 pages, so a genuinely named, registered badatz
 * was invisible — and about to be overwritten with kosherAuthorityGroup
 * 'unknown' by a dry run that had otherwise verified correctly (the write
 * path was checked against the adapter's OUTPUT; the adapter's output was
 * already wrong — the check's form was intact while its subject was
 * hollow). The same defect exists in the original scripts/scrape-greg.mjs
 * and, repo-wide, in at least 14 other places matching ONLY final ץ; not
 * consolidated by this change, logged as a known drift surface.
 *
 * Folds, in order:
 *   - quote-mark variants (" ' ׳ ״ ″) REMOVED entirely, not normalized to
 *     one canonical mark — the registry itself has alias entries with NO
 *     quote character at all ("בדץ בית יוסף"), so picking one canonical
 *     quote would still miss those; stripping is the only fold that
 *     unifies every observed form.
 *   - Hebrew final-letter forms (ץ ם ן ף ך) folded to their medial
 *     counterpart (צ מ נ פ כ) EVERYWHERE, not only word-finally — real
 *     sites routinely use the medial form where standard orthography
 *     calls for final (mobile keyboards, CMS auto-correct, plain typos),
 *     and the registry itself carries both spellings for the same body
 *     ("בד\"צ בית יוסף" AND "בד\"ץ בית יוסף" both resolve to
 *     badatz-beit-yosef).
 *   - whitespace collapsed to a single space, trimmed.
 *   - a small set of generic prefixes ("כשרות", "כשר", "בהשגחת") stripped,
 *     looped until none remain, so "כשר בד\"צ..." and "בד\"צ..." normalize
 *     identically.
 */
const QUOTE_CHARS_RE = /["'׳״″]/g;
const FINAL_TO_MEDIAL = { 'ץ': 'צ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ך': 'כ' };
const FINAL_LETTERS_RE = /[ץםןףך]/g;
const PREFIX_RE = /^(כשרות|כשר|בהשגחת)\s+/;

export function normalizeAuthorityText(s) {
  if (!s) return '';
  let t = String(s)
    .replace(QUOTE_CHARS_RE, '')
    .replace(FINAL_LETTERS_RE, (c) => FINAL_TO_MEDIAL[c])
    .replace(/\s+/g, ' ')
    .trim();
  let prev;
  do {
    prev = t;
    t = t.replace(PREFIX_RE, '');
  } while (t !== prev);
  return t;
}

// The full Hebrew alphabet block (base letters + finals) — used to build a
// Hebrew-aware word boundary. JS's `\b` is defined in terms of `\w`
// ([A-Za-z0-9_]), which does NOT include Hebrew letters, so `\b` is a
// silent no-op around Hebrew text — found live: without an explicit
// boundary, the alias "צהר" (Tzohar, a real registered authority, so it
// passes the authorityId-required filter) matched as a bare substring
// inside "הצהרת נגישות" ("accessibility declaration" — WordPress footer
// boilerplate present on every page), resolving all 59 greg pages to
// Tzohar. A lookbehind/lookahead requiring "not a Hebrew letter" on both
// sides of the match is the correct boundary; `\b` would have looked like
// it worked (no error, a result returned) while silently doing nothing.
const HEBREW_LETTER = '\\u05D0-\\u05EA';
const NOT_PRECEDED_BY_HEBREW = `(?<![${HEBREW_LETTER}])`;
const NOT_FOLLOWED_BY_HEBREW = `(?![${HEBREW_LETTER}])`;

/**
 * Builds a regex that matches ONE registry alias's raw text loosely —
 * quote characters optional/any-variant, final-letter forms interchangeable
 * with their medial counterpart, whitespace flexible, bounded on both sides
 * so it can never match as a bare substring inside a longer Hebrew word —
 * so it can be run directly against REAL, un-normalized source text and
 * still return the exact verbatim substring that matched (never the
 * registry's own spelling — certifiedBy is source text, not ours to tidy,
 * B1.1).
 */
function toFuzzyRegex(rawAliasText) {
  const escaped = rawAliasText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = escaped
    .replace(/["'׳״″]/g, `["'׳״″]?`)
    .replace(/[צץ]/g, '[צץ]')
    .replace(/[מם]/g, '[מם]')
    .replace(/[נן]/g, '[נן]')
    .replace(/[פף]/g, '[פף]')
    .replace(/[כך]/g, '[כך]')
    .replace(/\s+/g, '\\s+');
  return new RegExp(NOT_PRECEDED_BY_HEBREW + pattern + NOT_FOLLOWED_BY_HEBREW);
}

/**
 * Every registry alias that names a real body, ready to test against real
 * text, longest-raw-text first — so a specific alias ("בד\"צ בית יוסף")
 * is tried before a shorter one it happens to contain as a substring
 * ("בית יוסף" alone). Aliases with authorityId:null (bare, unresolved
 * terms in the registry itself — "כשר", "בד\"ץ", "רבנות", "הרבנות") are
 * EXCLUDED here: those are exactly the generic mentions that must never
 * count as "naming a body," and the registry's own null already marks
 * them as such — this function does not re-decide that, it reads it.
 */
export function buildResolverEntries(registry) {
  return (registry.aliases ?? [])
    .filter((a) => a.authorityId != null)
    .map((a) => ({ raw: a.raw, authorityId: a.authorityId, level: a.level, fuzzyRe: toFuzzyRegex(a.raw) }))
    .sort((a, b) => b.raw.length - a.raw.length);
}

/**
 * Scans `text` (real, un-normalized source text — a branch page, a
 * certifiedBy field, anything) for the MOST SPECIFIC registered alias it
 * contains. Returns null if nothing registered (with a real authorityId)
 * matches — including if the only thing present is a generic term like
 * "בד\"ץ" alone, which is correctly not a body name.
 *
 * @param {string} text
 * @param {Array} resolverEntries - from buildResolverEntries(registry); built once per caller and reused, not rebuilt per call.
 * @returns {{raw: string, authorityId: string, level: string|null, matchedText: string} | null}
 *   `level` on the returned object (and on every resolverEntries item) is
 *   NOT a fact about the resolved authority — measured 2026-08-27 (Item 4
 *   Unit 3, owner ruling "לא, הם כשרויות שונות" — a body does not confer a
 *   level): across all 203 registry aliases, level=="mehadrin" iff the RAW
 *   ALIAS TEXT ITSELF happens to contain the word מהדרין/גלאט — zero
 *   exceptions. The same authority carries different `level` values purely
 *   by which spelling matched (badatz-beit-yosef: mehadrin | null;
 *   rabbinate-tel-aviv: null | mehadrin | regular; 35 more authorities
 *   disagree internally the same way). It is a restatement of the matched
 *   STRING, not evidence about the body. Do not consult it for any level
 *   decision — kashrut-pipeline.mjs's classifyBranch() deliberately never
 *   reads it; keep it only for provenance/debugging.
 */
export function resolveAuthorityFromText(text, resolverEntries) {
  if (!text) return null;
  for (const entry of resolverEntries) {
    const m = entry.fuzzyRe.exec(text);
    if (m) {
      return { raw: entry.raw, authorityId: entry.authorityId, level: entry.level, matchedText: m[0] };
    }
  }
  return null;
}
