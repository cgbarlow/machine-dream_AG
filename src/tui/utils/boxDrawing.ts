/**
 * Box Drawing Utilities
 *
 * Provides box drawing characters with fallbacks for limited terminals.
 */

import { BoxCharacters, TerminalCapabilities } from '../types';

/**
 * Unicode box drawing characters (default)
 */
export const UNICODE_BOX: BoxCharacters = {
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│',
  verticalRight: '├',
  verticalLeft: '┤',
  horizontalDown: '┬',
  horizontalUp: '┴'
};

/**
 * ASCII fallback box characters
 */
export const ASCII_BOX: BoxCharacters = {
  topLeft: '+',
  topRight: '+',
  bottomLeft: '+',
  bottomRight: '+',
  horizontal: '-',
  vertical: '|',
  verticalRight: '+',
  verticalLeft: '+',
  horizontalDown: '+',
  horizontalUp: '+'
};

/**
 * Get appropriate box characters based on terminal capabilities
 */
export function getBoxChars(caps: TerminalCapabilities): BoxCharacters {
  if (caps.supportsUnicode && !caps.isHeadless) {
    return UNICODE_BOX;
  }
  return ASCII_BOX;
}

/**
 * Draw a horizontal line
 */
export function drawHorizontalLine(width: number, chars: BoxCharacters): string {
  return chars.horizontal.repeat(width);
}

/**
 * Draw a box border
 */
export function drawBox(width: number, height: number, chars: BoxCharacters): string[] {
  const lines: string[] = [];

  // Top border
  lines.push(chars.topLeft + chars.horizontal.repeat(width - 2) + chars.topRight);

  // Middle rows
  for (let i = 0; i < height - 2; i++) {
    lines.push(chars.vertical + ' '.repeat(width - 2) + chars.vertical);
  }

  // Bottom border
  lines.push(chars.bottomLeft + chars.horizontal.repeat(width - 2) + chars.bottomRight);

  return lines;
}

/**
 * Draw a separator line within a box
 */
export function drawSeparator(width: number, chars: BoxCharacters): string {
  return chars.verticalRight + chars.horizontal.repeat(width - 2) + chars.verticalLeft;
}

/**
 * Draw a title bar with centered text
 */
export function drawTitleBar(title: string, width: number, chars: BoxCharacters): string {
  const titleWidth = title.length;
  const padding = Math.max(0, width - titleWidth - 4); // -4 for borders and spaces
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;

  return (
    chars.topLeft +
    chars.horizontal.repeat(leftPad) +
    ` ${title} ` +
    chars.horizontal.repeat(rightPad) +
    chars.topRight
  );
}
