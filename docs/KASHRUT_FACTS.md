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
4. **A matched prediction is not a passing check.** Predicting an output's *shape* and hitting it says
   nothing about the output's *validity*. Any run that produces a dataset must be followed by
   `data:validate` on the produced dataset, not by a comparison of counters.
5. **Validate the instrument against a known positive before believing a zero.** Not by re-running it —
   by opening one file you are already sure is a hit and confirming the scan sees it.

**And the meta-rule, which is the only one that generalises:** ask what would have to be true for this check
to pass while the thing it guards is broken — then go and check *that*. Every one of the four above answers
that question in a single sentence, and none of them was found by reading the check.

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
| **absent from `places.osm.json`** | **384** (osm 227 / manual 157) |
| …of those 384, **carrying kashrut claims** | **205** |

For the 953 shared records — fields the mirror has and `places.osm.json` **lacks**:
`certifiedBy` 36 · `certificateValidUntil` 29 · `kosherType` 4.
Fields where the two files **disagree**: **`kosherType` 150 · `certifiedBy` 101.**

**Three consequences:**

1. **"Retire" as a bare option is off the table.** Retiring loses 384 records including 205 kashrut claims —
   a direct violation of additive-only. The real options are *merge-then-retire* or *keep-and-validate*, and
   **both require the §18b-ii merge**, which is why specifying that merge does not pre-empt the decision.
2. **150 `kosherType` and 101 `certifiedBy` disagreements have never been adjudicated.** A merge must not
   silently resolve them. Working assumption — **unverified and load-bearing** — is that `places.osm.json`
   wins on kashrut, because that is where `876a562`'s corrections landed and the mirror is stale rather than
   independent. **If that assumption is wrong the merge policy inverts.**
3. It reframes what `f2b15d5` protects: not a redundant copy, but 205 kashrut claims existing nowhere else.

### 18f. Note for whoever touches these guards next

`planCategoryOverwrite`'s `volume` guard is **subsumed** by `no-dropped-ids`: the file has no duplicate ids, so
no-dropped-ids passing implies `candidate >= live`, implies `ratio >= 1`. No candidate exists where volume
fails and no-dropped-ids passes. Defence in depth and a clearer error message, but **not load-bearing** — do
not relax `no-dropped-ids` believing `volume` still covers you.

`KAROV_ALLOW_DESTRUCTIVE_CATEGORY_OVERWRITE` (`database.ts:66`) is deliberately **separate** from
`KAROV_ALLOW_DESTRUCTIVE_REBUILD` (`:57`). Two independently destructive operations on different files sharing
one flag is how "I opted into the rebuild" silently becomes "and also authorised the overwrite."

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
