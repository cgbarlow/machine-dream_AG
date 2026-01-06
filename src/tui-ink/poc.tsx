#!/usr/bin/env node
/**
 * Proof-of-Concept: ink TUI
 *
 * Simple test to validate ink works on Node.js v24 + WSL
 * where blessed/neo-blessed fails with stack overflow.
 *
 * Usage:
 *   npx tsx src/tui-ink/poc.tsx
 *   npm run tui:poc
 */

import React from 'react';
import { render } from 'ink';
import { HomeScreen } from './screens/HomeScreen.js';

// Simple POC - just render the HomeScreen
const app = render(<HomeScreen />);

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  app.unmount();
  process.exit(0);
});

// Display startup message
console.log('\n🚀 Launching ink POC...\n');
console.log('Press Ctrl+C to exit\n');
