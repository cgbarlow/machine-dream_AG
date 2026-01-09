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
 *
 * Supports variable grid sizes (4x4, 9x9, 16x16, 25x25)
 */
export class MoveValidator {
  /**
   * Validate a move against current state and solution
   *
   * @param gridState - Current NxN grid (0 = empty)
   * @param move - Proposed move (row, col, value in 1-N format)
   * @param solution - Complete solution grid (for correctness check)
   * @returns Validation result with outcome
   */
  validate(
    gridState: number[][],
    move: LLMMove,
    solution: number[][]
  ): MoveValidation {
    const size = gridState.length;
    const boxSize = Math.sqrt(size);

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
    const boxRowStart = Math.floor(row / boxSize) * boxSize;
    const boxColStart = Math.floor(col / boxSize) * boxSize;
    const boxNum = Math.floor(row / boxSize) * boxSize + Math.floor(col / boxSize) + 1;

    for (let r = boxRowStart; r < boxRowStart + boxSize; r++) {
      for (let c = boxColStart; c < boxColStart + boxSize; c++) {
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
    const size = gridState.length;
    const boxSize = Math.sqrt(size);
    const numBoxes = size; // e.g., 9 boxes for 9x9, 4 boxes for 4x4

    // No empty cells
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (gridState[row][col] === 0) {
          return false;
        }
      }
    }

    // All constraints satisfied (redundant check, but for completeness)
    for (let i = 0; i < size; i++) {
      if (!this.isValidSet(this.getRow(gridState, i), size)) return false;
      if (!this.isValidSet(this.getColumn(gridState, i), size)) return false;
    }
    for (let i = 0; i < numBoxes; i++) {
      if (!this.isValidSet(this.getBox(gridState, i, boxSize), size)) return false;
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
   * Get box values (boxes numbered 0 to size-1)
   */
  private getBox(grid: number[][], boxIndex: number, boxSize: number): number[] {
    const boxesPerRow = grid.length / boxSize;
    const boxRowStart = Math.floor(boxIndex / boxesPerRow) * boxSize;
    const boxColStart = (boxIndex % boxesPerRow) * boxSize;
    const values: number[] = [];

    for (let r = boxRowStart; r < boxRowStart + boxSize; r++) {
      for (let c = boxColStart; c < boxColStart + boxSize; c++) {
        values.push(grid[r][c]);
      }
    }

    return values;
  }

  /**
   * Check if set contains 1-N exactly once
   */
  private isValidSet(values: number[], size: number): boolean {
    const sorted = [...values].sort((a, b) => a - b);
    for (let i = 0; i < size; i++) {
      if (sorted[i] !== i + 1) {
        return false;
      }
    }
    return true;
  }
}
