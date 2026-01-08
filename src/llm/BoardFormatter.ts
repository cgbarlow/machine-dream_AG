/**
 * Board Formatter - Shared utility for displaying Sudoku grids
 *
 * Extracted from PromptBuilder to follow DRY principle
 * Used by: PromptBuilder, CLI commands, TUI
 */

export interface FormatOptions {
  /** Highlight a specific cell (1-indexed) */
  highlightCell?: { row: number; col: number };
  /** Color for highlighted cell (ANSI escape code) */
  highlightColor?: string;
  /** Show row/column numbers */
  showLabels?: boolean;
  /** Character to use for empty cells (default: '.') */
  emptyChar?: string;
}

/**
 * Board Formatter
 *
 * Formats 9x9 Sudoku grids with box separators
 */
export class BoardFormatter {
  /**
   * Format 9x9 grid with box separators
   *
   * @param grid - 9x9 grid (0 = empty, 1-9 = filled)
   * @param options - Formatting options
   * @returns Formatted grid string
   */
  static format(grid: number[][], options: FormatOptions = {}): string {
    const {
      highlightCell,
      highlightColor = '\x1b[32m', // Green by default
      showLabels = true,
      emptyChar = '.'
    } = options;

    let result = '';

    // Column labels
    if (showLabels) {
      result += '    1 2 3   4 5 6   7 8 9\n';
    }

    result += '  ┌───────┬───────┬───────┐\n';

    for (let row = 0; row < 9; row++) {
      // Row label
      if (showLabels) {
        result += `${row + 1} │`;
      } else {
        result += '│';
      }

      for (let col = 0; col < 9; col++) {
        const value = grid[row][col];
        const isHighlighted =
          highlightCell &&
          highlightCell.row === row + 1 &&
          highlightCell.col === col + 1;

        // Format cell value
        let cellStr: string;
        if (value === 0) {
          cellStr = ` ${emptyChar}`;
        } else if (isHighlighted) {
          cellStr = ` ${highlightColor}${value}\x1b[0m`; // Colored
        } else {
          cellStr = ` ${value}`;
        }

        result += cellStr;

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
   * Format grid for LLM prompts (no ANSI colors, underscore for empty cells)
   */
  static formatForPrompt(grid: number[][]): string {
    return this.format(grid, { showLabels: true, emptyChar: '_' });
  }

  /**
   * Format grid for CLI display with highlighting
   */
  static formatForCLI(
    grid: number[][],
    lastMove?: { row: number; col: number; value: number }
  ): string {
    return this.format(grid, {
      showLabels: true,
      highlightCell: lastMove ? { row: lastMove.row, col: lastMove.col } : undefined,
      highlightColor: '\x1b[32m' // Green
    });
  }

  /**
   * Count empty cells in grid
   */
  static countEmptyCells(grid: number[][]): number {
    return grid.flat().filter((cell) => cell === 0).length;
  }
}
