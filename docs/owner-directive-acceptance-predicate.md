# Acceptance predicate — REVIEWER-authored criteria for judging work on the owner's directive

> ### ⚠️ AUTHORSHIP — read this before treating anything below as a requirement
>
> **This document was written by the Reviewer, not by the project owner.** It pre-registers the criteria the
> *Reviewer* will apply when verifying work on the owner's directive. It is not a statement of the owner's
> requirements, and nothing in it carries owner authority.
>
> The distinction is load-bearing and has already been missed once: an agent read this as *"the owner's own
> pre-registered, binding acceptance criteria"* and designed against it as though the thresholds here had been
> chosen by the owner. They were not. Every specific value in this file — ratios, taxonomy members, field
> lists — is a reviewer's proposal, **challengeable on its merits by anyone including the Implementer**.
>
> The owner's actual requirements are their directive text alone. Where this document goes beyond it, that is
> a reviewer raising the bar, which is legitimate — but it must be argued, not cited.
>
> **A peer's document cannot become owner authority by being committed to the repo.**

**Written before any investigation findings exist.** Committed against HEAD `7d17cab`, dataset blob
`2f041001668b`. Criteria decided from the code and data as they stand, so that none can be shaped by the
result it is meant to judge. Anything added after findings arrive is marked `[POST-HOC]`.

The B1 predicate caught a scoping error that would otherwise have shipped as complete. The three items below
are the ones where a plausible-looking answer is cheapest to produce and hardest to falsify afterwards.

---

## 1. The A/B boundary in the 358 classification

The owner wants **A** — *kosher status has evidence, the level was inferred* — separated from **B** —
*evidence for a certifying body, not for the level*. Both are "the level was inferred." The only real
difference is whether the source text identifies a **body**. A classifier can therefore produce a clean split
that is one bucket relabelled.

**P1.1 — THE SPLIT MUST SURVIVE DELETION OF OUR OWN DERIVED FIELDS. Non-waivable.**
`kosherType`, `kosherLevel`, `kosherAuthorityGroup`, `kosherAuthority` and `certifierId` are values *we*
wrote, several by the very inference under investigation. A classifier that reads them is restating our prior
guess. I will strip all five from a copy and re-run the classification: **the A/B assignment must be
identical.** If it cannot be computed from `certifiedBy` + the registry alias table alone, it is not reading
evidence and the split is rejected.

**P1.2 — VAGUE-BODY RECORDS MUST BE A THIRD STATE, NOT SWEPT INTO A.**
FACTS §15a: the resolve-based predicate is blind exactly where the text is too vague to resolve, and
under-counts in the direction of weakest evidence. A record whose `certifiedBy` names a body that fails to
resolve — `authorityId: null`, or reviewQueue-deferred — is **not** category A. Reading "our alias table
can't resolve it" as "no body was named" moves the *worst-evidenced* records into the *better-looking*
bucket. I will count the records in A whose `certifiedBy` is a body reference and require that count to be
**0** or separately reported.

**P1.3 — THE ARITHMETIC MUST CLOSE AGAINST NUMBERS ALREADY ESTABLISHED.**
A + B + the rest = 358. B should stand in a stateable relationship to the 343 / true-398 population. A round
number, or a total that only closes by rounding, is a smell and I will chase it.

**P1.4 — I WILL SAMPLE THE BOUNDARY, NOT THE MIDDLE.**
Give me the ten records nearest the A/B line by the classifier's own criterion. I read their raw `certifiedBy`
by hand. **If I cannot tell A from B by reading the source text, neither can the classifier**, and the
boundary is manufactured rather than found.

---

## 2. The certificate design's failure taxonomy

Requirement: a failed download, an unreadable certificate, an ambiguous date, or a failed extraction must
never read as success — with AMBIGUOUS distinct from FAILED.

**P2.1 — EXHAUSTIVE BY CONSTRUCTION, NOT BY ENUMERATION. Non-waivable.**
No listing of cases proves a taxonomy complete. What proves it is that **there is no default success path**:
writing a date must require an explicit `VERIFIED` variant, and every other outcome must be *structurally
incapable* of producing one. `{ok: boolean, date?}` is a plausible taxonomy. A discriminated union where only
one variant carries a date is an exhaustive one. Same argument as the tagged-union `basis` in
`recordKashrutWrite` — structural, not conventional.

**P2.2 — AN UNRECOGNISED CONDITION MUST MAP TO ITS OWN OUTCOME.**
If an unexpected error is caught and filed as the nearest known failure, then every future failure mode
silently becomes an old one and the taxonomy looks complete forever. There must be a terminal
`UNKNOWN`/`UNCLASSIFIED` outcome that is itself reportable. A taxonomy with no bucket for "something we
didn't anticipate" is asserting that nothing unanticipated can happen.

**P2.3 — THE ALL-FAILED RUN MUST BE LOUD, AND LOUDNESS CANNOT BE PER-RECORD.**
Per-record handling is *correctly* conservative: on failure, leave `certificateValidUntil` untouched, never
extend, clear or guess. That is why a run whose fetches all failed is today indistinguishable from no run at
all. The signal only exists in aggregate, so I require:

- the run reports `attempted / verified / ambiguous / failed`, and
- **exits non-zero when `verified === 0 && attempted > 0`**, and
- exits non-zero when the failure ratio crosses a stated threshold.

**And I will fire it**: run with the source unreachable and require a non-zero exit plus an explicit
`0 of N verified` line. A design that only *reports* this in prose is a design where the exit code still
lies. This is "check the output, not the exit code" implemented as *make the exit code carry the output's
meaning*.

**P2.4 — AMBIGUOUS MUST BE PERSISTED, NOT ONLY LOGGED.**
If ambiguity exists only in a run's stdout, the next run has no memory of it, re-derives it, and nobody ever
counts it. AMBIGUOUS needs a durable marker so a ratchet can hold it. Otherwise it is a category that exists
in the taxonomy and nowhere in the data.

**P2.5 — NO REGRESSION ON WHAT ALREADY WORKS.** The current script leaves the date untouched on fetch or
parse failure (`extract-cert-expiry.mjs:207-208`) and its rolling 60-day window means the 2026-09-11 cohort
re-fetches on an ordinary run with no flag. Both properties must survive the redesign.

---

## 3. The 8 towns — I have already determined this offline, and it is neither option

The owner refuses a manual add if the real defect is our ingestion. The framing on offer is *genuinely absent
from OSM* vs *our filter excluded it*. **Determined from the code before any investigation: it is a third
thing, and it needs no network to establish.**

`scripts/fetch-osm-places.mjs` writes `places.osm.json` **and** `cities.osm.json` in the same run, and the
city list is built at lines 183-190 from `Object.keys(counts)` over *that run's own places array*:

```js
// Build cities list from localities that actually have places.
for (const p of places) if (p.cityId) counts[p.cityId] = (counts[p.cityId] || 0) + 1;
const cities = Object.keys(counts).map(...)
```

So **`cities.osm.json` is a projection of `places.osm.json` as it stood when that one script last ran.** It is
not an independent locality registry. Consequences:

1. Any locality introduced by *any other importer* is an orphan **by construction**, and stays one until
   `fetch-osm-places.mjs` runs again.
2. `fetch-osm-places.mjs` rebuilds `places.osm.json` from an Overpass query alone — the same full-overwrite
   destruction guarded elsewhere. **So the only mechanism that can add a city is the one mechanism nobody can
   safely run.**
3. This is prospective, not historical: `unknownCityId` is 0 today, and the 9 records across 8 localities
   appear the moment the Tzohar importer runs, because those localities exist in Tzohar's data and not in the
   projection.

`LOCALITIES_QUERY` is `node["place"~"city|town|village"]` — which also excludes `hamlet` and
`isolated_dwelling`, the tags Israeli kibbutzim and moshavim frequently carry. Six of the eight are kibbutzim
and one is a moshav, so the query is a *second, independent* exclusion mechanism. Either one alone is
sufficient to produce the defect.

**P3.1 — I WILL REJECT "NOT IN OSM" THAT IS NOT EVIDENCED.**
Any finding of the form *"this locality is genuinely absent from OSM"* must come from (a) the query's own
filter, or (b) an actual OSM lookup. **"We don't have it, therefore it doesn't exist" is absence in our
derived artifact being read as absence in the world** — the same error as *the alias didn't resolve, so no
body was named*, and as *the grep returned zero, so the string isn't there*. It has bitten this project at
least three times. Without network access the honest answer is **undetermined**, and I would rather have that
than a confident guess.

**P3.2 — THE FIX MUST ADDRESS THE COUPLING, NOT THE EIGHT.**
Adding eight localities by hand leaves the mechanism intact and the defect recurs on the next import that
touches a new place. `scripts/fix-orphan-cities.mjs` is the sanctioned additive path and its header already
records that fuzzy matching was tried and rejected (`להב → להבים` and two others). Any proposal that
regenerates the city list by re-running `fetch-osm-places.mjs` is an immediate BLOCK — that is the
destructive rebuild wearing a maintenance task's clothes.

---

## 4. Non-waivable, batch-wide

- **N1 — no dataset write without the owner's authorisation for that specific item.** Items 2, 3, 5, 6 are
  gated. Item 4 is authorised as a rule; see §5 on the thirteen.
- **N2 — cold verify from a detached worktree.** `jest --clearCache` first.
- **N3 — pre-flight every script for an absolute path before running it anywhere.** A worktree is theatre
  against one that has one.
- **N4 — every guard gets fired, not read.**
- **N5 — nothing else in the commit; explicit pathspec; index verified empty.**

---

## 5. The item-4 / item-2 collision

The thirteen carve-out records are ones where `places.osm.json` asserts a **level** over a named body — which
is precisely item 2's population, gated pending the owner's report. Applying item 4's conflict rule to them
performs item 2's downgrade through item 4's door.

**The gate is correct, and the concrete harm is not procedural.** The owner reserved item 2 *in order to see
the classification report first*. Remediating thirteen of that population beforehand means the report
describes a state that no longer exists, and those thirteen are missing from the counts the owner is deciding
against. That corrupts the evidence base for a decision they explicitly kept.

**But the gate belongs at application of those thirteen, not at building or at the merge.** Recommended:
build item 4 complete — resolve **all** conflicts including the thirteen — and for those thirteen **emit
rather than apply**, marked `held: item-2-gated` with the reason. Then the rule is implemented and verifiable
across the full population, nothing in item 2's population mutates, the thirteen appear in item 2's report as
*resolved pending authorisation* (which strengthens that report rather than corrupting it), and when item 2 is
authorised they apply with nothing to remember.

**Consequence for my own verification:** the owner named the Reviewer to verify the conflict-resolution logic
and sample-check its application. If the thirteen are held, my sample-check must cover **held** records too —
verifying that the resolution *would* be correct, not only that applied ones are. A held record is an
unverified record unless someone checks it.
