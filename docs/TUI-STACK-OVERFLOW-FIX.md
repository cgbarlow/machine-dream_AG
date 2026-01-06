# TUI Stack Overflow Fix

## Error Analysis

**Your WSL error**: `RangeError: Maximum call stack size exceeded`

This is the **SAME** error we encountered in CI/Docker, but it's **NOT expected for WSL** since WSL has proper TTY support.

### Stack Trace Details:
```
SyntaxError: Invalid regular expression: /^{escape}/: Stack overflow
    at Element._parseTags (/node_modules/blessed/lib/widgets/element.js:436:36)
    at Element.render (/node_modules/blessed/lib/widgets/element.js:1839:8)
```

## Root Cause

The issue was **nested blessed tags and excessive formatting** in our screen content overwhelming blessed.js's tag parser.

### Example of Problematic Code:
```javascript
// ❌ BAD - Nested tags cause infinite recursion
{bold}Quick Start{/bold}
  1. Press {bold}S{/bold} to solve a puzzle  // {bold} inside bold context!

// ❌ BAD - Complex colored borders
{cyan-fg}═══════════════════════════════════════════════════════════════════{/cyan-fg}

// ❌ BAD - Emojis mixed with tags
  Memory System:  ✓ AgentDB (Ready)
```

### What Happened:
1. blessed.js's regex-based tag parser processes tags like `{bold}`, `{cyan-fg}`, etc.
2. When it encounters **nested tags** or **complex patterns with emojis**, the regex engine recurses
3. Stack depth exceeds limit → `Stack overflow` in the regex engine itself
4. This happens **before any of our code runs**, during `screenElement.render()`

## The Fix

Simplified all screen content to use **minimal formatting**:

```javascript
// ✅ GOOD - Simple ASCII borders
===================================================================
-------------------------------------------------------------------

// ✅ GOOD - No nested tags
Quick Start:
  1. Press [S] to solve a puzzle

// ✅ GOOD - Text indicators instead of emojis
  Memory System:  [OK] AgentDB (Ready)
```

### Changes Made:
- ✅ Removed all nested `{bold}` tags
- ✅ Replaced `{cyan-fg}` colored borders with plain ASCII
- ✅ Replaced emoji checkmarks (✓) with text `[OK]`
- ✅ Removed decorative emojis (📊, 🎮, 💤, ⚡)
- ✅ Kept minimal formatting: `{center}` and `{bold}` for headers only

## Testing Instructions

### For WSL (Your Environment):
```bash
# 1. Pull the latest changes
git pull

# 2. Rebuild
npm run build

# 3. Try launching TUI
npm run tui

# Or directly:
npx tsx src/tui/tui-bin.ts
```

### Expected Behavior:
- ✅ TUI should launch without stack overflow
- ✅ You should see a clean terminal interface with ASCII borders
- ✅ Menu navigation should work with arrow keys
- ✅ Content should be readable without excessive decoration

### If It Still Fails:
Check your terminal emulator:
- **Windows Terminal**: ✅ Should work
- **ConEmu**: ⚠️ May have issues
- **cmd.exe via WSL**: ❌ Limited support
- **Native Linux terminal in WSL**: ✅ Should work

Run with debug output to see what's happening:
```bash
TUI_DEBUG_OUTPUT=/tmp/tui-debug.jsonl npm run tui
```

## Technical Details

### blessed.js Limitations:
- Uses regex-based tag parsing (not a proper parser)
- Doesn't handle deeply nested tags well
- Emoji width calculations can cause issues
- UTF-8 box drawing characters are fragile

### Best Practices for blessed.js:
1. **Minimize tag nesting** - Use tags at top level only
2. **Avoid emojis in tagged content** - Emoji width is unpredictable
3. **Use ASCII for borders** - UTF-8 box drawing can fail
4. **Keep content simple** - Complex formatting = higher risk
5. **Test in target environment** - blessed.js behavior varies by terminal

## Files Modified

- `src/tui/screens/HomeScreen.ts` - Simplified Quick Start section
- `src/tui/screens/SystemScreen.ts` - Removed all emojis and nested tags
- `src/tui/screens/ExportScreen.ts` - Simplified formatting
- `src/tui/screens/ConfigScreen.ts` - Auto-simplified
- `src/tui/screens/DemoScreen.ts` - Auto-simplified
- `src/tui/screens/DreamScreen.ts` - Auto-simplified
- `src/tui/screens/BenchmarkScreen.ts` - Auto-simplified

## Commit History

- `37cfe43` - Fix blessed.js stack overflow - simplify screen content
- `5024e54` - Add headless mode safeguards for TUI (WIP)
- `91755a2` - Fix TUI headless mode support and StatusBar crash

## Next Steps

After confirming TUI works on your WSL:
1. Test all screens (Home, Solve, Memory, Dream, etc.)
2. Verify keyboard navigation works
3. Check that forms and input fields function
4. Report any remaining issues

If stack overflow persists, we may need to:
- Investigate alternative TUI libraries (ink, react-blessed)
- Add content length limits
- Implement progressive rendering
