/**
 * LLM Profile Manager
 *
 * Spec 13: LLM Profile Management
 *
 * Main orchestration class for profile management operations
 */

import fetch from 'node-fetch';
import type {
  LLMProfile,
  CreateProfileOptions,
  UpdateProfileOptions,
  ValidationResult,
  HealthCheckResult,
  ExportOptions,
  ImportResult,
} from './types.js';
import { ProfileStorageManager } from './ProfileStorage.js';
import { ProfileValidator } from './ProfileValidator.js';

/**
 * LLM Profile Manager
 *
 * Provides high-level API for profile CRUD operations
 */
export class LLMProfileManager {
  private storage: ProfileStorageManager;

  constructor(storagePath?: string) {
    this.storage = new ProfileStorageManager(storagePath);
  }

  /**
   * Create a new profile
   */
  create(options: CreateProfileOptions): { profile: LLMProfile; validation: ValidationResult } {
    // Build profile object
    const profile: LLMProfile = {
      name: options.name,
      description: options.description,
      provider: options.provider,
      baseUrl: options.baseUrl,
      apiKey: options.apiKey,
      model: options.model,
      parameters: {
        temperature: options.parameters?.temperature ?? 0.7,
        maxTokens: options.parameters?.maxTokens ?? 2048,
        topP: options.parameters?.topP,
        frequencyPenalty: options.parameters?.frequencyPenalty,
        presencePenalty: options.parameters?.presencePenalty,
        stop: options.parameters?.stop,
      },
      createdAt: Date.now(),
      usageCount: 0,
      isDefault: false,
      timeout: options.timeout ?? 60000,
      retries: options.retries ?? 3,
      tags: options.tags ?? [],
      color: options.color,
    };

    // Validate
    const validation = ProfileValidator.validate(profile);
    if (!validation.valid) {
      throw new Error(`Profile validation failed:\n${validation.errors.join('\n')}`);
    }

    // Check if profile already exists
    if (this.storage.hasProfile(profile.name)) {
      throw new Error(`Profile already exists: ${profile.name}`);
    }

    // Save profile
    this.storage.setProfile(profile);

    // Set as default if requested
    if (options.setDefault) {
      this.storage.setActiveProfile(profile.name);
    }

    return { profile, validation };
  }

  /**
   * Get a profile by name
   */
  get(name: string): LLMProfile | undefined {
    return this.storage.getProfile(name);
  }

  /**
   * Get all profiles
   */
  list(): LLMProfile[] {
    return this.storage.getAllProfiles();
  }

  /**
   * Get active profile
   */
  getActive(): LLMProfile | undefined {
    return this.storage.getActiveProfile();
  }

  /**
   * Update an existing profile
   */
  update(name: string, updates: UpdateProfileOptions): { profile: LLMProfile; validation: ValidationResult } {
    const existing = this.storage.getProfile(name);
    if (!existing) {
      throw new Error(`Profile not found: ${name}`);
    }

    // Merge updates
    const updated: LLMProfile = {
      ...existing,
      description: updates.description ?? existing.description,
      provider: updates.provider ?? existing.provider,
      baseUrl: updates.baseUrl ?? existing.baseUrl,
      apiKey: updates.apiKey ?? existing.apiKey,
      model: updates.model ?? existing.model,
      parameters: {
        ...existing.parameters,
        ...updates.parameters,
      },
      timeout: updates.timeout ?? existing.timeout,
      retries: updates.retries ?? existing.retries,
      tags: updates.tags ?? existing.tags,
      color: updates.color ?? existing.color,
    };

    // Validate
    const validation = ProfileValidator.validate(updated);
    if (!validation.valid) {
      throw new Error(`Profile validation failed:\n${validation.errors.join('\n')}`);
    }

    // Save
    this.storage.setProfile(updated);

    // Set as default if requested
    if (updates.setDefault) {
      this.storage.setActiveProfile(name);
    }

    return { profile: updated, validation };
  }

  /**
   * Delete a profile
   */
  delete(name: string): boolean {
    return this.storage.deleteProfile(name);
  }

  /**
   * Set active profile
   */
  setActive(name: string): void {
    this.storage.setActiveProfile(name);

    // Update lastUsed timestamp
    const profile = this.storage.getProfile(name);
    if (profile) {
      profile.lastUsed = Date.now();
      this.storage.setProfile(profile);
    }
  }

  /**
   * Test profile connectivity
   */
  async test(name?: string): Promise<HealthCheckResult> {
    const profile = name ? this.storage.getProfile(name) : this.storage.getActiveProfile();

    if (!profile) {
      return {
        healthy: false,
        error: name ? `Profile not found: ${name}` : 'No active profile',
        timestamp: Date.now(),
      };
    }

    const startTime = Date.now();

    try {
      // Resolve API key
      const apiKey = profile.apiKey ? ProfileValidator.resolveApiKey(profile.apiKey) : undefined;

      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (apiKey) {
        if (profile.provider === 'openai' || profile.provider === 'openrouter') {
          headers['Authorization'] = `Bearer ${apiKey}`;
        } else if (profile.provider === 'anthropic') {
          headers['x-api-key'] = apiKey;
          headers['anthropic-version'] = '2023-06-01';
        }
      }

      // Simple health check request
      const url = profile.provider === 'anthropic'
        ? `${profile.baseUrl}/messages`
        : `${profile.baseUrl}/chat/completions`;

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: profile.model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(profile.timeout),
      });

      const latency = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        return {
          healthy: false,
          error: `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
          latency,
          timestamp: Date.now(),
        };
      }

      return {
        healthy: true,
        latency,
        model: profile.model,
        timestamp: Date.now(),
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        healthy: false,
        error: (error as Error).message,
        latency,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Record profile usage
   */
  recordUsage(name: string): void {
    const profile = this.storage.getProfile(name);
    if (profile) {
      profile.usageCount++;
      profile.lastUsed = Date.now();
      this.storage.setProfile(profile);
    }
  }

  /**
   * Export profiles
   */
  export(options: ExportOptions = {}): string {
    return this.storage.exportProfiles(options.profiles, options.includeSecrets);
  }

  /**
   * Import profiles
   */
  import(json: string, overwrite: boolean = false): ImportResult {
    try {
      const { imported, skipped } = this.storage.importProfiles(json, overwrite);

      return {
        imported,
        skipped,
        errors: [],
      };
    } catch (error) {
      return {
        imported: [],
        skipped: [],
        errors: [{ profile: 'import', error: (error as Error).message }],
      };
    }
  }

  /**
   * Get profile count
   */
  count(): number {
    return this.storage.getProfileCount();
  }

  /**
   * Check if profile exists
   */
  exists(name: string): boolean {
    return this.storage.hasProfile(name);
  }

  /**
   * Get storage file path
   */
  getStoragePath(): string {
    return this.storage.getStoragePath();
  }

  /**
   * Filter profiles by tags
   */
  filterByTags(tags: string[]): LLMProfile[] {
    const allProfiles = this.storage.getAllProfiles();
    return allProfiles.filter(profile =>
      tags.some(tag => profile.tags.includes(tag))
    );
  }

  /**
   * Get profiles by provider
   */
  filterByProvider(provider: string): LLMProfile[] {
    const allProfiles = this.storage.getAllProfiles();
    return allProfiles.filter(profile => profile.provider === provider);
  }

  /**
   * Sort profiles by usage
   */
  sortByUsage(): LLMProfile[] {
    const allProfiles = this.storage.getAllProfiles();
    return allProfiles.sort((a, b) => b.usageCount - a.usageCount);
  }

  /**
   * Sort profiles by last used
   */
  sortByLastUsed(): LLMProfile[] {
    const allProfiles = this.storage.getAllProfiles();
    return allProfiles.sort((a, b) => {
      const aTime = a.lastUsed || 0;
      const bTime = b.lastUsed || 0;
      return bTime - aTime;
    });
  }

  /**
   * Get profile statistics
   */
  getStats(): {
    total: number;
    byProvider: Record<string, number>;
    activeProfile?: string;
    totalUsage: number;
  } {
    const allProfiles = this.storage.getAllProfiles();

    const byProvider: Record<string, number> = {};
    let totalUsage = 0;

    for (const profile of allProfiles) {
      byProvider[profile.provider] = (byProvider[profile.provider] || 0) + 1;
      totalUsage += profile.usageCount;
    }

    return {
      total: allProfiles.length,
      byProvider,
      activeProfile: this.storage.getActiveProfileName(),
      totalUsage,
    };
  }
}
