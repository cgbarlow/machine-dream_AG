/**
 * Text Alignment Utilities
 *
 * Provides accurate text width calculation and alignment for terminals.
 * Handles emoji, wide characters, and zero-width characters correctly.
 */

import stringWidth from 'string-width';
import stripAnsi from 'strip-ansi';

/**
 * Get the visual width of a string in terminal cells
 */
export function getTextWidth(text: string): number {
  return stringWidth(stripAnsi(text));
}

/**
 * Pad text to a specific width, accounting for emoji and wide characters
 */
export function padText(text: string, width: number, char = ' ', align: 'left' | 'right' | 'center' = 'left'): string {
  const currentWidth = getTextWidth(text);

  if (currentWidth >= width) {
    return text;
  }

  const paddingNeeded = width - currentWidth;

  switch (align) {
    case 'left':
      return text + char.repeat(paddingNeeded);

    case 'right':
      return char.repeat(paddingNeeded) + text;

    case 'center': {
      const leftPadding = Math.floor(paddingNeeded / 2);
      const rightPadding = paddingNeeded - leftPadding;
      return char.repeat(leftPadding) + text + char.repeat(rightPadding);
    }
  }
}

/**
 * Truncate text to fit within a specific width, adding ellipsis if needed
 */
export function truncateText(text: string, maxWidth: number, ellipsis = '...'): string {
  const currentWidth = getTextWidth(text);

  if (currentWidth <= maxWidth) {
    return text;
  }

  const ellipsisWidth = getTextWidth(ellipsis);
  const targetWidth = maxWidth - ellipsisWidth;

  // Binary search for the right truncation point
  let result = '';
  let width = 0;

  for (const char of text) {
    const charWidth = getTextWidth(char);
    if (width + charWidth > targetWidth) {
      break;
    }
    result += char;
    width += charWidth;
  }

  return result + ellipsis;
}

/**
 * Format a menu item with proper alignment for icon, label, and shortcut
 */
export function formatMenuItem(icon: string, label: string, shortcut: string): string {
  // Fixed column widths from spec
  const ICON_WIDTH = 4;   // emoji + space
  const LABEL_WIDTH = 14; // label text
  const SHORTCUT_WIDTH = 5; // [X] format

  const iconPadded = padText(icon, ICON_WIDTH, ' ', 'left');
  const labelPadded = padText(label, LABEL_WIDTH, ' ', 'left');
  const shortcutPadded = padText(shortcut, SHORTCUT_WIDTH, ' ', 'left');

  return iconPadded + labelPadded + shortcutPadded;
}

/**
 * Align columns in a table row
 */
export function alignColumns(values: string[], widths: number[], aligns: ('left' | 'right' | 'center')[]): string {
  return values
    .map((value, i) => padText(value, widths[i], ' ', aligns[i] || 'left'))
    .join(' ');
}

/**
 * Word wrap text to fit within a specific width
 */
export function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = getTextWidth(testLine);

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}
