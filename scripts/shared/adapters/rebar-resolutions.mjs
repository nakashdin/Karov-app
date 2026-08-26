/**
 * Human-reviewed resolutions for rebar's 3 structurally-ambiguous records
 * (Item 4 Unit 2, originally decided in remediate-rebar-55.mjs before the
 * pipeline architecture existed — ported here unchanged, same reasoning,
 * same winning branches). The pipeline's matcher (store-matcher.mjs) never
 * auto-resolves ambiguity by design; this is the separate, auditable,
 * explicit-input channel kashrut-pipeline.mjs's runPipeline() consumes for
 * a human to resolve one anyway (validated against the matcher's own live
 * candidate set every run, not trusted blind — see runPipeline's resolutions
 * validation).
 *
 * branchSourceKey values are rebar-adapter.mjs's `${name}|${address}` shape
 * — confirmed live against the feed on 2026-08-27, not guessed.
 */
export const REBAR_RESOLUTIONS = {
  // Candidates: "קרית אתא- שער הצפון" (3/5 address-token overlap, city
  // matches this record's cityId — קריית אתא is a spelling variant of the
  // same city) vs "חיפה- ביג קריות" (zero address-token overlap, different
  // city than this record's cityId — a proximity-only false positive, not
  // claimed by any other existing record). The two candidates DISAGREE on
  // kosher (true vs false), so getting this one wrong changes the actual
  // written value — the only one of the three where that's true.
  'rebar-02629c63': {
    branchSourceKey: 'קרית אתא- שער הצפון|דרך חיפה 52',
    reasoning:
      'Address-token overlap 3/5 with this record, and the candidate\'s own city (קרית אתא) matches this record\'s ' +
      'cityId (קריית אתא, spelling variant). The other candidate (חיפה- ביג קריות) has zero address-token overlap ' +
      'and a different city — proximity-only. The two candidates disagree on kosher (true vs false), so this is the ' +
      'one resolution of the three that decides the actual written value.',
  },
  // rebar-dc59d466 and rebar-bs-central-station are a genuine mutual 2x2:
  // both existing records have BOTH "קניון הנגב" and "תחנה מרכזית" as
  // candidates. Resolved RECIPROCALLY — each existing record to the feed
  // store whose name it already carries — which is not a coincidence
  // available on only one side: under this resolution every feed store is
  // claimed by exactly one existing record, and no store is left
  // double-claimed or unclaimed. Both candidates are kosher:true either way,
  // so this resolution decides WHICH store gets cited as the match, not
  // WHAT gets written.
  'rebar-dc59d466': {
    branchSourceKey: 'באר שבע- קניון הנגב|שדרות יצחק רגר 2',
    reasoning:
      'This record\'s own name is "קניון הנגב" and that candidate has 4/6 address-token overlap (שדרות/יצחק/רגר/2) — ' +
      'a double match, name AND address. Reciprocal with rebar-bs-central-station\'s resolution: under both, every ' +
      'feed store in this 2x2 is claimed exactly once.',
  },
  'rebar-bs-central-station': {
    branchSourceKey: 'באר שבע- תחנה מרכזית|תחנה אגד באר שבע',
    reasoning:
      'This record\'s own name is "...תחנה מרכזית", the other half of the mutual 2x2 with rebar-dc59d466. Reciprocal ' +
      'resolution: every feed store in this pair is claimed exactly once under both resolutions together, which a ' +
      'wrong pairing on either side could not produce.',
  },
};
