/**
 * LLM Sudoku Player - Type Definitions
 * Specification: docs/specs/11-llm-sudoku-player.md
 */

/**
 * LLM Configuration (Spec 11 - Configuration)
 */
export interface LLMConfig {
  // LM Studio connection
  baseUrl: string;          // 'http://localhost:1234/v1'
  model: string;            // 'qwen3-30b' or 'local-model'

  // Generation parameters
  temperature: number;      // 0.7 default
  maxTokens: number;        // 1024 for reasoning
  timeout: number;          // 60000ms for large models

  // Learning settings
  memoryEnabled: boolean;   // Toggle for A/B testing
  maxHistoryMoves: number;  // How many past moves to include
  includeReasoning: boolean; // Include reasoning snippets in move history

  // No hints, no fallback - these are NOT configurable
}

/**
 * Move Types (Spec 11 - Move Types)
 */
export interface LLMMove {
  row: number;              // 1-9 (user-facing)
  col: number;              // 1-9 (user-facing)
  value: number;            // 1-9
  reasoning: string;        // LLM's explanation
  confidence?: number;      // Optional self-assessment
}

export interface MoveValidation {
  isValid: boolean;         // Doesn't violate Sudoku rules
  isCorrect: boolean;       // Matches the solution
  outcome: 'correct' | 'invalid' | 'valid_but_wrong';
  error?: string;           // Human-readable error
}

export interface LLMExperience {
  id: string;
  sessionId: string;        // Unique session identifier (GUID)
  puzzleId: string;
  puzzleHash: string;       // For finding similar puzzles
  moveNumber: number;
  gridState: number[][];
  move: LLMMove;
  validation: MoveValidation;
  timestamp: Date;
  modelUsed: string;
  memoryWasEnabled: boolean;

  // Importance scoring (Spec 03 FR-A3, Spec 11)
  importance: number;       // 0.0 - 1.0, calculated at creation
  context: LLMExperienceContext;

  // Profile tracking (for A/B testing and configuration analysis)
  profileName: string;      // LLM profile used (e.g., "lm-studio-qwen3")

  // Learning features active at time of move
  learningContext: LearningContext;
}

/**
 * Experience Context (Spec 11 - Importance Scoring)
 * Metrics for calculating experience importance
 */
export interface LLMExperienceContext {
  emptyCellsAtMove: number;   // Grid complexity indicator
  reasoningLength: number;    // Token proxy (character count)
  constraintDensity: number;  // Avg candidates per empty cell
}

/**
 * Learning Context (Spec 11 - A/B Testing)
 * Tracks which learning features were active at time of move/session
 * Enables analysis of which configurations produce best results
 */
export interface LearningContext {
  fewShotsUsed: boolean;              // Were few-shot examples injected into prompt?
  fewShotCount: number;               // How many few-shots were used (0-5 typically)
  patternsAvailable: number;          // Learned patterns available at session start
  consolidatedExperiences: number;    // Prior consolidated experience count
}

/**
 * Play Session (Spec 11 - Play Session)
 */
export interface PlaySession {
  id: string;                       // Unique session identifier (GUID)
  puzzleId: string;
  startTime: Date;
  endTime?: Date;

  // Outcome
  solved: boolean;
  abandoned: boolean;
  abandonReason?: string;           // Why session was abandoned (max_moves, error, parse_error, etc.)

  // Statistics
  totalMoves: number;
  correctMoves: number;
  invalidMoves: number;
  validButWrongMoves: number;

  // Learning data
  experiences: LLMExperience[];
  memoryWasEnabled: boolean;

  // Profile and learning tracking (for A/B testing)
  profileName: string;              // LLM profile used for this session
  learningContext: LearningContext; // Learning features available at session start
}

/**
 * Chat Message (OpenAI-compatible format)
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * LLM Response (parsed from API)
 */
export interface LLMResponse {
  move: LLMMove;
  rawResponse: string;
  parseSuccess: boolean;
  parseError?: string;
}

/**
 * Few-Shot Example (for memory-enabled prompts)
 *
 * Spec 11: Few-shots must be LLM-synthesized strategies, not raw move data
 * Each example teaches a strategy that can be applied to similar situations
 */
export interface FewShotExample {
  // Strategy identification
  strategy: string;           // Strategy name (e.g., "Last Digit in Row")
  abstractionLevel: number;   // 0=Instance, 1=Technique, 2=Category, 3=Principle

  // Teaching content
  situation: string;          // When this strategy applies
  analysis: string;           // Step-by-step reasoning to follow

  // Example move
  move: {
    row: number;
    col: number;
    value: number;
  };
  outcome: 'CORRECT';

  // Legacy compatibility (deprecated, use strategy/situation instead)
  gridContext?: string;
}

/**
 * Consolidation Report (from dreaming phase)
 *
 * Spec 11: LLM-driven consolidation produces synthesized patterns
 * and a 4-level abstraction hierarchy
 */
export interface ConsolidationReport {
  // Synthesized patterns from LLM analysis
  patterns: {
    successStrategies: SynthesizedPattern[];
    commonErrors: LLMErrorPattern[];
    wrongPathPatterns: LLMWrongPath[];
  };

  // Abstraction hierarchy built by LLM
  hierarchy?: AbstractionHierarchy;

  // LLM-generated insights summary
  insights: string;

  // Metrics
  fewShotsUpdated: number;
  experiencesConsolidated: number;
  compressionRatio?: number;       // experiences / patterns (target: 10:1)
  abstractionLevels?: number;      // Number of hierarchy levels built
}

export interface LLMPattern {
  gridContext: string;
  reasoning: string;
  move: { row: number; col: number; value: number };
  successRate: number;
}

export interface LLMErrorPattern {
  errorType: string;
  frequency: number;
  examples: Array<{
    move: LLMMove;
    error: string;
  }>;
}

export interface LLMWrongPath {
  context: string;
  wrongMove: LLMMove;
  correctMove: { row: number; col: number; value: number };
  frequency: number;
}

// ============================================================================
// LLM-Driven Dreaming Types (Spec 11, Spec 05 Section 8)
// ============================================================================

/**
 * Abstraction Level for the 4-level hierarchy
 *
 * Level 0: Specific instances ("Cell (3,5) had only 7 missing from row")
 * Level 1: Named techniques ("Last Digit in Row")
 * Level 2: Strategy categories ("Completion Strategies")
 * Level 3: General principles ("Constraint Satisfaction")
 */
export interface AbstractionLevel {
  level: 0 | 1 | 2 | 3;
  name: string;
  description: string;
}

/**
 * Synthesized Pattern - LLM-generated strategy from analyzing experiences
 *
 * This is the output of the "dreaming brain" analyzing a cluster of
 * similar successful moves and extracting the underlying strategy.
 *
 * IMPORTANT: The LLM must analyze FULL reasoning chains, never truncated.
 */
export interface SynthesizedPattern {
  // Strategy identification
  strategyName: string;           // e.g., "Last Digit in Row"
  clusterName: string;            // The cluster this was extracted from

  // Teaching content
  whenToUse: string;              // Conditions that signal this strategy applies
  reasoningSteps: string[];       // Step-by-step reasoning to follow
  example: string;                // One clear example from the experiences
  successInsight: string;         // Why this approach reliably works

  // Metadata
  abstractionLevel: AbstractionLevel;
  sourceExperienceCount: number;  // How many experiences contributed
  confidence: number;             // LLM's confidence in this pattern (0-1)
}

/**
 * Abstraction Hierarchy - Multi-level organization of patterns
 *
 * Built by the LLM to organize strategies from specific to general.
 */
export interface AbstractionHierarchy {
  levels: HierarchyLevel[];
  profileName: string;
  createdAt: Date;
  totalPatterns: number;
}

export interface HierarchyLevel {
  level: 0 | 1 | 2 | 3;
  name: string;                   // e.g., "Specific Instances", "Named Techniques"
  items: string[];                // Items at this level
  description?: string;
}

/**
 * Anti-Pattern - LLM-synthesized description of what NOT to do
 *
 * Spec 11: Negative Example Learning (2026-01-09)
 * The LLM analyzes its mistakes and synthesizes anti-patterns as free text.
 * This is stored as part of the consolidation report, not as a separate structure.
 */
export interface AntiPattern {
  mistake: string;            // What went wrong
  whyWrong: string;           // Why this approach fails
  instead: string;            // What to do instead
}
