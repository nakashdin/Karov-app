# Two proposals (design only — nothing here has been implemented)

## 1. Winery display fix — scoped, not built

### What's actually there today

`KosherBodyState`'s `none` variant (src/utils/kosher.ts:298) renders `null`. Three call
sites consume that:

| Call site | Current `null` handling |
|---|---|
| `PlaceCard.tsx:152` (list card) | `{kosherLabel && (...)}` — chip omitted entirely |
| `PlaceBottomCard.tsx:21-22` | falls through to place-type label (`if (label) return label`) — no kashrut-specific fallback shown at all |
| `PlaceDetailScreen.tsx:457-460` | **already non-blank**: `value={kosherBodyLabel ?? '—'}` with an `empty={!kosherBodyLabel}` style flag |

So the detail screen already has precedent for exactly the pattern the owner wants —
an explicit placeholder instead of absence — it's just not styled as a stated claim,
only as an em-dash. `StarRow` (PlaceCard.tsx:45-66) has the same pattern again,
independently: `rating == null` renders the Hebrew string `'טרם דורג'` ("not yet
rated") instead of blank. Two precedents already in this codebase for "explicit
absence, not silence."

### Proposed shape (not built)

- Add one new i18n key to `strings.kosher` (5 locale files, same pattern as
  `unknownFloor`): something like `noEvidence: 'אין מידע כשרות'` ("no kashrut
  information") — exact wording is the owner's call, not mine.
- `renderBodyState`'s `case 'none':` returns `strings.kosher.noEvidence` instead of
  `null`. This is the single choke point — all three call sites inherit it
  automatically, no per-screen change needed for the text itself.
- `PlaceCard.tsx`'s chip: remove the `kosherLabel &&` guard (chip always renders now),
  and `kosherBadgeColor` needs one more branch — today it falls through to
  `theme.primary` for anything unmatched, which would make "no evidence" visually
  identical to "kosher via unspecified body," the exact ambiguity being fixed. Needs
  a distinct color (e.g. `theme.textFaint` or a new muted token) so it reads as
  "absence of a claim," not "a claim we didn't categorize."
- `PlaceBottomCard.tsx`: currently has no fallback branch for a food place with no
  kashrut label at all (falls through past the `if (place.type === 'synagogue')`
  check to a generic place-type label) — needs an explicit branch added so food
  places don't silently show their PlaceType label instead of a kashrut statement.
- `PlaceDetailScreen.tsx`: smallest change — swap `'—'` for the new string; the
  `empty` styling flag already exists and can stay or be reconsidered once the string
  is a real sentence rather than a placeholder dash.

### Cost estimate

- 5 i18n files (one new key each) — mechanical, ~1 line each.
- `kosher.ts`: 1 line changed (`case 'none'` return value) + `strings.kosher` type
  gains one field.
- 3 call sites touched: 1 near-trivial (detail screen, swap a fallback string), 1
  small (list card, remove a guard + add a color branch), 1 requires actual new
  logic (bottom card, currently has zero kashrut-absence handling to begin with).
- Test updates: `kosher.test.ts` (unknownFloor-style assertion, same shape as the
  existing test for that string) + `kosher-display-binding.test.ts` (the `none`
  variant's EXAMPLES entry currently expects rendering nothing — would need updating
  since the exhaustiveness/binding mechanism explicitly enumerates every variant's
  expected output).
- No data write, no new Place field, no fabrication — purely a display-layer
  string change on a variant the binding mechanism (Item 4 Unit 3) already models
  and already exhaustively covers, so there's no risk of silently missing a case.
- Affects exactly the 18 winery records today, but is not winery-specific — it's
  the generic `none` fallback, so it would also apply to any future record that
  reaches `none` (currently none do besides these 18, per the binding test's own
  assertion that `none` count == 18 and all are `manual-winery-*`).

Not building this until the owner decides on wording and whether "no evidence" is
the right framing versus some other treatment.

---

## 2. Separating the two ratchet families in validate-data.mjs's output — proposal only

### The problem, concretely

`RATCHET_KEYS` (validate-data.mjs:763-780) is one flat array of 16 keys: 9 concern
`places.osm.json` (the file the app reads), 7 are prefixed `restaurants*` and concern
`restaurants.osm.json` (confirmed, §32 KASHRUT_FACTS.md: zero `src/` readers). The
comparison loop (line 801) iterates this list uniformly and pushes every result into
one shared `improvements`/`regressions` array, printed as one flat block
(`if (improvements.length) { ... improvements.forEach(...) }`). A reader sees:

```
levelAssertedWithNoBody: 196 → 158 (−38)
restaurantsLevelAssertedWithNoBody: 221 → 183 (−38)
kashrutAuthorityUnknown: 1183 → 1184 (+1, CORRECTED: ...)
```

with no marker distinguishing which lines describe the dataset the app actually
serves and which describe a file nothing reads. Today that distinction has to be
reconstructed by knowing the `restaurants` prefix convention and separately knowing
(from §32, not from this file) that the prefix means "unread." Nothing in the output
itself carries that fact.

### Proposed shape (not built)

Split `RATCHET_KEYS` into two named groups at the point of declaration:

```js
const SERVED_RATCHET_KEYS = [ /* the 10 places.osm.json keys */ ];
const UNREAD_RATCHET_KEYS = [ /* the 6 restaurants* keys */ ];
```

(names are a starting proposal, not final — the point is that the grouping is
declared once, near the data, not inferred from a prefix scan at read time.)

Comparison loop stays structurally the same (same predicate reuse, same
`RATCHET_CORRECTIONS` verification path — nothing about the verification mechanism
changes), but `improvements`/`regressions` become two pairs, one per group, OR a
single array where each entry carries a `served: boolean` tag it's pushed with —
either works; the second is a smaller diff.

Output changes from one flat block to two headed blocks:

```
✓ ratchet improvements — dataset the app serves (places.osm.json):
   levelAssertedWithNoBody: 196 → 158 (−38)
   kashrutAuthorityUnknown: 1183 → 1184 (+1, CORRECTED: ...)

⚠ ratchet improvements — restaurants.osm.json (no src/ reader — see FACTS §32):
   restaurantsLevelAssertedWithNoBody: 221 → 183 (−38)
```

The `⚠` / explicit "(no src/ reader — see FACTS §32)" label on the second header is
the actual fix — a reader should not need this file's own history memorized to know
that block describes a file the app doesn't load. The regressions block (which can
fail the build) gets the same split, so a `restaurants*` regression is still visible
but visibly labeled as concerning the unread file, not silently equal-weighted with a
`served` regression.

### What this does NOT do

- Does not silence, downgrade, or remove the `restaurants*` ratchets — they still run,
  still gate `--update`, still fail the build on an unverified rise. This is a
  labeling/grouping change to the report, not a scope change to what's checked.
- Does not resolve §32 itself (sync/freeze/retire `restaurants.osm.json`) — that's
  still the owner's open decision. This only makes today's output honest about which
  numbers matter to what a user actually sees, while that decision is pending.
- Does not touch `RATCHET_CORRECTIONS`, `verifyRatchetCorrection`, or either
  predicate function — the verification mechanism is unchanged; only the reporting
  layer around it changes.

### Cost estimate

- Splitting the array: mechanical, no logic change.
- Loop: either a tag on each pushed message (~2 line change) or duplicating the loop
  body once per group (~10 line change, more explicit, easier to read six months from
  now) — my preference is the tag approach for less duplication, but this is a
  judgment call, not a constraint.
- Output formatting: ~10 new lines for the two headers + grouping logic.
- No test currently asserts on the exact console output shape (checked — the
  ratchet-corrections tests assert on `verifyRatchetCorrection`'s return value, not
  on validate-data.mjs's printed text), so this is low-risk to existing coverage, but
  a new test could assert the two groups stay disjoint (every `RATCHET_KEYS` member
  in exactly one of the two new arrays, none in both, none missing) — cheap and
  catches the failure mode of someone adding a 17th key to the wrong list, or to
  neither.

Not building this until you confirm the shape (tag vs. duplicated loop; exact header
wording) is what you want to bring to the owner.
