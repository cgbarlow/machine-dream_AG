/**
 * Response Parser - Extracts moves from LLM output
 * Specification: docs/specs/11-llm-sudoku-player.md
 */

import type { LLMMove, LLMResponse } from './types.js';

/**
 * Response Parser
 *
 * Spec 11: Parses LLM response to extract:
 * - ROW: 1-9
 * - COL: 1-9
 * - VALUE: 1-9
 * - REASONING: step-by-step analysis
 */
export class ResponseParser {
  /**
   * Parse LLM response into structured move
   *
   * Expected format:
   * ROW: <number>
   * COL: <number>
   * VALUE: <number>
   * REASONING: <text>
   */
  parse(rawResponse: string): LLMResponse {
    try {
      const move = this.extractMove(rawResponse);

      if (!move) {
        return {
          move: this.createEmptyMove(),
          rawResponse,
          parseSuccess: false,
          parseError: 'Could not extract ROW, COL, VALUE from response',
        };
      }

      // Validate extracted values
      const validation = this.validateMove(move);
      if (!validation.valid) {
        return {
          move: this.createEmptyMove(),
          rawResponse,
          parseSuccess: false,
          parseError: validation.error,
        };
      }

      return {
        move,
        rawResponse,
        parseSuccess: true,
      };
    } catch (error) {
      return {
        move: this.createEmptyMove(),
        rawResponse,
        parseSuccess: false,
        parseError:
          error instanceof Error ? error.message : 'Unknown parse error',
      };
    }
  }

  /**
   * Extract move components from response text
   */
  private extractMove(text: string): LLMMove | null {
    const rowMatch = text.match(/ROW:\s*(\d+)/i);
    const colMatch = text.match(/COL(?:UMN)?:\s*(\d+)/i);
    const valueMatch = text.match(/VALUE:\s*(\d+)/i);
    const reasoningMatch = text.match(/REASONING:\s*(.+?)(?=\n\n|$)/is);

    if (!rowMatch || !colMatch || !valueMatch) {
      return null;
    }

    return {
      row: parseInt(rowMatch[1], 10),
      col: parseInt(colMatch[1], 10),
      value: parseInt(valueMatch[1], 10),
      reasoning: reasoningMatch ? reasoningMatch[1].trim() : 'No reasoning provided',
    };
  }

  /**
   * Validate extracted move values
   */
  private validateMove(move: LLMMove): { valid: boolean; error?: string } {
    if (move.row < 1 || move.row > 9) {
      return { valid: false, error: `Invalid row: ${move.row} (must be 1-9)` };
    }

    if (move.col < 1 || move.col > 9) {
      return { valid: false, error: `Invalid col: ${move.col} (must be 1-9)` };
    }

    if (move.value < 1 || move.value > 9) {
      return {
        valid: false,
        error: `Invalid value: ${move.value} (must be 1-9)`,
      };
    }

    return { valid: true };
  }

  /**
   * Create empty move for error cases
   */
  private createEmptyMove(): LLMMove {
    return {
      row: 0,
      col: 0,
      value: 0,
      reasoning: '',
    };
  }
}
