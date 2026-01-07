/**
 * LLM Sudoku Player - Configuration
 * Specification: docs/specs/11-llm-sudoku-player.md
 * Specification: docs/specs/13-llm-profile-management.md
 */

import type { LLMConfig } from './types.js';
import { LLMProfileManager } from './profiles/index.js';
import type { LLMProfile } from './profiles/index.js';

/**
 * Default LLM Configuration
 *
 * Design decisions from Spec 11:
 * - LM Studio local server (localhost:1234)
 * - Qwen3 30B model
 * - No hints, no deterministic fallback
 * - Memory toggle enabled by default
 */
export const DEFAULT_LLM_CONFIG: LLMConfig = {
  // LM Studio connection
  baseUrl: process.env.LLM_BASE_URL || 'http://localhost:1234/v1',
  model: process.env.LLM_MODEL || 'qwen3-30b',

  // Generation parameters
  temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
  maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '1024', 10),
  timeout: parseInt(process.env.LLM_TIMEOUT || '60000', 10),

  // Learning settings
  memoryEnabled: process.env.LLM_MEMORY_ENABLED !== 'false',
  maxHistoryMoves: parseInt(process.env.LLM_MAX_HISTORY_MOVES || '20', 10),
};

/**
 * System Prompt (Spec 11 - Prompt Engineering)
 */
export const SYSTEM_PROMPT = `You are learning to solve Sudoku puzzles through practice and feedback.

RULES:
- A 9x9 grid divided into nine 3x3 boxes
- Each row must contain digits 1-9 exactly once
- Each column must contain digits 1-9 exactly once
- Each 3x3 box must contain digits 1-9 exactly once

GRID NOTATION:
- Numbers 1-9 are filled cells (cannot be changed)
- The dot (.) represents an empty cell you can fill
- Rows are numbered 1-9 from top to bottom
- Columns are numbered 1-9 from left to right

YOUR TASK:
Analyze the current puzzle state and propose ONE move.
Think step-by-step about which cell to fill and why.

RESPONSE FORMAT (you must follow this exactly):
ROW: <number 1-9>
COL: <number 1-9>
VALUE: <number 1-9>
REASONING: <your step-by-step analysis>`;

/**
 * Validate LLM configuration
 */
export function validateConfig(config: LLMConfig): void {
  if (!config.baseUrl) {
    throw new Error('LLM baseUrl is required');
  }

  if (!config.model) {
    throw new Error('LLM model is required');
  }

  if (config.temperature < 0 || config.temperature > 2) {
    throw new Error('LLM temperature must be between 0 and 2');
  }

  if (config.maxTokens < 1) {
    throw new Error('LLM maxTokens must be positive');
  }

  if (config.timeout < 1000) {
    throw new Error('LLM timeout must be at least 1000ms');
  }

  if (config.maxHistoryMoves < 0) {
    throw new Error('LLM maxHistoryMoves must be non-negative');
  }
}

/**
 * Convert LLM Profile to LLMConfig
 * Spec 13: Profile to Config conversion
 */
export function profileToConfig(profile: LLMProfile): LLMConfig {
  return {
    baseUrl: profile.baseUrl,
    model: profile.model,
    temperature: profile.parameters.temperature,
    maxTokens: profile.parameters.maxTokens,
    timeout: profile.timeout,
    memoryEnabled: true, // Default to enabled, can be overridden
    maxHistoryMoves: 20, // Default value
  };
}

/**
 * Get active LLM configuration
 *
 * Priority:
 * 1. Active profile (if exists)
 * 2. Environment variables (fallback for backward compatibility)
 *
 * Spec 13: Profile-based configuration
 */
export function getActiveLLMConfig(): LLMConfig {
  try {
    const manager = new LLMProfileManager();
    const activeProfile = manager.getActive();

    if (activeProfile) {
      return profileToConfig(activeProfile);
    }
  } catch (error) {
    // Profile system not available or error loading - fall back to env vars
    console.warn('Failed to load active profile, using environment variables:', error instanceof Error ? error.message : String(error));
  }

  // Fallback to env vars (backward compatibility)
  return DEFAULT_LLM_CONFIG;
}

/**
 * Get LLM configuration with optional profile override
 *
 * @param profileName - Specific profile name to use (optional)
 * @returns LLMConfig
 */
export function getLLMConfig(profileName?: string): LLMConfig {
  if (!profileName) {
    return getActiveLLMConfig();
  }

  try {
    const manager = new LLMProfileManager();
    const profile = manager.get(profileName);

    if (!profile) {
      throw new Error(`Profile not found: ${profileName}`);
    }

    return profileToConfig(profile);
  } catch (error) {
    throw new Error(`Failed to load profile "${profileName}": ${error instanceof Error ? error.message : String(error)}`);
  }
}
