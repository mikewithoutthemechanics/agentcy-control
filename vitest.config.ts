import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['packages/**/*.test.{ts,tsx}', 'apps/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
    },
  },
  resolve: {
    alias: {
      '@agentcy/ui': path.resolve(__dirname, './packages/ui/src'),
      '@agentcy/shared': path.resolve(__dirname, './packages/shared/src'),
      '@agentcy/supabase': path.resolve(__dirname, './packages/supabase/src'),
    },
  },
});
