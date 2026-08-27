import type { Tokens } from '../theme';
import type { Strings } from '../i18n';
import { KosherCategory, KosherType, Place } from '../types';
import { getKashrutAuthority } from '../data/kashrut/authorities';

/** Hebrew label for a food category. */
export const categoryLabel: Record<KosherCategory, string> = {
  meat: 'בשרי',
  dairy: 'חלבי',
  parve: 'פרווה',
};

/**
 * Accent colour for a food category, under a given colour scheme.
 *
 * A function rather than a constant: a module-scope map would freeze the light
 * values at import time and never follow the theme.
 */
export const categoryColorFor = (theme: Tokens): Record<KosherCategory, string> => ({
  meat: theme.meat,
  dairy: theme.dairy,
  parve: theme.parve,
});

/** Hebrew label for a kosher certification type. Module-private: consume it
 *  through `getKosherLabel`, which decides — nothing else may render it directly. */
const kosherTypeLabel: Record<KosherType, string> = {
  badatz_beit_yosef: 'בד״ץ בית יוסף',
  badatz_edah: 'בד״ץ העדה החרדית',
  badatz_rubin: 'בד״ץ הרב רובין',
  badatz_kehilot: 'בד״ץ קהילות',
  rav_landa: 'הרב לנדא',
  rav_machpud: 'הרב מחפוד',
  chatam_sofer: 'חוג חתם סופר',
  tzohar: 'צהר',
  kosher: 'כשר',
  rabanut: 'רבנות',
  rabanut_beit_shean: 'רבנות בית שאן',
  rabanut_mehadrin: 'רבנות מהדרין',
  rabanut_mehadrin_jerusalem: 'רבנות מהדרין ירושלים',
  rabanut_mekomi: 'רבנות מקומי',
  rabanut_afula: 'רבנות עפולה',
  rabanut_tel_aviv: 'רבנות תל אביב',
  mehadrin: 'מהדרין',
  other: 'אחר',
};

/** All category keys in display order. */
export const ALL_CATEGORIES: KosherCategory[] = ['meat', 'dairy', 'parve'];

/**
 * Groups of raw kosherType values that map to a single filter chip.
 * Key = the KosherType stored in PlaceFilters.kosherType when the chip is selected.
 * Value = all raw data values that match that chip.
 */
export const KOSHER_GROUP_MEMBERS: Partial<Record<KosherType, KosherType[]>> = {
  rabanut: ['rabanut', 'rabanut_mekomi', 'rabanut_beit_shean', 'rabanut_afula', 'rabanut_tel_aviv', 'kosher'],
  rabanut_mehadrin: ['rabanut_mehadrin', 'rabanut_mehadrin_jerusalem'],
  badatz_edah: ['badatz_edah', 'badatz_beit_yosef', 'badatz_rubin', 'badatz_kehilot'],
};

/** Display label override for grouped filter chips (replaces kosherTypeLabel for the group key). */
export const KOSHER_GROUP_LABEL: Partial<Record<KosherType, string>> = {
  rabanut: 'רבנות',
  rabanut_mehadrin: 'רבנות מהדרין',
  badatz_edah: 'בד״ץ',
};

/** Labels for the kosher-body filter chips (group keys + specific authority keys). */
export const KOSHER_BODY_LABEL: Record<string, string> = {
  rabbinate:               'רבנות',
  badatz_beit_yosef:       'בד״ץ בית יוסף',
  badatz_edah_hachareidis: 'בד״ץ העדה החרדית',
  yoreh_deah_mahfoud:      'הרב מחפוד',
  chatam_sofer:            'חוג חתם סופר',
  badatz_kehilot:          'קהילות',
  badatz_rubin:            'הרב רובין',
  tzohar:                  'צהר',
  unknown:                 'גוף כשרות לא ידוע',
};

/** Which group key represents a raw kosherType (reverse lookup). */
export const RAW_TO_GROUP: Partial<Record<KosherType, KosherType>> = Object.fromEntries(
  (Object.entries(KOSHER_GROUP_MEMBERS) as [KosherType, KosherType[]][])
    .flatMap(([group, members]) => members.map(m => [m, group]))
);

/**
 * Given the full set of raw kosherTypes present in the data, return the
 * deduplicated list of filter-chip keys (groups + ungrouped) in display order.
 */
export function groupedKosherTypes(rawTypes: Set<KosherType>): KosherType[] {
  const seen = new Set<KosherType>();
  const result: KosherType[] = [];

  const ORDER: KosherType[] = [
    'badatz_edah', 'rabanut_mehadrin', 'rabanut',
    'rav_landa', 'rav_machpud', 'chatam_sofer', 'tzohar', 'mehadrin', 'other',
  ];

  for (const key of ORDER) {
    const members = KOSHER_GROUP_MEMBERS[key];
    if (members) {
      if (members.some(m => rawTypes.has(m)) && !seen.has(key)) {
        seen.add(key);
        result.push(key);
      }
    } else {
      if (rawTypes.has(key) && !seen.has(key)) {
        seen.add(key);
        result.push(key);
      }
    }
  }
  return result;
}

/**
 * The legacy hard-coded map from `kosherAuthority` (underscore namespace) to
 * a display name — kept, NOT deleted, even though `certifierId`/the
 * registry (hyphen namespace) is the current, correct path. `kosherAuthority`
 * and `certifierId` are known NOT to be a safe string transform of each
 * other (see docs/KASHRUT_FACTS.md), so this map is currently the ONLY thing
 * rendering a name for the 519 records that carry `kosherAuthority` but no
 * resolved `certifierId` — load-bearing duplication, in tension with
 * authorities.ts's "nothing else may hard-code a certifier name" invariant,
 * logged there as a known gap rather than silently carried.
 */
const LEGACY_AUTHORITY_LABEL: Record<string, string> = {
  rabbinate_tel_aviv:      'רבנות תל אביב',
  rabbinate_jerusalem:     'רבנות ירושלים מהדרין',
  badatz_beit_yosef:       'בד״ץ בית יוסף',
  badatz_edah_hachareidis: 'בד״ץ העדה החרדית',
  yoreh_deah_mahfoud:      'הרב מחפוד',
  chatam_sofer:            'חוג חתם סופר',
  badatz_kehilot:          'קהילות',
  badatz_rubin:            'הרב רובין',
  tzohar:                  'צהר',
};

/**
 * The BODY/GROUP half of what a record states about its kashrut — a
 * discriminated union, not a string, so a new variant with no display case
 * is a `tsc` failure (see `renderKosherState`'s exhaustive switch below),
 * never a silent runtime fallback. Deliberately separate from the LEVEL
 * claim (`KosherClaimState`) — Item 4 Unit 3, owner ruling verbatim "לא, הם
 * כשרויות שונות": a certifying body and a level word are different kashrut
 * claims, never merged into one variant or one phrase.
 */
export type KosherBodyState =
  | { kind: 'certifier'; authorityId: string }
  | { kind: 'legacyAuthority'; authorityKey: string }
  | { kind: 'rabbinateGroup'; mehadrin: boolean }
  | { kind: 'badatzGroup' }
  | { kind: 'independentGroup'; mehadrin: boolean }
  | { kind: 'unknownGroupWithLevel' }
  | { kind: 'unknownFloor' }
  | { kind: 'legacyType'; type: KosherType }
  | { kind: 'verbatimText'; text: string }
  | { kind: 'none' };

/** The LEVEL half — a source-stated claim, independent of whether a body was also named. */
export type KosherClaimState =
  | { kind: 'claim'; level: 'mehadrin' | 'glatt' }
  | { kind: 'noClaim' };

/**
 * Classifies a place's raw kashrut fields into the body/claim state pair —
 * pure data-in, data-out, no strings. `renderKosherState` turns this into
 * display text; keeping classification separate from rendering is what lets
 * the exhaustiveness check work on the classification alone.
 *
 * Precedence within the body axis: `certifierId` (the registry — a
 * specific, resolved body) wins over everything below it. `certifierId ===
 * null` ("level known, body not identified") and `certifierId` absent
 * (never resolved) MUST fall through to the exact same variant — they are
 * indistinguishable to a user and must be indistinguishable here. Do not
 * special-case null; a null-specific branch is one careless edit away from
 * blanking every unresolved-body record at once.
 */
export function classifyKosherState(
  place: Pick<Place, 'kosherType' | 'kosherLevel' | 'kosherAuthorityGroup' | 'kosherAuthority' | 'certifierId' | 'claimedLevel' | 'certifiedBy'>,
): { body: KosherBodyState; claim: KosherClaimState } {
  const claim: KosherClaimState = place.claimedLevel != null
    ? { kind: 'claim', level: place.claimedLevel }
    : { kind: 'noClaim' };

  if (place.certifierId != null) {
    const authority = getKashrutAuthority(place.certifierId);
    if (authority) return { body: { kind: 'certifier', authorityId: place.certifierId }, claim };
  }

  const { kosherLevel, kosherAuthorityGroup, kosherAuthority } = place;

  // Use structured fields when available. `kosherLevel !== undefined` (not a
  // truthiness check) is deliberate: kosherLevel: null is a meaningful,
  // deliberately-undetermined state (Batch B1), and treating it as falsy
  // would fall through to the legacy `kosherType` variant below —
  // resurrecting the exact fabricated-level claim the null was recording as
  // withheld.
  if (kosherAuthorityGroup || kosherLevel !== undefined) {
    if (kosherAuthority && LEGACY_AUTHORITY_LABEL[kosherAuthority]) {
      return { body: { kind: 'legacyAuthority', authorityKey: kosherAuthority }, claim };
    }
    if (kosherAuthorityGroup === 'rabbinate') {
      return { body: { kind: 'rabbinateGroup', mehadrin: kosherLevel === 'mehadrin' }, claim };
    }
    if (kosherAuthorityGroup === 'badatz') {
      return { body: { kind: 'badatzGroup' }, claim };
    }
    if (kosherAuthorityGroup === 'independent') {
      return { body: { kind: 'independentGroup', mehadrin: kosherLevel === 'mehadrin' }, claim };
    }
    // unknown group
    if (kosherLevel === 'mehadrin') {
      return { body: { kind: 'unknownGroupWithLevel' }, claim };
    }
    return { body: { kind: 'unknownFloor' }, claim };
  }

  // Legacy fallback
  if (place.kosherType) {
    return { body: { kind: 'legacyType', type: place.kosherType }, claim };
  }
  // Owner ruling, verbatim (2026-08-27): when NOTHING else resolved, the
  // source's own certifiedBy text is still the record's own statement about
  // itself — strictly better than nothing, and never invented by us. This is
  // NOT a resolved certifier: no group is inferred, no certifierId is
  // implied. Some of this population is a generic term (e.g. "רבנות מקומית",
  // "כשרות מקומית") that happens to already BE the exact floor phrasing the
  // owner ruled for the unknown case ("אם לא ידוע יש להציג כשר כשרות
  // מקומית") — displaying it verbatim is not a misrepresentation there,
  // it's the ruling arriving from the record's own text instead of our
  // fallback string. Some of it names a real body ("בד\"ץ יורה דעה") that
  // this function has no way to resolve without the registry's alias table
  // (scripts/reports/kashrut-registry.json, outside src/ — see
  // authority-normalize.mjs, which cannot be imported here; jest's roots
  // and Metro's bundle both stop at src/). Resolving those properly, so
  // they get a real certifierId/kosherAuthorityGroup instead of just
  // verbatim text, is a separate, smaller, data-layer fix (Item 4 Unit 3
  // follow-up) — this variant is deliberately the FLOOR for that population,
  // not a substitute for actually resolving it.
  if (place.certifiedBy) {
    return { body: { kind: 'verbatimText', text: place.certifiedBy }, claim };
  }
  return { body: { kind: 'none' }, claim };
}

/**
 * One piece of displayable kashrut text, tagged with what KIND of statement
 * it is — a body/group fact (`data`) versus an unverified level claim
 * (`claim`) — so a caller can style/order them, or render them as separate
 * chips, but can never accidentally concatenate a certifying body and a
 * level claim into one phrase that reads as a single certification (owner
 * ruling: they are different kashruts).
 */
export interface KosherLabelPart {
  kind: 'data' | 'claim';
  text: string;
}

/**
 * Renders a `KosherBodyState` to display text. The `switch` has NO
 * `default` and assigns the narrowed-to-`never` remainder to `_exhaustive`
 * — adding a body variant with no case here is a `tsc --noEmit` failure
 * (`npm run typecheck`, gated in `verify` and CI), not a silent runtime
 * fallback. Body names (`certifier`/`legacyAuthority`) are DATA from the
 * registry/legacy map, never i18n copy — see LEGACY_AUTHORITY_LABEL's
 * header and authorities.ts's own invariant. Every other variant is
 * descriptive copy, read from `strings.kosher`.
 */
function renderBodyState(state: KosherBodyState, strings: Strings['kosher']): string | null {
  switch (state.kind) {
    case 'certifier': {
      const authority = getKashrutAuthority(state.authorityId);
      return authority ? authority.nameHe : null;
    }
    case 'legacyAuthority':
      return LEGACY_AUTHORITY_LABEL[state.authorityKey] ?? null;
    case 'rabbinateGroup':
      return state.mehadrin ? strings.rabbinateMehadrin : strings.rabbinate;
    case 'badatzGroup':
      return strings.badatzGeneric;
    case 'independentGroup':
      return state.mehadrin ? strings.mehadrinGeneric : strings.kosherGeneric;
    case 'unknownGroupWithLevel':
      return strings.mehadrinGeneric;
    case 'unknownFloor':
      return strings.unknownFloor;
    case 'legacyType':
      return kosherTypeLabel[state.type] ?? null;
    case 'verbatimText':
      // Owner ruling: source text, displayed as source text — same slot as
      // the floor (no group inferred, no certifierId implied), never styled
      // or treated as a resolved certifier. See classifyKosherState's
      // header comment on this variant for the full reasoning.
      return state.text;
    case 'none':
      return null;
    default: {
      const _exhaustive: never = state;
      throw new Error(`renderBodyState: unhandled KosherBodyState variant ${JSON.stringify(_exhaustive)}`);
    }
  }
}

/**
 * Human-readable kashrut label parts for a place — the single function that
 * decides what kashrut text a user sees, anywhere in the app. Returns an
 * ORDERED LIST, not one string: a named body and a level claim are
 * independent statements (owner ruling) and must never be concatenated into
 * a phrase that reads as one certification. Callers that only want the
 * primary line (chip UIs with one slot) take `parts[0]`; callers with room
 * for multiple lines (PlaceDetailScreen's chip list) render every part.
 *
 * `strings` must be the caller's OWN locale (`useLanguage().t.kosher`) —
 * this function does not call the hook itself (it isn't one; it's called
 * from plain helpers as well as components), so the caller threads it
 * through. Never import the static `t` from `src/i18n` here — that binds
 * every caller to Hebrew regardless of the selected locale (see
 * PlaceBottomCard's fix in the same change that introduced this doc note).
 */
export function getKosherLabel(
  place: Pick<Place, 'kosherType' | 'kosherLevel' | 'kosherAuthorityGroup' | 'kosherAuthority' | 'certifierId' | 'claimedLevel' | 'claimedLevelText' | 'certifiedBy'>,
  strings: Strings['kosher'],
): KosherLabelPart[] {
  const { body, claim } = classifyKosherState(place);
  const parts: KosherLabelPart[] = [];

  const bodyText = renderBodyState(body, strings);
  if (bodyText) parts.push({ kind: 'data', text: bodyText });

  if (claim.kind === 'claim') {
    // claimedLevelText (the source's verbatim wording) is preferred when
    // present — it is the actual evidence; the derived `claim.level` enum
    // is a fallback for callers that never populated the text field
    // (validate-data.mjs HARD-fails claimedLevel set without it, so this
    // branch is unreachable against real data — kept only so the function
    // stays total against its declared input type, not partial on an
    // invariant enforced elsewhere).
    const claimText = place.claimedLevelText || (claim.level === 'glatt' ? strings.glattGeneric : strings.mehadrinGeneric);
    parts.push({ kind: 'claim', text: `${strings.claimedLevelPrefix} ${claimText}` });
  }

  return parts;
}

/** Convenience for callers with a single display slot (chip UIs) — the primary line only, never the claim alone. */
export function getPrimaryKosherLabel(
  place: Pick<Place, 'kosherType' | 'kosherLevel' | 'kosherAuthorityGroup' | 'kosherAuthority' | 'certifierId' | 'claimedLevel' | 'claimedLevelText' | 'certifiedBy'>,
  strings: Strings['kosher'],
): string | null {
  const parts = getKosherLabel(place, strings);
  return parts.length > 0 ? parts[0].text : null;
}

/** Kosher-type keys shown in the restaurant kashruyot filter screen (display order). */
export const KASHRUYOT_FILTER_TYPES: KosherType[] = [
  'badatz_beit_yosef',
  'badatz_edah',
  'badatz_rubin',
  'badatz_kehilot',
  'rav_landa',
  'rav_machpud',
  'chatam_sofer',
  'kosher',
  'rabanut',
  'rabanut_beit_shean',
  'rabanut_mehadrin',
  'rabanut_mehadrin_jerusalem',
  'rabanut_mekomi',
  'rabanut_afula',
  'rabanut_tel_aviv',
  'tzohar',
];

/** All kosher-type keys in display order. */
export const ALL_KOSHER_TYPES: KosherType[] = [
  ...KASHRUYOT_FILTER_TYPES,
  'mehadrin',
  'other',
];
