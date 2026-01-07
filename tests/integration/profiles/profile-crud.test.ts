/**
 * Profile CRUD Integration Tests
 *
 * Tests complete profile lifecycle: Create, Read, Update, Delete
 * Spec 13: LLM Profile Management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LLMProfileManager } from '../../../src/llm/profiles/LLMProfileManager.js';
import { getLLMConfig } from '../../../src/llm/config.js';
import type { CreateProfileOptions } from '../../../src/llm/profiles/types.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Profile CRUD Integration (Spec 13)', () => {
  let manager: LLMProfileManager;
  let testStoragePath: string;

  beforeEach(() => {
    // Create unique temp file for each test
    testStoragePath = path.join(os.tmpdir(), `.test-crud-${Date.now()}-${Math.random()}.json`);
    manager = new LLMProfileManager(testStoragePath);
  });

  afterEach(() => {
    if (fs.existsSync(testStoragePath)) {
      fs.unlinkSync(testStoragePath);
    }
  });

  const createProfileOptions = (name: string, provider: 'lmstudio' | 'openai' = 'lmstudio'): CreateProfileOptions => ({
    name,
    description: `${provider} profile for testing`,
    provider,
    baseUrl: provider === 'lmstudio' ? 'http://localhost:1234/v1' : 'https://api.openai.com/v1',
    apiKey: provider === 'lmstudio' ? undefined : '${OPENAI_API_KEY}',
    model: provider === 'lmstudio' ? 'qwen3-30b' : 'gpt-4',
    parameters: {
      temperature: 0.7,
      maxTokens: 2048,
    },
    timeout: 60000,
    tags: [provider, 'test'],
  });

  describe('Complete Profile Lifecycle', () => {
    it('should handle full CRUD lifecycle for a profile', () => {
      // CREATE
      const createOptions = createProfileOptions('lifecycle-profile');
      const { profile: created } = manager.create(createOptions);

      expect(created.name).toBe('lifecycle-profile');
      expect(created.provider).toBe('lmstudio');
      expect(created.usageCount).toBe(0);

      // READ
      const retrieved = manager.get('lifecycle-profile');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('lifecycle-profile');

      // UPDATE
      const { profile: updated } = manager.update('lifecycle-profile', {
        description: 'Updated description',
        parameters: { temperature: 0.9 },
      });

      expect(updated.description).toBe('Updated description');
      expect(updated.parameters.temperature).toBe(0.9);

      // DELETE
      const deleted = manager.delete('lifecycle-profile');
      expect(deleted).toBe(true);

      const afterDelete = manager.get('lifecycle-profile');
      expect(afterDelete).toBeUndefined();
    });
  });

  describe('Multi-Profile Management', () => {
    it('should manage multiple profiles with different providers', () => {
      // Create multiple profiles
      manager.create(createProfileOptions('lmstudio-dev', 'lmstudio'));
      manager.create(createProfileOptions('lmstudio-prod', 'lmstudio'));
      manager.create(createProfileOptions('openai-dev', 'openai'));
      manager.create(createProfileOptions('openai-prod', 'openai'));

      // Verify all created
      expect(manager.count()).toBe(4);

      // Filter by provider
      const lmstudioProfiles = manager.filterByProvider('lmstudio');
      const openaiProfiles = manager.filterByProvider('openai');

      expect(lmstudioProfiles).toHaveLength(2);
      expect(openaiProfiles).toHaveLength(2);

      // Filter by tags
      const devProfiles = manager.filterByTags(['test']);
      expect(devProfiles).toHaveLength(4);
    });

    it('should handle active profile switching', () => {
      manager.create(createProfileOptions('profile-1'));
      manager.create(createProfileOptions('profile-2'));
      manager.create(createProfileOptions('profile-3'));

      // Set profile-1 as active
      manager.setActive('profile-1');
      let active = manager.getActive();
      expect(active?.name).toBe('profile-1');

      // Switch to profile-2
      manager.setActive('profile-2');
      active = manager.getActive();
      expect(active?.name).toBe('profile-2');

      // Verify profile-1 is no longer active
      const profile1 = manager.get('profile-1');
      expect(profile1?.isDefault).toBe(false);

      // Verify profile-2 is active
      const profile2 = manager.get('profile-2');
      expect(profile2?.isDefault).toBe(true);
    });
  });

  describe('Usage Tracking Integration', () => {
    it('should track usage across multiple operations', () => {
      manager.create(createProfileOptions('tracked-profile'));

      // Initial state
      let profile = manager.get('tracked-profile');
      expect(profile?.usageCount).toBe(0);
      expect(profile?.lastUsed).toBeUndefined();

      // Record usage multiple times
      manager.recordUsage('tracked-profile');
      profile = manager.get('tracked-profile');
      expect(profile?.usageCount).toBe(1);
      expect(profile?.lastUsed).toBeDefined();

      const firstUsedTime = profile!.lastUsed!;

      // Wait a tiny bit and use again
      manager.recordUsage('tracked-profile');
      profile = manager.get('tracked-profile');
      expect(profile?.usageCount).toBe(2);
      expect(profile?.lastUsed).toBeGreaterThanOrEqual(firstUsedTime);

      // Setting as active should also update lastUsed
      manager.setActive('tracked-profile');
      profile = manager.get('tracked-profile');
      expect(profile?.lastUsed).toBeGreaterThanOrEqual(firstUsedTime);
    });

    it('should sort profiles by usage correctly', () => {
      manager.create(createProfileOptions('low-usage'));
      manager.create(createProfileOptions('high-usage'));
      manager.create(createProfileOptions('medium-usage'));

      // Generate different usage patterns
      manager.recordUsage('high-usage');
      manager.recordUsage('high-usage');
      manager.recordUsage('high-usage');

      manager.recordUsage('medium-usage');
      manager.recordUsage('medium-usage');

      // Sort and verify
      const sorted = manager.sortByUsage();

      expect(sorted[0].name).toBe('high-usage');
      expect(sorted[0].usageCount).toBe(3);

      expect(sorted[1].name).toBe('medium-usage');
      expect(sorted[1].usageCount).toBe(2);

      expect(sorted[2].name).toBe('low-usage');
      expect(sorted[2].usageCount).toBe(0);
    });
  });

  describe('Config Integration', () => {
    it('should integrate with getLLMConfig for active profile', () => {
      // Create profile with specific config
      const options = createProfileOptions('config-test');
      options.parameters = {
        temperature: 0.8,
        maxTokens: 4096,
      };
      options.timeout = 90000;
      options.setDefault = true;

      manager.create(options);

      // Get config through config system
      const config = getLLMConfig();

      expect(config.baseUrl).toBe('http://localhost:1234/v1');
      expect(config.model).toBe('qwen3-30b');
      expect(config.temperature).toBe(0.8);
      expect(config.maxTokens).toBe(4096);
      expect(config.timeout).toBe(90000);
    });

    it('should integrate with getLLMConfig for specific profile', () => {
      manager.create(createProfileOptions('profile-1'));
      manager.create({
        ...createProfileOptions('profile-2'),
        parameters: { temperature: 0.5, maxTokens: 1024 },
      });

      // Set profile-1 as active
      manager.setActive('profile-1');

      // Get config for specific profile (not active)
      const config = getLLMConfig('profile-2');

      expect(config.temperature).toBe(0.5);
      expect(config.maxTokens).toBe(1024);
    });
  });

  describe('Export/Import Integration', () => {
    it('should export and import profiles preserving data', () => {
      // Create profiles with various configurations
      manager.create({
        ...createProfileOptions('profile-1', 'lmstudio'),
        tags: ['local', 'dev'],
      });

      manager.create({
        ...createProfileOptions('profile-2', 'openai'),
        tags: ['cloud', 'prod'],
      });

      manager.setActive('profile-1');
      manager.recordUsage('profile-1');
      manager.recordUsage('profile-2');

      // Export
      const exported = manager.export({ includeSecrets: true });

      // Create new manager with different storage
      const newStoragePath = path.join(os.tmpdir(), '.test-import-integration.json');
      const newManager = new LLMProfileManager(newStoragePath);

      // Import
      const result = newManager.import(exported);

      expect(result.imported).toHaveLength(2);
      expect(result.errors).toHaveLength(0);

      // Verify imported data
      const imported1 = newManager.get('profile-1');
      const imported2 = newManager.get('profile-2');

      expect(imported1?.tags).toEqual(['local', 'dev']);
      expect(imported2?.tags).toEqual(['cloud', 'prod']);

      expect(imported1?.usageCount).toBe(1);
      expect(imported2?.usageCount).toBe(1);

      // Clean up
      fs.unlinkSync(newStoragePath);
    });

    it('should handle selective export/import', () => {
      manager.create(createProfileOptions('keep-1'));
      manager.create(createProfileOptions('keep-2'));
      manager.create(createProfileOptions('export-only'));

      // Export only specific profile
      const exported = manager.export({
        profiles: ['export-only'],
        includeSecrets: false,
      });

      const data = JSON.parse(exported);
      expect(Object.keys(data.profiles)).toEqual(['export-only']);
    });
  });

  describe('Error Recovery', () => {
    it('should handle profile deletion and recreation', () => {
      // Create, delete, recreate with same name
      manager.create(createProfileOptions('recyclable'));
      manager.delete('recyclable');

      // Should be able to recreate
      const { profile } = manager.create(createProfileOptions('recyclable'));
      expect(profile.name).toBe('recyclable');
      expect(profile.usageCount).toBe(0);
    });

    it('should maintain data integrity when switching active profiles', () => {
      manager.create(createProfileOptions('profile-1'));
      manager.create(createProfileOptions('profile-2'));

      manager.setActive('profile-1');
      const count1 = manager.count();

      manager.setActive('profile-2');
      const count2 = manager.count();

      expect(count1).toBe(count2);
      expect(manager.count()).toBe(2);
    });
  });

  describe('Statistics Integration', () => {
    it('should provide accurate statistics across operations', () => {
      manager.create(createProfileOptions('lm-1', 'lmstudio'));
      manager.create(createProfileOptions('lm-2', 'lmstudio'));
      manager.create(createProfileOptions('oai-1', 'openai'));

      manager.setActive('lm-1');

      manager.recordUsage('lm-1');
      manager.recordUsage('lm-1');
      manager.recordUsage('oai-1');

      const stats = manager.getStats();

      expect(stats.total).toBe(3);
      expect(stats.totalUsage).toBe(3);
      expect(stats.activeProfile).toBe('lm-1');
      expect(stats.byProvider.lmstudio).toBe(2);
      expect(stats.byProvider.openai).toBe(1);
    });
  });
});
