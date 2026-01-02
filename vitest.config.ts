import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: [
      'shared/**/*.test.ts',
      'frontend/src/**/*.test.{ts,tsx}',
      'backend/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.config.{ts,js}',
        '**/types/',
        'deploy/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend/src'),
      '@quiz/shared': path.resolve(__dirname, './shared/src'),
    },
  },
});
