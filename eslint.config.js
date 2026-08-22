// @ts-check
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

/**
 * Architectural guardrails.
 *
 * These are the rules that keep the design system and the i18n layer from
 * being bypassed — the single biggest source of drift in this codebase.
 * They start as `warn` (there is a known backlog) and flip to `error` per
 * directory as each one is cleaned up. See docs/ARCHITECTURE_REVIEW.md.
 */

const NO_RAW_COLOR = {
  selector: 'Literal[value=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
  message:
    'Raw colour literal. Add the colour to src/theme/colors.ts and import it from `../theme`.',
};

const NO_RAW_RGBA = {
  selector: 'Literal[value=/^rgba?\\(/]',
  message:
    'Raw rgba() literal. Add the colour to src/theme/colors.ts and import it from `../theme`.',
};

// Hebrew block: U+0590–U+05FF.
const NO_HEBREW_LITERAL = {
  selector: 'Literal[value=/[֐-׿]/]',
  message:
    'Hard-coded Hebrew string in a UI layer. Add it to src/i18n/*.ts and read it via `useLanguage()`.',
};

const NO_HEBREW_JSX_TEXT = {
  selector: 'JSXText[value=/[֐-׿]/]',
  message:
    'Hard-coded Hebrew text in JSX. Add it to src/i18n/*.ts and read it via `useLanguage()`.',
};

module.exports = defineConfig([
  {
    ignores: [
      'dist/**',
      '.expo/**',
      '.vercel/**',
      'node_modules/**',
      'web/**',
      'assets/**',
      // Node-side tooling with its own conventions — linted separately if ever needed.
      'scripts/**',
      'importers/**',
      'research/**',
      'data-backups/**',
      'src/data/generated/**',
    ],
  },

  expoConfig,

  // Disables stylistic rules that would fight Prettier. Formatting is a
  // separate `npm run format` step on purpose — wiring Prettier into lint
  // would fail every file in the repo on day one.
  prettierConfig,

  // ── App source: design-system guardrail ──────────────────────────────────
  {
    files: ['src/**/*.{ts,tsx}', 'App.tsx'],
    ignores: ['src/theme/**'],
    rules: {
      'no-restricted-syntax': ['warn', NO_RAW_COLOR, NO_RAW_RGBA],
    },
  },

  // ── UI layers: design-system + i18n guardrails ───────────────────────────
  // Repeats the colour rules because a later `no-restricted-syntax` entry
  // replaces (rather than merges with) an earlier one.
  {
    files: ['src/screens/**/*.tsx', 'src/components/**/*.tsx', 'src/navigation/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        NO_RAW_COLOR,
        NO_RAW_RGBA,
        NO_HEBREW_LITERAL,
        NO_HEBREW_JSX_TEXT,
      ],
    },
  },

  // ── Layer boundaries ─────────────────────────────────────────────────────
  {
    files: ['src/**/*.{ts,tsx}', 'App.tsx'],
    ignores: ['src/data/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/data/seed/*', '**/seed/*.seed'],
              message:
                'Mock seed data must not leak outside the data layer. Read through `placesRepository` instead.',
            },
            {
              group: ['**/data/generated/*'],
              message:
                'Never import generated datasets directly — go through a PlacesRepository implementation.',
            },
          ],
        },
      ],
    },
  },

  // ── Known backlog, tracked in docs/ARCHITECTURE_REVIEW.md ────────────────
  // These stay visible as warnings rather than blocking CI today:
  //
  //  • react-hooks/refs — fires on `useRef(new Animated.Value(0)).current`,
  //    which is the canonical React Native animation pattern and not a bug.
  //    The genuine offenders (a ref written during render in LocationContext
  //    and LocationPermissionScreen) are P1-4 in the review.
  //  • react-hooks/set-state-in-effect — every hit is a hand-rolled data
  //    fetch in an effect. Resolved wholesale by P1-6 (server-state layer),
  //    not by suppressing it one call site at a time.
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },

  // ── Tests & tooling ──────────────────────────────────────────────────────
  {
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}', 'jest.setup.js', 'jest.config.js'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        require: 'readonly',
        module: 'writable',
      },
    },
    rules: {
      'no-restricted-syntax': 'off',
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);
