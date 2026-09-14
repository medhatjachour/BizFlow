import js from '@eslint/js'
import globals from 'globals'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import eslintPluginReact from 'eslint-plugin-react'
import eslintPluginReactHooks from 'eslint-plugin-react-hooks'
import eslintPluginReactRefresh from 'eslint-plugin-react-refresh'
import eslintConfigPrettier from 'eslint-config-prettier'

/**
 * Flat config for ESLint 8.57 + @typescript-eslint 6.
 *
 * This file previously failed before it linted a single file, so the desktop app
 * has never actually been linted. It was broken in three separate ways:
 *
 *  1. `import { defineConfig } from 'eslint/config'` — that subpath only exists
 *     in ESLint >= 9.22; this app is on 8.57.1. Result:
 *     ERR_PACKAGE_PATH_NOT_EXPORTED.
 *  2. `@electron-toolkit/eslint-config-ts` (1.0.1) was spread as if it were a
 *     flat config, but it is still an eslintrc-style object
 *     (`{env, parser, parserOptions, plugins, extends}`) — no flat export, no
 *     `configs.recommended`.
 *  3. Importing `typescript-eslint` (the v8 meta package) resolved to the *root*
 *     node_modules copy (8.66.0) while ESLint ran from this app (8.57.1), so
 *     ts-eslint's rules were paired with the wrong ESLint and crashed with
 *     "Cannot read properties of undefined (reading 'allowShortCircuit')".
 *     The monorepo has three ESLint installs and two ts-eslint majors; this
 *     config deliberately uses only the app-local pair (`@typescript-eslint/*`
 *     6.21.0 + eslint 8.57.1), which is a consistent combination.
 *
 * ts-eslint 6 has no prebuilt flat configs, so the recommended set is assembled
 * by hand below. Everything imported here is already installed — this file must
 * not require an `npm install`, because a re-install re-hoists dependencies and
 * breaks the Tailwind 3 / Tailwind 4 split between the desktop and website apps.
 *
 * Measured effect: 1,631 files linted, errors 3,999 -> 207 and warnings 4,208 ->
 * 3,665. Most of what went away was configuration noise (bundled `web/.dist-web`
 * output and the checked-in generated Prisma client were being linted, and
 * `react/prop-types` was demanding runtime prop checks in a TypeScript app).
 * What remains is real, starting with 26 `react-hooks/rules-of-hooks` errors.
 */

const tsEslintRecommended = tsPlugin.configs['eslint-recommended'].overrides[0].rules

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/out/**',
      '**/build/**',
      '**/prisma/generated/**',
      '**/*.min.js',
      // Vite build output for the embedded web UI. Bundled third-party code was
      // responsible for ~1,400 of the ~1,800 `no-undef` reports.
      '**/.dist-web/**',
      '**/dist-web/**',
      '**/.dist/**',
      '**/release/**',
      '**/coverage/**',
      // Generated Prisma client (checked in, machine-written). The remaining
      // `no-undef` reports all came from here.
      '**/src/generated/**'
    ]
  },

  js.configs.recommended,

  eslintPluginReact.configs.flat.recommended,
  eslintPluginReact.configs.flat['jsx-runtime'],

  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node }
    }
  },

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true }
      },
      globals: { ...globals.browser, ...globals.node }
    },
    settings: {
      react: { version: 'detect' }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': eslintPluginReactHooks,
      'react-refresh': eslintPluginReactRefresh
    },
    rules: {
      // Turn off the base rules that TypeScript already covers.
      ...tsEslintRecommended,
      ...tsPlugin.configs.recommended.rules,
      ...eslintPluginReactHooks.configs.recommended.rules,
      ...eslintPluginReactRefresh.configs.vite.rules,

      // Runtime prop validation is pointless in a TypeScript codebase; the
      // compiler already checks every prop.
      'react/prop-types': 'off',

      // The backlog of explicit `any` (~1000, mostly at IPC/preload and Prisma
      // payload boundaries) is real work, but as errors it would bury the
      // signal from everything else. Surface it without blocking.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }
      ]
    }
  },

  // Must stay last: switches off every rule that would fight Prettier.
  eslintConfigPrettier
]
