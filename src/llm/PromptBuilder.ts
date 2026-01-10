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

    // NOTE: Removed buildConstraintInfo() call - redundant with grid display
    // The grid already shows filled cells; listing them again wastes ~500 tokens

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

      // Add forbidden moves (capped at 15 to prevent prompt bloat)
      const forbiddenMoves = this.extractForbiddenMoves(experiences);
      if (forbiddenMoves.length > 0) {
        const cappedMoves = forbiddenMoves.slice(0, 15);
        prompt += 'FORBIDDEN MOVES (do not repeat):\n';
        // Group in sets of 8 for readability
        for (let i = 0; i < cappedMoves.length; i += 8) {
          const group = cappedMoves.slice(i, i + 8).join(', ');
          prompt += `${group}\n`;
        }
        if (forbiddenMoves.length > 15) {
          prompt += `(${forbiddenMoves.length - 15} more omitted)\n`;
        }
        prompt += '\n';
      }
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

  // NOTE: buildConstraintInfo() was removed (2026-01-09)
  // It listed filled cells which is redundant - the grid already shows them.
  // This was adding ~500 tokens of noise per prompt.

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
   * Format few-shot examples from synthesized strategies
   *
   * Few-shots are now LLM-synthesized teaching examples, not raw move data.
   * Each teaches a strategy that can be applied to similar situations.
   */
  private formatFewShots(fewShots: FewShotExample[]): string {
    if (fewShots.length === 0) return '';

    let result = 'LEARNED STRATEGIES FROM PREVIOUS PUZZLES:\n\n';

    fewShots.forEach((example, idx) => {
      // Use new synthesized format if available, fall back to legacy format
      const strategyName = example.strategy || `Strategy ${idx + 1}`;
      const situation = example.situation || example.gridContext || 'General puzzle solving';
      const analysis = example.analysis;

      result += `Strategy ${idx + 1}: ${strategyName}\n`;
      result += `When this applies: ${situation}\n`;
      result += `How I reasoned:\n${analysis}\n`;

      // Include example move if coordinates are valid
      if (example.move.row > 0 && example.move.col > 0) {
        result += `Result: Move (${example.move.row},${example.move.col}) = ${example.move.value} → ${example.outcome}\n`;
      }

      result += '\n---\n\n';
    });

    result += 'Apply these strategies when you see similar patterns.\n';

    return result.trim();
  }

}
