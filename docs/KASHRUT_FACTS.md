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
Fix: `extract-cert-expiry --refresh` after 2026-09-12.

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
