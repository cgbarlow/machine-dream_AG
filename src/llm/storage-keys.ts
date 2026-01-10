/**
 * Storage Key Conventions for LLM Learning
 * Specification: docs/specs/11-llm-sudoku-player.md - Profile-Specific Learning & Learning Units
 *
 * This file documents the storage key conventions used for LLM experiences and learning.
 * All storage uses AgentDB's ReasoningBank metadata table.
 */

import { DEFAULT_LEARNING_UNIT_ID } from './types.js';

/**
 * Storage Key Conventions
 *
 * ## Experience Storage
 * Individual LLM experiences (moves with reasoning and outcomes)
 *
 * - **Key**: `experience.id` (UUID, e.g., "exp-abc123")
 * - **Type**: `'llm_experience'`
 * - **Data**: Full LLMExperience object including:
 *   - puzzleId, sessionId, profileName
 *   - move (row, col, value, reasoning)
 *   - validation (isValid, isCorrect, outcome, error)
 *   - gridState (board at time of move)
 *   - importance score, context metrics
 *   - consolidated flag
 *
 * ## Few-Shot Storage (Per-Profile, Per-Learning-Unit)
 * Few-shot examples for prompt injection, stored per LLM profile and learning unit
 *
 * - **Key**: `llm_fewshots:${profileName}:${learningUnitId}`
 *   - e.g., "llm_fewshots:qwen3-coder:default"
 *   - e.g., "llm_fewshots:qwen3-coder:easy-puzzles"
 * - **Type**: `'fewshot_examples'`
 * - **Data**: Array of FewShotExample objects
 *
 * ## Learning Unit Metadata Storage
 * Metadata about learning units
 *
 * - **Key**: `llm_learning_unit:${profileName}:${learningUnitId}`
 *   - e.g., "llm_learning_unit:qwen3-coder:default"
 * - **Type**: `'learning_unit'`
 * - **Data**: LearningUnit object (excluding fewShots which are stored separately)
 *
 * ## Key Design Rationale
 *
 * ### Two-Level Namespacing
 * Keys use `profile:unitId` format to:
 * - Enable **multiple learning tracks** per profile (e.g., easy vs hard puzzles)
 * - Support **iterative learning** - units absorb experiences over time
 * - Allow **unit merging** - combine knowledge from different training runs
 * - Maintain **backward compatibility** - 'default' unit works like before
 *
 * ### Profile Filtering for Experiences
 * Experiences include `profileName` field to:
 * - Filter during consolidation (only process experiences from same profile)
 * - Track which model/config generated each experience
 * - Enable per-profile analytics and learning reports
 *
 * ## Usage Examples
 *
 * ```typescript
 * // Store few-shots for a specific learning unit
 * const key = LLM_STORAGE_KEYS.getFewShotsKey('qwen3-coder', 'easy-puzzles');
 * // Returns: "llm_fewshots:qwen3-coder:easy-puzzles"
 *
 * // Store learning unit metadata
 * const metaKey = LLM_STORAGE_KEYS.getLearningUnitKey('qwen3-coder', 'easy-puzzles');
 * // Returns: "llm_learning_unit:qwen3-coder:easy-puzzles"
 *
 * // Parse a key to extract profile and unit
 * const parsed = LLM_STORAGE_KEYS.parseFewShotsKey('llm_fewshots:qwen3-coder:easy-puzzles');
 * // Returns: { profileName: 'qwen3-coder', learningUnitId: 'easy-puzzles' }
 * ```
 *
 * ## Migration Notes
 *
 * ### Legacy Storage (v1)
 * Before learning units, few-shots were stored with profile only:
 * - Key: `'llm_fewshots:${profileName}'` (no unit suffix)
 *
 * ### Backward Compatibility
 * - When `learningUnitId` is not specified, 'default' is used
 * - Legacy keys are migrated to `llm_fewshots:${profile}:default` on first access
 * - `isLegacyFewShotsKey()` helper detects old format
 */

export const LLM_STORAGE_KEYS = {
  /** Type identifier for LLM experience metadata */
  EXPERIENCE_TYPE: 'llm_experience' as const,

  /** Prefix for profile+unit few-shot storage keys */
  FEWSHOTS_PREFIX: 'llm_fewshots:' as const,

  /** Type identifier for few-shot examples metadata */
  FEWSHOTS_TYPE: 'fewshot_examples' as const,

  /** Prefix for learning unit metadata storage keys */
  LEARNING_UNIT_PREFIX: 'llm_learning_unit:' as const,

  /** Type identifier for learning unit metadata */
  LEARNING_UNIT_TYPE: 'learning_unit' as const,

  /**
   * Generate few-shot storage key for a profile and learning unit
   * @param profileName - LLM profile name
   * @param learningUnitId - Learning unit ID (defaults to 'default')
   * @returns Storage key (e.g., "llm_fewshots:qwen3-coder:easy-puzzles")
   */
  getFewShotsKey: (profileName: string, learningUnitId: string = DEFAULT_LEARNING_UNIT_ID): string => {
    return `llm_fewshots:${profileName}:${learningUnitId}`;
  },

  /**
   * Generate learning unit metadata storage key
   * @param profileName - LLM profile name
   * @param learningUnitId - Learning unit ID
   * @returns Storage key (e.g., "llm_learning_unit:qwen3-coder:easy-puzzles")
   */
  getLearningUnitKey: (profileName: string, learningUnitId: string): string => {
    return `llm_learning_unit:${profileName}:${learningUnitId}`;
  },

  /**
   * Parse a few-shots storage key to extract profile and learning unit
   * @param key - Storage key (e.g., "llm_fewshots:qwen3-coder:easy-puzzles")
   * @returns Object with profileName and learningUnitId, or null if not a valid key
   */
  parseFewShotsKey: (key: string): { profileName: string; learningUnitId: string } | null => {
    const prefix = 'llm_fewshots:';
    if (!key.startsWith(prefix)) {
      return null;
    }
    const remainder = key.substring(prefix.length);
    const colonIndex = remainder.indexOf(':');

    if (colonIndex === -1) {
      // Legacy format: llm_fewshots:profile (no unit)
      return { profileName: remainder, learningUnitId: DEFAULT_LEARNING_UNIT_ID };
    }

    return {
      profileName: remainder.substring(0, colonIndex),
      learningUnitId: remainder.substring(colonIndex + 1),
    };
  },

  /**
   * Parse a learning unit metadata key to extract profile and unit ID
   * @param key - Storage key (e.g., "llm_learning_unit:qwen3-coder:easy-puzzles")
   * @returns Object with profileName and learningUnitId, or null if not a valid key
   */
  parseLearningUnitKey: (key: string): { profileName: string; learningUnitId: string } | null => {
    const prefix = 'llm_learning_unit:';
    if (!key.startsWith(prefix)) {
      return null;
    }
    const remainder = key.substring(prefix.length);
    const colonIndex = remainder.indexOf(':');

    if (colonIndex === -1) {
      return null; // Invalid format - learning unit keys must have both profile and unit
    }

    return {
      profileName: remainder.substring(0, colonIndex),
      learningUnitId: remainder.substring(colonIndex + 1),
    };
  },

  /**
   * Check if a key is in the legacy format (profile only, no learning unit)
   * @param key - Storage key to check
   * @returns true if this is a legacy key that needs migration
   */
  isLegacyFewShotsKey: (key: string): boolean => {
    const prefix = 'llm_fewshots:';
    if (!key.startsWith(prefix)) {
      return false;
    }
    const remainder = key.substring(prefix.length);
    // Legacy keys have no second colon
    return !remainder.includes(':');
  },

  /**
   * Convert a legacy few-shots key to the new format
   * @param legacyKey - Old format key (e.g., "llm_fewshots:qwen3-coder")
   * @returns New format key (e.g., "llm_fewshots:qwen3-coder:default")
   */
  migrateLegacyKey: (legacyKey: string): string => {
    const parsed = LLM_STORAGE_KEYS.parseFewShotsKey(legacyKey);
    if (!parsed) {
      return legacyKey;
    }
    return LLM_STORAGE_KEYS.getFewShotsKey(parsed.profileName, DEFAULT_LEARNING_UNIT_ID);
  },

  // ============================================================================
  // Deprecated - kept for backward compatibility during migration
  // ============================================================================

  /**
   * @deprecated Use getFewShotsKey(profileName, learningUnitId) instead
   * This only works for the default learning unit
   */
  parseProfileFromKey: (key: string): string | null => {
    const parsed = LLM_STORAGE_KEYS.parseFewShotsKey(key);
    return parsed?.profileName ?? null;
  },
} as const;
