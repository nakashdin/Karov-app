# Karov — Canonical Kashrut Data Architecture

**Status:** proposal, for owner sign-off.
**Basis:** four independent designs, four adversarial critiques, two cross-cutting scans, and an independent re-verification of every load-bearing number against `src/data/generated/places.osm.json` and the live source files at HEAD of `chore/architecture-review`.
**Scope of this document:** kashrut only. §10 sequences the rest.

Every count below was re-derived read-only during this pass. Where a prior report's number was wrong, the corrected number is used and the error is named.

---

## 1. The problem, precisely

### 1.1 The failure mode

Karov displays a specific certifying body and a specific kashrut standard for restaurants where the only evidence is a legacy enum value. A user who keeps kosher reads "בד״ץ בית יוסף" or "מהדרין", filters on it, and eats. For a measurable subset of records that statement has nothing behind it.

### 1.2 The mechanism

`scripts/migrate-kosher-fields.mjs` wrote every live `kosherLevel`, `kosherAuthorityGroup` and `kosherAuthority` value in the dataset. Its entire logic is a 14-row hardcoded `MAP` keyed on `kosherType`:

```js
badatz_beit_yosef: { kosherLevel: 'mehadrin', kosherAuthorityGroup: 'badatz', kosherAuthority: 'badatz_beit_yosef' },
tzohar:            { kosherLevel: 'regular',  kosherAuthorityGroup: 'independent', kosherAuthority: 'tzohar' },
```

It reads no other field. It consults no registry. It overwrites unconditionally (`return { ...place, kosherLevel, kosherAuthorityGroup, kosherAuthority }`). It is re-runnable, has no dry-run flag, and writes the file directly.

Consequences that follow mechanically from that:

- **`kosherLevel` is not independently sourced.** It is a restatement of the authority name. Zero-variance is total: every `kosherType` value maps to exactly one level.
- **The pipeline is a one-shot snapshot, not a pipeline.** 249 food records carry a `kosherType` and no `kosherLevel`/`kosherAuthorityGroup` — they were inserted after the last run. 208 of them display `רבנות מקומי` through the legacy fallback at `src/utils/kosher.ts:166` while their siblings display `רבנות` through the structured branch. The same real-world fact renders two ways depending on insertion date.
- **The uncertainty sentinel does not survive the write path.** The `MAP` writes `kosherAuthority: null` for five enum values covering 1600 food records. **6 records still carry it.** The mechanism is `scripts/clean-nulls.mjs` — a live, unguarded, 20-line script that rebuilds every record keeping only keys where `v !== null && v !== undefined`. Any design whose "not established" marker is a top-level `null` is already known-broken here.
- **A second, careful pipeline exists and never runs.** `scripts/apply-kashrut-authorities.mjs` matches `certifiedBy` against a human-reviewed alias registry by exact string equality, refuses reviewQueue strings, and asserts eight acceptance checks including a no-level-upgrade guard. It has never been run with `--apply`. Rules that live inside one program protect only that program's writes.

### 1.3 The scale, in real numbers

`places.osm.json`: **7,471 records, 5,228,996 bytes. 2,213 are food-typed** (`restaurant` 1442, `cafe` 388, `juice_bar` 107, `coffee_cart` 81, `bakery` 67, `winery` 64, `ice_cream_parlor` 44, `fast_food` 20). **2,193 carry at least one kashrut field; 2,126 carry a `kosherType`; 20 carry nothing at all.**

Evidence tiers over the 2,213 food records:

| Tier | Definition | n | of which a **specific body** is named |
|---|---|---:|---:|
| 1 | Certificate document (`kosherCertUrl` and/or `certificateValidUntil`) | **180** | 180 |
| 2 | Free-text `certifiedBy`, no document | **1,380** | 222 |
| 3 | `sourceUrl` only, no kashrut text, no document | **62** | 13 |
| 4 | Legacy `kosherType` only | **589** | **98** |
| 5 | Nothing | **20** | 0 |

> *Reconciliation with the Reviewer's census (180 / 1313 / 44 / 589 / 0 = 2126).* That census was based on the 2,126 records carrying a `kosherType`. Tier 2 there is 1,313 = my 1,380 minus the **67** records that have `certifiedBy` and no `kosherType`. Tier 3 there is 44 = my 62 minus the **18** wineries that have a `sourceUrl` and no kashrut field at all. Both partitions are correct; they differ only in base. This document uses the 2,213 base throughout, so the 20 evidence-free records stay visible.

**The sharpest cell: 98 records name a specific certifying body on a legacy enum value and nothing else** — no certificate, no `certifiedBy`, no kashrut-bearing source URL. Verified breakdown: `badatz_beit_yosef` 50, `rabbinate_tel_aviv` 42, `badatz_rubin` 2, and one each of `tzohar`, `rabbinate_jerusalem`, `badatz_edah_hachareidis`, `badatz_kehilot`.

**What the filters return today** (food records, device date 2026-08-25):

| Filter chip | Results | Backed by a certificate |
|---|---:|---:|
| **מהדרין בלבד** | **1,100** | **0** |
| רבנות (group) | 569 | 0 |
| בד״ץ בית יוסף | 216 | 0 |
| בד״ץ העדה החרדית | 29 | 0 |
| הרב מחפוד | 12 | 0 |
| קהילות | 5 | 0 |
| חוג חתם סופר | 2 | 0 |
| הרב רובין | 2 | 0 |
| צהר | 183 (12 excluded as expired) | 168 |
| גוף כשרות לא ידוע | 847 | 0 |

**Not one of the 1,100 מהדרין results and not one of the 266 badatz results is backed by a certificate document.** 758 of the 1,100 simultaneously carry `kosherAuthorityGroup: 'unknown'` — the record concedes the certifier is unknown to the filter while the card asserts `מהדרין` in `theme.kosherPremium`, documented at `src/theme/tokens.ts` as "a step above `success`".

### 1.4 The structural cause

`kosherLevel?: 'regular' | 'mehadrin'` has no third state. `kosherAuthorityGroup?: … | 'unknown'` spells absence twice. There is **no encoding for "kosher, certifying body not established"**. The nearest honest string, `גוף כשרות לא ידוע` (`src/utils/kosher.ts:162`), is reachable only when the group is `'unknown'` **and** the level is not `mehadrin` — 89 records. Set `unknown` + `mehadrin` and the app says `מהדרין` instead, on 758 records.

**The schema demands an answer, so the pipeline invents one.** That is the defect. Everything else is a symptom.

---

## 2. The governing rules, as mechanically enforceable invariants

The owner's rule:

> *A structured kashrut claim must not be created unless there is evidence supporting that specific claim. `kosherAuthority`, `kosherLevel`, certificate identity, and source/provenance are SEPARATE FACTS. One must not automatically imply another unless we have an explicitly documented and justified rule for doing so.*
>
> *Accuracy is more important than completeness. If we know that a restaurant is kosher but cannot establish the exact authority or whether it is regular/mehadrin, the data model should REPRESENT THAT UNCERTAINTY instead of filling the gap through inference.*

Restated as five invariants a validator can evaluate on one record:

- **I1 — Every claim names its licence.** A stored `certifierId` or `level` must satisfy a numbered evidence rule (§4) evaluated against fields present on the same record. No rule takes `kosherType` as an input.
- **I2 — Uncertainty is representable and required.** Every kashrut-bearing food record carries `certifierId` and `level` as **required keys** that may hold `null`. Absence of the key is a hard validation failure, not a shrug.
- **I3 — No undocumented derivation.** The complete list of permitted derivations is §5. Anything not on that list is forbidden, and adding to the list requires a written justification in the same commit.
- **I4 — Under-claiming is the safe failure.** Where two readings are defensible, the model takes the one that asserts less. A withheld true claim costs a user one restaurant. An asserted false claim causes an observant user to eat food they hold to be non-kosher. There is no symmetric error to balance against.
- **I5 — Enforcement lives on the data, not inside writers.** Every rule is a predicate in `scripts/validate-data.mjs`, evaluated over the shipped file. `apply-kashrut-authorities.mjs` is a careful program and it did not stop `migrate-kosher-fields.mjs`, because they never met.

Two supporting rules the project must adopt to make the above legal:

- **I6 — Additive-only governs EVIDENCE, not derived caches.** `AGENTS.md` says a record is never deleted and, if wrong, is corrected. A source string, a certificate URL and a raw enum are evidence and are never deleted or edited. `certifierId`, `level` and any group value are a cache of a rule applied to evidence; recomputing them is the *correction* `AGENTS.md` requires. Without this sentence written into `AGENTS.md`, the additive-only invariant reads as a prohibition on ever fixing `kosherLevel` — making the defect permanent by policy.
- **I7 — `null` may not carry meaning at the top level of a record.** `scripts/clean-nulls.mjs` strips every top-level null-valued key from every record, unconditionally. It is a top-level-only map, so a **nested** `kashrut.certifierId: null` survives it. This is why §3 nests.

---

## 3. The canonical schema

### 3.1 Shape decision

One nested object on `Place`. Three concrete reasons, each verified:

1. **A partial write becomes structurally visible.** `migrate-kosher-fields.mjs` could set three independent top-level keys because they *are* three independent top-level keys. With one object, a writer produces the whole claim or nothing, and the validator inspects one subtree instead of correlating five keys.
2. **Nesting is the only place a `null` sentinel survives.** Verified against `scripts/clean-nulls.mjs:8-18` (top-level `Object.entries(p)` only).
3. **`scripts/dedupe-places.mjs:104` merges field-by-field** (`if (keeper[k] === undefined || keeper[k] === null || keeper[k] === '') keeper[k] = v`). With flat fields a merge can hand branch A's authority to branch B while leaving B's `certifiedBy` intact — a claim severed from its evidence. With one object the claim and its evidence move together.

And one thing it is **not**: no `claims[]` history, no per-field provenance graph, no numeric confidence score, no certificates sub-entity, no per-record schema version. This is a 7,471-record JSON file bundled into a phone app. A number invites arithmetic, and arithmetic on evidence is inference wearing a lab coat.

### 3.2 The type

New file `src/types/kashrut.ts` (types only, ~70 lines):

```ts
/**
 * What kind of artifact backs this record's kashrut claim. A KIND, not a rank.
 * Do not sort, compare, average, or threshold these values.
 */
export type KashrutEvidence =
  /** Karov holds a retrievable certificate document (certUrl). */
  | 'certificate'
  /** A source published certifier text for THIS place; preserved verbatim in `statedAs`. */
  | 'attestation'
  /** The record came from a page whose declared scope is kosher establishments,
   *  and that page named no certifier. Hosts allow-listed in
   *  src/data/kashrut/listing-sources.ts. A chain's own marketing site is NOT one. */
  | 'listing'
  /** Residue: the pre-2026 kosherType enum is the only surviving trace.
   *  Producible ONLY by the one-time migration. No importer may ever write it.
   *  Its count is a CI ratchet that may only fall. */
  | 'legacy';

export type KashrutLevel = 'regular' | 'mehadrin';
export type KashrutGroup = 'rabbinate' | 'badatz' | 'independent';   // no 'unknown'

export interface KashrutClaim {
  /** REQUIRED. The strongest artifact that actually exists on this record. */
  evidence: KashrutEvidence;

  /** Verbatim source text, byte-identical to what the source published.
   *  EVIDENCE, never a claim. Never trimmed, normalised, parsed at runtime, or
   *  rendered as an authority name. (= today's `certifiedBy`.) */
  statedAs?: string;

  /** REQUIRED, nullable. Registry id from src/data/kashrut/authorities.ts
   *  (hyphen-case). `null` = NOT ESTABLISHED — an asserted finding, not a gap.
   *  Key ABSENT = never processed → hard validation failure. */
  certifierId: string | null;

  /** Present iff `certifierId === null`. FORBIDDEN otherwise — when the id is
   *  known the group is read from the registry (§5 D1) and never stored.
   *  `null` = not even the class is established. */
  certifierGroup?: KashrutGroup | null;

  /** REQUIRED, nullable. `null` = the standard is NOT ESTABLISHED.
   *  Never defaults to 'regular'. Never derived from `certifierId`. */
  level: KashrutLevel | null;

  /** Names one or more certifying bodies that Karov recognises but cannot
   *  reduce to a single id. 26 records today. See §6.4. */
  compound?: true;

  /** A human review deliberately deferred part of this string. Per-QUESTION,
   *  not per-record: `certifier` blocks certifierId, `level` blocks level. */
  deferred?: Array<'certifier' | 'level'>;

  // ── certificate facts. Legal ONLY when evidence === 'certificate'. ──
  /** REQUIRED when evidence === 'certificate'. */
  certUrl?: string;
  /** ISO YYYY-MM-DD. ABSENT = the document states no parsable expiry
   *  (16 real records). NEVER means expired. */
  validUntil?: string;
  issuedAt?: string;
  /** Standards printed on THIS document. (= today's `kosherDetails`.) */
  standards?: KashrutStandards;

  /** ISO date the registry resolution pass last ran against `statedAs`.
   *  Distinguishes "we looked and the text names no body" from "nothing looked". */
  resolvedAt?: string;
}

export interface KashrutStandards {
  shabbatClosed?: boolean; bishulYisrael?: boolean; noChametz?: boolean;
  vegChecked?: boolean; chalavYisrael?: boolean; notRabbanut?: boolean;
}
```

On `Place`:

```ts
/** Everything Karov asserts about this place's kashrut, and what licenses it.
 *  Present iff the record makes any kashrut claim. Absent on a food record is
 *  legal ONLY for the 20 records with zero kashrut evidence (§8 tier 5). */
kashrut?: KashrutClaim;
```

### 3.3 Absence vs `null` vs value — per field

| Field | key absent | `null` | value |
|---|---|---|---|
| `place.kashrut` | No kashrut claim. Normal for a synagogue. On a food record: legal only for the 20 in tier 5, counted by the `foodWithoutKashrut` ratchet | *(never — optional, not nullable)* | The claim |
| `evidence` | **Hard fail** | *(never)* | Strongest artifact present |
| `statedAs` | The source published no certifier text | *(never)* | Verbatim |
| `certifierId` | **Hard fail.** Omission is what let the old pipeline skip the question | "We looked; no specific body is established." A finding | Must exist in `KASHRUT_AUTHORITIES` |
| `certifierGroup` | Required-absent when `certifierId !== null` | Not even the class is established | The class the source text names |
| `level` | **Hard fail** | "The standard is not established." **Not `regular`** | What the evidence says |
| `certUrl` | Karov holds no document | *(never)* | The document |
| `validUntil` | Document held, no parsable date (16 records). **Never means expired** | *(never)* | Expiry |
| `compound` | Single or no body named | *(never)* | Only `true` |
| `deferred` | Nothing deferred | *(never)* | Non-empty array |

### 3.4 Migration mapping from the current schema

| Current field | `src/types/place.ts` | Fate | New home |
|---|---|---|---|
| `kosherType` | :86-87 | **FROZEN.** Byte-identical on all 2,126 records. Read by nothing after Phase 4; written by nothing, ever | — (audit column) |
| `certifiedBy` | :94-95 | **FROZEN**, and it earns its keep: a permanent tripwire (§4 E10) | → `kashrut.statedAs`, byte-identical |
| `kosherLevel` | :88-89 | **FROZEN**, `@deprecated` | → `kashrut.level`, which can be `null` |
| `kosherAuthorityGroup` | :90-91 | **FROZEN**, `@deprecated`. The `'unknown'` sentinel dies with it | → derived (§5 D1) or `kashrut.certifierGroup` |
| `kosherAuthority` | :92-93 | **FROZEN**, `@deprecated`. The legacy underscore namespace is retired | → `kashrut.certifierId` (registry ids) |
| `certifierId` (top-level) | :96-97 | **DELETED from the type** after Phase 4 | → `kashrut.certifierId` |
| `kosherCertUrl` | :157-158 | **FROZEN**; copied | → `kashrut.certUrl` |
| `certificateValidUntil` | :99-110 | **FROZEN**; copied | → `kashrut.validUntil` |
| `certificateIssuedAt` | :111-116 | **FROZEN**; copied (0 occurrences) | → `kashrut.issuedAt` |
| `kosherDetails` | :117-134 | **FROZEN**; copied | → `kashrut.standards` |
| `category` (meat/dairy/parve) | :85 | **UNCHANGED**, stays top-level. Deliberately out of scope — see §10 | — |
| `source`, `sourceUrl`, `sourceName`, `lastVerifiedAt` | :64,:71,:161-164 | **UNCHANGED** here. They describe *record* origin, not *kashrut* origin, and `lastVerifiedAt` has its own defect (§10) | — |

**Freeze, do not delete.** Nothing loses a byte, so additive-only holds literally and the migration is reversible from the record itself. Cost: ~+250 KB on a 5.23 MB file, under 5%.

Two additions outside `Place`:

```ts
// src/data/kashrut/authorities.ts — on KashrutAuthority
/** The standard this body is generally understood to certify at. A fact ABOUT
 *  THE BODY, shown as context on the detail screen. It is NOT this place's
 *  level, is never copied onto a Place, and is never read by any filter. */
typicalLevel?: KashrutLevel;
/** REQUIRED whenever typicalLevel is set. One sourced sentence. This field is
 *  the reason the display is legitimate. */
typicalLevelNote?: string;
```

```jsonc
// scripts/reports/kashrut-registry.json — on aliases[]
"group": "rabbinate" | "badatz" | null   // NEW. See §4 E6 and §12 Q3.
```

`aliases[]` gains one column on **23** of 203 entries. `reviewQueue[]` gains an optional `suggestedGroup` on the entries where the text names a class. That is the entire human-judgement surface of the migration.

---

## 4. Evidence rules

Each rule is a pure predicate over one record plus the registry — no network, no heuristics, no judgement. **E** = the entry in `kashrut-registry.json` `aliases[]` whose `raw` is byte-identical to `kashrut.statedAs`. **Q** = the `reviewQueue[]` entry likewise. All go in `scripts/validate-data.mjs`.

| # | Rule | Predicate |
|---|---|---|
| **E1** | `kashrut` requires something to be about | `kashrut` present ⟹ `statedAs` ∨ `certUrl` ∨ `evidence === 'legacy'` ∨ `evidence === 'listing'` |
| **E2** | Certificate requires a document | `evidence === 'certificate'` ⟹ `certUrl` non-empty. *(Not `validUntil` — 16 real records hold a document with no parsable date.)* |
| **E3** | Attestation requires text | `evidence === 'attestation'` ⟹ `statedAs` non-empty |
| **E4** | Listing requires an allow-listed kashrut-scoped host | `evidence === 'listing'` ⟹ `place.sourceUrl` host ∈ `src/data/kashrut/listing-sources.ts` ∧ `statedAs` absent ∧ `certUrl` absent |
| **E5** | **A certifier needs a document that names it, or a human-approved exact string** | `certifierId !== null` ⟹ `certifierId ∈ KASHRUT_AUTHORITIES` **and** one of:<br>(a) `evidence === 'certificate'` ∧ `E.authorityId === certifierId` — *the certificate path is still gated on the alias table; see note below*<br>(b) `E` exists ∧ `E.authorityId === certifierId`<br>(c) `Q` exists ∧ `Q.suggestedAuthorityId === certifierId` ∧ `'certifier' ∉ deferred` |
| **E6** | A group needs a class word in the source text | `certifierGroup` present ⟺ `certifierId === null`. Non-null value ⟹ `E.group === certifierGroup` ∨ `Q.suggestedGroup === certifierGroup` |
| **E7** | **A level needs evidence that states a level** | `level !== null` ⟹ one of:<br>(a) `evidence === 'certificate'` ∧ the certificate's own extracted level word `=== level`<br>(b) `E.level === level`<br>(c) `Q.suggestedLevel === level` ∧ `'level' ∉ deferred`<br>**Never from `certifierId`. Never from `kosherType`.** |
| **E8** | Certificate facts are certificate-only | any of `validUntil`/`issuedAt`/`standards` present ⟹ `evidence === 'certificate'` ∧ `certUrl` present. *A date with no document is a fabricated date.* |
| **E9** | **Deferral is per-question** | `Q` exists ⟹ `deferred` present and non-empty. `'certifier' ∈ deferred` ⟺ `Q.suggestedAuthorityId === null` ∨ `Q.suggestedAuthorityId ∉ KASHRUT_AUTHORITIES`. `'level' ∈ deferred` ⟺ `Q.suggestedLevel === null` |
| **E10** | The evidence text is immutable | `kashrut.statedAs` byte-identical to the frozen `certifiedBy` on the same record |
| **E11** | Compound strings establish nothing single | `compound === true` ⟹ `certifierId === null` |
| **E12** | No cross-branch certificate copying | no two records share a `certUrl`. *(Verified: 0 duplicates across all 7,471 today.)* |
| **E13** | **Frozen means frozen** | `kosherType`, `kosherAuthority`, `kosherAuthorityGroup`, `kosherLevel`, `certifiedBy`, `kosherCertUrl`, `certificateValidUntil`, `kosherDetails` are byte-identical to `git show HEAD:src/data/generated/places.osm.json` for every id present in both |
| **E14** | No orphan claim | `place.type` is a food type ∧ `kashrut` present ⟹ `certifierId` key present ∧ `level` key present |

**Note on E5(a).** All 180 certificate records carry `certifiedBy: 'צהר'` and resolve through the alias table, so gating the certificate path on the alias too costs nothing today and closes a real hole: without it, `certifierId` on a certificate record would be an unchecked assertion by whatever script wrote the record — the same class of failure as the enum. When a second certifying source is onboarded, its issuing body gets an alias row like every other; that is a one-line human act, not a code change.

**Note on E9.** This is the corrected form of the rule three of the four designs got wrong. The `reviewQueue` is **not** 58 refusals. Verified: **27 of the 58 entries carry a `suggestedAuthorityId`** and **11 carry a `suggestedLevel`**. The entry for `כשר בד"ץ בית יוסף` states verbatim: *"The authority is correct and must be kept. Do NOT resolve this by setting level=\"regular\"."* The deferral there is about the **level only**. Treating reviewQueue membership as a blanket certifier-null rule discards **49 food records' worth of human-confirmed, already-registered attributions** (`rabbinate-chief-israel` ×29, `badatz-beit-yosef` ×8, `badatz-chatam-sofer-petah-tikva` ×3, plus 9 singletons). E9 honours the artifact's own shape: it has separate `suggestedAuthorityId` and `suggestedLevel` keys because the deferral is per-question.

---

## 5. Derivation rules

The owner's rule permits derivations that are documented and justified. **This is the complete list. Anything not listed is forbidden. Adding to this list requires a written justification in the same commit that adds it.**

### D1 — ALLOWED and MANDATORY: `certifierId` → group, computed at read time, never stored

`group = getKashrutAuthority(certifierId).group` (`src/data/kashrut/authorities.ts`).

**Justification.** The group is a property of the *authority*, recorded once by human review. `badatz-beit-yosef` is a badatz whether or not any restaurant exists. Deriving it asserts nothing new about the place.

**Consequence: `certifierGroup` is FORBIDDEN when `certifierId` is known (E6).** Storing a derived value is the cheapest way to reintroduce drift, and drift is measurable in the current data: 1,877 food records store a group, and it contradicts the record's own evidence text on 283 of them — 7 records whose `certifiedBy` names a badatz are filed `rabbinate` (four פיצה האט carrying `כשרות בד״ץ הרב רובין` with `kosherType: rabanut_mehadrin`), and 275 whose text names a rabbinate or a badatz are filed `unknown` or ungrouped. Making the value unstorable makes those contradictions unrepresentable rather than merely wrong.

### D2 — ALLOWED: a class word in the source text → `certifierGroup`

`certifiedBy: "רבנות מקומית"` ⟹ `certifierGroup: 'rabbinate'`. `"בד״ץ"` ⟹ `'badatz'`.

**Justification.** This is transcription, not inference. The word *רבנות* is in the source string. "A rabbinate certifies this; which one is not established" restates the source and adds nothing.

**Mechanism: a registry change, not a schema change.** The `group` column on `aliases[]` (§3.4), populated by a human pass over the **23** null-authority alias strings. Strings that mix classes (`כשרות רבנות ובד"ץ`) or are genuinely ambiguous (`כשרות מקומית`, `רב הקיבוץ`) get `group: null`. This recovers **279 group-only claims** that an authority-only design would throw on the floor for no accuracy gain.

### D3 — ALLOWED, narrow: a certificate's own text → `level`

`level` may be set with `evidence: 'certificate'` only when the certificate document itself carries a level word that an extractor captured into a dedicated field.

**Justification.** Reading a level off a certificate is reading evidence.

**Empirical note.** No Tzohar certificate uses the word מהדרין. Under D3 all 180 certificate records get **no level at all** — and they are the best-evidenced records in the dataset. §6.3 explains why that is also the more informative outcome.

### D4 — FORBIDDEN: `certifierId` → `level`. For every authority. Including the obvious ones.

This is the derivation everyone wants and the root defect. Four grounds, all from this repository:

1. **The registry's own human reviewer refused it in writing.** On `כשר בד"ץ בית יוסף`: *"Do NOT resolve this by setting level=\"regular\" — that would misrepresent a Sephardi bassar-chalak badatz. Needs a project-wide policy call."* A badatz a careful reviewer could not level-classify is proof the class-level derivation is unsafe **for the class where it looks most obvious**.
2. **It leaks in both directions.** On `בד"ץ מהדרין ירושלים`: *"Invents an authority out of a level word… would plant a phantom independent haredi badatz that a user who does not accept Rabbanut-mehadrin would read as a stricter hechsher than it is."* Let either fact imply the other and both become unreliable.
3. **"Mehadrin" is a property of a certification programme, not of a body.** The Jerusalem Rabbinate issues both tracks — which is exactly why `רבנות ירושלים` and `רבנות ירושלים מהדרין` are two separate alias rows. A rule that fails for a rabbinate is not a rule, it is a habit. And for a badatz it is a category error, not merely an inference: מהדרין is a Rabbanut tier name, and Sephardi bassar-chalak badatz bodies do not describe themselves with it.
4. **The "conservative" direction is also fabrication.** `migrate-kosher-fields.mjs` stamps `level: 'regular'` on all 195 Tzohar records — while those same certificates record `bishulYisrael`, `chalavYisrael`, `vegChecked`, `notRabbanut` in `kosherDetails`. The document says something richer than "regular"; the MAP flattened it into a claim the document never made. Downgrading is not safe.

**The useful knowledge is relocated, not lost.** `KashrutAuthority.typicalLevel` + `typicalLevelNote` (§3.4) render on the detail screen as *"בד״ץ העדה החרדית מסמיך בדרך כלל ברמת מהדרין"* — attributed to the body, in a different visual register from the place's own chip. The user gets the knowledge; the filter and the badge never see it; nothing enters the record.

### D5 — FORBIDDEN: `level` → `certifierId`, and the symmetric refusal

The mirror of D4. `certifiedBy: "מהדרין"` names no body and never will. Enforced by E5: no rule admits a level word as an antecedent for an authority.

**And a third refusal, which three of the four candidate designs missed:** a body-less level word is real transcription and may be **stored** as `level` (E7(b) admits it, 11 alias rows covering 195 records), but it may **not** admit the record to the `מהדרין בלבד` filter. See §6.5 — this is the fix for the most dangerous surface in the app.

### D6 — FORBIDDEN: `kosherType` → anything

`kosherType` is not evidence. It is the **output of an earlier undocumented inference**, and the mechanism is still in the tree: `importers/coffee-carts/scrape-coffeetrail.mjs:126` returns `'rabanut_mekomi'` **when `certifiedBy` is empty** — a rabbinate claim manufactured out of nothing. Deriving from `kosherType` launders that inference into a fresh-looking fact.

Enforced structurally: no rule in E5, E6 or E7 admits `kosherType` as an antecedent, and E13 freezes it.

### D7 — FORBIDDEN: sibling / branch / chain inheritance of a certificate or an expiry

Already stated in prose at `src/types/place.ts:99-110`; now mechanically meaningful via E8 (a date requires a document on *this* record) and E12 (no shared `certUrl`).

### D8 — ALLOWED, already shipped, keep: expired certificate ⟹ excluded from body filters

`src/data/repository/filterPlaces.ts:51`, commit `876a562`. A lapsed certificate is documented evidence that *this specific claim* no longer holds. It is **not** evidence the place is not kosher, so the place still appears in browse and search. Extend unchanged, and fix the gap in §6.5.

### The forbidden check

**No validator, importer or migration may assert `level ⟹ certifierId` or `certifierId ⟹ level` in either direction.** This is stated as a rule so it is not "fixed" later by someone who notices the fields are usually correlated. Both states are normal, correct and common: **266 food records** legitimately carry a level with no established body, and **792** legitimately carry an established body with no level.

---

## 6. The uncertainty representation

### 6.1 Storage

There is no uncertainty *field*. Uncertainty is a **required key holding `null`**, inside an object that survives the null-stripper.

| Real-world state | Storage | n after migration |
|---|---|---:|
| Body and level both established | `{certifierId, level, evidence, statedAs}` | 167 |
| Body established, level not | `{certifierId, level: null}` | 792 |
| **A rabbinate/badatz certifies; which one not established** | `{certifierId: null, certifierGroup: 'rabbinate'\|'badatz'}` | 279 |
| **Level stated, body not established** | `{certifierId: null, certifierGroup: null, level: 'mehadrin'}` | 266 |
| **Kosher; nothing established** | `{certifierId: null, certifierGroup: null, level: null}` | 689 |
| No kashrut evidence at all | `kashrut` absent; counted by `foodWithoutKashrut` | 20 |
| | **total** | **2,213** |

Two things this does that the current model structurally cannot:

1. **`level: null` is representable.** `kosherLevel?: 'regular'|'mehadrin'` has no third state and `migrate-kosher-fields.mjs` guarantees the key is never absent on a record with a `kosherType` — so "unknown level" has literally no encoding today. That is *why* the pipeline fills the gap.
2. **`certifierId: null` is a finding, not a gap.** `kosherAuthorityGroup: 'unknown'` conflates "we established there is no identifiable body" with "nobody asked". The pair `(certifierId: null, certifierGroup: 'rabbinate')` says something specific and true that no combination of today's fields can say.

### 6.2 One computation feeds every surface

```ts
// src/utils/kashrut.ts — new, ~130 lines, replaces getKosherLabel
export type KashrutDisplay =
  | { state: 'certified';    authority: KashrutAuthority; validUntil: string; level: KashrutLevel | null; standards?: KashrutStandards }
  | { state: 'documented';   authority: KashrutAuthority; level: KashrutLevel | null }   // document held, currency unknown (16 records)
  | { state: 'lapsed';       authority: KashrutAuthority; validUntil: string }
  | { state: 'attributed';   authority: KashrutAuthority; level: KashrutLevel | null }
  | { state: 'compound';     statedAs: string }
  | { state: 'groupOnly';    group: KashrutGroup; level: KashrutLevel | null }
  | { state: 'unattributed'; level: KashrutLevel | null; evidence: KashrutEvidence }
  | { state: 'none' };

export function describeKashrut(place: Pick<Place,'type'|'kashrut'>): KashrutDisplay;
export function kashrutBadgeTone(d: KashrutDisplay): 'premium' | 'group' | 'neutral';
export function matchesKashrutFilter(d: KashrutDisplay, chip: KashrutFilterKey): boolean;
```

**The badge, the map subtitle, the detail chips and the filter all go through `describeKashrut`.** This is the structural fix for a live contradiction: the chip labelled `גוף כשרות לא ידוע` in `KashruyotFilterScreen.tsx:37` returns **847** records, and **758** of them render `מהדרין` on their cards, because `src/utils/kosher.ts:161` returns `'מהדרין'` before control ever reaches the `'גוף כשרות לא ידוע'` line at `:162`. The filter says "body unknown"; the card says "mehadrin"; same record, two code paths.

`kashrutBadgeTone` exists because **the badge colour is a fifth claim surface** that no candidate design covered. `src/components/PlaceCard.tsx:35-43` paints `theme.kosherPremium` whenever the group is `badatz` **or** the level is `mehadrin`. A certifier-less mehadrin record whose words disclaim attribution would still be painted premium — the fastest-read signal on the card contradicting the text beside it. Under the new rule: `premium` only for `certified`/`documented`/`attributed` with an established body; `group` tone for `groupOnly`; **`neutral` for `unattributed` and `compound`**.

### 6.3 Display — the exact strings

| State | Card chip (he) | Detail "כשרות" rows |
|---|---|---|
| `certified` | `בד״ץ בית יוסף` + 📄 | `גוף מכשיר: בד״ץ בית יוסף` · `תעודה: בתוקף עד 11.09.2026` |
| `documented` | `צהר` + 📄 | `גוף מכשיר: צהר` · `תעודה: צפייה בתעודה — תוקף לא צוין` |
| `lapsed` | `⚠️ תעודת כשרות פגה — צהר` | `תעודה: פגה 11.09.2026` |
| `attributed` | `בד״ץ בית יוסף` | `גוף מכשיר: בד״ץ בית יוסף` · `רשום במקור: "כשר למהדרין בד״ץ בית יוסף"` |
| `attributed` + level | `בד״ץ בית יוסף · מהדרין` | as above + `רמת כשרות: מהדרין` |
| `compound` | `רשום במקור: "רבנות ירושלים ובד״צ העדה החרדית"` | the verbatim string, plus each recognised body listed as context |
| `groupOnly` rabbinate | **`רבנות · הרשות המקומית לא זוהתה`** | `גוף מכשיר: רבנות — הרשות המקומית לא זוהתה` · `רשום במקור: "רבנות מקומית"` |
| `groupOnly` badatz | **`בד״ץ · הגוף לא זוהה`** | as above |
| `unattributed`, level set | **`מהדרין · גוף הכשרות לא אומת`** | `רמת כשרות: מהדרין` · `רשום במקור: "מהדרין"` · `גוף מכשיר: לא אומת` |
| `unattributed`, no level | **`כשר · גוף הכשרות לא אומת`** | `גוף מכשיר: לא אומת` · `רמת כשרות: לא נקבעה` |
| `unattributed`, `evidence: 'legacy'` | **`כשר · לא אומת`** | `מקור המידע: רישום קודם, לא אומת` |
| `none` | *(no chip)* | *(no kashrut rows)* |

Three further display changes:

1. **`🏛 הכשר: X` → `🏛 רשום: "X"`** (`PlaceCard.tsx:188`, 1,560 records). `הכשר:` asserts that this *is* the hechsher. `רשום: "…"` reports what the source published. One word; it is the difference between a claim and a citation.
2. **The 771 non-`restaurant` food records get a kashrut row.** `PlaceDetailScreen.tsx:426` gates the "כשרות" row on `place.type === 'restaurant'`. 388 cafés, 107 juice bars, 81 coffee carts, 67 bakeries, 64 wineries, 44 ice-cream parlours and 20 fast-food records currently show a confident chip on the card and have **no kashrut row at all** on the detail screen to qualify it. Same for `PlaceBottomCard.tsx:19` on the map. Gate on `isFoodType`, not on `'restaurant'`.
3. **Certificate standards replace the level word where a document exists.** For the 164 records with `kosherDetails`, `בישול ישראל · חלב ישראל · ירקות ללא חשש תולעים · סגור בשבת` is strictly more informative than "מהדרין" and is quotable from a document. `kosherStandards()` (`PlaceDetailScreen.tsx:84`) is promoted from a footnote row to the primary kashrut display when `standards` is present. This is the compensating move that makes losing 1,386 level words tolerable: for the best-evidenced records the app trades a vague adjective for six verifiable facts.

**i18n:** ~12 new keys × 5 languages. This also repays an existing `AGENTS.md` rule-3 debt — every return value of `getKosherLabel` and `PlaceCard.tsx:188` is hardcoded Hebrew today.

### 6.4 Compound strings — an accepted, named tradeoff

**26 food records carry a `certifiedBy` naming two or more bodies** across 25 distinct strings; 11 of those name a rabbinate and a badatz together (`רבנות ירושלים ובד״צ העדה החרדית`, `בד"ץ העדה החרדית ורבנות מודיעין עילית`, …). `certifierId` is `string | null`, and `certifierGroup` has no cross-group value, so without a rule these collapse to "body not established" — the best-evidenced free-text records reported as the least known.

**Decision: `compound: true` + a display state that quotes the source verbatim, excluded from every specific-body chip.** Not an array.

- **Why not an array.** `certifierIds: string[]` changes every read site, every filter, every label function and every test to serve 26 records (1.2% of food).
- **Why the exclusion is safe.** Excluding a compound record from the `בד״ץ העדה החרדית` chip is an under-claim: it costs a user one restaurant. Including it on a partial reading is an over-claim. I4 settles it.
- **Why it is still an improvement.** Today only **5** of the 26 carry a specific `kosherAuthority`, and one of those (`manual-maafe-neeman-ashdod-star`, `בד"ץ בית יוסף / רבנות מהדרין`) is displayed as a single unqualified badatz. After migration all 26 display the full source text, which is more information than any single id.
- **Written threshold, in the type comment so it is not re-litigated:** build `certifierIds: string[]` at **>60 records** or on the first user report.

### 6.5 The filter — the religiously dangerous surface

Filter chips are defined in `src/screens/KashruyotFilterScreen.tsx:24-37` (11 options) and matched in `src/data/repository/filterPlaces.ts:36-52`. **A filter is a claim surface, not a query.** A user who taps `בד״ץ בית יוסף` and eats at a returned result has acted on the statement "this place is certified by Badatz Beit Yosef" — a *stronger* assertion than a label, because the user decided the label mattered before seeing it.

Four rules, all evaluated by `matchesKashrutFilter(describeKashrut(place), chip)`:

- **F1 — a body chip matches `certifierId === <registry id>` and nothing else.** E5 gates `certifierId`, so an enum value can never put a record in a body filter again.
- **F2 — `מהדרין בלבד` matches `level === 'mehadrin'` AND `certifierId !== null`.** This is the correction the spine design got wrong and it is the single most important rule in this document.

  > **Why.** Halachically, *mehadrin* is not a property that exists apart from a certifier — mehadrin **by whom**. A bare `certifiedBy: "מהדרין"` is a self-declaration with no body behind it. Storing it (E7(b)) is faithful transcription; returning it to a user who explicitly asked for mehadrin is not. D4 spends four arguments refusing level-from-authority; admitting level-with-*no*-authority into the same filter is the more dangerous direction on the app's strongest claim surface.
  >
  > **Measured:** 362 records carry an evidence-backed `level: 'mehadrin'` after migration. **167 of them have an established certifier; 195 do not** — and 121 of those 195 rest on the single word `מהדרין`. One of them, `humus-eli-חומוס-אליהו-אשדוד`, carries `extra.webKosherLabel: "רגיל"` — its own source site says *regular*.
  >
  > **The chip returns 167.** The other 195 are **disclosed, not hidden** (F4).

- **F3 — the group chip unions the derived group and the stored one.** `certifierId ? registryGroup(certifierId) : certifierGroup`. Never defined in any candidate design, and it is the largest kashrut filter in the product.
- **F4 — every shrunk chip must state what it withheld.** When `מהדרין בלבד` or a body chip is active, the result header shows a count and a tap-through: *"195 נוספים מסומנים כמהדרין ללא גוף כשרות מזוהה"*. Withholding an unverifiable claim is right; hiding that you withheld it is not. Without F4 the user reads a shorter list as "not listed", and `ListScreen.tsx:385-392` keeps showing the active chip while the list silently comes back shorter.
- **F5 — extend D8's expiry exclusion to `mehadrinOnly`.** Today the exclusion at `filterPlaces.ts:47-52` sits inside the `if (f.kosherAuthorityGroup)` block; `mehadrinOnly` returns at `:37` before reaching it. Harmless today (0 mehadrin records hold a `certificateValidUntil`) and harmless after the 2026-09-11 cliff for the same reason — but the guard is structurally absent, so the first mehadrin certificate ever imported becomes filterable after it lapses.

**Filter populations, today → after** (simulated in memory against the real registry with the rules above):

| Chip | today | after | note |
|---|---:|---:|---|
| **מהדרין בלבד** | **1,100** | **167** | +195 disclosed via F4. The headline honesty cost |
| רבנות (group) | 569 | **621** | **grows** |
| בד״ץ בית יוסף | 216 | **255** | **grows** |
| בד״ץ העדה החרדית | 29 | **43** | **grows** |
| הרב מחפוד | 12 | **51** | **grows** |
| הרב רובין | 2 | **18** | **grows** |
| חוג חתם סופר | 2 | **4** | grows — but see §12 Q2 |
| צהר | 195 | **196** | |
| קהילות | 5 | **0** | `badatz-kehillot` is not a registered authority — §12 Q1 |
| גוף כשרות לא ידוע → "גוף כשרות לא אומת" | 847 | **1,254** | honest, and honestly labelled |

**Truthfulness-first is not merely subtractive.** Seven of ten chips grow. Routing through the registry recovers roughly **450 source-backed attributions the enum pipeline discarded because it read only `kosherType`** — 56 records land on `rabbinate-jerusalem`, 35 on `rav-landau`, 34 on `rabbinate-chief-israel`, 18 on `rabbinate-netanya`, and a long tail. **Records naming a specific certifying body go from 513 to 959.** What shrinks is exactly the fabricated part.

**Disclosed churn on the group chip.** The רבנות net of 569 → 621 conceals real movement: 318 records keep a rabbinate through a resolved `certifierId`, ~303 arrive as `groupOnly` rabbinate, and a set that is filed `rabbinate` today on the strength of an enum leaves. The migration report must print this per-chip in/out, not just the net.

---

## 7. The two namespaces

### 7.1 The decision

**The registry hyphen-case namespace becomes the canonical identity layer. The legacy underscore namespace is retired.**

- `src/data/kashrut/authorities.ts` (81 authorities, hand-edited, `KashrutAuthority.id`) and `scripts/reports/kashrut-registry.json` (the same 81 ids, 203 aliases, 58 reviewQueue verdicts) are the vocabulary. Verified: both files hold exactly the same 81 ids today, with zero diff in either direction — **in sync by luck, with no test binding them.** A validator check asserting id-set equality is 4 lines and closes that.
- `kashrut.certifierId` is the only field that stores an authority identity.
- `kosherAuthority` (519 records, 513 strings + 6 nulls) is frozen and read by nothing after Phase 4.
- The 9-entry hardcoded `byAuthority` map at `src/utils/kosher.ts:140-150` and the 9-entry `KOSHER_BODY_LABEL` at `:69-79` are **deleted**; labels come from `KashrutAuthority.nameHe`, so a new authority needs no code change. The 11-row hand-maintained option table at `KashruyotFilterScreen.tsx:24-37` is generated from the registry plus live counts. It stops being a third place where certifier names are hardcoded, which `authorities.ts:1-13` explicitly forbids.
- ~90 lines of dead legacy machinery in `src/utils/kosher.ts` go with it: `KOSHER_GROUP_MEMBERS`, `KOSHER_GROUP_LABEL`, `RAW_TO_GROUP`, `groupedKosherTypes`, `KASHRUYOT_FILTER_TYPES`, `ALL_KOSHER_TYPES` — verified zero references outside that file.

### 7.2 Why there is no flag day

**Correction to the established facts.** The premise that "`certifierId` has ZERO readers — it appears only in `src/types/place.ts:97` and a comment in `authorities.ts:20`" is **false at HEAD**. `certifierId` is read at **`src/utils/kosher.ts:130`**, at the top of `getKosherLabel`, with correct precedence over every legacy field, and it has a dedicated test file at `src/utils/__tests__/kosher.test.ts` with four cases covering null-vs-absent equivalence, registry precedence, unregistered-id fallthrough, and the legacy fallback.

That changes the transition plan materially:

```ts
export function getKosherLabel(place: …): string | null {
  if (place.certifierId != null) {
    const authority = getKashrutAuthority(place.certifierId);
    if (authority) return authority.nameHe;          // ← already live
  }
  …legacy structured branch…
  return place.kosherType ? (kosherTypeLabel[place.kosherType] ?? null) : null;
}
```

**Writing a registry id into `certifierId` is display-live immediately, with zero UI change, and degrades gracefully if the id is unknown.** So the namespace transition is not a cutover — it is an overlay that the existing code already prefers. Phase 2 can ship resolved ids to production and observe the label change before any read site is touched.

The remaining flag-day risk is on the **filter**, which still matches `place.kosherAuthority` (`filterPlaces.ts:45`) against underscore keys from `KashruyotFilterScreen.tsx`. That is 8 chips that would silently return zero results — `matchesExactFilters` just returns `false`; no error, no distinguishable empty state. **The filter and the chip table must be re-keyed in the same commit.** This is the one place a partial migration breaks the product silently, and it is the reason §11 puts them in one task.

### 7.3 The one trap to avoid

**Deleting the structured fields without deleting `kosherType` reinstates the exact false claim being removed.** The gate at `src/utils/kosher.ts:138` is `if (kosherAuthorityGroup || kosherLevel)`. Delete both and control falls to `:166` — `kosherTypeLabel[place.kosherType]` — whose labels name specific certifying bodies. Worked against the 50 tier-4 `badatz_beit_yosef` records: deleting `kosherLevel` + `kosherAuthority` + `kosherAuthorityGroup` makes the card display **`בד״ץ בית יוסף` again**, via the legacy path.

**249 records already live in that state today**, including 2 displaying `בד״ץ בית יוסף`, 2 `בד״ץ העדה החרדית`, 2 `בד״ץ הרב רובין` and 1 `הרב מחפוד`, on a legacy enum and nothing else.

This design does not hit that trap, because it never deletes anything: it **freezes** the legacy fields and stops reading them, and `getKosherLabel` is replaced wholesale by `describeKashrut`, which reads `kashrut` and nothing else. But the trap must be stated, because any plan that "cleans up the bad fields" lands in it.

---

## 8. Migration plan, by evidence tier

One script, `scripts/migrate-to-kashrut-claim.mjs`, **dry-run by default**, backup to `data-backups/` before write, reusing the acceptance harness at `scripts/apply-kashrut-authorities.mjs:116-189` — separate `original` parse, byte-identical id list in order, allow-listed diff fields, refuse-on-problem. Two of that harness's checks must be adapted, not copied:

- **CHECK 7** fires on `o.kosherLevel && p.kosherLevel !== o.kosherLevel`, which includes *clearing*. Under this migration nothing clears `kosherLevel` (it is frozen), so CHECK 7 holds unchanged — but the equivalent check must be re-expressed against `kashrut.level`: **no record may gain a level it did not have, and no `regular` may become `mehadrin`.**
- **The reviewQueue guard** at `:160-167` fails the run if a reviewQueue record is modified at all. Under E9 those records are modified (they gain a `kashrut` object). The guard is re-expressed as: a reviewQueue record's `kashrut.deferred` must be non-empty, and its `certifierId`/`level` must equal exactly what `Q` affirms.

### 8.1 Disposition by tier

| Tier | n | Evidence value | Preserved | Removed as a *displayed claim* | Newly representable |
|---|---:|---|---|---|---|
| **1** certificate | **180** | `'certificate'` | all 180 `certUrl`, 164 `validUntil`, all 164 `standards`, all 180 resolve to `certifierId: 'tzohar'` | the `level: 'regular'` on all 195 Tzohar records — from `MAP`, not from any PDF | 16 records get `documented` (document held, currency unknown) instead of over-claiming `certified` |
| **2** free text | **1,380** | `'attestation'` | every `statedAs` byte-identical; **1,447 of 1,560** `certifiedBy` values exact-match an alias, **0 unmatched**; 113 match the reviewQueue | 124 records lose a named body (see 8.2); 1,386 lose a level | 279 `groupOnly`; 266 level-without-body; 113 per-question `deferred`; 26 `compound` |
| **3** listing | **62** | see 8.3 — **split** | the source link | the 13 named bodies resting on `kosherType` alone | — |
| **4** legacy enum | **589** | `'legacy'` | `kosherType` frozen; the fact the place is kosher and belongs in Karov | **all 98 named bodies**; 276 mehadrin claims; 294 regular claims | `כשר · לא אומת` — a true statement where a false one stood |
| **5** nothing | **20** | *no `kashrut` object* | the records themselves | — | they become countable instead of invisible |

### 8.2 What is lost, exactly

| Withdrawn | n | Recoverable? |
|---|---:|---|
| Level assertions | **1,386** (739 `mehadrin`, 647 `regular`) | Yes — `kosherLevel` frozen on the record |
| Levels newly gained | **5** | — |
| **Levels changed in value** | **0** | *Not one record is upgraded or downgraded. The change is entirely assertion → honest silence.* |
| Named-body attributions | **124** | Yes — `kosherAuthority` frozen |
| ↳ of which tier-4 enum-only | **98** | The sharpest cell. **0 keep a certifier.** |
| ↳ of which carry real certifier text | **13** | **Recoverable by a registry decision, not by re-import** — see below |
| ↳ other (sourceUrl / mismatch) | 13 | |
| Stored `kosherAuthorityGroup` | 1,877 | It was derived in the first place; recomputed from `certifierId` |

**The 13 withdrawn-with-text records are the one category where a human decision recovers real data.** Every one names a body the registry has not minted an id for:

- `בד"ץ קהילות` ×3 + `בד"ץ קהילות קריית ספר` ×1 → `badatz-kehillot` (unregistered)
- `בד"ץ מהדרין ירושלים` ×3 (מאפה נאמן) → reviewer refused to mint; **currently displayed as `רבנות ירושלים מהדרין`, the exact merge the reviewer refused in writing**
- `בד״צ חתם סופר` ×2 → `badatz-chatam-sofer` (unregistered; distinct from the registered Petah Tikva body)
- `בד"צ בית ישראל, העדה החרדית` ×2 → compound
- `כשר למהדרין` ×1 (`9000113`) → names no body; **currently displayed as `בד״ץ בית יוסף`**
- `בד"ץ בית יוסף / רבנות מהדרין` ×1 → compound

More broadly: **11 of the 27 affirmed `suggestedAuthorityId` values in the reviewQueue are not in `KASHRUT_AUTHORITIES`** — `badatz-kehillot`, `badatz-yoreh-deah`, `badatz-chatam-sofer`, `badatz-machzikei-hadass-belz`, `rav-refael-manat`, `rav-gerlitzky`, `rav-diskin`, `rav-hendel`, `rav-binyamin-cohen`, `rabbinate-yafo`, `rabbanei-hakrayot`. They cover **28 food records**. Registering them is a bounded, high-value human act. **§12 Q1.**

### 8.3 The 62 tier-3 records — where a human decision is required, not a mechanical rule

This is the one place the migration has no defensible default, and two of the four candidate designs papered over it with arithmetic.

The 62 split cleanly by host:

| Host | n | `kosherType`? | Honest reading |
|---|---:|---|---|
| `www.il-yekavim.co.il` | **18** | **no** | A general Israeli winery directory, not a kashrut source. **No `kashrut` object.** These are 18 of the 20 tier-5 records. |
| `www.prego.co.il` | 20 | yes | The chain's own marketing site |
| `www.dominos.co.il` | 10 | yes | ditto |
| `www.papajohns.co.il` | 8 | yes | ditto |
| `coffeetrail.co.il` | 6 | yes | ditto — and 2 of these carry the literal output of the `scrape-coffeetrail.mjs:126` fabrication |

**Decision: `evidence: 'listing'` requires an allow-listed kashrut-scoped host (E4). None of these five hosts qualifies.** A pizza chain's own homepage is not a kashrut directory. So:

- The **44** brand-site records fall to `evidence: 'legacy'` (they have a `kosherType`), `certifierId: null`, `level: null`. They keep their kosher status and drop out of every body and level filter. The 13 named bodies among them are withdrawn.
- The **18** wineries get **no `kashrut` object**. They join the 2 Rebar records in tier 5.

**`foodWithoutKashrut` stays at 20 and does not move.** This matters: `docs/ARCHITECTURE_REVIEW.md:527` already tracks these 20 as an open religious-safety item (*"18 יקבים + 2 רי-בר שדורשים אימות כשרות ממקור רשמי"*), and `scripts/validate-data.mjs:198-208` only ever lets a ratchet **fall**. Classifying the 18 as `listing` would have written an affirmative "כשר" onto 18 **wine** records — the most halachically sensitive category in the dataset — and closed a tracked open gap by fiat. **Do not do that.** §12 Q4 asks the owner how to resolve them properly.

`src/data/kashrut/listing-sources.ts` therefore ships **empty**, with a comment stating the bar: a host qualifies only if its published scope is kosher establishments. It exists so that the day a genuine kashrut directory is imported, the rule is already there.

### 8.4 What is preserved, byte-for-byte

Every record (7,471 in, 7,471 out, ids byte-identical and in order). Every `certifiedBy` string (1,560, into `statedAs`, asserted by E10 forever). Every `kosherType` (2,126, frozen). All 180 certificate URLs, all 164 expiry dates, all 164 `kosherDetails`. All 58 reviewQueue verdicts — now **on the records they protect**, per-question, instead of in a side file one program happens to read.

### 8.5 Human decisions required (not mechanical)

| # | Decision | Records affected |
|---|---|---:|
| 1 | Populate `group` on the 23 null-authority aliases | 279 |
| 2 | Register (or refuse) the 11 unregistered reviewQueue authority ids | 28 |
| 3 | Bare `כשר` → `level: 'regular'`? The reviewer explicitly deferred this as *"needs a project-wide policy call"* | ~100 |
| 4 | The 20 evidence-free food records | 20 |
| 5 | `chatam_sofer` → `badatz-chatam-sofer-petah-tikva`, which adds a city the legacy id never asserted | 2 |
| 6 | Ship `מהדרין בלבד` at 167 strict, or default to 362 with the F4 disclosure? | 195 |

**Everything else in the migration is mechanical.**

---

## 9. Re-run / idempotency guarantee

### 9.1 The mechanism

**Every rule is a predicate over the shipped data, evaluated by `scripts/validate-data.mjs`, not a discipline inside a writer.** A claim that violates E5, E7, E13 or E14 fails `npm run verify`, which is exactly what CI runs (`.github/workflows/ci.yml`). It does not matter which program wrote it, or whether that program read this document.

Three specific guarantees, and the honest limits of each:

- **A body claim from an enum is unwritable.** E5 admits three antecedents: a certificate whose issuing body resolves through the alias table, an exact alias match, or an affirmed reviewQueue suggestion. `kosherType` is not among them, and E13 prevents `kosherType` from being *changed* into something that would be.
- **A level claim from an authority name is unwritable.** E7 takes no `certifierId` input, and the forbidden check in §5 is a test, not a comment.
- **A legacy top-level write is caught.** This is the failure the "extensibility" design missed and it is worth naming: `migrate-kosher-fields.mjs` writes **top-level** `kosherLevel`, not `kashrut.level`. A rule scoped to the `kashrut` subtree would not see it and the validator would stay green. **E13 is the rule that closes this** — it pins all eight legacy fields byte-identical against `git show HEAD:`, so a re-run of the old script is a hard fail on 1,877 records. E13 is load-bearing; it is not bookkeeping.

### 9.2 The suppression problem — a removed claim must stay removed

Three of the four candidate designs have the same hole and it is subtle. Make absence the only representation of "not established", and a human who deliberately removes a level leaves a state indistinguishable from "never set". Then `apply-kashrut-authorities.mjs:102-105` — `if (alias.level && !p.kosherLevel) p.kosherLevel = alias.level` — re-creates it on the next run. **That is the root defect's exact shape, inside the new pipeline.**

Worse, if the "not established" counts are CI ratchets that may only fall, retracting an unsupported claim makes the count *rise* and **the build goes red**. The design would have made retracting a false claim a build failure — inverting its own core value.

Two fixes, both required:

1. **`certifierId` and `level` are REQUIRED keys holding `null`, not absent keys.** A writer that must produce `null` explicitly cannot produce it by omission, and `null` there is a value a rule licensed, not a gap a rule can fill. The keys are nested, so `clean-nulls.mjs` cannot strip them (verified: it is a top-level-only map).
2. **The ratchets count *unsupported* claims, not *unknown* ones.** Ratchet `kashrutEvidenceLegacy` (589 → 0) and `kashrutCompoundUnresolved` (26). Do **not** ratchet `kashrutCertifierNotEstablished` (1,254) or `kashrutLevelNotEstablished` (1,717) — report them, chart them, never gate on them. A number that must fall is a number someone will fill.

### 9.3 The scripts, by name

| Script | Disposition |
|---|---|
| `scripts/migrate-kosher-fields.mjs` | **RETIRED.** Not deleted — a `RETIRED` header explaining the defect plus a `process.exit(1)` guard at the top. Deleting it loses the record of what happened; leaving it runnable is leaving a loaded weapon. **Its `MAP` moves into the migration report as documentation of what the 1,877 records used to assert**, and into a validator test fixture: *a record shaped exactly like this script's output must fail E5, E7 and E13.* That fixture is the regression test for the entire defect. |
| `scripts/apply-kashrut-authorities.mjs` | **REWRITTEN**, not left alive. Today it writes the top-level `certifierId` this design moves, plus `kosherLevel` and `kosherAuthorityGroup` — two of which E13 freezes. Re-running it after migration would silently reintroduce the dead second namespace and no rule would catch it. It becomes the single canonical resolver, emitting into `kashrut`, with rule (b) writing `certifierId: null` explicitly (never omitting), rule (c) gated on E7, and rule (d) deleted entirely (group is derived, D1). |
| `scripts/clean-nulls.mjs` | **GUARDED.** It would hard-fail E13 on its next run by deleting `kosherAuthority: null` from the 6 records that still carry it. Add a top-of-file refusal for the eight frozen fields. |
| `importers/tzohar/import-food.mjs:139-148` | `CERT_PATCH` stops writing `kosherAuthority`/`kosherAuthorityGroup`/`kosherLevel` and emits a `kashrut` object with `evidence: 'certificate'`. It is the source of all 195 fabricated Tzohar `regular` levels. |
| `importers/coffee-carts/scrape-coffeetrail.mjs:124-130` | **`inferKosherType` deleted.** It returns `'rabanut_mekomi'` when `certifiedBy` is empty. This is the fabrication mechanism, named. |
| `importers/kosher-restaurants/importer.ts` | Emits `statedAs` + `evidence` only. No `kosherType`, ever. |
| `scripts/dedupe-places.mjs:104` | Deny-list `kashrut` from field-level inheritance — **and** add a pre-merge assertion that the keeper does not lose a `certUrl` the loser held. The nesting fixes claim-severing; it introduces a certificate-loss path if the keeper is chosen by raw field count and the loser holds the only document. |
| `scripts/manual-batches/*.json` | Authoring shape becomes: the raw certifier string, the source URL, and nothing else. A ~40-line `scripts/lint-batch.mjs` rejects any batch that types a level or a group directly. Authors type strictly *less*. |
| The ~23 absolute-path scripts | Untouched. They cannot run in CI, and the validator now catches whatever they write. |

---

## 10. What this does not solve

### 10.1 Inside kashrut

1. **A wrong registry alias.** If a human maps `בד"ץ פלוני` to the wrong `authorityId`, every record with that string is confidently wrong and every check passes. The design shrinks the trusted surface from 2,213 records to **203 alias strings + 81 authorities + 58 verdicts** and makes every claim traceable to one of them. Trust roots are not eliminable.
2. **A lying or stale source.** A restaurant's own site claiming a hechsher it does not hold is transcribed faithfully. `resolvedAt` makes re-review targetable; nothing forces a re-look.
3. **Revocation.** The model expresses expiry, not withdrawal. Tzohar's de-supervision list is the only published withdrawal signal in Israel and is still not consumed.
4. **The 2026-09-11 cliff.** 152 certificates lapse on erev Rosh Hashanah (12 more are already expired at 2026-08-25; 10 more expire 2026-04-01). On 09-12, 164 cards flip to `⚠️ תעודת כשרות פגה` and the צהר filter drops from 183 to **31** — every survivor a record with *no certificate document at all*. **The filter inverts: it purges the best-evidenced records and keeps the unevidenced ones.** No schema fixes this. `importers/tzohar/extract-cert-expiry.mjs --refresh` must run after 09-12, wired into CI as its own dated check.
5. **A transcription error.** Evidence-first verifies the paper trail, not the world.

### 10.2 The cross-cutting findings, and how to sequence them

The unsupported-claim pattern generalises. Two fields are **worse** than kashrut.

| Finding | Scale (verified) | Severity | Sequence |
|---|---:|---|---|
| **`category` (בשרי/חלבי/פרווה)** — a **halachic** classification derived from a regex on the business name (`scripts/categorize-food.mjs`, ~130 name patterns, first match wins; the widest rule is `/קפה/i → dairy`), plus 104 hardcoded entries under `// Categories from AI research`. It is a user-facing filter (`filterPlaces.ts:53`) and a card badge. **Never audited.** | **2,096** food records | **Same class, same religious stakes.** A user who has just eaten meat filters חלבי on a regex that matched a substring in a business name | **Immediately after kashrut.** Same pattern, and it is the cheapest possible proof the design generalises: if `KashrutClaim` cannot be reshaped into a `category` equivalent in an afternoon, the kashrut design was wrong — and you learn that for the price of one field |
| **`lastVerifiedAt`** — declared at `place.ts:64` as *"the info was last verified by an admin"*; written as `new Date()` at import time (`importers/religious-councils/importer.ts:63`, `importers/mikvahs/importer.ts:49`, 20+ others) | **6,365** records, **25 distinct values**, 5,599 on a date shared by ≥100 others | **This is the field that defeats the audit you are building.** An audit against a field that lies produces confident wrong answers | **Before or alongside kashrut.** Rename to `importedAt` (nothing in the app displays it, so this is cheap) or set it only on real verification events |
| **`source: 'seed'` on 334 genuine records** — real council mikveh (203) and Chabad (131) records with per-record `sourceUrl`s. `AGENTS.md` rule 1 says the seed is fictional demo data that must not reach production | **334** | Anyone enforcing that rule by purging `source === 'seed'` **deletes 334 genuine records while believing they are enforcing additive-only** | **Before kashrut.** One-line fix, removes a trap |
| **`provenance` — undeclared in the type, four incompatible shapes** (origin vs enrichment), surviving only because `sanitizePlace` spreads raw at `OsmPlacesRepository.ts:23`. **Verified: 3,092 records carry it and ZERO of them are food records** | 3,092 / 0 food | The type system offers no protection for provenance and would offer none to a new evidence field | **Declare it before kashrut** (cheap, ~15 lines). **Do not normalise it as part of the kashrut work** — none of those records carries a kashrut claim. Two candidate designs built their kashrut evidence gate on `provenance.sourceUrl` and would have failed on every food record |
| **Coordinates** — 4,895 records carry no `locationPrecision` at all, which `place.ts:80` says outright "is not the same claim as 'exact'"; the UI treats it exactly as exact. Plus 585 records on 219 council-default coordinate stacks, and a reverse-geocode loop (`fix-addresses.mjs` ⇄ `geocode-addresses.mjs`) that manufactures two apparently independent facts from one | 4,895 / 585 / 527 | Real, but **not religiously consequential** — a wrong pin costs a wasted trip, not a violated prohibition | **After category.** Two deliverables: display "absent precision" as its own state; ratchet the mechanically-detectable council-default stacks |
| **`src/data/generated/restaurants.osm.json`** — 821 KB, last written 2026-08-22 vs `places.osm.json` 2026-08-24; a dozen enrichment scripts still write to it and **nothing in `src/` reads it** | — | Anything run against it silently diverges | Delete or redirect. 30 minutes |
| **Two inert ratchets** — `kashrutAuthorityUnknown` and `freeTextCertifierUnmapped` are in `RATCHET_KEYS` (`validate-data.mjs:180-188`) but absent from `data-quality-baseline.json` → `was = Infinity` → **neither can ever regress** | — | The two kashrut ratchets that exist today do nothing | Fixed by §11 Phase 4 |

**Two things that are NOT defects, so remediation does not chase them:** the 1,654 float32 coordinate artifacts (sub-metre, serialization-only), and identical values that are individually sourced — 46 Pizza Shemesh branches share one opening-hours string and each carries a distinct per-branch `sourceUrl`. **Any duplicate-detector built on value collision alone produces that false positive at scale** (1,253 chain-website records, 348 call-centre phones). The `sourceUrl` is what settles it.

**Opening hours had this exact defect and was corrected.** `enrich-type-hours.mjs` assigns hours from a name regex; `enrich-chain-hours.mjs` stamps 22 chain defaults. **Live occurrences of both: 0.** Superseded by per-branch research. Both scripts remain runnable with no dry-run flag. Guard or delete them so it cannot return. This is the useful precedent: the project has fixed one instance of this pattern before.

**Do not build a framework.** The right shape already exists in this file and shipped: `locationPrecision` + `locationSource` is two fields beside a value answering *how good is this* and *who produced it*, with a doc comment that is a verbatim statement of the owner's rule and a UI that renders the honest degraded state. The counter-evidence is equally decisive: **the same idea has been re-invented eight times inside `extra`** — `geocodePrecision`, `coordSource`, `gpsSource`, `confidenceLevel`, `newnessConfidence`, `manualSeed`, `extra.provenance`, and the `sourceRef` draft in `map-provenance.mjs`. None shared, none typed, none read by the UI. Solving kashrut with a ninth bespoke mechanism is the failure mode. `KashrutClaim` is the shape; `category` is the test of whether it is the *right* shape; that is the whole generalisation.

**The two-question test, for `AGENTS.md`.** A field needs an evidence marker iff both: **(Q1) is it derived** — does the app compute or classify it rather than copy it from a source string? **(Q2) is it un-self-correcting** — if it is wrong, does the user act on it with no signal? `kosherLevel`: yes/yes. `category`: yes/yes. `locationPrecision`: yes/yes. `phone`: no — a wrong number fails loudly on first dial. `openingHours`: no. Today the test selects exactly three field families. It will select very few more, and that is the test working.

**One item folded into kashrut, not deferred:** `extra.webKosherLabel` holds a raw kashrut string on **72 food records** — `"מהדרין"` ×38, `"רגיל"` ×7, `"בית יוסף"` ×1, plus 26 mojibake-corrupted copies. It sits outside every kashrut field and is invisible to the entire audit. **49 of the 72 disagree with the record's own `certifiedBy`.** It is kashrut evidence hiding in the escape hatch; migrate it into `statedAs` handling or into a named reconciliation queue.

---

## 11. Staged plan

Each phase leaves the app working and is independently shippable. **⚑ = owner sign-off required. All else is mechanical.**

### Phase 2 — pipeline correction (data-safe; nothing user-visible)

| # | Task | Files | Records | Done when |
|---|---|---|---|---|
| 2.1 | Add `src/types/kashrut.ts`; add `kashrut?: KashrutClaim` to `Place`; `@deprecated` on the six superseded fields; declare `provenance` in the type | `src/types/place.ts`, `src/types/kashrut.ts` | — | `npm run typecheck` clean |
| 2.2 | Write `describeKashrut` + `matchesKashrutFilter` + `kashrutBadgeTone` behind a shim that still reads the legacy fields. **No behaviour change** | `src/utils/kashrut.ts` (new) | — | New unit suite green; `getKosherLabel` output byte-identical over all 2,213 records |
| 2.3 | Registry id-set equality check between `authorities.ts` and `kashrut-registry.json` | `scripts/validate-data.mjs` | — | Test binds the two files; it does not today |
| 2.4 | **⚑ Human pass 1:** `group` column on the 23 null-authority aliases + `suggestedGroup` on reviewQueue entries naming a class | `scripts/reports/kashrut-registry.json` | 279 | 23 strings decided; ambiguous ones set `null` with a note |
| 2.5 | **⚑ Human pass 2:** register or refuse the 11 unregistered reviewQueue authority ids | `src/data/kashrut/authorities.ts` + registry | 28 | Each decided with a written reason |
| 2.6 | Retire `migrate-kosher-fields.mjs`: `RETIRED` header + `process.exit(1)`. Move its `MAP` into a validator test fixture that **must fail** E5/E7/E13 | `scripts/migrate-kosher-fields.mjs`, `scripts/__tests__/` | — | The fixture fails; the failure message names the rule |
| 2.7 | Guard `clean-nulls.mjs` against the eight frozen fields; deny-list `kashrut` in `dedupe-places.mjs:104` and add the keeper-loses-certUrl assertion | 2 scripts | — | Both refuse on a crafted input |
| 2.8 | Delete `inferKosherType` from `scrape-coffeetrail.mjs`; stop `importers/tzohar/import-food.mjs` writing level/authority/group | 2 importers | — | Neither can emit a `kosherType` or a level |
| 2.9 | Fix `source: 'seed'` on the 334 genuine council/Chabad records (cross-cutting, prerequisite) | data + importer | 334 | `source === 'seed'` returns only real seed |

**Proof Phase 2 is done:** `npm run verify` green; `getKosherLabel` output identical over all 2,213 food records; the `migrate-kosher-fields.mjs`-shaped fixture fails validation with a named rule.

### Phase 3 — data remediation (the release a user sees)

| # | Task | Files | Records | Done when |
|---|---|---|---|---|
| 3.1 | Write `scripts/migrate-to-kashrut-claim.mjs`, dry-run default, backup, adapted acceptance harness | new script | — | Dry-run report matches §6.5 and §8.1/8.2 exactly, with **no unexplained residue** |
| 3.2 | **⚑ Review the dry-run report.** Every changed label must attribute to a counted bucket. Per-chip in/out churn printed, not just net | report | 2,213 | Owner signs the report, not the diff |
| 3.3 | Apply. `kashrut` written additively; all eight legacy fields byte-identical | `places.osm.json` | 2,193 gain `kashrut`; 20 do not | E1–E14 pass as **ratchets** (warn, not fail) |
| 3.4 | Cut the read sites to `describeKashrut`; delete the shim; delete the ~90 lines of dead legacy machinery in `kosher.ts` | `kosher.ts`, `certificate.ts`, `PlaceCard.tsx`, `PlaceDetailScreen.tsx`, `PlaceBottomCard.tsx`, `filterPlaces.ts`, `searchEngine.ts` | — | `certifiedBy` still indexed at boost 7 — via `statedAs`. **Search must not lose its second-highest-weighted field** |
| 3.5 | **Re-key the filter and the chip table in ONE commit.** `KashruyotFilterScreen.tsx:24-37` generated from the registry; `filterPlaces.ts:39-52` matches `certifierId`; `PlaceFilters.kosherAuthorityGroup` splits into `certifierId` + `kashrutGroup` + `certifierEstablished` | 4 files + `types/filters.ts` | 10 chips | No chip returns zero because it points at a retired key |
| 3.6 | F4 withheld-count affordance; F5 expiry guard on `mehadrinOnly`; `isFoodType` gate replacing `type === 'restaurant'` on the detail and map kashrut rows | `ListScreen.tsx`, `FoodListScreen.tsx`, `PlaceDetailScreen.tsx:426`, `PlaceBottomCard.tsx:19` | 771 non-restaurant food records gain a kashrut row | Every shrunk chip states its withheld count |
| 3.7 | i18n: ~12 keys × 5 languages; retire the hardcoded Hebrew in `getKosherLabel` and `PlaceCard.tsx:188` | `src/i18n/*.ts` | — | No Hebrew literal in `src/screens/`, `src/components/` for kashrut |
| 3.8 | Migrate `extra.webKosherLabel` (72 records, 49 disagreeing) into `statedAs` handling or a named queue | data | 72 | No kashrut string left in `extra` |

**Proof Phase 3 is done:** `npm run verify` green; a manual pass over 20 sampled records across all 8 display states; **`מהדרין בלבד` returns 167 with a visible "+195 withheld" affordance**; every one of the 98 sharpest-cell records reads `כשר · לא אומת`; the 12 already-expired Tzohar certificates still read `⚠️ תעודת כשרות פגה`.

> **3.3 and 3.4 must ship together or the deletion inverts.** Writing `kashrut` while `getKosherLabel` still runs leaves the legacy fallback at `kosher.ts:166` live — the very path that re-asserts `בד״ץ בית יוסף` from a frozen enum. §7.3.

### Phase 4 — validation and lock-in

| # | Task | Files | Done when |
|---|---|---|---|
| 4.1 | E1–E14 promoted from ratchet to **hard fail** | `scripts/validate-data.mjs` (~110 lines) | CI blocks a violating commit |
| 4.2 | Ratchets: **add** `kashrutEvidenceLegacy` (589→0), `kashrutCompoundUnresolved` (26). **Report but never gate** `kashrutCertifierNotEstablished` (1,254), `kashrutLevelNotEstablished` (1,717). **Remove** the two inert keys | `validate-data.mjs`, `data-quality-baseline.json` | Baseline regenerated once, with the jump documented in the commit message |
| 4.3 | Delete top-level `certifierId` from the `Place` type; rewrite `apply-kashrut-authorities.mjs` to emit into `kashrut` | `place.ts`, 1 script | No writer can produce a top-level `certifierId` |
| 4.4 | One negative test per refused derivation — *a `legacy` record cannot produce a `certifierId`*; *no `certifierId` produces a `level`*; *no body-less level word enters `mehadrinOnly`* | `src/utils/__tests__/kashrut.test.ts` | These keep D4/D5 refused after everyone who argued about it has moved on |
| 4.5 | Dated CI check: `extract-cert-expiry --refresh` must have run after 2026-09-12 | CI | The 152-certificate cliff is a calendar item the build tracks |
| 4.6 | **⚑** `AGENTS.md`: add I6 (additive-only governs evidence), the two-question test, and "no numeric confidence scores" | `AGENTS.md` | Written down where the next agent reads it |

**Proof Phase 4 is done:** `npm run verify` red on each of five crafted violating records (enum→body, authority→level, date-without-document, absent `certifierId` key, mutated frozen field). Test count above the current **204** `it()` calls (`AGENTS.md`'s "233" is stale — read the actual output).

---

## 12. Open questions for the owner

Five. Each is a genuine product, religious or risk decision that evidence cannot settle.

**Q1 — Register the 11 unregistered reviewQueue authority ids?**
`badatz-kehillot`, `badatz-yoreh-deah`, `badatz-chatam-sofer`, `badatz-machzikei-hadass-belz`, `rav-refael-manat`, `rav-gerlitzky`, `rav-diskin`, `rav-hendel`, `rav-binyamin-cohen`, `rabbinate-yafo`, `rabbanei-hakrayot`. **28 food records**, including the 4 `בד"ץ קהילות` records and the live `קהילות` chip, which otherwise goes to zero. Registering an id asserts that Karov recognises a body as a distinct certifying authority — a rabbinic-identity call, not an engineering one. *Refusing is safe and costs 28 records their attribution.*

**Q2 — `בד״צ חתם סופר` → `badatz-chatam-sofer-petah-tikva`?**
2 records. The registry's only Chatam Sofer id names a city the source text does not. Mapping them adds geographic specificity Karov invented. *Recommendation: do not map. Register a city-less `badatz-chatam-sofer` under Q1, or leave both as `groupOnly: badatz`.*

**Q3 — Does bare `כשר` establish `level: 'regular'`?**
~100 records. The registry reviewer explicitly refused to decide this: *"Needs a project-wide policy call on bare כשר"* and *"Do NOT resolve this by setting level=\"regular\" — that would misrepresent a Sephardi bassar-chalak badatz."* An alias row for `כשר` currently carries `level: 'regular'`. Under E7(b) that row would license 100 level claims. **This document's recommendation, per I4: set that alias's `level` to `null` and let those 100 read "רמת כשרות: לא נקבעה".** A downgrade is a claim too. But it is the owner's call, and it is the one alias row that moves 100 records.

**Q4 — The 20 evidence-free food records (18 wineries + 2 Rebar).**
`AGENTS.md` says a restaurant with no kashrut evidence does not enter the dataset. It also says a record is never deleted. Both cannot hold for records already in. **Options:** (a) source real kashrut for them — for wineries this is halachically necessary and probably obtainable; (b) keep them with no `kashrut` object, showing no kosher claim, and accept that a kosher-places app lists 18 wineries whose kashrut it cannot state; (c) mark them as a non-kashrut "context" category. *Recommendation: (a), with (b) as the interim state — which is what this migration ships. Do not manufacture a `listing` claim for them.*

**Q5 — Ship `מהדרין בלבד` at 167 strict, or at 362 with the F4 disclosure?**
167 = a named certifying body plus an evidence-stated level. 362 = adds 195 records whose level rests on an unattributed word, 121 of them on the bare string `מהדרין` — one of which carries `"רגיל"` in its own source metadata. **This document recommends 167 with the "+195" disclosure, on I4.** It is the largest single user-visible cost of the whole change, and it is a religious-safety judgement, not an engineering one. Whoever signs this signs that number.

---

## Appendix — corrections to prior reports

Load-bearing errors found in the inputs, corrected above. Recorded so they are not propagated.

| Claim | Correction |
|---|---|
| *"`certifierId` has ZERO readers; it appears only in `place.ts:97` and a comment in `authorities.ts:20`"* | **False at HEAD.** Read at `src/utils/kosher.ts:130` with correct precedence, and covered by 4 tests in `src/utils/__tests__/kosher.test.ts`. This is what makes the namespace transition an overlay rather than a cutover (§7.2). |
| *"`reviewQueue[]` = 58 raw strings a human explicitly DEFERRED"* | **27 carry an affirmed `suggestedAuthorityId` (12 of them already registered) and 11 an affirmed `suggestedLevel`.** Blanket-nulling on reviewQueue membership destroys 49 records' worth of confirmed attributions. |
| *"provenance… the design needs only to declare the shape that exists"* (used as an evidence gate) | **3,092 records carry `provenance`; ZERO are food records.** Any kashrut evidence predicate keyed on `provenance.sourceUrl` fails on every food record. |
| *"`mehadrinOnly` drops from 1877"* | 1,877 is records with **any** level (1,100 mehadrin + 777 regular). The filter matches `kosherLevel === 'mehadrin'` = **1,100**. |
| *"the 195 Tzohar records all have `certifiedBy: 'צהר'"* | 194 do; **195** carry `kosherAuthority: 'tzohar'`. The odd one, `cafe-taizu-sharona-259b7497`, has no `certifiedBy`, no `certUrl` and no `sourceUrl` — it falls to `evidence: 'legacy'`. |
| *"one real multi-hechsher case"* | **26 records, 25 distinct strings**, 11 naming a rabbinate and a badatz together. §6.4. |
| *"164 certificates lapse on 2026-09-11"* | **152** on 2026-09-11; 10 on 2026-04-01; 2 in 2025. **12 are already expired at 2026-08-25.** 164 hold a `validUntil` at all; 180 hold a document; 16 hold a document with no date. |
| *"`kosherAuthorityGroup: 'unknown'` makes `validate-data.mjs:147` lie"* | It does not. Food records with `group === 'unknown'` and no `kosherType` and no `certifiedBy` = **0**. `foodWithoutKashrut` = 20 either way. Deleting the sentinel is still right; that justification is not. |
| *"tier 3 = 44 listing records"* | **62** by any-`sourceUrl`; 44 of those also carry a `kosherType`, and 18 have no kashrut field at all. All 62 are on brand marketing sites or a general winery directory — **none is a kashrut-scoped listing.** §8.3. |
| *"the null loss was caused by `dedupe-places.mjs`"* | **`scripts/clean-nulls.mjs`** — 20 lines, unconditional, top-level-only. It is also why nesting works. |
| *"1,877 nulls became 6"* | Direction right. 1,600 food records map to a null-authority enum row; 249 food records carry a `kosherType` with no level at all, so 1,877 is not "the migrated set" at HEAD. |
| *"233 tests"* (`AGENTS.md`) | **204** `it()` calls across `src/`. `AGENTS.md` itself says to read the actual output. |
| *"the design prevents a re-runnable enum→claim job"* (evidence-chain §6.4, extensibility §7.1) | Neither did. `kosherType` stays frozen and readable, and a rule scoped to the `kashrut` subtree does not see a **top-level** `kosherLevel` write. **E13 is the rule that actually closes this** (§9.1). |
