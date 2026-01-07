/**
 * ProfileValidator Unit Tests
 *
 * Tests profile validation logic
 * Spec 13: LLM Profile Management
 */

import { describe, it, expect } from 'vitest';
import { ProfileValidator } from '../../../src/llm/profiles/ProfileValidator.js';
import type { LLMProfile } from '../../../src/llm/profiles/types.js';

describe('ProfileValidator (Spec 13)', () => {
  const createValidProfile = (): Partial<LLMProfile> => ({
    name: 'test-profile',
    description: 'Test profile',
    provider: 'lmstudio',
    baseUrl: 'http://localhost:1234/v1',
    model: 'qwen3-30b',
    parameters: {
      temperature: 0.7,
      maxTokens: 2048,
    },
    timeout: 60000,
    retries: 3,
    tags: ['test'],
  });

  describe('Profile Validation', () => {
    it('should validate a correct profile', () => {
      const profile = createValidProfile();
      const result = ProfileValidator.validate(profile);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing name', () => {
      const profile = createValidProfile();
      delete profile.name;

      const result = ProfileValidator.validate(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Profile name is required');
    });

    it('should fail validation for empty name', () => {
      const profile = createValidProfile();
      profile.name = '   ';

      const result = ProfileValidator.validate(profile);
      expect(result.valid).toBe(false);
    });

    it('should fail validation for invalid name characters', () => {
      const profile = createValidProfile();
      profile.name = 'invalid name!@#';

      const result = ProfileValidator.validate(profile);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('must contain only'))).toBe(true);
    });

    it('should allow valid name characters (letters, numbers, hyphens, underscores)', () => {
      const validNames = ['profile-1', 'my_profile', 'Profile123', 'test-profile_v2'];

      validNames.forEach(name => {
        const profile = createValidProfile();
        profile.name = name;
        const result = ProfileValidator.validate(profile);
        expect(result.valid).toBe(true);
      });
    });

    it('should fail validation for missing provider', () => {
      const profile = createValidProfile();
      delete profile.provider;

      const result = ProfileValidator.validate(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Provider is required');
    });

    it('should fail validation for invalid provider', () => {
      const profile = createValidProfile();
      profile.provider = 'invalid-provider' as any;

      const result = ProfileValidator.validate(profile);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid provider'))).toBe(true);
    });

    it('should accept all valid providers', () => {
      const validProviders = ['lmstudio', 'openai', 'anthropic', 'ollama', 'openrouter', 'custom'];

      validProviders.forEach(provider => {
        const profile = createValidProfile();
        profile.provider = provider as any;
        const result = ProfileValidator.validate(profile);
        expect(result.valid).toBe(true);
      });
    });

    it('should fail validation for missing baseUrl', () => {
      const profile = createValidProfile();
      delete profile.baseUrl;

      const result = ProfileValidator.validate(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Base URL is required');
    });

    it('should fail validation for invalid baseUrl', () => {
      const invalidUrls = ['not-a-url', 'ftp://invalid', 'localhost:1234'];

      invalidUrls.forEach(url => {
        const profile = createValidProfile();
        profile.baseUrl = url;
        const result = ProfileValidator.validate(profile);
        expect(result.valid).toBe(false);
      });
    });

    it('should accept valid HTTP and HTTPS URLs', () => {
      const validUrls = [
        'http://localhost:1234/v1',
        'https://api.openai.com/v1',
        'http://192.168.1.100:8080',
      ];

      validUrls.forEach(url => {
        const profile = createValidProfile();
        profile.baseUrl = url;
        const result = ProfileValidator.validate(profile);
        expect(result.valid).toBe(true);
      });
    });

    it('should fail validation for missing model', () => {
      const profile = createValidProfile();
      delete profile.model;

      const result = ProfileValidator.validate(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Model name is required');
    });
  });

  describe('Parameter Validation', () => {
    it('should validate temperature range', () => {
      const profile = createValidProfile();
      profile.parameters!.temperature = 2.5;

      const result = ProfileValidator.validate(profile);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Temperature'))).toBe(true);
    });

    it('should accept valid temperature values', () => {
      const validTemps = [0, 0.5, 1.0, 1.5, 2.0];

      validTemps.forEach(temp => {
        const profile = createValidProfile();
        profile.parameters!.temperature = temp;
        const result = ProfileValidator.validate(profile);
        expect(result.valid).toBe(true);
      });
    });

    it('should validate maxTokens range', () => {
      const invalidTokens = [0, -1, 40000];

      invalidTokens.forEach(tokens => {
        const profile = createValidProfile();
        profile.parameters!.maxTokens = tokens;
        const result = ProfileValidator.validate(profile);
        expect(result.valid).toBe(false);
      });
    });

    it('should accept valid maxTokens', () => {
      const validTokens = [1, 1024, 4096, 32768];

      validTokens.forEach(tokens => {
        const profile = createValidProfile();
        profile.parameters!.maxTokens = tokens;
        const result = ProfileValidator.validate(profile);
        expect(result.valid).toBe(true);
      });
    });

    it('should validate topP range', () => {
      const profile = createValidProfile();
      profile.parameters!.topP = 1.5;

      const result = ProfileValidator.validate(profile);
      expect(result.valid).toBe(false);
    });

    it('should validate frequencyPenalty range', () => {
      const profile = createValidProfile();
      profile.parameters!.frequencyPenalty = 3.0;

      const result = ProfileValidator.validate(profile);
      expect(result.valid).toBe(false);
    });

    it('should validate presencePenalty range', () => {
      const profile = createValidProfile();
      profile.parameters!.presencePenalty = -3.0;

      const result = ProfileValidator.validate(profile);
      expect(result.valid).toBe(false);
    });

    it('should validate stop sequences as array', () => {
      const profile = createValidProfile();
      profile.parameters!.stop = 'not-an-array' as any;

      const result = ProfileValidator.validate(profile);
      expect(result.valid).toBe(false);
    });

    it('should validate stop sequences are strings', () => {
      const profile = createValidProfile();
      profile.parameters!.stop = [123, 456] as any;

      const result = ProfileValidator.validate(profile);
      expect(result.valid).toBe(false);
    });
  });

  describe('Timeout and Retries Validation', () => {
    it('should fail validation for timeout too short', () => {
      const profile = createValidProfile();
      profile.timeout = 500;

      const result = ProfileValidator.validate(profile);
      expect(result.valid).toBe(false);
    });

    it('should fail validation for timeout too long', () => {
      const profile = createValidProfile();
      profile.timeout = 400000;

      const result = ProfileValidator.validate(profile);
      expect(result.valid).toBe(false);
    });

    it('should accept valid timeout values', () => {
      const validTimeouts = [1000, 30000, 60000, 300000];

      validTimeouts.forEach(timeout => {
        const profile = createValidProfile();
        profile.timeout = timeout;
        const result = ProfileValidator.validate(profile);
        expect(result.valid).toBe(true);
      });
    });

    it('should fail validation for invalid retries', () => {
      const invalidRetries = [-1, 11];

      invalidRetries.forEach(retries => {
        const profile = createValidProfile();
        profile.retries = retries;
        const result = ProfileValidator.validate(profile);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('Warnings', () => {
    it('should warn about missing API key for OpenAI', () => {
      const profile = createValidProfile();
      profile.provider = 'openai';
      delete profile.apiKey;

      const result = ProfileValidator.validate(profile);
      expect(result.warnings.some(w => w.includes('API key is recommended'))).toBe(true);
    });

    it('should not warn about missing API key for LM Studio', () => {
      const profile = createValidProfile();
      profile.provider = 'lmstudio';
      delete profile.apiKey;

      const result = ProfileValidator.validate(profile);
      expect(result.warnings.some(w => w.includes('API key'))).toBe(false);
    });

    it('should warn about plain text API keys', () => {
      const profile = createValidProfile();
      profile.apiKey = 'sk-1234567890';

      const result = ProfileValidator.validate(profile);
      expect(result.warnings.some(w => w.includes('environment variable reference'))).toBe(true);
    });

    it('should not warn about environment variable API keys', () => {
      const profile = createValidProfile();
      profile.apiKey = '${OPENAI_API_KEY}';

      const result = ProfileValidator.validate(profile);
      expect(result.warnings.some(w => w.includes('environment variable'))).toBe(false);
    });

    it('should warn about missing description', () => {
      const profile = createValidProfile();
      delete profile.description;

      const result = ProfileValidator.validate(profile);
      expect(result.warnings.some(w => w.includes('description'))).toBe(true);
    });

    it('should warn about missing tags', () => {
      const profile = createValidProfile();
      profile.tags = [];

      const result = ProfileValidator.validate(profile);
      expect(result.warnings.some(w => w.includes('tags'))).toBe(true);
    });
  });

  describe('Profile Name Validation', () => {
    it('should validate correct profile names', () => {
      const validNames = ['profile-1', 'my_profile', 'Test123'];

      validNames.forEach(name => {
        const result = ProfileValidator.validateProfileName(name);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject empty names', () => {
      const result = ProfileValidator.validateProfileName('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should reject names with invalid characters', () => {
      const result = ProfileValidator.validateProfileName('invalid name!');
      expect(result.valid).toBe(false);
    });

    it('should reject names too long', () => {
      const longName = 'a'.repeat(65);
      const result = ProfileValidator.validateProfileName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('64 characters');
    });
  });

  describe('Provider Validation', () => {
    it('should validate correct providers', () => {
      const validProviders = ['lmstudio', 'openai', 'anthropic'];

      validProviders.forEach(provider => {
        const result = ProfileValidator.validateProvider(provider);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid providers', () => {
      const result = ProfileValidator.validateProvider('invalid-provider');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid provider');
    });
  });

  describe('API Key Resolution', () => {
    it('should resolve environment variable references', () => {
      process.env.TEST_API_KEY = 'test-secret-key';

      const resolved = ProfileValidator.resolveApiKey('${TEST_API_KEY}');
      expect(resolved).toBe('test-secret-key');

      delete process.env.TEST_API_KEY;
    });

    it('should return plain text API keys as-is', () => {
      const resolved = ProfileValidator.resolveApiKey('sk-1234567890');
      expect(resolved).toBe('sk-1234567890');
    });

    it('should return empty string for missing environment variable', () => {
      const resolved = ProfileValidator.resolveApiKey('${MISSING_VAR}');
      expect(resolved).toBe('');
    });

    it('should detect environment variable references', () => {
      expect(ProfileValidator.isEnvVarReference('${API_KEY}')).toBe(true);
      expect(ProfileValidator.isEnvVarReference('sk-1234')).toBe(false);
    });
  });
});
