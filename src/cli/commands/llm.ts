/**
 * LLM Command - Pure LLM Sudoku Player
 * Specification: docs/specs/09-cli-interface-spec.md Section 3.8
 * Specification: docs/specs/11-llm-sudoku-player.md
 */

import { Command } from 'commander';
import { logger } from '../logger.js';
import { CLIError } from '../errors.js';
import { LLMSudokuPlayer } from '../../llm/index.js';
import { DEFAULT_LLM_CONFIG, validateConfig } from '../../llm/config.js';
import type { LLMConfig } from '../../llm/types.js';
import { AgentMemory } from '../../memory/AgentMemory.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Register LLM commands
 * Spec 09 Section 3.8: llm play, stats, dream, benchmark
 */
export function registerLLMCommand(program: Command): void {
  const llm = program
    .command('llm')
    .description('LLM Sudoku Player - Pure LLM solving with learning');

  // llm play
  llm
    .command('play')
    .description('Play a puzzle using pure LLM reasoning')
    .argument('<puzzle-file>', 'Path to puzzle file')
    .option('--no-memory', 'Disable memory (baseline mode)')
    .option('--model <model>', 'LLM model name', DEFAULT_LLM_CONFIG.model)
    .option('--endpoint <url>', 'LM Studio endpoint', DEFAULT_LLM_CONFIG.baseUrl)
    .option('--max-moves <n>', 'Maximum moves before abandoning', '200')
    .option('--visualize', 'Show live solving visualization')
    .action(async (puzzleFile, options) => {
      try {
        logger.info('🤖 Starting LLM Sudoku Player...');

        // Build config
        const config: LLMConfig = {
          ...DEFAULT_LLM_CONFIG,
          memoryEnabled: options.memory !== false,
          model: options.model,
          baseUrl: options.endpoint,
        };

        validateConfig(config);

        // Load puzzle
        const puzzlePath = resolve(puzzleFile);
        const puzzleData = JSON.parse(readFileSync(puzzlePath, 'utf-8'));

        if (!puzzleData.initial || !puzzleData.solution) {
          throw new CLIError('Invalid puzzle file format', 1, {
            details: 'Puzzle file must contain "initial" and "solution" grids',
          });
        }

        // Initialize player
        const memory = new AgentMemory('./agent.db');
        const player = new LLMSudokuPlayer(config, memory);

        // Health check
        logger.info(`Checking LM Studio connection at ${config.baseUrl}...`);
        const isHealthy = await player.healthCheck();

        if (!isHealthy) {
          throw new CLIError('LM Studio is not running', 1, {
            details: `Cannot connect to ${config.baseUrl}`,
            suggestions: [
              'Start LM Studio and load a model',
              'Verify the endpoint URL',
              `Check that the server is running on ${config.baseUrl}`,
            ],
          });
        }

        const modelInfo = await player.getModelInfo();
        logger.info(
          `✓ Connected to LM Studio (model: ${modelInfo?.id || config.model})`
        );
        logger.info(
          `Memory: ${config.memoryEnabled ? '✓ ENABLED' : '✗ DISABLED (baseline)'}`
        );

        // Play puzzle
        logger.info('\n🎮 Starting puzzle solve...\n');

        const session = await player.playPuzzle(
          puzzleData.id || 'puzzle-1',
          puzzleData.initial,
          puzzleData.solution,
          parseInt(options.maxMoves, 10)
        );

        // Display results
        logger.info('\n📊 Session Results:');
        logger.info(`  Solved: ${session.solved ? '✓ YES' : '✗ NO'}`);
        logger.info(`  Total moves: ${session.totalMoves}`);
        logger.info(`  Correct moves: ${session.correctMoves}`);
        logger.info(`  Invalid moves: ${session.invalidMoves}`);
        logger.info(`  Valid but wrong: ${session.validButWrongMoves}`);

        const accuracy =
          session.totalMoves > 0
            ? ((session.correctMoves / session.totalMoves) * 100).toFixed(1)
            : '0.0';
        logger.info(`  Accuracy: ${accuracy}%`);

        await memory.close();
      } catch (error) {
        if (error instanceof CLIError) {
          throw error;
        }
        throw new CLIError('Failed to play puzzle', 1, {
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });

  // llm stats
  llm
    .command('stats')
    .description('View LLM learning statistics')
    .option('--format <format>', 'Output format (text|json)', 'text')
    .action(async (options) => {
      try {
        logger.info('📊 LLM Statistics...');

        const memory = new AgentMemory('./agent.db');
        const player = new LLMSudokuPlayer(DEFAULT_LLM_CONFIG, memory);
        const stats = await player.getStats();

        if (options.format === 'json') {
          console.log(JSON.stringify(stats, null, 2));
        } else {
          logger.info('\n📈 Learning Statistics:');
          logger.info(`  Total experiences: ${stats.totalExperiences}`);
          logger.info(`  Total puzzles: ${stats.totalPuzzles}`);
          logger.info(`  Correct moves: ${stats.correctMoves}`);
          logger.info(`  Invalid moves: ${stats.invalidMoves}`);
          logger.info(`  Valid but wrong: ${stats.validButWrongMoves}`);

          if (stats.totalExperiences > 0) {
            const accuracy =
              ((stats.correctMoves / stats.totalExperiences) * 100).toFixed(1);
            logger.info(`  Overall accuracy: ${accuracy}%`);
          }
        }

        await memory.close();
      } catch (error) {
        throw new CLIError('Failed to get statistics', 1, {
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });

  // llm dream
  llm
    .command('dream')
    .description('Run dreaming consolidation on LLM experiences')
    .option('--dry-run', 'Show what would be consolidated without saving')
    .action(async (options) => {
      try {
        logger.info('🌙 Starting dreaming consolidation...');

        // TODO: Implement DreamingConsolidator (Phase 3)
        logger.warn('Dreaming consolidation not yet implemented (Phase 3)');

        if (options.dryRun) {
          logger.info('(Dry run mode - no changes will be made)');
        }
      } catch (error) {
        throw new CLIError('Failed to run dreaming', 1, {
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });

  // llm benchmark
  llm
    .command('benchmark')
    .description('Compare memory ON vs OFF performance')
    .option('--puzzles <n>', 'Number of puzzles per mode', '5')
    .option('--difficulty <level>', 'Puzzle difficulty (easy|medium|hard)', 'easy')
    .action(async (options) => {
      try {
        logger.info('🏁 Starting LLM benchmark...');

        // TODO: Implement benchmark comparing memory ON/OFF (Phase 2)
        logger.warn('Benchmark not yet implemented');
        logger.info(`Would test ${options.puzzles} ${options.difficulty} puzzles per mode`);
      } catch (error) {
        throw new CLIError('Failed to run benchmark', 1, {
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });
}
