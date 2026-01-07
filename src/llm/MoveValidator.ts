/**
 * Move Validator - Validates moves against Sudoku rules
 * Specification: docs/specs/11-llm-sudoku-player.md
 */

import type { LLMMove, MoveValidation } from './types.js';

/**
 * Move Validator
 *
 * Spec 11: Validates moves by checking:
 * 1. Cell is empty (not already filled)
 * 2. No rule violations (row/col/box constraints)
 * 3. Matches solution (correct vs wrong)
 */
export class MoveValidator {
  /**
   * Validate a move against current state and solution
   *
   * @param gridState - Current 9x9 grid (0 = empty)
   * @param move - Proposed move (row, col, value in 1-9 format)
   * @param solution - Complete solution grid (for correctness check)
   * @returns Validation result with outcome
   */
  validate(
    gridState: number[][],
    move: LLMMove,
    solution: number[][]
  ): MoveValidation {
    // Convert to 0-indexed
    const row = move.row - 1;
    const col = move.col - 1;
    const value = move.value;

    // Check 1: Cell must be empty
    if (gridState[row][col] !== 0) {
      return {
        isValid: false,
        isCorrect: false,
        outcome: 'invalid',
        error: `Cell (${move.row},${move.col}) is already filled with ${gridState[row][col]}`,
      };
    }

    // Check 2: Row constraint
    if (gridState[row].includes(value)) {
      return {
        isValid: false,
        isCorrect: false,
        outcome: 'invalid',
        error: `Value ${value} already exists in row ${move.row}`,
      };
    }

    // Check 3: Column constraint
    const columnValues = gridState.map((r) => r[col]);
    if (columnValues.includes(value)) {
      return {
        isValid: false,
        isCorrect: false,
        outcome: 'invalid',
        error: `Value ${value} already exists in column ${move.col}`,
      };
    }

    // Check 4: Box constraint
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    const boxNum = Math.floor(row / 3) * 3 + Math.floor(col / 3) + 1;

    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if (gridState[r][c] === value) {
          return {
            isValid: false,
            isCorrect: false,
            outcome: 'invalid',
            error: `Value ${value} already exists in box ${boxNum}`,
          };
        }
      }
    }

    // Move is valid - check if it matches solution
    const isCorrect = solution[row][col] === value;

    return {
      isValid: true,
      isCorrect,
      outcome: isCorrect ? 'correct' : 'valid_but_wrong',
      error: isCorrect
        ? undefined
        : `Move is legal but ${value} is not the correct value for (${move.row},${move.col})`,
    };
  }

  /**
   * Check if puzzle is completely solved
   */
  isSolved(gridState: number[][]): boolean {
    // No empty cells
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (gridState[row][col] === 0) {
          return false;
        }
      }
    }

    // All constraints satisfied (redundant check, but for completeness)
    for (let i = 0; i < 9; i++) {
      if (!this.isValidSet(this.getRow(gridState, i))) return false;
      if (!this.isValidSet(this.getColumn(gridState, i))) return false;
      if (!this.isValidSet(this.getBox(gridState, i))) return false;
    }

    return true;
  }

  /**
   * Get row values
   */
  private getRow(grid: number[][], row: number): number[] {
    return grid[row];
  }

  /**
   * Get column values
   */
  private getColumn(grid: number[][], col: number): number[] {
    return grid.map((row) => row[col]);
  }

  /**
   * Get box values (boxes numbered 0-8)
   */
  private getBox(grid: number[][], boxIndex: number): number[] {
    const boxRow = Math.floor(boxIndex / 3) * 3;
    const boxCol = (boxIndex % 3) * 3;
    const values: number[] = [];

    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        values.push(grid[r][c]);
      }
    }

    return values;
  }

  /**
   * Check if set contains 1-9 exactly once
   */
  private isValidSet(values: number[]): boolean {
    const sorted = [...values].sort();
    for (let i = 0; i < 9; i++) {
      if (sorted[i] !== i + 1) {
        return false;
      }
    }
    return true;
  }
}
