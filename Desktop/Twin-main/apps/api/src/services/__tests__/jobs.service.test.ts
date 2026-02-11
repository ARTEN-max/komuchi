import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  setupTestDatabase,
  teardownTestDatabase,
  cleanupDatabase,
  createTestUser,
  createTestRecording,
} from '../../__tests__/helpers/test-utils.js';
import {
  createJob,
  getJob,
  getJobsByRecording,
  updateJobStatus,
  hasActiveJob,
} from '../jobs.service.js';

describe('Jobs Service', () => {
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

  describe('createJob', () => {
    it('should create a new job with pending status', async () => {
      const recording = await createTestRecording(testUser.id);

      const job = await createJob({
        recordingId: recording.id,
        type: 'TRANSCRIBE',
      });

      expect(job).toMatchObject({
        id: expect.any(String),
        recordingId: recording.id,
        type: 'TRANSCRIBE',
        status: 'pending',
      });
    });
  });

  describe('getJob', () => {
    it('should get job by ID', async () => {
      const recording = await createTestRecording(testUser.id);
      const job = await createJob({
        recordingId: recording.id,
        type: 'TRANSCRIBE',
      });

      const result = await getJob(job.id);

      expect(result).toMatchObject({
        id: job.id,
        recordingId: recording.id,
      });
    });

    it('should return null for non-existent job', async () => {
      const result = await getJob('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('getJobsByRecording', () => {
    it('should get all jobs for a recording', async () => {
      const recording = await createTestRecording(testUser.id);
      await createJob({ recordingId: recording.id, type: 'TRANSCRIBE' });
      await createJob({ recordingId: recording.id, type: 'DEBRIEF' });

      const jobs = await getJobsByRecording(recording.id);

      expect(jobs).toHaveLength(2);
    });
  });

  describe('updateJobStatus', () => {
    it('should update job status to running', async () => {
      const recording = await createTestRecording(testUser.id);
      const job = await createJob({
        recordingId: recording.id,
        type: 'TRANSCRIBE',
      });

      const updated = await updateJobStatus(job.id, 'running');

      expect(updated.status).toBe('running');
      expect(updated.startedAt).toBeDefined();
    });

    it('should update job status to complete', async () => {
      const recording = await createTestRecording(testUser.id);
      const job = await createJob({
        recordingId: recording.id,
        type: 'TRANSCRIBE',
      });

      const updated = await updateJobStatus(job.id, 'complete');

      expect(updated.status).toBe('complete');
      expect(updated.completedAt).toBeDefined();
    });

    it('should update job status to failed with error', async () => {
      const recording = await createTestRecording(testUser.id);
      const job = await createJob({
        recordingId: recording.id,
        type: 'TRANSCRIBE',
      });

      const updated = await updateJobStatus(job.id, 'failed', 'Test error');

      expect(updated.status).toBe('failed');
      expect(updated.error).toBe('Test error');
      expect(updated.completedAt).toBeDefined();
    });
  });

  describe('hasActiveJob', () => {
    it('should return true if active job exists', async () => {
      const recording = await createTestRecording(testUser.id);
      await createJob({ recordingId: recording.id, type: 'TRANSCRIBE' });

      const hasActive = await hasActiveJob(recording.id, 'TRANSCRIBE');

      expect(hasActive).toBe(true);
    });

    it('should return false if no active job exists', async () => {
      const recording = await createTestRecording(testUser.id);

      const hasActive = await hasActiveJob(recording.id, 'TRANSCRIBE');

      expect(hasActive).toBe(false);
    });
  });
});
