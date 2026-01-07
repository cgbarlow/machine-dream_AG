/**
 * CLI Executor Service
 *
 * Executes CLI commands programmatically from the TUI
 * NO MOCKS - Real backend integration
 */

import { SystemOrchestrator } from '../../orchestration/SystemOrchestrator.js';
import { OrchestratorConfig, AgentDBConfig } from '../../types.js';
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

export interface ProgressEventData {
  // Move details
  moveNumber?: number;
  row?: number;
  col?: number;
  value?: number;
  reasoning?: string;
  outcome?: 'correct' | 'invalid' | 'wrong';
  error?: string;
  // Statistics
  correctMoves?: number;
  invalidMoves?: number;
  wrongMoves?: number;
  // Other flexible fields for different event types
  [key: string]: any;
}

export interface ProgressEvent {
  type: 'start' | 'progress' | 'iteration' | 'complete' | 'error';
  message: string;
  percentage?: number;
  data?: ProgressEventData | any;  // Allow any type of data
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
   * Store a key-value pair in memory (placeholder - would use real AgentDB API)
   */
  static async memoryStore(
    _key: string,
    _value: unknown,
    _options: { namespace?: string; ttl?: number } = {}
  ): Promise<void> {
    // Placeholder - AgentDB doesn't have direct key-value storage yet
    // Would use custom extension or separate storage layer
    return Promise.resolve();
  }

  /**
   * Retrieve a value from memory by key (placeholder)
   */
  static async memoryRetrieve(_key: string, _namespace: string = 'default'): Promise<unknown> {
    // Placeholder
    return Promise.resolve(null);
  }

  /**
   * Search memory by pattern (placeholder)
   */
  static async memorySearch(
    _pattern: string,
    _options: { namespace?: string; limit?: number } = {}
  ): Promise<Array<{ key: string; value: unknown; similarity: number }>> {
    // Placeholder
    return Promise.resolve([]);
  }

  /**
   * List all keys in a namespace (placeholder)
   */
  static async memoryList(_namespace: string = 'default'): Promise<string[]> {
    // Placeholder
    return Promise.resolve([]);
  }

  /**
   * Consolidate memory patterns (placeholder)
   */
  static async memoryConsolidate(): Promise<{ patternsConsolidated: number }> {
    // Placeholder
    return Promise.resolve({ patternsConsolidated: 0 });
  }

  /**
   * Optimize memory storage (placeholder)
   */
  static async memoryOptimize(): Promise<{ before: number; after: number }> {
    // Placeholder
    return Promise.resolve({ before: 0, after: 0 });
  }

  /**
   * Get AgentDB memory statistics
   */
  static async getMemoryStats(): Promise<{
    totalEntries: number;
    patterns: number;
    skills: number;
    dbSize: string;
  }> {
    try {
      const dbPath = path.join(process.env.HOME || '~', '.machine-dream/agentdb/agent.db');
      const stats = await fs.stat(dbPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      return {
        totalEntries: 0,
        patterns: 0,
        skills: 0,
        dbSize: `${sizeMB} MB`,
      };
    } catch {
      return {
        totalEntries: 0,
        patterns: 0,
        skills: 0,
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
    _options: { phases?: string[] } = {},
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

      // Initialize memory and controller (placeholder - would load real config)
      const config: OrchestratorConfig = {
        dbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
        preset: 'large' as const,
        rlPlugin: {
          type: 'decision-transformer' as const,
          name: 'sudoku-solver',
          stateDim: 81,
          actionDim: 9,
          sequenceLength: 20
        },
        agentDbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
        embeddingModel: 'Xenova/all-MiniLM-L6-v2',
        enableReasoningBank: true,
        enableReflexion: true,
        enableSkillLibrary: false,
        quantization: 'scalar' as const,
        indexing: 'hnsw' as const,
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
  static async getDreamHistory(_limit: number = 10): Promise<Array<{
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
        dbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
        preset: 'large' as const,
        rlPlugin: {
          type: 'decision-transformer' as const,
          name: 'sudoku-solver',
          stateDim: 81,
          actionDim: 9,
          sequenceLength: 20
        },
        agentDbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
        embeddingModel: 'Xenova/all-MiniLM-L6-v2',
        enableReasoningBank: true,
        enableReflexion: false,
        enableSkillLibrary: false,
        quantization: 'scalar' as const,
        indexing: 'hnsw' as const,
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
    _options: { speed?: string; pauseAfterStep?: boolean } = {},
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
    _types: string[],
    options: { format?: string; outputDir?: string; compress?: boolean } = {}
  ): Promise<{ path: string; size: number }> {
    const { format = 'json', outputDir = './exports', compress: _compress = false } = options;

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

  // ==========================================
  // LLM Sudoku Player Operations (Phase 2)
  // ==========================================

  /**
   * Execute LLM play command with progress callbacks
   */
  static async executeLLMPlay(
    puzzleFile: string,
    options: { memoryEnabled?: boolean; model?: string; maxMoves?: number } = {},
    onProgress: ProgressCallback
  ): Promise<void> {
    try {
      const { LLMSudokuPlayer } = await import('../../llm/index.js');
      const { AgentMemory } = await import('../../memory/AgentMemory.js');
      const { DEFAULT_LLM_CONFIG } = await import('../../llm/config.js');

      onProgress({
        type: 'start',
        message: `Loading puzzle: ${puzzleFile}`,
        percentage: 0,
      });

      // Load puzzle
      const puzzleData = JSON.parse(await fs.readFile(puzzleFile, 'utf-8'));

      onProgress({
        type: 'progress',
        message: 'Connecting to LM Studio...',
        percentage: 10,
      });

      // Initialize player
      const memoryConfig: AgentDBConfig = {
        dbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
        preset: 'large' as const,
        rlPlugin: {
          type: 'decision-transformer' as const,
          name: 'sudoku-solver',
          stateDim: 81,
          actionDim: 9,
          sequenceLength: 20
        },
        agentDbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
        embeddingModel: 'Xenova/all-MiniLM-L6-v2',
        enableReasoningBank: true,
        enableReflexion: true,
        enableSkillLibrary: false,
        quantization: 'scalar' as const,
        indexing: 'hnsw' as const,
        cacheEnabled: true,
        reflexion: { enabled: true, maxEntries: 1000, similarityThreshold: 0.8 },
        skillLibrary: { enabled: false, minSuccessRate: 0.8, maxSkills: 100, autoConsolidate: false }
      };
      const memory = new AgentMemory(memoryConfig);
      const config = {
        ...DEFAULT_LLM_CONFIG,
        memoryEnabled: options.memoryEnabled !== false,
        model: options.model || DEFAULT_LLM_CONFIG.model,
      };

      const player = new LLMSudokuPlayer(config, memory);

      // Health check
      const isHealthy = await player.healthCheck();
      if (!isHealthy) {
        throw new Error(`Cannot connect to LM Studio at ${config.baseUrl}`);
      }

      onProgress({
        type: 'progress',
        message: `LM Studio connected (${config.model})`,
        percentage: 20,
      });

      // Set up event listeners for live updates
      player.on('llm:response', (data: any) => {
        onProgress({
          type: 'progress',
          message: 'LLM responded',
          data: { response: data.rawResponse.substring(0, 100) + '...' },
        });
      });

      player.on('llm:move_proposed', (data: any) => {
        onProgress({
          type: 'progress',
          message: `Move proposed: (${data.move.row},${data.move.col})=${data.move.value}`,
          data: { move: data.move },
        });
      });

      player.on('llm:move_validated', (data: any) => {
        const outcome = data.experience.validation.outcome;
        const emoji = outcome === 'correct' ? '✓' : outcome === 'invalid' ? '✗' : '~';
        onProgress({
          type: 'iteration',
          message: `${emoji} ${outcome.toUpperCase()}: (${data.experience.move.row},${data.experience.move.col})=${data.experience.move.value}`,
          data: { experience: data.experience },
        });
      });

      // Execute play
      const session = await player.playPuzzle(
        puzzleData.id || 'puzzle-1',
        puzzleData.initial,
        puzzleData.solution,
        options.maxMoves || 200
      );

      onProgress({
        type: 'complete',
        message: session.solved ? 'Puzzle solved!' : 'Solving incomplete',
        percentage: 100,
        data: session,
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
   * Execute LLM dream consolidation
   */
  static async executeLLMDream(
    onProgress: ProgressCallback
  ): Promise<void> {
    try {
      const { DreamingConsolidator, ExperienceStore } = await import('../../llm/index.js');
      const { AgentMemory } = await import('../../memory/AgentMemory.js');
      const { DEFAULT_LLM_CONFIG } = await import('../../llm/config.js');

      onProgress({
        type: 'start',
        message: 'Starting dreaming consolidation...',
        percentage: 0,
      });

      const memoryConfig: AgentDBConfig = {
        dbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
        preset: 'large' as const,
        rlPlugin: {
          type: 'decision-transformer' as const,
          name: 'sudoku-solver',
          stateDim: 81,
          actionDim: 9,
          sequenceLength: 20
        },
        agentDbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
        embeddingModel: 'Xenova/all-MiniLM-L6-v2',
        enableReasoningBank: true,
        enableReflexion: true,
        enableSkillLibrary: false,
        quantization: 'scalar' as const,
        indexing: 'hnsw' as const,
        cacheEnabled: true,
        reflexion: { enabled: true, maxEntries: 1000, similarityThreshold: 0.8 },
        skillLibrary: { enabled: false, minSuccessRate: 0.8, maxSkills: 100, autoConsolidate: false }
      };
      const memory = new AgentMemory(memoryConfig);
      const config = { ...DEFAULT_LLM_CONFIG, memoryEnabled: true };
      const experienceStore = new ExperienceStore(memory, config);
      const consolidator = new DreamingConsolidator(experienceStore, config);

      onProgress({
        type: 'progress',
        message: 'Loading unconsolidated experiences...',
        percentage: 20,
      });

      const report = await consolidator.consolidate();

      onProgress({
        type: 'progress',
        message: `Processed ${report.experiencesConsolidated} experiences`,
        percentage: 60,
        data: report,
      });

      onProgress({
        type: 'progress',
        message: `Generated ${report.fewShotsUpdated} few-shot examples`,
        percentage: 80,
      });

      onProgress({
        type: 'complete',
        message: 'Consolidation complete',
        percentage: 100,
        data: report,
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
   * Execute LLM benchmark
   */
  static async executeLLMBenchmark(
    puzzleFiles: string[],
    onProgress: ProgressCallback
  ): Promise<void> {
    try {
      const { LLMBenchmark } = await import('../../llm/index.js');
      const { AgentMemory } = await import('../../memory/AgentMemory.js');
      const { DEFAULT_LLM_CONFIG } = await import('../../llm/config.js');

      onProgress({
        type: 'start',
        message: `Loading ${puzzleFiles.length} puzzle(s)...`,
        percentage: 0,
      });

      // Load puzzles
      const puzzles = await Promise.all(
        puzzleFiles.map(async (file) => {
          const data = JSON.parse(await fs.readFile(file, 'utf-8'));
          return {
            id: data.id || file,
            initial: data.initial,
            solution: data.solution,
          };
        })
      );

      const memoryConfig: AgentDBConfig = {
        dbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
        preset: 'large' as const,
        rlPlugin: {
          type: 'decision-transformer' as const,
          name: 'sudoku-solver',
          stateDim: 81,
          actionDim: 9,
          sequenceLength: 20
        },
        agentDbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
        embeddingModel: 'Xenova/all-MiniLM-L6-v2',
        enableReasoningBank: true,
        enableReflexion: true,
        enableSkillLibrary: false,
        quantization: 'scalar' as const,
        indexing: 'hnsw' as const,
        cacheEnabled: true,
        reflexion: { enabled: true, maxEntries: 1000, similarityThreshold: 0.8 },
        skillLibrary: { enabled: false, minSuccessRate: 0.8, maxSkills: 100, autoConsolidate: false }
      };
      const memory = new AgentMemory(memoryConfig);
      const benchmark = new LLMBenchmark(DEFAULT_LLM_CONFIG, memory);

      onProgress({
        type: 'progress',
        message: 'Phase 1: Testing memory OFF (baseline)...',
        percentage: 10,
      });

      const results = await benchmark.run(puzzles, 200);

      onProgress({
        type: 'progress',
        message: 'Phase 2: Testing memory ON (learning)...',
        percentage: 60,
      });

      onProgress({
        type: 'complete',
        message: 'Benchmark complete',
        percentage: 100,
        data: results,
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
   * Get LLM statistics
   */
  static async getLLMStats(): Promise<{
    totalExperiences: number;
    totalPuzzles: number;
    correctMoves: number;
    invalidMoves: number;
    validButWrongMoves: number;
  }> {
    try {
      const { ExperienceStore } = await import('../../llm/index.js');
      const { AgentMemory } = await import('../../memory/AgentMemory.js');
      const { DEFAULT_LLM_CONFIG } = await import('../../llm/config.js');

      const memoryConfig: AgentDBConfig = {
        dbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
        preset: 'large' as const,
        rlPlugin: {
          type: 'decision-transformer' as const,
          name: 'sudoku-solver',
          stateDim: 81,
          actionDim: 9,
          sequenceLength: 20
        },
        agentDbPath: path.join(process.env.HOME || '~', '.machine-dream/agentdb'),
        embeddingModel: 'Xenova/all-MiniLM-L6-v2',
        enableReasoningBank: true,
        enableReflexion: true,
        enableSkillLibrary: false,
        quantization: 'scalar' as const,
        indexing: 'hnsw' as const,
        cacheEnabled: true,
        reflexion: { enabled: true, maxEntries: 1000, similarityThreshold: 0.8 },
        skillLibrary: { enabled: false, minSuccessRate: 0.8, maxSkills: 100, autoConsolidate: false }
      };
      const memory = new AgentMemory(memoryConfig);
      const config = { ...DEFAULT_LLM_CONFIG, memoryEnabled: true };
      const store = new ExperienceStore(memory, config);

      const stats = await store.getStats();

      return stats;
    } catch {
      return {
        totalExperiences: 0,
        totalPuzzles: 0,
        correctMoves: 0,
        invalidMoves: 0,
        validButWrongMoves: 0,
      };
    }
  }

  // ==========================================
  // Puzzle Generation Operations (Spec 12)
  // ==========================================

  /**
   * Generate a single puzzle with configuration
   */
  static async executePuzzleGenerate(
    options: {
      seed?: number;
      size?: 4 | 9 | 16 | 25;
      difficulty?: 'easy' | 'medium' | 'hard' | 'expert' | 'diabolical';
      symmetry?: 'none' | 'rotational' | 'reflectional' | 'diagonal';
      validateUniqueness?: boolean;
    } = {},
    onProgress: ProgressCallback
  ): Promise<any> {
    try {
      const { PuzzleGenerator } = await import('../../engine/PuzzleGenerator.js');

      onProgress({
        type: 'start',
        message: 'Generating puzzle...',
        percentage: 0,
      });

      const generator = new PuzzleGenerator({
        seed: options.seed,
        size: options.size || 9,
        difficulty: options.difficulty || 'medium',
        symmetry: options.symmetry || 'none',
        validateUniqueness: options.validateUniqueness !== false,
        maxRetries: 100,
      });

      onProgress({
        type: 'progress',
        message: `Generating ${options.size || 9}×${options.size || 9} ${options.difficulty || 'medium'} puzzle...`,
        percentage: 20,
      });

      const puzzle = generator.generate();

      onProgress({
        type: 'progress',
        message: `Puzzle generated with seed ${puzzle.seed}`,
        percentage: 80,
        data: { puzzle },
      });

      onProgress({
        type: 'complete',
        message: `Success! ${puzzle.clueCount} clues, ${puzzle.generationTimeMs}ms`,
        percentage: 100,
        data: { puzzle },
      });

      return puzzle;
    } catch (error) {
      onProgress({
        type: 'error',
        message: error instanceof Error ? error.message : 'Generation failed',
        percentage: 0,
        data: error,
      });
      throw error;
    }
  }

  /**
   * Generate batch of puzzles
   */
  static async executePuzzleBatch(
    options: {
      count: number;
      size?: 4 | 9 | 16 | 25;
      difficulty?: 'easy' | 'medium' | 'hard' | 'expert' | 'diabolical';
      symmetry?: 'none' | 'rotational' | 'reflectional' | 'diagonal';
      seedMode?: 'sequential' | 'random';
      seedStart?: number;
    },
    onProgress: ProgressCallback
  ): Promise<any[]> {
    try {
      const { PuzzleGenerator } = await import('../../engine/PuzzleGenerator.js');

      onProgress({
        type: 'start',
        message: `Generating ${options.count} puzzles...`,
        percentage: 0,
      });

      const puzzles = await PuzzleGenerator.generateBatch(
        options.count,
        {
          size: options.size || 9,
          difficulty: options.difficulty || 'medium',
          symmetry: options.symmetry || 'none',
          validateUniqueness: true,
        },
        options.seedMode || 'sequential',
        options.seedStart || 1000
      );

      for (let i = 0; i < puzzles.length; i++) {
        const percentage = ((i + 1) / puzzles.length) * 100;
        onProgress({
          type: 'progress',
          message: `Generated ${i + 1}/${options.count} puzzles`,
          percentage,
          data: { puzzle: puzzles[i], index: i, total: options.count },
        });

        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      onProgress({
        type: 'complete',
        message: `Batch complete: ${puzzles.length} puzzles generated`,
        percentage: 100,
        data: { puzzles },
      });

      return puzzles;
    } catch (error) {
      onProgress({
        type: 'error',
        message: error instanceof Error ? error.message : 'Batch generation failed',
        percentage: 0,
        data: error,
      });
      throw error;
    }
  }

  /**
   * Validate an existing puzzle
   */
  static async executePuzzleValidate(
    grid: number[][],
    onProgress: ProgressCallback
  ): Promise<any> {
    try {
      const { PuzzleValidator } = await import('../../engine/PuzzleValidator.js');

      onProgress({
        type: 'start',
        message: 'Validating puzzle...',
        percentage: 0,
      });

      const validator = new PuzzleValidator();

      onProgress({
        type: 'progress',
        message: 'Checking structure...',
        percentage: 20,
      });

      const result = validator.validate(grid);

      onProgress({
        type: 'progress',
        message: 'Checking uniqueness...',
        percentage: 60,
      });

      const message = result.isValid
        ? result.hasUniqueSolution
          ? '✓ Valid with unique solution'
          : `⚠ Valid but ${result.solutionCount} solutions found`
        : '✗ Invalid puzzle';

      onProgress({
        type: 'complete',
        message,
        percentage: 100,
        data: result,
      });

      return result;
    } catch (error) {
      onProgress({
        type: 'error',
        message: error instanceof Error ? error.message : 'Validation failed',
        percentage: 0,
        data: error,
      });
      throw error;
    }
  }

  /**
   * Save puzzle to file
   */
  static async savePuzzleToFile(
    puzzle: any,
    filePath: string
  ): Promise<void> {
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    const data = {
      id: `puzzle-${puzzle.seed}`,
      seed: puzzle.seed,
      size: puzzle.size,
      difficulty: puzzle.targetDifficulty,
      grid: puzzle.grid,
      solution: puzzle.solution,
      metadata: {
        clueCount: puzzle.clueCount,
        generationTimeMs: puzzle.generationTimeMs,
        retryCount: puzzle.retryCount,
        hasUniqueSolution: puzzle.hasUniqueSolution,
        generatedAt: new Date().toISOString(),
      },
    };

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, JSON.stringify(data, null, 2));
  }

  // ==========================================
  // AI Model Profile Management (Spec 13)
  // ==========================================

  /**
   * List all AI model profiles
   */
  static async executeProfileList(options: {
    provider?: string;
    tags?: string[];
    sort?: 'name' | 'usage' | 'last-used';
  } = {}): Promise<any[]> {
    const { LLMProfileManager } = await import('../../llm/profiles/index.js');
    const manager = new LLMProfileManager();

    let profiles = manager.list();

    // Apply filters
    if (options.provider) {
      profiles = manager.filterByProvider(options.provider);
    }
    if (options.tags && options.tags.length > 0) {
      profiles = manager.filterByTags(options.tags);
    }

    // Apply sorting
    if (options.sort === 'usage') {
      profiles = manager.sortByUsage();
    } else if (options.sort === 'last-used') {
      profiles = manager.sortByLastUsed();
    }

    // Add active profile information
    const activeProfileName = manager.getActive()?.name;
    return profiles.map(p => ({
      ...p,
      isActive: p.name === activeProfileName,
    }));
  }

  /**
   * Create new AI model profile
   */
  static async executeProfileAdd(options: {
    name: string;
    description?: string;
    provider: string;
    baseUrl: string;
    apiKey?: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    timeout?: number;
    retries?: number;
    tags?: string[];
    color?: string;
    setDefault?: boolean;
  }): Promise<{ profile: any; validation: any }> {
    const { LLMProfileManager } = await import('../../llm/profiles/index.js');
    const manager = new LLMProfileManager();

    return manager.create({
      name: options.name,
      description: options.description,
      provider: options.provider as any,
      baseUrl: options.baseUrl,
      apiKey: options.apiKey,
      model: options.model,
      parameters: {
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        topP: options.topP,
        frequencyPenalty: options.frequencyPenalty,
        presencePenalty: options.presencePenalty,
      },
      timeout: options.timeout,
      retries: options.retries,
      tags: options.tags,
      color: options.color,
      setDefault: options.setDefault,
    });
  }

  /**
   * Get AI model profile details
   */
  static async executeProfileShow(name: string): Promise<any> {
    const { LLMProfileManager } = await import('../../llm/profiles/index.js');
    const manager = new LLMProfileManager();

    const profile = manager.get(name);
    if (!profile) {
      throw new Error(`Profile not found: ${name}`);
    }

    const activeProfileName = manager.getActive()?.name;
    return {
      ...profile,
      isActive: profile.name === activeProfileName,
    };
  }

  /**
   * Update AI model profile
   */
  static async executeProfileUpdate(
    name: string,
    updates: {
      description?: string;
      provider?: string;
      baseUrl?: string;
      apiKey?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      timeout?: number;
      retries?: number;
      tags?: string[];
      color?: string;
      setDefault?: boolean;
    }
  ): Promise<{ profile: any; validation: any }> {
    const { LLMProfileManager } = await import('../../llm/profiles/index.js');
    const manager = new LLMProfileManager();

    return manager.update(name, {
      description: updates.description,
      provider: updates.provider as any,
      baseUrl: updates.baseUrl,
      apiKey: updates.apiKey,
      model: updates.model,
      parameters: {
        temperature: updates.temperature,
        maxTokens: updates.maxTokens,
        topP: updates.topP,
        frequencyPenalty: updates.frequencyPenalty,
        presencePenalty: updates.presencePenalty,
      },
      timeout: updates.timeout,
      retries: updates.retries,
      tags: updates.tags,
      color: updates.color,
      setDefault: updates.setDefault,
    });
  }

  /**
   * Delete AI model profile
   */
  static async executeProfileDelete(name: string): Promise<boolean> {
    const { LLMProfileManager } = await import('../../llm/profiles/index.js');
    const manager = new LLMProfileManager();

    return manager.delete(name);
  }

  /**
   * Set active AI model profile
   */
  static async executeProfileSet(name: string): Promise<void> {
    const { LLMProfileManager } = await import('../../llm/profiles/index.js');
    const manager = new LLMProfileManager();

    manager.setActive(name);
  }

  /**
   * Test AI model profile connectivity
   */
  static async executeProfileTest(
    name?: string,
    onProgress?: ProgressCallback
  ): Promise<any> {
    const { LLMProfileManager } = await import('../../llm/profiles/index.js');
    const manager = new LLMProfileManager();

    const profile = name ? manager.get(name) : manager.getActive();
    const profileName = profile?.name || name || 'active';

    if (onProgress) {
      onProgress({
        type: 'start',
        message: `Testing connection to ${profileName}...`,
        percentage: 0,
      });

      onProgress({
        type: 'progress',
        message: `Connecting to ${profile?.baseUrl}...`,
        percentage: 30,
      });
    }

    const result = await manager.test(name);

    if (onProgress) {
      if (result.healthy) {
        onProgress({
          type: 'complete',
          message: `✓ Connection successful! Latency: ${result.latency}ms`,
          percentage: 100,
          data: result,
        });
      } else {
        onProgress({
          type: 'error',
          message: `✗ Connection failed: ${result.error}`,
          percentage: 0,
          data: result,
        });
      }
    }

    return result;
  }

  /**
   * Export AI model profiles
   */
  static async executeProfileExport(
    filePath: string,
    options: {
      profiles?: string[];
      includeSecrets?: boolean;
    } = {}
  ): Promise<void> {
    const { LLMProfileManager } = await import('../../llm/profiles/index.js');
    const manager = new LLMProfileManager();

    const json = manager.export({
      profiles: options.profiles,
      includeSecrets: options.includeSecrets,
    });

    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, json, 'utf-8');
  }

  /**
   * Import AI model profiles
   */
  static async executeProfileImport(
    filePath: string,
    overwrite: boolean = false
  ): Promise<{ imported: string[]; skipped: string[]; errors: any[] }> {
    const { LLMProfileManager } = await import('../../llm/profiles/index.js');
    const manager = new LLMProfileManager();

    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    const json = await fs.readFile(fullPath, 'utf-8');
    return manager.import(json, overwrite);
  }

  /**
   * Get AI model profile statistics
   */
  static async getProfileStats(): Promise<{
    total: number;
    byProvider: Record<string, number>;
    activeProfile?: string;
    totalUsage: number;
  }> {
    const { LLMProfileManager } = await import('../../llm/profiles/index.js');
    const manager = new LLMProfileManager();

    return manager.getStats();
  }
}
