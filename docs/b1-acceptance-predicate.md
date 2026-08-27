# B1 acceptance predicate — pre-registered

**Written before the B1 diff exists.** Committed at HEAD `3761e1c`, dataset md5 `5570b49e`. Everything below
was derived from the code and data as they stand now, so that no criterion can be shaped by the
implementation it is meant to judge. Anything added after the diff arrives will be marked `[POST-HOC]` and
carries less weight by construction.

Batch A's predicate caught three underspecified points. The same discipline applies here, and it matters more
because B1.1 and B1.4 are both *guards*, and a guard that cannot detect its own violation is worse than no
guard — it reads as protection.

---

## 0. Baseline facts, pinned now

| Fact | Value | Why it is pinned |
|---|---|---|
| HEAD | `3761e1c` | |
| `places.osm.json` md5 | `5570b49e0071c6afaf52e3699726f80b` | B1 is code-only; this must not move |
| records with a **level-asserting** `kosherType` | **845** (`mehadrin` 769, `rabanut_mehadrin` 69, `rabanut_mehadrin_jerusalem` 7) | the true surface B1.2 must reason about |
| …of those, `certifiedBy` names a body in the registry | **343** | the body-discarded-and-level-invented case |
| …distinct id prefixes / singletons | 252 / **192** | hand-curated, not a few bulk importers |
| scripts assigning a level-asserting `kosherType` **as a literal** | **29** | |
| scripts assigning `kosherType` **dynamically** | **42** | a per-script guard has to cover ~71 files |
| `kosherLevel` read sites in `src/` | **6** | enumerated in §3 |
| …of those, using **truthiness** rather than `=== 'mehadrin'` | **1** — `kosher.ts:138` | the only null-collapse site in production code |
| `sanitizePlace` | spreads `...raw` | **preserves `null`** today; a change to explicit field copying would silently destroy the distinction |
| `PlaceCard.tsx:36` | already types `kosherLevel?: string \| null` | the component anticipated null before `Place` did |

---

## 1. B1.1 — `certifiedBy` append-only, enforced as a HARD failure

The mechanism was deliberately left open. My job is not to approve a design; it is to determine whether
whatever ships **actually catches an overwrite**. Proven the way the Batch A mirror test was proven — by
performing the violation and watching it fail.

**P1.1a — IT MUST FIRE. Non-waivable.** I will take a record whose `certifiedBy` names a body and replace it
with the bare word `מהדרין`, reproducing the humus-eli defect exactly, then run `npm run data:validate`.
PASS requires **exit 1**, a **HARD** failure (not a ratchet line), and the offending id named in the output.
A green run is an outright FAIL of B1.1 regardless of how the code reads.

**P1.1b — IT MUST NOT FIRE ON A NEW RECORD.** I will add a record with a new id and a `certifiedBy`, and
require the validator to pass. A rule that blocks additions violates additive-only and would stop the dataset
growing. Firing here is a FAIL.

**P1.1c — THE NORMALIZATION QUESTION MUST BE ANSWERED, NOT LEFT SILENT.** `בד"צ` → `בד״ץ` is gershayim
normalization, which this project has already performed deliberately (FACTS §6, change D) and which is
*desirable*. A byte-strict append-only rule forbids it. I will apply that exact normalization to one record
and observe. **Either behaviour passes** — allow it through a documented path, or forbid it and say so in the
failure message — but the implementation must have *decided*. Silence, or a failure message that reads as
though data has been lost when only typography changed, is a FAIL.

**P1.1d — THE BASELINE'S LIMITATION MUST BE STATED IN THE CODE.** If detection compares against
`git show HEAD:src/data/generated/places.osm.json` (the only single-state-plus-history option), then once an
overwrite is committed it *becomes* the baseline and is invisible from then on. That is acceptable — the rule
bites at the moment of the write, which is when it matters — but it must be written down where the next
reader will see it, because "the validator is green" will otherwise be read as "no record has ever been
overwritten." I will also confirm the check runs from a **detached worktree** and does not require the
working tree.

**P1.1e — HARD, NOT RATCHET.** It must land in `hard[]`. If it arrives as a `RATCHET_KEYS` entry it can never
fail, because `baseline[key] ?? Infinity` makes an unbaselined counter structurally incapable of regression.
That exact hole is live right now in the uncommitted `validate-data.mjs`. A ratchet-shaped B1.1 is a FAIL.

**P1.1f — SELF-CONTAINED.** No dependency on an untracked file, no absolute path, runs on a clean clone.

---

## 2. B1.2 — import-site guard

**P1.2a — COVERAGE ACCOUNTED AGAINST 845, NOT 204.** The 204 is the site-B subset *inside the 358*. The
population a level-guard governs is the **845** records carrying a level-asserting `kosherType`, of which
**343** have a `certifiedBy` that names a body. The implementation must state which of those its guard would
have prevented, with a derivation. A coverage number without a derivation is a FAIL.

**P1.2b — I WILL LOOK FOR A WRITER THE GUARD MISSES.** Importer-side enumeration has already missed a writer
twice in this project. The starting list given to the Implementer was golda / coffeetrail / rebar /
apply-chains-research. Derived from the data instead, that list accounts for **one** literal level-asserting
assignment — `import-rebar.mjs:106`. The four largest real writers are **none of them on it**:

| script | level-asserting assignments |
|---|---|
| `scripts/fix-humus-eli-and-dominos.mjs` | **62** |
| `scripts/import-maafe-neeman.mjs` | **38** |
| `scripts/import-kiriat-meir-chains.mjs` | **35** |
| `scripts/import-bfresh.mjs` | **23** |

`fix-humus-eli-and-dominos.mjs` is the clearest specimen of site B in the repository — a hand-written
per-branch table with rows reading `kosherType: 'mehadrin', certifiedBy: 'הרב לנדא'`. The source text names
a body; the row records a level and drops the body. Whatever B1.2 ships must have something to say about
that file.

Also: **`scripts/import-coffeetrail.mjs` does not exist.** The coffee-cart writer is
`importers/coffee-carts/scrape-coffeetrail.mjs`. A guard written against the wrong filename covers nothing
and looks like it covers something.

**P1.2c — PRE-REGISTERED ARCHITECTURAL PREDICTION.** 29 literal writers plus 42 dynamic ones is ~71 files.
**If B1.2 ships as edits to a named list of importers, I will fail it on completeness by construction** — not
because I found a specific miss, but because a hand-maintained list over 71 files is the same mechanism that
has already failed twice. The only forms that can pass are (i) the B1.4 choke point, so there is one place to
guard, and/or (ii) a dataset-level invariant that catches the result regardless of which script produced it.
Recording this now so it cannot be argued as hindsight.

**P1.2d — THE GUARD MUST BE TESTABLE, AND I WILL FIRE IT.** A test that performs a violating write and
observes the failure, in the family of the Batch A mirror test. I will perturb it myself and require it to go
red; if it stays green the test is decorative.

**P1.2e — BODY RECORDED AS BODY.** Given source text naming a body and stating no level, the guarded path must
record the **body** (or nothing) and must never produce a level. I will run the four top writers' own input
shapes through it.

---

## 3. B1.3 — `kosherLevel?: 'regular' | 'mehadrin' | null`

Every read site in `src/`, enumerated now:

| Site | Form | Null-safe today? |
|---|---|---|
| `PlaceCard.tsx:40` | `=== 'mehadrin'` | yes |
| `filterPlaces.ts:37` | `!== 'mehadrin'` | yes — null is correctly excluded from `mehadrinOnly` |
| `kosher.ts:156` | `=== 'mehadrin'` | yes |
| `kosher.ts:159` | `=== 'mehadrin'` | yes |
| `kosher.ts:161` | `=== 'mehadrin'` | yes |
| **`kosher.ts:138`** | **`if (kosherAuthorityGroup \|\| kosherLevel)`** | **truthiness — the one site at risk** |

**P1.3a — THE `kosher.ts:138` COLLAPSE. Non-waivable.** A record with `kosherLevel: null`, no
`kosherAuthorityGroup` and no `certifierId` falls straight through the structured branch into the legacy
`kosherTypeLabel[kosherType]` fallback — i.e. **the deliberately-undetermined level silently resurrects the
legacy claim**, which is precisely the collapse the type change exists to prevent. I will construct that
record and check.

Two outcomes pass: null and `undefined` take **literally the same code path** (consistent with the existing
comment at `kosher.ts:125` that null and absent must be indistinguishable — a null-specific branch is one
careless edit away from blanking every unresolved record), **or** the legacy fallthrough is closed for
explicit null with the reasoning recorded. What fails is not noticing.

**P1.3b — NO NEW TRUTHINESS.** I will read the diff for any newly introduced `!place.kosherLevel`,
`kosherLevel ?`, `kosherLevel ||` or `!!kosherLevel`. Each treats *deliberately undetermined* and *never set*
identically. Any new one is a FAIL.

**P1.3c — `sanitizePlace` STILL PRESERVES NULL.** It does today only because it spreads `...raw`. If B1.3
touches it and switches to explicit field copying, `kosherLevel: null` becomes `undefined` at load and the
entire distinction dies silently between the file and the app. I will test with a null-bearing fixture
through `sanitizePlace`, not by reading the code.

**P1.3d — TYPES AGREE.** `PlaceCard.tsx:36` already declares `string | null`. After B1.3 the two must not
diverge, and `tsc --strict` must be clean.

**P1.3e — FILTER BEHAVIOUR UNCHANGED FOR EXISTING DATA.** No record currently holds `kosherLevel: null`, so
B1.3 must move zero records in or out of any filter. I will re-run the `mehadrinOnly` count and require
**1,100**, unchanged.

---

## 4. B1.4 — `recordKashrutWrite()` + completeness test

**P1.4a — THE COMPLETENESS TEST MUST FIRE. Non-waivable.** I will add a bypassing write — a direct
`place.kosherLevel = …` in a script the test scans — and require the suite to go red naming that file.
Proven by perturbation, not by reading assertions.

**P1.4b — NO VACUOUS PASS.** The test must assert a floor on how many files it actually scanned. A scan that
silently matches nothing passes forever; the Batch A mirror test carries exactly this guard
(`expect(registry.reviewQueue.length).toBeGreaterThan(50)`) and this one needs its own.

**P1.4c — BACKFILL MUST BE STRUCTURALLY DISTINCT FROM CAPTURE, IN THE VALUE.** This is the one I will argue
hardest. If the helper takes a `basis` string that any caller may set to anything, the distinction is a
convention, and a convention survives exactly as long as the person who remembers it. Required: an inferred
backfill and a capture-at-write-time are **different shapes**, such that reading a record's provenance and
mistaking one for the other is not possible without ignoring a field that is always present. If the only
thing separating them is what a caller passed, that is how `kosherLevel: 'mehadrin'` came to look like a fact,
one layer up.

**P1.4d — BASIS, NOT PIPELINE NAME.** An entry recording only *which script wrote it* is attribution theatre.
For the 358, an entry reading `{basis: 'registry-alias', alias: 'בד״ץ בית יוסף', aliasLevel: null}` next to a
level of `mehadrin` would have made the defect **self-reporting**. Pipeline-name-only provenance records the
fabrication without flagging it.

---

## 5. Non-waivable, batch-wide

**N1 — ZERO DATASET BYTES.** `src/data/generated/` untouched; md5 still `5570b49e`. B1 is code-only, and no
`--apply` is authorized. Any dataset change is an immediate BLOCK regardless of the rest.

**N2 — COLD VERIFY FROM A DETACHED WORKTREE.** `jest --clearCache` first. Warm-cache green is not evidence;
that is settled repo history now, not a theory.

**N3 — NO ABSOLUTE PATHS.** Nothing added may join the 23 scripts that only run on one machine.

**N4 — NOTHING ELSE IN THE COMMIT.** Explicit pathspec, index verified empty before and after. Three sessions
share this checkout.

**N5 — I WILL FIRE EVERY GUARD.** B1 ships four mechanisms whose entire value is that they fail when they
should. For each of B1.1, B1.2 and B1.4 I will perform the violation and require red. Reading the assertions
is not verification; it is reading.
