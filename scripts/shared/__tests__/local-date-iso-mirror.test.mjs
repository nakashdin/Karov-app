// Standalone test (not jest). Run: node scripts/shared/__tests__/local-date-iso-mirror.test.mjs
//
// src/utils/date.ts is the CANONICAL localDateISO() implementation.
// scripts/shared/kashrut-write.mjs keeps a deliberate MIRROR (not a second
// independent implementation) because scripts/ (plain node .mjs, no build
// step) cannot reliably import src/ (.ts) — this repo's CI pins Node 22
// with an unpinned patch version, and TypeScript-file stripping by plain
// `node` was not dependably available across that whole line. Two copies
// is exactly how a shared date helper diverges (the reason this whole
// investigation started), so this test reads BOTH files' source text and
// asserts the function body is byte-for-byte identical — a change to one
// without the other fails this test by name instead of silently drifting.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { localDateISO } from '../kashrut-write.mjs';

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

console.log('local-date-iso-mirror');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CANONICAL_PATH = resolve(ROOT, 'src', 'utils', 'date.ts');
const MIRROR_PATH = resolve(ROOT, 'scripts', 'shared', 'kashrut-write.mjs');

/** Extracts the function BODY only (between the first `{` after the signature and the matching closing `}`), ignoring the signature line itself so a `: string` return-type annotation (valid TS, not valid plain JS) doesn't force the two to differ. */
function extractFunctionBody(src, signatureRe) {
  const m = signatureRe.exec(src);
  if (!m) return null;
  let i = m.index + m[0].length;
  // skip to the opening brace
  while (src[i] !== '{') i++;
  const start = i;
  let depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}

test('sanity: both files exist and both bodies were extracted — a null here means the extraction regex is broken, not that the files match', () => {
  const canonicalSrc = readFileSync(CANONICAL_PATH, 'utf8');
  const mirrorSrc = readFileSync(MIRROR_PATH, 'utf8');
  const canonicalBody = extractFunctionBody(canonicalSrc, /export function localDateISO\(when: Date = new Date\(\)\)\s*:\s*string\s*/);
  const mirrorBody = extractFunctionBody(mirrorSrc, /export function localDateISO\(when = new Date\(\)\)\s*/);
  assert.ok(canonicalBody, 'could not extract localDateISO body from src/utils/date.ts — extraction regex needs updating alongside any signature change');
  assert.ok(mirrorBody, 'could not extract localDateISO body from scripts/shared/kashrut-write.mjs — extraction regex needs updating alongside any signature change');
});

test('the two localDateISO implementations are byte-for-byte identical (ignoring only the TS type annotations, which plain JS cannot express)', () => {
  const canonicalSrc = readFileSync(CANONICAL_PATH, 'utf8');
  const mirrorSrc = readFileSync(MIRROR_PATH, 'utf8');
  const canonicalBody = extractFunctionBody(canonicalSrc, /export function localDateISO\(when: Date = new Date\(\)\)\s*:\s*string\s*/);
  const mirrorBody = extractFunctionBody(mirrorSrc, /export function localDateISO\(when = new Date\(\)\)\s*/);
  assert.equal(mirrorBody, canonicalBody, 'src/utils/date.ts and scripts/shared/kashrut-write.mjs\'s localDateISO() bodies have diverged — fix both together, they must stay identical');
});

// ── The real UTC/local mismatch proof. Not "does it match on a random run"
// (which passes trivially whenever the two happen to agree, most of any
// given day) but "does it pick the LOCAL date, not the UTC date, for an
// instant deliberately chosen to fall on different calendar days in each
// zone" — deterministic regardless of the timezone or moment the test
// itself happens to run in, because it constructs the instant explicitly
// via Date.UTC() rather than reading the live clock.
//
// This machine's own offset (checked, not assumed): getTimezoneOffset()
// returns -180 (UTC+3, Israel in summer) as of 2026-08-27. A UTC instant
// of 2026-08-27T23:00:00Z is 2026-08-28T02:00:00 local — August 27 in UTC,
// August 28 in local time. The BUGGY implementation
// (`toISOString().slice(0,10)`) would return "2026-08-27"; the CORRECT one
// must return "2026-08-28".
test('picks the LOCAL calendar date, not the UTC one, for an instant that falls on different days in each zone', () => {
  const utcLateNight = new Date(Date.UTC(2026, 7, 27, 23, 0, 0)); // 2026-08-27T23:00:00Z
  const buggyUtcResult = utcLateNight.toISOString().slice(0, 10);
  const correctLocalResult = localDateISO(utcLateNight);

  // The two must actually differ for this test to be proving anything —
  // if the test machine's own timezone offset is 0 (UTC), this assertion
  // fails LOUDLY rather than silently passing a test that checked nothing,
  // per the same discipline as this guard's own "sanity: at least one
  // violation found" check.
  assert.notEqual(
    correctLocalResult, buggyUtcResult,
    `test machine's timezone offset (${utcLateNight.getTimezoneOffset()} min) makes UTC and local agree for this instant — ` +
      'this test cannot prove anything on a UTC-offset-0 machine; adjust the instant or skip explicitly, do not let it pass silently',
  );
  assert.equal(correctLocalResult, `${utcLateNight.getFullYear()}-${String(utcLateNight.getMonth() + 1).padStart(2, '0')}-${String(utcLateNight.getDate()).padStart(2, '0')}`);
});

console.log(`${passed} passed`);
if (process.exitCode) {
  console.error('local-date-iso-mirror: FAILED');
} else {
  console.log('local-date-iso-mirror: all tests passed');
}
