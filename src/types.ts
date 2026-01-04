/**
 * Core type definitions for the Cognitive Puzzle Solver POC
 *
 * This file contains the foundational types for:
 * - Sudoku puzzle representation
 * - GRASP loop structures
 * - Memory systems
 * - Dreaming pipeline
 */

// ============================================================================
// Puzzle Domain Types
// ============================================================================

export type Cell = {
  row: number;
  col: number;
};

export type Grid = number[][]; // 0 = empty, 1-9 = filled

export type CandidateSet = Set<number>;

export type Move = {
  cell: Cell;
  value: number;
  strategy: string;
  timestamp: number;
};

export type PuzzleState = {
  grid: Grid;
  candidates: Map<string, CandidateSet>; // "row,col" -> Set<number>
  moveHistory: Move[];
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
};

// ============================================================================
// GRASP Loop Types
// ============================================================================

export type GRASPIteration = {
  generate: () => Promise<Move[]>;
  review: (moves: Move[]) => Promise<ValidationResult>;
  absorb: (result: ValidationResult) => Promise<void>;
  synthesize: (context: PuzzleState) => Promise<Insight[]>;
  persist: (insights: Insight[]) => Promise<void>;
};

export type ValidationResult = {
  move: Move;
  isValid: boolean;
  outcome: 'success' | 'failure' | 'progress';
  error?: Error;
  nextState: PuzzleState;
};

// Insight types aligned with Attention Mechanism spec (04-attention-mechanism-spec.md)
export type InsightType = 'strategy-discovery' | 'breakthrough' | 'pattern-recognition' | 'error-correction';

export type Insight = {
  type: InsightType;
  content: string;
  confidence: number;
  timestamp: number;
  relatedMoves: Move[];
};

// ============================================================================
// Memory System Types
// ============================================================================

export type WorkingMemory = {
  currentState: PuzzleState;
  focus: Cell;
  recentMoves: Move[]; // Last 5-10 moves
  activeStrategy: string;
};

export type Experience = {
  puzzleId: string;
  sessionId: string;
  trajectory: Move[];
  outcome: 'solved' | 'failed' | 'timeout';
  strategySequence: string[];
  insights: Insight[];
  duration: number;
  timestamp: number;
};

export type Pattern = {
  id: string;
  type: 'strategy' | 'technique' | 'heuristic';
  description: string;
  conditions: string[];
  actions: string[];
  successRate: number;
  usageCount: number;
  examples: Experience[];
};

// ============================================================================
// Dreaming Pipeline Types
// ============================================================================

export type DreamPhase = 'capture' | 'triage' | 'compress' | 'abstract' | 'integrate' | 'prune' | 'verify';

export type AbstractionLevel = {
  level: number;
  name: string;
  patterns: Pattern[];
  generalizations: string[];
};

export type AbstractionLadder = {
  levels: AbstractionLevel[];
  domain: string;
  createdAt: number;
};

export type ConsolidatedKnowledge = {
  sessionIds: string[];
  patterns: Pattern[];
  abstractionLadder: AbstractionLadder;
  compressionRatio: number;
  verificationStatus: 'verified' | 'unverified' | 'failed';
  timestamp: number;
};

// ============================================================================
// Attention Mechanism Types
// ============================================================================

export type AttentionScore = {
  cell: Cell;
  score: number;
  uncertainty: number;
  relevance: number;
  importance: number;
  recency: number;
};

export type AttentionContext = {
  currentState: PuzzleState;
  recentMoves: Move[];
  lastVisited: Map<string, number>; // "row,col" -> timestamp
  constraints: Constraint[];
};

export type Constraint = {
  type: 'row' | 'column' | 'box';
  index: number;
  satisfiedValues: Set<number>;
  remainingValues: Set<number>;
};

/**
 * Progress momentum tracking for reflection scheduling
 * (from Attention Mechanism spec Section 3.2)
 */
export type Momentum = 'accelerating' | 'steady' | 'decelerating' | 'stuck';

/**
 * Progress metrics for tracking solving efficiency
 */
export type ProgressMetrics = {
  iterationCount: number;
  successfulMoves: number;
  failedMoves: number;
  momentum: Momentum;
  efficiency: number; // successful / total moves
};

/**
 * Reflection analysis result
 * (from Attention Mechanism spec Section 3)
 *
 * Note: AttentionMechanism (component name) is implemented by AttentionManager (class)
 */
export type ReflectionResult = {
  shouldReflect: boolean;
  insights: Insight[];
  progressMetrics: ProgressMetrics;
  recommendations: string[];
};

// ============================================================================
// Benchmarking Types
// ============================================================================

export type BenchmarkType = 'single-shot' | 'naive-continuous' | 'grasp-baseline' | 'grasp-with-dreaming';

export type SolveMetrics = {
  benchmarkType: BenchmarkType;
  puzzleId: string;
  difficulty: string;
  success: boolean;
  solveTime: number; // milliseconds
  moveCount: number;
  strategyChanges: number;
  insightCount: number;
  tokensUsed: number;
  cost: number;
};

export type TransferMetrics = {
  sourceTask: string;
  targetTask: string;
  baselinePerformance: number;
  transferPerformance: number;
  improvement: number;
  skillsTransferred: number;
};

// ============================================================================
// ReasoningBank Integration Types (Primary Memory)
// ============================================================================

export type ReasoningBankAdapter = {
  logMove: (move: Move, outcome: ValidationResult) => Promise<void>;
  logStrategy: (strategy: string, result: ValidationResult) => Promise<void>;
  logInsight: (insight: Insight) => Promise<void>;
  querySimilar: (context: PuzzleState) => Promise<Experience[]>;
  distillPatterns: (sessionId: string) => Promise<Pattern[]>;
  buildAbstractionLadder: (patterns: Pattern[]) => Promise<AbstractionLadder>;
  consolidate: (experiences: Experience[]) => Promise<ConsolidatedKnowledge>;
  verify: (knowledge: ConsolidatedKnowledge) => Promise<boolean>;
};

// ============================================================================
// AgentDB Integration Types (Optional - Phase 2 Evaluation)
// ============================================================================

export type RLAction = {
  cell: Cell;
  value: number;
  confidence: number;
};

export type ReflexionError = {
  trajectory: Move[];
  error: Error;
  correction: Move;
  learned: boolean;
};

export type Skill = {
  id: string;
  name: string;
  pattern: Pattern;
  successRate: number;
  applicationCount: number;
  transferability: number;
};

export type AgentDBAdapter = {
  // Everything ReasoningBank has (100% compatible)
  logMove: (move: Move, outcome: ValidationResult) => Promise<void>;
  logStrategy: (strategy: string, result: ValidationResult) => Promise<void>;
  querySimilar: (context: PuzzleState) => Promise<Experience[]>;
  distillPatterns: (sessionId: string) => Promise<Pattern[]>;
  consolidate: (experiences: Experience[]) => Promise<ConsolidatedKnowledge>;

  // PLUS: RL learning
  trainRL: (config: { epochs: number; batchSize: number }) => Promise<void>;
  selectActionRL: (state: PuzzleState, availableActions: Move[]) => Promise<RLAction>;

  // PLUS: Reflexion memory
  storeReflexion: (error: ReflexionError) => Promise<void>;
  getCorrections: (similarError: Error) => Promise<Move[]>;

  // PLUS: Skill library
  consolidateSkills: (filter: { minSuccessRate: number }) => Promise<Skill[]>;
  applySkill: (state: PuzzleState) => Promise<Move | null>;

  // PLUS: Advanced reasoning
  synthesizeContext: (state: PuzzleState, k: number) => Promise<RichContext>;
  optimizeMemory: () => Promise<{ patternsConsolidated: number }>;
};

export type RichContext = {
  similarExperiences: Experience[];
  applicableSkills: Skill[];
  synthesizedInsights: Insight[];
  recommendedStrategies: string[];
};

// ============================================================================
// Configuration Types
// ============================================================================

export type POCConfig = {
  memorySystem: 'reasoningbank' | 'agentdb';
  enableRL: boolean;
  enableReflexion: boolean;
  enableSkillLibrary: boolean;
  maxSolveTime: number; // milliseconds
  reflectionInterval: number; // iterations
  dreamingSchedule: 'after-session' | 'periodic' | 'manual';
};
