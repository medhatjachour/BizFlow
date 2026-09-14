import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/',
        'dist/'
      ]
    }
  },
  resolve: {
    // Array form (not the shorthand object) because the Electron doubles have
    // to match a bare specifier exactly: a string `find` also matches
    // `electron-log/main`, and Vite resolves that by concatenation.
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: '@renderer', replacement: path.resolve(__dirname, './src/renderer/src') },
      { find: '@test', replacement: path.resolve(__dirname, './src/test') },
      // CI installs with --ignore-scripts, which skips Electron's postinstall
      // (the ~100MB runtime download), so requiring the real module throws
      // "Electron failed to install correctly". Stub it: the main-process code
      // under test only needs the API surface, not a packaged runtime.
      { find: /^electron$/, replacement: path.resolve(__dirname, './src/test/mocks/electron.ts') },
      // `electron-log` is a real package that Vitest loads with Node, so the
      // alias above never reached its `require('electron')`. Alias the package
      // itself, plus its `/main` and `/preload` subpath imports.
      {
        find: /^electron-log(\/.*)?$/,
        replacement: path.resolve(__dirname, './src/test/mocks/electron-log.ts')
      }
    ]
  }
})
