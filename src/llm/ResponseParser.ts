/**
 * Response Parser - Extracts moves from LLM output
 * Specification: docs/specs/11-llm-sudoku-player.md
 * Specification: docs/specs/16-aisp-mode-spec.md
 */

import type { LLMMove, LLMResponse } from './types.js';

/**
 * Response Parser
 *
 * Spec 11: Parses LLM response to extract:
 * - ROW: 1-N (depends on grid size)
 * - COL: 1-N (depends on grid size)
 * - VALUE: 1-N (depends on grid size)
 * - REASONING: step-by-step analysis
 *
 * Spec 16: Also parses AISP move format:
 * - ⟦Ε:Move⟧{(r,c,v)⊢proof}
 *
 * Supports variable grid sizes (4x4, 9x9, 16x16, 25x25)
 */
export class ResponseParser {
  /**
   * Parse LLM response into structured move
   *
   * Expected formats:
   *
   * Standard format:
   * ROW: <number>
   * COL: <number>
   * VALUE: <number>
   * REASONING: <text>
   *
   * AISP format (Spec 16):
   * ⟦Ε:Move⟧{(r,c,v)⊢proof}
   *
   * @param rawResponse - Raw LLM response text
   * @param gridSize - Grid size for validation (default: 9)
   */
  parse(rawResponse: string, gridSize: number = 9): LLMResponse {
    try {
      // Spec 16: Try AISP format first if response contains AISP markers
      let move: LLMMove | null = null;

      if (rawResponse.includes('⟦Ε:Move⟧') || rawResponse.includes('⟦Ε:')) {
        move = this.extractAISPMove(rawResponse);
      }

      // Fall back to standard format if AISP parsing failed
      if (!move) {
        move = this.extractMove(rawResponse);
      }

      if (!move) {
        return {
          move: this.createEmptyMove(),
          rawResponse,
          parseSuccess: false,
          parseError: 'Could not extract move from response (tried AISP and standard formats)',
        };
      }

      // Validate extracted values against grid size
      const validation = this.validateMove(move, gridSize);
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
   * Extract move from AISP format
   *
   * Spec 16: Parses AISP move format:
   * ⟦Ε:Move⟧{(r,c,v)⊢proof}
   *
   * Also handles the format where analysis precedes the move:
   * ⟦Σ:Analysis⟧{...}⟦Ε:Move⟧{(r,c,v)⊢...}
   */
  private extractAISPMove(text: string): LLMMove | null {
    // Pattern 1: ⟦Ε:Move⟧{(r,c,v)⊢...}
    // Matches: (1,1,2)⊢∧(row_missing=2)∧(col_missing=2)∧(box_missing=2)
    const moveBlockPattern = /⟦Ε:Move⟧\{\s*\((\d+),(\d+),(\d+)\)⊢([^}]*)\}/;
    const moveMatch = text.match(moveBlockPattern);

    if (moveMatch) {
      return {
        row: parseInt(moveMatch[1], 10),
        col: parseInt(moveMatch[2], 10),
        value: parseInt(moveMatch[3], 10),
        reasoning: this.formatAISPReasoning(moveMatch[4], text),
      };
    }

    // Pattern 2: Just (r,c,v)⊢ without the block wrapper
    const simpleMovePattern = /\((\d+),(\d+),(\d+)\)⊢([^\n⟦}]*)/;
    const simpleMatch = text.match(simpleMovePattern);

    if (simpleMatch) {
      return {
        row: parseInt(simpleMatch[1], 10),
        col: parseInt(simpleMatch[2], 10),
        value: parseInt(simpleMatch[3], 10),
        reasoning: this.formatAISPReasoning(simpleMatch[4], text),
      };
    }

    // Pattern 3: ⟦Ε:...⟧{...} with embedded (r,c,v)
    const genericBlockPattern = /⟦Ε:[^⟧]*⟧\{[^}]*\((\d+),(\d+),(\d+)\)[^}]*\}/;
    const genericMatch = text.match(genericBlockPattern);

    if (genericMatch) {
      return {
        row: parseInt(genericMatch[1], 10),
        col: parseInt(genericMatch[2], 10),
        value: parseInt(genericMatch[3], 10),
        reasoning: this.extractAISPAnalysis(text),
      };
    }

    return null;
  }

  /**
   * Format AISP reasoning/proof into readable form
   */
  private formatAISPReasoning(proof: string, fullText: string): string {
    // Include analysis block if present
    const analysis = this.extractAISPAnalysis(fullText);
    if (analysis) {
      return `${analysis} | Proof: ${proof.trim()}`;
    }
    return proof.trim() || 'AISP proof';
  }

  /**
   * Extract analysis from AISP ⟦Σ:Analysis⟧ block
   */
  private extractAISPAnalysis(text: string): string {
    // Find the first analysis block that corresponds to the first move
    const analysisPattern = /⟦Σ:Analysis⟧\{([^}]+)\}/;
    const match = text.match(analysisPattern);

    if (match) {
      // Extract key info: cell, candidates
      const cellMatch = match[1].match(/cell[≜≔]\((\d+),(\d+)\)/);
      const candidatesMatch = match[1].match(/candidates[≜≔]\{([^}]+)\}/);

      if (cellMatch && candidatesMatch) {
        return `Cell (${cellMatch[1]},${cellMatch[2]}) candidates={${candidatesMatch[1]}}`;
      }
      return match[1].replace(/\s+/g, ' ').trim();
    }
    return '';
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
   * Validate extracted move values against grid size
   */
  private validateMove(move: LLMMove, gridSize: number): { valid: boolean; error?: string } {
    if (move.row < 1 || move.row > gridSize) {
      return { valid: false, error: `Invalid row: ${move.row} (must be 1-${gridSize})` };
    }

    if (move.col < 1 || move.col > gridSize) {
      return { valid: false, error: `Invalid col: ${move.col} (must be 1-${gridSize})` };
    }

    if (move.value < 1 || move.value > gridSize) {
      return {
        valid: false,
        error: `Invalid value: ${move.value} (must be 1-${gridSize})`,
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
