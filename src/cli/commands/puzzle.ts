/**
 * Puzzle Command Implementation
 *
 * Implements randomized puzzle generation commands (Spec 12)
 * - puzzle generate: Single puzzle generation
 * - puzzle from-seed: Recreate from seed
 * - puzzle batch: Generate multiple puzzles
 * - puzzle validate: Validate puzzle uniqueness
 * - puzzle list: List available puzzles
 */

import { Command } from 'commander';
import { getCommandConfig } from '../global-options.js';
import { logger } from '../logger.js';
import { PuzzleGenerator } from '../../engine/PuzzleGenerator.js';
import { PuzzleValidator } from '../../engine/PuzzleValidator.js';
import type { PuzzleGenerationConfig, GeneratedPuzzle, GridSize, DifficultyLevel } from '../../types.js';
import fs from 'fs/promises';
import path from 'path';

export function registerPuzzleCommand(program: Command): void {
  const puzzleCommand = new Command('puzzle');
  puzzleCommand.description('Puzzle generation and management operations (Spec 12)');

  // Subcommand: puzzle generate
  puzzleCommand
    .command('generate')
    .description('Generate a single randomized puzzle')
    .option('--seed <number>', 'Random seed for reproducibility (auto-generated if not provided)', parseInt)
    .option('--size <n>', 'Grid size: 4|9|16|25 (default: 9)', (val) => parseInt(val) as GridSize, 9)
    .option('--difficulty <level>', 'Difficulty: easy|medium|hard|expert|diabolical (default: medium)', 'medium')
    .option('--symmetry <type>', 'Symmetry: none|rotational|reflectional|diagonal (default: none)', 'none')
    .option('--no-validate', 'Skip uniqueness validation (faster but may have multiple solutions)')
    .option('--max-retries <n>', 'Maximum generation retry attempts (default: 100)', parseInt, 100)
    .option('--output <file>', 'Save puzzle to file (JSON format)')
    .option('--no-solution', 'Exclude solution from output file')
    .action(async (options) => {
      const { outputFormat: outputFormat1 } = getCommandConfig(puzzleCommand);

      try {
        logger.info('🎲 Generating randomized puzzle...');

        const config: PuzzleGenerationConfig = {
          seed: options.seed,
          size: options.size,
          difficulty: options.difficulty as DifficultyLevel,
          symmetry: options.symmetry,
          validateUniqueness: options.validate,
          maxRetries: options.maxRetries
        };

        const puzzle = PuzzleGenerator.generate(config);

        // Display result
        displayPuzzle(puzzle, outputFormat1 || 'text');

        // Save to file if requested (solution included by default, use --no-solution to exclude)
        if (options.output) {
          await savePuzzleToFile(puzzle, options.output, options.solution !== false);
          logger.info(`💾 Puzzle saved to: ${options.output}`);
        }

        logger.info(`✅ Puzzle generated successfully (Seed: ${puzzle.seed})`);

      } catch (error: any) {
        logger.error(`❌ Puzzle generation failed: ${error.message}`);
        process.exit(1);
      }
    });

  // Subcommand: puzzle from-seed
  puzzleCommand
    .command('from-seed')
    .description('Regenerate exact puzzle from seed number')
    .argument('<seed>', 'Seed number to regenerate from', parseInt)
    .option('--size <n>', 'Grid size: 4|9|16|25 (default: 9)', (val) => parseInt(val) as GridSize, 9)
    .option('--difficulty <level>', 'Difficulty: easy|medium|hard|expert|diabolical (default: medium)', 'medium')
    .option('--symmetry <type>', 'Symmetry: none|rotational|reflectional|diagonal (default: none)', 'none')
    .option('--output <file>', 'Save puzzle to file (JSON format)')
    .option('--no-solution', 'Exclude solution from output file')
    .action(async (seed, options) => {
      const { outputFormat: _outputFormat } = getCommandConfig(puzzleCommand);

      try {
        logger.info(`🎲 Regenerating puzzle from seed: ${seed}`);

        const config: PuzzleGenerationConfig = {
          seed,
          size: options.size,
          difficulty: options.difficulty as DifficultyLevel,
          symmetry: options.symmetry,
          validateUniqueness: true
        };

        const puzzle = PuzzleGenerator.generate(config);

        displayPuzzle(puzzle, _outputFormat || 'text');

        if (options.output) {
          await savePuzzleToFile(puzzle, options.output, options.solution !== false);
          logger.info(`💾 Puzzle saved to: ${options.output}`);
        }

        logger.info(`✅ Puzzle regenerated successfully`);

      } catch (error: any) {
        logger.error(`❌ Puzzle regeneration failed: ${error.message}`);
        process.exit(1);
      }
    });

  // Subcommand: puzzle batch
  puzzleCommand
    .command('batch')
    .description('Generate multiple puzzles')
    .option('--count <n>', 'Number of puzzles to generate (default: 10)', parseInt, 10)
    .option('--seed-start <n>', 'Starting seed for sequential mode (default: 1000)', parseInt, 1000)
    .option('--seed-mode <mode>', 'Seed mode: sequential|random (default: sequential)', 'sequential')
    .option('--size <n>', 'Grid size: 4|9|16|25 (default: 9)', (val) => parseInt(val) as GridSize, 9)
    .option('--difficulty <level>', 'Difficulty: easy|medium|hard|expert|diabolical (default: medium)', 'medium')
    .option('--symmetry <type>', 'Symmetry: none|rotational|reflectional|diagonal (default: none)', 'none')
    .option('--no-validate', 'Skip uniqueness validation (faster)')
    .option('--output-dir <dir>', 'Output directory for puzzles (default: puzzles/batch/)', 'puzzles/batch/')
    .option('--format <format>', 'Filename format: {size}|{difficulty}|{seed}|{index} (default: {size}-{difficulty}-{index})', '{size}-{difficulty}-{index}')
    .option('--no-solution', 'Exclude solution from output files')
    .action(async (options) => {
      const { outputFormat: outputFormat2 } = getCommandConfig(puzzleCommand);

      try {
        logger.info(`🎲 Generating ${options.count} puzzles in batch mode...`);
        logger.info(`   Mode: ${options.seedMode}, Starting seed: ${options.seedStart}`);

        const config: PuzzleGenerationConfig = {
          size: options.size,
          difficulty: options.difficulty as DifficultyLevel,
          symmetry: options.symmetry,
          validateUniqueness: options.validate
        };

        const puzzles = await PuzzleGenerator.generateBatch(
          options.count,
          config,
          options.seedMode,
          options.seedStart
        );

        // Create output directory
        await fs.mkdir(options.outputDir, { recursive: true });

        // Find the highest existing file index to avoid overwriting
        const startIndex = await findNextFileIndex(options.outputDir, options.format, puzzles[0]);

        // Save each puzzle
        const savedFiles: string[] = [];
        for (let i = 0; i < puzzles.length; i++) {
          const puzzle = puzzles[i];
          const filename = generateFilename(startIndex + i, puzzle, options.format);
          const filepath = path.join(options.outputDir, filename);

          await savePuzzleToFile(puzzle, filepath, options.solution !== false);
          savedFiles.push(filepath);

          // Progress indicator
          if ((i + 1) % 10 === 0 || i === puzzles.length - 1) {
            logger.info(`   Progress: ${i + 1}/${options.count} puzzles generated`);
          }
        }

        // Summary
        logger.info(`\n✅ Batch generation complete!`);
        logger.info(`   Puzzles: ${puzzles.length}`);
        logger.info(`   Output: ${options.outputDir}`);
        logger.info(`   Avg generation time: ${calculateAvgTime(puzzles)}ms`);
        logger.info(`   Seeds: ${puzzles[0].seed} - ${puzzles[puzzles.length - 1].seed}`);

        // Silence unused variable warning
        void outputFormat2;

      } catch (error: any) {
        logger.error(`❌ Batch generation failed: ${error.message}`);
        process.exit(1);
      }
    });

  // Subcommand: puzzle validate
  puzzleCommand
    .command('validate')
    .description('Validate puzzle uniqueness and solvability')
    .argument('<puzzle-file>', 'Path to puzzle file (JSON format)')
    .option('--check-uniqueness', 'Check for exactly one solution (may be slow)')
    .option('--max-solutions <n>', 'Maximum solutions to find before stopping (default: 2)', parseInt, 2)
    .action(async (puzzleFile, options) => {
      const { outputFormat: _outputFormat3 } = getCommandConfig(puzzleCommand);

      try {
        logger.info(`🔍 Validating puzzle: ${puzzleFile}`);

        // Load puzzle
        const puzzleData = await loadPuzzleFile(puzzleFile);
        const validator = new PuzzleValidator();

        if (options.checkUniqueness) {
          logger.info('   Checking solution uniqueness...');
          const result = validator.validate(puzzleData.grid, options.maxSolutions);

          if (_outputFormat3 === 'json') {
            console.log(JSON.stringify(result, null, 2));
          } else {
            displayValidationResult(result);
          }

          if (!result.hasUniqueSolution) {
            process.exit(1);
          }
        } else {
          // Quick solvability check
          logger.info('   Checking solvability...');
          const isSolvable = validator.isSolvable(puzzleData.grid);

          if (_outputFormat3 === 'json') {
            console.log(JSON.stringify({ isSolvable }, null, 2));
          } else {
            logger.info(isSolvable ? '✅ Puzzle is solvable' : '❌ Puzzle has no solution');
          }

          if (!isSolvable) {
            process.exit(1);
          }
        }

        logger.info('✅ Validation passed');

      } catch (error: any) {
        logger.error(`❌ Validation failed: ${error.message}`);
        process.exit(1);
      }
    });

  // Subcommand: puzzle list
  puzzleCommand
    .command('list')
    .description('List available puzzles in directory')
    .argument('[directory]', 'Puzzle directory to list (default: puzzles/)', 'puzzles/')
    .option('--filter-difficulty <level>', 'Filter by difficulty level')
    .option('--filter-size <n>', 'Filter by grid size', parseInt)
    .option('--show-seeds', 'Display seed numbers')
    .option('--show-stats', 'Display puzzle statistics')
    .option('--sort-by <field>', 'Sort by: name|seed|difficulty|size|date (default: name)', 'name')
    .action(async (directory, options) => {
      const { outputFormat: _outputFormat4 } = getCommandConfig(puzzleCommand);

      try {
        logger.info(`📁 Listing puzzles in: ${directory}`);

        const puzzleFiles = await listPuzzles(directory, options);

        if (_outputFormat4 === 'json') {
          console.log(JSON.stringify(puzzleFiles, null, 2));
        } else {
          displayPuzzleList(puzzleFiles, options);
        }

        logger.info(`\nFound ${puzzleFiles.length} puzzle(s)`);

      } catch (error: any) {
        logger.error(`❌ Failed to list puzzles: ${error.message}`);
        process.exit(1);
      }
    });

  program.addCommand(puzzleCommand);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Display puzzle in terminal
 */
function displayPuzzle(puzzle: GeneratedPuzzle, format: string): void {
  if (format === 'json') {
    console.log(JSON.stringify({
      seed: puzzle.seed,
      size: puzzle.size,
      difficulty: puzzle.targetDifficulty,
      clueCount: puzzle.clueCount,
      generationTimeMs: puzzle.generationTimeMs,
      hasUniqueSolution: puzzle.hasUniqueSolution,
      grid: puzzle.grid
    }, null, 2));
  } else {
    logger.info('\n' + '='.repeat(60));
    logger.info(`Puzzle #${puzzle.seed} (${puzzle.size}×${puzzle.size}, ${puzzle.targetDifficulty})`);
    logger.info('='.repeat(60));
    printGrid(puzzle.grid);
    logger.info('='.repeat(60));
    logger.info(`Clues: ${puzzle.clueCount}/${puzzle.size * puzzle.size} (${Math.round(puzzle.clueCount / (puzzle.size * puzzle.size) * 100)}%)`);
    logger.info(`Generation time: ${puzzle.generationTimeMs}ms`);
    logger.info(`Unique solution: ${puzzle.hasUniqueSolution ? '✓ Yes' : '✗ No'}`);
    logger.info('='.repeat(60) + '\n');
  }
}

/**
 * Print grid to console with box drawing
 */
function printGrid(grid: number[][]): void {
  const size = grid.length;
  const boxSize = Math.sqrt(size);

  for (let row = 0; row < size; row++) {
    let line = '';

    for (let col = 0; col < size; col++) {
      const value = grid[row][col];
      line += value === 0 ? ' · ' : ` ${value} `;

      if ((col + 1) % boxSize === 0 && col < size - 1) {
        line += '│';
      }
    }

    console.log('  ' + line);

    if ((row + 1) % boxSize === 0 && row < size - 1) {
      const separator = '  ' + '─────'.repeat(size / boxSize).trimEnd();
      console.log(separator);
    }
  }
}

/**
 * Save puzzle to JSON file
 */
async function savePuzzleToFile(
  puzzle: GeneratedPuzzle,
  filepath: string,
  includeSolution: boolean = false
): Promise<void> {
  const dir = path.dirname(filepath);
  await fs.mkdir(dir, { recursive: true });

  const data: any = {
    seed: puzzle.seed,
    size: puzzle.size,
    difficulty: puzzle.targetDifficulty,
    grid: puzzle.grid,
    metadata: {
      clueCount: puzzle.clueCount,
      generationTimeMs: puzzle.generationTimeMs,
      hasUniqueSolution: puzzle.hasUniqueSolution,
      generatedAt: new Date().toISOString()
    }
  };

  if (includeSolution) {
    data.solution = puzzle.solution;
  }

  await fs.writeFile(filepath, JSON.stringify(data, null, 2));
}

/**
 * Load puzzle from JSON file
 */
async function loadPuzzleFile(filepath: string): Promise<any> {
  const content = await fs.readFile(filepath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Generate filename from template
 */
function generateFilename(index: number, puzzle: GeneratedPuzzle, template: string): string {
  let filename = template
    .replace('{index}', index.toString().padStart(3, '0'))
    .replace('{seed}', puzzle.seed.toString())
    .replace('{difficulty}', puzzle.targetDifficulty)
    .replace('{size}', `${puzzle.size}x${puzzle.size}`);

  if (!filename.endsWith('.json')) {
    filename += '.json';
  }

  return filename;
}

/**
 * Find the next available file index in a directory
 * Scans existing files to find the highest index and returns the next one
 */
async function findNextFileIndex(
  outputDir: string,
  template: string,
  samplePuzzle: GeneratedPuzzle
): Promise<number> {
  try {
    const files = await fs.readdir(outputDir);

    // Build a pattern to match the template (replace {index} with a capture group)
    const basePattern = template
      .replace('{index}', '(\\d+)')
      .replace('{seed}', '\\d+')
      .replace('{difficulty}', samplePuzzle.targetDifficulty)
      .replace('{size}', `${samplePuzzle.size}x${samplePuzzle.size}`);

    const regex = new RegExp(`^${basePattern}\\.json$`);

    let maxIndex = 0;
    for (const file of files) {
      const match = file.match(regex);
      if (match && match[1]) {
        const index = parseInt(match[1], 10);
        if (index > maxIndex) {
          maxIndex = index;
        }
      }
    }

    return maxIndex + 1;
  } catch {
    // Directory doesn't exist or can't be read - start from 1
    return 1;
  }
}

/**
 * Calculate average generation time
 */
function calculateAvgTime(puzzles: GeneratedPuzzle[]): number {
  const total = puzzles.reduce((sum, p) => sum + p.generationTimeMs, 0);
  return Math.round(total / puzzles.length);
}

/**
 * Display validation result
 */
function displayValidationResult(result: any): void {
  logger.info('\n' + '='.repeat(60));
  logger.info('Validation Result');
  logger.info('='.repeat(60));
  logger.info(`Valid: ${result.isValid ? '✓ Yes' : '✗ No'}`);
  logger.info(`Unique solution: ${result.hasUniqueSolution ? '✓ Yes' : '✗ No'}`);
  logger.info(`Solution count: ${result.solutionCount}`);

  if (result.errors.length > 0) {
    logger.info('\nErrors:');
    result.errors.forEach((err: string) => logger.info(`  - ${err}`));
  }

  logger.info('='.repeat(60) + '\n');
}

/**
 * List puzzles in directory
 */
async function listPuzzles(directory: string, options: any): Promise<any[]> {
  const files = await fs.readdir(directory);
  const puzzleFiles: any[] = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    try {
      const filepath = path.join(directory, file);
      const content = await fs.readFile(filepath, 'utf-8');
      const data = JSON.parse(content);

      // Apply filters
      if (options.filterDifficulty && data.difficulty !== options.filterDifficulty) continue;
      if (options.filterSize && data.size !== options.filterSize) continue;

      const stats = await fs.stat(filepath);

      puzzleFiles.push({
        filename: file,
        filepath,
        seed: data.seed,
        size: data.size,
        difficulty: data.difficulty,
        clueCount: data.metadata?.clueCount,
        modifiedAt: stats.mtime
      });
    } catch (error) {
      // Skip invalid files
    }
  }

  // Sort
  puzzleFiles.sort((a, b) => {
    switch (options.sortBy) {
      case 'seed': return a.seed - b.seed;
      case 'difficulty': return a.difficulty.localeCompare(b.difficulty);
      case 'size': return a.size - b.size;
      case 'date': return b.modifiedAt.getTime() - a.modifiedAt.getTime();
      default: return a.filename.localeCompare(b.filename);
    }
  });

  return puzzleFiles;
}

/**
 * Display puzzle list
 */
function displayPuzzleList(puzzleFiles: any[], options: any): void {
  logger.info('\n' + '='.repeat(80));
  logger.info('Available Puzzles');
  logger.info('='.repeat(80));

  for (const puzzle of puzzleFiles) {
    let line = `${puzzle.filename.padEnd(40)} | ${puzzle.size}×${puzzle.size} | ${puzzle.difficulty.padEnd(10)}`;

    if (options.showSeeds) {
      line += ` | Seed: ${puzzle.seed}`;
    }

    if (options.showStats) {
      line += ` | Clues: ${puzzle.clueCount}`;
    }

    logger.info(line);
  }

  logger.info('='.repeat(80));
}
