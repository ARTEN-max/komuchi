import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    extends: './apps/api/vitest.config.ts',
    test: {
      name: 'api',
      include: ['apps/api/src/**/*.test.ts', 'apps/api/src/__tests__/**/*.ts'],
    },
  },
  {
    extends: './apps/web/vitest.config.ts',
    test: {
      name: 'web',
      include: ['apps/web/src/**/*.{test,spec}.{ts,tsx}'],
    },
  },
]);
