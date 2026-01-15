/**
 * Profile Validator
 *
 * Spec 13: LLM Profile Management
 *
 * Validates profile configurations before saving
 */

import type { LLMProfile, LLMProvider, ValidationResult } from './types.js';

/**
 * Valid provider types
 */
const VALID_PROVIDERS: LLMProvider[] = [
  'lmstudio',
  'openai',
  'anthropic',
  'ollama',
  'openrouter',
  'custom',
];

/**
 * Profile validation rules
 */
export class ProfileValidator {
  /**
   * Validate a complete profile
   */
  static validate(profile: Partial<LLMProfile>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!profile.name || profile.name.trim() === '') {
      errors.push('Profile name is required');
    } else if (!/^[a-zA-Z0-9_-]+$/.test(profile.name)) {
      errors.push('Profile name must contain only letters, numbers, hyphens, and underscores');
    }

    if (!profile.provider) {
      errors.push('Provider is required');
    } else if (!VALID_PROVIDERS.includes(profile.provider)) {
      errors.push(`Invalid provider: ${profile.provider}. Must be one of: ${VALID_PROVIDERS.join(', ')}`);
    }

    if (!profile.baseUrl || profile.baseUrl.trim() === '') {
      errors.push('Base URL is required');
    } else if (!this.isValidUrl(profile.baseUrl)) {
      errors.push('Base URL must be a valid HTTP/HTTPS URL');
    }

    if (!profile.model || profile.model.trim() === '') {
      errors.push('Model name is required');
    }

    // Validate parameters
    if (profile.parameters) {
      const paramErrors = this.validateParameters(profile.parameters);
      errors.push(...paramErrors);
    }

    // Validate timeout
    if (profile.timeout !== undefined) {
      if (profile.timeout < 1000 || profile.timeout > 900000) {
        errors.push('Timeout must be between 1000ms (1s) and 900000ms (15m)');
      }
    }

    // Validate retries
    if (profile.retries !== undefined) {
      if (profile.retries < 0 || profile.retries > 10) {
        errors.push('Retries must be between 0 and 10');
      }
    }

    // Warnings for optional best practices
    if (!profile.apiKey && profile.provider !== 'lmstudio' && profile.provider !== 'ollama') {
      warnings.push(`API key is recommended for ${profile.provider} provider`);
    }

    if (profile.apiKey && !profile.apiKey.startsWith('${')) {
      warnings.push('Consider using environment variable reference (${VAR_NAME}) for API keys');
    }

    if (!profile.description) {
      warnings.push('Adding a description helps identify profiles later');
    }

    if (!profile.tags || profile.tags.length === 0) {
      warnings.push('Adding tags helps organize profiles');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate model parameters
   */
  private static validateParameters(params: any): string[] {
    const errors: string[] = [];

    if (params.temperature !== undefined) {
      if (typeof params.temperature !== 'number' || params.temperature < 0 || params.temperature > 2) {
        errors.push('Temperature must be a number between 0.0 and 2.0');
      }
    }

    if (params.maxTokens !== undefined) {
      if (!Number.isInteger(params.maxTokens) || params.maxTokens < 1 || params.maxTokens > 32768) {
        errors.push('Max tokens must be an integer between 1 and 32768');
      }
    }

    if (params.topP !== undefined) {
      if (typeof params.topP !== 'number' || params.topP < 0 || params.topP > 1) {
        errors.push('Top P must be a number between 0.0 and 1.0');
      }
    }

    if (params.frequencyPenalty !== undefined) {
      if (typeof params.frequencyPenalty !== 'number' || params.frequencyPenalty < -2 || params.frequencyPenalty > 2) {
        errors.push('Frequency penalty must be a number between -2.0 and 2.0');
      }
    }

    if (params.presencePenalty !== undefined) {
      if (typeof params.presencePenalty !== 'number' || params.presencePenalty < -2 || params.presencePenalty > 2) {
        errors.push('Presence penalty must be a number between -2.0 and 2.0');
      }
    }

    if (params.stop !== undefined) {
      if (!Array.isArray(params.stop)) {
        errors.push('Stop sequences must be an array of strings');
      } else if (params.stop.some((s: any) => typeof s !== 'string')) {
        errors.push('Stop sequences must be strings');
      }
    }

    return errors;
  }

  /**
   * Validate URL format
   */
  private static isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Validate profile name (for CLI input)
   */
  static validateProfileName(name: string): { valid: boolean; error?: string } {
    if (!name || name.trim() === '') {
      return { valid: false, error: 'Profile name cannot be empty' };
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return {
        valid: false,
        error: 'Profile name must contain only letters, numbers, hyphens, and underscores',
      };
    }

    if (name.length > 64) {
      return { valid: false, error: 'Profile name must be 64 characters or less' };
    }

    return { valid: true };
  }

  /**
   * Validate provider
   */
  static validateProvider(provider: string): { valid: boolean; error?: string } {
    if (!VALID_PROVIDERS.includes(provider as LLMProvider)) {
      return {
        valid: false,
        error: `Invalid provider: ${provider}. Must be one of: ${VALID_PROVIDERS.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Resolve API key (handle environment variables)
   */
  static resolveApiKey(key: string): string {
    if (key.startsWith('${') && key.endsWith('}')) {
      const envVar = key.slice(2, -1);
      return process.env[envVar] || '';
    }
    return key;
  }

  /**
   * Check if API key is an environment variable reference
   */
  static isEnvVarReference(key: string): boolean {
    return key.startsWith('${') && key.endsWith('}');
  }
}
