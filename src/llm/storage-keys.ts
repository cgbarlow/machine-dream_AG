/**
 * Storage Key Conventions for LLM Learning
 * Specification: docs/specs/11-llm-sudoku-player.md - Profile-Specific Learning
 *
 * This file documents the storage key conventions used for LLM experiences and learning.
 * All storage uses AgentDB's ReasoningBank metadata table.
 */

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
 * ## Few-Shot Storage (Per-Profile)
 * Few-shot examples for prompt injection, stored per LLM profile
 *
 * - **Key**: `llm_fewshots:${profileName}` (e.g., "llm_fewshots:qwen3-coder")
 * - **Type**: `'fewshot_examples'`
 * - **Data**: Array of FewShotExample objects:
 *   - gridContext (description of board state)
 *   - analysis (reasoning that led to correct move)
 *   - move (row, col, value)
 *   - outcome (always 'CORRECT')
 *   - metadata: updated timestamp, profileName
 *
 * ## Key Design Rationale
 *
 * ### Profile Namespacing
 * Few-shots use `llm_fewshots:${profileName}` instead of global `llm_fewshots` to:
 * - Enable **independent learning trajectories** for different LLM profiles
 * - Support **A/B testing** - compare performance of different models/configs
 * - Prevent **cross-contamination** - qwen3-coder doesn't use gpt4's patterns
 * - Allow **profile-specific optimization** - each model learns its own best practices
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
 * // Store experience with profile tracking
 * await reasoningBank.storeMetadata(experience.id, 'llm_experience', {
 *   ...experience,
 *   profileName: 'qwen3-coder',
 *   consolidated: false,
 * });
 *
 * // Load few-shots for specific profile
 * const data = await reasoningBank.getMetadata(
 *   'llm_fewshots:qwen3-coder',
 *   'fewshot_examples'
 * );
 *
 * // Query unconsolidated experiences for a profile
 * const allExperiences = await reasoningBank.queryMetadata('llm_experience', {
 *   consolidated: false
 * });
 * const profileExperiences = allExperiences.filter(
 *   exp => exp.profileName === 'qwen3-coder'
 * );
 * ```
 *
 * ## Migration Notes
 *
 * ### Legacy Storage
 * Before profile-specific learning, few-shots were stored globally:
 * - Key: `'llm_fewshots'` (no profile suffix)
 * - This mixed learnings from all profiles
 *
 * ### Backward Compatibility
 * Old experiences without `profileName` field will:
 * - Be treated as `profileName: 'default'`
 * - Not be consolidated by profile-specific consolidation
 * - Can be backfilled if needed
 */

export const LLM_STORAGE_KEYS = {
  /** Type identifier for LLM experience metadata */
  EXPERIENCE_TYPE: 'llm_experience' as const,

  /** Prefix for profile-specific few-shot storage keys */
  FEWSHOTS_PREFIX: 'llm_fewshots:' as const,

  /** Type identifier for few-shot examples metadata */
  FEWSHOTS_TYPE: 'fewshot_examples' as const,

  /**
   * Generate few-shot storage key for a profile
   * @param profileName - LLM profile name
   * @returns Storage key (e.g., "llm_fewshots:qwen3-coder")
   */
  getFewShotsKey: (profileName: string): string => {
    return `llm_fewshots:${profileName}`;
  },

  /**
   * Extract profile name from few-shot storage key
   * @param key - Storage key (e.g., "llm_fewshots:qwen3-coder")
   * @returns Profile name or null if not a few-shot key
   */
  parseProfileFromKey: (key: string): string | null => {
    const prefix = 'llm_fewshots:';
    if (key.startsWith(prefix)) {
      return key.substring(prefix.length);
    }
    return null;
  },
} as const;
