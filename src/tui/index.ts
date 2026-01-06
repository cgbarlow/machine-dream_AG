/**
 * TUI Public API
 *
 * Exports the TUI application and supporting types.
 */

export { TUIApplication } from './TUIApplication';
export * from './types';
export { OutputManager } from './services/OutputManager';
export { ThemeManager } from './services/ThemeManager';
export { CLIExecutor } from './services/CLIExecutor';

// Utility exports
export { detectTerminalCapabilities } from './utils/terminalDetect';
export { getTextWidth, formatMenuItem } from './utils/textAlign';
export { getBoxChars } from './utils/boxDrawing';
