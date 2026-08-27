/**
 * RETIRED 2026-08-26 — superseded by scripts/remediate-rebar-55.mjs.
 *
 * This script was written (commit 7c1c5e1) to restore kashrut evidence for
 * rebar-bs-central-station and rebar-ramat-gan-marom-nave, matching each to
 * a feed entry by single-nearest name+address+coordinate (~120m). Its own
 * commit message states --apply was pending owner approval; no later commit
 * ever applied it, so both records have sat with NO kashrut fields at all —
 * not 'unknown', entirely absent — since c4775dd stripped their original
 * kosherType (value "regular"). That is a live "אין תעודה → אין רשומה" violation:
 * juice_bar is a FOOD_TYPE and the app's food filter has no kashrut
 * precondition, so both were displayed with zero kashrut info.
 *
 * Retired, not merely superseded, because its matching method is unsafe on
 * this exact data: rebar-bs-central-station is one of the three genuinely
 * ambiguous cases matchRebarStores() (scripts/shared/rebar-feed.mjs) finds
 * on the live feed — it and rebar-dc59d466 mutually cross-claim the same
 * two Beer Sheva feed stores ("קניון הנגב" / "תחנה מרכזית"), both kosher:true,
 * which is exactly the "plausible-looking wrong branch" shape a
 * single-nearest match cannot detect and this one would have been exposed
 * to on its very next run. remediate-rebar-55.mjs resolves it instead via
 * matchRebarStores' many-to-one-aware matcher plus an explicit, reasoned,
 * human-reviewed per-record resolution (reciprocity-checked against the
 * other ambiguous record) — see that file's header and its "AMBIGUOUS
 * RESOLUTIONS" comment.
 *
 * DO NOT RUN THIS FILE. It is kept only so `git log -- scripts/
 * restore-rebar-two-branches.mjs` finds this note at the tip; the original
 * restoration logic is preserved in git history at commit 7c1c5e1.
 */
throw new Error(
  'restore-rebar-two-branches.mjs is retired — see the file header. Use scripts/remediate-rebar-55.mjs instead.',
);
