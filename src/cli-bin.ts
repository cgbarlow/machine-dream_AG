#!/usr/bin/env node

/**
 * Machine Dream CLI - Main Executable
 *
 * This is the main entry point for the CLI that gets called when users run
 * 'machine-dream' command. It loads the CLI and executes the requested command.
 */

import { runCLI } from './cli/cli';

// Run the CLI
runCLI().catch(error => {
    console.error(`CLI Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
});