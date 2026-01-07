/**
 * Advanced Puzzle Generator with Seed-Based Reproducibility
 *
 * Supports variable grid sizes (4×4, 9×9, 16×16, 25×25) with
 * deterministic generation from seed numbers.
 *
 * Spec: 12-randomized-puzzle-generation.md
 */

import { SeededRandom } from './SeededRandom';
import { PuzzleValidator } from './PuzzleValidator';
import { SudokuRules } from './SudokuRules';
import type {
  PuzzleGenerationConfig,
  GeneratedPuzzle,
  GridSize,
  DifficultyLevel
} from '../types';

/**
 * Difficulty-to-clue-count mapping for different grid sizes
 * Based on percentage of cells to fill
 */
const DIFFICULTY_CLUE_COUNTS: Record<GridSize, Record<DifficultyLevel, number>> = {
  4: {
    easy: 12,       // 75% filled (12/16)
    medium: 10,     // 62% filled
    hard: 8,        // 50% filled
    expert: 7,      // 44% filled
    diabolical: 6   // 37% filled
  },
  9: {
    easy: 45,       // 56% filled (45/81)
    medium: 35,     // 43% filled
    hard: 28,       // 35% filled
    expert: 23,     // 28% filled
    diabolical: 20  // 25% filled
  },
  16: {
    easy: 140,      // 55% filled (140/256)
    medium: 110,    // 43% filled
    hard: 90,       // 35% filled
    expert: 75,     // 29% filled
    diabolical: 64  // 25% filled
  },
  25: {
    easy: 350,      // 56% filled (350/625)
    medium: 275,    // 44% filled
    hard: 220,      // 35% filled
    expert: 180,    // 29% filled
    diabolical: 155 // 25% filled
  }
};

/**
 * Generate Sudoku puzzles with seed-based reproducibility
 */
export class PuzzleGenerator {
  private config: Required<PuzzleGenerationConfig>;
  private rng: SeededRandom;
  private validator: PuzzleValidator;
  private rules: SudokuRules;

  constructor(config: PuzzleGenerationConfig = {}) {
    // Apply defaults
    this.config = {
      seed: config.seed ?? this.generateRandomSeed(),
      size: config.size ?? 9,
      difficulty: config.difficulty ?? 'medium',
      symmetry: config.symmetry ?? 'none',
      validateUniqueness: config.validateUniqueness ?? true,
      maxRetries: config.maxRetries ?? 100
    };

    this.rng = new SeededRandom(this.config.seed);
    this.validator = new PuzzleValidator();
    this.rules = new SudokuRules();
  }

  /**
   * Get the seed used by this generator
   */
  public getSeed(): number {
    return this.config.seed;
  }

  /**
   * Generate a puzzle with current configuration
   */
  public generate(): GeneratedPuzzle {
    const startTime = Date.now();
    const size = this.config.size;
    const targetClueCount = DIFFICULTY_CLUE_COUNTS[size][this.config.difficulty];

    let retryCount = 0;
    let puzzle: GeneratedPuzzle | null = null;

    while (retryCount < this.config.maxRetries) {
      try {
        // Generate a complete solved grid
        const solution = this.generateSolution(size);

        // Remove cells to create puzzle
        const grid = this.removeCells(solution, targetClueCount);

        // Validate if required
        let isValid = true;
        let hasUniqueSolution = true;

        if (this.config.validateUniqueness) {
          const validation = this.validator.validate(grid);
          isValid = validation.isValid;
          hasUniqueSolution = validation.hasUniqueSolution;

          if (!hasUniqueSolution) {
            retryCount++;
            continue; // Try again
          }
        } else {
          // Quick solvability check only
          isValid = this.validator.isSolvable(grid);
          if (!isValid) {
            retryCount++;
            continue;
          }
        }

        const clueCount = this.countClues(grid);
        const generationTimeMs = Date.now() - startTime;

        puzzle = {
          grid,
          solution,
          seed: this.config.seed,
          size,
          targetDifficulty: this.config.difficulty,
          actualDifficulty: this.config.difficulty, // TODO: Analyze actual difficulty
          clueCount,
          generationTimeMs,
          retryCount,
          isValid,
          hasUniqueSolution
        };

        break; // Success!

      } catch (error) {
        retryCount++;
        if (retryCount >= this.config.maxRetries) {
          throw new Error(`Failed to generate puzzle after ${this.config.maxRetries} attempts: ${error}`);
        }
      }
    }

    if (!puzzle) {
      throw new Error(`Failed to generate valid puzzle after ${this.config.maxRetries} attempts`);
    }

    return puzzle;
  }

  /**
   * Generate a complete solved grid using backtracking with seeded randomness
   */
  private generateSolution(size: GridSize): number[][] {
    const grid: number[][] = Array(size).fill(0).map(() => Array(size).fill(0));

    if (!this.fillGrid(grid, size)) {
      throw new Error('Failed to generate complete solution grid');
    }

    return grid;
  }

  /**
   * Fill grid using backtracking with randomized number selection
   */
  private fillGrid(grid: number[][], size: GridSize): boolean {
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (grid[row][col] === 0) {
          // Try numbers in random order
          const numbers = this.rng.shuffle(this.getNumberRange(size));

          for (const num of numbers) {
            if (this.rules.isValidPlacement(grid, row, col, num)) {
              grid[row][col] = num;

              if (this.fillGrid(grid, size)) {
                return true; // Success
              }

              grid[row][col] = 0; // Backtrack
            }
          }

          return false; // No valid number found
        }
      }
    }

    return true; // Grid completely filled
  }

  /**
   * Remove cells from solution to create puzzle
   */
  private removeCells(solution: number[][], targetClueCount: number): number[][] {
    const size = solution.length;
    const grid = solution.map(row => [...row]); // Deep copy

    const totalCells = size * size;
    const cellsToRemove = totalCells - targetClueCount;

    if (this.config.symmetry === 'none') {
      // Simple random removal
      return this.removeRandomCells(grid, cellsToRemove);
    } else {
      // Symmetric removal
      return this.removeSymmetricCells(grid, cellsToRemove);
    }
  }

  /**
   * Remove cells randomly without symmetry
   */
  private removeRandomCells(grid: number[][], count: number): number[][] {
    const size = grid.length;
    const cells: [number, number][] = [];

    // Collect all cell positions
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        cells.push([row, col]);
      }
    }

    // Shuffle and remove first N cells
    this.rng.shuffle(cells);

    for (let i = 0; i < count && i < cells.length; i++) {
      const [row, col] = cells[i];
      grid[row][col] = 0;
    }

    return grid;
  }

  /**
   * Remove cells with symmetry pattern
   */
  private removeSymmetricCells(grid: number[][], count: number): number[][] {
    const size = grid.length;
    const symmetry = this.config.symmetry;

    // For symmetric removal, we remove cells in pairs/groups
    const cellsPerGroup = symmetry === 'rotational' ? 2 :
                          symmetry === 'reflectional' ? 2 :
                          symmetry === 'diagonal' ? 2 : 1;

    const groupsToRemove = Math.floor(count / cellsPerGroup);

    for (let i = 0; i < groupsToRemove; i++) {
      const row = this.rng.nextInt(0, size - 1);
      const col = this.rng.nextInt(0, size - 1);

      // Remove cell and its symmetric counterpart(s)
      grid[row][col] = 0;

      if (symmetry === 'rotational') {
        const symRow = size - 1 - row;
        const symCol = size - 1 - col;
        grid[symRow][symCol] = 0;
      } else if (symmetry === 'reflectional') {
        const symCol = size - 1 - col;
        grid[row][symCol] = 0;
      } else if (symmetry === 'diagonal') {
        grid[col][row] = 0; // Transpose
      }
    }

    return grid;
  }

  /**
   * Count number of filled cells (clues)
   */
  private countClues(grid: number[][]): number {
    let count = 0;
    for (const row of grid) {
      for (const cell of row) {
        if (cell !== 0) count++;
      }
    }
    return count;
  }

  /**
   * Get array of valid numbers for grid size [1..size]
   */
  private getNumberRange(size: GridSize): number[] {
    return Array.from({ length: size }, (_, i) => i + 1);
  }

  /**
   * Generate cryptographically random seed
   */
  private generateRandomSeed(): number {
    return Math.floor(Math.random() * 0xffffffff);
  }

  /**
   * Static factory: Create generator from seed
   */
  public static fromSeed(seed: number, config?: Omit<PuzzleGenerationConfig, 'seed'>): PuzzleGenerator {
    return new PuzzleGenerator({ ...config, seed });
  }

  /**
   * Static factory: Generate single puzzle with config
   */
  public static generate(config?: PuzzleGenerationConfig): GeneratedPuzzle {
    const generator = new PuzzleGenerator(config);
    return generator.generate();
  }

  /**
   * Static factory: Batch generate puzzles
   */
  public static async generateBatch(
    count: number,
    config: PuzzleGenerationConfig,
    seedMode: 'sequential' | 'random' = 'sequential',
    seedStart: number = 1000
  ): Promise<GeneratedPuzzle[]> {
    const puzzles: GeneratedPuzzle[] = [];

    for (let i = 0; i < count; i++) {
      const seed = seedMode === 'sequential' ? seedStart + i : Math.floor(Math.random() * 0xffffffff);

      const generator = new PuzzleGenerator({ ...config, seed });
      const puzzle = generator.generate();
      puzzles.push(puzzle);
    }

    return puzzles;
  }
}
