/**
 * Human-reviewed resolutions for greg's structurally-ambiguous records —
 * every case where more than one gregcafe.co.il branch page shares a city
 * with an existing greg-* record (store-matcher.mjs's city-only fallback
 * signal, by design, treats every same-city branch as a candidate and lets
 * the many-to-one matcher report the ambiguity rather than silently
 * guessing; this file is the explicit, auditable resolution channel
 * runPipeline() consumes — see kashrut-pipeline.mjs's resolutions
 * validation for the guarantees: never applied to a record the matcher
 * didn't call ambiguous, never a branch outside that record's actual
 * candidate set).
 *
 * Each resolution is a NAME-TOKEN match: the existing record's own name
 * (minus the generic "קפה גרג" chain prefix every record carries) names the
 * one distinguishing feature the branch page's own title also carries, and
 * that overlap does not appear in the OTHER same-city candidate(s). Verified
 * reciprocal where two records share a city pairwise (Tiberias, Petah Tikva,
 * Tel Aviv): each of the two existing records resolves to a DIFFERENT
 * branch, so neither branch ends up claimed twice or unclaimed — the same
 * mutual-consistency check rebar-resolutions.mjs uses for its 2x2 case.
 *
 * Jerusalem (3 candidates, 1 existing record) and Netanya (2 candidates, the
 * second being "ohla la by greg" — a differently-named sub-brand sharing no
 * token with "קפה גרג נתניה השרון" beyond the city itself) are single-record
 * cases: no reciprocity to check, just a direct token match.
 *
 * greg-f29c21d4 ("קפה גרג לב המפרץ", חיפה, 5 candidates) is DELIBERATELY NOT
 * resolved here — it is outside Unit 3's target population already (its
 * dataset record already carries kosherType:'rabanut'/kosherLevel:'regular',
 * not part of the 38 unevidenced mehadrin-family records this run touches),
 * and unlike every other case above, none of Haifa's 5 candidate branch
 * names ("חוצות המפרץ" / "גרנד קניון חיפה" / "קניון חיפה" / "גרג סינמול" /
 * "קרית חיים") shares an unambiguous token with "לב המפרץ" the way e.g.
 * "TLV" or "סירקין" do for the cases above — investigated directly
 * (2026-08-26/27) and left genuinely uncertain rather than force-resolved.
 * It stays AMBIGUOUS, reported, unwritten.
 */
export const GREG_RESOLUTIONS = {
  'greg-0b229b5e': {
    branchSourceKey: 'https://gregcafe.co.il/branch/%d7%93%d7%a0%d7%99%d7%9c%d7%95%d7%a3/',
    reasoning:
      'Record name "קפה גרג דנילוף" names "דנילוף" — matches only "סניף דנילוף, טבריה", not the other Tiberias ' +
      'candidate "סניף פוריה, טבריה". Reciprocal with greg-b4288d9c: the two Tiberias records resolve to two ' +
      'different branches.',
  },
  'greg-b4288d9c': {
    branchSourceKey: 'https://gregcafe.co.il/branch/%d7%a4%d7%95%d7%a8%d7%99%d7%94/',
    reasoning:
      'Record name "קפה גרג פוריה" names "פוריה" — matches only "סניף פוריה, טבריה", not the other Tiberias ' +
      'candidate "סניף דנילוף, טבריה". Reciprocal with greg-0b229b5e.',
  },
  'greg-17c276c8': {
    branchSourceKey: 'https://gregcafe.co.il/branch/%d7%99%d7%a8%d7%95%d7%a9%d7%9c%d7%99%d7%9d-6/',
    reasoning:
      'Record name "קפה גרג קניון הדר" names "קניון הדר" — matches only "סניף קניון הדר, ירושלים" among the 3 ' +
      'Jerusalem candidates ("סינמה סיטי" and "עזריאלי מלחה" share no token with it).',
  },
  'greg-55b37c5c': {
    branchSourceKey: 'https://gregcafe.co.il/branch/%d7%92%d7%a8%d7%92-tlv/',
    reasoning:
      'Record name "קפה גרג TLV" names "TLV" — matches only "סניף TLV, תל אביב-יפו", not the other Tel Aviv ' +
      'candidate "סניף דיזנגוף סנטר, תל אביב-יפו". Reciprocal with greg-443cb001.',
  },
  'greg-443cb001': {
    branchSourceKey: 'https://gregcafe.co.il/branch/%d7%93%d7%99%d7%96%d7%a0%d7%92%d7%95%d7%a3-%d7%a1%d7%a0%d7%98%d7%a8/',
    reasoning:
      'Record name "קפה גרג דיזנגוף סנטר" names "דיזנגוף סנטר" — matches only "סניף דיזנגוף סנטר, תל אביב-יפו", not ' +
      'the other Tel Aviv candidate "סניף TLV, תל אביב-יפו". Reciprocal with greg-55b37c5c. This is also the page ' +
      'where the level phrase appears as plain body text ("כשר מהדרין" in the opening-hours block) rather than in ' +
      'the badge span every other page uses — found on a full-page resweep, not the badge-only first pass.',
  },
  'greg-0ff39bbb': {
    branchSourceKey: 'https://gregcafe.co.il/branch/%d7%90%d7%91%d7%a0%d7%aa-%d7%a4%d7%aa/',
    reasoning:
      'Record name "קפה גרג הקניון הגדול" names "הקניון הגדול" — matches only "סניף הקניון הגדול, פתח תקווה", not ' +
      'the other Petah Tikva candidate "סניף סירקין, פתח תקווה". Reciprocal with greg-5e9f92a0.',
  },
  'greg-5e9f92a0': {
    branchSourceKey: 'https://gregcafe.co.il/branch/%d7%a4%d7%aa%d7%97-%d7%aa%d7%a7%d7%95%d7%95%d7%94/',
    reasoning:
      'Record name "קפה גרג סירקין" names "סירקין" — matches only "סניף סירקין, פתח תקווה", not the other Petah ' +
      'Tikva candidate "סניף הקניון הגדול, פתח תקווה". Reciprocal with greg-0ff39bbb.',
  },
  'greg-291597a1': {
    branchSourceKey: 'https://gregcafe.co.il/branch/%d7%a0%d7%aa%d7%a0%d7%99%d7%94-%d7%94%d7%a9%d7%a8%d7%95%d7%9f/',
    reasoning:
      'Record name "קפה גרג נתניה השרון" names "השרון" — matches only "סניף נתניה השרון, נתניה". The other Netanya ' +
      'candidate, "סניף ohla la by greg, נתניה", is a differently-named sub-brand sharing no token with this record ' +
      'beyond the city itself.',
  },
};
