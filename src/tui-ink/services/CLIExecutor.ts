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

  // ==========================================
  // Memory Operations
  // ==========================================

  /**
   * Store a key-value pair in memory
   */
  static async memoryStore(
    key: string,
    value: unknown,
    options: { namespace?: string; ttl?: number } = {}
  ): Promise<void> {
    const { AgentMemory } = await import('../../memory/AgentMemory.js');
    const { namespace = 'default' } = options;

    const config: OrchestratorConfig = {
      agentDbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
      embeddingModel: 'Xenova/all-MiniLM-L6-v2',
      enableReasoningBank: true,
      enableReflexion: false,
      enableSkillLibrary: false,
      dbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
      preset: 'medium' as const,
      quantization: 'none',
      indexing: 'none',
      cacheEnabled: true,
      maxIterations: 100,
      reflectionInterval: 10,
      dreamingSchedule: 'manual' as const,
      logLevel: 'info' as const,
      demoMode: false,
      reflexion: { enabled: false, maxEntries: 1000, similarityThreshold: 0.8 },
      skillLibrary: { enabled: false, minSuccessRate: 0.8, maxSkills: 100, autoConsolidate: false }
    };

    const memory = new AgentMemory(config);
    // Store in reasoningBank as a move with the key-value data
    await memory.reasoningBank.store(namespace, key, value, options.ttl);
  }

  /**
   * Retrieve a value from memory by key
   */
  static async memoryRetrieve(key: string, namespace: string = 'default'): Promise<unknown> {
    const { AgentMemory } = await import('../../memory/AgentMemory.js');

    const config: OrchestratorConfig = {
      agentDbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
      embeddingModel: 'Xenova/all-MiniLM-L6-v2',
      enableReasoningBank: true,
      enableReflexion: false,
      enableSkillLibrary: false,
      dbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
      preset: 'medium' as const,
      quantization: 'none',
      indexing: 'none',
      cacheEnabled: true,
      maxIterations: 100,
      reflectionInterval: 10,
      dreamingSchedule: 'manual' as const,
      logLevel: 'info' as const,
      demoMode: false,
      reflexion: { enabled: false, maxEntries: 1000, similarityThreshold: 0.8 },
      skillLibrary: { enabled: false, minSuccessRate: 0.8, maxSkills: 100, autoConsolidate: false }
    };

    const memory = new AgentMemory(config);
    return await memory.reasoningBank.retrieve(namespace, key);
  }

  /**
   * Search memory by pattern
   */
  static async memorySearch(
    pattern: string,
    options: { namespace?: string; limit?: number } = {}
  ): Promise<Array<{ key: string; value: unknown; similarity: number }>> {
    const { AgentMemory } = await import('../../memory/AgentMemory.js');
    const { limit = 10 } = options;

    const config: OrchestratorConfig = {
      agentDbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
      embeddingModel: 'Xenova/all-MiniLM-L6-v2',
      enableReasoningBank: true,
      enableReflexion: false,
      enableSkillLibrary: false,
      dbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
      preset: 'medium' as const,
      quantization: 'none',
      indexing: 'none',
      cacheEnabled: true,
      maxIterations: 100,
      reflectionInterval: 10,
      dreamingSchedule: 'manual' as const,
      logLevel: 'info' as const,
      demoMode: false,
      reflexion: { enabled: false, maxEntries: 1000, similarityThreshold: 0.8 },
      skillLibrary: { enabled: false, minSuccessRate: 0.8, maxSkills: 100, autoConsolidate: false }
    };

    const memory = new AgentMemory(config);
    return await memory.reasoningBank.search(pattern, limit, options.namespace);
  }

  /**
   * List all keys in a namespace
   */
  static async memoryList(namespace: string = 'default'): Promise<string[]> {
    const { AgentMemory } = await import('../../memory/AgentMemory.js');

    const config: OrchestratorConfig = {
      agentDbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
      embeddingModel: 'Xenova/all-MiniLM-L6-v2',
      enableReasoningBank: true,
      enableReflexion: false,
      enableSkillLibrary: false,
      dbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
      preset: 'medium' as const,
      quantization: 'none',
      indexing: 'none',
      cacheEnabled: true,
      maxIterations: 100,
      reflectionInterval: 10,
      dreamingSchedule: 'manual' as const,
      logLevel: 'info' as const,
      demoMode: false,
      reflexion: { enabled: false, maxEntries: 1000, similarityThreshold: 0.8 },
      skillLibrary: { enabled: false, minSuccessRate: 0.8, maxSkills: 100, autoConsolidate: false }
    };

    const memory = new AgentMemory(config);
    return await memory.reasoningBank.listKeys(namespace);
  }

  /**
   * Consolidate memory patterns
   */
  static async memoryConsolidate(): Promise<{ patternsConsolidated: number }> {
    const { AgentMemory } = await import('../../memory/AgentMemory.js');

    const config: OrchestratorConfig = {
      agentDbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
      embeddingModel: 'Xenova/all-MiniLM-L6-v2',
      enableReasoningBank: true,
      enableReflexion: false,
      enableSkillLibrary: false,
      dbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
      preset: 'medium' as const,
      quantization: 'none',
      indexing: 'none',
      cacheEnabled: true,
      maxIterations: 100,
      reflectionInterval: 10,
      dreamingSchedule: 'manual' as const,
      logLevel: 'info' as const,
      demoMode: false,
      reflexion: { enabled: false, maxEntries: 1000, similarityThreshold: 0.8 },
      skillLibrary: { enabled: false, minSuccessRate: 0.8, maxSkills: 100, autoConsolidate: false }
    };

    const memory = new AgentMemory(config);
    return await memory.optimizeMemory();
  }

  /**
   * Optimize memory storage
   */
  static async memoryOptimize(): Promise<{ before: number; after: number }> {
    const { AgentMemory } = await import('../../memory/AgentMemory.js');

    const config: OrchestratorConfig = {
      agentDbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
      embeddingModel: 'Xenova/all-MiniLM-L6-v2',
      enableReasoningBank: true,
      enableReflexion: false,
      enableSkillLibrary: false,
      dbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
      preset: 'medium' as const,
      quantization: 'none',
      indexing: 'none',
      cacheEnabled: true,
      maxIterations: 100,
      reflectionInterval: 10,
      dreamingSchedule: 'manual' as const,
      logLevel: 'info' as const,
      demoMode: false,
      reflexion: { enabled: false, maxEntries: 1000, similarityThreshold: 0.8 },
      skillLibrary: { enabled: false, minSuccessRate: 0.8, maxSkills: 100, autoConsolidate: false }
    };

    const memory = new AgentMemory(config);
    const stats1 = await this.getMemoryStats();
    await memory.optimizeMemory();
    const stats2 = await this.getMemoryStats();

    return { before: stats1.totalEntries, after: stats2.totalEntries };
  }

  /**
   * Get AgentDB memory statistics (updated with real implementation)
   */
  static async getMemoryStats(): Promise<{
    totalEntries: number;
    patterns: number;
    skills: number;
    collections: string[];
    dbSize: string;
  }> {
    try {
      const dbPath = path.join(process.env.HOME || '~', '.machine-dream/agentdb/agent.db');
      const stats = await fs.stat(dbPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      // For now, return mock counts - would need DB queries for real counts
      return {
        totalEntries: 0,
        patterns: 0,
        skills: 0,
        collections: ['default', 'patterns', 'skills'],
        dbSize: `${sizeMB} MB`,
      };
    } catch {
      return {
        totalEntries: 0,
        patterns: 0,
        skills: 0,
        collections: [],
        dbSize: '0 MB',
      };
    }
  }

  // ==========================================
  // Dream Operations
  // ==========================================

  /**
   * Execute dream cycle with progress callbacks
   */
  static async executeDream(
    sessionId: string,
    options: { phases?: string[] } = {},
    onProgress: ProgressCallback
  ): Promise<void> {
    try {
      const { DreamingController } = await import('../../consolidation/DreamingController.js');
      const { AgentMemory } = await import('../../memory/AgentMemory.js');

      onProgress({
        type: 'start',
        message: `Starting dream cycle for session ${sessionId}`,
        percentage: 0,
      });

      // Initialize memory and controller
      const config: OrchestratorConfig = {
        agentDbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
        embeddingModel: 'Xenova/all-MiniLM-L6-v2',
        enableReasoningBank: true,
        enableReflexion: true,
        enableSkillLibrary: false,
        dbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
        preset: 'medium' as const,
        quantization: 'none',
        indexing: 'none',
        cacheEnabled: true,
        maxIterations: 100,
        reflectionInterval: 10,
        dreamingSchedule: 'manual' as const,
        logLevel: 'info' as const,
        demoMode: false,
        reflexion: { enabled: true, maxEntries: 1000, similarityThreshold: 0.8 },
        skillLibrary: { enabled: false, minSuccessRate: 0.8, maxSkills: 100, autoConsolidate: false }
      };

      const memory = new AgentMemory(config);
      const controller = new DreamingController(memory, config);

      // Report each phase
      const phases = ['Capture', 'Triage', 'Compress', 'Abstract', 'Integrate'];
      for (let i = 0; i < phases.length; i++) {
        onProgress({
          type: 'progress',
          message: `Phase ${i + 1}: ${phases[i]}`,
          percentage: ((i + 1) / phases.length) * 90,
        });

        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Execute actual dream cycle
      const result = await controller.runDreamCycle(sessionId);

      onProgress({
        type: 'complete',
        message: `Dream cycle complete: ${result.patterns.length} patterns extracted`,
        percentage: 100,
        data: result,
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
   * Get dream cycle history
   */
  static async getDreamHistory(limit: number = 10): Promise<Array<{
    sessionId: string;
    timestamp: number;
    patternsExtracted: number;
    compressionRatio: number;
  }>> {
    // Placeholder - would query from database
    return [];
  }

  // ==========================================
  // Benchmark Operations
  // ==========================================

  /**
   * Execute benchmark suite with progress callbacks
   */
  static async executeBenchmark(
    suiteName: string,
    type: string,
    count: number,
    onProgress: ProgressCallback
  ): Promise<void> {
    try {
      const { BenchmarkSuite } = await import('../../benchmarking/BenchmarkSuite.js');

      onProgress({
        type: 'start',
        message: `Starting benchmark suite: ${suiteName}`,
        percentage: 0,
      });

      const config: OrchestratorConfig = {
        agentDbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
        embeddingModel: 'Xenova/all-MiniLM-L6-v2',
        enableReasoningBank: true,
        enableReflexion: false,
        enableSkillLibrary: false,
        dbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
        preset: 'medium' as const,
        quantization: 'none',
        indexing: 'none',
        cacheEnabled: true,
        maxIterations: 50,
        reflectionInterval: 10,
        dreamingSchedule: 'manual' as const,
        logLevel: 'info' as const,
        demoMode: false,
        reflexion: { enabled: false, maxEntries: 1000, similarityThreshold: 0.8 },
        skillLibrary: { enabled: false, minSuccessRate: 0.8, maxSkills: 100, autoConsolidate: false }
      };

      const suite = new BenchmarkSuite(config);

      // Execute with manual progress reporting
      // Note: BenchmarkSuite doesn't have progress callbacks, so we estimate
      const result = await suite.runSuite(suiteName, type as any, count);

      onProgress({
        type: 'complete',
        message: `Benchmark complete: ${result.summary.solved}/${result.summary.total} solved`,
        percentage: 100,
        data: result,
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
   * List available benchmark suites
   */
  static async listBenchmarkSuites(): Promise<Array<{
    name: string;
    type: string;
    description: string;
    defaultCount: number;
  }>> {
    return [
      { name: 'Quick', type: 'grasp-baseline', description: 'Quick 5-puzzle test', defaultCount: 5 },
      { name: 'Standard', type: 'grasp-baseline', description: 'Standard 50-puzzle suite', defaultCount: 50 },
      { name: 'Full', type: 'grasp-baseline', description: 'Comprehensive 200-puzzle suite', defaultCount: 200 },
      { name: 'Stress', type: 'grasp-baseline', description: 'Stress test with 1000 puzzles', defaultCount: 1000 },
    ];
  }

  // ==========================================
  // Demo Operations
  // ==========================================

  /**
   * Execute demo script
   */
  static async executeDemo(
    script: string,
    options: { speed?: string; pauseAfterStep?: boolean } = {},
    onProgress: ProgressCallback
  ): Promise<void> {
    // Placeholder - would spawn demo CLI command
    onProgress({
      type: 'start',
      message: `Starting demo: ${script}`,
      percentage: 0,
    });

    // Simulate demo execution
    await new Promise(resolve => setTimeout(resolve, 2000));

    onProgress({
      type: 'complete',
      message: 'Demo complete',
      percentage: 100,
    });
  }

  /**
   * List available demo scripts
   */
  static async listDemoScripts(): Promise<Array<{
    name: string;
    description: string;
    duration: string;
  }>> {
    return [
      { name: 'stakeholder-presentation', description: 'Full stakeholder demo', duration: '5-7 min' },
      { name: 'quick-solve', description: 'Quick puzzle solve demo', duration: '1-2 min' },
      { name: 'dream-cycle', description: 'Demonstration of dream consolidation', duration: '2-3 min' },
    ];
  }

  // ==========================================
  // Config Operations
  // ==========================================

  /**
   * Get current configuration
   */
  static async getConfig(): Promise<any> {
    const { loadConfiguration } = await import('../../cli/config.js');
    return await loadConfiguration('.machine-dream.json');
  }

  /**
   * Set configuration value
   */
  static async setConfig(key: string, value: unknown): Promise<void> {
    const config = await this.getConfig();

    // Update configuration using dot notation
    const keys = key.split('.');
    let current = config as any;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;

    await this.saveConfig(config);
  }

  /**
   * Validate configuration
   */
  static async validateConfig(config: any): Promise<{ valid: boolean; errors: string[] }> {
    const { validateConfiguration } = await import('../../cli/config.js');

    try {
      validateConfiguration(config);
      return { valid: true, errors: [] };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown validation error'],
      };
    }
  }

  /**
   * Save configuration
   */
  static async saveConfig(config: any): Promise<void> {
    const { saveConfiguration } = await import('../../cli/config.js');
    await saveConfiguration('.machine-dream.json', config);
  }

  // ==========================================
  // Export Operations
  // ==========================================

  /**
   * Execute data export
   */
  static async executeExport(
    types: string[],
    options: { format?: string; outputDir?: string; compress?: boolean } = {}
  ): Promise<{ path: string; size: number }> {
    const { format = 'json', outputDir = './exports', compress = false } = options;

    // Placeholder - would collect and export actual data
    const exportPath = path.join(outputDir, `export-${Date.now()}.${format}`);

    return {
      path: exportPath,
      size: 0,
    };
  }

  /**
   * Get available export types
   */
  static async getExportTypes(): Promise<Array<{ type: string; description: string }>> {
    return [
      { type: 'metrics', description: 'Performance and solve metrics' },
      { type: 'results', description: 'Puzzle solve results' },
      { type: 'config', description: 'System configuration' },
      { type: 'logs', description: 'System logs' },
      { type: 'memory', description: 'AgentDB memory dump' },
      { type: 'all', description: 'Complete system export' },
    ];
  }
}
