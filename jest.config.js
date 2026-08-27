// Pin the suite's timezone to Israel — the product's actual local timezone
// — BEFORE any test file loads. Set here, not in a test file's
// beforeAll/afterAll: a per-file reassignment runs too late to affect
// jest's fake-timers machinery (verified live, 2026-08-27 — tried it in
// certificate.test.ts, it did not change the result under TZ=UTC).
//
// Found live: CI's ubuntu-latest runner defaults to UTC; every developer
// machine that had touched this repo was Asia/Jerusalem, so a genuine
// UTC-vs-local timezone bug (src/utils/date.ts's whole reason to exist)
// produced a test — certificate.test.ts's "UTC/local timezone boundary"
// block — that only passed by accident of which machine ran it. That is
// backwards: this suite exists to prove Israel-local-date behavior, so the
// suite itself has to run as Israel, not as whatever the runner happens to
// default to. Pinning to UTC instead would make the test pass for the
// wrong reason — verified: under TZ=UTC the assertion reads the same with
// or without the regression reintroduced, i.e. it stops discriminating.
// Asia/Jerusalem is the only setting where the test both passes on the
// correct code and fails when the bug is reintroduced.
process.env.TZ = 'Asia/Jerusalem';

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)', '**/?(*.)+(test).[jt]s?(x)'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/data/generated/**',
    '!src/data/seed/**',
    '!src/i18n/**',
  ],
  // The generated dataset is 5MB — never let a test pull it in by accident.
  modulePathIgnorePatterns: ['<rootDir>/src/data/generated/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|minisearch))',
  ],
};
