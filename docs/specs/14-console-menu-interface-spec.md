# Machine Dream - Console Menu Interface Specification

**Component:** TUI Console & Help System
**Version:** 1.0.0
**Date:** January 6, 2026
**Status:** Specification-Ready
**Depends On:** Spec 10 (Terminal Menu Interface), Spec 09 (CLI Interface)

---

## 1. Executive Summary

This specification defines the Console Menu feature for the Machine Dream TUI - an integrated terminal console that captures and displays CLI output within the TUI interface, supports direct command entry, and provides context-sensitive help. This addresses the issue of CLI output escaping to the terminal above the TUI and the non-functional F1 help key (Ink library limitation).

### Key Features

- **Output Capture**: Intercept stdout/stderr and display within TUI
- **Direct Command Entry**: Type CLI commands directly in the console
- **Command History**: Navigate previous commands with up/down arrows
- **Dual Access**: Full-screen Console menu item + overlay toggle
- **Context-Sensitive Help**: `?` key for screen-specific help
- **Scrollable Buffer**: View up to 1000 lines of output history

### Problem Statement

**Current Issues:**
1. CLI output from backend operations sometimes escapes to terminal above TUI
2. F1 help key promised in UI but doesn't work (Ink doesn't support function keys)
3. No way to view captured output or enter commands without leaving TUI

**Solution:**
- Console screen and overlay for output display
- stdout/stderr interception service
- Help overlay with `?` key binding
- Full CLI command parser and executor

---

## 2. Access Methods

### 2.1 Console Screen (Menu Item)

**Navigation:**
- Menu Item: "Console" with `>` icon
- Keyboard Shortcut: `[T]` (for Terminal)
- Position: Menu item #13 (after System)

**Features:**
- Full-screen console interface
- Split view: scrollable output buffer (top 70%) + command input (bottom 30%)
- Focus switching with Tab key
- Maximum output visibility

### 2.2 Console Overlay (Quick Toggle)

**Navigation:**
- Keyboard Shortcut: Backtick (`` ` ``)
- Available from: Any screen

**Features:**
- Half-height overlay at bottom of screen
- Quick access without leaving current screen
- Same console functionality in compact form
- Press backtick again or Escape to close

### 2.3 Help Overlay

**Navigation:**
- Keyboard Shortcut: `?` (question mark)
- Available from: Any screen

**Features:**
- Context-sensitive help based on current screen
- Lists keyboard shortcuts for active screen
- Feature descriptions and examples
- Press `?` again or Escape to close

---

## 3. Console Features

### 3.1 Output Capture

**Architecture:**
- Intercept `process.stdout.write` at Node.js level
- Filter out Ink rendering escape codes (cursor positioning)
- Maintain circular buffer of last 1000 lines
- Publish-subscribe pattern for real-time updates

**Captured Sources:**
- `console.log()`, `console.error()`, `console.warn()`
- Backend operations (SystemOrchestrator, LLMController, etc.)
- CLI command execution output
- System messages and errors

**Not Captured:**
- Ink framework rendering output (escape sequences starting with `\x1b[`)
- Raw stdin/stdout from child processes (not used in current architecture)

### 3.2 Output Buffer Display

**Visual Design:**
```
┌─ Console Output ──────────────────────────────────────┐
│ [12:34:56.123] Starting solve operation...            │
│ [12:34:56.456] Loaded puzzle: easy-01.json            │
│ [12:34:57.789] Iteration 1: 45 cells filled           │
│ [12:34:58.012] Strategy: NakedSingles                 │
│ ...                                                    │
│ [12:35:10.345] Solve complete! 81 cells filled        │
│                                                        │
│ (↑↓ to scroll, showing lines 990-1000 of 1000)        │
└────────────────────────────────────────────────────────┘
```

**Features:**
- Timestamps on each line (HH:MM:SS.mmm format)
- Auto-scroll to bottom on new output
- Manual scroll with arrow keys (when focused)
- Line numbers shown when scrolled away from bottom
- Dimmed text for older entries

### 3.3 Command Input

**Visual Design:**
```
┌─ Command Input ───────────────────────────────────────┐
│ > solve puzzles/easy-01.json --memory                  │
│                                                        │
│ Press Enter to execute, ↑↓ for history, Tab to switch │
└────────────────────────────────────────────────────────┘
```

**Features:**
- Prompt prefix: `> `
- Real-time input display
- Command history navigation (up/down arrows)
- History persistence across sessions
- Enter key to execute
- Escape to clear input

### 3.4 Command History

**Storage:**
- File: `.machine-dream-tui-history.json` in user home directory
- Format: JSON array of command strings
- Max entries: 100 most recent commands
- Auto-save after each command

**Navigation:**
- Up arrow: Previous command
- Down arrow: Next command (or empty if at end)
- Circular navigation: wrap at boundaries
- Current input preserved when navigating

---

## 4. Supported Commands

### 4.1 Command Format

```
<command> [subcommand] [args...] [--options]
```

### 4.2 Command Reference Table

| Command | Subcommand | Arguments | Description | Maps To |
|---------|------------|-----------|-------------|---------|
| `solve` | - | `<file>` | Solve puzzle from file | `CLIExecutor.executeSolve()` |
| `llm` | `play` | `<file>` | LLM plays puzzle | `CLIExecutor.executeLLMPlay()` |
| `llm` | `dream` | - | Run LLM dream cycle | `CLIExecutor.executeLLMDream()` |
| `llm` | `stats` | - | Show LLM statistics | `CLIExecutor.getLLMStats()` |
| `memory` | `list` | `[pattern]` | List memory entries | `CLIExecutor.memoryList()` |
| `memory` | `search` | `<query>` | Search memory | `CLIExecutor.memorySearch()` |
| `memory` | `stats` | - | Memory statistics | `CLIExecutor.getMemoryStats()` |
| `puzzle` | `generate` | `[difficulty]` | Generate new puzzle | `CLIExecutor.executePuzzleGenerate()` |
| `benchmark` | `run` | `[suite]` | Run benchmarks | `CLIExecutor.executeBenchmark()` |
| `config` | `show` | - | Show configuration | `CLIExecutor.getConfig()` |
| `config` | `set` | `<key> <value>` | Update config | `CLIExecutor.setConfig()` |
| `help` | - | `[command]` | Show command help | Internal |
| `clear` | - | - | Clear console output | Internal |

### 4.3 Command Options

**Global Options** (work with all commands):
- `--verbose` or `-v`: Verbose output
- `--quiet` or `-q`: Minimal output
- `--json`: JSON-formatted output

**Command-Specific Options:**
- `solve`: `--memory`, `--rl`, `--reflexion`, `--max-iterations=<n>`
- `llm play`: `--model=<name>`, `--max-moves=<n>`, `--memory`
- `puzzle generate`: `--seed=<n>`, `--difficulty=<easy|medium|hard>`

### 4.4 Example Commands

```bash
# Solve a puzzle with memory enabled
> solve puzzles/easy-01.json --memory

# LLM plays puzzle with specific model
> llm play puzzles/medium-01.json --model=qwen3-30b --max-moves=200

# Generate a hard puzzle with seed
> puzzle generate --difficulty=hard --seed=12345

# Search memory for patterns
> memory search "NakedSingle"

# Run full benchmark suite
> benchmark run --verbose

# Show help for specific command
> help solve
```

---

## 5. Component Specifications

### 5.1 OutputCapture Service

**File:** `src/tui-ink/services/OutputCapture.ts`

**Interface:**
```typescript
export class OutputCapture {
  // Singleton instance management
  private static instance: OutputCapture | null = null;
  private static originalWrite: typeof process.stdout.write;
  private static buffer: string[] = [];
  private static listeners: Set<(line: string) => void> = new Set();
  private static maxLines: number = 1000;
  private static isCapturing: boolean = false;

  // Public API
  static start(): void;
  static stop(): void;
  static subscribe(callback: (line: string) => void): () => void;
  static getBuffer(): string[];
  static clearBuffer(): void;
  static addLine(line: string): void;  // For manual additions
}
```

**Responsibilities:**
- Patch `process.stdout.write` to intercept output
- Filter Ink escape sequences (starts with `\x1b[` for cursor control)
- Maintain circular buffer with max 1000 lines
- Notify subscribers of new lines
- Restore original write on stop

**Edge Cases:**
- Multiline output: Split by `\n` and add each line separately
- Binary data: Convert Buffer to string with `.toString('utf8')`
- Concurrent writes: Handle race conditions with atomic buffer operations

### 5.2 useOutputCapture Hook

**File:** `src/tui-ink/hooks/useOutputCapture.ts`

**Interface:**
```typescript
export const useOutputCapture = (maxLines: number = 100): string[] => {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    // Subscribe to OutputCapture
    const unsubscribe = OutputCapture.subscribe((line) => {
      setLines(prev => [...prev.slice(-(maxLines - 1)), line]);
    });

    // Load initial buffer
    setLines(OutputCapture.getBuffer().slice(-maxLines));

    return unsubscribe;
  }, [maxLines]);

  return lines;
};
```

**Responsibilities:**
- React hook wrapper for OutputCapture
- Manage component-level line state
- Handle subscription lifecycle
- Limit lines to component-specific max

### 5.3 OutputBuffer Component

**File:** `src/tui-ink/components/console/OutputBuffer.tsx`

**Interface:**
```typescript
interface OutputBufferProps {
  maxLines?: number;        // Default: 20
  height?: number | string; // Default: '100%'
  isFocused?: boolean;      // Enable scrolling when focused
}

export const OutputBuffer: React.FC<OutputBufferProps>;
```

**Visual Specification:**
```
┌─ Output ──────────────────────────────────────────────┐
│ [timestamp] line content here                         │
│ [timestamp] another line                              │
│ ...                                                   │
│                                                       │
│ (showing 90-100 of 350 lines, ↑↓ to scroll)          │
└───────────────────────────────────────────────────────┘
```

**Features:**
- Uses `useOutputCapture` hook
- Scrolling state when focused
- Auto-scroll to bottom on new lines (unless manually scrolled up)
- Scroll position indicator
- Timestamps in dimmed color
- Line highlighting for errors (red) and warnings (yellow)

**Keyboard Navigation (when focused):**
- Up arrow: Scroll up 1 line
- Down arrow: Scroll down 1 line
- Page Up: Scroll up 10 lines
- Page Down: Scroll down 10 lines
- Home: Jump to top
- End: Jump to bottom

### 5.4 CommandInput Component

**File:** `src/tui-ink/components/console/CommandInput.tsx`

**Interface:**
```typescript
interface CommandInputProps {
  onSubmit: (command: string) => void;
  isFocused?: boolean;
  placeholder?: string;
}

export const CommandInput: React.FC<CommandInputProps>;
```

**Visual Specification:**
```
┌─ Command ─────────────────────────────────────────────┐
│ > solve puzzles/easy-01.json_                         │
│                                                       │
│ Enter to execute, ↑↓ for history, Esc to clear       │
└───────────────────────────────────────────────────────┘
```

**Features:**
- Prompt prefix: `> ` in cyan color
- Blinking cursor when focused
- Command history from `.machine-dream-tui-history.json`
- Real-time input validation (show red for unknown commands)
- Autocomplete suggestions (optional future enhancement)

**Keyboard Navigation (when focused):**
- Enter: Execute command
- Escape: Clear input
- Up arrow: Previous command in history
- Down arrow: Next command in history
- Ctrl+U: Clear input
- Ctrl+A: Jump to start
- Ctrl+E: Jump to end

### 5.5 ConsolePanel Component

**File:** `src/tui-ink/components/console/ConsolePanel.tsx`

**Interface:**
```typescript
interface ConsolePanelProps {
  title?: string;
  maxOutputLines?: number;
  showInput?: boolean;
  onCommand?: (command: string) => void;
  height?: number | string;
}

export const ConsolePanel: React.FC<ConsolePanelProps>;
```

**Layout:**
```
┌─ Console ─────────────────────────────────────────────┐
│                                                       │
│  Output Buffer (70% height)                          │
│                                                       │
├───────────────────────────────────────────────────────┤
│                                                       │
│  Command Input (30% height)                          │
│                                                       │
└───────────────────────────────────────────────────────┘
```

**Features:**
- Combines OutputBuffer + CommandInput
- Manages focus state between components
- Tab to switch focus (output ↔ input)
- Reusable in both screen and overlay contexts
- Optional title bar

**Focus Management:**
- Only one component focused at a time
- Tab cycles focus: output → input → output
- Arrow keys work in focused component only

### 5.6 CommandParser Service

**File:** `src/tui-ink/services/CommandParser.ts`

**Interface:**
```typescript
export interface ParsedCommand {
  command: string;
  subcommand?: string;
  args: string[];
  options: Record<string, string | boolean>;
}

export class CommandParser {
  static parse(input: string): ParsedCommand;
  static async execute(
    parsed: ParsedCommand,
    onProgress: ProgressCallback
  ): Promise<void>;
  static getAvailableCommands(): string[];
  static getCommandHelp(command: string): string;
}
```

**Parsing Rules:**
- Split by spaces (respecting quotes: `"file with spaces.json"`)
- First token: command
- Second token (if no `--`): subcommand
- Tokens starting with `--`: options (boolean or `--key=value`)
- Remaining tokens: positional arguments

**Example Parsing:**
```typescript
// Input: 'solve puzzles/easy-01.json --memory --max-iterations=100'
{
  command: 'solve',
  subcommand: undefined,
  args: ['puzzles/easy-01.json'],
  options: { memory: true, 'max-iterations': '100' }
}

// Input: 'llm play puzzles/test.json --model=qwen3-30b'
{
  command: 'llm',
  subcommand: 'play',
  args: ['puzzles/test.json'],
  options: { model: 'qwen3-30b' }
}
```

**Execution:**
- Route to appropriate `CLIExecutor` method
- Convert options to method parameters
- Pass progress callback for real-time updates
- Handle errors and display in console

---

## 6. Screen and Overlay Implementations

### 6.1 ConsoleScreen

**File:** `src/tui-ink/screens/ConsoleScreen.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Header: Machine Dream AG > Console                    │
├─────────────────────────────────────────────────────────┤
│ ┌─ Output ───────────────┐  ┌─ Info ─────────────────┐ │
│ │                        │  │ Available Commands:    │ │
│ │ [12:34:56] ...         │  │                        │ │
│ │ [12:34:57] ...         │  │ • solve <file>         │ │
│ │ ...                    │  │ • llm play <file>      │ │
│ │                        │  │ • memory list          │ │
│ │ (70% height)           │  │ • help [command]       │ │
│ │                        │  │                        │ │
│ └────────────────────────┘  │ Quick Tips:            │ │
│ ┌─ Command ──────────────┐  │ • ↑↓ for history       │ │
│ │ > _                    │  │ • Tab to switch focus  │ │
│ │                        │  │ • ? for help overlay   │ │
│ │ (30% height)           │  └────────────────────────┘ │
│ └────────────────────────┘                             │
├─────────────────────────────────────────────────────────┤
│ Status: Console | [?] Help | [`] Toggle Overlay       │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Full-screen console with info sidebar
- Shows available commands and tips
- Tab switches focus between output and input
- Escape returns to menu (sets selectedIndex back)

### 6.2 ConsoleOverlay

**File:** `src/tui-ink/components/overlays/ConsoleOverlay.tsx`

**Layout:**
```
[Current screen content above]
───────────────────────────────────────────────────────────
┌─ Console (`) ──────────────────────────────────────────┐
│                                                        │
│  Output Buffer (compact, last 10 lines)               │
│                                                        │
├────────────────────────────────────────────────────────┤
│  > command input_                                      │
│                                                        │
│  ` or Esc to close | Enter to execute                 │
└────────────────────────────────────────────────────────┘
```

**Features:**
- Half-height overlay at bottom
- Renders on top of current screen
- Transparent/dimmed background
- Same ConsolePanel functionality
- Backtick or Escape to close

**Keyboard Handling:**
- Backtick: Toggle overlay (open/close)
- Escape: Close overlay
- All other keys routed to ConsolePanel when open

### 6.3 HelpOverlay

**File:** `src/tui-ink/components/overlays/HelpOverlay.tsx`

**Layout:**
```
┌─ Help (?) ─────────────────────────────────────────────┐
│                                                        │
│  Current Screen: Solve Puzzle                         │
│                                                        │
│  Keyboard Shortcuts:                                  │
│  • Tab       - Navigate form fields                   │
│  • Enter     - Execute solve                          │
│  • Space     - Toggle checkbox                        │
│  • Escape    - Return to menu                         │
│  • ?         - Show this help                         │
│  • `         - Toggle console                         │
│                                                        │
│  Features:                                             │
│  • Configure puzzle solving parameters                │
│  • Enable memory system for learning                  │
│  • Real-time progress visualization                   │
│  • Grid and metrics display                           │
│                                                        │
│  ? or Esc to close                                    │
└────────────────────────────────────────────────────────┘
```

**Content Structure:**
```typescript
interface HelpSection {
  title: string;
  shortcuts: Array<{ key: string; action: string }>;
  features: string[];
  examples?: string[];
}

const helpContent: Record<string, HelpSection> = {
  Home: { ... },
  Solve: { ... },
  LLM: { ... },
  Memory: { ... },
  // ... for each screen
};
```

**Features:**
- Context-sensitive based on `currentScreen` prop
- Scrollable if content exceeds screen height
- Consistent styling with other overlays
- Quick reference for keyboard shortcuts

---

## 7. Keyboard Navigation Summary

### 7.1 Global Shortcuts (Any Screen)

| Key | Action |
|-----|--------|
| `` ` `` | Toggle console overlay |
| `?` | Show help overlay |
| `Escape` | Close overlay (if open) |
| `Ctrl+C` | Exit application |
| `q` | Exit application |
| `↑` / `↓` | Navigate menu |
| `[T]` | Jump to Console screen |
| `[H]` | Jump to Home screen |

### 7.2 Console Screen/Overlay

| Key | Action |
|-----|--------|
| `Tab` | Switch focus (output ↔ input) |
| `Enter` | Execute command (when in input) |
| `Escape` | Clear input / Close overlay |
| `↑` | Previous command (input) / Scroll up (output) |
| `↓` | Next command (input) / Scroll down (output) |
| `Ctrl+U` | Clear input line |
| `Home` | Jump to top (output) |
| `End` | Jump to bottom (output) |

### 7.3 Help Overlay

| Key | Action |
|-----|--------|
| `?` | Toggle help overlay |
| `Escape` | Close help overlay |
| `↑` / `↓` | Scroll help content |

---

## 8. Integration Points

### 8.1 App.tsx Modifications

**New State:**
```typescript
const [showConsoleOverlay, setShowConsoleOverlay] = useState(false);
const [showHelpOverlay, setShowHelpOverlay] = useState(false);
```

**New Menu Item:**
```typescript
{
  id: 'console',
  label: 'Console',
  icon: '>',
  shortcut: '[T]',
  screen: 'Console'
}
```

**Keyboard Handler Updates:**
```typescript
useInput((input, key) => {
  // ... existing handlers

  // Backtick toggles console overlay
  if (input === '`') {
    setShowConsoleOverlay(prev => !prev);
    return;
  }

  // ? toggles help overlay
  if (input === '?') {
    setShowHelpOverlay(prev => !prev);
    return;
  }

  // Escape closes overlays
  if (key.escape) {
    if (showConsoleOverlay) setShowConsoleOverlay(false);
    else if (showHelpOverlay) setShowHelpOverlay(false);
  }

  // Add 't' shortcut for console
  const shortcuts = { ...existing, t: 12 };
});
```

**Render Overlays:**
```tsx
<Box flexDirection="column" height="100%">
  {/* Existing layout */}
  <Header ... />
  <Box flexGrow={1}>
    <Sidebar ... />
    <Box flexGrow={1}>
      {renderScreen()}
    </Box>
  </Box>
  <StatusBar ... />

  {/* Overlays */}
  {showConsoleOverlay && (
    <ConsoleOverlay onClose={() => setShowConsoleOverlay(false)} />
  )}
  {showHelpOverlay && (
    <HelpOverlay
      screen={menuItems[selectedIndex].screen}
      onClose={() => setShowHelpOverlay(false)}
    />
  )}
</Box>
```

**OutputCapture Initialization:**
```typescript
useEffect(() => {
  OutputCapture.start();
  return () => OutputCapture.stop();
}, []);
```

### 8.2 StatusBar Updates

**Change Line 37:**
```tsx
// Before:
<Text dimColor>F1: Help | Ctrl+C: Exit | Ctrl+R: Refresh</Text>

// After:
<Text dimColor>[?] Help | [`] Console | Ctrl+C: Exit</Text>
```

**Remove:** `Ctrl+R` (not implemented)

### 8.3 HomeScreen Updates

**Change Line 121:**
```tsx
// Before:
<Text color="gray">F1         </Text> - Show help

// After:
<Text color="gray">?          </Text> - Show help overlay
```

**Add after line 134:**
```tsx
<Text>
  <Text color="gray">`          </Text> - Toggle console
</Text>
```

### 8.4 CLIExecutor Integration

**Ensure all methods output via console.log:**
```typescript
// Example in executeSolve:
console.log(`[Solve] Starting puzzle: ${params.puzzleFile}`);
console.log(`[Solve] Iteration ${i}: ${cellsFilled} cells filled`);
console.error(`[Solve] Error: ${error.message}`);
```

**No changes needed** - CLIExecutor already uses console methods that will be captured.

---

## 9. Success Criteria

### 9.1 Functional Requirements

- [x] Console accessible via `[T]` menu item
- [x] Console overlay toggles with backtick (`` ` ``)
- [x] Help overlay toggles with `?` key
- [x] All stdout/stderr captured and displayed
- [x] No CLI output escapes to terminal above TUI
- [x] Direct command entry works for all documented commands
- [x] Command history saved and navigable
- [x] Scrollable output buffer (1000 lines)
- [x] Context-sensitive help for all screens
- [x] Tab switches focus in console
- [x] F1 references replaced with `?` in all documentation

### 9.2 Technical Requirements

- [x] OutputCapture service intercepts stdout without breaking Ink
- [x] Ink escape codes filtered correctly
- [x] CommandParser routes all commands to CLIExecutor
- [x] All React components follow Ink patterns (Box, Text, useInput)
- [x] TypeScript types defined for all interfaces
- [x] No console errors or warnings
- [x] History persists across sessions

### 9.3 User Experience Requirements

- [x] Console overlay doesn't block interaction with content above
- [x] Help content accurate and helpful for each screen
- [x] Keyboard shortcuts work consistently
- [x] Visual feedback for command execution (loading states)
- [x] Error messages displayed clearly in console
- [x] Smooth scrolling performance with 1000+ lines

---

## 10. Testing Requirements

### 10.1 Unit Tests

- `OutputCapture`: Interception, filtering, buffer management
- `CommandParser`: Parse various command formats, edge cases
- `useOutputCapture`: Subscription lifecycle, state updates

### 10.2 Integration Tests

- Console screen renders correctly
- Console overlay toggles on/off
- Help overlay shows correct content per screen
- Commands execute and output appears in console
- History saves and loads correctly

### 10.3 Manual Testing

- Test each command in command reference table
- Verify output doesn't escape TUI
- Test keyboard navigation in all contexts
- Verify help content accuracy for all screens
- Test with rapid output (stress test buffer)

---

## 11. Future Enhancements

### 11.1 Phase 2 Features (Optional)

- **Command Autocomplete**: Tab completion for commands and file paths
- **Syntax Highlighting**: Color-code command input based on validity
- **Output Filtering**: Filter console output by log level or pattern
- **Export Output**: Save console output to file
- **Clear Output**: Button/command to clear console buffer
- **Search in Output**: Ctrl+F to search console history
- **ANSI Color Support**: Render ANSI color codes in output
- **Command Aliases**: User-defined shortcuts for common commands

### 11.2 Advanced Features (Future)

- **Split Console**: Side-by-side console and content view
- **Multiple Consoles**: Separate consoles per operation
- **Output Piping**: Pipe command output to next command
- **Scripting Support**: Execute multi-line scripts
- **Remote Console**: Connect to remote Machine Dream instances

---

## Appendix A: Component Dependency Graph

```
App.tsx
├── ConsoleScreen
│   └── ConsolePanel
│       ├── OutputBuffer
│       │   └── useOutputCapture
│       │       └── OutputCapture (service)
│       └── CommandInput
│           └── CommandParser (service)
├── ConsoleOverlay
│   └── ConsolePanel (same as above)
└── HelpOverlay
    └── Static help content
```

---

## Appendix B: File Locations

**New Files:**
- `src/tui-ink/services/OutputCapture.ts`
- `src/tui-ink/services/CommandParser.ts`
- `src/tui-ink/hooks/useOutputCapture.ts`
- `src/tui-ink/components/console/OutputBuffer.tsx`
- `src/tui-ink/components/console/CommandInput.tsx`
- `src/tui-ink/components/console/ConsolePanel.tsx`
- `src/tui-ink/components/overlays/ConsoleOverlay.tsx`
- `src/tui-ink/components/overlays/HelpOverlay.tsx`
- `src/tui-ink/screens/ConsoleScreen.tsx`

**Modified Files:**
- `src/tui-ink/App.tsx` (overlays, menu item, keyboard handlers)
- `src/tui-ink/components/StatusBar.tsx` (update help shortcut)
- `src/tui-ink/screens/HomeScreen.tsx` (update keyboard shortcuts list)

---

## Appendix C: Related Specifications

- **Spec 09**: CLI Interface - Command-line interface that console integrates with
- **Spec 10**: Terminal Menu Interface - Main TUI architecture
- **Spec 11**: LLM Sudoku Player - LLM commands accessible via console
- **Spec 12**: Randomized Puzzle Generation - Puzzle generation commands
- **Spec 13**: LLM Profile Management - Model profile commands

---

**End of Specification**
