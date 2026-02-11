# Testing Guide

This document describes the testing infrastructure, how to run tests, and how to write new tests.

## Overview

The project uses **Vitest** for testing with comprehensive coverage across:
- API routes (Fastify endpoints)
- Service layer (business logic)
- Library utilities (storage, database, environment)
- Integration tests (end-to-end workflows)
- Web components and hooks (React Testing Library)

## Running Tests

### Run All Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Run Tests for Specific Package

```bash
# API tests only
pnpm --filter=@komuchi/api test

# Web app tests only
pnpm --filter=@komuchi/web test
```

### Run Specific Test File

```bash
# API
pnpm --filter=@komuchi/api test src/routes/__tests__/health.test.ts

# Web
pnpm --filter=@komuchi/web test src/components/__tests__/layout/header.test.tsx
```

## Test Structure

### API Tests

```
apps/api/src/
├── __tests__/
│   ├── helpers/
│   │   └── test-utils.ts          # Test utilities and helpers
│   └── integration/
│       └── api.integration.test.ts # End-to-end tests
├── routes/
│   └── __tests__/                  # Route tests
├── services/
│   └── __tests__/                  # Service layer tests
└── lib/
    └── __tests__/                  # Library utility tests
```

### Web Tests

```
apps/web/src/
├── __tests__/
│   └── setup.ts                    # Test setup and mocks
├── components/
│   └── __tests__/                  # Component tests
└── hooks/
    └── __tests__/                  # Hook tests
```

## Writing Tests

### API Route Tests

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestApp,
  closeTestApp,
  setupTestDatabase,
  teardownTestDatabase,
  createTestUser,
  getAuthHeaders,
} from '../../__tests__/helpers/test-utils.js';

describe('My Route', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let testUser: Awaited<ReturnType<typeof createTestUser>>;

  beforeAll(async () => {
    await setupTestDatabase();
    app = await createTestApp();
    testUser = await createTestUser();
  });

  afterAll(async () => {
    await closeTestApp();
    await teardownTestDatabase();
  });

  it('should handle request', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/endpoint',
      headers: getAuthHeaders(testUser.id),
    });

    expect(response.statusCode).toBe(200);
  });
});
```

### Service Tests

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  setupTestDatabase,
  teardownTestDatabase,
  cleanupDatabase,
  createTestUser,
} from '../../__tests__/helpers/test-utils.js';
import { myServiceFunction } from '../my-service.js';

describe('My Service', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanupDatabase();
  });

  it('should perform operation', async () => {
    const user = await createTestUser();
    const result = await myServiceFunction(user.id);
    expect(result).toBeDefined();
  });
});
```

### Component Tests (Web)

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../my-component';

describe('MyComponent', () => {
  it('should render content', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Test Utilities

The test utilities (`apps/api/src/__tests__/helpers/test-utils.ts`) provide:

- **Database Setup**: `setupTestDatabase()`, `teardownTestDatabase()`, `cleanupDatabase()`
- **Fastify App**: `createTestApp()`, `closeTestApp()`
- **User Factory**: `createTestUser()`, `createTestRecording()`, etc.
- **Mocks**: `mockS3StorageSetup()`, `mockRedisSetup()`
- **Helpers**: `getAuthHeaders()`

## Coverage Requirements

Minimum coverage thresholds:
- **API**: 70% for statements, branches, functions, lines
- **Web**: 60% for statements, branches, functions, lines

Coverage reports are generated in `coverage/` directories and uploaded as GitHub Actions artifacts.

## CI/CD

### GitHub Actions

The CI pipeline (`.github/workflows/ci.yml`) runs on every push and pull request:

1. **Lint**: ESLint across all packages
2. **Typecheck**: TypeScript type checking
3. **Test**: All tests with coverage
4. **Build**: Verify all packages build

### Pre-commit Hooks

Husky runs lint-staged before each commit:
- ESLint with auto-fix on changed files
- Prettier formatting on changed files

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data in `beforeEach` or `afterEach`
3. **Mocks**: Mock external services (S3, Redis, OpenAI) to avoid API costs
4. **Speed**: Keep tests fast (< 1 second per test file when possible)
5. **Coverage**: Aim for high coverage of business logic, not just line count
6. **Naming**: Use descriptive test names that explain what is being tested

## Troubleshooting

### Tests Fail in CI but Pass Locally

- Check environment variables are set correctly
- Ensure database migrations are run
- Verify Redis service is available (for integration tests)

### Coverage Not Generating

- Ensure `@vitest/coverage-v8` is installed
- Check `vitest.config.ts` has coverage configuration
- Run `pnpm test:coverage` instead of `pnpm test`

### Database Errors in Tests

- Tests use in-memory SQLite - no external database needed
- Ensure `setupTestDatabase()` is called in `beforeAll`
- Check migrations are applied correctly

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Fastify Testing](https://www.fastify.io/docs/latest/Guides/Testing/)
