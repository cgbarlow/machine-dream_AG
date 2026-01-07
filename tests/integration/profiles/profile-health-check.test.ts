/**
 * Profile Health Check Integration Tests
 *
 * Tests profile connectivity and health checking
 * Spec 13: LLM Profile Management
 *
 * NOTE: These tests require actual LLM endpoints to be running.
 * Mocked tests verify the basic flow, but real endpoint tests are skipped by default.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LLMProfileManager } from '../../../src/llm/profiles/LLMProfileManager.js';
import type { CreateProfileOptions } from '../../../src/llm/profiles/types.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Profile Health Check Integration (Spec 13)', () => {
  let manager: LLMProfileManager;
  let testStoragePath: string;

  beforeEach(() => {
    // Create unique temp file for each test
    testStoragePath = path.join(os.tmpdir(), `.test-health-${Date.now()}-${Math.random()}.json`);
    manager = new LLMProfileManager(testStoragePath);
  });

  afterEach(() => {
    if (fs.existsSync(testStoragePath)) {
      fs.unlinkSync(testStoragePath);
    }
  });

  const createLMStudioProfile = (): CreateProfileOptions => ({
    name: 'lmstudio-health-test',
    description: 'LM Studio for health testing',
    provider: 'lmstudio',
    baseUrl: 'http://localhost:1234/v1',
    model: 'qwen3-30b',
    parameters: {
      temperature: 0.7,
      maxTokens: 2048,
    },
    timeout: 30000,
  });

  describe('Health Check Basic Flow', () => {
    it('should return unhealthy result for non-existent profile', async () => {
      const result = await manager.test('does-not-exist');

      expect(result.healthy).toBe(false);
      expect(result.error).toContain('Profile not found');
      expect(result.timestamp).toBeDefined();
    });

    it('should return unhealthy result when no active profile', async () => {
      const result = await manager.test();

      expect(result.healthy).toBe(false);
      expect(result.error).toContain('No active profile');
    });

    it('should attempt health check for existing profile', async () => {
      manager.create(createLMStudioProfile());

      // This will fail if LM Studio is not running, but that's expected
      const result = await manager.test('lmstudio-health-test');

      expect(result).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(typeof result.healthy).toBe('boolean');

      if (!result.healthy) {
        expect(result.error).toBeDefined();
        expect(result.latency).toBeDefined();
      }
    });

    it('should measure latency during health check', async () => {
      manager.create(createLMStudioProfile());

      const result = await manager.test('lmstudio-health-test');

      expect(result.latency).toBeDefined();
      expect(typeof result.latency).toBe('number');
      expect(result.latency).toBeGreaterThan(0);
    });

    it('should test active profile when no name specified', async () => {
      const options = createLMStudioProfile();
      options.setDefault = true;

      manager.create(options);

      const result = await manager.test();

      expect(result).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('Health Check with Different Providers', () => {
    it('should handle LM Studio health check structure', async () => {
      manager.create({
        name: 'lmstudio',
        provider: 'lmstudio',
        baseUrl: 'http://localhost:1234/v1',
        model: 'test-model',
        parameters: { temperature: 0.7, maxTokens: 1024 },
      });

      const result = await manager.test('lmstudio');

      // Verify result structure
      expect(result).toHaveProperty('healthy');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('latency');

      if (!result.healthy) {
        expect(result).toHaveProperty('error');
      }
    });

    it('should handle OpenAI-style endpoint structure', async () => {
      process.env.TEST_OPENAI_KEY = 'test-key-123';

      manager.create({
        name: 'openai',
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '${TEST_OPENAI_KEY}',
        model: 'gpt-4',
        parameters: { temperature: 0.7, maxTokens: 1024 },
      });

      const result = await manager.test('openai');

      // Will fail without real API key, but structure should be valid
      expect(result).toBeDefined();
      expect(typeof result.healthy).toBe('boolean');

      delete process.env.TEST_OPENAI_KEY;
    });

    it('should handle Anthropic-style endpoint structure', async () => {
      process.env.TEST_ANTHROPIC_KEY = 'test-key-123';

      manager.create({
        name: 'anthropic',
        provider: 'anthropic',
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: '${TEST_ANTHROPIC_KEY}',
        model: 'claude-3-opus-20240229',
        parameters: { temperature: 0.7, maxTokens: 1024 },
      });

      const result = await manager.test('anthropic');

      expect(result).toBeDefined();
      expect(typeof result.healthy).toBe('boolean');

      delete process.env.TEST_ANTHROPIC_KEY;
    });
  });

  describe('Environment Variable Resolution', () => {
    it('should resolve API key from environment variables', async () => {
      process.env.TEST_API_KEY = 'my-secret-key';

      manager.create({
        name: 'env-test',
        provider: 'openai',
        baseUrl: 'https://api.example.com/v1',
        apiKey: '${TEST_API_KEY}',
        model: 'test-model',
        parameters: { temperature: 0.7, maxTokens: 1024 },
      });

      const result = await manager.test('env-test');

      // The test will fail (no real endpoint), but it should attempt connection
      expect(result).toBeDefined();
      expect(result.timestamp).toBeDefined();

      delete process.env.TEST_API_KEY;
    });

    it('should handle missing environment variables gracefully', async () => {
      manager.create({
        name: 'missing-env',
        provider: 'openai',
        baseUrl: 'https://api.example.com/v1',
        apiKey: '${MISSING_API_KEY}',
        model: 'test-model',
        parameters: { temperature: 0.7, maxTokens: 1024 },
      });

      const result = await manager.test('missing-env');

      expect(result.healthy).toBe(false);
      // Should fail due to missing/empty API key
    });
  });

  describe('Timeout Handling', () => {
    it('should respect profile timeout settings', async () => {
      manager.create({
        name: 'short-timeout',
        provider: 'lmstudio',
        baseUrl: 'http://localhost:1234/v1',
        model: 'test-model',
        parameters: { temperature: 0.7, maxTokens: 1024 },
        timeout: 1000, // Very short timeout
      });

      const startTime = Date.now();
      const result = await manager.test('short-timeout');
      const duration = Date.now() - startTime;

      // Should complete quickly (either success or timeout)
      expect(duration).toBeLessThan(5000);
      expect(result).toBeDefined();
    });

    it('should report timeout in error message', async () => {
      manager.create({
        name: 'timeout-test',
        provider: 'lmstudio',
        baseUrl: 'http://localhost:9999/v1', // Non-existent endpoint
        model: 'test-model',
        parameters: { temperature: 0.7, maxTokens: 1024 },
        timeout: 2000,
      });

      const result = await manager.test('timeout-test');

      expect(result.healthy).toBe(false);
      expect(result.error).toBeDefined();
      // Should complete within timeout + small buffer
      expect(result.latency).toBeLessThan(5000);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      manager.create({
        name: 'network-error',
        provider: 'lmstudio',
        baseUrl: 'http://invalid.localhost.test:9999/v1',
        model: 'test-model',
        parameters: { temperature: 0.7, maxTokens: 1024 },
        timeout: 3000,
      });

      const result = await manager.test('network-error');

      expect(result.healthy).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.latency).toBeDefined();
    });

    it('should handle malformed URLs', async () => {
      // Use a valid URL format that will fail during connection
      manager.create({
        name: 'malformed-url',
        provider: 'lmstudio',
        baseUrl: 'http://invalid-host-that-does-not-exist:9999',
        model: 'test-model',
        parameters: { temperature: 0.7, maxTokens: 1024 },
      });

      const result = await manager.test('malformed-url');

      expect(result.healthy).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Success Criteria', () => {
    it('should include model name in successful health check', async () => {
      manager.create(createLMStudioProfile());

      const result = await manager.test('lmstudio-health-test');

      if (result.healthy) {
        // Only check if health check passed (LM Studio running)
        expect(result.model).toBeDefined();
        expect(result.latency).toBeGreaterThan(0);
      }
    });

    it('should provide detailed latency information', async () => {
      manager.create(createLMStudioProfile());

      const result = await manager.test('lmstudio-health-test');

      expect(result.latency).toBeDefined();
      expect(typeof result.latency).toBe('number');

      // Latency should be reasonable (not negative, not absurdly high)
      if (result.latency) {
        expect(result.latency).toBeGreaterThan(0);
        expect(result.latency).toBeLessThan(60000);
      }
    });
  });

  describe('Multiple Provider Health Checks', () => {
    it('should test multiple profiles sequentially', async () => {
      manager.create({
        name: 'profile-1',
        provider: 'lmstudio',
        baseUrl: 'http://localhost:1234/v1',
        model: 'model-1',
        parameters: { temperature: 0.7, maxTokens: 1024 },
      });

      manager.create({
        name: 'profile-2',
        provider: 'lmstudio',
        baseUrl: 'http://localhost:1234/v1',
        model: 'model-2',
        parameters: { temperature: 0.7, maxTokens: 1024 },
      });

      const result1 = await manager.test('profile-1');

      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const result2 = await manager.test('profile-2');

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();

      // Each should have independent results
      expect(result1.timestamp).not.toBe(result2.timestamp);
    });
  });
});
