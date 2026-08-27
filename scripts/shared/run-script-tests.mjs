#!/usr/bin/env node
// Runs every scripts/-side guard test (plain node .mjs, outside jest's
// roots — see AGENTS.md's "טסט שאף אחד לא מריץ הוא קובץ, לא מנגנון") in a
// single place that pins the process timezone ONCE, before any of them run.
//
// Why this exists, not a per-file pin: found live, 2026-08-27 —
// local-date-iso-mirror.test.mjs has a deliberate self-check that refuses
// to pass on a UTC-offset-0 machine (it cannot prove a UTC-vs-local
// distinction if there is no distinction to observe), and CI's
// ubuntu-latest runner IS UTC-offset-0. Every developer machine that had
// touched this repo was Asia/Jerusalem, so the gap was invisible locally.
// A fix inside that one file would leave the identical latent bug for the
// next .mjs guard someone writes — this repo's whole reason to have
// src/utils/date.ts is that the product's date semantics ARE Israel's, so
// every guard that exercises date logic should inherit Israel as the
// ambient timezone by default, not by each author remembering to pin it.
//
// TZ=Asia/Jerusalem, same value and reasoning as jest.config.js's pin —
// two pins, deliberately not merged into one mechanism (jest and this
// runner are different processes with no shared entry point), but they
// must never be allowed to drift apart if either one changes.
//
// Each test file still runs as its OWN child process (not import()'d
// in-process) — these files were written as standalone entry scripts that
// rely on process.exitCode at exit, some hold top-level state, and none
// were written to be safely re-executed inside a shared process. Spawning
// preserves that contract exactly, and stops at the first failure, the
// same short-circuit behaviour npm's old `&&` chain had.
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.TZ = 'Asia/Jerusalem';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Exact same list, same order, as the former package.json `&&` chain.
const TEST_FILES = [
  'scripts/shared/__tests__/kashrut-write.test.mjs',
  'scripts/shared/__tests__/kashrut-write-completeness.test.mjs',
  'scripts/reports/migrate-kosher-fields-reviewqueue-guard.test.mjs',
  'scripts/shared/__tests__/category-overwrite-guard.test.mjs',
  'scripts/shared/__tests__/kashrut-conflict-resolution.test.mjs',
  'scripts/shared/__tests__/tzohar-identity-match.test.mjs',
  'scripts/shared/__tests__/tzohar-store-search.test.mjs',
  'scripts/shared/__tests__/tzohar-match-report.test.mjs',
  'scripts/shared/__tests__/tzohar-persist-id-map.test.mjs',
  'scripts/shared/__tests__/tzohar-pdf-extract.test.mjs',
  'scripts/shared/__tests__/tzohar-stage3-verify.test.mjs',
  'scripts/shared/__tests__/rebar-feed.test.mjs',
  'scripts/shared/__tests__/level-assertion-guard.test.mjs',
  'scripts/shared/__tests__/import-rebar-exitcode.test.mjs',
  'scripts/shared/__tests__/import-rebar-write.test.mjs',
  'scripts/shared/__tests__/authority-normalize.test.mjs',
  'scripts/shared/__tests__/kashrut-pipeline.test.mjs',
  'scripts/shared/__tests__/ratchet-corrections.test.mjs',
  'scripts/shared/__tests__/greg-adapter.test.mjs',
  'scripts/shared/__tests__/ratchet-family-exhaustiveness.test.mjs',
  'scripts/shared/__tests__/lastverifiedat-literal-guard.test.mjs',
  'scripts/shared/__tests__/local-date-iso-mirror.test.mjs',
];

for (const relPath of TEST_FILES) {
  const absPath = resolve(ROOT, relPath);
  const result = spawnSync(process.execPath, [absPath], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
