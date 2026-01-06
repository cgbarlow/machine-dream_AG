# ink TUI Proof-of-Concept

**Status:** 🧪 Testing
**Goal:** Validate that ink works on Node.js v24 + WSL where blessed/neo-blessed fails

---

## What is This?

This directory contains a proof-of-concept TUI implementation using **ink** (the same framework Claude Code uses).

We're testing this because:
- ❌ blessed.js v0.1.81 has stack overflow on Node.js v24 + WSL
- ❌ neo-blessed v0.2.0 has the SAME stack overflow (same codebase)
- ✅ Claude Code uses ink and works perfectly in this environment

---

## Quick Test

```bash
# Run the POC
npm run tui:poc

# Or directly
npx tsx src/tui-ink/poc.tsx
```

**Expected result:**
- ✅ TUI launches without stack overflow
- ✅ HomeScreen renders with colors and borders
- ✅ Clean, modern interface
- ✅ Exit cleanly with Ctrl+C

**If this works, we'll migrate the entire TUI to ink.**

---

## What's Included

- **screens/HomeScreen.tsx** - Simple React component demonstrating ink features
- **poc.tsx** - Entry point that renders the screen

---

## ink vs blessed Comparison

| Feature | blessed/neo-blessed | ink |
|---------|---------------------|-----|
| **API** | Imperative (DOM-like) | Declarative (React) |
| **Rendering** | Regex-based tag parsing | React Virtual DOM |
| **Node.js v24** | ❌ Stack overflow | ✅ Works |
| **WSL** | ❌ Incompatible | ✅ Compatible |
| **Maintenance** | Abandoned (2016) | Active (2025) |
| **Testing** | Manual | React Testing Library |
| **Learning Curve** | High (custom API) | Low (React knowledge) |

---

## Next Steps

**If POC succeeds:**
1. ✅ Validate ink works on target environment
2. 📋 Plan full migration
3. 🔨 Migrate all 9 screens to React components
4. 🧪 Test thoroughly
5. 🚀 Replace blessed-based TUI

**If POC fails:**
- Investigate error (unlikely - Claude Code uses ink successfully)
- Consider alternative approaches

---

## Code Example

```tsx
import React from 'react';
import { Box, Text } from 'ink';

export const HomeScreen: React.FC = () => (
  <Box flexDirection="column" padding={1}>
    <Text bold color="cyan">Welcome to Machine Dream</Text>
    <Text>Press S to solve a puzzle</Text>
  </Box>
);
```

Clean, simple, React-based. No regex nightmares.

---

## Technical Notes

**Why ink works when blessed doesn't:**
- **No regex tag parsing** - ink uses React's virtual DOM
- **Modern architecture** - Built for Node.js v14+
- **Active maintenance** - Updated weekly
- **Production-proven** - Used by Claude Code, Gatsby, Yarn 2, etc.

**Performance:**
- Lighter than blessed (~200KB vs ~500KB)
- Faster rendering (virtual DOM optimizations)
- Better memory management

---

## Documentation

- [ink GitHub](https://github.com/vadimdemedes/ink)
- [ink API Reference](https://github.com/vadimdemedes/ink#api)
- [React Documentation](https://react.dev/)
