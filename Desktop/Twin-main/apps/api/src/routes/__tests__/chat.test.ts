import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import {
  createTestApp,
  closeTestApp,
  setupTestDatabase,
  teardownTestDatabase,
  cleanupDatabase,
  createTestUser,
  getAuthHeaders,
  createTestRecording,
  createTestChatSession,
} from '../../__tests__/helpers/test-utils.js';
import { db } from '../../lib/db.js';

// Mock OpenAI client
vi.mock('openai', () => {
  return {
    default: vi.fn(() => ({
      chat: {
        completions: {
          create: vi.fn(() =>
            Promise.resolve({
              choices: [
                {
                  message: {
                    content: 'Mock AI response',
                  },
                },
              ],
            })
          ),
        },
      },
    })),
  };
});

describe('Chat Routes', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let testUser: Awaited<ReturnType<typeof createTestUser>>;

  beforeAll(async () => {
    await setupTestDatabase();
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp();
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanupDatabase();
    testUser = await createTestUser();
  });

  describe('GET /api/chat/session', () => {
    it('should get or create daily chat session', async () => {
      const today = new Date().toISOString().slice(0, 10);

      const response = await app.inject({
        method: 'GET',
        url: `/api/chat/session?date=${today}`,
        headers: getAuthHeaders(testUser.id),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        sessionId: expect.any(String),
        sessionDate: today,
        recordingId: null,
        messages: expect.any(Array),
      });
    });

    it('should get or create recording-scoped chat session', async () => {
      const recording = await createTestRecording(testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/chat/session?recordingId=${recording.id}`,
        headers: getAuthHeaders(testUser.id),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        sessionId: expect.any(String),
        sessionDate: null,
        recordingId: recording.id,
        messages: expect.any(Array),
      });
    });

    it('should return existing session with messages', async () => {
      const session = await createTestChatSession(testUser.id);
      await db.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'user',
          content: 'Hello',
        },
      });

      const today = new Date().toISOString().slice(0, 10);
      const response = await app.inject({
        method: 'GET',
        url: `/api/chat/session?date=${today}`,
        headers: getAuthHeaders(testUser.id),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.messages.length).toBeGreaterThan(0);
    });

    it('should reject request without user ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/chat/session',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Missing X-User-ID header');
    });
  });

  describe('POST /api/chat/opener', () => {
    it('should generate opener for daily session', async () => {
      const today = new Date().toISOString().slice(0, 10);

      const response = await app.inject({
        method: 'POST',
        url: '/api/chat/opener',
        headers: getAuthHeaders(testUser.id),
        payload: {
          date: today,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        alreadyHasOpener: false,
        message: expect.objectContaining({
          id: expect.any(String),
          role: 'assistant',
          content: expect.any(String),
          createdAt: expect.any(String),
        }),
      });
    });

    it('should return existing opener if already generated', async () => {
      const session = await createTestChatSession(testUser.id);
      await db.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'assistant',
          content: 'Existing opener',
        },
      });

      const today = new Date().toISOString().slice(0, 10);
      const response = await app.inject({
        method: 'POST',
        url: '/api/chat/opener',
        headers: getAuthHeaders(testUser.id),
        payload: {
          date: today,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.alreadyHasOpener).toBe(true);
    });
  });
});
