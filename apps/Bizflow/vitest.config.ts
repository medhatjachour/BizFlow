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
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@renderer': path.resolve(__dirname, './src/renderer/src'),
      '@test': path.resolve(__dirname, './src/test'),
      // CI installs with --ignore-scripts, which skips Electron's postinstall
      // (the ~100MB runtime download), so requiring the real module throws
      // "Electron failed to install correctly". Stub it: the main-process code
      // under test only needs the API surface, not a packaged runtime.
      electron: path.resolve(__dirname, './src/test/mocks/electron.ts')
    }
  }
})
