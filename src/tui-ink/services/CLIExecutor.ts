/**
 * CLI Executor Service
 *
 * Executes CLI commands programmatically from the TUI
 * NO MOCKS - Real backend integration
 */

import { SystemOrchestrator } from '../../orchestration/SystemOrchestrator.js';
import { OrchestratorConfig } from '../../types.js';
import fs from 'fs/promises';
import path from 'path';

export interface SolveParams {
  puzzleFile: string;
  memorySystem: 'agentdb' | 'reasoningbank';
  enableRL: boolean;
  enableReflexion: boolean;
  maxIterations: number;
  sessionId?: string;
}

export interface ProgressEvent {
  type: 'start' | 'progress' | 'iteration' | 'complete' | 'error';
  message: string;
  percentage?: number;
  data?: unknown;
  // Live solve data
  iteration?: number;
  cellsFilled?: number;
  currentGrid?: number[][];
  currentStrategy?: string;
}

export type ProgressCallback = (event: ProgressEvent) => void;

export class CLIExecutor {
  /**
   * Execute solve command with real backend
   */
  static async executeSolve(
    params: SolveParams,
    onProgress: ProgressCallback
  ): Promise<void> {
    try {
      onProgress({
        type: 'start',
        message: `Loading puzzle: ${params.puzzleFile}`,
        percentage: 0,
      });

      // Load puzzle file
      const puzzleData = await this.loadPuzzleFile(params.puzzleFile);

      onProgress({
        type: 'progress',
        message: 'Initializing orchestrator...',
        percentage: 10,
      });

      // Initialize orchestrator
      const orchestratorConfig: OrchestratorConfig = {
        agentDbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
        embeddingModel: 'Xenova/all-MiniLM-L6-v2',
        enableReasoningBank: params.enableReflexion,
        enableReflexion: params.enableReflexion,
        enableSkillLibrary: false,
        dbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
        preset: 'large' as const,
        rlPlugin: {
          type: 'decision-transformer' as const,
          name: 'sudoku-solver' as const,
          stateDim: 81,
          actionDim: 729,
          sequenceLength: 128,
        },
        reflexion: {
          enabled: params.enableReflexion,
          maxEntries: 1000,
          similarityThreshold: 0.8,
        },
        skillLibrary: {
          enabled: false,
          minSuccessRate: 0.8,
          maxSkills: 100,
          autoConsolidate: false,
        },
        quantization: 'none',
        indexing: 'none',
        cacheEnabled: true,
        maxIterations: params.maxIterations,
        reflectionInterval: 10,
        dreamingSchedule: 'manual' as const,
        logLevel: 'info' as const,
        demoMode: false,
      };

      const orchestrator = new SystemOrchestrator(orchestratorConfig);

      onProgress({
        type: 'progress',
        message: 'Starting GRASP solving loop...',
        percentage: 20,
      });

      // Execute solve with periodic updates
      // Note: Current SystemOrchestrator doesn't support iteration callbacks
      // So we'll poll or wrap it. For now, showing initial and final states.

      // Show initial grid
      onProgress({
        type: 'iteration',
        message: 'Starting solve...',
        percentage: 20,
        iteration: 0,
        cellsFilled: this.countFilledCells(puzzleData),
        currentGrid: puzzleData,
        currentStrategy: 'Initializing',
      });

      const result = await orchestrator.solvePuzzle(puzzleData);

      // Show final grid
      const finalGrid = result.finalState.grid;
      onProgress({
        type: 'iteration',
        message: 'Solve complete',
        percentage: 90,
        iteration: result.metrics.iterations,
        cellsFilled: this.countFilledCells(finalGrid),
        currentGrid: finalGrid,
        currentStrategy: 'Complete',
      });

      onProgress({
        type: 'complete',
        message: result.success ? 'Puzzle solved successfully!' : 'Solving incomplete',
        percentage: 100,
        data: result,
        iteration: result.metrics.iterations,
        cellsFilled: this.countFilledCells(finalGrid),
        currentGrid: finalGrid,
      });
    } catch (error) {
      onProgress({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        percentage: 0,
        data: error,
      });
    }
  }

  /**
   * Load puzzle from file
   */
  private static async loadPuzzleFile(filePath: string): Promise<number[][]> {
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    const content = await fs.readFile(fullPath, 'utf-8');
    const parsed = JSON.parse(content);

    // Support various puzzle formats
    if (Array.isArray(parsed.puzzle)) {
      return parsed.puzzle;
    }
    if (Array.isArray(parsed.grid)) {
      return parsed.grid;
    }
    if (Array.isArray(parsed)) {
      return parsed;
    }

    throw new Error('Invalid puzzle format');
  }

  /**
   * List available puzzle files
   */
  static async listPuzzleFiles(directory: string = 'puzzles'): Promise<string[]> {
    try {
      const fullPath = path.join(process.cwd(), directory);
      const files = await fs.readdir(fullPath);
      return files.filter(f => f.endsWith('.json'));
    } catch {
      return [];
    }
  }

  /**
   * Get AgentDB memory statistics
   */
  static async getMemoryStats(): Promise<{
    totalEntries: number;
    collections: string[];
    dbSize: string;
  }> {
    // This will integrate with AgentDB once available
    return {
      totalEntries: 0,
      collections: [],
      dbSize: '0 MB',
    };
  }

  /**
   * Count filled cells in a grid
   */
  private static countFilledCells(grid: number[][]): number {
    let count = 0;
    for (const row of grid) {
      for (const cell of row) {
        if (cell !== 0) count++;
      }
    }
    return count;
  }
}
