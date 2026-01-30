import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./app/test/setup.ts'],
    globals: true,
    include: ['app/**/*.test.{ts,tsx}', 'app/**/*.spec.{ts,tsx}'],
    exclude: ['node_modules/', 'backend/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'app/test/',
        '**/*.config.*',
        '**/dist/**',
        'backend/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
