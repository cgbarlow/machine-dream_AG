/**
 * Prompt Builder - Constructs prompts from puzzle state
 * Specification: docs/specs/11-llm-sudoku-player.md
 */

import type { LLMExperience, FewShotExample } from './types.js';

/**
 * Prompt Builder
 *
 * Spec 11: Constructs prompts with:
 * - Current puzzle state (formatted grid)
 * - Move history for this puzzle
 * - Few-shot examples (when memory enabled)
 */
export class PromptBuilder {
  /**
   * Build complete prompt for LLM
   *
   * @param gridState - Current 9x9 grid (0 = empty, 1-9 = filled)
   * @param experiences - Past experiences on this puzzle
   * @param fewShots - Few-shot examples from memory (if enabled)
   */
  buildPrompt(
    gridState: number[][],
    experiences: LLMExperience[] = [],
    fewShots: FewShotExample[] = []
  ): string {
    let prompt = 'CURRENT PUZZLE STATE:\n';
    prompt += this.formatGrid(gridState);
    prompt += '\n\n';

    // Add few-shot examples if memory enabled
    if (fewShots.length > 0) {
      prompt += this.formatFewShots(fewShots);
      prompt += '\n\n';
    }

    // Add move history for this puzzle
    if (experiences.length > 0) {
      prompt += 'YOUR PREVIOUS ATTEMPTS ON THIS PUZZLE:\n';
      prompt += this.formatMoveHistory(experiences);
      prompt += '\n\n';
    }

    // Add empty cell count
    const emptyCells = this.countEmptyCells(gridState);
    prompt += `Empty cells remaining: ${emptyCells}\n\n`;
    prompt += 'What is your next move?';

    return prompt;
  }

  /**
   * Format 9x9 grid with box separators (Spec 11 format)
   */
  private formatGrid(grid: number[][]): string {
    let result = '    1 2 3   4 5 6   7 8 9\n';
    result += '  ┌───────┬───────┬───────┐\n';

    for (let row = 0; row < 9; row++) {
      result += `${row + 1} │`;

      for (let col = 0; col < 9; col++) {
        const value = grid[row][col];
        result += value === 0 ? ' .' : ` ${value}`;

        // Box separators
        if (col === 2 || col === 5) {
          result += ' │';
        } else if (col === 8) {
          result += ' │\n';
        }
      }

      // Row separators
      if (row === 2 || row === 5) {
        result += '  ├───────┼───────┼───────┤\n';
      }
    }

    result += '  └───────┴───────┴───────┘';
    return result;
  }

  /**
   * Format move history with outcomes
   */
  private formatMoveHistory(experiences: LLMExperience[]): string {
    return experiences
      .map((exp, idx) => {
        const { row, col, value } = exp.move;
        const outcome = this.formatOutcome(exp.validation);
        return `Move ${idx + 1}: (${row},${col})=${value} → ${outcome}`;
      })
      .join('\n');
  }

  /**
   * Format validation outcome
   */
  private formatOutcome(validation: {
    outcome: 'correct' | 'invalid' | 'valid_but_wrong';
    error?: string;
  }): string {
    if (validation.outcome === 'correct') {
      return 'CORRECT: Good move!';
    }
    if (validation.outcome === 'invalid') {
      return `INVALID: ${validation.error || 'Rule violation'}`;
    }
    return `VALID_BUT_WRONG: Move was legal but doesn't match solution`;
  }

  /**
   * Format few-shot examples from successful patterns
   */
  private formatFewShots(fewShots: FewShotExample[]): string {
    let result = 'LEARNED PATTERNS FROM PREVIOUS PUZZLES:\n\n';

    fewShots.forEach((example, idx) => {
      result += `Example ${idx + 1} - ${example.gridContext}:\n`;
      result += `Analysis: ${example.analysis}\n`;
      result += `Move: (${example.move.row},${example.move.col})=${example.move.value} → CORRECT\n\n`;
    });

    return result.trim();
  }

  /**
   * Count empty cells in grid
   */
  private countEmptyCells(grid: number[][]): number {
    return grid.flat().filter((cell) => cell === 0).length;
  }
}
