/**
 * LLMProfileManager Unit Tests
 *
 * Tests the profile manager orchestration layer
 * Spec 13: LLM Profile Management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LLMProfileManager } from '../../../src/llm/profiles/LLMProfileManager.js';
import type { CreateProfileOptions } from '../../../src/llm/profiles/types.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

let managerTestCounter = 0;

// Generate unique name for each test run
function generateUniqueName(base: string = 'test-profile'): string {
  return `${base}-${process.pid}-${managerTestCounter}-${Math.random().toString(36).substring(7)}`;
}

describe('LLMProfileManager (Spec 13)', () => {
  let manager: LLMProfileManager;
  let testStoragePath: string;

  beforeEach(() => {
    // Create unique temp file for each test using counter
    managerTestCounter++;
    testStoragePath = path.join(os.tmpdir(), `.test-manager-${process.pid}-${managerTestCounter}-${Date.now()}.json`);
    manager = new LLMProfileManager(testStoragePath);
  });

  afterEach(() => {
    // Clean up test file
    if (fs.existsSync(testStoragePath)) {
      fs.unlinkSync(testStoragePath);
    }
  });

  const createTestOptions = (name?: string): CreateProfileOptions => ({
    name: name || generateUniqueName(),
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

  describe('Profile Creation', () => {
    it('should create a new profile successfully', () => {
      const options = createTestOptions();
      const { profile, validation } = manager.create(options);

      expect(profile.name).toBe('test-profile');
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should apply default parameters when not provided', () => {
      const options = createTestOptions();
      delete options.parameters;

      const { profile } = manager.create(options);

      expect(profile.parameters.temperature).toBe(0.7);
      expect(profile.parameters.maxTokens).toBe(2048);
    });

    it('should apply default timeout and retries', () => {
      const options = createTestOptions();
      delete options.timeout;
      delete options.retries;

      const { profile } = manager.create(options);

      expect(profile.timeout).toBe(60000);
      expect(profile.retries).toBe(3);
    });

    it('should set createdAt timestamp', () => {
      const before = Date.now();
      const { profile } = manager.create(createTestOptions());
      const after = Date.now();

      expect(profile.createdAt).toBeGreaterThanOrEqual(before);
      expect(profile.createdAt).toBeLessThanOrEqual(after);
    });

    it('should initialize usage tracking', () => {
      const { profile } = manager.create(createTestOptions());

      expect(profile.usageCount).toBe(0);
      expect(profile.lastUsed).toBeUndefined();
    });

    it('should set as active when setDefault is true', () => {
      const options = createTestOptions();
      options.setDefault = true;

      manager.create(options);

      const active = manager.getActive();
      expect(active?.name).toBe('test-profile');
    });

    it('should throw error when creating duplicate profile', () => {
      const options = createTestOptions();
      manager.create(options);

      expect(() => {
        manager.create(options);
      }).toThrow('Profile already exists');
    });

    it('should throw error for invalid profile', () => {
      const options = createTestOptions();
      options.name = 'invalid name!';

      expect(() => {
        manager.create(options);
      }).toThrow('Profile validation failed');
    });
  });

  describe('Profile Retrieval', () => {
    beforeEach(() => {
      manager.create(createTestOptions('profile-1'));
      manager.create(createTestOptions('profile-2'));
      manager.create(createTestOptions('profile-3'));
    });

    it('should get profile by name', () => {
      const profile = manager.get('profile-2');
      expect(profile?.name).toBe('profile-2');
    });

    it('should return undefined for non-existent profile', () => {
      const profile = manager.get('does-not-exist');
      expect(profile).toBeUndefined();
    });

    it('should list all profiles', () => {
      const profiles = manager.list();
      expect(profiles).toHaveLength(3);
    });

    it('should check if profile exists', () => {
      expect(manager.exists('profile-1')).toBe(true);
      expect(manager.exists('profile-999')).toBe(false);
    });

    it('should get profile count', () => {
      expect(manager.count()).toBe(3);
    });
  });

  describe('Active Profile Management', () => {
    beforeEach(() => {
      manager.create(createTestOptions('profile-1'));
      manager.create(createTestOptions('profile-2'));
    });

    it('should set active profile', () => {
      manager.setActive('profile-1');

      const active = manager.getActive();
      expect(active?.name).toBe('profile-1');
    });

    it('should return undefined when no active profile', () => {
      const active = manager.getActive();
      expect(active).toBeUndefined();
    });

    it('should update lastUsed timestamp when setting active', () => {
      const before = Date.now();
      manager.setActive('profile-1');
      const after = Date.now();

      const profile = manager.get('profile-1');
      expect(profile?.lastUsed).toBeGreaterThanOrEqual(before);
      expect(profile?.lastUsed).toBeLessThanOrEqual(after);
    });

    it('should throw error when setting non-existent profile as active', () => {
      expect(() => {
        manager.setActive('does-not-exist');
      }).toThrow('Profile not found');
    });
  });

  describe('Profile Update', () => {
    beforeEach(() => {
      manager.create(createTestOptions('test-profile'));
    });

    it('should update profile description', () => {
      const { profile } = manager.update('test-profile', {
        description: 'Updated description',
      });

      expect(profile.description).toBe('Updated description');
    });

    it('should update model parameters', () => {
      const { profile } = manager.update('test-profile', {
        parameters: { temperature: 0.9 },
      });

      expect(profile.parameters.temperature).toBe(0.9);
    });

    it('should merge parameter updates', () => {
      const { profile } = manager.update('test-profile', {
        parameters: { temperature: 0.9 },
      });

      expect(profile.parameters.temperature).toBe(0.9);
      expect(profile.parameters.maxTokens).toBe(2048); // Original value preserved
    });

    it('should update multiple fields', () => {
      const { profile } = manager.update('test-profile', {
        description: 'New description',
        model: 'new-model',
        timeout: 90000,
      });

      expect(profile.description).toBe('New description');
      expect(profile.model).toBe('new-model');
      expect(profile.timeout).toBe(90000);
    });

    it('should set as active when setDefault is true', () => {
      manager.create(createTestOptions('profile-2'));
      manager.setActive('profile-2');

      manager.update('test-profile', { setDefault: true });

      const active = manager.getActive();
      expect(active?.name).toBe('test-profile');
    });

    it('should throw error when updating non-existent profile', () => {
      expect(() => {
        manager.update('does-not-exist', { description: 'New' });
      }).toThrow('Profile not found');
    });

    it('should validate updated profile', () => {
      expect(() => {
        manager.update('test-profile', {
          parameters: { temperature: 5.0 },
        });
      }).toThrow('Profile validation failed');
    });
  });

  describe('Profile Deletion', () => {
    beforeEach(() => {
      manager.create(createTestOptions('profile-1'));
      manager.create(createTestOptions('profile-2'));
    });

    it('should delete existing profile', () => {
      const deleted = manager.delete('profile-1');

      expect(deleted).toBe(true);
      expect(manager.exists('profile-1')).toBe(false);
      expect(manager.count()).toBe(1);
    });

    it('should return false when deleting non-existent profile', () => {
      const deleted = manager.delete('does-not-exist');
      expect(deleted).toBe(false);
    });
  });

  describe('Usage Tracking', () => {
    beforeEach(() => {
      manager.create(createTestOptions('test-profile'));
    });

    it('should record profile usage', () => {
      manager.recordUsage('test-profile');

      const profile = manager.get('test-profile');
      expect(profile?.usageCount).toBe(1);
    });

    it('should increment usage count on multiple uses', () => {
      manager.recordUsage('test-profile');
      manager.recordUsage('test-profile');
      manager.recordUsage('test-profile');

      const profile = manager.get('test-profile');
      expect(profile?.usageCount).toBe(3);
    });

    it('should update lastUsed timestamp', () => {
      const before = Date.now();
      manager.recordUsage('test-profile');
      const after = Date.now();

      const profile = manager.get('test-profile');
      expect(profile?.lastUsed).toBeGreaterThanOrEqual(before);
      expect(profile?.lastUsed).toBeLessThanOrEqual(after);
    });
  });

  describe('Filtering and Sorting', () => {
    beforeEach(() => {
      manager.create({ ...createTestOptions('lmstudio-1'), tags: ['local', 'dev'] });
      manager.create({ ...createTestOptions('openai-1'), provider: 'openai', tags: ['cloud', 'prod'] });
      manager.create({ ...createTestOptions('lmstudio-2'), tags: ['local', 'test'] });

      // Add usage
      manager.recordUsage('lmstudio-1');
      manager.recordUsage('lmstudio-1');
      manager.recordUsage('openai-1');
    });

    it('should filter by tags', () => {
      const local = manager.filterByTags(['local']);
      expect(local).toHaveLength(2);
      expect(local.every(p => p.tags.includes('local'))).toBe(true);
    });

    it('should filter by provider', () => {
      const lmstudio = manager.filterByProvider('lmstudio');
      expect(lmstudio).toHaveLength(2);

      const openai = manager.filterByProvider('openai');
      expect(openai).toHaveLength(1);
    });

    it('should sort by usage count', () => {
      const sorted = manager.sortByUsage();

      expect(sorted[0].name).toBe('lmstudio-1');
      expect(sorted[0].usageCount).toBe(2);
      expect(sorted[1].usageCount).toBe(1);
      expect(sorted[2].usageCount).toBe(0);
    });

    it('should sort by last used', () => {
      // Wait a bit and use another profile
      manager.recordUsage('openai-1');

      const sorted = manager.sortByLastUsed();
      expect(sorted[0].name).toBe('openai-1');
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      manager.create(createTestOptions('lmstudio-1'));
      manager.create({ ...createTestOptions('lmstudio-2'), provider: 'lmstudio' });
      manager.create({ ...createTestOptions('openai-1'), provider: 'openai' });

      manager.recordUsage('lmstudio-1');
      manager.recordUsage('lmstudio-1');
      manager.recordUsage('openai-1');

      manager.setActive('lmstudio-1');
    });

    it('should get profile statistics', () => {
      const stats = manager.getStats();

      expect(stats.total).toBe(3);
      expect(stats.totalUsage).toBe(3);
      expect(stats.activeProfile).toBe('lmstudio-1');
    });

    it('should count profiles by provider', () => {
      const stats = manager.getStats();

      expect(stats.byProvider.lmstudio).toBe(2);
      expect(stats.byProvider.openai).toBe(1);
    });
  });

  describe('Export/Import', () => {
    beforeEach(() => {
      manager.create({ ...createTestOptions('profile-1'), apiKey: 'secret-1' });
      manager.create({ ...createTestOptions('profile-2'), apiKey: 'secret-2' });
    });

    it('should export without secrets by default', () => {
      const exported = manager.export();
      const data = JSON.parse(exported);

      expect(data.profiles['profile-1'].apiKey).toBe('${API_KEY}');
      expect(data.includesSecrets).toBe(false);
    });

    it('should export with secrets when requested', () => {
      const exported = manager.export({ includeSecrets: true });
      const data = JSON.parse(exported);

      expect(data.profiles['profile-1'].apiKey).toBe('secret-1');
      expect(data.includesSecrets).toBe(true);
    });

    it('should export specific profiles only', () => {
      const exported = manager.export({ profiles: ['profile-1'] });
      const data = JSON.parse(exported);

      expect(Object.keys(data.profiles)).toEqual(['profile-1']);
    });

    it('should import profiles successfully', () => {
      const newManager = new LLMProfileManager(
        path.join(os.tmpdir(), '.test-import-manager.json')
      );

      const exported = manager.export({ includeSecrets: true });
      const result = newManager.import(exported);

      expect(result.imported).toHaveLength(2);
      expect(result.skipped).toHaveLength(0);
      expect(result.errors).toHaveLength(0);

      // Clean up
      fs.unlinkSync(newManager.getStoragePath());
    });

    it('should skip existing profiles when importing without overwrite', () => {
      const exported = manager.export({ includeSecrets: true });
      const result = manager.import(exported, false);

      expect(result.imported).toHaveLength(0);
      expect(result.skipped).toHaveLength(2);
    });

    it('should handle import errors gracefully', () => {
      const result = manager.import('invalid json{{{');

      expect(result.imported).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Storage Path', () => {
    it('should return storage file path', () => {
      expect(manager.getStoragePath()).toBe(testStoragePath);
    });
  });
});
