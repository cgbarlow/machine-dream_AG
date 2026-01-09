/**
 * Prompt Builder - Constructs prompts from puzzle state
 * Specification: docs/specs/11-llm-sudoku-player.md
 */

import type { LLMExperience, FewShotExample } from './types.js';
import { BoardFormatter } from './BoardFormatter.js';

/**
 * Prompt Builder
 *
 * Spec 11: Constructs prompts with:
 * - Current puzzle state (formatted grid)
 * - Move history for this puzzle
 * - Few-shot examples (when memory enabled)
 */
export class PromptBuilder {
  constructor(private includeReasoning: boolean = false) {}

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
    const size = gridState.length;

    // Simplified prompt: use only row format (no visual grid)
    let prompt = 'CURRENT PUZZLE STATE:\n';
    for (let row = 0; row < size; row++) {
      const rowStr = gridState[row]
        .map(cell => cell === 0 ? '_' : cell.toString())
        .join(',');
      prompt += `R${row + 1}: ${rowStr}\n`;
    }
    prompt += '\n';

    // Add constraint information to prevent invalid moves
    prompt += this.buildConstraintInfo(gridState);
    prompt += '\n';

    // Add few-shot examples if memory enabled
    if (fewShots.length > 0) {
      prompt += this.formatFewShots(fewShots);
      prompt += '\n\n';
    }

    // Add move history for this puzzle
    if (experiences.length > 0) {
      // Add forbidden moves FIRST - make them impossible to miss
      const forbiddenMoves = this.extractForbiddenMoves(experiences);
      if (forbiddenMoves.length > 0) {
        prompt += '⚠️  FORBIDDEN MOVES - DO NOT ATTEMPT THESE AGAIN ⚠️\n';
        prompt += 'These moves have been proven WRONG. You MUST NOT propose any of these:\n';
        // Group in sets of 8 for readability
        for (let i = 0; i < forbiddenMoves.length; i += 8) {
          const group = forbiddenMoves.slice(i, i + 8).join(', ');
          prompt += `${group}\n`;
        }
        prompt += 'If you propose ANY move from this list, your response will be REJECTED.\n\n';
      }

      prompt += 'YOUR PREVIOUS ATTEMPTS ON THIS PUZZLE:\n';
      prompt += this.formatMoveHistory(experiences);
      prompt += '\n\n';
    }

    // Add empty cell count
    const emptyCells = BoardFormatter.countEmptyCells(gridState);
    prompt += `Empty cells remaining: ${emptyCells}\n\n`;
    prompt += 'What is your next move?';

    return prompt;
  }

  /**
   * Extract forbidden moves from experience history
   * Returns list of (cell,value) pairs that have been proven wrong
   */
  private extractForbiddenMoves(experiences: LLMExperience[]): string[] {
    const forbidden = new Set<string>();

    for (const exp of experiences) {
      // Track INVALID (rule violations) and VALID_BUT_WRONG (incorrect guesses) as forbidden
      // This prevents the LLM from repeatedly trying the same wrong move
      if (exp.validation.outcome === 'invalid' || exp.validation.outcome === 'valid_but_wrong') {
        const { row, col, value } = exp.move;
        forbidden.add(`(${row},${col})=${value}`);
      }
    }

    return Array.from(forbidden).sort();
  }

  /**
   * Build constraint information about filled cells
   * This helps the LLM avoid proposing moves for already-filled cells
   */
  private buildConstraintInfo(gridState: number[][]): string {
    const size = gridState.length;
    const filledCells: string[] = [];

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const value = gridState[row][col];
        if (value !== 0) {
          // Cell is filled - add to list (1-indexed for user-facing)
          filledCells.push(`(${row + 1},${col + 1})=${value}`);
        }
      }
    }

    let info = 'FILLED CELLS (cannot be changed):\n';
    // Group in sets of 10 for readability
    for (let i = 0; i < filledCells.length; i += 10) {
      const group = filledCells.slice(i, i + 10).join(', ');
      info += `${group}\n`;
    }

    return info;
  }

  /**
   * Format move history with outcomes - facts only
   * Note: Caller is responsible for limiting experiences array if needed
   */
  private formatMoveHistory(experiences: LLMExperience[]): string {
    return experiences
      .map((exp) => {
        const { row, col, value } = exp.move;
        const outcome = this.formatOutcome(exp.validation);

        // Include reasoning snippet as factual record (if enabled)
        let reasoning = '';
        if (this.includeReasoning && exp.move.reasoning) {
          const snippet = exp.move.reasoning
            .replace(/\n/g, ' ')
            .substring(0, 80)
            .trim();
          reasoning = `\n  Your reasoning: "${snippet}${exp.move.reasoning.length > 80 ? '...' : ''}"`;
        }

        // Use actual move number instead of array index
        return `Move ${exp.moveNumber}: (${row},${col})=${value} → ${outcome}${reasoning}`;
      })
      .join('\n');
  }

  /**
   * Format validation outcome - factual only, no hints
   */
  private formatOutcome(validation: {
    outcome: 'correct' | 'invalid' | 'valid_but_wrong';
    error?: string;
  }): string {
    if (validation.outcome === 'correct') {
      return 'CORRECT';
    }
    if (validation.outcome === 'invalid') {
      // Include specific error for learning
      return `INVALID (${validation.error || 'Rule violation'})`;
    }
    return 'VALID_BUT_WRONG';
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

}
