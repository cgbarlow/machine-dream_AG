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
  ProfileInstance,
  CreateProfileOptions,
  UpdateProfileOptions,
  CreateInstanceOptions,
  UpdateInstanceOptions,
  ValidationResult,
  HealthCheckResult,
  ExportOptions,
  ImportResult,
  ModelParameters,
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
      modelPath: options.modelPath,
      llamaServerPath: options.llamaServerPath,
      launchCommand: options.launchCommand,
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
      systemPrompt: options.systemPrompt,
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
      modelPath: updates.modelPath ?? existing.modelPath,
      llamaServerPath: updates.llamaServerPath ?? existing.llamaServerPath,
      launchCommand: updates.launchCommand ?? existing.launchCommand,
      parameters: {
        ...existing.parameters,
        ...updates.parameters,
      },
      timeout: updates.timeout ?? existing.timeout,
      retries: updates.retries ?? existing.retries,
      tags: updates.tags ?? existing.tags,
      color: updates.color ?? existing.color,
      modifiedAt: Date.now(),
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

  // ============================================
  // Instance Management Methods
  // ============================================

  /**
   * Ensure profile has instance support (migration helper)
   * Moves legacy parameters to 'default' instance
   */
  private ensureInstanceSupport(profile: LLMProfile): LLMProfile {
    if (!profile.instances) {
      // Migrate: create 'default' instance from current parameters
      profile.instances = {
        default: {
          name: 'default',
          description: 'Default configuration',
          parameters: { ...profile.parameters },
          createdAt: profile.createdAt,
          lastUsed: profile.lastUsed,
        },
      };
      profile.activeInstance = 'default';
    }
    return profile;
  }

  /**
   * Get effective parameters for a profile (from active instance)
   */
  getEffectiveParameters(profileName: string): ModelParameters | undefined {
    const profile = this.storage.getProfile(profileName);
    if (!profile) return undefined;

    if (profile.instances && profile.activeInstance) {
      const instance = profile.instances[profile.activeInstance];
      if (instance) return instance.parameters;
    }

    // Fallback to profile-level parameters
    return profile.parameters;
  }

  /**
   * List all instances for a profile
   */
  listInstances(profileName: string): ProfileInstance[] {
    const profile = this.storage.getProfile(profileName);
    if (!profile) {
      throw new Error(`Profile not found: ${profileName}`);
    }

    if (!profile.instances) {
      // Return synthetic default instance
      return [{
        name: 'default',
        description: 'Default configuration',
        parameters: profile.parameters,
        createdAt: profile.createdAt,
        lastUsed: profile.lastUsed,
      }];
    }

    return Object.values(profile.instances);
  }

  /**
   * Get a specific instance
   */
  getInstance(profileName: string, instanceName: string): ProfileInstance | undefined {
    const profile = this.storage.getProfile(profileName);
    if (!profile) return undefined;

    if (!profile.instances) {
      if (instanceName === 'default') {
        return {
          name: 'default',
          description: 'Default configuration',
          parameters: profile.parameters,
          createdAt: profile.createdAt,
          lastUsed: profile.lastUsed,
        };
      }
      return undefined;
    }

    return profile.instances[instanceName];
  }

  /**
   * Get active instance name for a profile
   */
  getActiveInstance(profileName: string): string {
    const profile = this.storage.getProfile(profileName);
    if (!profile) {
      throw new Error(`Profile not found: ${profileName}`);
    }
    return profile.activeInstance || 'default';
  }

  /**
   * Create a new instance for a profile
   */
  createInstance(profileName: string, options: CreateInstanceOptions): ProfileInstance {
    let profile = this.storage.getProfile(profileName);
    if (!profile) {
      throw new Error(`Profile not found: ${profileName}`);
    }

    // Ensure instance support
    profile = this.ensureInstanceSupport(profile);

    // Check if instance already exists
    if (profile.instances![options.name]) {
      throw new Error(`Instance already exists: ${options.name}`);
    }

    // Determine base parameters
    let baseParams: ModelParameters;
    if (options.copyFrom) {
      const sourceInstance = profile.instances![options.copyFrom];
      if (!sourceInstance) {
        throw new Error(`Source instance not found: ${options.copyFrom}`);
      }
      baseParams = { ...sourceInstance.parameters };
    } else {
      // Copy from default instance or profile parameters
      const defaultInstance = profile.instances!['default'];
      baseParams = defaultInstance ? { ...defaultInstance.parameters } : { ...profile.parameters };
    }

    // Merge with provided parameters
    const newParams: ModelParameters = {
      ...baseParams,
      ...options.parameters,
    };

    // Determine launch command (copy from source or use provided)
    let launchCommand: string | undefined;
    if (options.launchCommand) {
      launchCommand = options.launchCommand;
    } else if (options.copyFrom) {
      const sourceInstance = profile.instances![options.copyFrom];
      launchCommand = sourceInstance?.launchCommand;
    }

    // Create instance
    const instance: ProfileInstance = {
      name: options.name,
      description: options.description,
      parameters: newParams,
      launchCommand,
      createdAt: Date.now(),
    };

    profile.instances![options.name] = instance;
    profile.modifiedAt = Date.now();

    // Set as active if requested
    if (options.setActive) {
      profile.activeInstance = options.name;
    }

    this.storage.setProfile(profile);
    return instance;
  }

  /**
   * Update an instance
   */
  updateInstance(profileName: string, instanceName: string, updates: UpdateInstanceOptions): ProfileInstance {
    let profile = this.storage.getProfile(profileName);
    if (!profile) {
      throw new Error(`Profile not found: ${profileName}`);
    }

    profile = this.ensureInstanceSupport(profile);

    const instance = profile.instances![instanceName];
    if (!instance) {
      throw new Error(`Instance not found: ${instanceName}`);
    }

    // Apply updates
    if (updates.description !== undefined) {
      instance.description = updates.description;
    }
    if (updates.parameters) {
      instance.parameters = {
        ...instance.parameters,
        ...updates.parameters,
      };
    }

    instance.modifiedAt = Date.now();
    profile.instances![instanceName] = instance;
    profile.modifiedAt = Date.now();
    this.storage.setProfile(profile);
    return instance;
  }

  /**
   * Delete an instance
   */
  deleteInstance(profileName: string, instanceName: string): boolean {
    let profile = this.storage.getProfile(profileName);
    if (!profile) {
      throw new Error(`Profile not found: ${profileName}`);
    }

    if (instanceName === 'default') {
      throw new Error('Cannot delete the default instance');
    }

    profile = this.ensureInstanceSupport(profile);

    if (!profile.instances![instanceName]) {
      return false;
    }

    delete profile.instances![instanceName];

    // If deleted instance was active, switch to default
    if (profile.activeInstance === instanceName) {
      profile.activeInstance = 'default';
    }

    profile.modifiedAt = Date.now();
    this.storage.setProfile(profile);
    return true;
  }

  /**
   * Rename an instance
   */
  renameInstance(profileName: string, oldName: string, newName: string): ProfileInstance {
    let profile = this.storage.getProfile(profileName);
    if (!profile) {
      throw new Error(`Profile not found: ${profileName}`);
    }

    if (oldName === 'default') {
      throw new Error('Cannot rename the default instance');
    }

    profile = this.ensureInstanceSupport(profile);

    const instance = profile.instances![oldName];
    if (!instance) {
      throw new Error(`Instance not found: ${oldName}`);
    }

    if (profile.instances![newName]) {
      throw new Error(`Instance already exists: ${newName}`);
    }

    // Create new instance with new name
    const renamedInstance: ProfileInstance = {
      ...instance,
      name: newName,
      modifiedAt: Date.now(),
    };

    delete profile.instances![oldName];
    profile.instances![newName] = renamedInstance;

    // Update active instance if needed
    if (profile.activeInstance === oldName) {
      profile.activeInstance = newName;
    }

    profile.modifiedAt = Date.now();
    this.storage.setProfile(profile);
    return renamedInstance;
  }

  /**
   * Set active instance for a profile
   */
  setActiveInstance(profileName: string, instanceName: string): void {
    let profile = this.storage.getProfile(profileName);
    if (!profile) {
      throw new Error(`Profile not found: ${profileName}`);
    }

    profile = this.ensureInstanceSupport(profile);

    if (!profile.instances![instanceName]) {
      throw new Error(`Instance not found: ${instanceName}`);
    }

    profile.activeInstance = instanceName;
    profile.instances![instanceName].lastUsed = Date.now();
    this.storage.setProfile(profile);
  }

  /**
   * Migrate a profile to instance support
   * Explicitly converts legacy profile to use instances
   */
  migrateToInstances(profileName: string): LLMProfile {
    let profile = this.storage.getProfile(profileName);
    if (!profile) {
      throw new Error(`Profile not found: ${profileName}`);
    }

    profile = this.ensureInstanceSupport(profile);
    this.storage.setProfile(profile);
    return profile;
  }

  /**
   * Clone an instance within a profile
   */
  cloneInstance(profileName: string, sourceName: string, newName: string, description?: string): ProfileInstance {
    let profile = this.storage.getProfile(profileName);
    if (!profile) {
      throw new Error(`Profile not found: ${profileName}`);
    }

    profile = this.ensureInstanceSupport(profile);

    const sourceInstance = profile.instances![sourceName];
    if (!sourceInstance) {
      throw new Error(`Source instance not found: ${sourceName}`);
    }

    if (profile.instances![newName]) {
      throw new Error(`Instance already exists: ${newName}`);
    }

    // Clone the instance
    const clonedInstance: ProfileInstance = {
      name: newName,
      description: description ?? `Clone of ${sourceName}`,
      parameters: { ...sourceInstance.parameters },
      launchCommand: sourceInstance.launchCommand,
      createdAt: Date.now(),
    };

    profile.instances![newName] = clonedInstance;
    profile.modifiedAt = Date.now();
    this.storage.setProfile(profile);
    return clonedInstance;
  }

  /**
   * Clone an entire profile
   */
  clone(sourceName: string, newName: string, description?: string): { profile: LLMProfile; validation: ValidationResult } {
    const sourceProfile = this.storage.getProfile(sourceName);
    if (!sourceProfile) {
      throw new Error(`Source profile not found: ${sourceName}`);
    }

    if (this.storage.hasProfile(newName)) {
      throw new Error(`Profile already exists: ${newName}`);
    }

    // Deep clone the profile
    const clonedProfile: LLMProfile = {
      ...sourceProfile,
      name: newName,
      description: description ?? `Clone of ${sourceName}`,
      parameters: { ...sourceProfile.parameters },
      createdAt: Date.now(),
      lastUsed: undefined,
      usageCount: 0,
      isDefault: false,
      tags: [...sourceProfile.tags],
      // Deep clone instances if present
      instances: sourceProfile.instances
        ? Object.fromEntries(
            Object.entries(sourceProfile.instances).map(([key, inst]) => [
              key,
              {
                ...inst,
                parameters: { ...inst.parameters },
                createdAt: Date.now(),
                lastUsed: undefined,
              },
            ])
          )
        : undefined,
    };

    // Validate
    const validation = ProfileValidator.validate(clonedProfile);
    if (!validation.valid) {
      throw new Error(`Profile validation failed:\n${validation.errors.join('\n')}`);
    }

    this.storage.setProfile(clonedProfile);
    return { profile: clonedProfile, validation };
  }

  /**
   * Reset an instance parameters
   * - For non-default instances: copies parameters from 'default' instance
   * - For default instance: clears all optional parameters, keeps only temperature/maxTokens
   */
  resetInstance(profileName: string, instanceName: string): ProfileInstance {
    let profile = this.storage.getProfile(profileName);
    if (!profile) {
      throw new Error(`Profile not found: ${profileName}`);
    }

    profile = this.ensureInstanceSupport(profile);

    const instance = profile.instances![instanceName];
    if (!instance) {
      throw new Error(`Instance not found: ${instanceName}`);
    }

    let resetParams: import('./types.js').ModelParameters;

    if (instanceName === 'default') {
      // For default instance: clear all optional parameters
      resetParams = {
        temperature: instance.parameters.temperature,
        maxTokens: instance.parameters.maxTokens,
        // All optional parameters cleared (undefined)
      };
    } else {
      // For other instances: copy from default
      const defaultInstance = profile.instances!['default'];
      if (!defaultInstance) {
        throw new Error('Default instance not found');
      }
      resetParams = { ...defaultInstance.parameters };
    }

    const resetInst: ProfileInstance = {
      name: instanceName,
      description: instance.description, // Keep description
      parameters: resetParams,
      launchCommand: undefined, // Clear launch command override
      createdAt: instance.createdAt, // Keep original creation time
      modifiedAt: Date.now(),
      lastUsed: Date.now(),
    };

    profile.instances![instanceName] = resetInst;
    profile.modifiedAt = Date.now();
    this.storage.setProfile(profile);
    return resetInst;
  }
}
