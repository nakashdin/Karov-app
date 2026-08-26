// Standalone test (not jest — .mjs files aren't in jest's testMatch).
// Run: node scripts/shared/__tests__/kashrut-conflict-resolution.test.mjs
//
// scripts/shared/kashrut-conflict-resolution.mjs is a pure function of its
// arguments (no file I/O of its own) — no worktree needed here, same reason
// kashrut-write.test.mjs needs none: nothing under test ever touches
// src/data/generated/. The real-data reproduction tests below DO read the
// real dataset and the real registry, but only ever read them.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveKosherTypeConflict,
  resolveCertifiedByConflict,
  resolveKashrutFieldConflict,
  LEVEL_ASSERTING_KOSHER_TYPES,
} from '../kashrut-conflict-resolution.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok - ${name}`);
  } catch (err) {
    console.error(`  FAIL - ${name}`);
    console.error(`    ${err.stack ?? err.message}`);
    process.exitCode = 1;
  }
}

function throws(fn, messageFragment) {
  assert.throws(fn, (err) => {
    assert.ok(err instanceof Error, 'threw a non-Error');
    if (messageFragment) assert.ok(err.message.includes(messageFragment), `error message missing "${messageFragment}": ${err.message}`);
    return true;
  });
}

function readNoBom(p) {
  const buf = readFileSync(p);
  const s = (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) ? buf.slice(3) : buf;
  return JSON.parse(s.toString('utf8'));
}

function loadRealAliasMap() {
  const registry = JSON.parse(readFileSync(resolve(ROOT, 'scripts/reports/kashrut-registry.json'), 'utf8').replace(/^﻿/, ''));
  return new Map((registry.aliases ?? []).map((a) => [a.raw, a]));
}

console.log('kashrut-conflict-resolution.mjs');

// ── resolveKosherTypeConflict: shapes, fired against real registry aliases ──

const aliasMap = loadRealAliasMap();

// Ground truth these tests lean on, verified directly against the real
// registry rather than assumed:
{
  const bodyOnly = aliasMap.get('בד"ץ בית יוסף');
  assert.ok(bodyOnly?.authorityId && !bodyOnly.level, 'fixture assumption broken: expected בד"ץ בית יוסף to resolve to a named body with no level');
  const levelPhrase = aliasMap.get('כשר למהדרין');
  assert.ok(levelPhrase && !levelPhrase.authorityId && levelPhrase.level === 'mehadrin', 'fixture assumption broken: expected כשר למהדרין to resolve to level=mehadrin, no body');
  const neitherPhrase = aliasMap.get('כשר בד"ץ');
  assert.ok(neitherPhrase && !neitherPhrase.authorityId && !neitherPhrase.level, 'fixture assumption broken: expected כשר בד"ץ to resolve with neither body nor level');
}

test('agree: identical kosherType on both sides is not a conflict', () => {
  const res = resolveKosherTypeConflict({ id: 'x1', placesKosherType: 'rabanut', mirrorKosherType: 'rabanut' });
  assert.equal(res.winner, 'agree');
  assert.equal(res.branch, 'no-conflict');
});

test('body-name-unsupported: places elevates on a certifiedBy that resolves to a named body -> mirror wins (real registry alias)', () => {
  const res = resolveKosherTypeConflict({
    id: 'x2', placesKosherType: 'mehadrin', placesCertifiedBy: 'בד"ץ בית יוסף',
    mirrorKosherType: 'rabanut', mirrorCertifiedBy: undefined, aliasMap,
  });
  assert.equal(res.winner, 'mirror');
  assert.equal(res.resolvedValue, 'rabanut');
  assert.equal(res.branch, 'body-name-unsupported');
});

test('registry-level-match: places elevates on a certifiedBy that resolves to level=mehadrin -> places wins (real registry alias)', () => {
  const res = resolveKosherTypeConflict({
    id: 'x3', placesKosherType: 'mehadrin', placesCertifiedBy: 'כשר למהדרין',
    mirrorKosherType: 'rabanut', mirrorCertifiedBy: undefined, aliasMap,
  });
  assert.equal(res.winner, 'places');
  assert.equal(res.resolvedValue, 'mehadrin');
  assert.equal(res.branch, 'registry-level-match');
});

test('registry-level-mismatch: places elevates on a certifiedBy that resolves to neither a body nor the asserted level -> mirror wins (the proxy-invisible case, real registry alias)', () => {
  const res = resolveKosherTypeConflict({
    id: 'x4', placesKosherType: 'mehadrin', placesCertifiedBy: 'כשר בד"ץ',
    mirrorKosherType: 'rabanut', mirrorCertifiedBy: undefined, aliasMap,
  });
  assert.equal(res.winner, 'mirror');
  assert.equal(res.branch, 'registry-level-mismatch');
});

test('registry-level-mismatch also fires when certifiedBy has no registry entry at all', () => {
  const res = resolveKosherTypeConflict({
    id: 'x5', placesKosherType: 'mehadrin', placesCertifiedBy: 'a string not in the registry at all',
    mirrorKosherType: 'rabanut', mirrorCertifiedBy: undefined, aliasMap,
  });
  assert.equal(res.winner, 'mirror');
  assert.equal(res.branch, 'registry-level-mismatch');
});

test('no-certifiedBy-unadjudicable: elevating side has no certifiedBy at all -> unresolved, conservative value carried, not applied', () => {
  const res = resolveKosherTypeConflict({
    id: 'x6', placesKosherType: 'mehadrin', placesCertifiedBy: undefined,
    mirrorKosherType: 'rabanut', mirrorCertifiedBy: undefined, aliasMap,
  });
  assert.equal(res.winner, 'unresolved');
  assert.equal(res.resolvedValue, null);
  assert.equal(res.conservativeValue, 'rabanut');
  assert.equal(res.branch, 'no-certifiedBy-unadjudicable');
});

test('direction-agnostic: the SAME rule fires when MIRROR is the elevating side, not just places (not places-biased)', () => {
  const res = resolveKosherTypeConflict({
    id: 'x7', placesKosherType: 'rabanut', placesCertifiedBy: undefined,
    mirrorKosherType: 'mehadrin', mirrorCertifiedBy: 'בד"ץ בית יוסף', aliasMap,
  });
  assert.equal(res.winner, 'places'); // places is the conservative side here
  assert.equal(res.resolvedValue, 'rabanut');
  assert.equal(res.branch, 'body-name-unsupported');
});

test('unresolved-unspecified-shape: both sides elevate but to different level-asserting values', () => {
  const res = resolveKosherTypeConflict({
    id: 'x8', placesKosherType: 'mehadrin', placesCertifiedBy: 'כשר למהדרין',
    mirrorKosherType: 'rabanut_mehadrin', mirrorCertifiedBy: 'כשר למהדרין', aliasMap,
  });
  assert.equal(res.winner, 'unresolved');
  assert.equal(res.resolvedValue, null);
  assert.equal(res.branch, 'unresolved-unspecified-shape');
});

test('unresolved-unspecified-shape: neither side elevates but the (body-only) values disagree', () => {
  const res = resolveKosherTypeConflict({
    id: 'x9', placesKosherType: 'badatz_beit_yosef', mirrorKosherType: 'rabanut', aliasMap,
  });
  assert.equal(res.winner, 'unresolved');
  assert.equal(res.branch, 'unresolved-unspecified-shape');
});

// ── real-data reproduction: the audited 40-record population, exact ────────
// FACTS §18e-ii measured this population by hand (git-history cross-check)
// and split it 6 body-name-unsupported / 20 registry-level-match / 7
// registry-level-mismatch / 7 no-certifiedBy-unadjudicable, naming the exact
// ids in each of the two smaller buckets. This test reproduces it
// independently from the live dataset, not from their reported numbers.

test('REAL DATA: the exact "places elevates, mirror holds a non-elevating value" population is 40 records', () => {
  const places = readNoBom(resolve(ROOT, 'src/data/generated/places.osm.json'));
  const rests = readNoBom(resolve(ROOT, 'src/data/generated/restaurants.osm.json'));
  const placesById = new Map(places.map((p) => [p.id, p]));
  const restsById = new Map(rests.map((r) => [r.id, r]));
  const subset = [...restsById.keys()].filter((id) => {
    if (!placesById.has(id)) return false;
    const p = placesById.get(id), r = restsById.get(id);
    return LEVEL_ASSERTING_KOSHER_TYPES.has(p.kosherType) && r.kosherType && !LEVEL_ASSERTING_KOSHER_TYPES.has(r.kosherType);
  });
  assert.equal(subset.length, 40);
});

test('REAL DATA: resolveKosherTypeConflict reproduces the documented 6/20/7/7 split AND the exact ids in the two smaller buckets', () => {
  const places = readNoBom(resolve(ROOT, 'src/data/generated/places.osm.json'));
  const rests = readNoBom(resolve(ROOT, 'src/data/generated/restaurants.osm.json'));
  const placesById = new Map(places.map((p) => [p.id, p]));
  const restsById = new Map(rests.map((r) => [r.id, r]));
  const subset = [...restsById.keys()].filter((id) => {
    if (!placesById.has(id)) return false;
    const p = placesById.get(id), r = restsById.get(id);
    return LEVEL_ASSERTING_KOSHER_TYPES.has(p.kosherType) && r.kosherType && !LEVEL_ASSERTING_KOSHER_TYPES.has(r.kosherType);
  });

  const branchCounts = {};
  const idsByBranch = {};
  for (const id of subset) {
    const p = placesById.get(id), r = restsById.get(id);
    const res = resolveKosherTypeConflict({
      id, placesKosherType: p.kosherType, placesCertifiedBy: p.certifiedBy,
      mirrorKosherType: r.kosherType, mirrorCertifiedBy: r.certifiedBy, aliasMap,
    });
    branchCounts[res.branch] = (branchCounts[res.branch] || 0) + 1;
    (idsByBranch[res.branch] ??= []).push(id);
  }

  assert.deepEqual(branchCounts, {
    'body-name-unsupported': 6,
    'registry-level-match': 20,
    'registry-level-mismatch': 7,
    'no-certifiedBy-unadjudicable': 7,
  });

  assert.deepEqual(
    [...idsByBranch['body-name-unsupported']].sort(),
    ['9100003', '9100006', '9100007', '9100062', '9100063', 'humus-eli-חומוס-אליהו-ירושלים-הר-חוצבים'].sort(),
  );
  assert.deepEqual(
    [...idsByBranch['registry-level-mismatch']].sort(),
    ['osm-node-7541798990', 'humus-eli-חומוס-אליהו-בית-שמש', '9100000', '9100005', '9100030', '9100050', '9100056'].sort(),
  );

  // branch alone isn't enough to prove correctness — a sabotage that swaps
  // which side wins while leaving the branch label untouched would pass the
  // assertions above. Confirmed by firing that exact sabotage against this
  // suite before trusting it: it slipped past the branch-count/id-list
  // checks and was only caught by the small, explicit winner-assertions
  // above (body-name-unsupported, direction-agnostic). Asserting winner
  // here too closes that specific gap for the bulk population, not just the
  // hand-picked cases.
  for (const id of idsByBranch['body-name-unsupported']) {
    const p = placesById.get(id), r = restsById.get(id);
    const res = resolveKosherTypeConflict({ id, placesKosherType: p.kosherType, placesCertifiedBy: p.certifiedBy, mirrorKosherType: r.kosherType, mirrorCertifiedBy: r.certifiedBy, aliasMap });
    assert.equal(res.winner, 'mirror', `${id}: body-name-unsupported must resolve to the conservative (mirror) side`);
    assert.equal(res.resolvedValue, r.kosherType);
  }
  for (const id of idsByBranch['registry-level-mismatch']) {
    const p = placesById.get(id), r = restsById.get(id);
    const res = resolveKosherTypeConflict({ id, placesKosherType: p.kosherType, placesCertifiedBy: p.certifiedBy, mirrorKosherType: r.kosherType, mirrorCertifiedBy: r.certifiedBy, aliasMap });
    assert.equal(res.winner, 'mirror', `${id}: registry-level-mismatch must resolve to the conservative (mirror) side`);
    assert.equal(res.resolvedValue, r.kosherType);
  }
  for (const id of idsByBranch['registry-level-match']) {
    const p = placesById.get(id), r = restsById.get(id);
    const res = resolveKosherTypeConflict({ id, placesKosherType: p.kosherType, placesCertifiedBy: p.certifiedBy, mirrorKosherType: r.kosherType, mirrorCertifiedBy: r.certifiedBy, aliasMap });
    assert.equal(res.winner, 'places', `${id}: registry-level-match must resolve to the elevating (places) side`);
    assert.equal(res.resolvedValue, p.kosherType);
  }
  for (const id of idsByBranch['no-certifiedBy-unadjudicable']) {
    const p = placesById.get(id), r = restsById.get(id);
    const res = resolveKosherTypeConflict({ id, placesKosherType: p.kosherType, placesCertifiedBy: p.certifiedBy, mirrorKosherType: r.kosherType, mirrorCertifiedBy: r.certifiedBy, aliasMap });
    assert.equal(res.winner, 'unresolved', `${id}: no-certifiedBy-unadjudicable must stay unresolved`);
    assert.equal(res.resolvedValue, null);
  }
});

test('KNOWN, DELIBERATE SCOPE NOTE (not a defect): the function also resolves 18 records the 40-record audit did not cover — same rule, applied where the conservative side\'s kosherType is entirely absent rather than an explicit non-elevating value', () => {
  const places = readNoBom(resolve(ROOT, 'src/data/generated/places.osm.json'));
  const rests = readNoBom(resolve(ROOT, 'src/data/generated/restaurants.osm.json'));
  const placesById = new Map(places.map((p) => [p.id, p]));
  const restsById = new Map(rests.map((r) => [r.id, r]));
  const absentMirrorSubset = [...restsById.keys()].filter((id) => {
    if (!placesById.has(id)) return false;
    const p = placesById.get(id), r = restsById.get(id);
    return LEVEL_ASSERTING_KOSHER_TYPES.has(p.kosherType) && !r.kosherType;
  });
  assert.equal(absentMirrorSubset.length, 18, 'this is the broader population beyond the audited 40 — see the module header and the report to the Architect');
});

// ── resolveCertifiedByConflict ──────────────────────────────────────────────

test('agree: identical certifiedBy (and whitespace-only differences) is not a conflict', () => {
  assert.equal(resolveCertifiedByConflict({ id: 'y1', placesCertifiedBy: 'הרב לנדא', mirrorCertifiedBy: 'הרב לנדא' }).winner, 'agree');
  assert.equal(resolveCertifiedByConflict({ id: 'y2', placesCertifiedBy: '  הרב לנדא  ', mirrorCertifiedBy: 'הרב לנדא' }).winner, 'agree');
});

test('fills-gap: one side empty, the other has evidence -> the non-empty side wins', () => {
  const a = resolveCertifiedByConflict({ id: 'y3', placesCertifiedBy: undefined, mirrorCertifiedBy: 'בד"ץ בית יוסף' });
  assert.equal(a.winner, 'mirror');
  assert.equal(a.branch, 'fills-gap');
  const b = resolveCertifiedByConflict({ id: 'y4', placesCertifiedBy: 'בד"ץ בית יוסף', mirrorCertifiedBy: undefined });
  assert.equal(b.winner, 'places');
  assert.equal(b.branch, 'fills-gap');
});

test('mirror-extends-places / places-extends-mirror: a legitimate append-only extension wins over the shorter side', () => {
  const a = resolveCertifiedByConflict({ id: 'y5', placesCertifiedBy: 'בד״ץ בית יוסף', mirrorCertifiedBy: 'בד״ץ בית יוסף + OK' });
  assert.equal(a.winner, 'mirror');
  assert.equal(a.branch, 'mirror-extends-places');
  const b = resolveCertifiedByConflict({ id: 'y6', placesCertifiedBy: 'בד״ץ בית יוסף + OK', mirrorCertifiedBy: 'בד״ץ בית יוסף' });
  assert.equal(b.winner, 'places');
  assert.equal(b.branch, 'places-extends-mirror');
});

test('unresolved-disjoint-citations: two genuinely different, non-overlapping citations resolve to neither side, not a guess', () => {
  const res = resolveCertifiedByConflict({ id: 'y7', placesCertifiedBy: 'מהדרין', mirrorCertifiedBy: 'בד"ץ בית יוסף' });
  assert.equal(res.winner, 'unresolved');
  assert.equal(res.resolvedValue, null);
  assert.equal(res.conservativeValue, null, 'no principled ordering between two arbitrary citations — must not guess one');
  assert.equal(res.branch, 'unresolved-disjoint-citations');
});

test('REAL DATA: the exact "both sides have certifiedBy and disagree" population is 101 records', () => {
  const places = readNoBom(resolve(ROOT, 'src/data/generated/places.osm.json'));
  const rests = readNoBom(resolve(ROOT, 'src/data/generated/restaurants.osm.json'));
  const placesById = new Map(places.map((p) => [p.id, p]));
  const restsById = new Map(rests.map((r) => [r.id, r]));
  const subset = [...restsById.keys()].filter((id) => {
    if (!placesById.has(id)) return false;
    const p = placesById.get(id), r = restsById.get(id);
    return p.certifiedBy && r.certifiedBy && p.certifiedBy !== r.certifiedBy;
  });
  assert.equal(subset.length, 101);
});

test('REAL DATA, KNOWN GAP DOCUMENTED HERE: only 4 of the 101 resolve via the extension check; the other 97 are correctly UNRESOLVED because this pure function has no git-history access — FACTS §18e-i\'s 94-stale/7-independent split requires that history, which is a different input this module does not have', () => {
  const places = readNoBom(resolve(ROOT, 'src/data/generated/places.osm.json'));
  const rests = readNoBom(resolve(ROOT, 'src/data/generated/restaurants.osm.json'));
  const placesById = new Map(places.map((p) => [p.id, p]));
  const restsById = new Map(rests.map((r) => [r.id, r]));
  const subset = [...restsById.keys()].filter((id) => {
    if (!placesById.has(id)) return false;
    const p = placesById.get(id), r = restsById.get(id);
    return p.certifiedBy && r.certifiedBy && p.certifiedBy !== r.certifiedBy;
  });
  const branchCounts = {};
  for (const id of subset) {
    const p = placesById.get(id), r = restsById.get(id);
    const res = resolveCertifiedByConflict({ id, placesCertifiedBy: p.certifiedBy, mirrorCertifiedBy: r.certifiedBy });
    branchCounts[res.branch] = (branchCounts[res.branch] || 0) + 1;
  }
  assert.deepEqual(branchCounts, {
    'unresolved-disjoint-citations': 97,
    'places-extends-mirror': 1,
    'mirror-extends-places': 3,
  });
});

// ── the single dispatcher entry point ───────────────────────────────────────

test('resolveKashrutFieldConflict dispatches kosherType and certifiedBy to the right resolver', () => {
  const a = resolveKashrutFieldConflict('kosherType', { id: 'z1', placesKosherType: 'x', mirrorKosherType: 'x' });
  assert.equal(a.field, 'kosherType');
  assert.equal(a.winner, 'agree');
  const b = resolveKashrutFieldConflict('certifiedBy', { id: 'z2', placesCertifiedBy: 'x', mirrorCertifiedBy: 'x' });
  assert.equal(b.field, 'certifiedBy');
  assert.equal(b.winner, 'agree');
});

test('VIOLATION: resolveKashrutFieldConflict throws for a field it was not designed for, rather than silently no-op-ing', () => {
  throws(() => resolveKashrutFieldConflict('kosherLevel', { id: 'z3' }), 'no resolution rule defined');
  throws(() => resolveKashrutFieldConflict('website', { id: 'z4' }), 'no resolution rule defined');
});

console.log(`\n${passed} passed${process.exitCode ? ', with failures' : ''}`);
