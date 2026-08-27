# Kashrut data model — round 2 (6 disputed records, deep dive)

Read-only. No mutations. No file outside `scripts/reports/` touched. Builds on
`kashrut-data-model-inspection.md` (round 1) — Parts A3/A4 from that report are
referenced, not re-derived, per the request.

**Correction to round 1, made explicit here because it matters for every table
below:** round 1 described the 6 records' registry entries as the registry
"affirming" the authority because `suggestedAuthorityId` was non-null. That was
imprecise. Verified directly this round: **neither `badatz-chatam-sofer` nor
`badatz-kehillot` is an exact match against any of the 81 registered authority
ids.** A non-null `suggestedAuthorityId` means "proposed," not "registered."
The distinction from Group 5 (round 1) is real but narrower than round 1
implied: Group 5's id was explicitly *rejected* after being proposed; these
two are *unregistered pending a scope decision*, never rejected. Both are
equally "not currently a registered authority" — the difference is in the
registry's confidence about *why* it isn't registered, not in whether it is.

---

## PART 1 — full evidence table, per record

### `cafecafe-62628c4d` — קפה קפה הרצליה מרינה
- `certifiedBy`: `"בד״צ חתם סופר"`
- Current: `kosherAuthority="chatam_sofer"`, `kosherAuthorityGroup="badatz"`, `kosherLevel="mehadrin"`, `kosherType="chatam_sofer"`
- Source-adjacent fields: `website="https://www.cafecafe.co.il"`, `sourceUrl="https://www.cafecafe.co.il"`, `provenance` absent, `kosherCertUrl` absent, `certificateValidUntil` absent
- Registry match: raw `"בד״צ חתם סופר"` found in reviewQueue.
- `suggestedAuthorityId: "badatz-chatam-sofer"` — **exact match in the 81 registered ids: `false`** (checked via `Set.has()`, not substring)
- `suggestedLevel: null`
- `why` (verbatim): *"CHALLENGER DOWNGRADE. The orthographic half is verified correct — the same branch (קפה קפה, סוקולוב 48 חולון) carries both בד"צ חתם סופר and בד״צ חתם סופר, so the gershayim merge is right. The defect is the same as the bare form: badatz-chatam-sofer is asserted with certainty although the string names no city and at least two distinct חתם סופר batei din exist, while the dataset separately carries חתם סופר פתח תקווה (n=3) and חתם סופר פ"ת (n=1). Whether all four strings belong under one id is a human call; the two records here (הרצליה פיתוח, חולון) do not settle it."*

### `cafecafe-e8695221` — קפה קפה חולון סוקולוב
Identical `certifiedBy`, identical registry entry, identical current field values
as `cafecafe-62628c4d` above (same raw string ⇒ same registry match). Source
fields: `website`/`sourceUrl` both `"https://www.cafecafe.co.il"`, rest absent.

### `humus-eli-חומוס-אליהו-בית-שמש-סאן-מול` — חומוס אליהו בית שמש סאן מול
- `certifiedBy`: `"בד\"ץ קהילות"`
- Current: `kosherAuthority="badatz_kehilot"`, `kosherAuthorityGroup="badatz"`, `kosherLevel="mehadrin"`, `kosherType="badatz_kehilot"`
- Source-adjacent: `website="https://www.humus-eli-yahoo.com/"`, `sourceUrl="https://www.humus-eli-yahoo.com/restaurants/"`, rest absent
- `suggestedAuthorityId: "badatz-kehillot"` — **exact match in the 81: `false`**
- `suggestedLevel: null`
- `why` (verbatim): *"Proposer uncertain; challenger found no defect. Names a specific badatz by proper name (not a generic level word), but which body "קהילות" is cannot be independently verified. Resolve as one family with בד"ץ קהילות קריית ספר, קהילות, בד"ץ קרית ספר / מהדרין and the two compound קהילות strings; the challenger's city-free id badatz-kehillot is suggested but not registered."*

### `humus-eli-חומוס-אליהו-ירושלים-סנטר-1` and `humus-eli-חומוס-אליהו-ירושלים-קניון-רמות`
Same raw string (`"בד\"ץ קהילות"`), same registry entry, same current field values,
same source-adjacent fields (`website`/`sourceUrl` = humus-eli-yahoo.com) as the
Beit Shemesh record above.

### `humus-eli-חומוס-אליהו-מודיעין-עילית` — חומוס אליהו
- `certifiedBy`: `"בד\"ץ קהילות קריית ספר"` (the city-suffixed variant — different raw string from the 3 above)
- Current: `kosherAuthority="badatz_kehilot"`, `kosherAuthorityGroup="badatz"`, `kosherLevel="mehadrin"`, `kosherType="badatz_kehilot"`
- Source-adjacent: `website`/`sourceUrl` = humus-eli-yahoo.com, rest absent
- `suggestedAuthorityId: "badatz-kehillot"` — **exact match in the 81: `false`**
- `suggestedLevel: null`
- `why` (verbatim): *"CHALLENGER VERDICT: WRONG. The id embeds the city and would split one body into two. בד"ץ קהילות is a real named badatz seated in קריית ספר / מודיעין עילית that also certifies outside the city, so the city here is appositive — the same situation the proposer handled correctly for בד"צ העדה החרדית ירושלים. The dataset carries the same body as bare בד"ץ קהילות 6x, בד"ץ קרית ספר / מהדרין 2x, קהילות 1x, בד"ץ קהילות ורבנות ירושלים מהדרין 1x, רבנות ירושלים / בד"צ קהילות 1x; a city-suffixed id guarantees those variants land on a different id, fragmenting one hechsher. Distinctness from rabbinate-modiin-illit is correct. The suggested id is the city-free badatz-kehillot, which is deliberately NOT registered until the whole קהילות family is resolved together."*

### Proposed BEFORE → AFTER, per record, laid out as options (not chosen)

| Option | `kosherType` | `kosherAuthority` | `kosherAuthorityGroup` | `kosherLevel` |
|---|---|---|---|---|
| **A — treat like Group 5 (clear all 4)** | delete | delete | delete | delete |
| **B — authority fields only, keep level pending separate review** | delete | delete | delete | keep `mehadrin` |
| **C — no change** | keep | keep | keep | keep |
| **D — level only (based on Part 4's finding below)** | keep | keep | keep | delete |

Which option is right differs **by record group**, not uniformly — see Part 4.

---

## PART 2 — the namespace map, code-verified

Four-way relationship between `kosherAuthority` (legacy live field), `kosherAuthorityGroup`,
registry `authorities[].id`, registry `reviewQueue[].suggestedAuthorityId`, and `certifierId`.
Every claim below is a grep result, not an inference from name similarity.

| Pair | Any code translates one → the other? |
|---|---|
| `kosherAuthority` ↔ registry `authorities[].id` | **No script does this.** `kosherAuthority` is written only by `scripts/migrate-kosher-fields.mjs` (hardcoded literal strings like `'badatz_edah_hachareidis'`, `'chatam_sofer'` — underscore_case) and `importers/tzohar/import-food.mjs` (hardcodes `'tzohar'`). The registry's `authorities[].id` values use a *different* naming convention (hyphen-case, e.g. `'badatz-chatam-sofer'`) and are consumed only by `scripts/apply-kashrut-authorities.mjs`, which never reads or writes `kosherAuthority`. |
| `kosherAuthority` ↔ `certifierId` | **No script does this.** Confirmed by grep: no file both reads `kosherAuthority` and writes `certifierId` (or vice versa). |
| `kosherAuthority` ↔ `reviewQueue[].suggestedAuthorityId` | **No script does this.** `migrate-kosher-fields.mjs` (the only writer of `kosherAuthority`) has zero references to `reviewQueue` or `kashrut-registry.json` anywhere in the file — confirmed by grep, zero matches. |
| `kosherAuthorityGroup` ↔ registry `authorities[].group` | **Yes, but only inside `apply-kashrut-authorities.mjs`**, and only for records reached through that script's alias path — `groupById.get(alias.authorityId)` (`apply-kashrut-authorities.mjs:108`). This script has never been run with `--apply` (round 1, A1) — the live `kosherAuthorityGroup` values were all written by `migrate-kosher-fields.mjs`'s own hardcoded per-`kosherType` group value, independent of the registry's `authorities[].group` field entirely. |
| `certifierId` ↔ registry `authorities[].id` | **Yes** — `apply-kashrut-authorities.mjs:97` (`p.certifierId = alias.authorityId`) and its own acceptance check at line 167 (`authorityIds.has(p.certifierId)`). This is the one pair with a real, live code-level connection — but `certifierId` has 0 live occurrences (round 1, A1), so this connection has never actually executed against production data. |
| `certifierId` ↔ `reviewQueue[].suggestedAuthorityId` | **No direct write exists.** `apply-kashrut-authorities.mjs` explicitly *skips* (rule e) any record whose `certifiedBy` is reviewQueue-listed — it never reads `suggestedAuthorityId` at all, by design (a `suggestedAuthorityId` is a proposal for a human to register into `authorities[]`, not something the apply script consumes directly). |

**Stated in exactly the words the owner asked for: no formal mapping exists between
the legacy `kosherAuthority` string values (`chatam_sofer`, `badatz_kehilot`, …) and
either the registry's `authorities[].id` values or its `suggestedAuthorityId` proposals.
The string resemblance ("chatam_sofer" / "badatz-chatam-sofer") is not backed by any
code and should not be read as evidence of a real, verified connection — it is a
coincidence of two independently-authored naming schemes, not a translation.**

---

## PART 3 — institutional research (external sources, not the registry)

### "בד״צ חתם סופר" (Chatam Sofer)

**(a) What the source text itself could plausibly name, checked against external sources:**
Real, identifiable institutions exist under this name — but **not one**. Cross-checked
Hebrew Wikipedia directly (`he.wikipedia.org/wiki/חוג_חתם_סופר`, fetched and read, not
summarized from search snippets): confirms **two distinct, independently-operating
kashrut authorities**, both legitimately called "Chatam Sofer":
  - **Bnei Brak** — historically under Rabbi Shmuel Halevi Wozner (1970s), later Rabbi Dov
    Landau (until 2015), currently Rabbi Yosef Meir Altman / Yehuda Bar Ser. Subject to a
    2024 controversy (also independently surfaced by search) over unreliable supervision
    claims on Spain/France-produced imports — relevant only as evidence this space has real
    documented institutional distinctions, not as a claim about these specific café branches.
  - **Petah Tikva** — historically under Rabbi Yaakov Shemarya Deutsch, operates as `csofer.org`
    (found live, `בד״צ חוג חתם סופר פתח תקווה`).

  **This independently corroborates the registry's own caution** — its `why` text said "at
  least two distinct חתם סופר batei din exist," and external sources confirm exactly that,
  by name, with different historical leadership. Confidence: **high** that the ambiguity is
  real (multiple independent sources agree on two distinct bodies).

**(b) Our own pipeline's inference:** `kosherAuthority="chatam_sofer"` traces to
`migrate-kosher-fields.mjs`'s hardcoded MAP, triggered by a hand-entered `kosherType` —
not independently derived from the raw text or any external verification. This is *our*
inference, not the source's claim.

**(c) The registry's proposal:** `suggestedAuthorityId: "badatz-chatam-sofer"` — proposed,
explicitly not registered (Part 1). Notably, `badatz-chatam-sofer-petah-tikva` **is** a
real, exact-match registered id (confirmed — see Part 4's prefix-trap note) — meaning the
registry already has a mechanism for the city-qualified variant; only the bare, city-less
string remains unregistered.

**Can the current `kosherAuthority="chatam_sofer"` be substantiated as pointing at a
specific real institution?** No — not from the raw text alone (`"בד״צ חתם סופר"`,
no city), and not from these two café-café branches' own records (Herzliya Marina,
Holon Sokolov — neither is Bnei Brak or Petah Tikva, the two cities where the real
institutions are seated). **Is the broader group (badatz) defensible?** Yes — both
real candidate institutions are badatz-type bodies, so `kosherAuthorityGroup="badatz"`
is safe even though the specific body is not. I could not find, and do not claim to
have found, which of the two (if either) actually certifies these particular branches
— that would require the actual certificate, which these records don't have
(`kosherCertUrl` absent on both).

### "בד"ץ קהילות" (Kehillot)

**(a) Source text check:** Real institution found — Hebrew Wikipedia
(`he.wikipedia.org/wiki/בד"ץ_קהילות`, fetched directly): a private charedi kashrut body
established ~2010, founding rabbis named (Yisrael Fishbein, Shbach Tzvi Rosenblatt, Pinchas
Leibush Padwa, among others), initially poultry/cattle slaughter only, later expanded to
"food plants and food businesses throughout Israel," including imports. Presented as **one
unified body** with a single Supreme Rabbinical Council, not multiple competing
organizations — unlike Chatam Sofer. Confidence this is a real, single, findable
institution: **moderate-to-high** (a specific Wikipedia article exists with named founders
and an organizational structure, not just a generic phrase).

**Caveat, stated plainly rather than glossed over:** "קהילות" (communities) is also a
generic Hebrew word. I have no certificate, logo, or rabbi's name *from these specific
humus-eli records* to cross-check against the Wikipedia article's identity — I can say a
real institution matching this name exists and is findable, not that it is definitely
what these branches' evidence refers to. That gap is exactly what the registry's own
`why` text flags ("which body 'קהילות' is cannot be independently verified") — my
external research narrows it (confirms a real candidate exists) but does not close it.

**(b) Our pipeline's inference:** `kosherAuthority="badatz_kehilot"` — same mechanism as
Chatam Sofer, from hand-entered `kosherType`, not independently verified.

**(c) Registry's proposal:** `suggestedAuthorityId: "badatz-kehillot"` — proposed, not
registered (Part 1), pending resolution of the whole קהילות string family together.

**Substantiation:** the group (`badatz`) is defensible — the Wikipedia-confirmed body is
badatz-type. The specific-body claim (`kosherAuthority="badatz_kehilot"`) has real-world
support (an actual matching institution is findable) but is not independently confirmed
as *this specific business's* certifier.

### "בד"ץ קהילות קריית ספר" (city-qualified variant)

Same institution as above per the registry's own `why` text ("appositive," i.e. the city
names where the body is seated, not a different body) — I did not find independent
external evidence either confirming or contradicting that specific claim (Kiryat Sefer /
Modiin Illit as the seat); Wikipedia's article did not mention a specific city. Stating
this plainly: **could not independently verify the seat-city claim**, so I'm not treating
the registry's "appositive, not a different body" conclusion as externally corroborated —
it stands on the registry's own internal reasoning (six other same-body variant strings
already in the dataset), not on anything I found outside it.

Sources: [חוג חתם סופר – ויקיפדיה](https://he.wikipedia.org/wiki/%D7%97%D7%95%D7%92_%D7%97%D7%AA%D7%9D_%D7%A1%D7%95%D7%A4%D7%A8) · [עמוד בית - בד״ץ חוג חתם סופר פתח תקווה](https://csofer.org/en/%D7%A2%D7%9E%D7%95%D7%93-%D7%91%D7%99%D7%AA-english/) · [בד"ץ קהילות – ויקיפדיה](https://he.wikipedia.org/wiki/%D7%91%D7%93%22%D7%A5_%D7%A7%D7%94%D7%99%D7%9C%D7%95%D7%AA)

---

## PART 4 — authority and level, kept as separate questions

### The 6 disputed records

| Group | Authority verdict (Parts 1–3) | Level verdict — independent check |
|---|---|---|
| Chatam Sofer (2 records) | Not registered; genuinely ambiguous between 2 real institutions; group=badatz defensible, specific body not | Raw text `"בד״צ חתם סופר"` states **no level word at all**. `kosherLevel="mehadrin"` traces purely to the legacy MAP's authority→level hardcode (round 1, A5) — no textual basis, independent of the authority question. **Unjustified; should be cleared regardless of how the authority question resolves.** |
| Kehillot / Kehillot Kiryat Sefer (4 records) | Not registered; a real candidate institution found externally; group=badatz defensible | Raw text states no level word either. Same A5 defect as Chatam Sofer — `mehadrin` has no independent source. **Unjustified for the same reason, independent of authority.** |

Both groups: the authority question and the level question have **different answers for
different reasons** — authority is unregistered-pending-scope-decision, level is
unsupported-by-any-evidence. They don't imply each other; confirmed separately per this
part's instruction.

### The 8 Badatz Beit Yosef records (`certifiedBy="כשר בד\"ץ בית יוסף"`) — protected on authority, re-checked on level independently

All 8 are Pizza Hut branches: `9100022, 9100028, 9100057, 9100058, 9100064, 9100070,
9100071, 9100080` — all `website="https://www.pizzahut.co.il"`, all `sourceUrl`/
`kosherCertUrl`/`certificateValidUntil` absent, all currently `kosherAuthority=
"badatz_beit_yosef"`, `kosherLevel="mehadrin"`.

**Authority — independently re-confirmed protected:** `suggestedAuthorityId:
"badatz-beit-yosef"` **is** an exact match in the 81 registered ids (`true` — checked by
exact `Set.has()`, not prefix/substring). Registry `why`: *"The authority is correct and
must be kept."* This is the one group of the whole 12+8=20 where authority genuinely is
registered, not merely proposed.

**Level — checked on its own terms, not assumed from the authority verdict:**
- Raw string `"כשר בד\"ץ בית יוסף"` does **not** contain `"מהדרין"` (checked: `false`).
- It **does** contain `"כשר"` (checked: `true`) — which the registry's own Rule 1 treats as
  a regular-level word, not evidence of mehadrin.
- `suggestedLevel` for this exact raw string is explicitly `null` — not mehadrin, not
  regular.
- Registry `why` (verbatim): *"The level treatment is a coin-flip presented as settled...
  Downstream this splits identically-tiered records: the ~276 bare "כשר" rows get
  level=regular while these ~16 get level=null... Do NOT resolve this by setting
  level="regular" — that would misrepresent a Sephardi bassar-chalak badatz. Needs a
  project-wide policy call on bare "כשר"."*

**Verdict: authority and level are not the same question here, and treating "protected on
authority" as "therefore fine as-is" would be exactly the conflation the owner flagged.**
The only field-state consistent with the registry's own reasoning for these 8 is: keep
`kosherType`/`kosherAuthority`/`kosherAuthorityGroup` exactly as-is, **delete
`kosherLevel`** (neither "mehadrin" nor "regular" is supportable — the registry rejected
both explicitly).

**Precision note, verified as requested:** confirmed the exact-equality trap is real, not
hypothetical. `badatz-chatam-sofer-petah-tikva` **is** a genuine registered id (in the 81)
and `"badatz-chatam-sofer-petah-tikva".startsWith("badatz-chatam-sofer")` is `true`. A
prefix or `.includes()` check would have wrongly reported the bare, unregistered
`badatz-chatam-sofer` as registered. All membership checks in this report and round 1 used
exact `Set.has()` — confirmed by re-reading my own scripts, not just asserting it.

---

## PART 5 — `migrate-kosher-fields.mjs` durability fix (code + tests, not applied)

### Exact mechanism that would recreate the problem on a future run

`scripts/migrate-kosher-fields.mjs` reads only `place.kosherType` (never `certifiedBy`,
never `kashrut-registry.json` — confirmed zero references to either, round 1 A4/A6 and
re-confirmed by grep this round). Its `.map()` unconditionally applies a hardcoded `MAP`
table to **every** place that has *any* `kosherType`, with no check of whether that
record's `certifiedBy` is reviewQueue-listed. Concretely: if any future script (a new
importer, a data-entry fix, a re-run of an existing importer) sets `kosherType` on a
record whose `certifiedBy` matches a reviewQueue raw string — exactly what happened with
Golda's `mapKosherType('חלב ישראל') → 'rabanut'` (round 1) — and `migrate-kosher-fields.mjs`
is run again afterward, it will silently re-derive `kosherLevel`/`kosherAuthority`/
`kosherAuthorityGroup` from that `kosherType`, with zero awareness that the registry
explicitly deferred that exact string to human review. This is not a one-time historical
accident; the script has no guard against recreating it.

### Proposed diff (not applied)

```diff
--- a/scripts/migrate-kosher-fields.mjs
+++ b/scripts/migrate-kosher-fields.mjs
@@ -1,8 +1,11 @@
 // Migration: add kosherLevel, kosherAuthorityGroup, kosherAuthority to all places.
 // Does NOT modify kosherType. Based only on kosherType values actually present in data.
 import { readFileSync, writeFileSync } from 'fs';
 import { fileURLToPath } from 'url';
 import { dirname, join } from 'path';

 const __dirname = dirname(fileURLToPath(import.meta.url));
 const dataPath = join(__dirname, '../src/data/generated/places.osm.json');
+const registryPath = join(__dirname, 'reports/kashrut-registry.json');

 let raw = readFileSync(dataPath, 'utf8');
 if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
 const places = JSON.parse(raw);
+const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
+const reviewQueueRaws = new Set(registry.reviewQueue.map((r) => r.raw));

 // Approved mapping — only types present in actual data.
 // authority: null = group is known but specific body is not.
 const MAP = { ... };

-const counts = { enriched: 0, noKosherType: 0, unmapped: 0 };
+const counts = { enriched: 0, noKosherType: 0, unmapped: 0, reviewQueueSkipped: 0 };

 const updated = places.map(place => {
+  // A reviewQueue-listed certifiedBy means a human explicitly deferred this
+  // string — never derive a structured value from kosherType for it, even if
+  // kosherType is set. This is the guard that was missing (see round-2
+  // report, Part 5) and is what let golda-ff986d68 happen.
+  if (place.certifiedBy && reviewQueueRaws.has(place.certifiedBy)) {
+    counts.reviewQueueSkipped++;
+    return place;
+  }
   if (!place.kosherType) {
     counts.noKosherType++;
     return place;
   }
   const meta = MAP[place.kosherType];
   if (!meta) {
     counts.unmapped++;
     console.warn(`  WARN: unmapped kosherType "${place.kosherType}" on "${place.name}"`);
     return place;
   }
   counts.enriched++;
   return {
     ...place,
     kosherLevel: meta.kosherLevel,
     kosherAuthorityGroup: meta.kosherAuthorityGroup,
     kosherAuthority: meta.kosherAuthority,
   };
 });

 writeFileSync(dataPath, JSON.stringify(updated), 'utf8');

 console.log('\n── Migration complete ──────────────────────────────');
 console.log(`  Enriched:         ${counts.enriched}`);
+console.log(`  Skipped (reviewQueue): ${counts.reviewQueueSkipped}`);
 console.log(`  No kosherType:    ${counts.noKosherType}`);
 console.log(`  Unmapped (warn):  ${counts.unmapped}`);
 console.log(`  Total:            ${places.length}`);
```

This mirrors `apply-kashrut-authorities.mjs`'s existing rule (e) exactly ("never touch a
record whose `certifiedBy` is in `reviewQueue`") — the same rule, applied to the other
pipeline, so both are consistent instead of only one being registry-aware.

### Regression tests — written, run against fixture data, not the real file

`scripts/reports/migrate-kosher-fields-reviewqueue-fix.proposed-test.mjs` — a standalone
Node script (this repo's jest `testMatch` doesn't cover `.mjs`, so this avoids touching
jest config for a proposal-only file) testing an exact copy of the proposed `enrichOne`
logic against fixture data, including the literal Golda scenario. Run: `node
scripts/reports/migrate-kosher-fields-reviewqueue-fix.proposed-test.mjs` → **5/5 passed**:
reviewQueue-matched record left untouched even with a mapped `kosherType`; the exact
Golda-shaped case (`חלב ישראל`) produces no structured fields; non-reviewQueue records keep
their existing correct enrichment unaffected; a record with no `certifiedBy` is never
false-flagged as reviewQueue-matched; the pre-existing no-`kosherType` skip path is
unaffected.

**Not applied to the real script or to `places.osm.json`. For review only, per instructions.**
