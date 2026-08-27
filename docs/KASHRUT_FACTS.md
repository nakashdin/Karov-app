# KASHRUT_FACTS.md — established project knowledge

**Purpose.** Facts in this file have been independently verified by at least two agents against the real
repository. Treat them as project knowledge. **Do not re-derive them** unless you have new evidence that
gives a reason to reopen a specific entry — in which case, correct the entry and note who corrected it.

**Rule for adding here:** only verified facts, with the verification method stated. Not hypotheses, not
"the report says". If you cannot say how it was checked, it does not belong in this file.

Baseline for every count below: `src/data/generated/places.osm.json`, 7,471 records, 2,213 food records.

---

## 1. The data model

| Field | Type | Status | Notes |
|---|---|---|---|
| `kosherType` | legacy enum (~18 values) | **legacy, still rendered** | `place.ts` comment says do not remove |
| `kosherLevel` | `'regular' \| 'mehadrin'` | legacy | never stored as explicit null |
| `kosherAuthority` | `string \| null` | **legacy, frozen** | underscore_case; explicit null on exactly 6 records |
| `kosherAuthorityGroup` | `'rabbinate' \| 'badatz' \| 'independent' \| 'unknown'` | legacy | |
| `certifiedBy` | raw source text | **evidence — never modify** | the only field that is not our interpretation |
| `certifierId` | `string \| null` | **canonical, 0 live occurrences** | `place.ts:97` — "null when the evidence names a level but no authority" |
| `kosherCertUrl` | string | evidence | 180 records |
| `certificateValidUntil` | date | evidence | 164 records |
| `kosherDetails` | object | Tzohar-only structured data | |
| `certificateIssuedAt` | string | declared, 0 live occurrences | |

`authorityId` is **not** a Place field. It only exists inside `kashrut-registry.json` → `authorities[]`.

### Two authority-id namespaces, formally unconnected
- **Legacy underscore_case** (`badatz_beit_yosef`) — written to `kosherAuthority`, consumed in
  `src/utils/kosher.ts` + `src/types/place.ts`. **10 values.**
- **Registry hyphen-case** (`badatz-beit-yosef`) — `authorities[].id`, in
  `src/data/kashrut/authorities.ts` + `scripts/reports/kashrut-registry.json`. **81 values.**
- **No code translates between them.** Verified by exhaustive grep. Only `tzohar` collides (it has no
  separator). `certifierId` is the only field wired to the registry ids.

**Decision (Architect):** `certifierId` is the growth path. Legacy fields are frozen. Do not add values to
the legacy vocabulary — recovering 529 identities into it would require hand-authoring ~32 new legacy ids.

---

## 2. The root defect

`scripts/migrate-kosher-fields.mjs` wrote every live `kosherAuthority` / `kosherLevel` /
`kosherAuthorityGroup` value. It reads **only** `kosherType`, applies a hardcoded `MAP`, unconditionally,
overwriting existing values, with zero awareness of the registry or reviewQueue. It is **re-runnable**.

**`kosherLevel` is computed from the authority name, never independently sourced.** Proven by zero-variance
analysis: `badatz_beit_yosef` n=218 → only `mehadrin`; `tzohar` n=195 → only `regular`.

---

## 3. Evidence-tier census (2,213 food records; 2,126 carry a structured claim)

| Tier | Basis | Count | % | names a body | no body |
|---|---|---|---|---|---|
| 1 | certificate document | 180 | 8.5% | 180 | 0 |
| 2 | free-text `certifiedBy` | 1,313 | 61.8% | 222 | 1,091 |
| 3 | `sourceUrl` only | 44 | 2.1% | 13 | 31 |
| 4 | legacy `kosherType` → MAP | 589 | 27.7% | 98 | 491 |
| 5 | nothing at all | 0 | | | |

**The sharpest cell:** 98 records name a specific certifying body on tier 4 — no certificate, no text, no
kashrut-bearing source. Just the enum.

Reconciliation note: an earlier dataset-wide figure of 111 = these 98 + the 13 named-body tier-3 records.
Both numbers are correct at their own scope.

---

## 4. The four operations (Phase 3 taxonomy)

Phase 3 is **not** a subtraction operation.

| Operation | Count | Meaning |
|---|---|---|
| **RECOVER** | **529** | records that gain a named `certifierId` and have no `kosherAuthority` today |
| **REMOVE** | **323** | `kosherType` makes an elevated/specific claim with zero evidence of any kind |
| **PRESERVE** | **902** | properly evidenced, non-contradicting — must survive intact |
| **REPRESENT** | **537** | source asserts kashrut but names no body — `certifierId: null` |

**RECOVER > REMOVE.** The migration adds more verified identity than it takes away, across all 81
registered authorities.

### How 529 was settled (three earlier numbers were proxies)
Defined by the operation's effect, not by a `kosherType` predicate: apply gives 910 records a named
`certifierId`; 529 of those have no `kosherAuthority` today. Matches the dry-run's `certifierIdNonNull: 910`
exactly. Superseded numbers: 208 (regex over source strings — floor), 260 (raw-string grouping — error),
298 (mehadrin-only base), 503 (any-`kosherType` base; misses 26 records with no `kosherType` at all).

**Method lesson:** resolve `certifiedBy` through the registry alias map. Raw-string grouping misses
gershayim and spelling variants — `"בית יוסף"`, `"בד״ץ בית יוסף"`, `"כשר בד״ץ בית יוסף"` all resolve to
`badatz-beit-yosef`. This has caused three separate undercounts.

### Related counts
- **589** — unsupported *total* (adds 266 generic regular-tier claims: `rabanut` 170, `kosher` 76,
  `rabanut_mekomi` 20). 323 is the unsupported-**and-consequential** subset.
- **245** — assert `mehadrin` with no `certifiedBy`, no `kosherAuthority`, no certUrl, no validUntil.
- **103** — reviewQueue-deferred records with a structured value populated anyway
  (`kosherAuthority` 20 / `kosherLevel` 103 / `kosherAuthorityGroup` 54). The per-record figure of 20 counted
  only `kosherAuthority`.
- **113** — live records whose `certifiedBy` is reviewQueue-deferred.

---

## 5. Contradictions — the question the census does not ask

Every census category partitions on whether a claim **has** evidence. None asks whether the claim **agrees
with** its evidence. These are different questions.

**10 records** carry `kosherLevel: 'mehadrin'` while their own `certifiedBy` names a plain rabbanut with no
מהדרין word (8 resolve to a registered authority; 2 to `authorityId: null`). Reverse direction: **0**.
All but one are `coffeetrail-*`.

Consequence: the "properly evidenced" set cannot serve as a regression fixture until a contradiction filter
runs over it. Protected baseline corrected **910 → 902**.

---

## 5b. Authority→level inference — refused 108 times, and never once performed

This is the single most important constraint on any future level rule. Verified independently by the
Reviewer and the Architect against `kashrut-registry.json`.

Of the **180** aliases that resolve to a named authority:

| | |
|---|---|
| **decline to assign a level** (`level: null`) | **108** |
| assign `mehadrin` | 71 |
| assign `regular` | 1 |

The 108 include **every major badatz**: `"בד״ץ בית יוסף"` → `badatz-beit-yosef`, level **null**.
`"העדה החרדית"`, `"הרב לנדא"`, `"רב מחפוד"`, `"הרב רובין"` — all `level: null`.

Four proposers and three adversarial challengers looked at these strings and **declined to assign a level,
because a badatz's name does not state one.** The artifact any Batch-B rule would cite as its evidence base
has already answered this question, in the safe direction, 108 times.

### The current dataset is already contaminated by this inference
Of 1,100 records at `kosherLevel: 'mehadrin'` today:

| Basis | Count |
|---|---|
| alias/text **states** mehadrin (licensed) | 351 |
| alias names a **body** but declines a level → **level came from the body** | **358** |
| alias names **no body** but grants mehadrin | 11 |
| reviewQueue-deferred | 67 |
| no `certifiedBy` / no alias at all | 313 |

**369 of 720 resolvable mehadrin claims (51.2%) are not licensed by their source text.** The dominant
mechanism is not the body-less alias — it is **authority→level inference**, at 358 records. Top sources:
`"בד״ץ בית יוסף"` 132, `"בד״צ בית יוסף"` 60, `"בית יוסף"` 27, `"העדה החרדית"` 23, `"הרב לנדא"` 20,
`"כשרות הרב מחפוד"` 18, `"רב מחפוד"` 16 — every one of them an alias the registry gave `level: null`.

> **THE RULE TO REJECT IN BATCH B:** anything of the form *"if the resolved authority is in the badatz
> group, the level is mehadrin."* It will look rigorous, it will cite the registry, and it reproduces the
> exact defect this project exists to fix — at 358 records, inside the release marketed as the fix.
>
> **The safe rule is the narrow one:** `mehadrin` only where `alias.level === 'mehadrin'`. Everything else
> keeps whatever the evidence separately supports, or goes to the uncertainty state.

### The stronger property: 0 derivations in 203 aliases

The 108 refusals are the visible half of a stronger property. Tested in both directions against
`kashrut-registry.json`:

| | |
|---|---|
| aliases at `level: 'mehadrin'` | **80** — **all 80** carry a mehadrin word (מהדרין / למהדרין / גלאט) in their own raw text |
| aliases carrying a mehadrin word but denied the level | **0** |
| aliases at `level: 'regular'` | **3** dataset-wide (`"כשר"`, `"כשר רבנות"`, `"רבנות תל אביב (רגילה)"`); **1** of the 180 authority-naming ones. All three carry a level word |

The level field is a **pure function of the raw text**. Not once in 203 aliases was a level read off an
authority.

**The phrasing is load-bearing.** *"The registry declined 108 times"* reads as caution — a proposer being
careful, a precedent a later proposer may reasonably revisit. ***"0 derivations out of 203"* is a design
property.** A Batch-B authority→level rule would not be extending registry precedent; it would be **the
first derivation of its kind in this project, introduced by the release that exists to delete them.**

**The inference is unsafe downward too.** `tzohar` has 2 aliases, both `level: null` — so
`migrate-kosher-fields.mjs`'s `tzohar → regular` rests on exactly as little as `badatz → mehadrin` would.
This pre-empts *"we only ever downgrade, so it's conservative"*: conservatism is not a direction, it is
whether the text said it.

**The trap — 11 authorities that look single-tier and are not.** `rabbinate-tiberias`, `akko`,
`beit-shemesh`, `tzfat`, `shomron`, `migdal-haemek`, `kiryat-ata`, `kiryat-malachi`, `hevel-modiin`,
`modiin-illit` and `ou` appear **only** with mehadrin aliases, with no `null` counterpart. Someone will
present these as *"certifies at exactly one level by its own standard, so the derivation is documented
fact."* They are the **weakest** cases, not the strongest: ten of the eleven are local rabbinates — the most
provably two-tier body type in the country — and **36 authorities in this same table are attested at both
tiers** (`רבנות X` at null beside `רבנות מהדרין X` at mehadrin), with `rabbinate-tel-aviv` carrying an
explicit `regular`. Their single-tier appearance is a **small-sample artifact of which branches happen to be
in the dataset**, not a property of the body. Generalising from it is the same inference under a new name.

### The 358 have TWO inference sites — and only one is fixed by fixing the MAP

Reproduced independently by the Reviewer and the Architect. Full audit in
[`audit-358-level-removal.md`](audit-358-level-removal.md).

| Site | n | `kosherType` | What happened |
|---|---|---|---|
| **A — the migration MAP** | **154** | `badatz_beit_yosef` 126, `badatz_edah` 25, `rav_machpud` 3 | `kosherType` faithfully records the **body**; the MAP added the level |
| **B — upstream, before the MAP** | **204** | `mehadrin` 191, `rabanut_mehadrin` 13 | `kosherType` **already asserted a level**; the MAP only copied it |

The split correlates perfectly with `kosherAuthority`: **154/154** in A carry one, **0/204** in B do.

Site B is the worse defect. Its source text is `בד״ץ בית יוסף` 73×, `בית יוסף` 27×, `הרב לנדא` 20×,
`רב מחפוד` 16× — text naming a body and no level. Whoever wrote `kosherType: 'mehadrin'` there recorded **a
level the text did not state** while **discarding the body it did state**, in one step. The body survives
only because raw `certifiedBy` was preserved — the same thing that separates the 6 recoverable humus-eli
records from the 52 permanently lost ones, whose `certifiedBy` had been overwritten with the bare word
`מהדרין`.

> **This is the scoping fact for Batch B.** "The MAP is the root defect" is true for 154 of 358. A guard at
> the translation point covers **43%** of this defect *while looking like it covers all of it* — the number
> would go down, and 204 fabrications would remain. The guard has to sit where `kosherType` is **first
> assigned**, in the importers, not where `kosherType` is read.

### The 358 have no independent evidence — verified, do not re-litigate

*"Keep the level where an independent source supports it"* is an **empty category**. Measured across all 358:

| | |
|---|---|
| `kosherCertUrl` | **0 / 358** |
| `certificateValidUntil` | **0 / 358** |
| `kosherDetails` | **0 / 358** |
| `sourceUrl` | 25 / 358 — **all 25 circular** |

The 25 resolve to four domains: `humus-eli-yahoo.com/restaurants/` (11), `coffeetrail.co.il` (10),
`cafecafe.co.il` (3), `gushetzion-winery.co.il` (1). Every one is the page the record was **scraped from**.
This is the Golda precedent — `import-golda.mjs` scraped goldaglida.co.il, so "re-verifying" Golda against
that site is circular. Citing the source you copied is not corroboration.

**Consequence:** *delete the level* and *keep it where evidence supports it* produce **byte-identical data**.
The second merely costs a research pass to arrive at the first. Recorded so no future pass spends it.

**Reconciled — settled, and settled against the Reviewer.** The Reviewer counted **187** records as carrying
an unlicensed mehadrin level; the Architect counted **11**. The Architect is right, and the arithmetic closes
exactly: the Reviewer's 164 + 187 = the Architect's **351 licensed**, and the Reviewer's 11 = the Architect's
11. **51.2% is the established figure. 75.7% is withdrawn.** Third independent derivation reproduces
351 / 358 / 11 / 67 / 313 to the record.

Why the Reviewer's cut was wrong — recorded because the mistake teaches better than the rule does: for
`certifiedBy: "מהדרין"` the source text **does** state the level. What is absent is the **body**, not the
level. Filing those records under "level not licensed" conflated the two questions this architecture exists
to keep apart. `kosherAuthority`, `kosherLevel` and certificate identity are **separate facts** (§12) — a
missing body is not a missing level, and a missing level is not a missing body.

**The correction sharpens the conclusion rather than softening it: there are two mechanisms, not one.**

| Population | Mechanism | Remedy |
|---|---|---|
| **187** level-licensed, body-unknown | text states מהדרין, names no body | **none needed** — already fully covered by the `certifierId: null` uncertainty state |
| **358** authority→level inference | text names a body, states no level | **the only mechanism Batch B has to solve** |

"51% of mehadrin claims are unlicensed" makes the problem sound larger and vaguer than it is. It is one
named mechanism at 358 records, and the other half already has its rule.

---

### Batch B remediation — approved shape

**Approved by the Architect.** `kosherLevel?: 'regular' | 'mehadrin'` becomes
`kosherLevel?: 'regular' | 'mehadrin' | null`, and the 358 are set to **explicit `null`**, not deleted.

The project already made this decision one field away — `certifierId?: string | null`, *"null when the
evidence names a level but no authority"* (`place.ts:97`). The 358 are its exact mirror: **the evidence names
an authority and no level.** Same semantics, same shape, opposite axis.

Absence would collapse three states into one — *never migrated* / *deliberately undetermined* / *genuinely
unknown*. That collapse is not hypothetical: §5c is already 249 records deep in it, and adding 358 more
would make a Batch-B decision indistinguishable from a migration gap forever.

**User-visible effect of the 358 (measured, not predicted).** All 358 receive a **named** `certifierId`
(verified 358/358 against the dry-run plan), and `getKosherLabel` returns `authority.nameHe` from the
`certifierId` branch **before it ever reads `kosherLevel`** (`kosher.ts:130-133`).

| Surface | Effect |
|---|---|
| label — 154 badatz-group with `kosherAuthority` | **unchanged**; same string, now via `certifierId` |
| label — 191 unknown-group | bare `"מהדרין"` → the body name, e.g. `בד״ץ בית יוסף`. **More informative** |
| label — 13 rabbinate-group | `"רבנות מהדרין"` → the specific rabbinate. Loses the tier word, gains the city |
| detail screen (raw `certifiedBy`) | **0** |
| chip colour (`PlaceCard.tsx:40`) | 154 keep `kosherPremium` (`group === 'badatz'` is tested first); **204 downgrade** — 191 → `primary`, 13 → `info` |
| `mehadrinOnly` (`filterPlaces.ts:37`) | **1,100 → 742** (−358, −32.5%) |
| every group/authority filter | **0 records leave** — `kosherAuthorityGroup` is untouched |

A בד״ץ בית יוסף record does **not** lose its label. The user still sees `בד״ץ בית יוסף`. What they stop
seeing is Karov's assertion that it is *mehadrin* — a claim the certificate text never made.

**The owner-facing framing:** the mehadrin filter gets smaller because it stops returning places whose
mehadrin status we invented. The full ladder, so step one is not approved in ignorance of steps two to four:

| | scope | `mehadrinOnly` result |
|---|---|---|
| A | the 358 only | 1,100 → **742** |
| B | + the 11 body-less | → **731** |
| C | + the 313 with no alias at all | → **418** |
| D | text-licensed only | → **351** |

---

## 5c. A separate pre-existing defect — a type with no level

**Not Batch B's, and it must not be absorbed into Batch B silently.**

| | |
|---|---|
| food records carrying a `kosherType` and **no** `kosherLevel` | **249** |
| of those, typed `kosherType: 'mehadrin'` | **11** |
| of those 11, inside the 323 REMOVE set | 4 |

Different cause from everything in §5b: the `kosherType → kosherLevel` migration simply never reached them.

They matter because of **display path 3** (§6). A record typed `mehadrin` with no `kosherLevel` still
renders **"מהדרין"** on the detail screen through `kosherTypeLabel`, while being **invisible to every
level-based query** — the `mehadrinOnly` filter, every count in §5b, and any remediation rule keyed on
`kosherLevel`. They are asserted to the user and absent from the audit at the same time, which is the worst
combination available: the claim reaches a person deciding carefully, and no measurement of the problem
includes it.

Batch B is scoped to exclude them. They need their own pass.

---

## 6. Display paths — three, not one

| Path | Where | Changed by the migration |
|---|---|---|
| 1. `getKosherLabel` | `PlaceCard.tsx:110`, `PlaceBottomCard.tsx:20` | **545** records (not 720) |
| 2. raw `certifiedBy` | `PlaceCard.tsx:121`, `PlaceDetailScreen.tsx:59/317/432` | **0** |
| 3. `kosherTypeLabel` **direct** | `PlaceDetailScreen.tsx:30/58/432` | **0** |

**Why 545 and not 720 (settled).** The Reviewer pre-registered 720 label changes and measured 545
against the shipped code. The 175-record gap is not a shortfall — it is the Reviewer's own gershayim finding
being fixed. The prediction was simulated against the ASCII-quote `nameHe` values (`בד"ץ`); change D
corrected those to U+05F4 gershayim (`בד״ץ`), which is also what the legacy `byAuthority` map already
emitted. So ~173 of the predicted "changes" were typography-only regressions that the batch eliminated
rather than performed. **545 is correct and 720 was inflated by the exact defect the batch removes.**

`apply` writes only `certifierId` / `kosherLevel` / `kosherAuthorityGroup` — never `certifiedBy` or
`kosherType`. So paths 2 and 3 are byte-identical before and after.

**Consequence:** 589 zero-evidence records keep rendering a kashrut claim on the **detail screen** — the
surface a person opens when deciding carefully. Includes all 55 rebar, all 13 arcaffe, all 81 coffeetrail.

`getKosherLabel` ends with a **legacy fallback** to `kosherTypeLabel[kosherType]`. Clearing the derived
fields alone still displays the false claim. This is why Phase 3 must clear `kosherType` for fabricated
records — no other lever reaches the detail screen.

**Enforcement decision:** unexport `kosherTypeLabel`. Path 3 exists because nobody *decided* to render the
legacy enum — it was merely importable.

---

## 7. Certificate expiry — an operational deadline with no owner

164 records carry `certificateValidUntil`, across **only four distinct dates**:

| Date | Count |
|---|---|
| 2025-09-21 | 1 (expired) |
| 2025-09-22 | 1 (expired) |
| 2026-04-01 | 10 (expired) |
| **2026-09-11** | **152** |

On 2026-09-12 the `independent` filter goes **183 → 31** and 152 cards flip to
`⚠️ תעודת כשרות פגה`. The mechanism is **correct** (commit `876a562`; already firing on the 12 expired
today). This is an operational gap: Tzohar renews centrally before Rosh Hashana and nobody re-fetches.

### 7a. The tool is ready — three corrections to how this was previously written down

1. **`--refresh` is not required, and saying it is was wrong.** `isCacheStale()`
   (`importers/tzohar/extract-cert-expiry.mjs:66-73`) re-fetches whenever the known expiry is within
   `REFRESH_WINDOW_DAYS` (default **60**), whenever fetch metadata is missing, and whenever no date was ever
   resolved. `daysUntil('2026-09-11')` is 16 as of 2026-08-26, so **that cohort re-fetches on an ordinary run
   with no flag.** `--refresh` only forces the ones still outside the window.
   *(`docs/DATA_ARCHITECTURE.md` §3.2 additionally described this tool as caching forever and never
   invalidating — a warning written before the fix and never retired. Corrected; see §17's inverse face.)*

2. **It is a recurrence, not a deadline — the window is rolling and per-certificate, so no single run fixes
   everything.**

   | Cohort | Days out (2026-08-26) | Behaviour |
   |---|---|---|
   | 2026-09-11 ×152 | 16 | inside the window — re-fetches now |
   | 2026-10-11 ×1 | 46 | inside — re-fetches now |
   | 2026-12-31 ×6 | 127 | **outside — stays cached** until it comes within 60 |
   | 2027-01-31 ×8 | 158 | **outside — stays cached** |

   "Run it once after 2026-09-12" handles the Rosh Hashana cohort **and nothing else.** Each cohort
   self-schedules, so the owner of this owns a recurring check, not a single task.

3. **A run in which every fetch failed is indistinguishable from no run at all.** Failure handling is
   deliberately conservative — a failed fetch or an unparseable PDF leaves `certificateValidUntil` exactly as
   it was, and never extends, clears, or guesses (`:207-208`). That is the right behaviour and it means
   **the exit code cannot be trusted as evidence the work happened.** Whoever owns this must read the
   `re-fetched / renewed / unchanged / failed` counters, not the exit status. §17 in operational clothing.

**Structural finding:** all 164 are the only records with a real certificate document. `'unknown'` never
becomes `'expired'`, so the ~2,000 records with no certificate are **permanently immune** to being shown as
lapsed. Carrying real evidence is currently the only way a business can be penalised — an incentive
gradient pointing the wrong way. Any evidence model must answer this.

---

## 8. Kashrut-field writers (data-derived, not importer-derived)

`migrate-kosher-fields.mjs` · `apply-kashrut-authorities.mjs` (never run with `--apply`) ·
`fix-fabricated-cert-dates.mjs` (deletes `certificateValidUntil`; the **only** writer that has actually run
against production kashrut data, in `876a562`) · `apply-chains-research.mjs` (hardcodes `kosherType` +
`certifiedBy`) · plus the importer mapping helpers below.

**Two writers were missed by importer-side enumeration** and found by working backwards from the data:
`fix-fabricated-cert-dates.mjs` (an assignment-keyed grep cannot see `delete`) and
`apply-chains-research.mjs`.

> **Standing method:** enumerate writers from the **data**, and display paths from the **rendered output**,
> never forward from the artifact you expect to find. This has failed three times: two missed writers, and
> the `kosherTypeLabel` display path that is invisible to a `getKosherLabel` caller search. Any completeness
> claim must state that it was data-derived.

### Confirmed buggy mapping helpers
Real in code, but **live blast radius is much smaller than the code suggests** — several branches never
fired: `import-humuseliyahu.mjs` (dead — output appears nowhere in the dataset), `import-aroma-v2.mjs`
(dead — id range has zero hits), `scrape-coffeetrail.mjs` (2 live), `import-rebar.mjs` (blanket hardcode,
55), `import-golda.mjs` (38). These are **re-run hazards**, not current-state damage.

**Class distinction that matters:** *fabricated* (`kosherType` asserts what no source supports — clearing is
correct) vs *identity-discarding* (source named a body, pipeline stored only a level — the repair is
RECOVER, and clearing would destroy evidence). Clearing uniformly would treat the second as the first.

### `migrate-kosher-fields.mjs`'s reviewQueue guard — blind-spot size (verified, corrected)
The Batch A guard only checks `certifiedBy`, so it cannot see a record that has no `certifiedBy` at all.
Two numbers, not one, and they answer different questions — verified directly against `places.osm.json`:
- **633** — records with no `certifiedBy` but a `kosherType` the MAP would enrich anyway. The guard's true
  blind spot: every one of these can still be (re-)enriched by a future run, invisibly.
- **111** — of those 633, the subset where the MAP invents a specific **named** authority (e.g.
  `badatz_beit_yosef`) from the enum alone, with zero identity evidence behind it. The number that should
  stop a reader from concluding the MAP is safe.

**614 (used in an earlier draft of this script's own comment) is wrong for this question** — that figure is
the Phase 1 audit's *category-4* count, which requires a structured value to already be present on the
record (a different predicate: "already enriched, no certifiedBy" vs. "not yet enriched but enrichable, no
certifiedBy"). Do not requote 614 as the guard's blind spot.

---

## 9. The registry

81 authorities, all backed by ≥1 evidenced live record — **zero orphans**. `aliases[]` is the exact-match
raw→`{authorityId, level}` table. `reviewQueue[]` (58 entries) holds strings a human adversarial review
explicitly deferred, each with prose reasoning.

**The reviewQueue is already the compound guard.** 25 compound-shaped strings exist; 23 are deferred.
Known gap: `9100000` / `"כשרות רבנות ובד״ץ"` (names both a rabbanut and a badatz) should become a
reviewQueue entry. `"בד״ץ העדה החרדית / מהדרין"` is body+level, not body+body — correctly benign. Any
future compound detection must distinguish these; a naive slash-split defers the benign one.

### `raw` vs `nameHe` — the gershayim trap, three times now

`authorities[].nameHe` is **display text and uniformly normalized**: 5 of 81 contain a gershayim `״`
(U+05F4), **0** contain an ASCII `"`. `aliases[].raw` is **source text and normalized to nothing**: 27 of
203 contain an ASCII `"` and **1 contains a gershayim** — because that is what its source said. No alias
`raw` contains both.

So the rule is not "raw is ASCII, nameHe is gershayim." It is:

> **`nameHe` is ours and is normalized. `raw` is the source's and must be matched byte-for-byte, with no
> assumption about which quote character it uses.** Substituting one for the other is silent — both render
> nearly identically and neither throws.

It has now caused three different failures, none of which announced itself:

| | What was substituted | How it surfaced |
|---|---|---|
| 1 | A migration simulation matched against `nameHe` carrying ASCII quotes | Predicted **720** label changes; the real number was **545**. ~173 of the "changes" were typography-only. §6 |
| 2 | `nameHe` itself carried ASCII quotes | Display regression, fixed in Batch A change D |
| 3 | A B1 test fixture used a gershayim alias string that does not exist verbatim in `aliases[].raw` | The fixture matched **nothing** — the test passed **vacuously**, proving nothing about the guard it was written to check |

The third is the worst kind, because a test that passes for the wrong reason is indistinguishable from one
that passes for the right one. The fix that closed it is the one to copy: every fixture now asserts its own
assumption against the live registry (`assert.ok(realEntry, 'fixture assumption broken: … is expected to be
a real registry alias')`), so the test fails loudly if the registry data moves underneath it rather than
quietly testing an empty set.

**Applies to `certifiedBy` too** — it is source text under the same rule (§13), which is why the B1.1
append-only check deliberately refuses a gershayim "correction" to it.

### reviewQueue is NOT a blanket "defer everything" signal
Of the 58 entries: **27 carry a `suggestedAuthorityId`** (12 of those name an authority that **is
registered**), and **11 carry a `suggestedLevel`**. Some entries defer only the **level** while affirming
the **authority**. The clearest case is `"כשר בד״ץ בית יוסף"` (8 live records) —
`suggestedAuthorityId: badatz-beit-yosef` (registered), `suggestedLevel: null`, and its `why` is a
"CHALLENGER DOWNGRADE" about the *level* being a coin-flip. The authority is not in dispute; the level is.

Contrast `"בד״ץ מהדרין ירושלים"` — `suggestedAuthorityId: null`, verdict "invents an authority out of a
level word". There the **authority** is the disputed thing.

**Consequence:** a guard that blocks all three fields on reviewQueue membership is *over-conservative*, not
wrong — it never invents a claim, but it discards human resolutions on the level-only entries. Erring
conservative is correct for kashrut, so this is the right default. But do not write code or comments
asserting "reviewQueue membership ⇒ no authority determination" — that misreads the artifact. Per-field
deferral is a known follow-on refinement.

Historical note: an earlier round overclaimed the reverse — treating any non-null `suggestedAuthorityId` as
proof the legacy `kosherAuthority` was affirmed. Both errors are live traps. The honest reading is that
each entry must be read for **what it defers**, and only 12 of 27 suggested ids are registered at all.

**5 of 81 `nameHe` values use an ASCII `"` where Hebrew requires gershayim `״` (U+05F4); 0 of 81 use the
correct mark.** The app renders the correct mark today (`kosher.ts:25-28`). Affected:
`badatz-beit-yosef`, `badatz-edah-hachareidis`, `badatz-agudat-yisrael`,
`badatz-chatam-sofer-petah-tikva`, `rav-rubin`. Must be corrected **before** any apply.

Alias `raw` strings are **source text** and must match byte-for-byte. `nameHe` is **display text** and is
ours to render correctly. Never conflate the two.

---

## 10. The three display states (owner-approved)

| State | Count | Stores | Filters |
|---|---|---|---|
| **1. Certified, body named** | 910 → ~1,439 | `certifierId: '<id>'` | its group + specific-authority |
| **2. Kashrut asserted, body unnamed** | 537 | `certifierId: null` | group only, when known |
| **3. No kashrut evidence** | 323 | explicit marker, **not an absence** | **none** |

State 3 must be an **explicit stored value**. The bug being fixed is that absence is ambiguous, so the fix
cannot itself be an absence — and only an explicit form survives a future importer writing into the gap.

**Hard constraint:** state 3 must never imply the business is not kosher. No `לא כשר`, no
`כשרות לא תקפה`. We report a gap in **our** evidence. Approved copy:
`אין בידינו מידע על כשרות` / *"ייתכן שהמקום כשר — פשוט אין לנו תעודה או מקור לאמת זאת."*
**Muted styling, never `theme.danger`** — red means *expired*, a fact we positively know; absence of
knowledge is a different severity.

The `unknown` filter today returns 847 records and conflates states 2 and 3. Redefining it as **state 2
only** is the fix.

### Raw source text must carry verification state
Attribution alone does not make raw `certifiedBy` safe. For some strings the user is not misled about *who
said it* but about *what it means*. Registry reviewQueue #2 on `"בד״ץ מהדרין ירושלים"` (3 Maafe Neeman
branches): *"Invents an authority out of a level word... would plant a phantom independent haredi badatz
that a user who does not accept Rabbanut-mehadrin would read as a stricter hechsher than it is."*

The 113 deferred records are **not homogeneous**:
- **genuinely dubious** — may name a body that does not exist (`בד״ץ מהדרין ירושלים`, `בד״ץ ביתר / מהדרין`,
  `בד״ץ בית שמש`, `בד״צ חולון`, `בד״ץ ירושלים`)
- **accurate but unmappable** — names *two real* certifiers our single-value field cannot hold
  (`בד״ץ בית יוסף + OK`, `בד״ץ העדה החרדית + רבנות מטה יהודה`, …)

A marker reading `טרם אומת` is right for the first and quietly defamatory toward the second. Use wording
that describes **our** state: `לא אומת מול רשימת גופי הכשרות שלנו`.

---

## 11. Migration safety (simulated, not executed)

- **Idempotent** — apply run against its own output: 0 of 7,471 records differ.
- **0 label losses**, **0 records leave any certification filter.** Filter movement is one-way into
  specificity: rabbinate 569→815, badatz 266→465, independent 183→186, unknown 847→553.
- **453 field mutations**, all gap-filling, none overwriting an existing specific value
  (`kosherLevel` 5 — 1 text-stated mehadrin + 4 wineries stating כשר; `kosherAuthorityGroup` 448).
- **Ordering constraint:** the label fix **must** land before apply. Apply first → 910 records carry a
  `certifierId` nothing reads. A *naive* label fix → all 537 `certifierId: null` records blank at once.
  Both are avoided by one rule: **null and absent take literally the same code path.**

---

## 12. Governing rules

> A structured kashrut claim must not be created unless there is evidence supporting **that specific
> claim**. `kosherAuthority`, `kosherLevel`, certificate identity, and provenance are **separate facts**.
> One must not automatically imply another without an explicitly documented and justified rule.

> Accuracy over completeness. If we know a place is kosher but cannot establish the authority or the level,
> the model must **represent that uncertainty** rather than fill the gap by inference.

**AGENTS.md admission vs retention.** *"מסעדה בלי כשרות לא נכנסת"* governs **admission**; *"אפס מחיקות"*
governs **retention**. They only appear to conflict if you assume a record must be either fully present or
fully absent. The admission rule is not a removal mandate — it says nothing about a record already admitted
that later proves unsupported. The resolution is a record that **stays in the dataset and is not presented
as certified**.

---

## 13. Batch B1 — the write choke point, and the governable population

`scripts/shared/kashrut-write.mjs` (`recordKashrutWrite`) is the one place every kashrut-field write is
meant to route through. Built because a hand-maintained list of "the scripts that matter" had already
been wrong twice in this project — a 4-name starting list covered roughly a quarter of the real surface,
and one of the four names didn't exist at the claimed path. A choke point is producer-agnostic by
construction: it governs every future write regardless of which of the **82** existing writer scripts a
record's history runs through, and regardless of scripts nobody has enumerated yet. 82 is the number the
completeness test's own scan finds and enforces (`scripts/shared/__tests__/kashrut-write-completeness.test.mjs`),
not an estimate — three earlier estimates (~71 from the Architect, 29+42 from the Reviewer, 62 from a
subagent's own summary, which undercounted its own 75-row table) were each superseded by actually running
the scan and freezing the list against its output. Quote whatever the test currently reports (82 as of this
writing — apply-kashrut-authorities.mjs migrated to the helper below, dropping it from 83), not a number
copied from this paragraph after the list moves again.

**The governable population is 845, not 204 or 358.** 845 = every live record whose `kosherType` asserts a
level (`mehadrin` 769, `rabanut_mehadrin` 69, `rabanut_mehadrin_jerusalem` 7). Of those, **343** currently
have a `certifiedBy` that resolves — via the registry alias map, not raw-string matching — to a named,
registered authority: the level was invented from the body, never stated by the text. This is the *general*
predicate the choke point enforces going forward. 204 ("site B") and 358 (site A + site B combined) are
specific *historical* counts of how the current 358 unlicensed mehadrin records got that way — real, and
separately tracked in §5b — but neither is the population a level-assertion guard should be scoped to. A
guard scoped to 204 would report against roughly a quarter of the actual problem while looking complete.

**`basis` is a tagged union, not a free-text string.** `{kind: 'registry-alias', alias, aliasLevel}`,
`{kind: 'certificate-document', url}`, `{kind: 'human-review', note}`, `{kind: 'enum-inference',
fromKosherType}`, `{kind: 'backfilled-inference', method}` — each kind requires different fields, so a
caller cannot construct a `backfilled-inference` write that is indistinguishable in shape from a
`registry-alias` write. If the two differed only by which string tag a caller happened to pass, that
would be a convention — and a convention is exactly how `kosherLevel: 'mehadrin'` came to look like a fact
in the first place (§5b). A level-asserting write is only accepted when `basis.kind` is
`'registry-alias'` with `aliasLevel: 'mehadrin'`, `'certificate-document'`, or `'human-review'` —
`'enum-inference'` is rejected unconditionally, because it is exactly the site-A/site-B mechanism.

**Shape alone was not enough — the Reviewer's B1 predicate found a real gap, since fixed.** A first version
accepted `{kind:'registry-alias', alias:'...', aliasLevel:'mehadrin'}` on the caller's word: the shape
type-checked, but nothing resolved `alias` against the real registry to check whether it actually recorded
that level. A caller could claim the registry's authority for a level it never granted — for the exact
alias this project already knows the registry gives `level: null` (`"בד\"ץ בית יוסף"`). Mitigated in
practice by `levelAssertedOverNamedBody` catching the resulting record regardless of which basis produced
it (defense in depth doing its job), but the file read as airtight and wasn't. Fixed:
`basisSupportsLevelAssertion` now resolves `alias` against `kashrut-registry.json` and requires the
registry's own recorded level to match `aliasLevel`, failing CLOSED — not falling back to trusting the
caller — on both an unresolvable alias and a failed registry load. A basis that cites a source is now
checked against it. The lesson is the same one this whole batch is about, one layer up: a claim that
records its own justification is not the same as a claim that has been verified.

**Enforcement is runtime-only, not compiler-enforced, and this must not be overstated.**
`tsconfig.json` excludes both `importers` and `scripts` from `include` — `npm run typecheck` never
type-checks any caller of `recordKashrutWrite`, in either directory. The `KashrutBasis` type is
documentation and editor assistance; the actual gate is the runtime validation inside the function
itself, which throws on both invariant violations regardless of whether the caller is typed at all. Do not
describe this mechanism as "the compiler enforces it" — that claim is true of `getKosherLabel` /
`kosherTypeLabel` in `src/utils/kosher.ts` (which IS inside `src/`, and IS type-checked), not of anything
under `scripts/` or `importers/`.

**The certifiedBy append-only rule (B1.1) deliberately does not tolerate normalization**, including a
gershayim/ASCII-quote fix identical in kind to the one already made to `nameHe` in this same registry.
`certifiedBy` is source text, not our interpretation (§1); alias `raw` strings must match byte-for-byte
for the same reason (§9). A future cleanup of `certifiedBy`, if ever wanted, is a separate, deliberate
decision — not something this routine append-only path may perform quietly, because that decision carries
a religious-evidence dimension a routine code path must never resolve on its own.

**The validator-side check (`scripts/validate-data.mjs`) is relative to HEAD, not to true history**, and
this consequence must not be forgotten: it compares the current dataset against `git show HEAD:...`, so an
overwrite that gets COMMITTED becomes the new HEAD and is invisible to every future run — the check can
only ever catch an overwrite happening in the same uncommitted change that introduces it. That is real
protection (it fires at exactly the moment a script would otherwise silently destroy evidence), but "the
validator is green" must never be read as "certifiedBy has never been overwritten." Defense in depth is two
layers on purpose: the helper stops a bad write before it reaches disk; the validator catches anything that
bypassed the helper.

**The exclusion list is frozen.** The **82** existing writer scripts that assign a kashrut field directly are
not retrofitted to call the helper — most already ran once and will not run again. They are enumerated,
categorized, and reasoned in `scripts/shared/__tests__/kashrut-write-completeness.test.mjs`; the list only
shrinks (a script migrated to the helper), never grows (a new bypass is a test failure, not a list edit).

---

## 14. `kosher.ts:138` — a correct rule applied to a structurally different case

Recorded in the Implementer's own words, because the mistake generalises past this one line.

Before Batch B1, `getKosherLabel`'s structured-fields branch was gated by `kosherAuthorityGroup ||
kosherLevel` — a truthiness check. Making `kosherLevel: null` a real, meaningful value (§13) meant
auditing every read site for null-safety. The check applied here was: does `null` take the identical path
to `undefined`? For this line, yes — `null || anything` and `undefined || anything` both evaluate the
right operand. That is exactly the property Batch A required of `certifierId` (§1: null and absent
"MUST fall through to the exact same code path"), and it had been sufficient there. Concluding it was
sufficient here, and stopping, was the error.

It wasn't sufficient because the two fields fall through to different places. `certifierId` falling
through lands on a fallback chain that never mentions `certifierId` again — "identical to undefined" is
the whole story, nothing downstream cares which one it was. `kosherLevel` falling through at this line
lands on `place.kosherType ? kosherTypeLabel[kosherType] : null` — and `kosherType` is the **legacy field
that still asserts the very level the null was recording as withheld** (§1: "legacy, still rendered").
A record with `kosherLevel: null`, no `kosherAuthorityGroup`, and a legacy `kosherType: 'mehadrin'` still
sitting on it (true of every record before this batch, and of the §5c population going forward) would
skip the whole structured block and land right back on `kosherTypeLabel['mehadrin']` → `'מהדרין'` —
resurrecting, in the fallback path, exactly the claim the explicit null was recording as withheld.

**The generalisable lesson:** tracing that a value "falls through safely" is not the same as tracing what
it falls through *to*. A correct, previously-load-bearing rule (null/undefined parity) applied without
re-verifying that the destination is structurally the same in the new case is one of the harder classes of
mistake to catch, precisely because the reasoning that produces it feels rigorous — it cites a real,
previously-correct precedent. The fix: `kosherAuthorityGroup || kosherLevel !== undefined` — behaviour-
identical on every record that exists today (kosherLevel is never null in the live dataset yet, so
`!== undefined` and truthiness agree on every value that currently occurs), and correct for the
not-yet-existing `null` case, which now enters the structured block and lands on `'גוף כשרות לא ידוע'`
instead of the legacy claim.

A second instance of the identical error pattern was caught one level up, in the test written to cover
this fix, before it shipped: a test asserted `kosherLevel: null` and `kosherLevel: undefined` produce
identical output when nothing else is set on the record, again by analogy to `certifierId`. Running it
(not just reading it) showed the analogy doesn't hold at that fixture either — they correctly diverge
(`null` → `'גוף כשרות לא ידוע'`, `undefined` → `null`, since `kosherType` is also unset in that fixture) —
and the test was rewritten to assert the divergence instead of the identity. The lesson applies to tests
as much as to implementation code: an imported precedent needs re-verification at every site it's applied
to, including the site that's supposed to be checking the fix.

---

## 15. `levelAssertedOverNamedBody` — a ratchet with a closing condition, not permanent furniture

`scripts/validate-data.mjs`'s new ratchet key, baselined at **343** (§13's population, resolved via the
registry alias map). Deliberately a ratchet and not a hard failure: a hard, unconditional failure on a
predicate 343 live records already violate would leave `npm run verify` — and CI — red until the Batch B
dataset write happens, and that write is explicitly not authorized yet (owner is weighing the disclosed
Bnei Brak coverage loss, §5b). A ratchet blocks a *new* violation exactly as hard as a hard failure would;
it does not require the unapproved data change just to keep a code-only batch green.

**The condition attached to accepting this as a ratchet, not a deferred problem:** 343 must not become
permanent furniture that everyone reads as "fine" because it's green. Two obligations, both binding:

1. The baseline entry's comment (in `scripts/validate-data.mjs`, next to the `counts` initializer) must
   name the target — **0** — and the specific operation that closes it: the Batch B data write that sets
   the 358 records' `kosherLevel` to explicit `null` (§5b, "Batch B remediation — approved shape"). Not a
   vague "should improve."
2. **The moment that write lands and drives the count to 0, `levelAssertedOverNamedBody` MUST convert from
   a `RATCHET_KEYS` entry to a HARD failure, in the same commit as the data write.** At 0 there is no cost
   to unconditional enforcement, and leaving it a ratchet at 0 would mean a future regression could be
   `--update`d away by someone who reads a ratchet ceiling as a preference rather than a bug. This is a
   condition of the Batch B data-write commit being considered complete, not a follow-up TODO to
   rediscover later.

### 15a. The ratchet's predicate under-counts **in the direction of vagueness** — 343 of 398

The counter's name is accurate: it counts a level asserted over a **named** body. But the defect it exists to
track is *"the level was invented,"* and the predicate reaches that only through a proxy — `alias.authorityId`
must resolve. **It is blind precisely where the source text is too vague for the registry to resolve, which is
where the evidence is weakest.** Measured over `places.osm.json`:

| | n |
|---|---|
| FOOD records asserting a level via `kosherType`, with `certifiedBy` | 593 |
| **flagged** — alias resolves to a body | **343** ← matches the baseline exactly |
| not flagged, but the text itself states a level (`כשר למהדרין`, `גלאט`) — evidence-backed, correctly excluded | 195 |
| **not flagged, and the text states no level at all — same defect, invisible** | **55** |

**True population: 398. The ratchet holds 343.**

The 55 are the *stronger* cases, not the weaker ones. For the flagged 343 the registry at least resolved a
body. For these the registry either recorded `authorityId: null, level: null` — declining to name the body
*or* the level — or **has no entry at all**, several being reviewQueue-deferred strings a human review
explicitly refused to process:

`בד"ץ` ×5 · `כשר בד"ץ` ×4 · `בד"ץ יורה דעה הרב מחפוד` ×4 · `בד"ץ קהילות` ×3 · `חתם סופר פתח תקווה` ×3 ·
`חתם סופר` ×2 · `רב רפאל מנת` ×2 · plus ~30 compound multi-authority strings (`בד"ץ בית יוסף + רבנות הר חברון`)
that hit the §9 compound gap.

**Not a defect in the ratchet and not urgent** — it still blocks growth on 343, and the 55 cannot grow
silently either, because a new bypass hits the §13 choke point. But: **if the predicate is ever broadened, the
baseline moves 343 → 398, and that must be a deliberate re-baseline rather than a surprise red build.**

**The generalisable form:** `alias.authorityId` resolving is a *proxy* for "the text names a body." A proxy
fails asymmetrically — and this one fails in the direction of the weakest evidence, so the records it cannot
see are systematically the ones that most deserve to be seen. Read alongside §17: a check whose subject is
narrower than its purpose does not announce the gap.

---

## 16. Migrating the re-runnable utilities — order, and why one goes first

Three writer scripts are `re-runnable-utility`, not one-shot: `migrate-kosher-fields.mjs`,
`apply-kashrut-authorities.mjs`, and `importers/tzohar/import-food.mjs` (§13). None were migrated to
`recordKashrutWrite()` when B1 shipped — B1 built the choke point and proved it works, it did not retrofit
the scripts that would benefit most from actually using it.

**`apply-kashrut-authorities.mjs` migrated first, and specifically before Batch B's dataset write, not
merely before Batch B starts.** It is the script that will perform that write. Unmigrated, the one write
that actually fixes the 358 unlicensed mehadrin records would go through the one path B1's choke point does
not cover — Batch B's own remediation bypassing Batch B1's guard. Migration verified behavior-preserving:
a dry run before and after produces byte-identical totals (matchedAlias 1447, certifierIdNonNull 910,
certifierIdNull 537, kosherLevelSet 5, kosherAuthorityGroupSet 448, reviewQueueSkipped 113 — every number
unchanged), plus a new `0 recordKashrutWrite refusals : OK` acceptance line confirming every one of the
1447 writes was checked, not skipped. `apply-kashrut-authorities.mjs`'s own `basis` for every write is
`{kind:'registry-alias', alias: p.certifiedBy, aliasLevel: alias.level}` — the same alias entry the script
already resolved from the registry, so `recordKashrutWrite`'s content-check (§13) verifies the script
against the registry a second, independent time rather than trusting the script's own prior lookup.

**`migrate-kosher-fields.mjs` and `importers/tzohar/import-food.mjs` are scheduled after, under a hard
condition: neither may run again before it is migrated.** `import-food.mjs` is the one to watch —
it is the only live re-runnable *importer* of the three, and it will run again the next time Tzohar
certificates refresh, which per §7's cliff is immediately after 2026-09-11: seventeen days out from this
writing. An unmigrated re-runnable writer firing in the same week as the certificate refresh is a
collision worth closing before it happens, not after.

**Both migrated. All three re-runnable utilities now route through `recordKashrutWrite()`; the frozen
exclusion list dropped 82 → 81 → 80.** Neither script was run for real — every check below is from a
throwaway `git worktree add --detach`, destroyed immediately after, per the "never mutate
`src/data/generated/` in the shared checkout" rule.

**`importers/tzohar/import-food.mjs`.** The five CERT_PATCH fields route through the helper with
`{kind:'certificate-document', url}` — genuinely the strongest evidence class in the project (180
certUrls, 164 parsed expiry dates, real Tzohar PDFs) — but only where a URL is honestly available.
**Real finding, not invented past:** of 256 live food entries, 19 carry no `certPdf` in this data pull.
Of those, 4 already have a `kosherCertUrl` from an earlier pull (basis still holds, using the existing
URL); the remaining 15 have none, ever. This was not papered over with a `human-review` or
`backfilled-inference` basis — neither is true, there is no reviewer and no prior capture to cite, only
Tzohar's list entry with no attached document. Split by consequence: **12 already-certified existing
records** get their non-kashrut fields refreshed but their kashrut fields left untouched rather than
re-asserted on no evidence; **3 would-be new records** are not admitted at all (AGENTS.md's admission
rule: no kashrut evidence, no admission) — a real, load-bearing behavior change from the pre-migration
script, which wrote all five fields unconditionally via `Object.assign` regardless of whether a PDF
existed for that specific record. Verified end-to-end in a throwaway worktree: 172 updated, 69 inserted,
12 held back, 3 skipped, **0 recordKashrutWrite refusals**, 7471 → 7540 total — matching a hand-derived
prediction exactly before the script was ever run.

**`scripts/migrate-kosher-fields.mjs` — the harder case, resolved data-derived rather than by the three
options as first framed.** The choke point only gates `kosherLevel`, not `kosherAuthority` or
`kosherAuthorityGroup` — those are body/group claims, not level claims, and for a kosherType that
already names a body (`badatz_beit_yosef`, etc.) writing them recovers real identity rather than
inventing one (RECOVER, not REMOVE — §4/§8). So each field is now attempted **independently per
record**, not atomically: `kosherAuthority`/`kosherAuthorityGroup` are written from
`{kind:'enum-inference', ...}` (never gated for those fields); `kosherLevel` is written as explicit
**`null`** — not left absent — whenever the MAP would have asserted `'mehadrin'`, since the helper
rejects `enum-inference` for a level-asserting write unconditionally (this literally IS the site-A
mechanism, FACTS §5b, committed by this exact script for 154 of the 358). Explicit null over absence is
deliberate: it is exactly the state place.ts:97/kosherLevel already means — "the evidence names an
authority but not a level" — and leaving it absent would silently recreate the §5c ambiguity (249
records already collapse "never migrated"/"deliberately undetermined"/"genuinely unknown" into one
state) at the moment this script has enough information to say which one it is.

Quantified against the live dataset before choosing this over a blanket per-record skip: of 2,017
currently-enrichable records, 969 are regular-level and fully unaffected; 1,048 are mehadrin-mapped and
have their level declined. Of those 1,048, **327 (259 named-authority + 68 group-only) still recover real,
non-invented identity** under the per-field design that a blanket per-record skip would have discarded
for no safety benefit; the remaining 721 are bare `mehadrin`/`kosher` types where the MAP has nothing to
recover regardless (group stays `'unknown'`, authority stays `null`) — genuinely inert either way, not a
cost of this design. This settles the three-option question from first principles: neither (a) die on the
first blocked write, nor (b) as literally stated (blanket per-record skip, discarding the 327), nor (c)
retire — the script still does real, safe recovery work for 969 + 327 = 1,296 of 2,017 records once
neutered of the one thing it should never have been allowed to do. Verified end-to-end in a throwaway
worktree: enrichedFully 969, levelDeclinedIdentityRecovered 327, levelDeclinedNoRecovery 721,
reviewQueueSkipped 113 (unchanged), unmapped 0, **0 recordKashrutWrite refusals** — matching the
hand-derived prediction exactly. The Batch A reviewQueue-guard test
(`scripts/reports/migrate-kosher-fields-reviewqueue-guard.test.mjs`, a hand-maintained verbatim copy of
the enrichment logic, not an import of the real script) was updated to assert the new outcome
(`kosherLevel: null`, not `'mehadrin'`) — it had gone stale the moment the real script's behavior changed
underneath it and was still passing, testing a copy of logic that no longer existed. Caught before commit,
not after: a test that passes for the wrong reason is the same failure class as §9's fixture case, one
level up again.

**No re-runnable writer bypasses the choke point any longer.** The frozen exclusion list's
`re-runnable-utility` category is now empty.

---

## 17. Checks that pass while checking nothing — five faces, all hit within two days

A failing check is cheap: it tells you where to look. A check that **passes without checking anything** is
the expensive one, because it is indistinguishable from a check that passed for the right reason, and it
converts "unverified" into "verified" in every report downstream. Five distinct shapes have now appeared in
this project inside forty-eight hours. They are the same defect wearing different clothes.

| | Shape | Instance | What it looked like |
|---|---|---|---|
| 1 | **A test nothing runs** | `scripts/shared/__tests__/*.test.mjs` and `scripts/reports/migrate-kosher-fields-reviewqueue-guard.test.mjs` | 451 lines of new test committed; jest's `roots: ['<rootDir>/src']` never reached them and no npm script did either. Green. |
| 2 | **A fixture that matches nothing** | a B1 test fixture citing a gershayim alias string absent from `aliases[].raw` (§9) | The lookup returned nothing, the assertion held vacuously, the guard under test was never exercised. Green. |
| 3 | **A test that copies the logic instead of importing it** | `migrate-kosher-fields-reviewqueue-guard.test.mjs` held a verbatim copy of the enrichment function | The real script's behaviour changed; the copy did not. The test kept asserting the old result **correctly**, against its own frozen duplicate. Green. |
| 4 | **A prediction that matches on volume while the output is invalid** | `importers/tzohar/import-food.mjs` run end-to-end | Hand-derived prediction of 7,471 → 7,540 made before the run, matched exactly. The resulting file fails `data:validate` with **37 duplicate ids** and 3 records missing `name`. The prediction was about counts. Nobody asked whether the result was valid. |
| 5 | **A zero-result scan** | the whole-repo absolute-path sweep | A file-based scan searching only the `\` needle form returned **0 hits** on a repo holding 6 real files in the `/` form. The only result that *hides itself*: a wrong non-zero number invites "why is that so high?", while zero reads simultaneously as a clean answer and as no work done. |

**Why face 5 deserves its own row rather than folding into the others:** every other face produces a *number*,
and a number invites interrogation. Zero is the single output that is indistinguishable from success by
inspection. The countermeasure is not to re-run the scan — a second run confirms the same failure with more
confidence. It is to **test the instrument against a known positive**: open a file you are already certain is
a hit and confirm the scan finds it. That is the only procedure that detects a needle covering half the space.

**The common mechanism:** in each case the check's *subject* silently became empty or stale while its
*form* stayed intact. Nothing throws when a test file is never collected, when a fixture lookup misses, when
a copied function drifts from its original, or when a count is right about a file that cannot be committed.

**The five countermeasures, each earned by one of the above:**

1. **Prove a test runs before relying on it.** `npx jest --listTests` must return it, or it must be wired
   through `test:scripts` **and** `ci.yml`. The suite count not moving after you add a test file is the tell.
2. **Every fixture asserts its own assumption against live data.**
   `assert.ok(realEntry, 'fixture assumption broken: … is expected to be a real registry alias')` — so the
   test fails loudly when the data moves underneath it instead of quietly testing an empty set.
3. **Import the logic; never copy it.** A test holding its own copy of the function is testing the copy. If
   the real module cannot be imported, that is a reason to make it importable, not a reason to duplicate it.
   **Face 3 has an analysis mode, not just a test mode** — and it is worse there, because no one reviews a
   scratch script. Reproducing `validate-data.mjs`'s `levelAssertedOverNamedBody` predicate by hand failed
   twice in one sitting: once by coding the flag as `!certifierId` (the *inverse* of the real predicate, which
   requires `certifiedBy` to **resolve** to a named body), and once by copying `FOOD_TYPES` as 4 members when
   the real set has **8**. The second produced 302 against a baseline of 343 — indistinguishable from a real
   finding that the ratchet had 41 records of slack, and one step from being reported as one. **What caught it
   was running `npm run data:validate` and seeing 343** — not re-reading the reproduction, which only ever
   confirms itself. Derive a baseline from the validator's own output; if a predicate must be reproduced,
   import its constants rather than retyping them.
4. **A matched prediction is not a passing check.** Predicting an output's *shape* and hitting it says
   nothing about the output's *validity*. Any run that produces a dataset must be followed by
   `data:validate` on the produced dataset, not by a comparison of counters.
5. **Validate the instrument against a known positive before believing a zero.** Not by re-running it —
   by opening one file you are already sure is a hit and confirming the scan sees it.
   **Escalated after a third and fourth instance, both inside one verification.** Asked whether
   `בד"ץ אגודת ישראל והרבנות המקומית` was reviewQueue-deferred or merely absent, two consecutive searches
   of `kashrut-registry.json` returned **zero**, and it *is* in the reviewQueue. Both failed on the same
   mechanism: the haystack was `JSON.stringify(entry)`, in which the gershayim is escaped as `\"`, while the
   needle carried a bare `"`. The normalizing pass failed too — stripping quote marks leaves the **backslash**
   behind, so `בד\"ץ` → `בד\ץ`, which never equals `בדץ`. What found it was searching for `אגודת` — a
   distinctive substring containing **no quote character at all**. **The rule: when a zero comes back, retry
   with a needle that cannot carry an escape.** Punctuation is where the instrument breaks, so take it out of
   the needle rather than trying to match it correctly.

### 17b. The sixth face — a countermeasure that shares the hazard it was written for

Every face above is a check **decoupled from its subject**. This one is a check decoupled **from itself**.

Asked whether `בד"ץ אגודת ישראל והרבנות המקומית` was reviewQueue-deferred or simply absent, two consecutive
searches of `kashrut-registry.json` returned **zero**. It is in the reviewQueue.

| Attempt | Why it returned zero |
|---|---|
| exact match on `JSON.stringify(entry)` | haystack has `בד\"ץ` (escaped); needle had a bare `"` |
| **the normalizing pass, written specifically to defeat the §9 gershayim trap** | **stripping quote marks leaves the backslash** — `בד\"ץ` → `בד\ץ`, which never equals `בדץ` |
| search for `אגודת` | **found it** — a needle containing no quote character at all |

**The countermeasure carried the same hole as the thing it was defending against, and failed silently and
confidently — a countermeasure returning zero looks exactly like a countermeasure working.**

**The rule, and it is more actionable than face 5's:** when a zero comes back, **retry with a needle that
cannot carry an escape.** Punctuation is where the instrument breaks, so take it *out* of the needle rather
than trying to match it correctly. Face 5 says to check; this says how.

**And the generalisation worth keeping: a countermeasure is not automatically outside the hazard it was
written for.** It is written by the same person, in the same idiom, against the same misunderstanding.

What stopped a *correct-looking refutation of a true finding* from shipping — two zeros and a half-written
"the string is not in the registry" — was that the claim under test named a **specific state**
(reviewQueue-deferred) rather than a vague one, making it cheap to check and expensive to dismiss. Hence:
**state findings at the precision that makes them falsifiable in one step.** Same principle as §17a's rule
that a warning must carry the test that retires it.

### 17a. The inverse face — a warning that outlives its defect

All five faces above are artifacts whose **subject went stale while their form stayed intact**. The inverse
exists and has now bitten twice in this project: an artifact whose subject was **fixed** while its form stayed
intact. Same decoupling, opposite direction of decay.

| Instance | What it said | Reality |
|---|---|---|
| `docs/DATA_ARCHITECTURE.md` §3.2 | `extract-cert-expiry.mjs` "caches PDFs and never invalidates — re-extracts a stale expiry and reports success" | fixed by the `isCacheStale`/`--refresh` work; the doc never caught up |
| a reviewer's own persistent note | "`--refresh` is required for the cliff" | not required since the window landed — and it survived in a file its author wrote, about a fix its author reviewed |

**This is the worse class, despite being the less dramatic one.** Every face above is *self-limiting*: it
eventually produces an incident — duplicate ids in a committed file, a corrupted dataset, a red build on a
clean runner. The incident is the discovery mechanism. Unpleasant, but it fires.

**A stale warning produces no incident. It produces inaction.** Nobody uses a tool they have been told is
broken, and nobody files a bug about a tool they never used. There is no event, no red build, no wrong
number — just work quietly routed around something that was fine. **It has no natural discovery mechanism at
all.** Both instances above survived only until someone happened to chase an unrelated deadline.

And the cost is not "nothing happens." Sixteen days from a 152-certificate cliff, the architecture doc was
telling the next person that the tool they need is broken. The realistic outcome is someone hand-rolling a
replacement under time pressure, or deferring the run — at exactly the moment the project can least afford
either.

**Two countermeasures specific to this direction:**

1. **A warning about a specific defect in a specific file belongs *in that file*.** The
   `extract-cert-expiry.mjs` warning belonged in `extract-cert-expiry.mjs`, where the person fixing the
   defect is already looking. A prose warning about code has no reason to be revisited when the code
   changes, so it ages independently *by construction*. This is *import-the-logic-don't-copy-it* applied to
   prose.
2. **A warning must state the observable test that proves it still applies.** Not "this tool caches forever"
   but "*if `isCacheStale` has no freshness check, this still bites.*" Then a reader falsifies it in one step
   instead of doing archaeology, and the warning carries its own expiry condition. **A warning without a test
   can only be retired by someone who already knows it is wrong — which is nobody, because they have been
   told not to look.**

**And the meta-rule, which is the only one that generalises:** ask what would have to be true for this check
to pass while the thing it guards is broken — then go and check *that*. Every one of the faces above answers
that question in a single sentence, and none of them was found by reading the check.

**A blind spot that CORRELATES with what it should catch is not a coverage gap — it is a filter.** Two
independent instances now:

| Check | Blind where | Correlation |
|---|---|---|
| `levelAssertedOverNamedBody` (§15a) | the text is too vague for the registry to resolve | blind where the **evidence is weakest** |
| `unknownCityId` (§19b) | the writer also rebuilds the reference set | blind to the **most privileged writers** |

An unbiased blind spot loses a random sample of the signal and still leaves the shape visible. **A correlated
one removes exactly the part you were looking for**, and the remainder looks clean and representative. When
assessing any check, ask not only *what does it miss* but *is what it misses systematically the worst of it* —
because that is the difference between a check with a gap and a check that launders its subject.

**How an incident becomes a class, or fails to.** Both of the newest faces were first filed as stories about
*people*: §17a as "a doc nobody updated," §17b as "I made an escaping mistake twice." Filed that way, each is
an anecdote that teaches nothing and recurs. What made them classes was restating them as stories about
**mechanisms** — a warning coupled to its subject only by someone remembering; a countermeasure sharing the
author, idiom and misunderstanding of the thing it defends against. **When an incident's write-up names a
person, it is not finished.** Ask what about the *mechanism* made that person's mistake the natural one, and
write that instead — otherwise the lesson leaves with them.

---

## 18. `restaurants.osm.json` — guarded against erasure, validated by nothing

### 18a. The file itself

1,337 records: **283 `source: 'osm'` + 1,054 hand-curated.** `npm run import:restaurants` (package.json:53)
was a live full overwrite from a fresh Overpass fetch, no merge — the identical defect class to the
`rebuildAppDataset` one fixed in Phase 0, sitting untouched on a file every sweep had scoped past. Closed at
`f2b15d5` via `writeCategoryGuarded()`.

**The scoping lesson, third instance in one day:** a fix scoped to one artifact leaves the identical defect on
every artifact it did not name. Phase 0 fixed the rebuild path on `places.osm.json` and stopped there.

### 18b. Guards that check presence are not guards on content

`planCategoryOverwrite()`'s original three guards — volume, no-dropped-ids, no-dropped-manual-records — are
**entirely about record presence.** Five candidates that drop nothing (every live id present, volume 100%) and
mutate content pass all three:

| Candidate | Original 3 guards | Naive `no-stripped-fields` lift |
|---|---|---|
| `certifiedBy` stripped from **all** records | PASS | caught |
| `kosherCertUrl` + `certificateValidUntil` stripped | PASS | caught |
| `kosherType` downgraded to bare `kosher` | PASS | **still passes** — key present, value degraded |
| all coordinates zeroed | PASS | **still passes** |
| `lastVerifiedAt` moved **backward** | PASS | **still passes** |

**Do not lift `no-stripped-fields` from `planAppDatasetRebuild` (database.ts:176-180).** It is a
*union-of-keys* set difference: `liveFields − candFields` over all records. If one candidate record retains
`certifiedBy`, the key is in `candFields` and the guard passes — **stripping it from 1,336 of 1,337 records
passes clean.** It catches erasure-from-all, not erasure-from-most, which is the realistic shape.

**Why it is weak there and must not be inherited here — the generalisable point:** `planAppDatasetRebuild`
compares a *reconstruction* against a *different-shaped population*. It holds no per-id prior, so a union over
key names is the strongest check available to it. `planCategoryOverwrite` compares a file against **its own
prior content, id by id** — it holds the exact prior record and can diff per survivor. The weak guard is an
artifact of the weaker *situation*, not a judgement about this one. **A guard copied between two call sites
inherits the limits of whichever site it was written for.**

### 18b-i. The replacement guard design was unsatisfiable — and the reason generalises

The fix proposed for the above was: *guard what is never legitimate, report what may be* — zero tolerance on
the 7 kashrut fields (an Overpass fetch structurally cannot carry kashrut evidence, so any movement is a
regression), everything else reported and non-blocking.

**The premise is true and the conclusion does not follow.** `importer.ts:29` uses `diet:kosher` as a *filter*;
the candidate carries no kashrut field at all. But:

| | |
|---|---|
| live | 1,337 |
| `source === 'osm'` — the only records a fresh fetch can reproduce | 283 |
| **…of those 283, carrying a kashrut field** | **58** (`kosherType` 58, `certifiedBy` 54, other five 0) |

Those 58 are OSM-sourced records that patch scripts later annotated. A faithful fetch reproduces their ids
*without* those fields, so **58 survivors lose kashrut fields on every legitimate run.** Zero tolerance blocks
100% of runs, including the correct one.

**The general form, which is the part worth keeping:** *"the candidate can never carry field X"* and *"no
survivor may lose field X"* are **jointly unsatisfiable the moment any reproducible record carries X.** The
strictness is not a judgement that can be tuned down — it is forced by the operation. And relaxing it to
"may not be downgraded, may be lost" guards nothing, because losing `certifiedBy` on those 54 *is* the damage.

### 18b-ii. The operation is wrong, not the guard

Every guard in this line of work was an attempt to make an overwrite safe on a file holding 1,054
unreproducible records and 1,112 kashrut claims the overwrite structurally cannot reproduce. **That is not a
guard gap; it is the wrong operation.** `writeCategoryGuarded` should **merge**, not overwrite:

| Case | Rule |
|---|---|
| id in candidate only | add |
| id in live only | **keep untouched** — required by additive-only; a closure vanishing from OSM must never delete a record |
| id in both, `live.source === 'osm'` | candidate supplies only what OSM has authority over (`name`, `location`, `address`, `openingHours`, `phone`, `tags`); live supplies everything else |
| id in both, `live.source !== 'osm'` | keep live **entirely**, log the collision — a hand-curated name may have been deliberately corrected, and OSM has no authority over it |

Under merge the tradeoff dissolves: the 1,054 survive by construction rather than by a guard catching their
absence, the 58 keep their kashrut fields because the merge never had authority to remove them, and
**zero tolerance on the 7 fields becomes free** — maximally strict at zero cost, never blocking a correct run.

**The name was the tell.** `writeCategoryGuarded` guards a *write*. The safe thing was never a guarded write;
it was a different write. A guard added to the wrong operation is paying interest on the wrong loan.

**Why this is not urgent despite being correct:** the destructive path is *already contained* — the function
throws without the opt-in and throws again on failing guards, which fail today. Nothing can reach it. What is
left behind is a **booby-trapped tool that throws on correct input** — the exact shape someone eventually
"fixes" by deleting the guard. Decay-urgent, not data-urgent. Contrast §18c, which *is* live exposure.

### 18c. The validator cannot see this file — the one live exposure here

`scripts/validate-data.mjs` reads **only** `places.osm.json` and `cities.osm.json` (verified by extracting
every `readFileSync` target). The `certifiedBy` append-only HARD failure, the `lastVerifiedAt` backdate HARD
failure and `levelAssertedOverNamedBody` all skip `restaurants.osm.json` entirely.

We built a hard guard for the `lastVerifiedAt`-backward signature and **it cannot see the file where that
regression is most likely.** `f2b15d5` closes erasure; it does not make this file protected, and the
difference matters for how it is described.

**This is the live hole** — 86 scripts write this file, one reads it, nothing checks it — as against §18b-ii's
overwrite, which is already contained.

**"Covering it would fail immediately on live data, so it belongs to an owner decision" was a rationalisation,
and the repo's own precedent refutes it.** `scripts/data-quality-baseline.json` carries
`"levelAssertedOverNamedBody": 343` — a check shipped against 343 live violations by baselining it at 343, so
it goes red only on *growth*. Identical situation, solved two commits earlier in the same file. **Baseline,
don't defer.** The asymmetry decides it: extending costs a few lines that might later be deleted; not
extending leaves the file unguarded through a decision window of unknown length.

**Generalisable:** when a check would fail immediately on live data, that is an argument for a **ratchet**,
not for no coverage. The honest form of "it would go red today" produces a baseline, not a deferral.

### 18d. 30 fabricated `certificateValidUntil` values

| | |
|---|---|
| records with `certificateValidUntil` | **30** |
| …with a `kosherCertUrl` | **0** |
| `kosherCertUrl` anywhere in the file | **0** |
| present in `places.osm.json` | 29 — **one is an orphan** |
| …where `places.osm.json` also has a date | 0 |
| all 30 | `humus-eli` ids, `source: 'manual'` |

Dates: `2026-09-11 ×14` · `2027-01-31 ×8` · `2026-12-31 ×6` · `2026-10-11 ×1` · `2026-09-10 ×1`.
Orphan: `humus-eli-חומוס-אליהו-צמח-טבריה` (`2026-09-11`), absent from the app dataset entirely.

These are the exact fabricated dates `876a562` stripped from `places.osm.json`. **Not a recovery opportunity —
a defect already fixed, still live in a file nothing validates.** Fourteen carry the Tzohar cliff date with no
certificate behind them.

They violate the field's own documented invariant. `place.ts` on `certificateValidUntil`: *"Only ever set from
a real certificate document (see `kosherCertUrl`) — never inferred, extrapolated, or copied from a sibling
branch."* Zero of the 30 have a `kosherCertUrl`. **Every record in that file carrying the field breaks the
rule the field documents.**

### 18e. It is not a mirror — it is a partially-diverged parallel dataset

Measured against `places.osm.json`:

| | |
|---|---|
| mirror records | 1,337 |
| present in `places.osm.json` | 953 |
| **absent from `places.osm.json`** | **384** (osm 227 / manual 157; zero missing a `source` field) |
| …of those 384, **carrying kashrut claims** | **205** ← the real recovery |
| …of those 384, **carrying no kashrut evidence at all** | **179** ← a merge must refuse these |

**The 179 are the half that cannot be recovered, and the partition is exact (205 + 179 = 384).** All 179 are
food types (`restaurant` 154, `fast_food` 25). Under merge-then-retire they would be *admitted* into
`places.osm.json`, and AGENTS.md's admission rule is that a food place with no kashrut evidence never enters.

**This is the first place the two data rules collide.** The admission rule forbids taking them; the
zero-deletions rule forbids destroying them.

**An archive file was proposed and rejected. The rejection is the useful part.** The proposal was to keep the
179 in a file the app never reads. The objection that killed it is *not* "that's the mirror file again" —
that objection fails on its own terms, since an archive could be write-once (0 writers), ratchet-covered, and
unable to diverge, so three of the mirror's five hazards are structurally absent. The objection that survives:

> **An archive enforces inertness by the absence of readers.** "The app never reads it" is a property of
> today's import graph, not an invariant. Nothing fails when someone adds a reader.

Every mechanism built in this effort replaced *"nobody will"* with *"something checks"*. An archive is a
"nobody will," and would need three new enforcement mechanisms (a no-importer test, ratchet coverage, a
write-once invariant) just to be as safe as the thing it replaces.

**And it hides the real question.** The question is not *where the 179 live* — it is **whether the app should
list a food place it has no kashrut evidence for.** That question already has live instances:

| | |
|---|---|
| `filterPlaces.ts:29-30` — `eatAll` gates on `isFoodType` only, **no kashrut precondition** | such records **do** appear in the food list |
| `getKosherLabel` for such a record | returns **null** — no chip, not even "unknown" |
| food records in `places.osm.json` with no kashrut evidence **today** | **20** (= the `foodWithoutKashrut` baseline exactly) |
| after merging all 384 | **199** — a 9.9× increase |

An archive answers that question implicitly for the 179 by hiding them, and leaves the 20 in the app
unaddressed — the same defect, now *harder* to see because the population that would have forced the question
has been filed away.

**The adopted resolution is a filter rule, not a file:** merge all 384, and exclude food records with no
kashrut evidence in the **read path**. The machinery already exists — `filterPlaces.ts:51` already excludes on
`isCertificateExpired`, so "stays in the dataset, withheld from a surface" is a pattern this project has built
and tested. It is the same admission/retention resolution applied at the **display** layer rather than the
storage layer, which is where it belongs: storage is where you put things you don't want read; display is
where you decide what gets shown.

| | inertness enforced by | |
|---|---|---|
| archive file | absence of readers | untestable, decays silently |
| **filter predicate** | **presence of code** | **tested, fails loudly when broken** |

It also dominates on everything else: one dataset and no parallel-file surface; covered by every ratchet
already shipped rather than needing new ones; promotable by adding evidence rather than migrating a record
between files; and **it fixes the 20 as a side effect instead of stranding them.**

**The precondition, and the order matters — record it before anyone ships the hide.** Hiding also makes the
199 invisible, just by a different mechanism: an archive hides them from *readers*, a filter hides them from
*users*. Both remove the pressure that would otherwise get the evidence found. **If hiding were the whole
change it would be the same trap in a different costume.**

What rescues it is that `foodWithoutKashrut` (20) and `restaurantsFoodWithoutKashrut` (225) **already exist**:
the population stays visible to the *project* while invisible to *users*, it cannot grow silently, and letting
it grow requires a deliberate re-baseline. **Hiding is safe because the ratchet was built first — not on its
own merits.** Never ship the hide without confirming the counter is still there.

**Implementation note — foreseeable, so no excuse for hitting it.** The hide rule and the ratchet compute the
same predicate:

```
FOOD_TYPES.has(type) && !kosherType && !kosherAuthorityGroup && !certifiedBy
```

If the filter *restates* it rather than importing it, that is two rules sharing one concept with no link
between them — the 343/398 and 37/38 problem again, and **§17 face 3 in its third appearance**. Export one
predicate and have both call it.

**`restaurantsFoodWithoutKashrut` (ratchet, baseline 225) is the whole-file count; 179 is the orphan subset.**
Two numbers, two jobs — the ratchet guards against growth anywhere in the file, the 179 is the decision-
relevant figure. Do not reconcile one to the other.

### 18e-iii. The 205 are genuinely salvageable — the contamination is in the shared 953, not the orphans

"Recover 205 from a file we have spent a week calling contaminated" invites a discount. Measured, the data
does not support one:

| Of the 205 orphans carrying a claim | n |
|---|---|
| carry a **real `certifiedBy`** | **195** |
| bare `kosherType`, no `certifiedBy` | 10 |
| level asserted over a named body (§5b defect) | 3 |
| fabricated expiry (`certificateValidUntil`, no `kosherCertUrl`) | 1 |

**Fourteen carry a catalogued defect; 195 carry a real certifying body.** The divergence (§18e-i) and the
fabricated dates (§18d) are concentrated in the **953 shared** records, not in the orphans — so the recovery
pocket is cleaner than the file's reputation.

For the 953 shared records — fields the mirror has and `places.osm.json` **lacks**:
`certifiedBy` 36 · `certificateValidUntil` 29 · `kosherType` 4.
Fields where the two files **disagree**: **`kosherType` 150 · `certifiedBy` 101.**

**Three consequences:**

1. **"Retire" as a bare option is off the table.** Retiring loses 384 records including 205 kashrut claims —
   a direct violation of additive-only. The real options are *merge-then-retire* or *keep-and-validate*, and
   **both require the §18b-ii merge**, which is why specifying that merge does not pre-empt the decision.
2. **150 `kosherType` and 101 `certifiedBy` disagreements have never been adjudicated.** A merge must not
   silently resolve them. See §18e-i — the "places wins" assumption is **two** assumptions, and it holds for
   one field and fails for the other.
3. It reframes what `f2b15d5` protects: not a redundant copy, but 205 kashrut claims existing nowhere else.

### 18e-i. The mirror is a pre-migration snapshot — dated by a missing field, not by a value

On shared ids, `places.osm.json` holds fields the mirror **entirely lacks**:

| `kosherLevel` | `kosherAuthority` | `certifiedBy` | `kosherType` |
|---|---|---|---|
| **904** | 201 | 191 | 141 |

**904 missing `kosherLevel` is a fingerprint, not a gap.** `kosherLevel` did not exist until
`migrate-kosher-fields.mjs` created it, so its wholesale absence **dates the file** as a snapshot taken before
the kashrut-field migration. This is better evidence than any individual value comparison, and it is what
justifies treating most disagreements as staleness.

**But "the mirror is stale rather than independent" is two claims, and only one holds.** Tested per
disagreement against 97 commits of history — does the mirror's value appear *anywhere* in `places.osm.json`'s
history for that id?

| field | disagreements | stale | independent | |
|---|---|---|---|---|
| `certifiedBy` | 101 | 94 | 7 | **93% stale** — assumption holds |
| `kosherType` | 150 | 73 | **77** | **49% stale** — assumption fails |

**A blanket places-wins silently decides 77 open questions.** The merge policy must be **per field**, and
`kosherType` is **not settled**.

### 18e-ii. The adjudication rule — and why it is not "places wins with exceptions"

Of the 40 shared ids where `places.osm.json` asserts a level and the mirror does not, split by
`validate-data.mjs`'s *exact* predicate (level-asserting `kosherType` ∩ `certifiedBy` resolving to an
`authorityId` through the registry alias map):

| | n | `certifiedBy` is | Which file is right |
|---|---|---|---|
| **flagged** | **6** | a **body name** — `כשרות בד"ץ הרב רובין`, `כשרות רובין`, `הרב רובין` (all → `rav-rubin`) | **the mirror** — places derived the *level* from the *body*, the inference §5b records as never legitimate |
| not flagged, alias unresolved, **text states a level** | 20 | `כשר למהדרין`, `כשר מהדרין` | **places** — the source text itself states mehadrin, so the elevation is evidence-backed |
| **not flagged, alias unresolved, text states NO level** | **7** | `בד"ץ`, `כשר בד"ץ` ×4, `בד"ץ בית שמש`, `כשרות רבנות ובד"ץ` | **the mirror** — same defect as the 6, invisible to the proxy (§15a) |
| not flagged, no `certifiedBy` | 7 | absent | unadjudicable — leave alone |

**The carve-out is 13, not 6.** The validator's predicate finds 6; the *principle* covers 13. The extra 7 are
records where the registry recorded `authorityId: null, level: null` — declining to identify body **or**
level — or held no entry at all, and places elevated them to mehadrin regardless. Those are the **stronger**
cases: a level asserted over a body the registry explicitly said it could not identify.

The six the proxy sees: `9100003`, `9100006`, `9100007`, `9100062`, `9100063`,
`humus-eli-חומוס-אליהו-ירושלים-הר-חוצבים`.
The seven it cannot: `osm-node-7541798990`, `humus-eli-חומוס-אליהו-בית-שמש`, `9100000`, `9100005`, `9100030`,
`9100050`, `9100056`.

**Why this matters beyond the merge:** deriving the carve-out from the validator's predicate rather than from
the stated principle would have silently under-covered it by more than half. The predicate is a proxy; the
principle is the rule. See §15a — the same proxy under-counts the shipped ratchet by 55.

**Do not write the rule as "places wins except where flagged."** Write it as:

> **The value supported by the source text wins, regardless of which file holds it.**

places-wins is then a *consequence* of that rule holding 27 times, not a policy carrying 6 exceptions. Stated
the first way, the next reader asks why the exception exists and tunes it. Stated the second way, it is the
rule this codebase already applies everywhere else.

### 18f. Note for whoever touches these guards next

`planCategoryOverwrite`'s `volume` guard is **subsumed** by `no-dropped-ids`: the file has no duplicate ids, so
no-dropped-ids passing implies `candidate >= live`, implies `ratio >= 1`. No candidate exists where volume
fails and no-dropped-ids passes. Defence in depth and a clearer error message, but **not load-bearing** — do
not relax `no-dropped-ids` believing `volume` still covers you.

`KAROV_ALLOW_DESTRUCTIVE_CATEGORY_OVERWRITE` (`database.ts:66`) is deliberately **separate** from
`KAROV_ALLOW_DESTRUCTIVE_REBUILD` (`:57`). Two independently destructive operations on different files sharing
one flag is how "I opted into the rebuild" silently becomes "and also authorised the overwrite."

---

## 19. `cities.osm.json` is a projection, not a registry — and the check that guards it cannot see the worst writers

### 19a. The mechanism

**Five of the six writers that touch `cities.osm.json` rebuild it the same way** — `Object.keys(counts)`
over the places array — `fetch-osm-places.mjs:182-190`, `importers/shared/database.ts`, and the
`connect-live.ts` importers for religious-councils, chabad and tzaddik-graves. (`arcgis/connect-modiin-illit.ts`
is the one that does not.) `scripts/fix-orphan-cities.mjs` is the only *maintainable* path, with a
hand-curated 23-entry ADD list — all 23 present today, so it has already run.

**Consequence: the locality list is defined as whatever the places data says.** It has no schema, no
validation, and no source of truth independent of the data it is supposed to validate.

### 19b. The check cannot fail for the writers that matter

`unknownCityId` reads **0** — not because the data is clean, but because a bad `cityId` written by a
rebuilding writer is **laundered into the registry in the same run**.

> **`unknownCityId` is blind to bad `cityId`s written by the writers that rebuild its reference set. It can
> only ever catch a bad `cityId` written by a writer that does *not* rebuild the city list.**

Not "structurally incapable of failing" — that overstates it, and it was driven to 9 in a worktree by running
`import-food.mjs`. The precise claim is that it is blind **precisely to the most privileged writers**, the
five that maintain the list it validates against.

### 19c. What it has accumulated — 14 records stranded, all invisible to city filtering

| Defect | n | Stranding |
|---|---|---|
| Latin-script duplicates of existing Hebrew localities | **13** | **12 records** |
| non-localities: 1 regional council (`מועצה אזורית עמק הירדן`), 3 junctions | 4 | 2 records |
| entries referenced by zero places | 9 | — |
| prospective: localities a non-rebuilding importer introduces | 8 | 9 records (see §19d) |
| `LOCALITIES_QUERY` is `place~"city|town|village"` — **excludes `hamlet`**, which Israeli kibbutzim and moshavim carry | — | independent second cause |

`ashdod` · `ashkelon` · `bat-yam` · `holon` · `jerusalem` · `kfar-saba` · `lod` · `modiin` · `netanya` ·
`petah-tikva` · `ramat-gan` · `rishon-lezion` · `tel-aviv` — **a Hebrew twin exists for all thirteen**:

| latin | places | hebrew | places |
|---|---|---|---|
| `jerusalem` | 1 | `ירושלים` | 515 |
| `petah-tikva` | 1 | `פתח תקווה` | 455 |
| `tel-aviv` | 1 | `תל אביב` | 217 |

**All 12 stranded records are `golda-*` ice-cream branches**, `source: 'manual'`, **every one carrying kashrut
evidence**. A user filtering by `ירושלים` sees 515 places and not the Jerusalem Golda.

**The laundering step is the interesting part: the golda importer does not write `cities.osm.json` at all.**
It wrote places with transliterated `cityId`s; a later run of one of the five rebuilding writers minted those
strings into localities. **The bad value was legitimised by a writer that had nothing to do with creating it.**

The 2 junction records (`manual-aroma-tzomset-urim`, `manual-aroma-tzomset-ruppin`) are a **different defect** —
those Aroma branches really are at highway junctions. They need a parent locality, not removal. Do not fold
them in with the 12.

### 19d. "9 records / 8 localities" is a PROSPECTIVE measurement — and re-deriving it destroys it

| State | unknown `cityId` |
|---|---|
| live dataset today | **0** |
| after `node importers/tzohar/import-food.mjs` in a throwaway worktree | **9**, across **8** localities |

`בית אלפא` · `מעגן` · `עין גב` ×2 · `עין גדי` · `אבו גוש` · `משמרות` · `נחשונים` · `נען` — all new
tzohar-food records.

Also live today, and unrelated: **8 records with no `cityId` at all — all mikvehs** (= the `missingCityId`
baseline), and 3 records in `restaurants.osm.json` with unknown localities (`אורים`, `צריפין`, `עינת`).

**The lesson here is NOT "a number was carried without re-derivation," and filing it that way would teach the
wrong countermeasure.** Re-deriving against the live dataset returns 0, which reads as *the number was wrong* —
and the true finding gets discarded. That is exactly what nearly happened.

> **Attach the STATE to a number, not just its derivation.** "9 records / 8 localities" is true after
> `import-food` and false today, and neither reading is an arithmetic error. **A number without its state
> will be refuted by whoever checks it in a different state.**

This is the first case in this register where **re-derivation is the thing that destroys the finding** rather
than confirming or correcting it — so it belongs beside §17, not inside it.

---

## 20. Record identity is not `id` — ~205 of the 384 "orphans" already exist under a different id

### 20a. The finding

Every population reported for §18e was computed by comparing the two files **by `id`**. That is not identity.

| | Architect | Reviewer | agreed |
|---|---|---|---|
| orphans by id | 384 | 384 | ✔ |
| **confirmed duplicates** (same business, different id) | 207 | 205 | **205–207** |
| **real recovery** — new AND evidenced | 43 | 45 | **43–45** |
| **genuinely evidence-free** | **134** | **134** | **exact** |
| positively new (unique phone absent from places) | 85 | 77 | 77–85 |
| undetermined (no phone, no name/address match) | 94 | 88 | 88–94 |

**The owner was told 205 recoverable, then 123. It is ~44.** The salvageable pocket is a fifth of the first
figure.

**Of the records carrying no kashrut evidence, 45 are duplicates — and all 45 have a twin that carries
kashrut. Not most: all.** Independently derived twice. Those were never evidence-free businesses; they are
duplicate rows of businesses already verified. The evidence was never missing — **the identity was.**

**A merge keyed on `id` would create ~205 duplicate businesses in the app, and `data:validate` would pass** —
different ids, so the duplicate-id check is clean.

### 20b. The mechanism — §19's defect, two levels further down

Transliteration and spelling variance at **record** identity, not just locality identity:

| Shape | Example |
|---|---|
| Latin-tail vs Hebrew-tail id | `burgerim-eilat` ↔ `burgerim-אילת` — **all 39 orphan burgerim ids have a Latin tail; 37 of 40 places burgerim ids have a Hebrew tail** |
| one-letter Hebrew spelling | `humus-eli-…-קריית-מוצקין` ↔ `humus-eli-…-קרית-מוצקין` · `פטרוזיליה` ↔ `פיטרוזיליה` |
| transliterated **name** | `Meat Night` ↔ `מיט נייט` · `New Deli` ↔ `ניו דלי עזריאלי גבעתיים` |
| numeric vs slug id | `9400025` ↔ `manual-aroma-tzomset-urim` · `9000094` ↔ `dominos-v2-d47899c8` |
| chain name vs branch name | `ארומה אספרסו בר` ↔ `ארומה ביג` (same unique phone) |

**§19 is not parallel to this — it is one of its causes.** `פטרוזיליה` / `מלכה` / `Meat Night` / `Bodega` are
filed under `קריית מאיר` in one file and `תל אביב` in the other. `קריית מאיר` is one of §19c's zero-place
localities. A business filed under a neighbourhood in one file and the city in the other becomes two records
that no city-keyed matcher can pair. **Items 3 and 5 are the same defect meeting at different depths.**

Also: **31 duplicate pairs disagree on coordinates by more than 1 km** — worst 111.4 km
(`humus-eli-…-צמח-טבריה` ↔ `humus-eli-…-צמח`, which also carries a fabricated cert date), then 18.2, 15.0,
12.0. Both files assert their own.

### 20c. Three matchers failed, and the failure mode was identical each time

| | Result | Why it failed |
|---|---|---|
| address alone | **186** | 672 addresses in `places.osm.json` are shared by >1 record, one by **39**. Paired `פיצה האט` with `אצה`. |
| geography ≤50 m + same type | 106 | dense urban geography is not identity — `לנדוור` vs `רובן` at 13 m |
| name similarity used to *validate* phone matches | would have cut 205 → 142 | **used a name heuristic to check a phone match, discarding the only thing that made it independent** |

**All three were caught by printing PAIRS rather than counts.** Every one produced a plausible-looking number;
none was detectable from the number alone. **A count is not reviewable. A sample is.**

The third is the subtlest and worth keeping: when a second signal corroborates a first, validating it with a
*third* signal correlated to the first destroys the independence that made the corroboration worth anything.

### 20d. What is NOT determined

**88–94 records have no phone and no name/address match — the instruments cannot see them.** That is not
"probably new"; it is unknown. Reported as a range with its mechanism rather than a fourth confident number,
because three confident numbers have already been wrong here.

---

## 21. The additive-only rule has been violated 1,143 times, and 1,135 of the removals were undisclosed

### 21a. The measurement

Walking HEAD's first-parent ancestry and diffing each file-touching commit against its **true** parent:

| | |
|---|---|
| commits that removed at least one record id | **35** |
| record ids removed in total | **1,368** |
| distinct ids removed and **never restored under the same id** | **1,143** |
| …**re-keyed** — the same business is at HEAD under a different id | **583** (507 by phone, 76 by name + ≤1 km) |
| …**no successor found at HEAD** | **560** ← upper bound on true loss |
| ids removed in commits whose subject announces **only** additions/fixes | **1,135** |

560 is an **upper bound**: the successor search uses phone and name matching, which §20c establishes
under-detects. The true loss is lower and is not currently determined.

### 21b. The commit messages do not disclose the removals

| Commit | Removed | Subject |
|---|---|---|
| `31f75274` | **199** | "data: add **לחם ארז (4 kosher branches)**, update emoji logic…" |
| `7b1a1b75` | **197** | "feat(tzohar): complete Tzohar dataset — certificates, expiry tracking, enrichment" |
| `6b54833f` | 175 | "fix: decode all double-encoded UTF-8 strings via CP1252 reverse" |
| `0bad8b9f` | 131 | "feat: add fast_food category + wire humus-eliyahu data" |
| `da724a32` | 105 | "data: replace OSM Aroma with verified data, add Cafe Joe…" |
| `159a969a` | 69 | "data: add kosherLevel/kosherAuthorityGroup/kosherAuthority to 1686 places" |

**A commit announcing four new branches removed 199 records.** Not restaurants only — the no-successor set
includes synagogues (`osm-way-114799009`, `arcgis:lod::26`) and mikvehs (`mikveh-392`).

**This is the silent-damage class the whole guard-building effort exists to prevent, already present in the
project's own history.** It predates this work; the guards shipped this month are what stop it recurring. It
also means "additive-only" describes an intention, never an enforced invariant — **nothing has ever checked
it.** `data:validate` counts records; it has never compared the id set against HEAD.

### 21c. The instrument failure that hid it — `^` is cmd.exe's escape character

Three consecutive analyses concluded **"0 records have ever been removed."** All three were wrong, and the
third was the dangerous one because it had *passed* a known-positive test.

```
sh('git rev-parse 159a969a^')  ->  159a969a      // the commit ITSELF, not its parent
```

Node's `execSync` on Windows runs through **`cmd.exe`, where `^` is the escape character** and is stripped
before git sees it. So `commit^` resolved to `commit`, and every comparison **diffed each commit against
itself** — which returns zero removals by construction, for all 97 commits, in a loop that reported full
coverage.

**Why the §17 face-5 countermeasure did not catch it:** the known-positive test validated the *comparison*
(a synthetic removal of 3 ids was detected as 3). The comparison was fine. **The broken part was the argument
that selected what to compare** — and a known-positive test on the comparison cannot see a defect in the
operand. Testing the instrument is not the same as testing the instrument's *inputs*.

What actually caught it: the arithmetic refused to close. The dataset peaked at **7,525** and stands at
**7,471**, and "nothing was ever removed" cannot produce a smaller number. **A conclusion that contradicts a
count you already trust is a defect in the conclusion, not an anomaly to note and move past.**

**Operational rule: on Windows, never pass `^` to a shell — use `~1`, and self-test that `X~1 !== X` before
trusting any ancestry walk.**

---

## 22. Field deletion — the class nothing tracks, and the fixture that could not fail

### 22a. A UI refactor deleted a kashrut claim from 349 records

Commit `c4775dd` (2026-08-04), *"feat: ListScreen refactor — לאכול tabs, FilterSheet ≡ with dynamic kashrut"*
— an 8-file UI change — carried one bullet in its own message: *"data: 349 kosherType:regular entries removed
from places.osm.json."* Verified against its true parent:

| | |
|---|---|
| records before / after | 7,523 / 7,523 — **no id changed** |
| records losing `kosherType: "regular"` | **349**, matching the commit message exactly |
| any other kashrut field touched | **none** — `certifiedBy`, `kosherAuthority`, `kosherLevel` untouched |
| re-enriched since | 257 |
| **still bare at HEAD** | **2** — precisely the two Rebar branches |
| deleted from the dataset later | 90 |

**§21 tracked ids disappearing. This is a different class entirely: the record keeps its id and loses its
kashrut claim.** Nothing in the project detects it. The `certifiedBy` append-only guard covers exactly one
field against HEAD; `kosherType`, `kosherLevel`, `kosherAuthority` and `kosherAuthorityGroup` have no
equivalent. A record can be silently stripped of every kashrut claim it holds and every check stays green.

**Why the two Rebar branches specifically:** they were the only 2 of 55 rebar records carrying
`kosherType: "regular"`. The other 53 carry a *fabricated* `mehadrin` (§5b) and so survived a regular-only
cull. **The 53 still display a false claim; the 2 honest ones were stripped.** The cull selected against
exactly the records whose value was real.

### 22b. Evidence ceiling — what the source actually supports

`rebar.co.il/our-stores/` embeds Rebar's own store-locator JSON, one object per branch, carrying a boolean
`kosher`. Both branches confirmed by name + address + coordinates; both `"kosher": true`. **The field is
genuinely differentiated** — other branches in the same feed are `"kosher": false` — so it is a real
per-branch assertion, not a decorative constant.

**But a boolean is the ceiling.** No level word, no authority name anywhere in the feed — verified against
the full key union across all 106 entries, not sampled. So the restoration claims `kosherType: "kosher"` /
`kosherLevel: null` / `kosherAuthorityGroup: "unknown"` with `sourceUrl` and `lastVerifiedAt` — and asserts
**no** `kosherAuthority` and **no** `certifiedBy`. Restoring `mehadrin` by copying the 53 siblings would
have been the §5b fabrication arriving through a new door.

> An earlier draft of this line wrote `kosherLevel: "regular"` and it was withdrawn. `regular` is an
> affirmative level claim under `src/types/place.ts`'s own documented semantics, and the feed states no
> level — so writing it would have been a smaller version of the same fabrication. `null` is written
> deliberately, and is *not* this field's documented case either ("authority named, level not stated" —
> here neither is named). **The schema has no state for "kosher established, level and authority both
> unknown."** That gap is recorded, not silently resolved.

### 22d. The fabrication is a literal in the importer — and the importer is a hand-typed list, not a feed reader

`scripts/import-rebar.mjs` does **not** read Rebar's feed. It is a hand-typed array of branch objects
(name / city / address / lat / lng / hours), and `buildPlace()` stamps the same constants onto every one:

```js
kosherType: 'mehadrin',        // ← literal, unconditional, every branch
source: 'manual',
lastVerifiedAt: '2026-07-14',  // ← frozen constant
```

Its own header says the list was *"filtered by כשר label"*. **So a `kosher` label on the source site was
transcribed into the dataset as `mehadrin`, 52 times, by a constant in code.** §5b previously recorded this
fabrication as inferred from the data's shape; it is now proven at the line. The level was never derived
from anything — there was nothing to derive it from.

**This also answers "manual data vs. source handling": there is no Rebar ingestion to fix.** The machine-readable
feed §22b describes exists and carries a real per-branch `kosher` boolean (53 true / 53 false) — we have simply
never read it. An importer built on it could establish and *refresh* kosher-yes/no for all 55 records and would
surface any branch that flipped to `false`; it could never produce a level or an authority, which is the correct
ceiling. The hand-typed list can do neither.

`mergeInto()` is add-only (filters on existing ids), so re-running would not re-stamp existing records —
the frozen `lastVerifiedAt` is latent here rather than live. Do not generalise that to the other one-shot
importers.

### 22c. A fixture that could not detect its own bug

`parseIdentity()` in `pdf-extract.mjs` reversed **every** line of extracted PDF text, including purely
numeric ones — so a street number `64` was read as `46`, silently corrupting every address comparison with no
error raised.

**It survived because the existing fixture's street number is a single digit, where reversal is a no-op.**
The fixture matched, the assertion held, and the property was untested — because the test data was
*invariant under the defect*. §17 face 2 at its sharpest: not a fixture that matched nothing, but one whose
value could not distinguish correct from broken.

**The general rule: test data must be able to fail.** A fixture whose value is unchanged by the bug under
test proves only that the code ran. Choose fixture values that are asymmetric under every transformation the
code performs.

### 22e. The field-loss guard protects fields on *surviving* records — not records

The guard added at `validate-data.mjs:472` iterates the records present in the **current** file and compares
each against HEAD. A record that HEAD had and the current file does not is therefore **never visited**, and
none of its kashrut fields are ever checked.

Fired in five directions, not three:

| mutation | result |
|---|---|
| value → absent | **exit 1**, names record and field ✓ |
| value → explicit `null` | exit 0 ✓ — the intentional-unknown case, the one most likely to be subtly wrong |
| absent → absent | exit 0 ✓ |
| delete the whole record | exit 1 — but caught by the **count** check, not by this guard |
| **delete one record + add one** | **exit 0 — dataset OK** ← the hole |

The only record-level protection in the file is line 650, `counts.total < baseline.total`: a **count**, not an
id-set comparison. **This is §21's mechanism exactly** — `31f75274` removed 199 records under the subject
*"add לחם ארז (4 kosher branches)"*. **This guard would not have caught a single one of the 1,143.**

Not a defect in what was asked for (field-level protection was the requirement, and it is delivered and
uniform across all eight fields — there is no value branch, so `regular` and `mehadrin` are protected
identically, and a HEAD value of `null` is protected too, since `null !== undefined`). It is a defect in what
the guard's *name and failure message* imply. **The completion is an id-set comparison against HEAD**, and it
belongs on the §21 list rather than as a reworded message.

### 22f. `human-review` is an unconditional bypass of the level-assertion gate

`basisSupportsLevelAssertion` accepts `basis.kind === 'human-review'` without inspecting the note. So the
same basis object that honestly justifies *kosher, no level* would also unlock `mehadrin` if a future edit
changed the value — with its own note still reading "no level is stated", unread by the guard.

Same shape as the `aliasLevel` finding, with one difference that matters: that one had a registry to check
against. **`human-review` is the one basis kind that is unverifiable by construction** — it is the escape
hatch for the entire level-assertion mechanism, available to anyone who types it.

---

## 23. A guard's strength is a property of its call sites, not its body

### 23a. The instance

`basisSupportsLevelAssertion` (`scripts/shared/kashrut-write.mjs:158`) contains a caller-disagreement check:

```js
const entry = loadAliasMap().get(basis.alias);
if (!entry) return false;
if (entry.level !== basis.aliasLevel) return false;   // <- the branch in question
return entry.level === 'mehadrin';
```

It was described, while designing §22's successor guard, as defence in depth — *"even a guard that constructs
the basis carelessly cannot be fooled by its own bad input, so don't optimise the double lookup away."*

**Fired rather than read:**

| construction | result |
|---|---|
| derived basis — `aliasLevel` read from the same map, same key | **0 of 203** aliases can make the branch fire |
| lying caller — `{alias:'הרב לנדא', aliasLevel:'mehadrin'}` | rejected ✓ |
| lying caller — claims `regular` for a mehadrin alias | rejected ✓ |
| honest derived — null-level alias / mehadrin alias | rejected / accepted ✓ |

The branch is **unreachable from a derived basis** — not unreachable in general; it fires on both lying
shapes. That distinction is the whole point: a static scanner has no independent notion of the level, only
the string, so *derived is the only construction available to it* and the branch is dead in exactly the path
it was being credited for.

The verdicts are correct anyway. **The load-bearing line is the terminal `entry.level === 'mehadrin'`.** The
advice to keep the lookup also survives — but because the terminal check needs `entry`, not because the
cross-check is guarding anything there.

### 23b. The shape, which is new to this register

A **safety property** of the code was asserted from reading the function's body, without establishing which
branches a real caller can reach. The check was verified to *exist* and inferred to *protect*.

> **You cannot read a guard and know what it defends. You have to know which branches a real caller reaches.**

Same family as *the test exists* vs *the test runs* (§17 face 1) and *the frozen list has 83 entries* vs *the
scan finds 83* — but pointed at a single conditional rather than a file or a list. It reads as **more**
rigorous than those, not less, precisely because it involves having read the implementation. That is what
makes it hard to catch: it wears the costume of the diligence that would have caught it.

Every previous instance of this error in this repo was framed as *coverage* — which files, which records,
which scripts. This is the same error at the granularity of one `if`.

### 23c. Why it landed here specifically

It appeared **inside the countermeasure being built for §17 face 3**, asserted by the reviewer who had spent
the same session catching that face in others. That is §17 face 6 — a countermeasure carrying the hazard it
defends against — recursing one level.

Not a coincidence, and this is the part worth carrying forward: **a guard-building exercise is the exact
context in which "this construct protects you" gets asserted rather than fired**, because everyone involved
is already thinking in terms of protection. Suspicion is highest about the *subject* of the guard and lowest
about the guard's own machinery.

**Countermeasure:** when claiming a branch protects something, name the caller that reaches it. If the only
caller in the path constructs its input from the same source the branch compares against, the branch is
scenery.

---

## 24. The instrument was correct and its input was wrong — four times in one session

### 24a. The instances

| # | what was run | why the result was false |
|---|---|---|
| 1 | feed entry count | regex required a trailing `"open":(true\|false)`; **106** instead of 120 |
| 2 | probe for quote-bearing names | searched at 1 and 2 backslashes; the stream carries **three** (`\\\"`). Returned a confident **ABSENT** on names that were present |
| 3 | differential probe of the level guard | probes written to `C:\tmp`, but this shell's `/tmp` resolves to `C:/Users/User/AppData/Local/Temp`. **Both** probes came back "not flagged" — which reads exactly like a finding |
| 4 | design judgement on the guard's comment handling | the case list had **two of three** members; the missing one falsified the conclusion |

In every one the tool worked. The *thing it was pointed at* was wrong. Filed as four slips they look like
carelessness; filed as one shape they are a checkable habit.

> **Before trusting a result, name what the instrument was pointed at, and verify that separately from
> whether the instrument works.**

### 24b. The pair — this is §23 on the same axis, pointed the other way

```
§23   a guard's strength   is a property of its CALL SITES,          not its body
§24   a probe's validity   is a property of the SUBJECT SEEING IT,   not its contents
```

Neither is complete without the other, and both times the reasoning felt finished **because the artifact
itself was correct**. The guard's body really did contain the check. The probes really did contain the
violation. Reachability was assumed in both directions.

**The operational rule, which costs one extra file:** build the **positive control first** — a case the
subject *must* flag — and confirm it flags before believing anything about the real probes. Not alongside;
first. When the positive and negative cases return the same answer, **the instrument is broken, not the
subject**.

Instance 3 was caught only by luck: the control happened to be run in the same batch. Instance 2 was caught
only because 2 of 5 probes returned FOUND — had the probe set been narrower it would have stood as a clean
zero. See §17 face 5: the zero result is the one that hides itself.

### 24c. "Wrong in the appealing direction"

Instance 4 deserves its own note because the reasoning was not sloppy. The proposal — treat a null enclosing
object literal as a non-match, and delete the `/* */` stripper entirely — was genuinely elegant: one change,
two defects, less machinery, and it did cover the case the stripper was originally built for.

It was also **the outcome the proposer wanted**, and the check that would have falsified it was the one not
run. Probing found a third case (prose in a comment *between properties of a real object literal*) that has a
genuine enclosing block, so the null-block rule cannot reach it — and that the stripper is therefore
load-bearing.

> When a conclusion is both convenient and simplifying, the case you have not enumerated is the one that
> decides it. Enumerate before committing, not after.

### 24d. Why the loop caught these

Worth recording, because it is a property to preserve rather than a compliment. Adversarial review supplied
the pressure, but adversarial pressure alone would not have produced these: two parties each defending a
position would have surfaced none of them. What produced them is that **neither party was optimising for
having been right** — an architect overturned his own consolidation an hour after proposing it; a reviewer
surfaced a fifth copy of a constant *that he had written, under a different name*, while arguing that logic
must never be duplicated.

Adversarial review supplies the pressure. Willingness to be wrong supplies the direction.

---

## 25. A false positive whose reasoning is better than the true positives'

The level-assertion guard, run against prose in a `//` comment sitting between properties of a real object
literal, produces this:

> `"רבנות תל אביב"` resolves in the registry to level null, not mehadrin — the source names a body but does
> not state a level; the level here is inferred, not evidenced (exactly the §5b defect: 0 of 203 registry
> aliases were ever derived from a body).

About this record:

```js
kosherType: 'kosher',            // legitimate. no level claim at all.
certifiedBy: 'רבנות תל אביב',
```

The finding is **fully reasoned, alias-resolving, and cites the register** — and it is about a record that
makes no mehadrin claim. It assembled a credible violation from a sentence of prose plus an unrelated
sibling property. Its explanation is *more thorough than most of the true positives*, which often say only
"no certifiedBy at all."

**This is not a noisy guard, and severity should not be read as "noise".** This guard exists to drive one
remediation: *removing unevidenced level claims*. A false positive of this shape points that remediation at
a record that has none — and the resulting edit (strip the `certifiedBy`, or change the `kosherType`) would
damage a legitimate record **under a commit message that reads as correct and cites §5b**.

**The connection worth keeping:** the original fear was that a guard firing on all eight known scripts would
"train us to delete evidence-backed level claims." That fear was *misplaced for the eight* — none of them
held an evidence-backed claim. It is **exactly right for this failure mode**. The fear was correct; it was
attached to the wrong population.

Generalised: **judge a guard's false positives by what acting on them would destroy, not by how many there
are.** A single false positive that is credible, well-argued, and points at a deletion is worse than many
that are obviously wrong.

---

## 26. Agreement between two surfaces is evidence-shaped

The mechanism behind §24 and much of §17, stated directly rather than as another instance.

> **Two measurements agreeing does not mean they are independent. It means you will not go looking for a
> third — because corroboration and completeness feel identical from the inside.**

The condition that conceals a missing surface is **the system working correctly on the surfaces you do
have**. Nothing prompts the question.

### 26a. Three instances, one shape

| what agreed | what went unexamined |
|---|---|
| parsed feed count · the arithmetic that closed against it | **what the source actually contained** — 115 stood as complete against a 120-store feed |
| the script's stdout · the dataset it wrote | **its exit code** — 127 on every successful run, through 19 tests and a self-containment check |
| parsed-store count · `"kosher":` anchor count | **a store object with no `kosher` key at all** — invisible to both, because both are downstream of that key existing |

The third is the sharpest because the guard was *built specifically to catch a parse shortfall*, and its
docstring promises that a shortfall "must be loud, never silent." Measured against the live feed: delete the
`kosher` key from one store object and `parsed` and `kosherAnchors` **both** drop to 119 while `latitude`
and `address` stay at 120. The guard is silent. **The failure moves both surfaces equally, so their
agreement is preserved — and their agreement is the entire check.**

### 26b. The test that distinguishes a real second surface from a shared one

Not "are these two different numbers?" but:

> **Name a failure that moves both. If one exists, you have one surface measured twice.**

**And the test is only meaningful against a named defect class.** A pair that passes for one defect fails
for another, so "is this a real second surface?" is not a question with a yes/no answer — it has an answer
per defect. Name the class before applying it.

Worked through on this guard. Perturbations against the live feed, measured not reasoned:

| perturbation | parsed | `kosher` | `latitude` | parsed-vs-`kosher` | `kosher`-vs-`latitude` |
|---|---|---|---|---|---|
| `kosher` key removed from one store | 119 | 119 | 120 | **silent** | **THROW** |
| `latitude` key removed from one store | 119 | 120 | 119 | **THROW** | **THROW** |
| both keys removed | 119 | 119 | 119 | silent | silent |
| partial object corruption (`address`..`kosher` slice removed) | 119 | 119 | 119 | silent | silent |
| **whole store object removed** (true closure, 561-char span) | 119 | 119 | 119 | silent | silent |

Row 1 is why the cross-key check was added. **Row 2 is the correction**: a missing `latitude` is already
caught by the original parsed-vs-`kosher` comparison. The two checks are not redundant — they cover
*opposite* defects.

**So the earlier claim that `latitude`-anchors are "a second surface for parsed-count" was wrong, and wrong
in this entry's own way.** Apply §26b to the pair (parsed, `latitude`) and name a failure that moves both:
removing a `latitude` key does exactly that — row 2 measures it. That pair fails the test just as
(parsed, `kosher`) does.

> **It is the triple that passes, not any pair.** Neither anchor is a second surface for parsed-count on its
> own. What works is that the two anchors are second surfaces **for each other**, so any single-key defect
> leaves one disagreement standing. **Coverage is a property of the set, not of any member of it.**

That correction matters because §26b is written to be reused. Someone applying it later to
(parsed, `latitude`) would get a clean pass and stop — having done the identical thing §26a documents, one
substitution over, inside the entry that warns against it.

### 26b-i. The remit boundary — stated, because a known boundary is load-bearing

The last three rows are one reading. **Three distinct events — dual-key loss, partial object corruption, and
a legitimately closed branch — all produce `119/119/119` on the guard's three surfaces**, and no count-based
check separates them.

That is §26c holding, not failing: the guard is blind exactly where the world is entitled to change the
quantity. Recorded as a **boundary of the remit**, not a gap to be closed — because a boundary someone has
examined and named is load-bearing in a way an unexamined one is not, and the next person to notice the
blind spot should find the reasoning already here rather than re-derive it and propose a floor.

**A wider key set is explicitly declined, and here is the reason so it is not re-derived.** Under *partial*
corruption the surviving keys do move differently — `forceClose` and `open` stayed at 120, `name` at 159 —
so more keys would separate partial corruption from a closure. But a **closure moves every key equally**, so
no key set of any size separates a closure from anything. The only class a wider set buys is one that is
contrived for a single-document fetch, and the cost is real: more keys that may begin occurring outside
store objects the way `name` already does at **159**. Leave it at the triple.

### 26b-ii. A probe with no inconclusive state cannot report the thing you most need to hear

The row-4 correction exists because the probe that produced it had somewhere to say *"I did not measure
this."*

Its first object-boundary search returned **INCONCLUSIVE — boundaries not found**. Cause: `K()` builds
*regex source*, where `\\"` denotes one literal backslash; passing that string to `lastIndexOf` searches for
**two**, and the raw text has one. The escaping trap again — in a probe written by someone who had spent the
previous two messages on escape depth in this same file.

That probe printed `INCONCLUSIVE` instead of falling through to a default or reporting a plausible number.
Had it defaulted, it would have produced a second wrong row that agreed with the first — §26a's exact
mechanism, since the surface being read would have looked consistent.

> **Build the inconclusive branch before the result branch.** A probe that can only return answers will
> return one when it has measured nothing, and that answer will be shaped like every other answer it gives.

This is the positive form of §17 face 5 and §24: a zero or a plausible number conceals itself, but an
explicit *"not measured"* cannot. It is the cheapest of the countermeasures in this register — one branch —
and it is the only one that reports its own failure rather than requiring someone else to notice it.

### 26c. Why "count a second key" is the fix and a floor is not

A **floor** (`stores.length >= N`) was proposed four times and declined. It cannot separate a parse shortfall
from a branch legitimately closing — the two are indistinguishable by magnitude. Set it at 120 and it
false-fails the first closure; set it at 100 and it misses 115. **No threshold does the job**, because the
quantity it measures is one the world is allowed to change.

A **cross-key comparison** measures the same document against itself. It is immune to legitimate change
(a closed branch removes every key equally) and exact on parse failure (a defect in one field's handling
moves one count and not the other). Prefer self-consistency checks over threshold checks whenever the
quantity being guarded is one the source is entitled to vary.

### 26d. Note

The four escalations of the floor proposal happened because a reader took lines 93-100 of `rebar-feed.mjs`
— **the docstring of `countStoreAnchors`, the function that implements the countermeasure** — as a
description of something absent. §17a in miniature: prose adjacent to an implementation read as prose
instead of an implementation. Worth knowing that the failure runs in this direction too, not only toward
false comfort.

---

## 27. The control and the probe were not the same experiment

Distinct from §24. There the instrument could not see its subject. Here the instrument worked, saw its
subject, and **was compared against something that differed in more than the variable under test**.

### 27a. Four instances, one session

| probe | control | the unclassified second difference |
|---|---|---|
| level guard vs a `mehadrin` literal in a template literal → **0** | same literal as a string value → **1** | the template case had **no enclosing object literal**; the string case was inside `{ … }`. Nearly reported as a template-shaped evasion path in the guard |
| top-of-file prose probe, expected to isolate the null-enclosing-block rule | — | `stripComments` already removed the text **before** the null-block rule could matter, so sabotaging that rule left the probe green. The probe tested a different mechanism than it claimed |
| differential probes for the string-blind stripper → both "not flagged" | each other | both written to a directory the guard never scans (§24 overlap — but the pair *agreed*, which is what made it read as a finding) |
| `/*` in a string, no later `*/` → violation survives | `/*` in a string **with** a later `*/` → violation eaten | the closing delimiter, which had not been classified as part of the fixture at all |

### 27b. Why re-checking the instrument does not catch it

> **In every instance the probe was correct.** Re-reading it passes. The defect was in what it was compared
> against — and in three of the four, the second difference had not been classified as a variable at all.
> An enclosing object literal, a text position, a closing delimiter: all read as *context*, not as *inputs*.

**Countermeasure:** state what differs between control and probe **out loud**, and confirm the difference is
only the variable under test. Not "is my probe right?" — it is — but **"is my control the same experiment?"**

### 27c. Placement in the family

```
§17 f.1  the test does not run
§17 f.5  the zero result conceals itself
§23      the guard's strength is in its call sites, not its body
§24      the probe's validity is in whether the subject can see it, not its contents
§26      two surfaces agreeing is evidence-shaped
§26b-ii  a probe with no inconclusive state cannot report having measured nothing
§27      the control and the probe were not the same experiment
```

All seven are one question asked at different points: **what would have to be true for this check to pass
while the thing it guards is broken?** §27's answer is the least visible, because everything the prober
wrote is correct.

---

## 28. The working tree and a fresh checkout differ in bytes for every tracked text file

`core.autocrlf=true` locally, **no `.gitattributes`**. A file written directly by an editor or tool keeps
**LF** in the working tree; a *fresh* checkout of the same committed blob — a worktree, a clone, CI on
another machine — receives **CRLF** via autocrlf's conversion.

Measured across the files the guards and tests read:

| file | CRLF | bare LF |
|---|---|---|
| `scripts/import-rebar.mjs` | 0 | 289 |
| `scripts/shared/rebar-feed.mjs` | 0 | 293 |
| `scripts/shared/kashrut-write.mjs` | 0 | 231 |
| `scripts/shared/level-assertion-guard.mjs` | 0 | 300 |
| `scripts/shared/kashrut-conflict-resolution.mjs` | 0 | 290 |
| `scripts/validate-data.mjs` | 0 | 694 |

**Every one is pure LF on disk and CRLF in any fresh checkout.** This is not a property of one file; it is
the standing state of the repo.

### 28a. How it surfaced

`import-rebar-write.test.mjs` matched a multi-line **literal** — `'} else {\n    const newPlaces = …'` —
against content read with `readFileSync(..., 'utf8')`, to locate its sabotage anchor and to assert the
tracked file was untouched. In the working tree the literal matched. In a fresh worktree the same commit's
file is CRLF, so the `'\n'`-joined literal **silently failed to find itself**, and `npm run verify` exited 1
in the worktree minutes after passing clean in the main checkout.

Fixed by normalising `\r\n` → `\n` on both reads before matching. Verified: the surviving literal at
`import-rebar-write.test.mjs:256` is preceded by that normalisation on line 254.

### 28b. The general rule

> **Any check that matches a multi-line literal against a tracked file's content is checkout-dependent.**
> Normalise line endings before the comparison, or the check means something different in the working tree,
> in a worktree, in a clone, and in CI.

Repo-wide scan for the pattern — a file read combined with a literal containing `\n` — found no other
tracked-source site. The remaining hits (`apply-radak-tehillim.mjs:71`,
`generate-kashrut-evidence-reports.mjs:167`, `update-pizza-shemesh-hours-urls.mjs:47`) `split('\n')` on
*fetched* text and trim afterwards; `level-assertion-guard.mjs:175` tests a single character, and `\r\n`
still contains `\n`, so its state machine terminates line comments correctly — confirmed by 24/24 passing in
a CRLF worktree.

### 28c. This is AGENTS.md's own warning, arriving through a test

The repo's standing rule is *green in the working tree ≠ the commit is valid*, and its recorded instances
were **missing symbols** — `876a562` importing `isFoodType` that lived only in an untracked file, `78209ae`
reading a field never declared in the commit.

**This is a third mechanism for the same failure, and it needs no untracked file and no missing symbol.**
The commit is complete and self-contained; the *bytes on disk* differ between the two checkouts. A
self-containment check that only looked for missing dependencies would have passed it.

### 28d. The root fix, not taken here

A `.gitattributes` with `* text=auto eol=lf` would make every checkout consistent and remove the class. It
is **not** done as part of this work: it renormalises line endings across every tracked text file in the
repo, which is a large diff touching everything and deserves its own change and its own review. Recorded as
the real fix, deliberately deferred — not overlooked.

---

## 29. The unevidenced-level population splits 501 / 196, and the axis is "is a certifier named", not "is it a chain"

Post-`880e48d` measurement of records asserting a mehadrin-family level whose accompanying text states no level:

| | | operation |
|---|---|---|
| **697** | target population | — |
| **501** | **name a real certifying body** | remove the level assertion · **`certifiedBy` / `kosherAuthority` must survive untouched** |
| **196** | name nothing at all | the Rebar shape — fetch a source, write `kosher` / `null` / `unknown` |

**These are two different operations, not one operation over two groupings.** The 196 is exactly the baseline
of the `levelAssertedWithNoBody` ratchet, and that agreement is the check that the axis is right.

### 29a. `!certifiedBy` is not "no certifier" — there is a second namespace

An inventory built on `!certifiedBy` alone returned **433 / 264**, off by 68 in both directions. The real
predicate is `!certifiedBy && !kosherAuthority`.

The 68 have **no free-text `certifiedBy` and a populated structured `kosherAuthority`**: 61 ×
`badatz_beit_yosef`, 3 × `rabbinate_jerusalem`, 2 × `badatz_rubin`, 1 × `badatz_edah_hachareidis`, 1 ×
`badatz_kehilot`. Every one names a real body — in the other field.

> **Two fields carry "who certifies this", and checking one is not checking the question.** Any predicate
> about whether a certifier is named must read both, and the ratchet's own predicate is the reference.

### 29b. The near-miss it produced — 99 records, one pass

The first inventory classified the largest chains as the clean Rebar shape — *"zero `certifiedBy` text"*.
Measured:

    pizza-shemesh.co.il   99 records   99 named   בד"צ בית יוסף ×59 · העדה החרדית ×23 · הרב לנדא ×8
    pizzahut.co.il        21 records   21 named
    iburgerim.co.il       21 records   16 named   בד"ץ בית יוסף
    cafecafe.co.il        10 records    8 named

A Rebar-shaped write against that list would have overwritten up to **99 named-certifier records with
`kosherAuthorityGroup: 'unknown'` in a single pass** — deleting real, specific badatzim and replacing them
with "we don't know." Directly against principle 8: *a refactor must not silently erase factual kashrut
information.*

**The classification error and the destructive operation pointed the same way**: the records it mislabelled
as having no evidence are precisely the ones carrying the most. Caught by re-deriving the inventory rather
than sequencing work from it.

### 29c. Chain membership by id and by domain are different sets

`golda` by id-prefix is **32**; only **10** carry `goldaglida.co.il`. Legacy numeric ids carry no prefix at
all (pizza-shemesh, pizzahut), so id-grouping strands them and domain-grouping finds them.

Both matter and neither substitutes: **the id defines the chain, the domain defines whether evidence is
reachable.** Report both. Of the 196, **16 have no website at all** and 8 more point only at
Instagram/Facebook — unreachable regardless of which chain they belong to, and the honest test of whether a
classifier can say *"no source exists"* rather than filing them under the expected answer.

### 29d. The 10 that are not fabrications

`707 − 697 = 10` — records whose `certifiedBy` text contains a level word but is **not a registered alias**
(`בד"ץ מהדרין ירושלים` ×3, `רבנות ב"ש מהדרין`, `בד"ץ ביתר / מהדרין`, …). Real bodies, real level words,
unregistered spellings. **An alias-registration backlog, not a remediation target.** Same 10 as §26c.

---

## 30. The write vocabulary and the display vocabulary were never bound to each other

Owner's own question, verbatim: *"are we testing end to end, or is the data racing ahead of the app?"*
Measured rather than reassured. **They were right, and the gap was already live in production**, unrelated
to anything greg was about to write.

### 30a. `getKosherLabel` (`src/utils/kosher.ts`) rewritten as a discriminated union — `KosherBodyState`,
9 variants (10 after §30c), `classifyKosherState()` classifies, `renderBodyState()` renders through an
exhaustive `switch` with no `default` — a variant added with no display case is a `tsc --noEmit` failure,
gated in `verify` and CI, not a silent runtime fallback. Two independent proofs, both sabotage-tested
(added/removed a synthetic variant → typecheck failed naming it; broke one real renderer branch in a
detached worktree → both the compile-time example test and a runtime dataset-derived test failed naming
real record ids). Body (who certifies) and level (what the source claims) are kept as separate axes per the
owner's ruling in §31 below — never merged into one field or one displayed phrase.

### 30b. `badatzGroup` is dead code today, the same shape as `SOURCE_STATES_A_LEVEL` (pipeline side, Item 4
Unit 3) — a variant the type declares and the exhaustiveness check protects, that zero real records reach.
Every record with `kosherAuthorityGroup:'badatz'` and no `certifierId` ALSO has `kosherAuthority` set to a
value the legacy map (`LEGACY_AUTHORITY_LABEL`) resolves, so `legacyAuthority` wins precedence first — found
by a sabotage of `badatzGroup`'s renderer that unexpectedly stayed green, then investigating why instead of
adjusting the test. **Two dead variants now, in two different files, both because an earlier branch in an
if/else chain always wins first.** Kept, not deleted — the exhaustiveness guarantee is worth more than the
dead-code tidiness, and which branch reaches which record can change without warning.

### 30c. The `certifiedBy`-evidence-loss population — 67 of 85, not 85 of 85

Original count: 85 food records rendered NO kashrut label at all (`classifyKosherState` → `'none'`).
**67 of those 85 carry real evidence in `certifiedBy`** (verbatim certifier text — "רבנות מקומית"×27,
"רבנות תל אביב"×7, "רבנות ירושלים"×7, "בד\"ץ יורה דעה"×2, "בד\"ץ העדה החרדית"×1, "הרבנות הראשית לישראל"×1,
and 10 more distinct strings) that `classifyKosherState`'s input `Pick<>` didn't even include — the field
was never read. Only **18 are genuinely evidence-free**, and all 18 are `manual-winery-*` records.

This corrected an owner ruling already in flight: "85 records with no kashrut evidence" had been reported
and the owner had ruled that no-evidence means not-kosher. Acting on that would have marked 67 businesses
non-kosher **that name a certifying body in their own record**, including a בד״ץ — the same defect as the
greg מגדל העמק / גן העיר אשדוד finding on the pipeline side (Item 4 Unit 3, 2026-08-27: a body named on the
page went unread because the instrument checking for one didn't look correctly), one layer further out: the
evidence was there and the reader never looked.

**Split of the 67, independently confirmed twice:** 26 resolve to a real registered authority via the
registry's alias table (`scripts/reports/kashrut-registry.json`, outside `src/`); 37 are generic terms the
registry's own alias table marks `authorityId: null` ("רבנות מקומית", "כשרות מקומית", "כשר", "רבנות" —
not real body names); 4 have no alias entry in the registry at all.

**Fix shipped is NOT the full resolution** — `authority-normalize.mjs`'s registry-backed resolver lives in
`scripts/`, outside both Metro's bundle root and jest's `roots: ['src']`, so it cannot be imported from
`src/utils/kosher.ts`. Building a second, parallel resolver against `src/data/kashrut/authorities.ts`'s 81
authorities was considered and rejected — it cannot express the registry's `authorityId: null` exclusion
(no alias table exists in `src/`), so it would either miss real matches or risk treating a generic term as a
resolved body, reproducing the exact defect the shared normalizer exists to prevent (two instruments
answering one question).

**Owner ruling, verbatim: "אם לא ידוע יש להציג כשר כשרות מקומית."** Applied here: display `certifiedBy`
VERBATIM, in the same slot as the unknown-floor, whenever nothing else resolves — no `kosherAuthorityGroup`
inferred, no `certifierId` implied (`KosherBodyState`'s `verbatimText` variant). For 37 of the 67 this is not
a weakened fallback — those records' own text already literally reads "רבנות מקומית" / "כשרות מקומית", which
IS the owner's specified floor phrasing, arriving from the record's own text instead of the app's fallback
string. For the other 30 it surfaces a real body name the source stated, unresolved but not discarded.
`kind=none` moved from **85 → 18**, all 18 confirmed `manual-winery-*` by an assertion, not a log line.

**Resolving the 26 registry-matchable records into real `certifierId`/`kosherAuthorityGroup`** (not just
verbatim display) is a separate, smaller, deliberately-deferred data-layer write — same shape as the
greg/rebar pipeline, backup + dry-run + `data:validate` required. Explicitly NOT started under this section;
raised to the owner alongside the 18-winery evidence-free population as two separate decisions.

### 30d. A census-aggregation bug found twice, same root cause, in two different tests written by two
different sessions on the same day — grouping records by a "shape key" that omits a field the test is about
to read a per-record property off of. First instance: this file's §29's `!certifiedBy` vs `!kosherAuthority`
miss. Second instance, live in the new binding test: `shapeKey()` didn't include `certifiedBy`, so a
representative `example` stored once per shape (which happened to have `certifiedBy` set) had its property
applied to the shape's whole `count` — reporting 85/85 "carry certifiedBy" before the bug was caught by
cross-checking against an independent per-record count. Fixed by iterating every real record directly for
that specific aggregation, never a deduplicated-shape map, whenever the property being counted isn't part of
the key the map was grouped on.

### 30e. A third instance of the same lesson, found by watching the mechanism rather than reading it

`scripts/shared/__tests__/ratchet-corrections.test.mjs`'s own first draft had a test named "a leaving id that
STILL satisfies the predicate fails." Its fixture helper built the override with a shallow merge —
`{...base.get(id), ...patch}` — so a caller trying to STRIP a field (pass a replacement object that omits
`kosherAuthorityGroup`) never actually stripped it: the base record's value survived underneath the spread.
The test asserted a failure, got `null`, and the assertion caught it — but only because the test asserted
against the *return value*, not because anyone read the fixture and noticed the merge was wrong. Fixed by
making the override a wholesale replacement, not a patch. Same root defect as §30d (grouping/merging logic
that quietly preserves a field the test believes it changed), same discovery method (the mechanism disagreed
with expectation; investigating why, not adjusting the assertion, found it) — three instances now, by two
sessions, in one day, across three unrelated files.

### 30f. A fourth instance — a chain-detection audit that grouped Hebrew branch names by splitting on a
dash, produced a confident zero, and was wrong

Auditing the Reviewer's own chain-propagation finding on the Stage 2 26-record set (Item 4 Unit 3 follow-up,
2026-08-27): the audit instrument grouped record names by splitting each on `-` to isolate a business name
from its branch/location suffix. Hebrew branch names on this dataset append the location directly, with no
separator (`"סושי רחביה רחביה"`, not `"סושי רחביה - רחביה"`) — so every name split into exactly one group of
one, and the instrument reported "26 distinct names, 0 chains." Printing the 26 names verbatim instead of
trusting the grouped count showed **17 of 26 are branches of 6 businesses**, each sharing an identical
`certifiedBy` string, with no date and no `sourceUrl` on any of them.

Same root defect as §30d/§30e: a grouping key that silently fails to capture the real structure of the data
it's grouping, producing a well-formed, confident answer instead of an error. The specific new wrinkle is
§17's "0 is not obviously wrong" face, arriving a second time in this same file's own history (see the
`docs/KASHRUT_FACTS.md`-referencing warning in AGENTS.md about a full-repo path scan that returned "0" on a
6-file positive population) — a wrong non-zero number invites "why is this so high/low?"; a wrong zero looks
like a completed, clean audit. The session that built this audit instrument had, twenty minutes earlier, told
a peer that "a number without its predicate is what produced three different answers to one question today"
— and then produced a self-concealing zero from a different, unstated assumption (a separator that isn't
actually used in the data) in the very next check.

**Binding condition this produced**, carried forward into whenever the 26-record write is queued (not yet
approved to run): the write must set `certifierId` and `kosherAuthorityGroup` **only**. `certifiedBy`,
`lastVerifiedAt`, and `sourceUrl` must be provably unchanged in the dry-run diff. 23 of the 26 records have no
date and no source at all — writing a fresh `lastVerifiedAt` alongside the authority fields would manufacture
provenance for exactly the records that currently have none, the fabrication-in-the-opposite-direction shape
already ruled out for the winery records (§ the winery display measurement, Item 4 Unit 3, 2026-08-27).

See §31 for the same lesson (predict, then verify against the real thing, not against what you expected to
find) recurring at the ratchet-arithmetic level rather than the grouping-key level.

---

## 31. Predicting a ratchet movement in advance is necessary and not sufficient — a run that matches the
prediction is evidence about the prediction, not about the output

Item 4 Unit 3's greg write (41 records) moves three ratchets. Both reviewing sessions stated numeric
predictions before running, per this project's own discipline. The scorecard:

    levelAssertedWithNoBody     196 → 158   BOTH predicted this correctly, in advance.
    kashrutAuthorityUnknown    1183 → 1184  BOTH predicted wrong (flat or -2) on the first pass — the
                                            widened-scope correction (3 fabricated `rabbinate` records
                                            returning to the `unknown` bucket) was missed by both sessions
                                            independently, then caught by one of them BEFORE the run,
                                            through re-derivation, not through running anything.
    freeTextCertifierUnmapped  1560 → 1562  NEITHER session predicted this at all. Found only by actually
                                            running `--apply` against the real pipeline output in a
                                            disposable worktree and reading `data:validate`'s result —
                                            not by reasoning about the pipeline's write shape in advance.

**The lesson is not "predict harder."** Both sessions reasoned carefully about `kashrutAuthorityUnknown` and
were still wrong the same way, because the arithmetic each did was scoped to the population each already had
in mind (the 38 mehadrin-claim records) and neither extended it to the 3 rabbinate records the SAME commit
also touches. A prediction is bounded by what the predictor thought to include. Execution is not — the actual
`--apply` output and the actual `data:validate` run touch every field on every record, including the ones no
one was thinking about when they wrote the prediction down.

**This is §17 face 4, restated against the reviewers instead of the implementation being reviewed:** a check
that only asks "does the result match what I expected" cannot surface a consequence outside that
expectation's scope — it can only confirm or deny the scope it was given. `freeTextCertifierUnmapped` was
never wrong to move; it was invisible to the question being asked, because the question was "does this match
my prediction," and no one had predicted anything about that key. The fix that generalizes: state the
prediction, then run the REAL thing anyway (the real pipeline, the real validator, a disposable copy of the
real dataset) rather than stopping once the predicted keys match — a match on the keys you thought to name
is not evidence the run had no other effects, only that it had none among the effects you were watching for.

See §30e for a smaller instance of the identical structure inside the very mechanism built to catch this
class of error: a test's assertion passed, which felt like verification, but the fixture backing the
assertion wasn't testing what its name claimed until someone noticed the mechanism disagreeing with intent.

## 32. `restaurants.osm.json` is a write target with no `src/` readers — 900 of its 953 shared ids have
drifted from `places.osm.json`

Found live, 2026-08-27, while scoping the Item 4 Unit 3 Stage 2 dry run: a population count taken across
both `places.osm.json` and `restaurants.osm.json` (165, resolving 102) did not match the same predicate run
against `places.osm.json` alone (67, resolving 26) — the same gap the original 85/67 census measured on the
display side, reappearing on the write side for an unrelated reason.

    places.osm.json      : 7471 records
    restaurants.osm.json : 1337 records
    ids present in both  :  953
      diverging on ≥1 kashrut field : 900

Example: id `9000000` ("פיצה שמש", אופקים) exists in both files. In `places.osm.json` it carries
`kosherAuthorityGroup: 'rabbinate'`, `kosherLevel: 'mehadrin'`, `kosherType: 'rabanut_mehadrin'` — fully
remediated. In `restaurants.osm.json` it carries none of those fields — bare `certifiedBy` only, the
pre-remediation shape. Same id, same real business, two different kashrut states depending which file is
read.

**`src/` only imports `places.osm.json`.** `OsmPlacesRepository.ts` is the sole repository reading generated
data, and it loads `places.osm.json` + `cities.osm.json`. `restaurants.osm.json` has no reader anywhere in
`src/`. It is, however, a live write target: every kashrut remediation script writes it alongside
`places.osm.json`, `validate-data.mjs` validates it, and a ratchet (`restaurantsLevelAssertedWithNoBody`,
baseline 221) tracks it — full machinery maintaining a file the app never loads.

This is the exact hazard argued against an archive-file proposal weeks earlier in this same effort (see
AGENTS.md's own §-level warning on "a file enforces its own inertia through absence of readers"): nothing
fails when `restaurants.osm.json` drifts from `places.osm.json`, so it drifted — 900 records deep, silently,
while every check on both files stayed green, because no check compares the two files to each other.

**Not resolved here.** Whether to sync, freeze, retire, or otherwise reconcile `restaurants.osm.json` is a
data-integrity decision escalated to the owner, not decided by either reviewing session. Until it is decided:
any population count or ratchet reasoning that spans both files is unreliable, and `places.osm.json` alone is
the correct source for any question about what the app actually shows.

## 33. `apply-kashrut-authorities.mjs` is committed, tracked, and has never run successfully against the live
dataset

Found live, 2026-08-27, while checking whether this script (committed at `ff2b3fc`, `ae5af17`) was the right
instrument for the Item 4 Unit 3 Stage 2 dry run. Running it in dry-run mode against the real
`places.osm.json` crashes immediately:

    SyntaxError: Unexpected token '﻿', "﻿[\n  {\n   "... is not valid JSON
        at JSON.parse (...apply-kashrut-authorities.mjs:64:23)

Both `places.osm.json` and `restaurants.osm.json` carry a UTF-8 BOM (`EF BB BF`) at byte 0 — confirmed
directly, not assumed. `validate-data.mjs` and `kashrut-pipeline.mjs` both already strip it
(`raw.replace(/^﻿/, '')`, 4+ call sites) before parsing. `apply-kashrut-authorities.mjs`'s own
`JSON.parse(readFileSync(PLACES, 'utf8'))` at line 64 does not — the one script in this family missing the
strip, and specifically the script its own commit message (`ff2b3fc`) describes as "the script that will
actually perform Batch B's dataset write."

**Left uncorrected, on instruction.** A tracked, committed script that crashes on the first file it opens,
for a dataset write its own header calls out as important enough to migrate onto `recordKashrutWrite` ahead
of the other two live scripts, is a finding about how it was verified before commit — not a bug to quietly
patch into working order while investigating something else. It is also out of scope for Item 4 Unit 3's
Stage 2: its header describes a broader Batch-B operation (whole-dataset `certifiedBy`, exact-string alias
match only, also sets `kosherLevel`) — a different job from Stage 2's narrower verbatimText-population
resolution (§30c, §33 population = 67, not this script's full-dataset scope). Do not repurpose it and do not
fix it without separately deciding it is back in scope; whoever committed it apparently never ran it
end-to-end against the real dataset.

---

## Superseded numbers — do not requote

| Wrong | Correct | Why |
|---|---|---|
| RECOVER 208 / 260 / 298 / 503 | **529** | proxies over `kosherType`; see §4 |
| protected baseline 910 | **902** | 8 contradicting records were inside it |
| "~164 certs lapse 2026-09-11" | **152 lapse; 12 already expired** | 164 is the cumulative total after |
| reviewQueue bypass = 20 records | **103** | 20 counted only `kosherAuthority` |
| contradictions = 358 | **10** | filter wrongly flagged badatz/named-rav records that legitimately imply mehadrin |
| "PlaceCard bypasses `getKosherLabel`" | **inverted** | the card calls it; the *detail screen* never does |
| "9 misleading source strings" | **113 deferred** (9 = worst subset) | scope vs illustration |
| humuseliyahu identity-discarding = 59 | **6** | 52 of the 59 have `certifiedBy: "מהדרין"` — no body to recover |
| §5b unlicensed share 75.7% (545/720) | **51.2% (369/720)** | conflated "no body" with "no level"; see §5b |
| "288 / 352 / 82%" for the body-less mechanism | **still unverified — do not quote** | relayed from an outside critique, never re-derived; population undefined |
| "11 body-less mehadrin aliases" | **9** | alias count, relayed unverified |
| getKosherLabel changes 720 records | **545** | 175 were gershayim-only artifacts of the simulation; see §6 |
| migrate-kosher-fields.mjs guard blind spot = 614 | **633** (no certifiedBy, MAP-enrichable) / **111** (of those, named authority) | 614 is Phase 1's category-4, a different predicate (requires already-enriched) |
| B1.2 level-guard population = 204 ("site B") | **845** carry a level-asserting `kosherType`; **343** of those violate the general predicate today | 204 is a historical site-B-only count inside the 358; the choke point governs the general population, not one historical mechanism; see §13 |
| B1.2 starting writer list = golda / coffeetrail / rebar / apply-chains-research | **82 files** (the completeness test's own scan, frozen — 83 before apply-kashrut-authorities.mjs was migrated to the helper); only rebar of the four is a real literal writer at the claimed path | `scripts/import-coffeetrail.mjs` doesn't exist (real: `importers/coffee-carts/scrape-coffeetrail.mjs`); golda/coffeetrail assign dynamically, not literally; ~71/29+42/62 were each superseded estimates, not the scanned count; see §13 |
| `kosher.ts:138` null/undefined parity (assumed safe by analogy to certifierId) | **unsafe** — falls through to the legacy `kosherType` label, which still asserts the withheld claim | see §14 |
| `restaurants.osm.json` fabricated dates = 29, cliff date ×13 | **30**, cliff date **×14** | 29 is the subset also present in `places.osm.json`; one record is an orphan. See §18d |
| "lifting `no-stripped-fields` closes the content gap" | **it does not** — union-of-keys, so stripping a field from all-but-one record passes | see §18b |
| "zero-tolerance kashrut guard on the overwrite; guard what is never legitimate" | **unsatisfiable** — 58 reproducible records already carry kashrut fields, so it blocks 100% of legitimate runs | see §18b-i |
| `restaurants.osm.json` is a redundant mirror | **384 records exist only there, 205 with kashrut**; 150 `kosherType` + 101 `certifiedBy` disagreements | see §18e |
| "covering the file in `validate-data.mjs` is an owner decision" | **a ratchet, baselined at current counts** — the repo already does this at `levelAssertedOverNamedBody: 343` | see §18c |
| "the mirror is stale rather than independent" | **two claims** — `certifiedBy` 93% stale (holds), `kosherType` 49% (fails, 77 independent) | see §18e-i |
| merge carve-out = 5 records | **13** — 6 the validator's predicate can see (incl. `humus-eli-…הר-חוצבים`, missed at first) + 7 it cannot | see §18e-ii |
| `levelAssertedOverNamedBody` covers the whole "invented level" population | **343 of 398** — the predicate is a proxy blind to vague text | see §15a |
| `extract-cert-expiry.mjs` "caches PDFs and never invalidates" (`DATA_ARCHITECTURE.md` §3.2) | **fixed** — `isCacheStale()` + `--refresh`; the 152 cliff certs are already inside the default 60-day window | corrected in `DATA_ARCHITECTURE.md` |
| `kosherAuthority` places-has/mirror-lacks = 201 vs 204 | **both** — 204 where the mirror lacks the *key*; 201 where places holds a *non-empty* value | different predicates, not a discrepancy |
| `levelAssertedOverNamedBody` = 302 (looked like 41 records of ratchet slack) | **343**, matching baseline exactly | a hand-copied `FOOD_TYPES` with 4 of its 8 members; see §17 face 3 |
| "84 unguarded writers of `restaurants.osm.json`" | **not established** — the scan tests "mentions the file AND writes *something*" | 88 referencing / 4 guarded is sound; the writer count needs a narrower test |
| "9 records reference 8 localities missing from `cities.osm.json`" (as a live figure) | **true only AFTER `import-food.mjs` runs**; live today it is **0** | a prospective measurement carried as a live one; see §19d |
| "the 9/8 was a conflation of the 8-no-cityId mikvehs and the 9-unreferenced cities" | **wrong diagnosis** — the 9/8 is real and reproducible in the post-import state | filing it as a conflation would teach re-derivation, which is what destroys this finding |
| "the only way to add a locality is the destructive rebuild" | **five writers rebuild the list**, plus `fix-orphan-cities.mjs` as a safe maintained path | see §19a |
| `unknownCityId` is "structurally incapable of failing" | **overstated** — it was driven to 9 in a worktree; it is blind *to rebuilding writers* | see §19b |
| "0 records have ever been removed from `places.osm.json`" (asserted **three times**) | **1,143 removed and never restored under the same id**; ≤560 with no successor | `commit^` through `cmd.exe` resolved to the commit itself; see §21c |
| "commit `7b1a1b7` removed nothing" | it removed **197** | same `^` defect |
