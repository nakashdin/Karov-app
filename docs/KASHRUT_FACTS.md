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

## 5b. The registry has ALREADY REFUSED authority→level inference — 108 times

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

**Unreconciled (do not quote as established):** an independent architecture critique reported 288/352/82%
for the body-less mechanism, and the Reviewer reported 187 records covered by the 9 body-less mehadrin
aliases. The Architect measured 11 records currently at mehadrin via a body-less alias. These are different
populations (proposed-rule output vs current dataset vs alias coverage regardless of current level) and the
cut has not been settled. The **358** figure and the 108-alias refusal reproduce exactly across
derivations and are the load-bearing facts. There are **9** body-less mehadrin aliases, not 11.

---

## 6. Display paths — three, not one

| Path | Where | Changed by the migration |
|---|---|---|
| 1. `getKosherLabel` | `PlaceCard.tsx:110`, `PlaceBottomCard.tsx:20` | 720 records |
| 2. raw `certifiedBy` | `PlaceCard.tsx:121`, `PlaceDetailScreen.tsx:59/317/432` | **0** |
| 3. `kosherTypeLabel` **direct** | `PlaceDetailScreen.tsx:30/58/432` | **0** |

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
| migrate-kosher-fields.mjs guard blind spot = 614 | **633** (no certifiedBy, MAP-enrichable) / **111** (of those, named authority) | 614 is Phase 1's category-4, a different predicate (requires already-enriched) |
