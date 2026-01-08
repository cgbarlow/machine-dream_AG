/**
 * Puzzle Validation - Uniqueness and Solvability Checking
 *
 * Ensures generated puzzles have exactly one solution.
 *
 * Spec: 12-randomized-puzzle-generation.md
 */

import { SudokuRules } from './SudokuRules.js';

export interface ValidationResult {
  isValid: boolean;
  hasUniqueSolution: boolean;
  solutionCount: number;
  errors: string[];
}

/**
 * Validates Sudoku puzzles for correctness and uniqueness
 */
export class PuzzleValidator {
  private rules: SudokuRules;

  constructor() {
    this.rules = new SudokuRules();
  }

  /**
   * Validate puzzle has exactly one solution
   *
   * @param grid - Puzzle grid to validate
   * @param maxSolutions - Stop counting after finding this many solutions (default: 2)
   * @returns Validation result with solution count
   */
  public validate(grid: number[][], maxSolutions: number = 2): ValidationResult {
    const errors: string[] = [];

    // Basic validation first
    if (!this.validateStructure(grid, errors)) {
      return {
        isValid: false,
        hasUniqueSolution: false,
        solutionCount: 0,
        errors
      };
    }

    // Check for conflicting clues
    if (!this.validateClues(grid, errors)) {
      return {
        isValid: false,
        hasUniqueSolution: false,
        solutionCount: 0,
        errors
      };
    }

    // Count solutions
    const solutionCount = this.countSolutions(grid, maxSolutions);

    return {
      isValid: solutionCount > 0,
      hasUniqueSolution: solutionCount === 1,
      solutionCount,
      errors: solutionCount === 0 ? ['No solution exists'] :
              solutionCount > 1 ? [`Multiple solutions found (${solutionCount}+)`] : []
    };
  }

  /**
   * Validate grid structure (dimensions, cell values)
   */
  private validateStructure(grid: number[][], errors: string[]): boolean {
    if (!Array.isArray(grid)) {
      errors.push('Grid must be an array');
      return false;
    }

    const size = grid.length;
    const validSizes = [4, 9, 16, 25];

    if (!validSizes.includes(size)) {
      errors.push(`Invalid grid size: ${size}. Must be 4, 9, 16, or 25`);
      return false;
    }

    for (let row = 0; row < size; row++) {
      if (!Array.isArray(grid[row]) || grid[row].length !== size) {
        errors.push(`Row ${row} has invalid length: ${grid[row]?.length}. Expected ${size}`);
        return false;
      }

      for (let col = 0; col < size; col++) {
        const value = grid[row][col];
        if (!Number.isInteger(value) || value < 0 || value > size) {
          errors.push(`Invalid cell value at (${row},${col}): ${value}. Must be 0-${size}`);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Validate given clues don't conflict with Sudoku rules
   */
  private validateClues(grid: number[][], errors: string[]): boolean {
    const size = grid.length;
    let isValid = true;

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const value = grid[row][col];
        if (value !== 0) {
          // Temporarily clear cell to check if placement is valid
          grid[row][col] = 0;

          if (!this.rules.isValidPlacement(grid, row, col, value)) {
            errors.push(`Conflicting clue at (${row},${col}): ${value}`);
            isValid = false;
          }

          // Restore value
          grid[row][col] = value;
        }
      }
    }

    return isValid;
  }

  /**
   * Count number of solutions using backtracking
   *
   * @param grid - Puzzle grid (will be copied, not modified)
   * @param maxSolutions - Stop counting after finding this many
   * @returns Number of solutions found (capped at maxSolutions)
   */
  public countSolutions(grid: number[][], maxSolutions: number = 2): number {
    // Create a copy to avoid modifying original
    const gridCopy = grid.map(row => [...row]);
    let count = 0;

    const solve = (grid: number[][]): boolean => {
      // If we've found enough solutions, stop searching
      if (count >= maxSolutions) return true;

      // Find next empty cell
      const emptyCell = this.findEmptyCell(grid);
      if (!emptyCell) {
        // Puzzle is complete - found a solution
        count++;
        return false; // Continue searching for more solutions
      }

      const [row, col] = emptyCell;
      const size = grid.length;

      // Try each number
      for (let num = 1; num <= size; num++) {
        if (this.rules.isValidPlacement(grid, row, col, num)) {
          grid[row][col] = num;

          if (solve(grid)) return true; // Stop if we've found enough

          grid[row][col] = 0; // Backtrack
        }
      }

      return false;
    };

    solve(gridCopy);
    return count;
  }

  /**
   * Find first empty cell (value = 0)
   */
  private findEmptyCell(grid: number[][]): [number, number] | null {
    const size = grid.length;

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (grid[row][col] === 0) {
          return [row, col];
        }
      }
    }

    return null;
  }

  /**
   * Quick solvability check (faster than full validation)
   * Returns true if puzzle appears solvable (may have multiple solutions)
   */
  public isSolvable(grid: number[][]): boolean {
    const gridCopy = grid.map(row => [...row]);
    return this.solveOnce(gridCopy);
  }

  /**
   * Attempt to solve puzzle once (stops after first solution)
   */
  private solveOnce(grid: number[][]): boolean {
    const emptyCell = this.findEmptyCell(grid);
    if (!emptyCell) return true; // Solved

    const [row, col] = emptyCell;
    const size = grid.length;

    for (let num = 1; num <= size; num++) {
      if (this.rules.isValidPlacement(grid, row, col, num)) {
        grid[row][col] = num;
        if (this.solveOnce(grid)) return true;
        grid[row][col] = 0;
      }
    }

    return false;
  }
}
