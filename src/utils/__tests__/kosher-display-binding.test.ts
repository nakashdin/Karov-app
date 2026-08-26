import { classifyKosherState, getKosherLabel, KosherBodyState } from '../kosher';
import { isFoodType, KosherType } from '../../types';
import { he } from '../../i18n/he';
import places from '../../data/generated/places.osm.json';

const strings = he.kosher;

/**
 * Two independent mechanisms binding the kashrut WRITE vocabulary to the
 * DISPLAY vocabulary (Item 4 Unit 3, 2026-08-27 — owner's own question:
 * "are we testing end to end, or is the data racing ahead of the app?").
 * Neither one alone is sufficient — see the header comment on each describe
 * block for what it catches that the other cannot.
 *
 * (1) Compile-time exhaustiveness (see renderBodyState's switch in
 *     ../kosher.ts): a KosherBodyState variant with no display case is a
 *     `tsc --noEmit` failure, not a runtime gap. That check cannot run
 *     inside a jest test — it either compiles or it doesn't — so what THIS
 *     file proves for that mechanism is only that every variant the type
 *     declares is reachable and produces non-null, non-empty text; the
 *     actual exhaustiveness enforcement is `npm run typecheck` itself,
 *     gated in `verify` and CI (.github/workflows/ci.yml).
 *
 * (2) Runtime, derived from the REAL DATASET (not a hand-list): every
 *     distinct kashrut field-combination actually present in
 *     src/data/generated/places.osm.json's food records must classify to
 *     at least one non-empty display part. This is the one that answers
 *     the owner's literal question — it fails the moment a real record's
 *     shape has nothing to show a user, which is exactly what happened
 *     silently for greg's planned claimedLevel writes before this file
 *     existed (no record carried claimedLevel yet, so this test alone
 *     could not have caught that gap — (1) is what closes it, at compile
 *     time, before the data exists).
 */

describe('kosher display binding — (1) every KosherBodyState variant renders', () => {
  // One example of each variant this file's type declares. Not derived
  // (there is nothing to derive a TYPE's cases from at runtime — see
  // ../kosher.ts's renderBodyState comment) — the actual guarantee that a
  // NEW variant cannot be forgotten is the exhaustive `switch` + `tsc`,
  // proven by sabotage below, not by this list being complete on its own.
  const EXAMPLES: { name: string; state: KosherBodyState }[] = [
    { name: 'certifier (registered)', state: { kind: 'certifier', authorityId: 'badatz-beit-yosef' } },
    { name: 'legacyAuthority', state: { kind: 'legacyAuthority', authorityKey: 'tzohar' } },
    { name: 'rabbinateGroup (plain)', state: { kind: 'rabbinateGroup', mehadrin: false } },
    { name: 'rabbinateGroup (mehadrin)', state: { kind: 'rabbinateGroup', mehadrin: true } },
    { name: 'badatzGroup', state: { kind: 'badatzGroup' } },
    { name: 'independentGroup (plain)', state: { kind: 'independentGroup', mehadrin: false } },
    { name: 'independentGroup (mehadrin)', state: { kind: 'independentGroup', mehadrin: true } },
    { name: 'unknownGroupWithLevel', state: { kind: 'unknownGroupWithLevel' } },
    { name: 'unknownFloor', state: { kind: 'unknownFloor' } },
    { name: 'legacyType', state: { kind: 'legacyType', type: 'badatz_beit_yosef' } },
    { name: 'verbatimText', state: { kind: 'verbatimText', text: 'רבנות מקומית' } },
    { name: 'none', state: { kind: 'none' } },
  ];

  it('sanity: EXAMPLES has exactly the 10 distinct KosherBodyState kind tags, in the declared order (rabbinateGroup and independentGroup each appear twice — once per mehadrin boolean — so 12 entries, 10 distinct kinds)', () => {
    // A weak, best-effort check (string literal extraction from the type is
    // not possible at runtime either) — this is the one thing this file CAN
    // verify about its own list without type reflection. The real
    // completeness guarantee is the exhaustive switch + tsc, not this line.
    const kinds = EXAMPLES.map(e => e.state.kind);
    expect(kinds).toEqual([
      'certifier', 'legacyAuthority', 'rabbinateGroup', 'rabbinateGroup',
      'badatzGroup', 'independentGroup', 'independentGroup',
      'unknownGroupWithLevel', 'unknownFloor', 'legacyType', 'verbatimText', 'none',
    ]);
    expect(new Set(kinds).size).toBe(10);
  });

  for (const { name, state } of EXAMPLES) {
    if (state.kind === 'none') {
      it(`${name} renders as an empty part list (deliberately, the only variant allowed to)`, () => {
        const place = classifyStateToPlace(state);
        const parts = getKosherLabel(place, strings);
        expect(parts).toEqual([]);
      });
    } else {
      it(`${name} renders at least one non-empty display part`, () => {
        const place = classifyStateToPlace(state);
        const parts = getKosherLabel(place, strings);
        expect(parts.length).toBeGreaterThan(0);
        for (const part of parts) {
          expect(part.text).toBeTruthy();
        }
      });
    }
  }
});

/** Reverse-engineers a minimal Place fragment that classifies to the given KosherBodyState, for the table-driven tests above. */
function classifyStateToPlace(state: KosherBodyState): Parameters<typeof getKosherLabel>[0] {
  switch (state.kind) {
    case 'certifier':
      return { certifierId: state.authorityId, kosherType: undefined, kosherLevel: undefined, kosherAuthorityGroup: undefined, kosherAuthority: undefined };
    case 'legacyAuthority':
      return { certifierId: undefined, kosherType: undefined, kosherLevel: 'regular', kosherAuthorityGroup: 'independent', kosherAuthority: state.authorityKey };
    case 'rabbinateGroup':
      return { certifierId: undefined, kosherType: undefined, kosherLevel: state.mehadrin ? 'mehadrin' : 'regular', kosherAuthorityGroup: 'rabbinate', kosherAuthority: undefined };
    case 'badatzGroup':
      return { certifierId: undefined, kosherType: undefined, kosherLevel: 'regular', kosherAuthorityGroup: 'badatz', kosherAuthority: undefined };
    case 'independentGroup':
      return { certifierId: undefined, kosherType: undefined, kosherLevel: state.mehadrin ? 'mehadrin' : 'regular', kosherAuthorityGroup: 'independent', kosherAuthority: undefined };
    case 'unknownGroupWithLevel':
      return { certifierId: undefined, kosherType: undefined, kosherLevel: 'mehadrin', kosherAuthorityGroup: 'unknown', kosherAuthority: undefined };
    case 'unknownFloor':
      return { certifierId: undefined, kosherType: undefined, kosherLevel: null, kosherAuthorityGroup: 'unknown', kosherAuthority: undefined };
    case 'legacyType':
      return { certifierId: undefined, kosherType: state.type, kosherLevel: undefined, kosherAuthorityGroup: undefined, kosherAuthority: undefined };
    case 'verbatimText':
      return { certifierId: undefined, kosherType: undefined, kosherLevel: undefined, kosherAuthorityGroup: undefined, kosherAuthority: undefined, certifiedBy: state.text };
    case 'none':
      return { certifierId: undefined, kosherType: undefined, kosherLevel: undefined, kosherAuthorityGroup: undefined, kosherAuthority: undefined };
  }
}

/**
 * (2) Runtime, dataset-derived: every distinct kashrut field-combination
 * ACTUALLY PRESENT in the real dataset's food records must classify to a
 * non-empty display. Ground truth, not a hand-list — a shape only enters
 * this test's coverage by existing in real data. This is the direct
 * executable form of the owner's question: is there a record on disk today
 * that the UI cannot render?
 */
describe('kosher display binding — (2) every real dataset shape renders', () => {
  type RawPlace = {
    id: string;
    type: string;
    kosherType?: KosherType;
    kosherLevel?: 'regular' | 'mehadrin' | null;
    kosherAuthorityGroup?: 'rabbinate' | 'badatz' | 'independent' | 'unknown';
    kosherAuthority?: string;
    certifierId?: string | null;
    claimedLevel?: 'mehadrin' | 'glatt' | null;
    claimedLevelText?: string;
    certifiedBy?: string;
  };

  const food = (places as RawPlace[]).filter(p => isFoodType(p.type));

  function shapeKey(p: RawPlace): string {
    return JSON.stringify({
      kosherType: p.kosherType ?? null,
      kosherLevel: 'kosherLevel' in p ? p.kosherLevel ?? null : undefined,
      kosherAuthorityGroup: p.kosherAuthorityGroup ?? null,
      kosherAuthority: p.kosherAuthority ?? null,
      certifierId: 'certifierId' in p ? p.certifierId ?? null : undefined,
      claimedLevel: 'claimedLevel' in p ? p.claimedLevel ?? null : undefined,
      // certifiedBy is now load-bearing for classification (verbatimText
      // fallback, Item 4 Unit 3 follow-up) — omitting it from the shape key
      // is exactly the bug this file's own header comment already documents
      // once (representative-per-group vs per-record); grouping by its
      // PRESENCE, not its exact text, keeps the shape count meaningful
      // (2213 distinct certifiedBy strings would otherwise mean ~2213
      // "shapes", defeating the point of shape-based dedup) while still
      // routing every certifiedBy-bearing record through a shape whose
      // stored example actually has one.
      hasCertifiedBy: Boolean(p.certifiedBy),
    });
  }

  const shapesByKey = new Map<string, { example: RawPlace; count: number }>();
  for (const p of food) {
    const key = shapeKey(p);
    const existing = shapesByKey.get(key);
    if (existing) existing.count++;
    else shapesByKey.set(key, { example: p, count: 1 });
  }

  it('sanity: actually ran over the real dataset, not an empty array', () => {
    expect(food.length).toBeGreaterThan(2000);
    expect(shapesByKey.size).toBeGreaterThan(5);
  });

  it('reports the shape census (informational — always passes; read the console output)', () => {
    console.log(`kosher display binding: ${shapesByKey.size} distinct kashrut shapes across ${food.length} food records`);
    expect(shapesByKey.size).toBeGreaterThan(0);
  });

  it('every distinct real shape either renders, or is the KNOWN "none" shape with zero classifiable fields — any OTHER empty-render shape is a new, un-reported binding gap and fails this test by name', () => {
    // 'none' is the one variant part (1) allows to render empty — a record
    // with genuinely nothing in kosherType/kosherLevel/kosherAuthorityGroup/
    // kosherAuthority/certifierId/claimedLevel has nothing to classify.
    // Anything else rendering empty is a real gap: a shape classifyKosherState
    // resolves to a non-'none' variant whose renderer still produced nothing,
    // which should be structurally impossible given the exhaustive switch —
    // if this ever fires, renderBodyState itself has a bug, not the data.
    const failures: { key: string; count: number; exampleId: string; bodyKind: string }[] = [];
    for (const [key, { example, count }] of shapesByKey) {
      const { body } = classifyKosherState(example);
      const parts = getKosherLabel(example, strings);
      const emptyRender = parts.length === 0 || parts.some(p => !p.text);
      if (emptyRender && body.kind !== 'none') {
        failures.push({ key, count, exampleId: example.id, bodyKind: body.kind });
      }
    }
    expect(failures).toEqual([]);
  });

  // Originally reported, not fixed: of the 85 'none' records, 67 carried
  // real evidence in `certifiedBy` (verbatim certifier text) that
  // classifyKosherState's input Pick<> didn't even include — getKosherLabel
  // never looked at certifiedBy at all. Only 18 were genuinely evidence-free
  // (all manual-winery-*). Owner ruling (2026-08-27): display certifiedBy
  // verbatim in the same slot as the floor when nothing else resolves — no
  // group inferred, no certifierId implied, just the source's own text
  // (classifyKosherState's 'verbatimText' variant). This test now expects
  // noneCount to have dropped from 85 to 18 — a regression back toward 85
  // means the verbatimText fallback broke.
  it('the verbatimText fallback moved kind=none from 85 to 18, and every remaining none is a manual-winery-* record (genuinely evidence-free — untouched per the owner\'s separate ruling on that population)', () => {
    // Deliberately iterates every REAL record here, not the deduplicated
    // shapesByKey map used above — a per-record property (certifiedBy
    // presence) aggregated off one representative `example` per shape
    // previously mixed counts across records that actually differ (caught
    // live: an earlier version of this test reported 85/85 "carry
    // certifiedBy", which was wrong — 67/85).
    const noneRecords: RawPlace[] = [];
    let unknownFloorCount = 0;
    let verbatimTextCount = 0;
    for (const p of food) {
      const { body } = classifyKosherState(p);
      if (body.kind === 'none') noneRecords.push(p);
      if (body.kind === 'unknownFloor') unknownFloorCount++;
      if (body.kind === 'verbatimText') verbatimTextCount++;
    }
    console.log(
      `kosher display binding: ${noneRecords.length} food records render NO kashrut label at all (body.kind 'none'); ` +
      `${verbatimTextCount} render source certifiedBy text verbatim (body.kind 'verbatimText'); ` +
      `${unknownFloorCount} render the unknown-floor label (body.kind 'unknownFloor')`,
    );
    // No real record should carry certifiedBy AND still classify as 'none' —
    // that would mean the verbatimText fallback isn't actually firing.
    expect(noneRecords.filter(p => p.certifiedBy)).toEqual([]);
    expect(noneRecords.length).toBe(18);
    expect(noneRecords.every(p => p.id.startsWith('manual-winery-'))).toBe(true);
  });
});
