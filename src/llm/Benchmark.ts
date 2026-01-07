/**
 * LLM Benchmark - Compare memory ON vs OFF performance
 * Specification: docs/specs/11-llm-sudoku-player.md - Memory Toggle Verification
 */

import type { LLMConfig, PlaySession } from './types.js';
import { LLMSudokuPlayer } from './LLMSudokuPlayer.js';
import type { AgentMemory } from '../memory/AgentMemory.js';

/**
 * Benchmark Results
 */
export interface BenchmarkResults {
  memoryOff: {
    sessions: PlaySession[];
    avgMoves: number;
    avgCorrectMoves: number;
    avgInvalidMoves: number;
    avgAccuracy: number;
    solveRate: number;
  };
  memoryOn: {
    sessions: PlaySession[];
    avgMoves: number;
    avgCorrectMoves: number;
    avgInvalidMoves: number;
    avgAccuracy: number;
    solveRate: number;
  };
  improvement: {
    movesReduction: number;
    accuracyGain: number;
    solveRateGain: number;
  };
}

/**
 * Puzzle for benchmarking
 */
export interface BenchmarkPuzzle {
  id: string;
  initial: number[][];
  solution: number[][];
}

/**
 * LLM Benchmark
 *
 * Spec 11: Memory Toggle Verification protocol
 * 1. Solve N puzzles with memory OFF - record metrics
 * 2. Solve N puzzles with memory ON - record metrics
 * 3. Compare: Memory ON should show improvement
 */
export class LLMBenchmark {
  constructor(
    private config: LLMConfig,
    private memory: AgentMemory
  ) {}

  /**
   * Run benchmark comparing memory ON vs OFF
   *
   * @param puzzles - Puzzles to test with
   * @param maxMovesPerPuzzle - Max moves before abandoning
   */
  async run(
    puzzles: BenchmarkPuzzle[],
    maxMovesPerPuzzle = 200
  ): Promise<BenchmarkResults> {
    if (puzzles.length === 0) {
      throw new Error('No puzzles provided for benchmark');
    }

    // Phase 1: Memory OFF (baseline)
    const memoryOffSessions = await this.runWithMemory(
      puzzles,
      false,
      maxMovesPerPuzzle
    );

    // Phase 2: Memory ON (learning enabled)
    const memoryOnSessions = await this.runWithMemory(
      puzzles,
      true,
      maxMovesPerPuzzle
    );

    // Calculate statistics
    const memoryOffStats = this.calculateStats(memoryOffSessions);
    const memoryOnStats = this.calculateStats(memoryOnSessions);

    // Calculate improvement
    const improvement = {
      movesReduction:
        ((memoryOffStats.avgMoves - memoryOnStats.avgMoves) /
          memoryOffStats.avgMoves) *
        100,
      accuracyGain: memoryOnStats.avgAccuracy - memoryOffStats.avgAccuracy,
      solveRateGain: memoryOnStats.solveRate - memoryOffStats.solveRate,
    };

    return {
      memoryOff: {
        sessions: memoryOffSessions,
        ...memoryOffStats,
      },
      memoryOn: {
        sessions: memoryOnSessions,
        ...memoryOnStats,
      },
      improvement,
    };
  }

  /**
   * Run puzzles with specified memory setting
   */
  private async runWithMemory(
    puzzles: BenchmarkPuzzle[],
    memoryEnabled: boolean,
    maxMoves: number
  ): Promise<PlaySession[]> {
    const config: LLMConfig = {
      ...this.config,
      memoryEnabled,
    };

    const player = new LLMSudokuPlayer(config, this.memory);
    const sessions: PlaySession[] = [];

    for (const puzzle of puzzles) {
      const session = await player.playPuzzle(
        puzzle.id,
        puzzle.initial,
        puzzle.solution,
        maxMoves
      );

      sessions.push(session);
    }

    return sessions;
  }

  /**
   * Calculate statistics from sessions
   */
  private calculateStats(sessions: PlaySession[]): {
    avgMoves: number;
    avgCorrectMoves: number;
    avgInvalidMoves: number;
    avgAccuracy: number;
    solveRate: number;
  } {
    const totalMoves = sessions.reduce((sum, s) => sum + s.totalMoves, 0);
    const totalCorrect = sessions.reduce((sum, s) => sum + s.correctMoves, 0);
    const totalInvalid = sessions.reduce((sum, s) => sum + s.invalidMoves, 0);
    const solvedCount = sessions.filter((s) => s.solved).length;

    const avgMoves = sessions.length > 0 ? totalMoves / sessions.length : 0;
    const avgCorrectMoves =
      sessions.length > 0 ? totalCorrect / sessions.length : 0;
    const avgInvalidMoves =
      sessions.length > 0 ? totalInvalid / sessions.length : 0;
    const avgAccuracy =
      totalMoves > 0 ? (totalCorrect / totalMoves) * 100 : 0;
    const solveRate =
      sessions.length > 0 ? (solvedCount / sessions.length) * 100 : 0;

    return {
      avgMoves,
      avgCorrectMoves,
      avgInvalidMoves,
      avgAccuracy,
      solveRate,
    };
  }
}
