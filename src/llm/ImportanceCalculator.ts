/**
 * Importance Calculator - Calculate experience importance scores
 * Specification: docs/specs/11-llm-sudoku-player.md, docs/specs/03-grasp-loop-spec.md
 */

import type { LLMMove, MoveValidation, LLMExperienceContext } from './types.js';
import { BoardFormatter } from './BoardFormatter.js';

/**
 * Calculate importance score for an LLM experience
 *
 * Implements Spec 03 ABSORB phase importance formula with LLM-specific adaptations:
 * - Base score: 0.5
 * - Correct move: +0.4
 * - Valid but wrong: +0.2
 * - Invalid (learning opportunity): +0.3
 * - Breakthrough (first success after 3+ errors): +0.3
 * - Long reasoning (>500 chars): +0.1
 * - Complex grid (>50 empty): +0.1
 * - Capped at 1.0
 *
 * @param move - The LLM move with reasoning
 * @param validation - Validation result
 * @param gridState - Current grid state
 * @param recentErrorCount - Number of consecutive errors before this move
 * @returns Importance score (0.0 - 1.0)
 */
export function calculateImportance(
  move: LLMMove,
  validation: MoveValidation,
  gridState: number[][],
  recentErrorCount: number
): number {
  let score = 0.5; // Base score

  // Outcome-based scoring
  if (validation.isCorrect) {
    score += 0.4; // Correct move
  } else if (validation.isValid && !validation.isCorrect) {
    score += 0.2; // Valid but wrong (interesting learning case)
  } else {
    score += 0.3; // Invalid move (learning opportunity)
  }

  // Breakthrough detection: first correct move after 3+ consecutive errors
  if (validation.isCorrect && recentErrorCount >= 3) {
    score += 0.3;
  }

  // Long reasoning indicates deep thinking
  if (move.reasoning.length > 500) {
    score += 0.1;
  }

  // Complex grid state (many empty cells)
  const emptyCells = BoardFormatter.countEmptyCells(gridState);
  if (emptyCells > 50) {
    score += 0.1;
  }

  // Cap at 1.0
  return Math.min(1.0, score);
}

/**
 * Calculate context metrics for an experience
 *
 * @param move - The LLM move with reasoning
 * @param gridState - Current grid state
 * @returns Context metrics for importance calculation
 */
export function calculateContext(
  move: LLMMove,
  gridState: number[][]
): LLMExperienceContext {
  const emptyCells = BoardFormatter.countEmptyCells(gridState);

  // Calculate constraint density: average number of candidates per empty cell
  let totalCandidates = 0;
  let emptyCellCount = 0;

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (gridState[row][col] === 0) {
        const candidates = countCandidates(gridState, row, col);
        totalCandidates += candidates;
        emptyCellCount++;
      }
    }
  }

  const constraintDensity =
    emptyCellCount > 0 ? totalCandidates / emptyCellCount : 0;

  return {
    emptyCellsAtMove: emptyCells,
    reasoningLength: move.reasoning.length,
    constraintDensity: parseFloat(constraintDensity.toFixed(2)),
  };
}

/**
 * Count valid candidates for a cell
 *
 * NOTE: This duplicates logic from StrategyEngine to avoid circular dependencies.
 * Counts how many values (1-9) are valid for a given empty cell.
 *
 * @param grid - Current grid state (0-indexed, 0 = empty)
 * @param row - Row index (0-indexed)
 * @param col - Column index (0-indexed)
 * @returns Number of valid candidates (1-9)
 */
function countCandidates(
  grid: number[][],
  row: number,
  col: number
): number {
  if (grid[row][col] !== 0) return 0; // Cell already filled

  const candidates = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);

  // Check row
  for (let c = 0; c < 9; c++) {
    if (grid[row][c] !== 0) {
      candidates.delete(grid[row][c]);
    }
  }

  // Check column
  for (let r = 0; r < 9; r++) {
    if (grid[r][col] !== 0) {
      candidates.delete(grid[r][col]);
    }
  }

  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (grid[r][c] !== 0) {
        candidates.delete(grid[r][c]);
      }
    }
  }

  return candidates.size;
}
