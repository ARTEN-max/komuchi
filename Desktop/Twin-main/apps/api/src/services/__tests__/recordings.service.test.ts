import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  setupTestDatabase,
  teardownTestDatabase,
  cleanupDatabase,
  createTestUser,
  createTestRecording,
} from '../../__tests__/helpers/test-utils.js';
import {
  createRecording,
  getRecordingByUser,
  listRecordingsByUser,
  updateRecordingStatus,
  setRecordingObjectKey,
  completeUpload,
} from '../recordings.service.js';

describe('Recordings Service', () => {
  let testUser: Awaited<ReturnType<typeof createTestUser>>;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanupDatabase();
    testUser = await createTestUser();
  });

  describe('createRecording', () => {
    it('should create a new recording with pending status', async () => {
      const recording = await createRecording({
        userId: testUser.id,
        title: 'Test Recording',
        mode: 'general',
        mimeType: 'audio/mpeg',
      });

      expect(recording).toMatchObject({
        id: expect.any(String),
        userId: testUser.id,
        title: 'Test Recording',
        mode: 'general',
        status: 'pending',
        mimeType: 'audio/mpeg',
      });
    });
  });

  describe('getRecordingByUser', () => {
    it('should get recording by ID for user', async () => {
      const recording = await createTestRecording(testUser.id);

      const result = await getRecordingByUser(recording.id, testUser.id);

      expect(result).toMatchObject({
        id: recording.id,
        userId: testUser.id,
      });
    });

    it('should return null for non-existent recording', async () => {
      const result = await getRecordingByUser('non-existent-id', testUser.id);
      expect(result).toBeNull();
    });

    it('should return null for recording belonging to another user', async () => {
      const otherUser = await createTestUser();
      const recording = await createTestRecording(otherUser.id);

      const result = await getRecordingByUser(recording.id, testUser.id);
      expect(result).toBeNull();
    });
  });

  describe('listRecordingsByUser', () => {
    it('should list recordings for user', async () => {
      await createTestRecording(testUser.id, { title: 'Recording 1' });
      await createTestRecording(testUser.id, { title: 'Recording 2' });

      const result = await listRecordingsByUser(testUser.id, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should paginate results', async () => {
      for (let i = 0; i < 5; i++) {
        await createTestRecording(testUser.id, { title: `Recording ${i}` });
      }

      const result = await listRecordingsByUser(testUser.id, { page: 1, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.totalPages).toBe(3);
    });

    it('should filter by status', async () => {
      await createTestRecording(testUser.id, { status: 'complete' });
      await createTestRecording(testUser.id, { status: 'processing' });

      const result = await listRecordingsByUser(testUser.id, {
        page: 1,
        limit: 20,
        status: 'complete',
      });

      expect(result.data.every((r) => r.status === 'complete')).toBe(true);
    });
  });

  describe('updateRecordingStatus', () => {
    it('should update recording status', async () => {
      const recording = await createTestRecording(testUser.id, { status: 'pending' });

      const updated = await updateRecordingStatus(recording.id, 'processing');

      expect(updated.status).toBe('processing');
    });
  });

  describe('setRecordingObjectKey', () => {
    it('should set object key on recording', async () => {
      const recording = await createTestRecording(testUser.id);
      const objectKey = 'recordings/test/test.mp3';

      const updated = await setRecordingObjectKey(recording.id, objectKey);

      expect(updated.objectKey).toBe(objectKey);
    });
  });

  describe('completeUpload', () => {
    it('should mark upload as complete', async () => {
      const recording = await createTestRecording(testUser.id, { status: 'pending' });

      const updated = await completeUpload(recording.id, 1024);

      expect(updated.status).toBe('uploaded');
      expect(updated.fileSize).toBe(1024);
    });
  });
});
