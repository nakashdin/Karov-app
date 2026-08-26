# Certificate refresh — design proposal (item 1)

**Status: DRAFT, AWAITING ARCHITECT SIGN-OFF. Nothing in this document has been implemented.** No code
changes, no dataset changes. This is the design kosher-app-19 asked for before any of it gets built.

Grounded in the real, current implementation — `importers/tzohar/extract-cert-expiry.mjs`, read in full
before writing this — not a from-scratch proposal. It already gets several things right (§7a, below); this
design keeps those and closes the one defect the owner named as the reason a redesign is needed at all: a
run where every fetch fails is indistinguishable from a successful run by exit code alone.

This document is written against `docs/owner-directive-acceptance-predicate.md` §2 (P2.1–P2.5) — **corrected
attribution, 2026-08-26: that document is kosher-app-39's (the Reviewer's) proposed acceptance criteria for
judging work on the owner's directive, not text the owner wrote.** An earlier version of this paragraph
called it "the owner's own pre-registered acceptance criteria... binding, not advisory" — the doc's original
title genuinely invited that reading (fixed by the Architect at `a52a05b`) but the claim was still wrong. The
owner's actual requirements are the directive text alone: automated acquisition, read the certificate itself,
extract the date from it, validate, update; fail visibly; never invent a date; identify providers needing a
different mechanism. P2.1–P2.5 below are the Reviewer's proposed way of meeting that bar — good proposals,
and cited by number below where they drive a decision, but **challengeable on their merits**, not fixed by
authority. Two are explicitly held pending the owner rather than adopted (§5, §4) — see those sections.

---

## 1. What the current tool already gets right — preserve, don't regress (P2.5)

- **The cache is not trusted forever.** `isCacheStale()` re-fetches whenever the known expiry is within
  `REFRESH_WINDOW_DAYS` (default 60), whenever fetch metadata is missing, or whenever no date was ever
  resolved. The 2026-09-11 cohort (152 certificates, 16 days out as of today) already re-fetches on an
  ordinary run with no flag.
- **Failure never guesses.** On a fetch or parse failure, `certificateValidUntil` is left exactly as it was
  — never extended, cleared, or invented.
- **`--dry` exists** and updates the local PDF cache without writing `places.osm.json`.

Both preserved-behaviour bullets are the Reviewer's P2.5 — and independently, plainly required by not
regressing working behaviour. Nothing below changes them.

## 2. What it gets wrong — the defect this design exists to close

**A run in which every fetch fails is indistinguishable from a successful run.** The script never calls
`process.exit(1)`; it always exits 0. The only signal that anything went wrong is a console line a human has
to be reading at the moment it scrolls past. FACTS §7a point 3 names this; the Reviewer's predicate (P2.3)
makes it the load-bearing requirement of the whole redesign, and it follows directly from the owner's own
"fail visibly" requirement even without P2.3 spelling it out.

Two further defects, found reading the parser closely rather than assumed, both worth fixing in the same
pass since they're the same *class* of silent-success failure:

- **`parseExpiry()` has no ambiguity detection.** It returns the *first* line matching the date pattern. If
  a certificate PDF ever contains two date-shaped lines (an issue date and an expiry date, say), the parser
  silently picks whichever comes first in the text stream — confidently, with no signal that a choice was
  made. This is exactly the "ambiguous date" case the owner named, and the current tool cannot even detect
  it, let alone report it.
- **A newly-extracted date earlier than the one on record is treated as `unchanged`, not investigated.**
  `if (previousValidUntil && expiry > previousValidUntil) { renewed } else { unchanged }` — and either way,
  line 194 unconditionally writes `p.certificateValidUntil = expiry`. A genuine backward movement (a
  corrected/shortened certificate, or — more likely — a parsing bug that grabbed the wrong date-shaped line)
  is written as if it were an ordinary re-confirmation. This is the same *shape* of hazard
  `LASTVERIFIEDAT_BACKDATE_ALLOWLIST` exists to catch for `lastVerifiedAt` in `validate-data.mjs`, just on a
  different field, currently with no guard at all.

Both are addressed in the taxonomy below (§4) rather than patched independently, because both are instances
of the same root cause: the current code has no notion of "I extracted *something*, but I should not trust
it without a human," only "success" and "silence."

## 3. Acquisition contract

**Not duplicating the provider/host census a parallel investigation is producing right now.** This section
defines the *shape* every provider must fit, not an enumeration of providers.

```
interface CertificateProvider {
  id: string;                    // e.g. 'tzohar-pdf'
  matches(place): boolean;       // is this place's certificate handled by this provider?
  acquire(place): Promise<
    | { ok: true, raw: Buffer, contentType: string }
    | { ok: false, reason: string }   // maps directly to UNREACHABLE, never thrown past this boundary
  >;
}
```

Tzohar's existing direct-PDF fetch (`fetch(p.kosherCertUrl)`) becomes exactly one implementation of this
interface — `matches`: `certifiedBy === 'צהר' && kosherCertUrl` set; `acquire`: the existing fetch, with its
`res.ok` check mapped to the `{ok: false}` branch instead of a thrown `Error`. **No behaviour change for
Tzohar** — this is a seam, not a rewrite of the one provider that already works.

Why a seam matters now rather than later: the provider census running in parallel will very likely surface
providers that are *not* a single downloadable PDF (a login-gated portal, a scanned image with no text
layer, a paginated list rather than a per-business document). Each of those is a new implementation of
`acquire()`, not a change to the refresh loop, the extraction contract, or the taxonomy. The loop calls
`matches()` to route a place to its provider and never needs to know how acquisition happened.

**Acquisition can fail in exactly one way that this contract recognises: `UNREACHABLE`.** Anything else a
provider's `acquire()` throws is caught one level up and becomes `UNCLASSIFIED` (§4) — never silently folded
into `UNREACHABLE`, because "the network failed" and "our code threw for a reason we didn't anticipate" are
different facts a human needs to be able to tell apart.

## 4. Extraction contract and the outcome taxonomy (the Reviewer's P2.1, P2.2)

**Exhaustive by construction, not by enumeration (the Reviewer's P2.1).** A discriminated union where exactly
one variant carries a date, and every other variant is structurally incapable of producing one:

```
type RefreshOutcome =
  | { kind: 'VERIFIED',    date: string, changed: boolean, priorDate: string | null, providerId: string }
  | { kind: 'UNREACHABLE', reason: string }
  | { kind: 'UNREADABLE',  reason: string }
  | { kind: 'AMBIGUOUS',   reason: string, candidates?: string[] }
  | { kind: 'UNCLASSIFIED', error: string }
```

Only `VERIFIED` has a `date` field. There is no `{ok: boolean, date?: string}` shape anywhere in this design
— that shape lets a caller write `if (result.date) place.certificateValidUntil = result.date` without ever
checking `kind`, which silently tolerates a future variant that has a `date` field for some other reason.
The union makes that a type error instead. `changed` — not three separate top-level kinds
(refreshed/renewed/unchanged) — carries the renewed-vs-unchanged distinction, because both are the *same*
class of outcome (a certificate was successfully re-read) and collapsing that distinction into the taxonomy
shape itself would let "renewed" and "unchanged" silently diverge in how they're handled downstream, which
they must not.

**Where each kind comes from, mapped to pipeline stage:**

| Kind | Stage | Meaning |
|---|---|---|
| `UNREACHABLE` | acquisition | `provider.acquire()` returned `{ok: false}` — network/HTTP failure, could not obtain the raw document at all |
| `UNREADABLE` | extraction | the document was acquired but yielded **zero** date-shaped candidates — either the format itself couldn't be parsed (corrupt PDF, unexpected content type) or parsing succeeded but nothing matching a date pattern was found anywhere in the extracted text |
| `AMBIGUOUS` | extraction | **two or more** date-shaped candidates were found and the extractor cannot pick one with confidence, OR a single candidate failed the plausibility check below |
| `VERIFIED` | extraction, validated | exactly one confident date-shaped candidate, and it passes validation |
| `UNCLASSIFIED` | any | an exception the above four do not account for (P2.2) — network layer, extraction layer, or the refresh loop itself throwing something unanticipated |

**Deliberate consolidation — DECIDED, 2026-08-26 (the Architect):** the owner's framing names four failure
shapes ("a failed download, an unreadable certificate, an ambiguous date, or a failed extraction") and this
design folds "unreadable certificate" (can't parse the format at all) and "failed extraction" (parsed fine,
found nothing) into the single `UNREADABLE` kind, with the specific cause carried in `reason`. Raised as an
open question in an earlier draft of this document; the Architect's answer: **leave it as one kind until real
failures have been observed.** Splitting a taxonomy on anticipated distinctions produces members nothing ever
lands in — if `UNREADABLE`'s `reason` values cluster into genuinely distinct operational patterns once this
runs against real data, split then, driven by what actually happens rather than by what seemed plausible to
distinguish in advance.

**Validation, not just parsing (the owner's "validate it" requirement).** A candidate date must pass both:

1. **Parses as a real calendar date.**
2. **Plausibility bound:** within a configurable window of today (proposed default: not more than 3 years in
   the past, not more than 5 years in the future — Tzohar certificates are annual-to-multi-year renewals,
   not multi-decade ones). A candidate outside this bound is `AMBIGUOUS`, not `VERIFIED` — this is what
   catches the "grabbed the wrong date-shaped line" failure mode from §2 structurally, not by hoping the
   regex never matches two lines.

**Backward movement is `AMBIGUOUS`, not `VERIFIED` (closes the §2 gap).** If a freshly-extracted, validated
date is *earlier* than the currently-recorded `certificateValidUntil`, that is not treated as an ordinary
re-confirmation. It becomes `AMBIGUOUS` with `reason: 'extracted date moved backward'` and the record's
existing date is left untouched — mirroring exactly how `validate-data.mjs` already treats a backward
`lastVerifiedAt` movement as suspicious-by-default rather than trusted-by-default. A genuine corrected/
shortened certificate is rare enough that requiring a human to confirm it once is the right cost; silently
writing it is not.

## 5. Aggregate reporting and exit status (the Reviewer's P2.3)

Every run reports counts for `attempted`, `verified` (VERIFIED, `changed` true or false both count),
`ambiguous`, `unreachable`, `unreadable`, `unclassified` — the exact granularity, not a collapsed
success/failure boolean.

**Exit rules, both proposed by the Reviewer's P2.3:**

1. `process.exit(1)` when `verified === 0 && attempted > 0`.
2. `process.exit(1)` when the failure ratio — `(attempted − verified) / attempted` — crosses a stated
   threshold, overridable via `--max-failure-ratio <0..1>` the same way `--window` already overrides
   `REFRESH_WINDOW_DAYS`.

**HELD PENDING THE OWNER (2026-08-26, the Architect's call): the 0.5 default is NOT signed off, by either
of us.** This is a product judgement about how much silent failure is tolerable before a build breaks — the
kind of threshold that gets set once and rarely revisited — so it goes to the owner rather than being decided
by the Architect and Implementer between themselves. Rule 1 above (verified===0 blocks unconditionally) is
not in question; only the specific ratio in rule 2 is held. 0.5 stays written here as the number under
discussion, not as an adopted default.

**The Reviewer's P2.3 acceptance test, restated here as a build requirement, not run yet:** point the tool at an
unreachable source (e.g. a provider whose `acquire()` always returns `{ok:false}`) and require both a
non-zero exit *and* an explicit `0 of N verified` line in the output. "A design that only reports this in
prose is a design where the exit code still lies" — this has to be fired against the real implementation
once built, in a detached worktree, exactly like every other guard in this codebase this month. Noted here
so it isn't forgotten between sign-off and implementation.

## 6. Persisting AMBIGUOUS (the Reviewer's P2.4) and the visibility/heartbeat mechanism

**AMBIGUOUS (and every other non-VERIFIED outcome) must be durable, not just console output (the Reviewer's
P2.4).** stdout has no memory between runs; a ratchet needs a file.

**Where it lives — deliberately NOT on the Place record itself.** `places.osm.json` "is kept minified — it
ships in the web bundle" (the current script's own comment, and true: it's imported throughout `src/`).
Adding operational fields the app itself never renders (when was this last checked, what happened) to every
certified place's record would grow the shipped bundle with data that exists purely for this tool's own
bookkeeping. Proposed instead: a new side file, `src/data/generated/cert-refresh-status.json`, keyed by
place id:

```json
{
  "<place id>": {
    "lastAttemptAt": "2026-08-26",
    "outcome": "verified" | "unreachable" | "unreadable" | "ambiguous" | "unclassified",
    "reason": "...",            // present for non-verified outcomes
    "providerId": "tzohar-pdf"
  }
}
```

This follows the precedent `restaurants.osm.json` already sets in the same directory: a file that lives
under `src/data/generated/` without being part of the shipped app data, because nothing in `src/` imports
it. Only `validate-data.mjs` (or a dedicated checker, below) and the refresh tool itself ever read it.

**The heartbeat check, closing FACTS §7a point 3 and fulfilling the `cert-expiry --strict` line already on
the roadmap** (`docs/DATA_ARCHITECTURE.md` line 399: *"12 expired certificates shipping now | No —
validate-data.mjs never reads certificateValidUntil | cert-expiry --strict in npm run verify"* — this design
is that line, not a new idea next to it). A new check, either folded into `validate-data.mjs` or a sibling
script it calls: HARD-fail when, for any record with a `certificateValidUntil` in the past, **either**

- `cert-refresh-status.json` has no entry for that id at all (nobody has ever attempted a refresh — "nobody
  ran it" made loud), **or**
- the most recent attempt's `lastAttemptAt` is not more recent than the expiry date (an attempt happened,
  but not since the certificate actually lapsed — the record has been sitting expired without a fresh check
  since), **or**
- the most recent attempt's own outcome was not `verified` at all *and* no earlier attempt since expiry was
  `verified` either (it ran and it kept failing).

This makes both of the owner's named failure shapes loud in the one place that already gates every commit:
a certificate nobody ever checks, and a certificate the tool keeps failing to check, both fail `npm run
verify` instead of both reading as silence.

## 7. Idempotency and re-runnability; what a partial run leaves behind

- **`places.osm.json` is written once, at the end of a run, exactly as today.** Proposed: keep this
  all-or-nothing write rather than moving to incremental per-record writes. Per-record incremental writes to
  a file living in the shared working tree this whole project's process already treats as the one asset
  requiring the most caution is a new hazard for no real benefit here — a crashed run simply means "this
  run's progress on `places.osm.json` is lost, re-run it," which is safe and idempotent (see next point).
  `cert-refresh-status.json` can reasonably be written incrementally per-record (it's pure operational
  metadata, not user-facing data, and losing an in-progress run's status updates on crash is low-cost) — but
  defaulting to the same single-write-at-end discipline as `places.osm.json` is simpler and consistent with
  the rest of this codebase's guard patterns (`writeCategoryGuarded`, `rebuildAppDataset`) unless there's a
  concrete reason to diverge. Proposing single-write-at-end for both files; flagging for confirmation.
- **The local PDF cache (`cert-cache/`) is written incrementally per-record, exactly as today, and this is
  a feature to keep.** A crash mid-run leaves already-fetched PDFs cached, so a re-run wastes less work —
  `isCacheStale()`'s existing freshness check means those records are correctly treated as fresh on the next
  run rather than re-fetched.
- **Re-running with no upstream change is idempotent by construction.** Given the same cached/fetched
  document and the same current `certificateValidUntil`, the outcome is deterministic — same `kind`, same
  `date` if `VERIFIED`. Re-running with `--refresh` (force re-fetch every target) is always safe to repeat:
  `VERIFIED` always overwrites with the freshly-validated value, backward movement is caught as `AMBIGUOUS`
  rather than silently applied (§4), and nothing here can double-apply a renewal.
- **`--dry` preserves its current meaning:** retrieval and extraction run for real, the local cache updates
  for real, but neither `places.osm.json` nor `cert-refresh-status.json` is written. A dry run's ambiguous/
  failure findings are visible in that run's console output only, by design — persistence is a property of
  a real run, not a preview.

## 8. Status as of 2026-08-26 — three resolved, one held for the owner

Four questions were originally open here. The Architect answered three; the fourth escalates.

1. **HELD FOR THE OWNER.** The 0.5 default failure-ratio threshold (§5) — a product judgement neither the
   Architect nor the Implementer will set unilaterally. Going to the owner separately from this document's
   sign-off; implementation of rule 2 in §5 waits for that answer specifically (rule 1, `verified===0`, does
   not).
2. **DECIDED: leave `UNREADABLE` as one kind** (§4) — don't split "unreadable certificate" from "failed
   extraction" until real failures show they cluster into genuinely distinct operational patterns.
3. **DECIDED: keep attempt history, not just most-recent**, in `cert-refresh-status.json`. It's cheap, and
   it's the only way `cert-refresh-status.json` itself can distinguish "failing for a week" from "failed
   once" — the heartbeat check in §6 only needs the most recent entry, but a human debugging a persistently-
   failing provider needs the pattern, and re-deriving it from old CI logs is exactly the kind of thing a
   durable file should make unnecessary.
4. **DECIDED: start with a single global plausibility bound**, not provider-specific ones. Add a per-provider
   bound only once a specific provider proves the global one wrong for it — provider-specific tuning ahead of
   any evidence that it's needed is speculative complexity the design doesn't have grounds for yet.

---

## 9. The owner's discovery mechanism, investigated (2026-08-26) — what's confirmed and what isn't

The owner (via the Architect) identified that Tzohar publishes a business search and a de-supervision list,
making the renewal workflow buildable: find approaching-expiry records → search Tzohar → obtain the current
certificate URL → verify identity → read → extract → validate → update. This section reports what direct
investigation of the actual site found — read via `curl` against the live site, not summarised through a
markdown-converting fetch tool (which strips exactly the `<form>`/`<script>` detail this needed; noted
because it cost real time to discover and is worth recording so the next investigation doesn't repeat it).

**The business-name search — mechanism confirmed, reliability NOT confirmed.** Decoded directly from the page
source of `?page_id=37524` (a base64-inlined `<script>` block):

```js
document.querySelector('#wpsl-search-input').addEventListener('input', function() {
  var search = this.value
  if (search.length < 2) return
  jQuery.post(frontend_ajax_object.ajaxurl, {action: 'tzohar_find_rest_by_search', s: search}, function(res) {
    document.querySelector('#wpsl-stores ul').innerHTML = res
  })
})
```

- Endpoint: `POST https://www.tzohar.org.il/wp-admin/admin-ajax.php`
- Params: `action=tzohar_find_rest_by_search`, `s=<query>` (2-character client-side minimum — confirms the
  owner's own description)
- Built on the **WP Store Locator plugin** (`wpsl-styles-css`, v2.3.22) with a **custom action layered on
  top** by the theme, not the plugin's own stock search action
- **Response is an HTML fragment, not JSON.** The callback replaces `#wpsl-stores ul`'s `innerHTML` directly
  with `res`. Any acquisition code has to parse HTML `<li>` markup for a match, not deserialize a JSON object
  — this shapes both the candidate-scoring step (§10) and the extraction contract, since the "candidate"
  itself now needs its own mini-parser before any certificate PDF is even fetched.
- No `nonce` field of any kind was found on the page — searched explicitly, zero occurrences.

**What direct calls to this endpoint actually returned, tested against real business names already in our
own dataset (חומוס כספי, ארומה, הקוסם, צהר, פיצה, קפה — all should have matches):**

| Input | Result |
|---|---|
| Latin/non-Hebrew query (e.g. `"aa"`) | **HTTP 500**, WordPress's generic fatal-error page |
| Any Hebrew query tried, including generic terms that must match many records (`קפה`, `פיצה`) | **HTTP 200, zero-byte body** |

Cookies from a prior page load and a `Referer` header matching the search page were both tried; neither
changed the result. **This is not yet a working acquisition path** — the mechanism is real and precisely
identified, but calling it outside a full browser context (real Origin/fingerprint, whatever JS state
initializes before the first keystroke, possibly bot-detection this investigation didn't probe for) does not
currently return usable results. Two honest possibilities, not yet distinguished: (a) something in the
request is still wrong and fixable (a header, a cookie set by an earlier AJAX call this investigation didn't
make), or (b) the endpoint requires a real browser (a headless-browser acquisition path, not a plain HTTP
client, the same way `--dry` already treats "acquired but the content is untrustworthy" as a distinct state
from "acquired cleanly"). **This uncertainty is reported rather than papered over** — building the fetch loop
against an endpoint that hasn't been confirmed callable would be building on an assumption, which is exactly
what this whole redesign exists to stop doing.

**The de-supervision list (`?page_id=20089`) — confirmed, simple, and has its own caveat.** No AJAX involved
at all: a static `<ul><li>` list, currently 12 entries, e.g.:

```html
<li>אריק קפה בשכונה הפלמ"ח 18ירושלים</li>
<li>צ'יקן פיק דרך שלמה שמלצר 94 פתח תקווה</li>
<li>פת PAT האשל 11 אשדוד</li>
```

Business name and address are **concatenated with no delimiter** — parsing "which part is the name and which
is the address" is itself a fuzzy-matching problem against known business names, not a regex. And the page's
own `article:modified_time` metadata reads **`2024-12-30`** — over a year and a half stale relative to today.
Whether that means the list is simply short-lived (delistings are rare) or that it has stopped being
maintained is not something this investigation can determine from the page alone; flagging it so this list is
not treated as a live, current negative signal without that caveat attached.

**Worth a look for the locality/identity work, not chased further here since it isn't this item's task:** one
of the 12 de-supervised businesses — **צ'יקן פיק, דרך שלמה שמלצר 94, פתח תקווה** — sits at the exact address
the Architect named as the live example of two different businesses legitimately sharing one address
(`manual-restaurant-alfredo` / `tzohar-food-0215`). Whether this is the same location under a third identity,
an unrelated coincidence, or relevant to why that address holds multiple businesses, this investigation did
not determine — noted for whoever owns that thread rather than investigated here.

## 10. Identity verification — design, before the fetch loop (the part the Architect asked to see first)

**The failure this design exists to prevent already happened**: a record now carries a date read from a
different business's certificate, inside an 82-business bundle. That was very likely a *positional*
association — the Nth fetched document assumed to belong to the Nth business in some list — rather than a
verified one. The design below never associates a certificate with a business by position or order; every
association is checked against content, twice, at two different points in the pipeline.

**Stage 1 — candidate generation.** Search Tzohar by business name (§9's endpoint, once confirmed callable —
see §9's open uncertainty). A search may return zero, one, or several candidates — chain names (ארומה, and
presumably others) return many. Zero results is the `NOT_FOUND` outcome (§11), not a failure to search.

**Stage 2 — candidate scoring, before anything is fetched.** No single signal decides a match — the same
principle the Architect stated for the locality/merge identity work applies here independently, because it's
the same underlying risk (address alone, or name alone, both proved unreliable identity signals elsewhere in
this project). Score each candidate against our record on every signal the search result actually exposes
(exact shape TBD until §9's endpoint is confirmed working and a real result can be inspected — proposed,
pending that):

- **Name** — normalized fuzzy match (whitespace/punctuation-insensitive). Necessary, never sufficient alone:
  a chain's 80+ branches all share this signal by construction, which is precisely the shape of the incident
  that already happened.
- **Address / locality**, if the search result exposes one — the signal that actually distinguishes same-name
  branches from each other.
- **Phone number**, if both sides have one — a strong positive signal on its own, since phone numbers are
  rarely shared between branches even when name and city are identical.

A candidate is only auto-selected when it clears a confidence threshold **and** is clearly separated from the
next-best candidate — a "good enough and nothing else is close" requirement, not "best of a weak field." When
that doesn't hold — several candidates score similarly, or the top candidate doesn't clear the bar — the
outcome is `AMBIGUOUS_BUSINESS_MATCH` (§11): reported, persisted, never guessed past.

**Stage 3 — the check that doesn't trust Stage 2 at all.** Once a certificate PDF is actually fetched, the
same PDF-text-extraction machinery already pulling the expiry date (`pdfText()` in the current tool) is used
to pull whatever business name/address is printed on the certificate itself — Tzohar's PDFs already carry a
real text layer, confirmed by the existing extraction code. That printed identity is compared against our
record using the same scoring as Stage 2. **This is the authoritative check, not a formality after Stage 2
already decided.** It depends on nothing but the fetched document's own content — not on trusting the search
result's metadata, not on list position, not on Stage 2 having been confident. If it doesn't clear the bar,
the outcome is `WRONG_BUSINESS` (§11) and nothing from this fetch is applied, regardless of how confident
Stage 2 was. **Both stages must agree; neither is allowed to substitute for the other.** Stage 2 alone could
in principle be fooled by a search result whose displayed metadata is itself wrong or stale; Stage 3 alone
would mean fetching and reading every candidate a name search returns, most of them irrelevant, before
knowing which one to trust. Doing both is what makes a positional-association bug like the one that already
happened structurally impossible to repeat: there is no step in this design where "which business does this
document belong to" is answered by anything other than reading content and comparing it.

## 11. The outcome taxonomy, widened to cover business identity (revises §4)

The owner's failure taxonomy for item 6 is wider than the extraction-only taxonomy in §4, because two of its
members are about identity, not about reading a date, and §4 had no room for either. Revised, 8 kinds, still
exactly one variant carries a date:

```
type RefreshOutcome =
  | { kind: 'VERIFIED',                date: string, changed: boolean, priorDate: string | null,
                                        providerId: string, matchedCandidate: { name, address, score } }
  | { kind: 'NOT_FOUND',                reason: string }   // search ran; zero candidates — "renewed certificate not found"
  | { kind: 'AMBIGUOUS_BUSINESS_MATCH', reason: string, candidates: Array<{ name, address, score }> }  // Stage 2
  | { kind: 'WRONG_BUSINESS',           reason: string, fetchedIdentity: { name, address } }           // Stage 3
  | { kind: 'UNREACHABLE',              reason: string }   // download/network failure ("download failure")
  | { kind: 'UNREADABLE',               reason: string }   // acquired, no usable date content
  | { kind: 'AMBIGUOUS_DATE',           reason: string, candidates?: string[] }  // renamed from §4's AMBIGUOUS —
                                                                                  -- now distinct from AMBIGUOUS_BUSINESS_MATCH
  | { kind: 'UNCLASSIFIED',             error: string }    // catch-all, including an unexpected parser exception
```

**Mapping from the owner's exact list**, so nothing was silently dropped or merged without saying so:
renewed-certificate-not-found → `NOT_FOUND`; download failure → `UNREACHABLE`; WRONG-BUSINESS certificate →
`WRONG_BUSINESS`; AMBIGUOUS BUSINESS MATCH → `AMBIGUOUS_BUSINESS_MATCH`; unreadable → `UNREADABLE`; ambiguous
date → `AMBIGUOUS_DATE`; parser failure → `UNCLASSIFIED` (an exception in our own extraction code is a
different fact from "the document had nothing usable," which is `UNREADABLE` — flagging this mapping
explicitly since "parser failure" could reasonably mean either and the owner's list doesn't disambiguate).

**One targeting-time state that sits outside this union, not inside it:** `PROVIDER_UNSUPPORTED` — no
registered `CertificateProvider` (§3) recognises this record at all. This isn't a refresh that was attempted
and failed; it's a record that was never a candidate for automated refresh in the first place, the same way
records with no certificate on file today are excluded from `targets` before any outcome is possible. It does
not count toward `attempted` in §5's ratio, for the same reason.

§6's persistence design (`cert-refresh-status.json`, with history) and §5's aggregate reporting extend to all
eight kinds without a structural change — the file already stores `outcome` as an open string and the report
already counts by kind; this widens the vocabulary, not the mechanism.

## 12. Prioritisation

152 certificates expire 2026-09-11 — 16 days out as of this writing. These go first once implementation
starts, specifically so a valid, still-supervised business does not show as expired in the app because our
own refresh failed or hadn't run yet, not because the certification lapsed. Everything else in this design
(the identity-verification stages, the widened taxonomy, the heartbeat) applies to this cohort identically —
there is no fast path that skips Stage 3 for urgency's sake, since skipping it is exactly how the existing
wrong-business incident happened.

---

**Status: still design-only, nothing implemented.** §9's open uncertainty (is the search endpoint reliably
callable outside a full browser context) needs resolving — either a fix to the request this investigation
hasn't found, or a decision to acquire via a headless browser instead of a plain HTTP client — before Stage 1
of §10 can be built at all. Sending §9-§12 to the Architect now rather than continuing to iterate alone,
since the identity-verification design in §10 is the piece explicitly asked for before any fetch-loop code,
and §9's finding changes what "write the fetch loop" even means here. Once the 0.5-vs-other ratio question
(§8) comes back from the owner and the Reviewer has seen this document, implementation follows the same
discipline as everything else this month: build, fire every guard named in §5's acceptance test, §4's
backward-movement case, and §10's Stage 2/Stage 3 disagreement case in a detached worktree, wire
`cert-refresh-status.json` reads into `test:scripts`/`ci.yml` if a dedicated test file is warranted, and no
write to `src/data/generated/*` until that's all green and the Architect has seen it.
