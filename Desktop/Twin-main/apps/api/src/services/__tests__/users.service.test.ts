import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  setupTestDatabase,
  teardownTestDatabase,
  cleanupDatabase,
} from '../../__tests__/helpers/test-utils.js';
import { createUser, getUser, getUserByEmail, getOrCreateUser, deleteUser } from '../users.service.js';

describe('Users Service', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanupDatabase();
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const user = await createUser('test@example.com');

      expect(user).toMatchObject({
        id: expect.any(String),
        email: 'test@example.com',
      });
    });
  });

  describe('getUser', () => {
    it('should get user by ID', async () => {
      const user = await createUser('test@example.com');

      const result = await getUser(user.id);

      expect(result).toMatchObject({
        id: user.id,
        email: 'test@example.com',
      });
    });

    it('should return null for non-existent user', async () => {
      const result = await getUser('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should get user by email', async () => {
      await createUser('test@example.com');

      const result = await getUserByEmail('test@example.com');

      expect(result).toMatchObject({
        email: 'test@example.com',
      });
    });

    it('should return null for non-existent email', async () => {
      const result = await getUserByEmail('nonexistent@example.com');
      expect(result).toBeNull();
    });
  });

  describe('getOrCreateUser', () => {
    it('should return existing user if found', async () => {
      const existing = await createUser('test@example.com');

      const result = await getOrCreateUser('test@example.com');

      expect(result.id).toBe(existing.id);
    });

    it('should create new user if not found', async () => {
      const result = await getOrCreateUser('new@example.com');

      expect(result).toMatchObject({
        email: 'new@example.com',
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const user = await createUser('test@example.com');

      await deleteUser(user.id);

      const result = await getUser(user.id);
      expect(result).toBeNull();
    });
  });
});
