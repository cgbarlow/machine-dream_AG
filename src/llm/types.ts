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
  model: string;            // 'qwen3-30b' or 'local-model' (friendly name)
  modelPath?: string;       // Full model path for lms CLI (e.g., "Qwen/QwQ-32B-GGUF/qwq-32b-q8_0.gguf")

  // Generation parameters
  temperature: number;      // 0.7 default
  maxTokens: number;        // 1024 for reasoning
  timeout: number;          // 60000ms for large models

  // Learning settings
  memoryEnabled: boolean;   // Toggle for A/B testing
  maxHistoryMoves: number;  // How many past moves to include
  includeReasoning: boolean; // Include reasoning snippets in move history

  // Per-profile customization (Spec 13)
  profileSystemPrompt?: string; // Additional system prompt from profile

  // Debugging
  debug?: boolean; // Show detailed debug output (e.g., LLM responses, pattern parsing)

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

  // Prompt sent to LLM (for debugging/analysis)
  prompt?: string;

  // Full reasoning storage (--save-reasoning)
  // Distinct from move.reasoning which stores only parsed REASONING field
  // This stores the complete streaming reasoning tokens from LM Studio
  fullReasoning?: string;
}

/**
 * Experience Context (Spec 11 - Importance Scoring)
 * Metrics for calculating experience importance
 */
export interface LLMExperienceContext {
  emptyCellsAtMove: number;   // Grid complexity indicator
  reasoningLength: number;    // Token proxy (character count)
  constraintDensity: number;  // Avg candidates per empty cell
  fullReasoningLength?: number; // Character count of full streaming reasoning
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
  learningUnitId: string;           // Learning unit used for this session
  learningContext: LearningContext; // Learning features available at session start

  // User annotations
  notes?: string;                   // User notes about this session
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
  // Strategy identification - OPTIONAL for anonymous patterns
  strategy?: string;          // Strategy name (undefined for anonymous patterns)
  abstractionLevel: number;   // 0=Instance, 1=Technique, 2=Category, 3=Principle

  // Teaching content (REQUIRED for both formats)
  situation: string;          // When this strategy applies
  analysis: string;           // Step-by-step reasoning to follow

  // Anonymous pattern format support
  reasoningTemplate?: string; // Template: "Cell (R,C). Row missing {X}..."
  isAnonymous?: boolean;      // True if pattern has no named strategy

  // Example move
  move: {
    row: number;
    col: number;
    value: number;
  };
  outcome: 'CORRECT';

  // Legacy compatibility (deprecated, use strategy/situation instead)
  gridContext?: string;

  // Spec 16: AISP-encoded version for --aisp-full mode
  aispEncoded?: string;

  // Spec 05 Section 8.5: Strategy Metadata (Added 2026-01-14)
  // Display metadata
  friendlyName?: string;    // Human-readable name (e.g., "Row-Column Intersection")
  category?: string;        // Classification: "basic", "intermediate", "advanced"

  // Usage tracking
  trainingCount?: number;   // Experiences that contributed to this strategy
  playCount?: number;       // Times used during play (successful moves)
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

  // Failure Learning (Spec 19)
  antiPatterns?: SynthesizedAntiPattern[];
  reasoningCorrections?: ReasoningCorrection[];

  // LLM-generated insights summary
  insights: string;

  // Metrics
  fewShotsUpdated: number;
  experiencesConsolidated: number;
  compressionRatio?: number;       // experiences / patterns (target: 10:1)
  abstractionLevels?: number;      // Number of hierarchy levels built

  // Algorithm used for clustering (Spec 18: Algorithm Versioning)
  algorithmUsed?: {
    name: string;
    version: number;
    identifier: string;
  };
}

/**
 * Dual Consolidation Result - Output of consolidateDual()
 *
 * Spec 05 Section 8.4: Dual Mode
 * Creates both standard AND -2x learning units from the same experiences.
 */
export interface DualConsolidationResult {
  standard: ConsolidationReport;
  doubled: ConsolidationReport;
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
// Failure Learning Types (Spec 19)
// ============================================================================

/**
 * Synthesized Anti-Pattern - LLM-generated from clustered invalid moves
 *
 * Created by analyzing clusters of invalid moves (rule violations) and
 * extracting common mistake patterns to avoid.
 *
 * Spec 19 Section 3
 */
export interface SynthesizedAntiPattern {
  id: string;
  antiPatternName: string;         // e.g., "Constraint Blindness"
  clusterName: string;             // Source error type cluster
  whatGoesWrong: string;           // Description of the mistake pattern
  whyItFails: string;              // Root cause explanation
  preventionSteps: string[];       // Action items to avoid this mistake
  examples: Array<{
    move: LLMMove;
    error: string;
  }>;
  frequency: number;               // How many experiences contributed
  sourceExperienceCount: number;

  // Spec 19: AISP-encoded version for --aisp-full mode
  aispEncoded?: string;
}

/**
 * Reasoning Correction - LLM analysis of valid-but-wrong moves
 *
 * Created by analyzing valid-but-wrong moves to understand where the
 * reasoning went wrong and how to correct it.
 *
 * Spec 19 Section 4
 */
export interface ReasoningCorrection {
  id: string;
  gridContext: string;             // Cell position and constraint state
  wrongMove: LLMMove;              // The incorrect move that was made
  correctValue: number;            // What the value should have been
  flawedReasoningStep: string;     // The specific step in reasoning that was wrong
  correction: string;              // How to reason correctly instead
  generalPrinciple: string;        // Abstracted lesson to remember
  confidence: number;              // LLM confidence in this analysis (0-1)
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
  // Strategy identification - OPTIONAL for anonymous patterns
  strategyName?: string;          // e.g., "Last Digit in Row" (undefined for anonymous)
  clusterName: string;            // The cluster this was extracted from

  // Teaching content
  whenToUse: string;              // Conditions that signal this strategy applies
  reasoningSteps: string[];       // Step-by-step reasoning to follow
  example: string;                // One clear example from the experiences
  successInsight: string;         // Why this approach reliably works

  // Anonymous pattern format support
  reasoningTemplate?: string;     // Template: "Cell (R,C). Row missing {X}..."
  isAnonymous?: boolean;          // True if generated without strategy name

  // Metadata
  abstractionLevel: AbstractionLevel;
  sourceExperienceCount: number;  // How many experiences contributed
  confidence: number;             // LLM's confidence in this pattern (0-1)

  // Spec 16: AISP-encoded version for --aisp-full mode
  aispEncoded?: string;
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

/**
 * Consolidation Options - Configuration for strategy count during dreaming
 *
 * Spec 05 Section 8.4: Strategy Count Configuration (2026-01-12)
 * Controls how many strategies are synthesized during consolidation.
 */
export interface ConsolidationOptions {
  doubleStrategies?: boolean;   // If true, double all strategy counts
  fewShotMin?: number;          // Min strategies for few-shot selection (default: 3, doubled: 6)
  fewShotMax?: number;          // Max strategies for few-shot selection (default: 5, doubled: 10)
  mergeMin?: number;            // Min strategies for merge output (default: 5, doubled: 10)
  mergeMax?: number;            // Max strategies for merge output (default: 7, doubled: 14)
}

/**
 * Default consolidation strategy counts
 */
export const DEFAULT_CONSOLIDATION_COUNTS = {
  fewShotMin: 3,
  fewShotMax: 5,
  mergeMin: 5,
  mergeMax: 7,
} as const;

/**
 * Doubled consolidation strategy counts (--double-strategies)
 */
export const DOUBLED_CONSOLIDATION_COUNTS = {
  fewShotMin: 6,
  fewShotMax: 10,
  mergeMin: 10,
  mergeMax: 14,
} as const;

// ============================================================================
// Learning Units (Spec 11 - Learning Units section)
// ============================================================================

/**
 * Learning Unit - A discrete package of consolidated knowledge
 *
 * Spec 11: Learning Units section
 * Learning units provide a higher-level abstraction for managing consolidated
 * knowledge. While profiles define the LLM connection, learning units define
 * discrete packages of learned strategies.
 *
 * Key features:
 * - Multiple units per profile (e.g., "easy-puzzles", "advanced-techniques")
 * - Iterative learning - units absorb new experiences over time
 * - Merge & distill - combine units via LLM-driven synthesis
 * - Export/import - share learned knowledge between installations
 */
export interface LearningUnit {
  id: string;                           // Unique ID within profile
  profileName: string;                  // Parent profile
  name: string;                         // Display name (e.g., "Easy Puzzles")
  description?: string;                 // Optional description
  createdAt: Date;
  lastUpdatedAt: Date;

  // Content
  fewShots: FewShotExample[];           // Consolidated strategies
  hierarchy?: AbstractionHierarchy;     // Abstraction levels (optional)

  // Failure Learning (Spec 19)
  antiPatterns?: SynthesizedAntiPattern[];     // Anti-patterns from invalid moves
  reasoningCorrections?: ReasoningCorrection[]; // Corrections from valid-but-wrong moves

  // Tracking
  absorbedExperienceIds: string[];      // Experiences already absorbed into this unit
  metadata: LearningUnitMetadata;
}

/**
 * Learning Unit Metadata - Statistics and tracking info
 */
export interface LearningUnitMetadata {
  totalExperiences: number;             // Total experiences absorbed
  puzzleBreakdown: Record<string, number>; // e.g., {"4x4:easy": 50, "9x9:hard": 20}
  lastConsolidationAt?: Date;           // When last consolidation occurred
  mergedFromUnits?: string[];           // If this unit was created by merging
  version: number;                      // Increments on each update
}

/**
 * Default learning unit ID
 * Used when no --learning-unit is specified for backwards compatibility
 */
export const DEFAULT_LEARNING_UNIT_ID = 'default';

/**
 * Suffix for double-strategy learning units
 * Automatically appended when --double-strategies is used
 *
 * Spec 05 Section 8.4: Naming Convention
 */
export const DOUBLE_STRATEGY_SUFFIX = '-2x';

/**
 * Display text for sessions with no learning unit
 * Used in session list when --no-learning was enabled
 */
export const NO_LEARNING_UNIT_DISPLAY = '(none)';

/**
 * Learning Unit Summary - Lightweight version for listings
 */
export interface LearningUnitSummary {
  id: string;
  profileName: string;
  name: string;
  description?: string;
  createdAt: Date;
  lastUpdatedAt: Date;
  strategyCount: number;
  experienceCount: number;
}
