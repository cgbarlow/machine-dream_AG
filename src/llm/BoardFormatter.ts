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
 * Formats Sudoku grids with box separators (supports 4x4, 9x9, 16x16, 25x25)
 */
export class BoardFormatter {
  /**
   * Format grid with box separators
   *
   * @param grid - NxN grid (0 = empty, 1-N = filled)
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

    const size = grid.length;
    const boxSize = Math.sqrt(size);

    let result = '';

    // Column labels (aligned with cells)
    if (showLabels) {
      result += '    '; // Indent for row label "N │"
      for (let col = 0; col < size; col++) {
        result += ` ${col + 1} `;
        if ((col + 1) % boxSize === 0 && col < size - 1) {
          result += ' '; // Space for box separator │
        }
      }
      result += '\n';
    }

    // Top border
    result += '  ┌' + this.buildHorizontalLine(size, boxSize) + '┐\n';

    for (let row = 0; row < size; row++) {
      // Row label
      if (showLabels) {
        result += `${row + 1} │`;
      } else {
        result += '│';
      }

      for (let col = 0; col < size; col++) {
        const value = grid[row][col];
        const isHighlighted =
          highlightCell &&
          highlightCell.row === row + 1 &&
          highlightCell.col === col + 1;

        // Format cell value (3 chars: space + value + space)
        let cellStr: string;
        if (value === 0) {
          cellStr = ` ${emptyChar} `;
        } else if (isHighlighted) {
          cellStr = ` ${highlightColor}${value}\x1b[0m `;
        } else {
          cellStr = ` ${value} `;
        }

        result += cellStr;

        // Box separators
        if ((col + 1) % boxSize === 0 && col < size - 1) {
          result += '│';
        } else if (col === size - 1) {
          result += '│\n';
        }
      }

      // Row separators between boxes
      if ((row + 1) % boxSize === 0 && row < size - 1) {
        result += '  ├' + this.buildHorizontalLine(size, boxSize) + '┤\n';
      }
    }

    // Bottom border
    result += '  └' + this.buildHorizontalLine(size, boxSize) + '┘';
    return result;
  }

  /**
   * Build horizontal line for grid borders
   * Each cell is 3 chars wide, box separators are 1 char
   */
  private static buildHorizontalLine(size: number, boxSize: number): string {
    let line = '';
    for (let i = 0; i < size; i++) {
      line += '───'; // 3 dashes per cell
      if ((i + 1) % boxSize === 0 && i < size - 1) {
        line += '┼'; // Box separator
      }
    }
    return line;
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
