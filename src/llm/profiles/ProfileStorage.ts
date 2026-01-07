/**
 * Profile Storage - Persistence Layer
 *
 * Spec 13: LLM Profile Management
 *
 * Handles file I/O for profile storage at ~/.machine-dream/llm-profiles.json
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import type { LLMProfile, ProfileStorage } from './types.js';

/**
 * Storage file location
 */
const STORAGE_DIR = path.join(os.homedir(), '.machine-dream');
const STORAGE_FILE = path.join(STORAGE_DIR, 'llm-profiles.json');
const STORAGE_VERSION = '1.0';

/**
 * Default empty storage
 */
const DEFAULT_STORAGE: ProfileStorage = {
  version: STORAGE_VERSION,
  profiles: {},
  activeProfile: undefined,
};

/**
 * Profile storage manager
 */
export class ProfileStorageManager {
  private storagePath: string;

  constructor(storagePath: string = STORAGE_FILE) {
    this.storagePath = storagePath;
  }

  /**
   * Initialize storage directory
   */
  private ensureStorageDirectory(): void {
    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Load profiles from disk
   */
  load(): ProfileStorage {
    try {
      if (!fs.existsSync(this.storagePath)) {
        return { ...DEFAULT_STORAGE };
      }

      const data = fs.readFileSync(this.storagePath, 'utf-8');
      const storage = JSON.parse(data) as ProfileStorage;

      // Validate version
      if (storage.version !== STORAGE_VERSION) {
        console.warn(`Profile storage version mismatch: ${storage.version} !== ${STORAGE_VERSION}`);
        // TODO: Implement migration logic if needed
      }

      return storage;
    } catch (error) {
      throw new Error(`Failed to load profiles: ${(error as Error).message}`);
    }
  }

  /**
   * Save profiles to disk
   */
  save(storage: ProfileStorage): void {
    try {
      this.ensureStorageDirectory();

      const data = JSON.stringify(storage, null, 2);
      fs.writeFileSync(this.storagePath, data, { encoding: 'utf-8', mode: 0o600 });
    } catch (error) {
      throw new Error(`Failed to save profiles: ${(error as Error).message}`);
    }
  }

  /**
   * Get a single profile by name
   */
  getProfile(name: string): LLMProfile | undefined {
    const storage = this.load();
    return storage.profiles[name];
  }

  /**
   * Get all profiles
   */
  getAllProfiles(): LLMProfile[] {
    const storage = this.load();
    return Object.values(storage.profiles);
  }

  /**
   * Get active profile
   */
  getActiveProfile(): LLMProfile | undefined {
    const storage = this.load();
    if (!storage.activeProfile) {
      return undefined;
    }
    return storage.profiles[storage.activeProfile];
  }

  /**
   * Add or update a profile
   */
  setProfile(profile: LLMProfile): void {
    const storage = this.load();
    storage.profiles[profile.name] = profile;
    this.save(storage);
  }

  /**
   * Delete a profile
   */
  deleteProfile(name: string): boolean {
    const storage = this.load();

    if (!storage.profiles[name]) {
      return false;
    }

    delete storage.profiles[name];

    // Clear active profile if it was deleted
    if (storage.activeProfile === name) {
      storage.activeProfile = undefined;
    }

    this.save(storage);
    return true;
  }

  /**
   * Set active profile
   */
  setActiveProfile(name: string): void {
    const storage = this.load();

    if (!storage.profiles[name]) {
      throw new Error(`Profile not found: ${name}`);
    }

    // Update isDefault flags
    for (const profile of Object.values(storage.profiles)) {
      profile.isDefault = profile.name === name;
    }

    storage.activeProfile = name;
    this.save(storage);
  }

  /**
   * Get active profile name
   */
  getActiveProfileName(): string | undefined {
    const storage = this.load();
    return storage.activeProfile;
  }

  /**
   * Check if profile exists
   */
  hasProfile(name: string): boolean {
    const storage = this.load();
    return name in storage.profiles;
  }

  /**
   * Get profile count
   */
  getProfileCount(): number {
    const storage = this.load();
    return Object.keys(storage.profiles).length;
  }

  /**
   * Export profiles to JSON string
   */
  exportProfiles(profileNames?: string[], includeSecrets: boolean = false): string {
    const storage = this.load();
    const profilesToExport: Record<string, LLMProfile> = {};

    const names = profileNames || Object.keys(storage.profiles);

    for (const name of names) {
      if (storage.profiles[name]) {
        const profile = { ...storage.profiles[name] };

        // Remove secrets if requested
        if (!includeSecrets && profile.apiKey) {
          profile.apiKey = '${API_KEY}'; // Placeholder
        }

        profilesToExport[name] = profile;
      }
    }

    const exportData = {
      version: STORAGE_VERSION,
      profiles: profilesToExport,
      exportedAt: Date.now(),
      includesSecrets: includeSecrets,
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import profiles from JSON string
   */
  importProfiles(json: string, overwrite: boolean = false): { imported: string[]; skipped: string[] } {
    const storage = this.load();
    const importData = JSON.parse(json);

    const imported: string[] = [];
    const skipped: string[] = [];

    for (const [name, profile] of Object.entries(importData.profiles || {})) {
      if (!overwrite && storage.profiles[name]) {
        skipped.push(name);
        continue;
      }

      storage.profiles[name] = profile as LLMProfile;
      imported.push(name);
    }

    this.save(storage);

    return { imported, skipped };
  }

  /**
   * Clear all profiles (dangerous!)
   */
  clearAll(): void {
    this.save({ ...DEFAULT_STORAGE });
  }

  /**
   * Get storage file path
   */
  getStoragePath(): string {
    return this.storagePath;
  }
}
