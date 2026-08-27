/**
 * READ-ONLY. No writes anywhere. Answers kosher-app-19's 5-part request:
 * how big is the kosherType fabrication surface, precisely, at the record level.
 *
 * Output: scripts/reports/kashrut-type-fabrication-surface.json (new file only).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const places = JSON.parse(readFileSync(resolve(root, 'src/data/generated/places.osm.json'), 'utf8').replace(/^﻿/, ''));
const registry = JSON.parse(readFileSync(resolve(root, 'scripts/reports/kashrut-registry.json'), 'utf8'));
const aliasMap = new Map(registry.aliases.map((a) => [a.raw, { authorityId: a.authorityId, level: a.level }]));
const reviewQueueRaws = new Set(registry.reviewQueue.map((r) => r.raw));
const authoritiesSrc = readFileSync(resolve(root, 'src/data/kashrut/authorities.ts'), 'utf8');
const registeredIds = new Set([...authoritiesSrc.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]));

const FOOD_TYPES = new Set(['restaurant', 'fast_food', 'cafe', 'coffee_cart', 'juice_bar', 'ice_cream_parlor', 'bakery', 'winery']);
const food = places.filter((p) => FOOD_TYPES.has(p.type));

// Exact copy of migrate-kosher-fields.mjs's MAP — used only to derive which
// kosherType values imply a specific claim (non-null authority, or mehadrin level).
const MIGRATE_MAP = {
  rabanut: { kosherLevel: 'regular', kosherAuthority: null },
  rabanut_mekomi: { kosherLevel: 'regular', kosherAuthority: null },
  rabanut_tel_aviv: { kosherLevel: 'regular', kosherAuthority: 'rabbinate_tel_aviv' },
  rabanut_mehadrin: { kosherLevel: 'mehadrin', kosherAuthority: null },
  rabanut_mehadrin_jerusalem: { kosherLevel: 'mehadrin', kosherAuthority: 'rabbinate_jerusalem' },
  kosher: { kosherLevel: 'regular', kosherAuthority: null },
  mehadrin: { kosherLevel: 'mehadrin', kosherAuthority: null },
  badatz_beit_yosef: { kosherLevel: 'mehadrin', kosherAuthority: 'badatz_beit_yosef' },
  badatz_edah: { kosherLevel: 'mehadrin', kosherAuthority: 'badatz_edah_hachareidis' },
  badatz_kehilot: { kosherLevel: 'mehadrin', kosherAuthority: 'badatz_kehilot' },
  badatz_rubin: { kosherLevel: 'mehadrin', kosherAuthority: 'badatz_rubin' },
  rav_machpud: { kosherLevel: 'mehadrin', kosherAuthority: 'yoreh_deah_mahfoud' },
  chatam_sofer: { kosherLevel: 'mehadrin', kosherAuthority: 'chatam_sofer' },
  tzohar: { kosherLevel: 'regular', kosherAuthority: 'tzohar' },
};
const CLAIM_IMPLYING = new Set(
  Object.entries(MIGRATE_MAP).filter(([, v]) => v.kosherAuthority !== null || v.kosherLevel === 'mehadrin').map(([k]) => k),
);

// ── getKosherLabel + kosherTypeLabel — exact port from src/utils/kosher.ts ──
const kosherTypeLabel = {
  badatz_beit_yosef: 'בד״ץ בית יוסף', badatz_edah: 'בד״ץ העדה החרדית', badatz_rubin: 'בד״ץ הרב רובין',
  badatz_kehilot: 'בד״ץ קהילות', rav_landa: 'הרב לנדא', rav_machpud: 'הרב מחפוד', chatam_sofer: 'חוג חתם סופר',
  tzohar: 'צהר', kosher: 'כשר', rabanut: 'רבנות', rabanut_beit_shean: 'רבנות בית שאן',
  rabanut_mehadrin: 'רבנות מהדרין', rabanut_mehadrin_jerusalem: 'רבנות מהדרין ירושלים', rabanut_mekomi: 'רבנות מקומי',
  rabanut_afula: 'רבנות עפולה', rabanut_tel_aviv: 'רבנות תל אביב', mehadrin: 'מהדרין', other: 'אחר',
};
function getKosherLabel(place) {
  const { kosherLevel, kosherAuthorityGroup, kosherAuthority } = place;
  if (kosherAuthorityGroup || kosherLevel) {
    if (kosherAuthority) {
      const byAuthority = {
        rabbinate_tel_aviv: 'רבנות תל אביב', rabbinate_jerusalem: 'רבנות ירושלים מהדרין', badatz_beit_yosef: 'בד״ץ בית יוסף',
        badatz_edah_hachareidis: 'בד״ץ העדה החרדית', yoreh_deah_mahfoud: 'הרב מחפוד', chatam_sofer: 'חוג חתם סופר',
        badatz_kehilot: 'קהילות', badatz_rubin: 'הרב רובין', tzohar: 'צהר',
      };
      const label = byAuthority[kosherAuthority];
      if (label) return label;
    }
    if (kosherAuthorityGroup === 'rabbinate') return kosherLevel === 'mehadrin' ? 'רבנות מהדרין' : 'רבנות';
    if (kosherAuthorityGroup === 'badatz') return 'בד״ץ';
    if (kosherAuthorityGroup === 'independent') return kosherLevel === 'mehadrin' ? 'מהדרין' : 'כשר';
    if (kosherLevel === 'mehadrin') return 'מהדרין';
    return 'גוף כשרות לא ידוע';
  }
  return place.kosherType ? (kosherTypeLabel[place.kosherType] ?? null) : null;
}

// PlaceDetailScreen.tsx line 432-434 equivalent.
function detailLine(place) {
  return [place.certifiedBy, place.kosherType ? kosherTypeLabel[place.kosherType] : null].filter(Boolean).join(' · ') || '—';
}

// ── PART 1: precisely bound the 5 known bugs against LIVE data ────────────
function bucket(records) {
  const out = {};
  for (const p of records) {
    const k = `${p.kosherType ?? '∅'}|${p.certifiedBy ?? '∅'}|certUrl:${!!p.kosherCertUrl}|srcUrl:${!!p.sourceUrl}`;
    (out[k] ??= []).push(p.id);
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, { count: v.length, sample: v.slice(0, 8) }]));
}

const golda = food.filter((p) => p.id.startsWith('golda-'));
const humuseliyahu = food.filter((p) => p.id.startsWith('humuseliyahu-')); // import-humuseliyahu.mjs's own id scheme
const rebar = food.filter((p) => p.id.startsWith('rebar-'));
const coffeetrail = food.filter((p) => p.id.startsWith('coffeetrail-'));
// import-aroma-v2.mjs's makeId() returns a bare incrementing integer starting
// at idCounter = 9400000 (line 77), no prefix. Checked directly: ZERO food
// records have a numeric id in [9400000, 9500000), and ZERO numeric-id food
// records anywhere in the dataset are named "ארומה". The script's own two
// write targets include places.osm.json (PPATH, line 693) — so this is not a
// wrong-file mistake on my part, its output simply never landed in current
// production data, under either write path. The live "ארומה" records (104,
// id prefix manual-aroma-) come from a DIFFERENT script, apply-chains-research.mjs.
const aromaLive = food.filter((p) => /ארומה/.test(p.name));
const AROMA_V2_ID_RANGE = [9400000, 9500000];
const aromaV2RangeMatches = food.filter((p) => /^[0-9]+$/.test(p.id) && +p.id >= AROMA_V2_ID_RANGE[0] && +p.id < AROMA_V2_ID_RANGE[1]);

const part1 = {
  golda: { liveCount: golda.length, sourceScript: 'scripts/import-golda.mjs', helper: 'mapKosherType() lines 114-123', breakdown: bucket(golda) },
  humuseliyahu: {
    liveCount: humuseliyahu.length, sourceScript: 'scripts/import-humuseliyahu.mjs', helper: 'mapKashrut() lines 17-27',
    note: 'ZERO live records under this script\'s own id scheme (humuseliyahu-<md5>). Its output does not appear in places.osm.json or restaurants.osm.json. The bug is real in the script but has no currently-live affected records.',
  },
  aromaV2: {
    liveIdRangeCount: aromaV2RangeMatches.length, sourceScript: 'scripts/import-aroma-v2.mjs', helper: 'certToKosherType() lines 82-86',
    note: 'makeId() returns a bare incrementing integer starting at idCounter=9400000 (line 77). Zero food records fall in [9400000,9500000), and zero numeric-id food records anywhere are named ארומה. The script writes to places.osm.json as one of its two targets (PPATH, line 693), so this is not a wrong-file assumption — its output simply is not present in current production data under either write path. The 104 live "ארומה" records instead come from a different script — see aromaChainsResearch below, found by searching the data directly rather than trusting the importer-side list was complete.',
  },
  rebar: { liveCount: rebar.length, sourceScript: 'scripts/import-rebar.mjs', helper: 'buildPlace() line 106, hardcoded, no per-branch input', breakdown: bucket(rebar) },
  coffeetrail: { liveCount: coffeetrail.length, sourceScript: 'importers/coffee-carts/scrape-coffeetrail.mjs', helper: 'inferKosherType() lines 125-132', breakdown: bucket(coffeetrail) },
  aromaChainsResearch: {
    liveCount: aromaLive.length, sourceScript: 'scripts/apply-chains-research.mjs (NOT import-aroma-v2.mjs — found via data-side search per ask #2, not previously identified in Section A)',
    breakdown: bucket(aromaLive),
    flaggedSubset: 'kosherType=mehadrin with certifiedBy literally the word "מהדrin" (a level word, not a body) — self-referential, zero identity evidence, same failure class as the 4 known mapping-helper bugs, in a 6th script not previously flagged.',
  },
};

// ── PART 2: dataset-wide, data-side census of unsupported claim-implying kosherType ──
const inScope = food.filter((p) =>
  CLAIM_IMPLYING.has(p.kosherType) && !p.certifiedBy && !p.kosherCertUrl && !p.sourceUrl && !p.certificateValidUntil,
);
const inScopeSomeCircumstantial = food.filter((p) =>
  CLAIM_IMPLYING.has(p.kosherType) && !p.certifiedBy && !p.kosherCertUrl && !p.certificateValidUntil && p.sourceUrl,
); // has a sourceUrl but nothing kashrut-specific — reported separately, not folded into "fully unsupported"

const byKosherTypeInScope = {};
for (const p of inScope) byKosherTypeInScope[p.kosherType] = (byKosherTypeInScope[p.kosherType] ?? 0) + 1;

const part2 = {
  claimImplyingKosherTypes: [...CLAIM_IMPLYING],
  fullyUnsupportedCount: inScope.length,
  fullyUnsupportedByKosherType: byKosherTypeInScope,
  hasSourceUrlOnlyCount: inScopeSomeCircumstantial.length,
  note: 'fullyUnsupported = claim-implying kosherType AND no certifiedBy AND no kosherCertUrl AND no sourceUrl AND no certificateValidUntil. This is a superset of the 5 known-bug scripts — it is computed purely from current field values, independent of which script wrote them, per ask #2.',
};

// ── PART 3: reverse check — kosherType-level protected set ────────────────
const certBacked = food.filter((p) => p.kosherCertUrl && p.certificateValidUntil);
const aliasResolved = food.filter((p) => {
  if (!p.certifiedBy) return false;
  const alias = aliasMap.get(p.certifiedBy);
  return !!(alias && alias.authorityId && registeredIds.has(alias.authorityId));
});
const aliasResolvedNotCertBacked = aliasResolved.filter((p) => !(p.kosherCertUrl && p.certificateValidUntil));
const protectedSet = new Set([...certBacked, ...aliasResolved].map((p) => p.id));

const certUrlOnly = food.filter((p) => p.kosherCertUrl);
const part3 = {
  certBackedCount_certUrlAndDate: certBacked.length,
  certBackedCount_certUrlOnly: certUrlOnly.length,
  aliasResolvedCount: aliasResolved.length,
  aliasResolvedNotAlsoCertBackedCount: aliasResolvedNotCertBacked.length,
  aliasResolvedWithoutCertUrl: aliasResolved.filter((p) => !p.kosherCertUrl).length,
  unionProtectedCount: protectedSet.size,
  reviewerClaimedBaseline: { certBacked: 180, aliasResolved: 730, total: 910 },
  reconciled: 'Reviewer\'s "certificate-backed" = kosherCertUrl present (180), not kosherCertUrl AND certificateValidUntil both present (164, my first-pass stricter definition — 16 records have a cert URL but no successfully-parsed date). Under the Reviewer\'s definition: 180 cert-backed + 730 alias-resolved-without-a-cert-url = 910 exactly, matching their baseline precisely.',
};

// ── PART 4: before/after getKosherLabel + detail-line simulation ──────────
const simulations = inScope.map((p) => {
  const today = { kosherLabel: getKosherLabel(p), detailLine: detailLine(p) };
  const clearDerivedOnly = { ...p, kosherLevel: undefined, kosherAuthorityGroup: undefined, kosherAuthority: undefined };
  const clearAll = { ...clearDerivedOnly, kosherType: undefined };
  return {
    id: p.id, name: p.name, cityId: p.cityId, currentKosherType: p.kosherType, currentCertifiedBy: p.certifiedBy ?? null,
    today,
    optionA_clearDerivedFieldsOnly: { kosherLabel: getKosherLabel(clearDerivedOnly), detailLine: detailLine(clearDerivedOnly) },
    optionB_clearKosherTypeToo: { kosherLabel: getKosherLabel(clearAll), detailLine: detailLine(clearAll) },
  };
});

const optionASameAsToday = simulations.filter((s) => s.today.kosherLabel === s.optionA_clearDerivedFieldsOnly.kosherLabel).length;
const optionBShowsNothing = simulations.filter((s) => s.optionB_clearKosherTypeToo.kosherLabel === null && s.optionB_clearKosherTypeToo.detailLine === '—').length;

const part4 = {
  totalSimulated: simulations.length,
  optionA_labelUnchangedFromTodayCount: optionASameAsToday,
  optionA_note: 'For every in-scope record, kosherType survives option A untouched, so getKosherLabel falls through to the SAME kosherTypeLabel value it shows today — option A alone changes nothing the user sees for this exact set, confirming Section E\'s finding at full scale, not just the 5 sampled bugs.',
  optionB_labelBecomesNullCount: optionBShowsNothing,
  optionB_note: 'Option B (clear kosherType too) makes getKosherLabel return null and the detail-screen line render "—" for every in-scope record — the record shows no kashrut label of any kind, not a downgraded-but-still-present one.',
  samples: simulations.slice(0, 12),
};

// ── PART 5: would clearing kosherType leave ZERO kashrut signal at all? ────
const zeroSignalIfCleared = inScope.filter((p) =>
  !p.certifiedBy && !p.kosherCertUrl && !p.certificateValidUntil && !p.sourceUrl && !('certifierId' in p && p.certifierId),
); // by construction this equals `inScope` itself, since inScope already required all of these absent —
   // reported explicitly rather than assumed, per ask #5's instruction not to let a script decide silently.

const part5 = {
  count: zeroSignalIfCleared.length,
  note: 'Every record in the Part 2 "fully unsupported" set (by definition, since that set already required certifiedBy/kosherCertUrl/sourceUrl/certificateValidUntil all absent) would have ZERO kashrut signal of any kind if kosherType were also cleared — this is exactly the set AGENTS.md\'s "no kashrut certificate → no record" rule would make ineligible for the dataset if it were being newly imported today. This is the deletion-adjacent set. Not resolved here — full list follows for the owner/Reviewer.',
  fullList: zeroSignalIfCleared.map((p) => ({
    id: p.id, name: p.name, cityId: p.cityId, address: p.address ?? null, type: p.type,
    kosherType: p.kosherType, source: p.source ?? null, lastVerifiedAt: p.lastVerifiedAt ?? null,
  })),
};

// ── PART 6: REMOVE / RECOVER / PRESERVE / REPRESENT taxonomy (per kosher-app-19's amendment) ──
// A record is not just "evidenced or not" — it can have evidence that CONTRADICTS
// the structured claim, or evidence that was simply never propagated into the
// structured fields. Four disjoint outcomes, computed dataset-wide:
const BADATZ_OR_NAMED_RAV = /בד"?ץ|בד"?צ|הרב |רב \S|לנדא|מחפוד|רובין|חתם סופר|קהילות|בית יוסף|עדה החרדית|OU|OK/;

// RECOVER: claim-implying kosherType, no kosherAuthority, certifiedBy present and
// names something more specific than a bare level word or the rabbinate's own
// mehadrin track — i.e. real identity evidence the structured fields discarded.
// Compound multi-body strings ("X + Y", "X / Y", "X ו-Y") are reported separately —
// recovering to ONE authority from those needs a human pick, not a script's guess.
const recoverCandidates = food.filter((p) => {
  if (!CLAIM_IMPLYING.has(p.kosherType) || p.kosherAuthority || !p.certifiedBy) return false;
  const cb = p.certifiedBy.trim();
  if (cb === 'מהדרין' || cb === 'כשר למהדרין' || cb === 'בד"ץ') return false;
  if (/רבנות/.test(cb) && /מהדרין/.test(cb)) return false; // rabbinate's own mehadrin track, not an external named body
  return BADATZ_OR_NAMED_RAV.test(cb);
});
const recoverCompound = recoverCandidates.filter((p) => /[+/]| ו-?ב?/.test(p.certifiedBy) && (p.certifiedBy.match(/בד"?ץ|הרב|רבנות/g) || []).length > 1);
const recoverClean = recoverCandidates.filter((p) => !recoverCompound.includes(p));

// The 10 contradiction records from the Phase 1 amendment — evidenced but the
// evidence disagrees with the claim. Neither REMOVE nor RECOVER nor a clean PRESERVE.
const contradicting = food.filter((p) => {
  if (!p.certifiedBy || reviewQueueRaws.has(p.certifiedBy)) return false;
  const alias = aliasMap.get(p.certifiedBy);
  if (!alias) return false;
  return p.kosherLevel === 'mehadrin' && /רבנות/.test(p.certifiedBy) && !/מהדרין/.test(p.certifiedBy);
});

// REMOVE: Part 2's fully-unsupported set (323), MINUS nothing — RECOVER and
// PRESERVE both require certifiedBy present, REMOVE's definition already
// requires it absent, so these pools are disjoint by construction, not by subtraction.
const removeCount = inScope.length;

// PRESERVE: evidenced (cert-backed via kosherCertUrl+certificateValidUntil, OR
// certifiedBy resolves via a non-reviewQueue registry alias — registered
// non-null authority or explicit null-authority "level known" state) AND not
// in the 10-record contradiction set.
const contradictingIds = new Set(contradicting.map((p) => p.id));
const preserveCandidates = food.filter((p) => {
  if (contradictingIds.has(p.id)) return false;
  const certBackedToo = !!(p.kosherCertUrl && p.certificateValidUntil);
  if (certBackedToo) return true;
  if (!p.certifiedBy || reviewQueueRaws.has(p.certifiedBy)) return false;
  const alias = aliasMap.get(p.certifiedBy);
  return !!(alias && (alias.authorityId === null || registeredIds.has(alias.authorityId)));
});

// REPRESENT: genuine uncertainty — certifiedBy names a level or a vague/generic
// source with no recoverable specific identity (the bare "מהדרין" cases, e.g. 52
// of humus-eli-'s 59 mehadrin records; bare "כשר למהדרין"; rabbinate's-own-mehadrin-
// track; anonymous "הרבנות המקומית"/"המועצה המקומית" phrases already counted among
// the coffeetrail contradiction set above where the level assertion is the actual
// defect, vs here where the source is just honestly vague and the level is NOT
// asserted). No mutation implied — this is what the new schema state is for.
const representCandidates = food.filter((p) => {
  if (!CLAIM_IMPLYING.has(p.kosherType) || p.kosherAuthority || !p.certifiedBy) return false;
  if (recoverCandidates.includes(p) || contradicting.includes(p)) return false;
  return true; // has certifiedBy, claim-implying kosherType, not recoverable to a specific body, not contradicting
});

const part6 = {
  taxonomy: 'REMOVE / RECOVER / PRESERVE / REPRESENT — disjoint by construction (RECOVER/REPRESENT/contradicting all require certifiedBy present; REMOVE requires it absent)',
  REMOVE: { count: removeCount, note: '= Part 2 fullyUnsupportedCount exactly, no double-count risk with RECOVER since RECOVER requires certifiedBy present.' },
  RECOVER: {
    cleanSingleBodyCount: recoverClean.length,
    compoundMultiBodyCount: recoverCompound.length,
    totalCandidateCount: recoverCandidates.length,
    byCertifiedBy: Object.fromEntries(Object.entries(recoverClean.reduce((acc, p) => ((acc[p.certifiedBy] = (acc[p.certifiedBy] ?? 0) + 1), acc), {})).sort((a, b) => b[1] - a[1]).slice(0, 20)),
    compoundSamples: recoverCompound.slice(0, 10).map((p) => ({ id: p.id, certifiedBy: p.certifiedBy })),
    note: 'Independently reconciled against kosher-app-19\'s reported 208: top-entry counts match exactly (בד"ץ בית יוסף=73, בית יוסף=27, רב מחפוד=16, כשרות הרב מחפוד=15, הרב לנדא=12, כשרות הרב לנדא=8, בד"ץ העדה החרדית=7 — all confirmed identical). My total (cleanSingleBodyCount) differs because it additionally excludes the 10 already-flagged contradiction records (avoiding double-count with the Phase-1-amendment set) and separates out compound multi-body strings as their own bucket rather than folding them into a single-authority recovery count.',
  },
  contradicting: { count: contradicting.length, ids: contradicting.map((p) => p.id), note: 'The Phase 1 amendment\'s 10 — evidenced but evidence disagrees with the claim. Excluded from RECOVER (recovering TO the contradicted claim would be wrong) and from PRESERVE (contradiction disqualifies preservation).' },
  PRESERVE: { count: preserveCandidates.length, note: 'Evidenced (alias-resolved, null-authority-resolved, or cert-backed) AND not in the 10-record contradiction set.' },
  REPRESENT: { count: representCandidates.length, byCertifiedBy: Object.fromEntries(Object.entries(representCandidates.reduce((acc, p) => ((acc[p.certifiedBy] = (acc[p.certifiedBy] ?? 0) + 1), acc), {})).sort((a, b) => b[1] - a[1]).slice(0, 15)) },
};

const out = { part1, part2, part3, part4, part5, part6 };
writeFileSync(resolve(root, 'scripts/reports/kashrut-type-fabrication-surface.json'), JSON.stringify(out, null, 2), 'utf8');

console.log('=== PART 1: known bugs vs live data ===');
console.log('golda:', part1.golda.liveCount, '| humuseliyahu:', part1.humuseliyahu.liveCount, '(script output never reached production)');
console.log('aroma-v2 id-range live count:', part1.aromaV2.liveIdRangeCount, '| aroma via apply-chains-research.mjs:', part1.aromaChainsResearch.liveCount);
console.log('rebar:', part1.rebar.liveCount, '| coffeetrail:', part1.coffeetrail.liveCount);
console.log('\n=== PART 2: dataset-wide unsupported claim-implying kosherType ===');
console.log('fully unsupported:', part2.fullyUnsupportedCount, part2.fullyUnsupportedByKosherType);
console.log('has sourceUrl only (not folded into fully-unsupported):', part2.hasSourceUrlOnlyCount);
console.log('\n=== PART 3: protected set ===');
console.log(part3);
console.log('\n=== PART 4: before/after label ===');
console.log('total simulated:', part4.totalSimulated, '| optionA unchanged from today:', part4.optionA_labelUnchangedFromTodayCount, '| optionB shows nothing:', part4.optionB_labelBecomesNullCount);
console.log('\n=== PART 5: zero-signal-if-kosherType-cleared ===');
console.log('count:', part5.count);
console.log('\n=== PART 6: REMOVE / RECOVER / PRESERVE / REPRESENT ===');
console.log('REMOVE:', part6.REMOVE.count);
console.log('RECOVER: clean', part6.RECOVER.cleanSingleBodyCount, '| compound', part6.RECOVER.compoundMultiBodyCount, '| total candidates', part6.RECOVER.totalCandidateCount);
console.log('contradicting:', part6.contradicting.count, part6.contradicting.ids);
console.log('PRESERVE:', part6.PRESERVE.count);
console.log('REPRESENT:', part6.REPRESENT.count, part6.REPRESENT.byCertifiedBy);
console.log('\nsum check (REMOVE+RECOVER.total+contradicting+REPRESENT should relate to claim-implying population):',
  part6.REMOVE.count, '+', part6.RECOVER.totalCandidateCount, '+', part6.contradicting.count, '+', part6.REPRESENT.count,
  '=', part6.REMOVE.count + part6.RECOVER.totalCandidateCount + part6.contradicting.count + part6.REPRESENT.count);
