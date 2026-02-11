import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/__tests__/**/*.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/__tests__/**',
        'src/types/**',
        'src/server.ts',
        'src/worker.ts',
      ],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
    // Set up environment variables for testing
    env: {
      NODE_ENV: 'test',
      TRANSCRIPTION_PROVIDER: 'mock',
      DEBRIEF_PROVIDER: 'mock',
      DATABASE_URL: 'file:./test.db',
      REDIS_URL: 'redis://localhost:6379',
      S3_BUCKET: 'test-bucket',
      S3_REGION: 'us-east-1',
      S3_ACCESS_KEY_ID: 'test-key',
      S3_SECRET_ACCESS_KEY: 'test-secret',
      CORS_ORIGIN: 'http://localhost:3000',
      API_PORT: '3001',
      API_HOST: '0.0.0.0',
      RATE_LIMIT_MAX: '100',
      RATE_LIMIT_WINDOW_MS: '60000',
      MAX_UPLOAD_SIZE_MB: '500',
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  // Prevent Vite from trying to load .env files
  envPrefix: [],
});
