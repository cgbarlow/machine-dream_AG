#!/usr/bin/env node

/**
 * TUI Binary Entry Point
 *
 * Launches the Terminal User Interface.
 */

import { TUIApplication } from './TUIApplication';
import { detectTerminalCapabilities, validateTerminalEnvironment } from './utils/terminalDetect';

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const debugOutputIndex = args.indexOf('--debug-output');
  const debugOutputPath = debugOutputIndex >= 0 ? args[debugOutputIndex + 1] : undefined;

  // Check if debug mode is enabled (allows headless operation)
  const isDebugMode = Boolean(
    debugOutputPath ||
    process.env.TUI_DEBUG_OUTPUT ||
    process.env.TUI_DEBUG_STDOUT
  );

  // Validate terminal environment
  const caps = detectTerminalCapabilities();
  const validation = validateTerminalEnvironment(caps, { allowHeadless: isDebugMode });

  if (!validation.valid) {
    console.error('❌ Terminal environment validation failed:');
    validation.errors.forEach(error => console.error(`   • ${error}`));
    if (validation.warnings.length > 0) {
      console.warn('\n⚠️  Warnings:');
      validation.warnings.forEach(warning => console.warn(`   • ${warning}`));
    }
    process.exit(1);
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️  Terminal warnings:');
    validation.warnings.forEach(warning => console.warn(`   • ${warning}`));
    console.log('');
  }

  try {

    // Create and start TUI
    const app = new TUIApplication({
      debugOutput: debugOutputPath || process.env.TUI_DEBUG_OUTPUT
    });

    await app.start();
  } catch (error) {
    console.error('❌ Failed to start TUI:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
