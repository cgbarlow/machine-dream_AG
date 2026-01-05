/**
 * Solve Command Implementation
 *
 * Implements the 'machine-dream solve' command for puzzle solving operations.
 */

import { Command } from 'commander';
import { getCommandConfig } from '../global-options';
import { SolveOptions } from '../types';
import { logger } from '../logger';
import { SystemOrchestrator } from '../../orchestration/SystemOrchestrator';
import { SolveError } from '../errors';
import fs from 'fs/promises';
import path from 'path';

export function registerSolveCommand(program: Command): void {
    const solveCommand = new Command('solve');

    solveCommand
        .description('Execute puzzle solving with GRASP loop and AgentDB memory')
        .argument('<puzzle-file>', 'Path to puzzle file (JSON format, 9x9 or 16x16 Sudoku)')
        .option('--memory-system <type>', 'Memory system: reasoningbank|agentdb', 'agentdb')
        .option('--enable-rl', 'Enable RL learning (AgentDB only)')
        .option('--enable-reflexion', 'Enable error correction memory')
        .option('--enable-skill-library', 'Auto-extract reusable skills')
        .option('--max-iterations <n>', 'Maximum GRASP iterations', parseInt)
        .option('--max-time <ms>', 'Maximum solve time in milliseconds', parseInt)
        .option('--reflection-interval <n>', 'Iterations between reflections', parseInt)
        .option('--attention-window <n>', 'Window size for attention mechanism', parseInt)
        .option('--strategies <list>', 'Comma-separated strategy list')
        .option('--backtrack-enabled', 'Enable backtracking for hard puzzles')
        .option('--guess-threshold <n>', 'Confidence threshold before guessing (0.0-1.0)', parseFloat)
        .option('--output <file>', 'Save result to file (.json)')
        .option('--session-id <id>', 'Custom session identifier')
        .option('--dream-after', 'Trigger dreaming after solving')
        .option('--visualize', 'Show live solving visualization')
        .option('--export-trajectory', 'Export full move trajectory')
        .option('--demo-mode', 'Enable presentation-friendly output')
        .option('--demo-speed <speed>', 'realtime|fast|instant', 'realtime')
        .option('--pause-on-insight', 'Pause when insights discovered')
        .action(async (puzzleFile, options) => {
            const { config, outputFormat } = getCommandConfig(solveCommand);

            try {
                // Validate puzzle file
                if (!puzzleFile) {
                    throw new SolveError('Puzzle file is required');
                }

                // Load puzzle from file
                const puzzleData = await loadPuzzleFile(puzzleFile);

                // Merge CLI options with configuration
                const solveOptions: SolveOptions = {
                    puzzleFile,
                    memorySystem: options.memorySystem as any,
                    enableRL: options.enableRl || config.enableRL,
                    enableReflexion: options.enableReflexion || config.enableReflexion,
                    enableSkillLibrary: options.enableSkillLibrary || config.enableSkillLibrary,
                    maxIterations: options.maxIterations || config.solving.maxIterations,
                    maxTime: options.maxTime || config.solving.maxSolveTime,
                    reflectionInterval: options.reflectionInterval || config.solving.reflectionInterval,
                    attentionWindow: options.attentionWindow || config.solving.attentionWindowSize,
                    strategies: options.strategies || config.solving.strategies.join(','),
                    backtrackEnabled: options.backtrackEnabled || config.solving.backtrackEnabled,
                    guessThreshold: options.guessThreshold || config.solving.guessThreshold,
                    output: options.output,
                    sessionId: options.sessionId || `solve-${Date.now()}`,
                    dreamAfter: options.dreamAfter,
                    visualize: options.visualize,
                    exportTrajectory: options.exportTrajectory,
                    demoMode: options.demoMode || config.demo.mode,
                    demoSpeed: options.demoSpeed as any || config.demo.speed,
                    pauseOnInsight: options.pauseOnInsight || config.demo.pauseOnInsight
                };

                logger.info(`🧠 Starting puzzle solving: ${puzzleFile}`);

                // Initialize orchestrator with merged configuration
                // Convert CLI config to OrchestratorConfig format
                const orchestratorConfig = {
                    agentDbPath: config.agentdb.dbPath,
                    embeddingModel: 'Xenova/all-MiniLM-L6-v2', // Default
                    enableReasoningBank: config.enableReflexion,
                    enableReflexion: config.enableReflexion,
                    enableSkillLibrary: config.enableSkillLibrary,
                    dbPath: config.agentdb.dbPath,
                    preset: 'large' as const,
                    rlPlugin: {
                        type: 'decision-transformer' as const,
                        name: 'sudoku-solver' as const,
                        stateDim: 81,
                        actionDim: 729,
                        sequenceLength: 128
                    },
                    reflexion: {
                        enabled: config.enableReflexion,
                        maxEntries: 1000,
                        similarityThreshold: 0.8
                    },
                    skillLibrary: {
                        enabled: config.enableSkillLibrary,
                        minSuccessRate: config.dreaming.minSuccessRate,
                        maxSkills: 50,
                        autoConsolidate: true
                    },
                    quantization: config.agentdb.quantization,
                    indexing: config.agentdb.indexing,
                    cacheEnabled: true,
                    maxIterations: solveOptions.maxIterations,
                    reflectionInterval: solveOptions.reflectionInterval,
                    dreamingSchedule: config.dreaming.schedule,
                    logLevel: 'info',
                    demoMode: solveOptions.demoMode || false
                };

                const orchestrator = new SystemOrchestrator(orchestratorConfig);

                // Solve the puzzle
                const result = await orchestrator.solvePuzzle(puzzleData);

                // Process output based on format
                if (outputFormat === 'json') {
                    logger.json({
                        puzzleId: path.basename(puzzleFile, '.json'),
                        success: result.success,
                        solveTime: result.metrics?.duration,
                        iterations: result.metrics?.iterations,
                        strategiesUsed: result.metrics?.strategiesUsed || [],
                        insightsDiscovered: result.metrics?.insights || 0,
                        finalState: result.finalState,
                        trajectory: result.trajectory,
                        sessionId: solveOptions.sessionId
                    });
                } else if (outputFormat === 'yaml') {
                    // Simple YAML output
                    console.log(`puzzleId: ${path.basename(puzzleFile, '.json')}`);
                    console.log(`success: ${result.success}`);
                    console.log(`iterations: ${result.metrics?.iterations}`);
                    console.log(`solveTime: ${result.metrics?.duration}`);
                } else {
                    // Table format (default)
                    console.log(`\n🎯 Solve Results: ${path.basename(puzzleFile, '.json')}`);
                    console.log('─'.repeat(50));
                    console.log(`Status:      ${result.success ? '✅ Solved' : '❌ Failed'}`);
                    console.log(`Iterations:  ${result.metrics?.iterations}`);
                    console.log(`Time (ms):   ${result.metrics?.duration}`);
                    console.log(`Strategies:  ${result.metrics?.strategiesUsed?.join(', ') || 'N/A'}`);
                    console.log(`Session ID:  ${solveOptions.sessionId}`);

                    if (result.success && result.finalState) {
                        console.log('\n📊 Final State (First 3x3 section):');
                        printGridSection(result.finalState.grid);
                    }
                }

                // Save output if requested
                if (options.output) {
                    await saveSolveResult(options.output, result, solveOptions);
                    logger.info(`💾 Results saved to: ${options.output}`);
                }

                // Trigger dreaming if requested
                if (options.dreamAfter) {
                    logger.info('🌙 Triggering dream cycle after solving...');
                    // TODO: Implement dream cycle integration
                }

            } catch (error) {
                if (error instanceof SolveError) {
                    throw error;
                }
                throw new SolveError(
                    `Failed to solve puzzle: ${error instanceof Error ? error.message : String(error)}`,
                    undefined,
                    ['Check puzzle file format', 'Verify file path', 'Try with simpler puzzle']
                );
            }
        });

    program.addCommand(solveCommand);
}

async function loadPuzzleFile(filePath: string): Promise<any> {
    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const puzzleData = JSON.parse(fileContent);

        // Basic validation
        if (!puzzleData.grid || !Array.isArray(puzzleData.grid)) {
            throw new Error('Invalid puzzle format: missing grid');
        }

        const size = puzzleData.grid.length;
        if (size !== 9 && size !== 16) {
            throw new Error(`Unsupported puzzle size: ${size}x${size}. Must be 9x9 or 16x16`);
        }

        return puzzleData;
    } catch (error) {
        throw new SolveError(
            `Failed to load puzzle file: ${error instanceof Error ? error.message : String(error)}`,
            undefined,
            ['Check file exists', 'Verify JSON format', 'Ensure proper puzzle structure']
        );
    }
}

async function saveSolveResult(outputPath: string, result: any, options: SolveOptions): Promise<void> {
    const outputData = {
        puzzleId: path.basename(options.puzzleFile, '.json'),
        success: result.success,
        solveTime: result.metrics?.solveTime,
        iterations: result.metrics?.iterations,
        strategiesUsed: result.metrics?.strategiesUsed,
        insightsDiscovered: result.metrics?.insightsDiscovered,
        finalState: result.finalState,
        trajectory: result.trajectory,
        sessionId: options.sessionId,
        timestamp: new Date().toISOString()
    };

    await fs.writeFile(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');
}

function printGridSection(grid: number[][]): void {
    const sectionSize = Math.min(3, grid.length);
    for (let row = 0; row < sectionSize; row++) {
        const rowValues = grid[row].slice(0, sectionSize).map(val => val === 0 ? '.' : val.toString());
        console.log(`  ${rowValues.join(' ')}`);
    }
}