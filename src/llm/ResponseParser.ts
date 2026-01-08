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
   *
   * Strategy: Find the LAST complete set of ROW/COL/VALUE that appear together
   * This prevents extracting mid-thought values during LLM's reasoning process
   */
  private extractMove(text: string): LLMMove | null {
    // Find all matches for each field
    const rowMatches = Array.from(text.matchAll(/ROW:\s*(\d+)/gi));
    const colMatches = Array.from(text.matchAll(/COL(?:UMN)?:\s*(\d+)/gi));
    const valueMatches = Array.from(text.matchAll(/VALUE:\s*(\d+)/gi));

    if (rowMatches.length === 0 || colMatches.length === 0 || valueMatches.length === 0) {
      return null;
    }

    // Find the last complete set where all three appear within 200 characters of each other
    // Start from the end and work backwards to prefer final decision over mid-thought
    for (let i = rowMatches.length - 1; i >= 0; i--) {
      const rowMatch = rowMatches[i];
      const rowPos = rowMatch.index!;

      // Find COL and VALUE that are near this ROW (within 200 chars after)
      const nearbyCol = colMatches.find(m =>
        m.index! >= rowPos && m.index! <= rowPos + 200
      );
      const nearbyValue = valueMatches.find(m =>
        m.index! >= rowPos && m.index! <= rowPos + 200
      );

      if (nearbyCol && nearbyValue) {
        // Found a complete set - extract reasoning if present
        const reasoningMatch = text.slice(rowPos).match(/REASONING:\s*(.+?)(?=\n\n|$)/is);

        return {
          row: parseInt(rowMatch[1], 10),
          col: parseInt(nearbyCol[1], 10),
          value: parseInt(nearbyValue[1], 10),
          reasoning: reasoningMatch ? reasoningMatch[1].trim() : 'No reasoning provided',
        };
      }
    }

    // Fallback: if no complete set found within proximity, use first occurrence of each
    // (This handles edge cases where format is non-standard but still parseable)
    const reasoningMatch = text.match(/REASONING:\s*(.+?)(?=\n\n|$)/is);

    return {
      row: parseInt(rowMatches[0][1], 10),
      col: parseInt(colMatches[0][1], 10),
      value: parseInt(valueMatches[0][1], 10),
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
