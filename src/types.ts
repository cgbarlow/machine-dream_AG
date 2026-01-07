/**
 * Core type definitions for the Machine Dream Research POC
 *
 * This file contains the foundational types for:
 * - Puzzle representation
 * - GRASP loop structures
 * - AgentDB Integration (Native Types)
 */

// MOCK: AgentDB Native Types (Simulating external library)
export interface AgentDBReasoningBank {
  logMove(move: Move, outcome: ValidationResult): Promise<void>;
  logStrategy(strategy: string, result: ValidationResult): Promise<void>;
  logInsight(insight: Insight): Promise<void>;
  querySimilar(context: PuzzleState): Promise<Experience[]>;
  distillPatterns(sessionId: string): Promise<Pattern[]>;
  consolidate(experiences: Experience[]): Promise<ConsolidatedKnowledge>;

  // Additional methods for LLM experience storage (Spec 11)
  storeReasoning(data: {
    trajectory_id: string;
    step_index: number;
    action: string;
    reasoning: string;
    outcome: string;
    feedback: string;
  }): Promise<void>;
  storeMetadata(key: string, type: string, data: unknown): Promise<void>;
  getTrajectory(trajectoryId: string): Promise<{ steps: Array<{ step_index: number }> } | null>;
  getMetadata(key: string, type: string): Promise<unknown>;
  queryMetadata(type: string, filter: Record<string, unknown>): Promise<unknown[]>;
}

export interface AgentDBReflexionMemory {
  storeReflexion(error: ReflexionError): Promise<void>;
  getCorrections(error: Error): Promise<Move[]>;
}

export interface AgentDBSkillLibrary {
  consolidateSkills(filter: { minSuccessRate: number }): Promise<Skill[]>;
  applySkill(state: PuzzleState): Promise<Move | null>;
}

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
  strategy: string; // e.g., "naked key pair", "hidden subset"
  timestamp: number;
};

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert' | 'diabolical';

export type PuzzleState = {
  grid: Grid;
  candidates: Map<string, CandidateSet>; // "row,col" -> Set<number>
  moveHistory: Move[];
  difficulty: DifficultyLevel;
};

// ============================================================================
// Puzzle Generation Types (Spec 12)
// ============================================================================

export type GridSize = 4 | 9 | 16 | 25;

export type SymmetryType = 'none' | 'rotational' | 'reflectional' | 'diagonal';

export interface PuzzleGenerationConfig {
  seed?: number;                  // Random seed (auto-generated if not provided)
  size?: GridSize;                // Grid size (default: 9)
  difficulty?: DifficultyLevel;   // Target difficulty (default: 'medium')
  symmetry?: SymmetryType;        // Cell removal symmetry (default: 'none')
  validateUniqueness?: boolean;   // Ensure single solution (default: true)
  maxRetries?: number;            // Max retry attempts (default: 100)
}

export interface GeneratedPuzzle {
  grid: Grid;                     // Puzzle grid with clues
  solution: Grid;                 // Complete solution grid
  seed: number;                   // Seed used for generation
  size: GridSize;                 // Grid size
  targetDifficulty: DifficultyLevel;
  actualDifficulty: DifficultyLevel;
  clueCount: number;              // Number of given cells
  generationTimeMs: number;       // Time taken to generate
  retryCount: number;             // Number of retries needed
  isValid: boolean;               // Validation passed
  hasUniqueSolution: boolean;     // Has exactly one solution
}

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

export type InsightType = 'strategy-discovery' | 'breakthrough' | 'pattern-recognition' | 'error-correction';

export type Insight = {
  type: InsightType;
  content: string;
  confidence: number;
  timestamp: number;
  relatedMoves: Move[];
};

// ============================================================================
// AgentDB Native Integration Types
// ============================================================================

/**
 * Represents a consolidated pattern in AgentDB's ReasoningBank
 */
export type ReasoningPattern = {
  id: string;
  taskType: string;
  approach: string;
  successRate: number;
  tags: string[];
  usageCount: number;
  lastUsed: number;
};

/**
 * Represents an episodic memory in AgentDB's ReflexionMemory
 */
export type Episode = {
  sessionId: string;
  task: string;
  input: string;
  output: string;
  reward: number; // 0.0 to 1.0
  success: boolean;
  critique?: string; // Self-correction or feedback
  timestamp: number;
};

/**
 * Represents a reusable skill in AgentDB's SkillLibrary
 */
export type Skill = {
  name: string;
  description: string;
  triggerCondition: string; // When to apply this skill
  actionSequence: string[]; // Abstracted steps
  transferabilityScore: number;
};

// ============================================================================
// Configuration
// ============================================================================

export type POCConfig = {
  agentDbPath: string; // Path to local .db file
  embeddingModel: string; // e.g., 'Xenova/all-MiniLM-L6-v2'
  enableReasoningBank: boolean;
  enableReflexion: boolean;
  enableSkillLibrary: boolean;
  // Deprecated: memorySystem choice (now exclusively agentdb)
};

export type AgentDBConfig = POCConfig & {
  dbPath: string;
  preset: 'large';
  rlPlugin: {
    type: 'decision-transformer';
    name: 'sudoku-solver';
    stateDim: number;
    actionDim: number;
    sequenceLength: number;
  };
  reflexion: {
    enabled: boolean;
    maxEntries: number;
    similarityThreshold: number;
  };
  skillLibrary: {
    enabled: boolean;
    minSuccessRate: number;
    maxSkills: number;
    autoConsolidate: boolean;
  };
  quantization: string;
  indexing: string;
  cacheEnabled: boolean;
};

export type Experience = {
  id: string;
  sessionId: string;
  puzzleId: string;
  timestamp: number;
  trajectory: Move[];
  outcome: ValidationResult['outcome'];
  duration: number;
  insights: Insight[];
};

export type Pattern = {
  id: string;
  type: string;
  description: string;
  conditions: string[];
  actions: string[];
  successRate: number;
  usageCount: number;
  examples: string[];
  confidence: number;
};

export type ConsolidatedKnowledge = {
  sessionIds: string[];
  patterns: Pattern[];
  abstractionLadder: any; // Simplified for now
  compressionRatio: number;
  verificationStatus: 'verified' | 'unverified';
  timestamp: number;
};

export type ReflexionError = {
  trajectory: Move[];
  error: Error;
  correction: Move;
  timestamp: number;
};

export type RLAction = {
  cell: Cell;
  value: number;
  confidence: number;
};

export type RichContext = {
  similarExperiences: Experience[];
  relevantPatterns: Pattern[];
  suggestedStrategies: string[];
  riskAssessment: {
    riskLevel: 'low' | 'medium' | 'high';
    warning: string;
  };
};

export interface MemorySystem {
  logMove(move: Move, outcome: ValidationResult): Promise<void>;
  logStrategy(strategy: string, result: ValidationResult): Promise<void>;
  querySimilar(context: PuzzleState): Promise<Experience[]>;
  distillPatterns(sessionId: string): Promise<Pattern[]>;
  consolidate(experiences: Experience[]): Promise<ConsolidatedKnowledge>;

  // AgentDB specific
  storeReflexion(error: ReflexionError): Promise<void>;
  getCorrections(similarError: Error): Promise<Move[]>;
  consolidateSkills(filter: { minSuccessRate: number }): Promise<Skill[]>;
  applySkill(state: PuzzleState): Promise<Move | null>;
  trainRL(config: { epochs: number; batchSize: number }): Promise<void>;
  selectActionRL(state: PuzzleState, availableActions: Move[]): Promise<RLAction>;
  synthesizeContext(state: PuzzleState, k: number): Promise<RichContext>;
  optimizeMemory(): Promise<{ patternsConsolidated: number }>;
}

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

export type Constraint = {
  type: 'row' | 'column' | 'box';
  index: number;
  satisfiedValues: Set<number>;
  remainingValues: Set<number>;
};

export type AttentionContext = {
  currentState: PuzzleState;
  recentMoves: Move[];
  lastVisited: Map<string, number>;
  constraints: Constraint[];
};

// ============================================================================
// Metrics & Progress Types
// ============================================================================

export type Momentum = 'accelerating' | 'steady' | 'decelerating' | 'stuck';

export type ProgressMetrics = {
  cellsFilled: number;
  percentComplete: number;
  movesPerMinute: number;
  successRate: number;
  momentum: Momentum;
  plateauDuration: number;
  currentStrategy: string;
  strategySuccessRate: number;
  confidenceLevel: number;
};

export type ReflectionResult = {
  patterns: Pattern[];
  progress: ProgressMetrics;
  insights: Insight[];
  candidatesUpdated: number;
  timestamp: number;
};

export type MoveOutcome = 'success' | 'failure' | 'progress';

// ============================================================================
// Dreaming & Consolidation Types
// ============================================================================

export type AbstractionLevel = {
  level: number;
  name: string;
  patterns: Pattern[];
  generalizations: string[];
  exampleCount: number;
};

export type AbstractionLadder = {
  levels: AbstractionLevel[];
  domain: string;
  createdAt: number;
  metadata: {
    sourcePatternCount: number;
    abstractionMethod: string;
    verificationScore: number;
  };
};

export type TriageConfig = {
  minImportance: number;
  maxItems: number;
};

export type CompressionConfig = {
  targetRatio: number;
  clusteringMethod: 'semantic' | 'structural' | 'hybrid';
};

// ============================================================================
// Orchestration & System Types
// ============================================================================

export type SystemStatus = 'initializing' | 'ready' | 'running' | 'dreaming' | 'error' | 'shutdown';

export type OrchestratorConfig = AgentDBConfig & {
  maxIterations: number;
  reflectionInterval: number;
  dreamingSchedule: 'after-session' | 'periodic' | 'manual';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  demoMode: boolean;
};

export type SolveResult = {
  success: boolean;
  finalState: PuzzleState;
  metrics: {
    iterations: number;
    duration: number;
    insights: number;
  };
  experiences: Experience[];
};

// ============================================================================
// Benchmarking Types
// ============================================================================

export type BenchmarkType = 'single-shot' | 'naive-continuous' | 'grasp-baseline' | 'grasp-dreaming';

export type BenchmarkResult = {
  benchmarkType: BenchmarkType;
  puzzleId: string;
  difficulty: string;
  success: boolean;
  solveTime: number;
  iterations: number;
  strategiesUsed: string[];
  param_patternsApplied?: number; // Specific to grasp-dreaming
  timestamp: number;
};

export type BenchmarkSuiteResult = {
  suiteName: string;
  timestamp: number;
  summary: {
    total: number;
    solved: number;
    failed: number;
    avgTime: number;
    avIterations: number;
  };
  details: BenchmarkResult[];
};

