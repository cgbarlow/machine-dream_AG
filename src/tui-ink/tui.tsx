#!/usr/bin/env node

/**
 * Machine Dream AG - Terminal User Interface
 *
 * Interactive TUI built with ink (React-based terminal framework)
 * Same technology as Claude Code for proven compatibility
 */

import React from 'react';
import { render } from 'ink';
import { App } from './App.js';

// Render the application
const app = render(<App />);

// Graceful shutdown
process.on('SIGINT', () => {
  app.unmount();
  process.exit(0);
});

process.on('SIGTERM', () => {
  app.unmount();
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Fatal error:', error);
  app.unmount();
  process.exit(1);
});

process.on('unhandledRejection', (reason, _promise) => {
  console.error('Unhandled promise rejection:', reason);
  app.unmount();
  process.exit(1);
});
