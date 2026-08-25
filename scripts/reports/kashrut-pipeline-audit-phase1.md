# Kashrut Pipeline Architecture Audit — Phase 1

**Status: investigation/design only. No writes were made to `places.osm.json`, `kashrut-registry.json`, or any script's behavior during this audit.** Every count below comes from a read-only script (`scripts/reports/kashrut-pipeline-failure-mode-census.mjs`) or from full-file reads of the scripts named. Sections F and G are proposals for the owner to review, not instructions that were executed.

**Owner's core rule, which this whole report is organized around:**
> A structured kashrut claim must not be created unless there is evidence supporting that specific claim. `kosherAuthority`, `kosherLevel`, certificate identity, and source/provenance are separate facts. One must not automatically imply another unless we have an explicitly documented and justified rule for doing so.

This builds on two prior reports rather than repeating them: `kashrut-data-model-inspection.md` (field map, pipeline audit, git-blame trace) and `kashrut-data-model-inspection-round2.md` (per-record tables for 6 disputed records, namespace map, external institutional research, the 8 Beit Yosef level defect, proposed `migrate-kosher-fields.mjs` fix). The owner has already approved the 6-record fix that came out of round 2. This report is the requested full-pipeline audit that goes beyond those two scripts.

---

## Two facts that shape everything below

**1. The "correct" pipeline exists only as uncommitted working-tree state.** `scripts/apply-kashrut-authorities.mjs`, `scripts/reports/kashrut-registry.json`, and `src/data/kashrut/authorities.ts` are all `??` (untracked) in `git status` right now — never committed, in no commit history, on no branch. The only *committed* kashrut-authority code is the legacy, unguarded `scripts/migrate-kosher-fields.mjs` (committed 2026-08-05, commit `159a969a`) and the read-only `scripts/preview-kosher-fields.mjs` (same commit). This repo is a shared working tree with multiple concurrent sessions and no isolation (see project memory `project_shared_working_tree`) — the entire registry-driven design is one `git clean -fd` / `git checkout .` / careless reset away from being permanently lost, by any session, including one with no idea it exists. This is independent of every other finding in this report and should be treated as urgent regardless of what Phase 2/3 timeline the owner picks.

**2. Clearing a derived field does not always remove the claim from the screen.** `src/utils/kosher.ts`'s `getKosherLabel()` falls back to `kosherTypeLabel[place.kosherType]` whenever `kosherAuthorityGroup`/`kosherLevel` are both absent (line 149). For records where `kosherType` *itself* is the point of fabrication — not just a later derivation from it — deleting `kosherLevel`/`kosherAuthorityGroup`/`kosherAuthority` alone leaves the false claim on screen via `kosherType`. Section E works through exactly which remediation needs to touch `kosherType` too. This is the single most important thing for Phase 3 planning in Section G.

---

## A. Full pipeline inventory

**Method:** grep-verified across all of `importers/` and `scripts/` for the 9 fields (`kosherAuthority`, `kosherLevel`, `kosherAuthorityGroup`, `certifierId`, `kosherType`, `certifiedBy`, `kosherDetails`, `certificateValidUntil`, `certificateIssuedAt`), then every matching file read in full (not sampled) — 6 by me directly (the core/canonical files), 83 split across 4 parallel research passes covering disjoint file lists. **89 files touch at least one of these fields.** Cross-checked against `package.json`'s `"scripts"` block and all 5 files in `.github/workflows/`: **zero of the 89 are wired into `npm run verify` or CI**, except `scripts/validate-data.mjs` itself, which only reports — it never writes.

### A1. Core / canonical pipeline (read directly, not delegated)

| File | Tracked? | In CI/verify? | What it does |
|---|---|---|---|
| `scripts/validate-data.mjs` | modified, uncommitted | **yes** (`data:validate`, in `ci.yml`) | Read-only RATCHET gate. Tracks `foodWithoutKashrut`, `kashrutAuthorityUnknown`, `freeTextCertifierUnmapped` — presence/absence proxies only, zero evidence-tier awareness. Never mutates data. |
| `scripts/migrate-kosher-fields.mjs` | **committed** (2026-08-05) | no | Legacy. Blind, unconditional overwrite of `kosherLevel`/`kosherAuthorityGroup`/`kosherAuthority` from a 14-key `kosherType`→triple table. Zero `certifiedBy`/registry/reviewQueue awareness. No `--apply` flag — just runs and writes. Writes **minified** JSON (`JSON.stringify(updated)`, no formatting), which collides with the repo's pretty-printed convention (see A3). |
| `scripts/preview-kosher-fields.mjs` | **committed** (2026-08-05) | no | Read-only console preview. Its own **third**, independently-hand-maintained `kosherType`→level/authority table — already drifted from `migrate-kosher-fields.mjs`'s table (e.g. `badatz_edah` → `'badatz_edah'` here vs `'badatz_edah_hachareidis'` there; this file also has `rabanut_beit_shean`, `rabanut_afula`, `rav_landa` keys the other table lacks). Never writes. |
| `scripts/apply-kashrut-authorities.mjs` | **untracked** | no | The careful, registry-driven pipeline. Exact-string alias match only; skips `reviewQueue`; never overwrites an existing `kosherLevel`; only fills `kosherAuthorityGroup` when absent/`unknown`; sets `certifierId` deterministically (including `null` as a real value); has 8 acceptance checks (id-list unchanged, only 3 fields differ, no level upgrade, `certifiedBy`/`certificateValidUntil` byte-identical) that refuse the write if violated; dry-run by default, `--apply` required, timestamped backup before writing. **Has never been run with `--apply`** — `certifierId` is 0/2213 populated on food records (confirmed in Section B). Also writes minified JSON on `--apply` (line 288) — same formatting hazard as above, untested in practice since it's never been applied. |
| `importers/tzohar/extract-cert-expiry.mjs` | committed (edited this session) | no | Additive-only on `certificateValidUntil`/`kosherDetails`, gated to `certifiedBy === 'צהר' && kosherCertUrl` records only. Never touches `kosherAuthority`/`kosherLevel`/`kosherAuthorityGroup`. Refuses to guess on failure. Writes minified — same hazard. |
| `importers/tzohar/import-food.mjs` | committed | no | Matches Tzohar source records to existing places by fuzzy name/address+name-overlap, then `Object.assign(existing, CERT_PATCH)` — **blind overwrite of `certifiedBy`/`kosherType`/`kosherAuthority`/`kosherAuthorityGroup`/`kosherLevel`** on any matched record, regardless of what it previously said. The file's own comment documents that the address-only fallback already caused one real incident (McDonald's Tel Mond got a butcher's certificate, Alfredo got Chick&Pick's) before a name-overlap requirement was added — the underlying architecture (fuzzy match → blind overwrite of 5 kashrut fields) is unchanged, so the same failure mode can recur for any two same-named/co-located businesses. Also has a hardcoded `lastVerifiedAt: '2026-08-10'` literal — re-running today would not update it. Writes pretty-printed (correct convention), unlike the two scripts above. |

### A2. The two authority-id namespaces — why both exist

- **Legacy underscore** (`badatz_beit_yosef`, `rabanut_mehadrin`, …): the `kosherType` enum, in production since the 2026-08-05 commit that introduced `migrate-kosher-fields.mjs`. This is the *original* classification vocabulary — it predates any authority registry and was built to answer "what kind of kosher sign does this place have," not "who specifically certified it."
- **Registry hyphen** (`badatz-beit-yosef`, `rabbinate-tel-aviv`, …): `src/data/kashrut/authorities.ts`, both currently untracked (Section overview, fact 1). Built later as "a canonical registry, generated from a 4-proposer + 3-adversarial-challenger pass over all 261 distinct `certifiedBy` values" (its own doc comment) — i.e. built directly from the raw evidence strings, not from the `kosherType` enum. This is a deliberate, and correct, architectural improvement: `kosherType` is a closed, coarse, author-invented vocabulary; the registry is derived from what businesses' certificates actually say.
- **No code translates between them.** `certifierId` (registry-hyphen) and `kosherAuthority` (legacy-underscore) are two separate fields on `Place`, populated by two separate, uncoordinated pipelines, and nothing maps one to the other. This is not a bug in either pipeline individually — it's a real architectural gap: the "new" identity layer was never connected to the "old" one, and the old one was never retired.

### A3. Whole-batch findings from the 83-file sweep

*(Full per-file tables from all four research passes — patch/fix batch A, patch/fix batch B, import batch A, import batch B — are preserved in this session's transcript; this section is the synthesis. Ask if the raw per-file tables are wanted as an appendix.)*

**Fields actually touched across the 83 files:** only `kosherType` and `certifiedBy` (confirmed zero occurrences of `kosherAuthority`, `certifierId`, `kosherDetails`, `certificateValidUntil`, `certificateIssuedAt` anywhere in this batch) — except one file, `fix-nagisa-official.mjs`, which also sets `kosherLevel`/`kosherAuthorityGroup`, but only inside two brand-new record literals.

**Operation type, all 83 files:**
- **Additive** (every kashrut-field write explicitly guarded against an existing value): 9 files — `patch-pizza-koshertype.mjs`, `patch-multi-chains.mjs`, `patch-obvious-fixes.mjs`, `patch-landwer.mjs`, `patch-pizzahut-shemesh.mjs`, `fix-hummus-eliyahu-full.mjs` (new-record push only, guarded), `fix-fastfood-types.mjs` (guarded push), and the Aroma-block-only half of `patch-aroma-cafecafe.mjs` (its Cafe Cafe block is unguarded — see outliers).
- **Normalizing** (derives the field from another existing field, not a flat static table): present as sub-patterns in `patch-bulk-fixes.mjs` (certifiedBy→kosherType for one chain), `patch-multi-chains.mjs` (kosherType→certifiedBy for Golda), `patch-obvious-fixes.mjs` (raw OSM `osmKosher` tag→kosherType), and as the primary purpose of `fix-humus-eli-encoding.mjs`.
- **Blind/unconditional overwrite** on at least one touch point: the clear majority — roughly 45 of the 83 files, including the canonical instance `fix-humus-eli-and-dominos.mjs` (~80 hardcoded IDs, zero guard, zero read of prior `certifiedBy`).
- **New-record-creation only** (no pre-existing record ever touched): most of the `import-*.mjs` chain scripts.

**Idempotency (does the current on-disk state actually reflect one clean run, or would a re-run change it?):**
- **~10 files have no existence-check before writing** and would **duplicate records** on a second run: `import-jerusalem.mjs` (9 records), `import-tlv-batch1.mjs` (2), `import-petrozilia.mjs` (1), `import-newdeli.mjs` (39), `import-kiriat-meir-chains.mjs` (~70 new-branch records — its 13 `CAFECAFE_UPDATES` overwrites *are* guarded, its pushes are not), `import-pizza-story-all.mjs` (weak — dedup relies on a hardcoded address-fragment snapshot, not a live check), `update-pazzaz.mjs` (9), `patch-story-and-bakikar.mjs` (1), `patch-shemesh-missed.mjs` (1), `fix-nagisa-official.mjs` (2), `merge-duplicates-phase1.mjs` (3).
- **3 files violate the additive-only/zero-deletion rule outright** by deleting pre-existing records before re-adding: `import-mcdonalds.mjs` (deletes every record named "מקדונלד'ס", regenerates non-stable sequential IDs), `import-aroma-v2.mjs` (deletes every "ארומה אספרסו בר" record, including whatever its sibling `import-aroma.mjs` previously wrote), `import-burgersbar.mjs` (4 hardcoded OSM ids).
- **2 scripts can no longer be run at all** — their input data lived in this session's scratchpad temp directory, which no longer exists: `fix-roladin-final.mjs` (`SCRATCH_PATH`) and `import-pizzahut.mjs` (`pizzahut_branches.json`). Their historical output is unauditable — whatever raw→`certifiedBy` mapping produced those records happened outside the repo and cannot be re-derived.
- **3 Roladin scripts write mutually contradictory `kosherType` values to overlapping records**: `fix-roladin-final.mjs` → `'kosher'`, `update-roladin.mjs` → `'rabanut'`, `update-roladin-kosher.mjs` → `'kosher'` (from a different derivation). None of the three checks what the others wrote. The on-disk value for any given Roladin branch today depends entirely on execution order, which is not recorded anywhere.
- **A regex/heuristic false-negative, reproduced independently by two different research passes**: `apply-osm-research-results.mjs` has a clean additive loop (`if (upd[field] && !p[field]) next[field] = upd[field]`) covering `kosherType` and `certifiedBy` alike — then, 3 lines later, an unconditional `if (upd.kosherType) next.kosherType = upd.kosherType;` silently re-overwrites `kosherType` only, defeating the guard just written. `certifiedBy` has no such override and stays genuinely additive. And `patch-small-chains.mjs`'s Dabush block (lines ~156-169) writes both `kosherType` and `certifiedBy` via computed-variable object shorthand through a generic `patch(e, fields) = Object.assign(e, fields)` helper — no `key: value` literal anywhere near the write site. Both are exactly the shape of miss that caught this project's own automated heuristic once already (see round 2 report) — a same-line/adjacent-line text search would find neither.

### A4. `certifierId` wiring

Grep-confirmed: `certifierId` appears in exactly 2 source files (`src/types/place.ts`'s type definition, `src/data/kashrut/authorities.ts`'s doc comment) plus `apply-kashrut-authorities.mjs` (which sets it, but has never been applied) plus this session's own report/test files. **Zero production code reads `certifierId`** — not `filterPlaces.ts`, not `kosher.ts`, not `PlaceCard.tsx`, not `PlaceDetailScreen.tsx` (confirmed in Section E). It is a fully-designed, fully-implemented field with a complete write pipeline and zero consumers and zero live occurrences.

---

## B. Failure-mode census (all 2,213 food records, not a sample)

Ran `scripts/reports/kashrut-pipeline-failure-mode-census.mjs` (new, read-only file, output at `scripts/reports/kashrut-pipeline-failure-mode-census.json`). Categories are a strict partition on `certifiedBy` state (1–4 below never overlap), with category 5 reported separately as an overlapping cross-cut, exactly because forcing it into a priority-ordered chain silently hid overlap with category 4 on the first draft of this script — caught and fixed before trusting the numbers.

| # | Category (owner's definition) | Count |
|---|---|---|
| 1 | `certifiedBy` present, resolves via registry alias, unambiguous, to a **registered** body | **910** |
| 2 | `certifiedBy` present, reviewQueue-deferred, structured value populated anyway | **103** |
| 3 | `certifiedBy` present, registry has no knowledge of the raw string at all, structured value populated anyway | **0** |
| 4 | `certifiedBy` absent, structured value populated purely from legacy `kosherType`→MAP | **614** |
| — | `certifiedBy` present, alias resolves but authority is legitimately `null` ("level known, body unknown" — a correct resolved state, not a gap) | 537 |
| — | `certifiedBy` present + reviewQueue, correctly left blank (no structured value) | 10 |
| — | `certifiedBy` absent, `kosherType` present, IS a mappable key, but genuinely unenriched (migration hasn't run on it) | 19 |
| — | `certifiedBy` absent, no `kosherType`, no structured value — true "none" state | 20 |
| — | Partition check | 910+103+0+614+537+10+19+20 = **2,213** ✓ |
| 5 | `kosherLevel` set with no `certifiedBy` AND no `kosherAuthority` (independent cross-cut, overlaps 1–4) | **503** (245 `mehadrin`, 258 `regular`) |

**Category 2 is 5× bigger than previously reported once counted per-field instead of per-record.** The earlier finding ("the 20 we found") was specifically about `kosherAuthority`: 20 records have a non-null `kosherAuthority` despite `certifiedBy` being reviewQueue-flagged. But `kosherLevel`/`kosherAuthorityGroup` are set on **103** records under the identical circumstance — because `migrate-kosher-fields.mjs`'s table maps far more `kosherType` keys to a non-null level/group (14 keys) than to a non-null `kosherAuthority` (8 keys), and the script is blind to `certifiedBy`/reviewQueue regardless of which field is in play. This is exactly why the owner's instruction not to collapse fields mattered — collapsing to "was this record touched at all" would have undercounted the real exposure by 5×.

**The disputed `chatam_sofer`/`badatz-kehilot` names leak in through a second, completely independent channel.** Round 2's fix targets the `certifiedBy`→reviewQueue path. But `migrate-kosher-fields.mjs`'s own table has `chatam_sofer` and `badatz_kehilot` as literal `kosherType` keys (lines 26, 29), mapping directly to `kosherAuthority: 'chatam_sofer'` / `'badatz_kehilot'` with **zero reference to `certifiedBy` at all**. **7 food records currently carry one of these two `kosherType` values.** Fixing only the `certifiedBy`-side reviewQueue leak (round 2's 6 records) does not touch these 7 — they need the same authority-identity scrutiny applied to a different field.

**245 records assert `kosherLevel: 'mehadrin'` — the strongest claim in the app's vocabulary — with zero `certifiedBy` and zero `kosherAuthority`.** This independently reproduces and quantifies the concern already on file (`project_fabricated_kashrut_levels` memory: rebar + arcaffe invent mehadrin, all mehadrin records have zero certificate documents), at a more basic level: these 245 don't just lack a certificate *document*, they lack any identity evidence at all in the data — not even a raw certifier string. A same-value-only sample from this set: 5 Golda ice cream branches (`golda-bd46421f`, `golda-d5eead7a`, `golda-7861d141`, `golda-4b2ab2c5`, `golda-82d4b21f`), all with `kosherType: 'mehadrin'` — a *different* raw source pattern than the already-known `golda-ff986d68` (`kosherType: 'rabanut'` from "חלב ישראל"). Golda's chain has multiple distinct raw kosher-type strings across branches, at least one of which literally is the bare word "מהדרין" with no body named — see Section C's limitation on why this script cannot tell, per record, whether that's an honest transcription of what the source said or a further inference.

---

## C. Evidence classification per field

| Field | Where current values came from | Evidence tier | Auditable per-record today? |
|---|---|---|---|
| `certifiedBy` | Raw text as typed/scraped per chain script, or literal source-provided values. | Source-literal, when the import script transcribes verbatim (most do) — but 3 mapping helpers (below) launder a generic term *into* this field as if it were a body name. | **No** — nothing distinguishes "verbatim from source" from "the script's own guess" once the value is on disk. |
| `kosherType` | Either a literal per-record value the import script's author typed by hand, or the output of a `mapKosherType`-style helper. | **Split.** Direct literals (the large majority of import scripts): source-literal, trustworthy to the extent the human transcribing them was careful. Output of a mapping helper (`import-golda.mjs`, `import-humuseliyahu.mjs`, `import-aroma-v2.mjs`, `importers/coffee-carts/scrape-coffeetrail.mjs` — 4 files, confirmed independently by two separate research passes): **inferred-without-source** in at least one branch of every single one of these 4 helpers — each was found mapping a generic standard/level term (not a certifying body) to a specific authority-bearing value. | **No** — a `kosherType` value looks identical whether it was hand-typed from a certificate or guessed by a keyword match. |
| `kosherLevel` / `kosherAuthorityGroup` / `kosherAuthority` | 1,774 of 2,213 food records (80%) have level/group values byte-identical to what `migrate-kosher-fields.mjs`'s blind map would produce today from their current `kosherType` — i.e. **inferred-from-kosherType-map**, for the large majority of the dataset's kashrut classification. 194 records show a `kosherAuthority` matching an exact registry alias (**registry-alias-match**, the highest tier reachable) — but since `apply-kashrut-authorities.mjs` has never been `--apply`'d, this is coincidence with what the registry *would* produce, not something the registry actually wrote. | Mostly **inferred-from-kosherType-map**; a smaller "registry-would-agree" subset; no field currently on disk was written *by* the registry pipeline. | **No**, for the same reason as above, plus one more: a hand-edit that happens to match the map's output is indistinguishable from the map having produced it. |
| `certifierId` | Never populated (0/2,213). | N/A | N/A |
| `kosherDetails` / `certificateValidUntil` | Only ever set by `importers/tzohar/extract-cert-expiry.mjs`, gated to `certifiedBy === 'צהר' && kosherCertUrl`. | **Manually-verified-by-a-human-reading-a-real-PDF** — genuinely the strongest tier in the dataset, because the script parses an actual certificate document rather than inferring from a keyword. | **Yes, for this one field only** — the `certifiedBy === 'צהר'` gate makes the evidence chain traceable: raw PDF → parsed date → field. This is the one part of the whole pipeline where the answer to "is this auditable per-record" is genuinely yes. |

**Bottom line, stated plainly because the owner asked directly:** for the three fields the kashrut filter actually reads (`kosherLevel`, `kosherAuthorityGroup`, `kosherAuthority`), evidence tier is **not** reliably auditable per record today. It can only be *inferred in aggregate* by comparing current values against what known scripts would produce — and even that inference breaks down for `kosherType` itself, since for at least 4 chains the "source" `kosherType` was never a faithful transcription in the first place.

---

## D. Re-run/idempotency behavior, explicit per script

Full per-file answers are in Section A3's rollup and in the per-file tables from the 4 research passes (available on request as an appendix — this is the synthesis of the load-bearing ones):

- **`scripts/migrate-kosher-fields.mjs`** — **would recreate every claim Phase 3 removes.** No guard of any kind: not on existing `kosherLevel`, not on `certifiedBy`, not on reviewQueue status. A re-run today would silently reassert `kosherLevel`/`kosherAuthorityGroup`/`kosherAuthority` on every record whose `kosherType` is one of its 14 keys — including the 6 records the owner already approved clearing, and the 7 `chatam_sofer`/`badatz_kehilot` records from Section B. This was already known-yes per the round 2 report; this audit confirms it's not just theoretical — the script has zero mechanism that could prevent it, by design, not by oversight (there is no dry-run flag, no acceptance check, nothing).
- **`scripts/apply-kashrut-authorities.mjs`** — genuinely idempotent by design (never overwrites an already-set `kosherLevel`, only fills `kosherAuthorityGroup` when absent/unknown, `certifierId` recomputes to the same value each time). Safe to re-run, but has never actually been run with `--apply`.
- **`importers/tzohar/extract-cert-expiry.mjs`** — idempotent by design (this session's own `--refresh`/staleness work), gated tightly to Tzohar-evidenced records only.
- **`importers/tzohar/import-food.mjs`** — idempotent in the sense that the *values* it writes are deterministic, but the fuzzy name/address matching that decides *which record* gets those values is not guaranteed stable across data changes, and the file's own comment documents one real prior mismatch incident.
- **~10 import scripts** (listed in A3) — **not idempotent**: duplicate records on re-run, no existence check.
- **3 import scripts** — actively delete-then-recreate, violating additive-only on every run.
- **2 scripts** (`fix-roladin-final.mjs`, `import-pizzahut.mjs`) — **cannot be re-run at all**; their source data lived in a since-deleted scratch file.
- **The 3 Roladin scripts** — individually idempotent, but not commutative with each other; final state depends on run order, which is not recorded.
- **A secondary, cross-cutting hazard**: `migrate-kosher-fields.mjs` and (if ever `--apply`'d) `apply-kashrut-authorities.mjs` both write **minified** JSON, while the repo's actual committed convention is 2-space pretty-printed (confirmed via `git show HEAD:src/data/generated/places.osm.json | wc -l` = 152,278 lines this session). Either script writing for real today would silently reformat the entire ~150K-line file, producing an unreviewable whole-file diff — this exact trap already caught and had to be fixed once this session for an unrelated one-off script (`fix-fabricated-cert-dates.mjs`). `importers/tzohar/import-food.mjs` writes correctly (pretty-printed); the other two do not.

---

## E. UI/runtime assumptions — what breaks if a field goes absent, not null

Confirmed by reading the actual consuming code (not inferred):

- **`src/utils/kosher.ts`'s `getKosherLabel()`** (line 117): reads `kosherType`, `kosherLevel`, `kosherAuthorityGroup`, `kosherAuthority` — never `certifierId`. Its `byAuthority` lookup (lines 123-133) is a **third**, independently-hand-maintained authority-key table (yet another set of underscore-style keys, e.g. `badatz_edah_hachareidis`, slightly different casing convention from both other tables). **Critical fallback path, line 148-149**: `return place.kosherType ? (kosherTypeLabel[place.kosherType] ?? null) : null;` — if `kosherAuthorityGroup` and `kosherLevel` are both made absent but `kosherType` survives, the UI **still shows a label** (`kosherTypeLabel[kosherType]`, e.g. `'מהדרין'` for `kosherType: 'mehadrin'`). For any record where `kosherType` itself was the fabrication (all 4 mapping-helper bugs in Section A3, plus `import-rebar.mjs`'s blanket hardcode), clearing only the derived fields does **not** remove the false claim from the user's screen.
- **`src/data/repository/filterPlaces.ts`** (lines 36-52): reads `kosherLevel` (mehadrin-only filter) and `kosherAuthorityGroup`/`kosherAuthority` (certification filter), plus `isCertificateExpired(place)`. Never reads `certifierId`. Degrades **safely** to absence: `undefined !== 'mehadrin'` and `undefined !== f.kosherAuthorityGroup` both correctly exclude the record from that filter without erroring — consistent with the existing rule that an expired/unsupported-claim business stays discoverable in normal browsing, just not under that specific filter.
- **`src/components/PlaceCard.tsx`** (lines 36-41): reads `kosherAuthorityGroup`/`kosherLevel` only, for accent color. Degrades safely — no crash, just falls through to a default color.
- **`src/screens/PlaceDetailScreen.tsx`** (lines 58, 432-434): reads `kosherType` (for a chip label) and `certifiedBy` + `kosherType` together for the main kashrut-detail line: `[place.certifiedBy, place.kosherType ? kosherTypeLabel[...] : null].filter(Boolean).join(' · ') || '—'`. If both are absent, correctly shows `'—'`. If `kosherType` survives while only the derived fields are cleared, this line still shows the (possibly fabricated) `kosherType` label plus whatever raw `certifiedBy` says.

**Consequence for Phase 3 planning:** clearing `kosherLevel`/`kosherAuthorityGroup`/`kosherAuthority` is sufficient remediation only for records where those three fields are the point of fabrication and `kosherType` is itself an honest transcription (this describes the round-2 6-record fix and, by the same logic, the other 97 category-2 records). It is **not** sufficient for any record reached through `import-golda.mjs`, `import-humuseliyahu.mjs`, `import-aroma-v2.mjs`, `importers/coffee-carts/scrape-coffeetrail.mjs`, or `import-rebar.mjs` — for those, `kosherType` itself needs correction (or clearing), or the false claim keeps surfacing via `getKosherLabel()`'s fallback and `PlaceDetailScreen.tsx`'s direct read.

---

## F. Draft canonical schema + evidence rules (proposal — not applied)

1. **`certifiedBy` is the only field allowed to hold unverified raw text.** Every other structured field is downstream of it, never a peer input.
2. **`kosherType` is deprecated as an input to any authority/level derivation, effective immediately for new code.** It may keep existing values for display/backward-compat, but no new script should read it to set `kosherLevel`/`kosherAuthorityGroup`/`kosherAuthority`. The 4 mapping-helper bugs and `import-rebar.mjs` all trace back to treating this closed, coarse, author-invented enum as if it were evidence.
3. **`kosherLevel`/`kosherAuthorityGroup`/`kosherAuthority`/`certifierId` may be set only by an exact-string match against a registered `kashrut-registry.json` alias** — the rule `apply-kashrut-authorities.mjs` already implements correctly. No script should ever set these from a keyword/substring match against `certifiedBy` or `kosherType`.
4. **Any raw `certifiedBy` string the registry doesn't recognize goes to `reviewQueue`, not a best-guess.** Already the registry's design; needs to become the rule for every script that touches these fields, not just the one that currently follows it.
5. **A field must never imply another without a documented rule.** Concretely: a level word alone (e.g. "מהדרין") does not imply a specific authority; a body name alone does not imply a level unless the registry's alias for that exact string says so; a dairy/kashrut *standard* (e.g. "חלב ישראל") is not a certifying body and must never populate `kosherAuthority`/`kosherAuthorityGroup`.
6. **Lightweight forward-looking provenance, not retroactive fabrication.** The dataset cannot honestly claim to know how historical records were set (Section C's finding). Rather than backfilling guesses, add a minimal `kashrutSource?: { script: string; appliedAt: string }` going forward only, populated by every pipeline script from now on; its absence on existing records means "predates the provenance requirement," not "unverified" — an honest unknown, not a fabricated one.
7. **Standardize JSON serialization** (2-space pretty-print, no trailing newline, matching the current committed convention) across every script that writes `places.osm.json` — a live, twice-hit-this-session hazard, not hypothetical.

## G. Draft Phase 2/3/4 remediation plan outline (proposal — not applied)

**Phase 2 — pipeline correction** (code only, no data mutation):
- Retire or hard-gate `migrate-kosher-fields.mjs` — either delete it (superseded by `apply-kashrut-authorities.mjs` for what's safe to derive) or give it the exact same reviewQueue+existing-value guards, so it can never again resurrect a removed claim.
- Fix the line-104 override in `apply-osm-research-results.mjs` that defeats its own additive guard.
- Fix the 4 mapping-helper bugs (`import-golda.mjs` — already known; `import-humuseliyahu.mjs`; `import-aroma-v2.mjs`; `scrape-coffeetrail.mjs`) and `import-rebar.mjs`'s blanket hardcode — stop inferring specific authorities/levels from generic terms; route to manual review instead.
- Resolve the 3-way Roladin script conflict — needs one source of truth, not three uncoordinated scripts.
- Add existence-checks to the ~10 no-dedup scripts; remove or get explicit owner sign-off on the 3 additive-only-violating deletions.
- Standardize JSON serialization across all writer scripts (Section F.7).
- **Commit the untracked registry pipeline before anything else in Phase 2** — it's the foundation everything else in this plan assumes exists and is stable.

**Phase 3 — existing-data remediation, by Section B category, with counts:**
- Category 2 (103 records, `kosherLevel`/`kosherAuthorityGroup` set despite reviewQueue) — same treatment as the already-approved 6: clear the unsupported derived fields, keep `certifiedBy` untouched. Owner review needed for the other 97 beyond the 6 already decided.
- The 7 `chatam_sofer`/`badatz_kehilot` records reached via `kosherType` directly (Section B) — same authority-identity scrutiny as the `certifiedBy`-side fix, applied to the independent channel.
- Category 4 (614 records, no `certifiedBy` at all) — needs owner judgment per source chain; cross-reference against the specific import scripts with a confirmed fabrication-prone mapping helper (golda, humuseliyahu, aroma-v2, coffeetrail, rebar — together accounting for a meaningful slice of this category) before treating the rest as trustworthy.
- The 245 `mehadrin`-with-zero-identity-evidence records (category 5 subset) — highest priority given it's the strongest claim in the app's vocabulary.
- **For every record remediated, check `kosherType` itself per Section E** — clearing only the derived fields is not sufficient wherever `kosherType` was the actual fabrication point.

**Phase 4 — validation:**
- Extend `validate-data.mjs`'s ratchet with a metric for "records where `kosherLevel`/`kosherAuthorityGroup` is byte-identical to the blind `kosherType` map's output" (this audit's census logic, made a permanent CI-gated ratchet rather than a one-off report).
- Regression tests asserting no script re-creates a cleared field on the specific remediated records — extending `apply-kashrut-authorities.mjs`'s existing acceptance-check pattern.
- Re-run `scripts/reports/kashrut-pipeline-failure-mode-census.mjs` after remediation and diff against this report's numbers to prove convergence, not just assert it.

---

*Read-only artifacts produced by this audit: `scripts/reports/kashrut-pipeline-failure-mode-census.mjs` (script) and `scripts/reports/kashrut-pipeline-failure-mode-census.json` (output). No other file was created or modified.*
