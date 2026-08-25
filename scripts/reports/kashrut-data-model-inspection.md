# Kashrut data model — ground-truth inspection

Read-only. No writes to any existing file. Independent re-derivation from the actual type
definitions, live dataset, registry file, and scripts — not a confirmation of prior claims
in this thread. Every field name and mechanism below is verified against current code/data,
not assumed from earlier discussion.

---

## PART A — the actual data model

### A1. Fields that exist in the type AND actually appear in the live dataset

Checked `src/types/place.ts` against `src/data/generated/places.osm.json` (7,471 records)
directly — presence counted per field, not assumed from the type file alone.

| Field | In type? | Live count | Sample value |
|---|---|---|---|
| `kosherType` | yes (legacy) | 2,126 | `"rabanut_mekomi"` |
| `kosherLevel` | yes | 1,877 | `"regular"` |
| `kosherAuthority` | yes | 519 | `"badatz_beit_yosef"` |
| `kosherAuthorityGroup` | yes | 1,877 | `"rabbinate"` |
| `certifierId` | yes | **0** | — |
| `certifiedBy` | yes | 1,560 | `"רבנות הרצליה"` |
| `kosherCertUrl` | yes | 180 | (Tzohar PDF URL) |
| `certificateValidUntil` | yes | 164 | `"2026-09-11"` |
| `certificateIssuedAt` | yes | 0 | — (documented as unpopulated) |
| `kosherDetails` | yes | 164 | (Tzohar-only structured object) |

**Divergence worth flagging: `certifierId` is declared in the type and referenced in
`src/data/kashrut/authorities.ts`, but is present on zero live records.** The pipeline that
writes it (`scripts/apply-kashrut-authorities.mjs`) has never been run with `--apply` against
production data. This is not a hypothetical/prospective field being discussed as if partially
live — it is entirely unpopulated today.

### A2. What each field means

- `kosherType` — **legacy enum**, comment says "do not remove." A closed set of ~18 string
  keys (`rabanut`, `badatz_beit_yosef`, `mehadrin`, `tzohar`, …) mixing authority and level in
  one value.
- `kosherLevel` — `'regular' | 'mehadrin'`. Never appears as `null` anywhere in the live
  dataset (checked directly: 0 records have the key present with a null value) — it is either
  absent (unresolved) or a real value.
- `kosherAuthorityGroup` — `'rabbinate' | 'badatz' | 'independent' | 'unknown'`. High-level
  group.
- `kosherAuthority` — `string | null`. Specific body. Unlike `kosherLevel`, this one **does**
  use explicit `null` as a meaningful state on 6 live records (group known, specific body
  not) — distinct from the field being absent entirely (67 records: absent). Both states
  exist and mean different things.
- `certifiedBy` — raw text as it appeared in the source (the actual evidence).
- `certifierId` — declared as the **new canonical** authority identity, per
  `src/data/kashrut/authorities.ts`'s own header ("A place's resolved authority is referenced
  by `Place.certifierId`... nothing else may hard-code a certifier name"). Not live yet (A1).

### A3. Which field is "the" canonical authority identity — verified, not assumed

**There is no single canonical field today; there are two, from two different eras, and they
are not the same mechanism:**

1. **`kosherAuthority` + `kosherAuthorityGroup`** — the field the *app currently reads*.
   Grepped `src/**/*.{ts,tsx}` for these names: used in `src/utils/kosher.ts`
   (`getKosherLabel`), `src/data/repository/filterPlaces.ts` (the actual filter logic),
   `src/components/PlaceCard.tsx`, `src/screens/PlaceDetailScreen.tsx`,
   `src/screens/ListScreen.tsx`, `src/screens/KashruyotFilterScreen.tsx`,
   `src/components/FilterSheet.tsx`. **This is what a user actually sees and what the
   kashrut filter actually matches against.**
2. **`certifierId`** — grepped the same way: appears *only* in `src/types/place.ts` and
   `src/data/kashrut/authorities.ts`. **Nothing in `src/` reads it.** It is the intended
   future canonical field, designed with real rigor (see A4), but inert today.

So: **the field that actually drives the product right now is `kosherAuthority` /
`kosherAuthorityGroup`, and it is populated by the *older, less careful* of the two
pipelines** (A4). This matters directly for the 12-record discussion in Part B — the records
in question carry live, user-facing values through the legacy path, not through
`apply-kashrut-authorities.mjs` (which has never touched production data at all).

### A4. Two pipelines, verified line-by-line — not the same mechanism

**Legacy: `scripts/migrate-kosher-fields.mjs`.** Reads `kosherType` only. A hardcoded static
table (`MAP`), one `.map()` over *every* place with a `kosherType`, unconditionally
overwriting `kosherLevel` / `kosherAuthorityGroup` / `kosherAuthority` from the table —
**no check of `certifiedBy`, no awareness `kashrut-registry.json`/`reviewQueue` even exists,
and it overwrites existing values rather than only filling gaps.** This is the mechanism that
actually produced every field value on all 12 records examined in Part B.

**Current: `scripts/apply-kashrut-authorities.mjs`.** Reads `certifiedBy` (the raw evidence),
matches by *exact string equality* against `kashrut-registry.json`'s `aliases`, explicitly
**skips any record whose `certifiedBy` is in `reviewQueue`**, only fills `kosherLevel` when
absent (never overwrites), only sets `kosherAuthorityGroup` when currently unknown/absent,
writes the new `certifierId` field, and runs an extensive acceptance-check suite (record
count unchanged, id list byte-identical, only the three allowed fields differ, zero
reviewQueue records touched, no level ever upgraded, `certifiedBy`/`certificateValidUntil`
byte-identical) before it will write anything, dry-run by default. **This script has never
been run with `--apply`** (A1: 0 live `certifierId` values) — so all 12 records' problems
predate it and were never in its scope to begin with.

### A5. Does authority CAUSE/IMPLY level anywhere — found the actual logic, not inferred

**Yes, unconditionally, in the legacy `MAP` table.** Every `badatz_*` and `chatam_sofer`
`kosherType` maps to `kosherLevel: 'mehadrin'` in that table regardless of whether the
source text ever said "mehadrin" — e.g. `badatz_kehilot: { kosherLevel: 'mehadrin', ... }`.
This is a blanket rule ("this authority type ⇒ this level"), not a per-record check of the
evidence. It directly explains part of what's wrong in 6 of the 12 records in Part B (the
`badatz_kehilot` / `chatam_sofer` group): their raw `certifiedBy` text names a body, never a
level, yet `kosherLevel: 'mehadrin'` is present.

The new pipeline (`apply-kashrut-authorities.mjs`) does **not** do this — it only sets level
from the registry's own per-alias `level` field (which can be `null`), never inferred from
authority type.

### A6. Legacy vs. active — by what currently writes/reads each field

| Field | Written by (today) | Read by (today) |
|---|---|---|
| `kosherType` | one-off import scripts (hand-entered per record) | only `migrate-kosher-fields.mjs` (as input) |
| `kosherLevel` | `migrate-kosher-fields.mjs` (blind); `apply-kashrut-authorities.mjs` (gap-fill only, never run) | UI/filter code (A3) |
| `kosherAuthority` | `migrate-kosher-fields.mjs` only | UI/filter code (A3) |
| `kosherAuthorityGroup` | `migrate-kosher-fields.mjs` only | UI/filter code (A3), `filterPlaces.ts` |
| `certifierId` | `apply-kashrut-authorities.mjs`, never actually applied | nothing |
| `certifiedBy` | ~90 individual chain-specific import scripts | UI display, `apply-kashrut-authorities.mjs` matching key |

### A7. "Unresolved" field-representation convention — checked directly, not guessed

Checked a real unresolved record (`9000108`, פיצה מילאנו — has `certifiedBy` but no
structured fields): the keys `kosherType`/`kosherLevel`/`kosherAuthority`/
`kosherAuthorityGroup` are **entirely absent**, not present-as-null. Confirmed 67 food
records in this exact shape, and confirmed dataset-wide that `kosherLevel` is *never*
represented as `null` (0 occurrences) — only absent or a real value. `kosherAuthority` is the
one field that legitimately uses explicit `null` as its own state (6 records: "group known,
body not"), separate from absence. **Convention for "never resolved": delete the key
entirely — do not set `null`**, except `kosherAuthority` may correctly be explicit `null`
when the group is genuinely known but the specific body is not.

---

## PART B — the 12 records against the verified model

All 12 currently show `certifierId`: absent (A1 — expected, that pipeline never ran).
All current field values were produced by the legacy `migrate-kosher-fields.mjs` MAP (A4),
triggered by the `kosherType` that was hand-entered on each record by its own import script
— **not** derived by pattern-matching `certifiedBy` at record-write time in every case; see
per-group notes below, the mechanism is not identical across all 12.

**Important divergence from the corrected 12-record plan already discussed: it treats all 12
uniformly (clear all four fields, no replacement). Reading each raw string's own registry
`why` text shows this is not uniform — some fields on some of these records are explicitly
*affirmed* by the registry, not rejected, and blanket-clearing would delete a fact the
registry itself endorses.**

### Group 1 — `9000053`, `manual-pizza-shemesh-lod-foodtruck`
`certifiedBy: "בד\"צ בית ישראל, העדה החרדית"` (byte-identical raw text on both)
Origin: hand-entered `kosherType` in each record's own import script → legacy MAP filled the rest.

| Field | Current | Registry says | Proposed |
|---|---|---|---|
| `kosherType` | `badatz_edah` | — | delete |
| `kosherLevel` | `mehadrin` | not affirmed ("only the shared group is safe") | delete |
| `kosherAuthority` | `badatz_edah_hachareidis` | `suggestedAuthorityId: null` — over-claims one of two possibly-distinct bodies | delete |
| `kosherAuthorityGroup` | `badatz` | **registry's own words: "only the shared group (badatz) is safe"** | **KEEP** |

Registry `why` (verbatim): *"Two badatz names in one field (בד"צ בית ישראל and העדה החרדית) —
may be two certifications or a sub-body; collapsing them is forbidden (Rule 2), so only the
shared group (badatz) is safe."*

### Group 2 — `manual-maafe-neeman-ashdod-star`
`certifiedBy: "בד\"ץ בית יוסף / רבנות מהדרין"`

| Field | Current | Registry says | Proposed |
|---|---|---|---|
| `kosherType` | `badatz_beit_yosef` | — | delete |
| `kosherLevel` | `mehadrin` | **`suggestedLevel: mehadrin` — explicitly affirmed** | **KEEP** |
| `kosherAuthority` | `badatz_beit_yosef` | `suggestedAuthorityId: null` — over-claims one of two named alternatives | delete |
| `kosherAuthorityGroup` | `badatz` | not affirmable — the two alternatives ("בד\"ץ בית יוסף" vs "an unnamed mehadrin rabbanut") span *different* groups (badatz vs rabbinate) | delete |

Registry `why` (verbatim): *"The slash offers two alternative certifiers (בד"ץ בית יוסף or an
unnamed mehadrin rabbanut); naming one would over-claim. Only the mehadrin level is safe."*

### Group 3 — `cafecafe-62628c4d`, `cafecafe-e8695221`
`certifiedBy: "בד״צ חתם סופר"` (both). **This group is different in kind from the others —
worth reading closely before treating it the same way.**

Registry `suggestedAuthorityId: badatz-chatam-sofer` — **not null.** The `why` text explicitly
says *"The orthographic half is verified correct... the gershayim merge is right"* — i.e. the
registry **affirms** this specific authority resolution for exactly these two records. The
open question in the `why` text is a *different* one: whether other, differently-worded
strings elsewhere in the dataset (`חתם סופר פתח תקווה`, `חתם סופר פ"ת`) should merge into the
*same* id — a family-scope question, not a claim that these two records are wrong.

| Field | Current | Registry says | Proposed |
|---|---|---|---|
| `kosherType` | `chatam_sofer` | consistent with the affirmed id | KEEP (or leave alone) |
| `kosherLevel` | `mehadrin` | **not stated anywhere in the raw text or the registry's reasoning for this string** — same A5 defect (level inferred from authority type, not evidence) | delete |
| `kosherAuthority` | `chatam_sofer` | affirmed | KEEP |
| `kosherAuthorityGroup` | `badatz` | affirmed | KEEP |

The reason this raw string is in `reviewQueue` at all is a registration-process gap (the id
isn't formally minted pending the family-merge decision), not evidence this record's own
resolution is false. Flagging this because it changes what "the fix" should even be here —
possibly nothing on `kosherType`/`kosherAuthority`/`kosherAuthorityGroup`, only `kosherLevel`.

### Group 4 — the 4 בד"ץ קהילות / קריית ספר humus-eli records
`humus-eli-חומוס-אליהו-בית-שמש-סאן-מול`, `...ירושלים-סנטר-1`, `...ירושלים-קניון-רמות` (raw:
`"בד\"ץ קהילות"`), `...מודיעין-עילית` (raw: `"בד\"ץ קהילות קריית ספר"`).

Same shape as Group 3: registry `suggestedAuthorityId: badatz-kehillot` for **both** raw
strings — **affirmed**, not rejected. The Kiryat Sefer variant's `why` is explicit: *"The
suggested id is the city-free badatz-kehillot, which is deliberately NOT registered until the
whole קהילות family is resolved together"* — a registration-timing gap, matching Group 3's
pattern exactly.

| Field | Current (all 4) | Registry says | Proposed |
|---|---|---|---|
| `kosherType` | `badatz_kehilot` | affirmed | KEEP |
| `kosherLevel` | `mehadrin` | not stated by either raw string or either `why` text — same A5 defect | delete |
| `kosherAuthority` | `badatz_kehilot` | affirmed | KEEP |
| `kosherAuthorityGroup` | `badatz` | affirmed | KEEP |

**Scope fence reminder, re-verified directly against the live dataset:** the 3 other records
sharing raw `certifiedBy: "בד\"ץ קהילות"` (`manual-noya-jerusalem`, `manual-caballero-jerusalem`,
`manual-bon-cafe-bb`) currently have no `kosherAuthority` — confirmed absent on all three.
They are already correct; nothing to do.

### Group 5 — the 3 Maafe Neeman Jerusalem records
`manual-maafe-neeman-jlm-center`, `-ramot`, `-givat-shaul`. `certifiedBy: "בד\"ץ מהדרין ירושלים"`
(byte-identical on all 3). **This is the clearest, most decisive case of the 12 — see Part C
for where the raw text itself came from.**

| Field | Current | Registry says | Proposed |
|---|---|---|---|
| `kosherType` | `rabanut_mehadrin_jerusalem` | the enum name itself bakes in "rabanut" for text that says "בד\"ץ" — see A5/A8 | delete |
| `kosherLevel` | `mehadrin` | **`suggestedLevel: mehadrin`, and the `why` text says explicitly "mehadrin level retained"** | **KEEP** |
| `kosherAuthority` | `rabbinate_jerusalem` | **CHALLENGER VERDICT: WRONG** — directly contradicts the raw text (בד"ץ = independent badatz; the current value claims the government Rabbinate) | delete |
| `kosherAuthorityGroup` | `rabbinate` | wrong for the same reason — badatz ≠ rabbinate | delete |

Registry `why` (verbatim, this is the strongest-worded entry of the 12): *"Invents an
authority out of a level word. The proposed id 'badatz-mehadrin-jerusalem' was assembled from
bare 'בד"ץ' + the level word 'מהדרין' + a city; Rule 1 states both name NO authority... Minting
the id would plant a phantom independent haredi badatz that a user who does not accept
Rabbanut-mehadrin would read as a stricter hechsher than it is. The refusal to merge into
rabbinate-jerusalem is correct (Rule 2) and is preserved: authorityId null, mehadrin level
retained."*

### A8 — additional finding surfaced while tracing Group 5 (not one of the 12, flagging because it's directly adjacent)

The record immediately following the 3 target ids in `scripts/import-maafe-neeman.mjs`
(`manual-maafe-neeman-jlm-malcha`) carries `certifiedBy: "רבנות מהדרין ירושלים"` — textually
*different* (רבנות = Rabbinate, not בד"ץ = Badatz) — but is mapped to the **identical**
`kosherType: 'rabanut_mehadrin_jerusalem'` as the 3 target records. The enum conflates two
raw strings that name different kinds of body. Not in the 12-record scope; noting it because
it's the same defect class and sits one line away from the records being fixed.

---

## PART C — Maafe Neeman Jerusalem source trace

**Origin found via `git log -S` on the 3 record ids against `places.osm.json`:**
commit `de3cd895b3fc186a713735083a352b7ddeca167c`, authored by **nakashdin** (the project
owner), 2026-07-27 14:57:09 +0300, message: *"data: add מאפה נאמן (40), ארקפה (13), קפה נמרוד
(1); add bakery type"* (`Co-Authored-By: Claude Sonnet 4.6`).

**The importer script's own header** (`scripts/import-maafe-neeman.mjs`, line 3): *"Source:
maafe_neeman_branches.xlsx (provided by admin, July 2026)."*

**What actually happened, read directly from the script:** all 40 branches, including the 3
in question, are a hand-entered literal array — each record's `kosherType` and `certifiedBy`
were typed in together, per branch, straight from that spreadsheet. This was **not**
algorithmic (no code pattern-matches `certifiedBy` text to choose `kosherType` for this
importer — unlike, e.g., Golda's `mapKosherType()`). The person authoring the script (an
earlier Claude session, working from the spreadsheet) chose `kosherType:
'rabanut_mehadrin_jerusalem'` for a branch whose own `certifiedBy` field, entered in the same
line, says `"בד\"ץ מהדרין ירושלים"` — the mismatch was introduced at transcription time, not
generated by later code.

**What I cannot determine:** the `.xlsx` file itself is not in the repository (expected — it
was an offline file the owner provided directly to whichever session ran this import). I have
no way to check whether the spreadsheet's own column said "בד\"ץ" or something else, whether
the transcribing session mis-typed it, or whether the spreadsheet itself already conflated
Rabbinate-mehadrin and an independent badatz. **Saying plainly, per Part C's instructions: the
original source cannot be verified further from here** — everything past the git commit is a
hand-entered value from a file that no longer exists anywhere I can read. The live Maafe
Neeman site not currently showing this information doesn't confirm or refute the July 2026
spreadsheet value either way; it's a different point in time and I have not compared them
since the owner said the site doesn't expose branch-level kashrut info to check against.

---

## Summary of what actually needs owner sign-off, restated precisely

Not "clear 4 fields on 12 records" uniformly. Per-field, grounded in each raw string's own
registry text:

- **Always delete `kosherLevel`** where it was never stated by the source (Groups 3 and 4 —
  6 records: pure A5 authority→level inference, no textual basis at all).
- **Always delete authority-identity fields** where the registry explicitly rejects them
  (Group 5, 3 records) or calls them an over-claim between named alternatives (Groups 1–2).
- **Keep `kosherLevel: mehadrin`** on Groups 2 and 5 (4 records) — the registry itself affirms
  the level, only the authority attribution is the problem.
- **Keep `kosherAuthorityGroup: badatz`** on Group 1 (2 records) — registry's own words say
  the group is the one thing that's safe.
- **Keep `kosherType`/`kosherAuthority`/`kosherAuthorityGroup` entirely** on Groups 3 and 4
  (6 records) — the registry affirms these; the only defect found is `kosherLevel`, which
  wasn't part of the original fix scope's framing of these 6 as a "legacy-bypass" case at all.

This is materially different from a blanket 4-field clear across all 12, and changes which
records actually need a write versus which need only `kosherLevel` touched.
