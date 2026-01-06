/**
 * Terminal Detection Utilities
 *
 * Detects terminal capabilities and environment for proper TUI rendering.
 */

import { existsSync } from 'fs';
import { TerminalCapabilities } from '../types';

export function detectTerminalCapabilities(): TerminalCapabilities {
  const isCI = Boolean(
    process.env.CI ||
    process.env.GITHUB_ACTIONS ||
    process.env.TRAVIS ||
    process.env.CIRCLECI
  );

  const isDocker = existsSync('/.dockerenv');
  const isTTY = Boolean(process.stdout.isTTY);
  const isWSL = Boolean(process.env.WSL_DISTRO_NAME);
  const isVSCode = process.env.TERM_PROGRAM === 'vscode';
  const isITerm = process.env.TERM_PROGRAM === 'iTerm.app';
  const isWindowsTerminal = Boolean(process.env.WT_SESSION);
  const isSSH = Boolean(process.env.SSH_TTY || process.env.SSH_CONNECTION);

  // Check for UTF-8 locale support
  const locale = process.env.LANG || process.env.LC_ALL || '';
  const hasUTF8Locale = locale.toLowerCase().includes('utf-8') || locale.toLowerCase().includes('utf8');

  // Determine color depth
  let colorDepth: 16 | 256 | 16777216 = 16;
  if (isTTY && !isCI) {
    if (process.stdout.getColorDepth) {
      const depth = process.stdout.getColorDepth();
      if (depth >= 24) {
        colorDepth = 16777216; // Truecolor
      } else if (depth >= 8) {
        colorDepth = 256;
      }
    } else if (process.env.COLORTERM === 'truecolor') {
      colorDepth = 16777216;
    } else if (process.env.TERM?.includes('256')) {
      colorDepth = 256;
    }
  }

  return {
    supportsUnicode: !isCI && !isDocker && hasUTF8Locale && isTTY,
    supportsColor: isTTY && !isCI,
    colorDepth,
    supportsMouse: isTTY && !isCI && !isDocker && (isVSCode || isITerm || isWindowsTerminal || isWSL || isSSH),
    supportsKeyboard: isTTY,
    isHeadless: isCI || isDocker || !isTTY,
    columns: process.stdout.columns || 80,
    rows: process.stdout.rows || 24
  };
}

export function getTerminalName(): string {
  if (process.env.TERM_PROGRAM) {
    return process.env.TERM_PROGRAM;
  }
  if (process.env.TERM) {
    return process.env.TERM;
  }
  return 'unknown';
}

export function validateTerminalEnvironment(caps: TerminalCapabilities): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Minimum dimensions check
  if (caps.columns < 80) {
    warnings.push(`Terminal width (${caps.columns}) is less than recommended 80 columns`);
  }
  if (caps.rows < 24) {
    warnings.push(`Terminal height (${caps.rows}) is less than recommended 24 rows`);
  }

  // Headless mode warning
  if (caps.isHeadless) {
    warnings.push('Running in headless mode (CI/Docker) - interactive features disabled');
  }

  // Unicode support
  if (!caps.supportsUnicode) {
    warnings.push('Unicode not supported - falling back to ASCII characters');
  }

  // Color support
  if (!caps.supportsColor) {
    warnings.push('Color not supported - using monochrome display');
  }

  // Mouse support
  if (!caps.supportsMouse) {
    warnings.push('Mouse not supported - keyboard navigation only');
  }

  // Fatal error: no keyboard
  if (!caps.supportsKeyboard) {
    errors.push('Keyboard input not available - cannot run TUI');
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors
  };
}
