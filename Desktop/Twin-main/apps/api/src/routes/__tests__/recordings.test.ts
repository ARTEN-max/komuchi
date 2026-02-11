import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createTestApp,
  closeTestApp,
  setupTestDatabase,
  teardownTestDatabase,
  cleanupDatabase,
  createTestUser,
  getAuthHeaders,
  createTestRecording,
  mockS3StorageSetup,
  mockS3StoragePut,
  mockS3StorageExists,
} from '../../__tests__/helpers/test-utils.js';

describe('Recordings Routes', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let testUser: Awaited<ReturnType<typeof createTestUser>>;

  beforeAll(async () => {
    await setupTestDatabase();
    app = await createTestApp();
    mockS3StorageSetup();
  });

  afterAll(async () => {
    await closeTestApp();
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanupDatabase();
    mockS3StorageSetup();
    testUser = await createTestUser();
  });

  describe('POST /api/recordings', () => {
    it('should create a recording and return upload URL', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/recordings',
        headers: getAuthHeaders(testUser.id),
        payload: {
          title: 'Test Recording',
          mode: 'general',
          mimeType: 'audio/mpeg',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        success: true,
        data: {
          recordingId: expect.any(String),
          uploadUrl: expect.any(String),
          objectKey: expect.any(String),
          expiresIn: expect.any(Number),
        },
      });
    });

    it('should reject request without user ID', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/recordings',
        payload: {
          title: 'Test Recording',
          mode: 'general',
          mimeType: 'audio/mpeg',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Unauthorized');
    });

    it('should reject invalid MIME type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/recordings',
        headers: getAuthHeaders(testUser.id),
        payload: {
          title: 'Test Recording',
          mode: 'general',
          mimeType: 'invalid/type',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid File Type');
    });

    it('should reject invalid request body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/recordings',
        headers: getAuthHeaders(testUser.id),
        payload: {
          // Missing required fields
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Validation Error');
    });
  });

  describe('GET /api/recordings', () => {
    it('should list recordings for user', async () => {
      // Create test recordings
      await createTestRecording(testUser.id, { title: 'Recording 1' });
      await createTestRecording(testUser.id, { title: 'Recording 2' });

      const response = await app.inject({
        method: 'GET',
        url: '/api/recordings?page=1&limit=20',
        headers: getAuthHeaders(testUser.id),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
            userId: testUser.id,
          }),
        ]),
        pagination: {
          page: 1,
          limit: 20,
          total: expect.any(Number),
          totalPages: expect.any(Number),
        },
      });
    });

    it('should paginate results', async () => {
      // Create multiple recordings
      for (let i = 0; i < 5; i++) {
        await createTestRecording(testUser.id, { title: `Recording ${i}` });
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/recordings?page=1&limit=2',
        headers: getAuthHeaders(testUser.id),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(2);
      expect(body.pagination.total).toBe(5);
    });

    it('should filter by status', async () => {
      await createTestRecording(testUser.id, { status: 'complete' });
      await createTestRecording(testUser.id, { status: 'processing' });

      const response = await app.inject({
        method: 'GET',
        url: '/api/recordings?status=complete',
        headers: getAuthHeaders(testUser.id),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.every((r: { status: string }) => r.status === 'complete')).toBe(true);
    });
  });

  describe('GET /api/recordings/:id', () => {
    it('should get recording by ID', async () => {
      const recording = await createTestRecording(testUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/recordings/${recording.id}`,
        headers: getAuthHeaders(testUser.id),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toMatchObject({
        id: recording.id,
        title: recording.title,
        userId: testUser.id,
      });
    });

    it('should return 404 for non-existent recording', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/recordings/non-existent-id',
        headers: getAuthHeaders(testUser.id),
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for recording belonging to another user', async () => {
      const otherUser = await createTestUser();
      const recording = await createTestRecording(otherUser.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/recordings/${recording.id}`,
        headers: getAuthHeaders(testUser.id),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/recordings/:id/complete-upload', () => {
    it('should complete upload and enqueue transcription job', async () => {
      const recording = await createTestRecording(testUser.id, {
        status: 'pending',
        objectKey: 'recordings/test/test.mp3',
      });

      // Mock S3 object exists
      mockS3StoragePut('recordings/test/test.mp3', {
        key: 'recordings/test/test.mp3',
        body: Buffer.from('test'),
      });
      mockS3StorageExists('recordings/test/test.mp3');

      const response = await app.inject({
        method: 'POST',
        url: `/api/recordings/${recording.id}/complete-upload`,
        headers: getAuthHeaders(testUser.id),
        payload: {
          fileSize: 1024,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        success: true,
        data: {
          recordingId: recording.id,
          jobId: expect.any(String),
          status: 'processing',
        },
      });
    });

    it('should reject if recording not in pending status', async () => {
      const recording = await createTestRecording(testUser.id, {
        status: 'complete',
        objectKey: 'recordings/test/test.mp3',
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/recordings/${recording.id}/complete-upload`,
        headers: getAuthHeaders(testUser.id),
        payload: {
          fileSize: 1024,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid State');
    });
  });
});
