import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/lib/**'],
      exclude: [
        'src/lib/db/**',            // DB layer requires live database — integration scope
        'src/lib/scraper/index.ts', // Orchestrator requires full DB + network — integration scope
        'src/lib/scraper/playwright.ts', // Browser automation — integration scope
        'src/lib/notifications/interface.ts', // Pure TypeScript interface — no executable code
        'src/lib/i18n.ts',          // Translation dictionary — pure data file, no business logic
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
