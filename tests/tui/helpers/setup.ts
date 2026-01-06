/**
 * Vitest Test Setup for TUI Tests
 *
 * Global configuration for all TUI tests.
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Global test setup
beforeAll(() => {
  // Set CI mode to disable interactive features
  process.env.CI = 'true';

  // Disable TUI debug output in tests (or redirect to /dev/null)
  process.env.TUI_DEBUG_OUTPUT = '/dev/null';

  // Set fixed terminal dimensions for consistent tests
  process.env.COLUMNS = '120';
  process.env.ROWS = '40';
});

afterAll(() => {
  // Cleanup environment
  delete process.env.CI;
  delete process.env.TUI_DEBUG_OUTPUT;
  delete process.env.COLUMNS;
  delete process.env.ROWS;
});

// Per-test setup
beforeEach(() => {
  // Reset any test-specific state
});

afterEach(() => {
  // Cleanup after each test
});
