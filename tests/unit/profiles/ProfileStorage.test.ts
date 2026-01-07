/**
 * ProfileStorage Unit Tests
 *
 * Tests the profile storage layer (file I/O, CRUD operations)
 * Spec 13: LLM Profile Management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProfileStorageManager } from '../../../src/llm/profiles/ProfileStorage.js';
import type { LLMProfile, ProfileStorage } from '../../../src/llm/profiles/types.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

let testCounter = 0;

describe('ProfileStorageManager (Spec 13)', () => {
  let storage: ProfileStorageManager;
  let testStoragePath: string;
  let testDir: string;

  beforeEach(() => {
    // Create unique isolated directory for each test
    testCounter++;
    testDir = path.join(os.tmpdir(), `test-storage-${process.pid}-${testCounter}-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    testStoragePath = path.join(testDir, 'profiles.json');
    storage = new ProfileStorageManager(testStoragePath);
  });

  afterEach(() => {
    // Clean up entire test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  const createTestProfile = (name: string = 'test-profile'): LLMProfile => ({
    name,
    description: 'Test profile',
    provider: 'lmstudio',
    baseUrl: 'http://localhost:1234/v1',
    model: 'qwen3-30b',
    parameters: {
      temperature: 0.7,
      maxTokens: 2048,
    },
    createdAt: Date.now(),
    usageCount: 0,
    isDefault: false,
    timeout: 60000,
    retries: 3,
    tags: ['test'],
  });

  describe('Initialization', () => {
    it('should initialize with empty storage if file does not exist', () => {
      const profiles = storage.getAllProfiles();
      expect(profiles).toEqual([]);
    });

    it('should return storage path', () => {
      expect(storage.getStoragePath()).toBe(testStoragePath);
    });

    it('should have zero profiles initially', () => {
      expect(storage.getProfileCount()).toBe(0);
    });
  });

  describe('Save and Load', () => {
    it('should save a profile to disk', () => {
      const profile = createTestProfile();
      storage.setProfile(profile);

      expect(fs.existsSync(testStoragePath)).toBe(true);
    });

    it('should load saved profile correctly', () => {
      const profile = createTestProfile();
      storage.setProfile(profile);

      const loaded = storage.getProfile('test-profile');
      expect(loaded).toEqual(profile);
    });

    it('should persist multiple profiles', () => {
      const profile1 = createTestProfile('profile-1');
      const profile2 = createTestProfile('profile-2');

      storage.setProfile(profile1);
      storage.setProfile(profile2);

      const profiles = storage.getAllProfiles();
      expect(profiles).toHaveLength(2);
      expect(profiles.map(p => p.name).sort()).toEqual(['profile-1', 'profile-2']);
    });

    it('should overwrite existing profile with same name', () => {
      const profile1 = createTestProfile('test');
      profile1.description = 'Original';
      storage.setProfile(profile1);

      const profile2 = createTestProfile('test');
      profile2.description = 'Updated';
      storage.setProfile(profile2);

      const loaded = storage.getProfile('test');
      expect(loaded?.description).toBe('Updated');
    });
  });

  describe('Profile Retrieval', () => {
    beforeEach(() => {
      storage.setProfile(createTestProfile('profile-1'));
      storage.setProfile(createTestProfile('profile-2'));
      storage.setProfile(createTestProfile('profile-3'));
    });

    it('should get profile by name', () => {
      const profile = storage.getProfile('profile-2');
      expect(profile?.name).toBe('profile-2');
    });

    it('should return undefined for non-existent profile', () => {
      const profile = storage.getProfile('does-not-exist');
      expect(profile).toBeUndefined();
    });

    it('should get all profiles', () => {
      const profiles = storage.getAllProfiles();
      expect(profiles).toHaveLength(3);
    });

    it('should check if profile exists', () => {
      expect(storage.hasProfile('profile-1')).toBe(true);
      expect(storage.hasProfile('profile-999')).toBe(false);
    });

    it('should get correct profile count', () => {
      expect(storage.getProfileCount()).toBe(3);
    });
  });

  describe('Active Profile', () => {
    beforeEach(() => {
      storage.setProfile(createTestProfile('profile-1'));
      storage.setProfile(createTestProfile('profile-2'));
    });

    it('should set active profile', () => {
      storage.setActiveProfile('profile-1');

      const activeName = storage.getActiveProfileName();
      expect(activeName).toBe('profile-1');
    });

    it('should get active profile object', () => {
      storage.setActiveProfile('profile-2');

      const active = storage.getActiveProfile();
      expect(active?.name).toBe('profile-2');
    });

    it('should return undefined when no active profile', () => {
      const active = storage.getActiveProfile();
      expect(active).toBeUndefined();
    });

    it('should throw error when setting non-existent profile as active', () => {
      expect(() => {
        storage.setActiveProfile('does-not-exist');
      }).toThrow('Profile not found');
    });

    it('should update isDefault flags when setting active profile', () => {
      storage.setActiveProfile('profile-1');

      const profile1 = storage.getProfile('profile-1');
      const profile2 = storage.getProfile('profile-2');

      expect(profile1?.isDefault).toBe(true);
      expect(profile2?.isDefault).toBe(false);
    });

    it('should switch active profile correctly', () => {
      storage.setActiveProfile('profile-1');
      storage.setActiveProfile('profile-2');

      const profile1 = storage.getProfile('profile-1');
      const profile2 = storage.getProfile('profile-2');

      expect(profile1?.isDefault).toBe(false);
      expect(profile2?.isDefault).toBe(true);
    });
  });

  describe('Delete Profile', () => {
    beforeEach(() => {
      storage.setProfile(createTestProfile('profile-1'));
      storage.setProfile(createTestProfile('profile-2'));
    });

    it('should delete existing profile', () => {
      const deleted = storage.deleteProfile('profile-1');

      expect(deleted).toBe(true);
      expect(storage.hasProfile('profile-1')).toBe(false);
      expect(storage.getProfileCount()).toBe(1);
    });

    it('should return false when deleting non-existent profile', () => {
      const deleted = storage.deleteProfile('does-not-exist');
      expect(deleted).toBe(false);
    });

    it('should clear active profile when deleting active profile', () => {
      storage.setActiveProfile('profile-1');
      storage.deleteProfile('profile-1');

      const activeName = storage.getActiveProfileName();
      expect(activeName).toBeUndefined();
    });

    it('should not affect other profiles when deleting', () => {
      storage.deleteProfile('profile-1');

      const profile2 = storage.getProfile('profile-2');
      expect(profile2).toBeDefined();
    });
  });

  describe('Export/Import', () => {
    beforeEach(() => {
      const profile1 = createTestProfile('profile-1');
      profile1.apiKey = 'secret-key-1';
      const profile2 = createTestProfile('profile-2');
      profile2.apiKey = 'secret-key-2';

      storage.setProfile(profile1);
      storage.setProfile(profile2);
    });

    it('should export profiles without secrets by default', () => {
      const exported = storage.exportProfiles();
      const data = JSON.parse(exported);

      expect(data.profiles['profile-1'].apiKey).toBe('${API_KEY}');
      expect(data.profiles['profile-2'].apiKey).toBe('${API_KEY}');
      expect(data.includesSecrets).toBe(false);
    });

    it('should export profiles with secrets when requested', () => {
      const exported = storage.exportProfiles(undefined, true);
      const data = JSON.parse(exported);

      expect(data.profiles['profile-1'].apiKey).toBe('secret-key-1');
      expect(data.profiles['profile-2'].apiKey).toBe('secret-key-2');
      expect(data.includesSecrets).toBe(true);
    });

    it('should export specific profiles only', () => {
      const exported = storage.exportProfiles(['profile-1']);
      const data = JSON.parse(exported);

      expect(Object.keys(data.profiles)).toEqual(['profile-1']);
    });

    it('should import profiles successfully', () => {
      // Create isolated directory for import test
      const importTestDir = path.join(os.tmpdir(), `test-import-${Date.now()}-${Math.random()}`);
      fs.mkdirSync(importTestDir, { recursive: true });
      const newStoragePath = path.join(importTestDir, 'profiles.json');
      const newStorage = new ProfileStorageManager(newStoragePath);

      const exported = storage.exportProfiles(undefined, true);
      const result = newStorage.importProfiles(exported);

      expect(result.imported).toHaveLength(2);
      expect(result.skipped).toHaveLength(0);
      expect(newStorage.getProfileCount()).toBe(2);

      // Clean up
      if (fs.existsSync(importTestDir)) {
        fs.rmSync(importTestDir, { recursive: true, force: true });
      }
    });

    it('should skip existing profiles when importing without overwrite', () => {
      const exported = storage.exportProfiles(undefined, true);
      const result = storage.importProfiles(exported, false);

      expect(result.imported).toHaveLength(0);
      expect(result.skipped).toHaveLength(2);
    });

    it('should overwrite existing profiles when requested', () => {
      const profile1 = createTestProfile('profile-1');
      profile1.description = 'Updated description';

      const exportData = {
        version: '1.0',
        profiles: { 'profile-1': profile1 },
      };

      const result = storage.importProfiles(JSON.stringify(exportData), true);

      expect(result.imported).toHaveLength(1);
      const loaded = storage.getProfile('profile-1');
      expect(loaded?.description).toBe('Updated description');
    });
  });

  describe('Clear All', () => {
    it('should clear all profiles', () => {
      storage.setProfile(createTestProfile('profile-1'));
      storage.setProfile(createTestProfile('profile-2'));
      storage.setActiveProfile('profile-1');

      storage.clearAll();

      expect(storage.getProfileCount()).toBe(0);
      expect(storage.getActiveProfileName()).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when loading from invalid JSON', () => {
      fs.writeFileSync(testStoragePath, 'invalid json{{{');

      const newStorage = new ProfileStorageManager(testStoragePath);
      expect(() => {
        newStorage.load();
      }).toThrow('Failed to load profiles');
    });

    it('should handle permission errors gracefully', () => {
      // This test would require mocking fs permissions
      // Skipped for now, but documented for future improvement
    });
  });
});
