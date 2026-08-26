/**
 * The single choke point for every write to a kashrut field.
 *
 * Batch B1 (docs/KASHRUT_FACTS.md §5b, §13-§15). Every script under scripts/
 * or importers/ that sets kosherType, kosherLevel, kosherAuthorityGroup,
 * kosherAuthority, certifierId, or certifiedBy on a place-shaped record
 * SHOULD route through recordKashrutWrite() instead of assigning the field
 * directly. See scripts/shared/__tests__/kashrut-write-completeness.test.mjs
 * for which existing scripts do not yet do this (a frozen, dated, reasoned
 * exclusion list — new bypasses are forbidden, existing ones are historical).
 *
 * Enforces two invariants at the moment of writing, before either value ever
 * reaches disk:
 *
 *  1. certifiedBy is append-only (B1.1) — never overwritten with a different
 *     non-empty value, only set from empty or extended (the new value must
 *     contain the old value). certifiedBy is source text, not our
 *     interpretation (FACTS §1) — the same "raw text is byte-for-byte,
 *     display text is ours to fix" principle already applied to registry
 *     alias strings (FACTS §9). A future cleanup of certifiedBy, if ever
 *     wanted, is a separate deliberate decision, not something this routine
 *     path may perform quietly.
 *
 *  2. No level-asserting kosherType or kosherLevel (mehadrin /
 *     rabanut_mehadrin / rabanut_mehadrin_jerusalem, or kosherLevel:
 *     'mehadrin' directly) may be written unless `basis` proves the SOURCE
 *     TEXT itself stated a level — never inferred from a named body. The
 *     registry itself never performs this inference: 80 of 80 mehadrin
 *     aliases carry a mehadrin word in their own raw text, 0 derived from a
 *     body (FACTS §5b). This is what actually fixes the site-B mechanism
 *     (204 of the 358 fabricated-level records) and, once
 *     migrate-kosher-fields.mjs is migrated to call this helper, the site-A
 *     mechanism (the MAP inferring a level from a body-only kosherType) too
 *     — the same rule, the same choke point, covering both.
 *
 * `basis` is a TAGGED UNION, not a free-text string, specifically so a
 * caller cannot construct a `backfilled-inference` write that is
 * indistinguishable in shape from a `registry-alias` write (FACTS §13):
 * different kinds require different fields, so the distinction survives
 * even a careless call site.
 *
 *   type KashrutBasis =
 *     | { kind: 'registry-alias', alias: string, aliasLevel: 'regular' | 'mehadrin' | null }
 *     | { kind: 'certificate-document', url: string }
 *     | { kind: 'human-review', note: string }
 *     | { kind: 'enum-inference', fromKosherType: string }
 *     | { kind: 'backfilled-inference', method: string }
 *
 * `registry-alias` is CONTENT-checked, not just shape-checked: the Reviewer's
 * B1 predicate found that a first version of this file accepted
 * {kind:'registry-alias', alias:'...', aliasLevel:'mehadrin'} on the
 * caller's word, without ever resolving `alias` against the real registry —
 * so a caller could cite the registry for a level it never granted. Fixed:
 * `alias` is now looked up in kashrut-registry.json and the registry's own
 * recorded level must match `aliasLevel`, or the write is refused. A basis
 * that cites a source is checked against it, not just validated for shape.
 *
 * NOTE ON ENFORCEMENT — read this before describing this mechanism to
 * anyone: tsconfig.json excludes both `importers` and `scripts` from
 * `include`. `npm run typecheck` never type-checks any caller of this
 * function, in either directory. The KashrutBasis shape above is
 * documentation and editor assistance ONLY — it is not a compiled,
 * CI-enforced gate for anything under scripts/ or importers/. The ONLY real
 * enforcement is the runtime validation in this file, below. Do not claim
 * "the compiler enforces it" for this module; that claim is true of
 * getKosherLabel/kosherTypeLabel in src/utils/kosher.ts (which IS
 * typechecked), not of this one.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = resolve(HERE, '..', 'reports', 'kashrut-registry.json');

/**
 * raw alias string -> {authorityId, level}, loaded once and cached. A
 * registry-alias basis is a caller CITING this registry as evidence — the
 * Reviewer's B1 predicate found that citation was never actually checked:
 * `{kind:'registry-alias', alias:'...', aliasLevel:'mehadrin'}` was accepted
 * on the caller's word, even for an alias the registry itself records as
 * level: null. basisSupportsLevelAssertion() below resolves `alias` against
 * this map and requires the registry's own recorded level to match the
 * asserted one — a basis that cites a source is now actually checked against
 * it, not just shape-validated.
 *
 * Fails CLOSED, deliberately, on both an unresolvable alias and a failure to
 * load the registry at all: this map exists specifically to gate a
 * level-asserting write, so "cannot verify" must reject, not fall back to
 * trusting the caller (which is the exact hole being closed).
 */
let aliasMapCache = null;
function loadAliasMap() {
  if (aliasMapCache) return aliasMapCache;
  try {
    const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8').replace(/^﻿/, ''));
    aliasMapCache = new Map((registry.aliases ?? []).map((a) => [a.raw, a]));
  } catch {
    aliasMapCache = new Map();
  }
  return aliasMapCache;
}

/**
 * The fields this choke point covers. The last three (added Item 4 Unit 3,
 * 2026-08-27) hold an UNVERIFIED level CLAIM the source states about
 * itself — never a verified level — so they get no assertsLevel gating
 * below: the whole point of claimedLevel is to hold what recordKashrutWrite
 * would otherwise refuse to let kosherLevel/kosherType hold. The two
 * invariants that keep a claim from being silently promoted to fact
 * (claimedLevel => kosherLevel null; claimedLevel => Text/Source non-empty)
 * are enforced in validate-data.mjs as HARD failures, not here — this
 * choke point is about ATTRIBUTING a write, not about the cross-field
 * relationship between two different fields.
 */
export const KASHRUT_FIELDS = Object.freeze([
  'kosherType',
  'kosherLevel',
  'kosherAuthorityGroup',
  'kosherAuthority',
  'certifierId',
  'certifiedBy',
  'claimedLevel',
  'claimedLevelText',
  'claimedLevelSource',
]);
const KASHRUT_FIELD_SET = new Set(KASHRUT_FIELDS);

/** kosherType values that assert a specific kashrut level. */
const LEVEL_ASSERTING_KOSHER_TYPES = new Set(['mehadrin', 'rabanut_mehadrin', 'rabanut_mehadrin_jerusalem']);

function normalizeWhitespace(s) {
  return String(s).replace(/\s+/g, ' ').trim();
}

/**
 * True if writing `current` over `prior` would violate the certifiedBy
 * append-only invariant. Exported so validate-data.mjs can apply the exact
 * same rule against git HEAD without duplicating the logic.
 *
 * Only whitespace is normalized before the containment check — nothing else.
 * In particular this deliberately does NOT tolerate a gershayim/ASCII-quote
 * fix (בד"צ -> בד״ץ) even though that exact fix has been made elsewhere in
 * this project (nameHe in the authority registry): certifiedBy is source
 * text, and source text is not ours to tidy, however small the change looks.
 * A legitimate future normalization of certifiedBy is a separate, deliberate
 * decision — not something that should pass silently through this check.
 */
export function isCertifiedByAppendOnlyViolation(prior, current) {
  const priorText = prior == null ? '' : String(prior);
  if (!priorText) return false; // first write from empty/absent — always allowed
  const currentText = current == null ? '' : String(current);
  if (currentText === priorText) return false;
  return !normalizeWhitespace(currentText).includes(normalizeWhitespace(priorText));
}

/**
 * True if `basis` is direct-enough textual evidence to justify writing a
 * level-asserting value. Exported so validate-data.mjs's ratchet counter can
 * be defined against the same rule this function enforces.
 *
 * For `registry-alias`, this does not just read `basis.aliasLevel` — it
 * resolves `basis.alias` against the real registry and requires the
 * registry's own recorded level to match what the caller asserted. A basis
 * that names an alias the registry doesn't have, or that mismatches the
 * registry's recorded level for it (e.g. claiming aliasLevel: 'mehadrin' for
 * an alias the registry itself gave level: null — precisely the badatz
 * inference this whole guard exists to stop), is rejected rather than
 * trusted on the caller's word.
 */
export function basisSupportsLevelAssertion(basis) {
  if (!basis || typeof basis.kind !== 'string') return false;
  if (basis.kind === 'registry-alias') {
    const entry = loadAliasMap().get(basis.alias);
    if (!entry) return false; // unresolvable citation — cannot verify, so refuse rather than trust
    if (entry.level !== basis.aliasLevel) return false; // caller's claim disagrees with what it cites
    return entry.level === 'mehadrin';
  }
  return basis.kind === 'certificate-document' || basis.kind === 'human-review';
}

/**
 * Write one kashrut field on `place`, enforcing the invariants above.
 * Throws instead of writing when a write would violate one. Returns `place`
 * for convenient chaining.
 *
 * @param {Record<string, unknown>} place - must have an `id` for error messages.
 * @param {string} field - one of KASHRUT_FIELDS.
 * @param {unknown} value - the value to write.
 * @param {{kind: string, [k: string]: unknown}} basis - required; see the
 *   KashrutBasis shape documented above. Not optional: a write with no
 *   stated basis is exactly the anonymous-provenance problem this exists to
 *   end.
 */
export function recordKashrutWrite(place, field, value, basis) {
  const id = place && typeof place === 'object' ? (place.id ?? '(no id)') : '(not an object)';

  if (!place || typeof place !== 'object') {
    throw new Error(`recordKashrutWrite: place must be an object, got ${typeof place}.`);
  }
  if (!KASHRUT_FIELD_SET.has(field)) {
    throw new Error(
      `recordKashrutWrite(${id}): "${field}" is not a kashrut field covered by this helper. ` +
      `Covered fields: ${KASHRUT_FIELDS.join(', ')}.`,
    );
  }
  if (!basis || typeof basis !== 'object' || typeof basis.kind !== 'string') {
    throw new Error(
      `recordKashrutWrite(${id}, ${field}): basis is required and must be a tagged object ({kind: '...', ...}), ` +
      'not a free-text string or omitted. See the KashrutBasis shape documented at the top of this file.',
    );
  }

  if (field === 'certifiedBy' && isCertifiedByAppendOnlyViolation(place.certifiedBy, value)) {
    throw new Error(
      `recordKashrutWrite(${id}, certifiedBy): refusing to overwrite evidence. ` +
      `was ${JSON.stringify(place.certifiedBy)}, attempted ${JSON.stringify(value)}. certifiedBy is source text ` +
      'and may only be set from empty or extended (the new value must contain the old value as a substring, ' +
      'modulo whitespace) — never replaced. If this business genuinely has different certifying information, ' +
      'keep the old text and append to it rather than replacing it.',
    );
  }

  const assertsLevel =
    (field === 'kosherType' && typeof value === 'string' && LEVEL_ASSERTING_KOSHER_TYPES.has(value)) ||
    (field === 'kosherLevel' && value === 'mehadrin');

  if (assertsLevel && !basisSupportsLevelAssertion(basis)) {
    throw new Error(
      `recordKashrutWrite(${id}, ${field}=${JSON.stringify(value)}): refusing to assert a level from ` +
      `basis.kind="${basis.kind}". A level-asserting value may only be written when the source text itself ` +
      'states a level — never inferred from a named certifying body (docs/KASHRUT_FACTS.md §5b: 80 of 80 ' +
      'mehadrin aliases carry a mehadrin word in their own text; 0 derived from a body). ' +
      (basis.kind === 'enum-inference'
        ? `This basis (fromKosherType=${JSON.stringify(basis.fromKosherType)}) is exactly the site-B/site-A ` +
          'mechanism this guard exists to stop.'
        : 'Pass {kind: "registry-alias", aliasLevel: "mehadrin", alias: "..."} or ' +
          '{kind: "certificate-document"|"human-review", ...} instead.'),
    );
  }

  place[field] = value;
  return place;
}
