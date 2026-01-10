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
  temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.3'), // Lower temp for more deterministic reasoning
  maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2048', 10), // Increased to allow complete reasoning without cutoff
  timeout: parseInt(process.env.LLM_TIMEOUT || '240000', 10), // 4 minutes for slow models (ROCm/AMD at ~12 tokens/sec)

  // Learning settings
  memoryEnabled: process.env.LLM_MEMORY_ENABLED !== 'false',
  maxHistoryMoves: parseInt(process.env.LLM_MAX_HISTORY_MOVES || '20', 10),
  includeReasoning: process.env.LLM_INCLUDE_REASONING === 'true', // Default: OFF
};

/**
 * System Prompt (Spec 11 - Prompt Engineering)
 * Simplified: removed meta-instructions, let LLM learn naturally from feedback
 * Anti-rambling: Enforces concise reasoning with strict constraints
 *
 * NOTE: This is the default 9x9 prompt. Use buildSystemPrompt() for dynamic size.
 */
export const SYSTEM_PROMPT = buildSystemPrompt(9);

/**
 * System prompt options
 */
export interface SystemPromptOptions {
  /** Use structured reasoning template (constraint intersection format) */
  useReasoningTemplate?: boolean;
}

/**
 * Build system prompt for specific grid size
 * Supports 4x4, 9x9, 16x16, 25x25 grids
 *
 * @param gridSize - Grid dimension (4, 9, 16, or 25)
 * @param options - Optional configuration for prompt style
 */
export function buildSystemPrompt(gridSize: number, options: SystemPromptOptions = {}): string {
  const boxSize = Math.sqrt(gridSize);
  const maxValue = gridSize;

  // Base rules section (shared)
  const rulesSection = `You are solving Sudoku puzzles through trial and error.

RULES:
- ${gridSize}x${gridSize} grid, ${gridSize} ${boxSize}x${boxSize} boxes
- Each row contains 1-${maxValue} exactly once
- Each column contains 1-${maxValue} exactly once
- Each box contains 1-${maxValue} exactly once

NOTATION:
- Numbers 1-${maxValue} are filled cells (cannot be changed)
- Underscore (_) is empty cell you can fill
- Rows/columns numbered 1-${gridSize}

FEEDBACK:
- CORRECT: Move accepted
- INVALID: Violates rules
- VALID_BUT_WRONG: Legal but incorrect

CRITICAL CONSTRAINT:
- NEVER attempt any move listed in FORBIDDEN MOVES
- If a move appears in FORBIDDEN MOVES, it has been proven wrong
- You MUST choose a different cell or value`;

  // Reasoning template mode: structured constraint intersection format
  if (options.useReasoningTemplate) {
    return `${rulesSection}

SOLVING METHOD (follow exactly):
1. Pick an empty cell
2. List digits MISSING from its ROW as a set {x,y,z}
3. List digits MISSING from its COLUMN as a set {a,b,c}
4. List digits MISSING from its BOX as a set {p,q,r}
5. Find the INTERSECTION of all three sets
6. If intersection has exactly ONE digit, that's your answer
7. If multiple digits possible, pick the most constrained cell instead

OUTPUT FORMAT:
ROW: <1-${gridSize}>
COL: <1-${gridSize}>
VALUE: <1-${maxValue}>
REASONING: <use template below>

REASONING TEMPLATE (follow exactly):
"Cell (R,C). Row missing {X,Y,Z}. Col missing {A,B,C}. Box missing {P,Q,R}. Intersection={V}."

CRITICAL:
- Use set notation {1,2,3} not prose
- Keep reasoning under 150 characters
- Do NOT reference strategy names
- Do NOT say "Applying Strategy" or "Using technique"
- Pure constraint math only`;
  }

  // Default mode: general instructions
  return `${rulesSection}

OUTPUT FORMAT:
ROW: <1-${gridSize}>
COL: <1-${gridSize}>
VALUE: <1-${maxValue}>
REASONING: <brief analysis>

CRITICAL INSTRUCTIONS FOR REASONING:
- State your move choice IMMEDIATELY in the first line
- Keep reasoning under 200 characters total
- Do NOT second-guess or restart your analysis
- Do NOT say "wait", "actually", "let me recheck"
- Do NOT explain what you already tried
- One analysis per move - commit to your choice`;
}

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
  // Normalize baseUrl: ensure /v1 suffix for OpenAI-compatible APIs
  let baseUrl = profile.baseUrl;
  if (profile.provider === 'lmstudio' || profile.provider === 'openai') {
    // Remove trailing slash
    baseUrl = baseUrl.replace(/\/$/, '');
    // Add /v1 if not present
    if (!baseUrl.endsWith('/v1')) {
      baseUrl = `${baseUrl}/v1`;
    }
  }

  return {
    baseUrl,
    model: profile.model,
    temperature: profile.parameters.temperature,
    maxTokens: profile.parameters.maxTokens,
    timeout: profile.timeout,
    memoryEnabled: true, // Default to enabled, can be overridden
    maxHistoryMoves: 20, // Default value
    includeReasoning: false, // Default: OFF
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
