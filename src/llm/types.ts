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
  puzzleId: string;
  puzzleHash: string;       // For finding similar puzzles
  moveNumber: number;
  gridState: number[][];
  move: LLMMove;
  validation: MoveValidation;
  timestamp: Date;
  modelUsed: string;
  memoryWasEnabled: boolean;
}

/**
 * Play Session (Spec 11 - Play Session)
 */
export interface PlaySession {
  puzzleId: string;
  startTime: Date;
  endTime?: Date;

  // Outcome
  solved: boolean;
  abandoned: boolean;

  // Statistics
  totalMoves: number;
  correctMoves: number;
  invalidMoves: number;
  validButWrongMoves: number;

  // Learning data
  experiences: LLMExperience[];
  memoryWasEnabled: boolean;
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
 */
export interface FewShotExample {
  gridContext: string;
  analysis: string;
  move: {
    row: number;
    col: number;
    value: number;
  };
  outcome: 'CORRECT';
}

/**
 * Consolidation Report (from dreaming phase)
 */
export interface ConsolidationReport {
  patterns: {
    successStrategies: LLMPattern[];
    commonErrors: LLMErrorPattern[];
    wrongPathPatterns: LLMWrongPath[];
  };
  insights: string;
  fewShotsUpdated: number;
  experiencesConsolidated: number;
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
