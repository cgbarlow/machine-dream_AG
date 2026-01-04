/**
 * Core type definitions for the Machine Dream Research POC
 *
 * This file contains the foundational types for:
 * - Puzzle representation
 * - GRASP loop structures
 * - AgentDB Integration (Native Types)
 */

import { 
  ReasoningBank as AgentDBReasoningBank, 
  ReflexionMemory as AgentDBReflexionMemory,
  SkillLibrary as AgentDBSkillLibrary 
} from 'agentdb';

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
