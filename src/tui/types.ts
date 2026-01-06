/**
 * TUI Core Types and Interfaces
 *
 * Type definitions for the Machine Dream Terminal User Interface.
 */

// Types for TUI components

// ============================================================================
// Output Events (for testability)
// ============================================================================

export interface TUIOutputEvent {
  timestamp: number;
  eventType: 'render' | 'input' | 'navigation' | 'command' | 'state' | 'error';
  component: string;
  data: Record<string, unknown>;
}

// ============================================================================
// Terminal Capabilities
// ============================================================================

export interface TerminalCapabilities {
  supportsUnicode: boolean;
  supportsColor: boolean;
  colorDepth: 16 | 256 | 16777216; // 16, 256, or truecolor
  supportsMouse: boolean;
  supportsKeyboard: boolean;
  isHeadless: boolean; // CI/Docker
  columns: number;
  rows: number;
}

// ============================================================================
// TUI Configuration
// ============================================================================

export interface TUIConfig {
  sessionId?: string;
  theme?: 'dark' | 'light' | 'auto';
  mouseEnabled?: boolean;
  debugOutput?: string; // Path to event log file
  enableDebugOutput?: boolean;
  debugOutputPath?: string;
  headless?: boolean;
  dimensions?: { cols: number; rows: number };
  terminalCapabilities?: TerminalCapabilities;
}

export interface TUITheme {
  name: string;
  colors: {
    background: string;
    foreground: string;
    border: string;
    selected: string;
    focus: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };
  ui: {
    border: string;
    selectedBg: string;
    selectedFg: string;
    focusBorder: string;
  };
}

// ============================================================================
// Box Drawing Characters
// ============================================================================

export interface BoxCharacters {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  horizontal: string;
  vertical: string;
  verticalRight: string;
  verticalLeft: string;
  horizontalDown: string;
  horizontalUp: string;
}

// ============================================================================
// Component Props
// ============================================================================

export interface ComponentProps {
  id?: string;
  width?: string | number;
  height?: string | number;
  top?: string | number;
  left?: string | number;
  bottom?: string | number;
  right?: string | number;
  padding?: number | {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
  };
  margin?: number;
  border?: {
    type?: 'line' | 'bg';
    fg?: string;
    bg?: string;
  };
  style?: {
    fg?: string;
    bg?: string;
    bold?: boolean;
    underline?: boolean;
    inverse?: boolean;
    focus?: {
      fg?: string;
      bg?: string;
      border?: { fg?: string };
    };
  };
  label?: string;
  content?: string;
}

// ============================================================================
// Widget-Specific Props
// ============================================================================

export interface TextFieldProps extends ComponentProps {
  value?: string;
  placeholder?: string;
  password?: boolean;
  maxLength?: number;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}

export interface SelectProps extends ComponentProps {
  items: string[];
  selectedIndex?: number;
  onChange?: (value: string, index: number) => void;
}

export interface CheckboxProps extends ComponentProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

export interface ButtonProps extends ComponentProps {
  text: string;
  onClick?: () => void;
}

export interface TableProps extends ComponentProps {
  headers: string[];
  data: string[][];
  columnWidths?: number[];
  selectedRow?: number;
  onSelect?: (row: number) => void;
}

export interface ProgressBarProps extends ComponentProps {
  filled: number; // 0-100
  orientation?: 'horizontal' | 'vertical';
}

export interface SidebarProps extends ComponentProps {
  menuItems: MenuItem[];
  onSelect?: (item: MenuItem) => void;
}

export interface ContentAreaProps extends ComponentProps {
}

export interface StatusBarProps extends ComponentProps {
  sessionId?: string;
}

export interface HeaderProps extends ComponentProps {
  title?: string;
  subtitle?: string;
}

// ============================================================================
// Form Data Types
// ============================================================================

export interface SolveFormData {
  puzzleFile: string;
  sessionId?: string;
  memorySystem: 'agentdb' | 'reasoningbank';
  enableRL: boolean;
  maxIterations: number;
  outputFormat: 'json' | 'table';
}

export interface MemoryStoreFormData {
  key: string;
  value: string;
  namespace?: string;
  type?: string;
  ttl?: number;
}

export interface DreamFormData {
  sessionId?: string;
  cycleType?: string;
  sessions?: string;
  phases?: string;
  compressionRatio?: number;
  abstractionLevels?: number;
  dryRun?: boolean;
}

// ============================================================================
// CLI Execution
// ============================================================================

export interface CommandResult {
  success: boolean;
  data?: unknown;
  error?: Error;
  executionTime?: number;
}

export interface CommandProgressEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  command: string;
  percentage?: number;
  message?: string;
  data?: unknown;
}

export interface ExecutionCallbacks {
  onProgress?: (event: CommandProgressEvent) => void;
  onOutput?: (data: string) => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// Screen Names
// ============================================================================

export type ScreenName =
  | 'home'
  | 'solve'
  | 'memory'
  | 'dream'
  | 'benchmark'
  | 'demo'
  | 'config'
  | 'export'
  | 'system';

// ============================================================================
// Menu Items
// ============================================================================

export interface MenuItem {
  id?: string;
  icon: string;
  label: string;
  shortcut: string;
  description?: string;
  screen: ScreenName;
  children?: MenuItem[];
}

// ============================================================================
// Application State
// ============================================================================

export interface TUIState {
  currentScreen: ScreenName;
  previousScreen?: ScreenName;
  menuExpanded: boolean;
  commandPaletteOpen: boolean;
  sessionId: string;
  formValues: Record<string, any>;
  commandHistory: string[];
}
