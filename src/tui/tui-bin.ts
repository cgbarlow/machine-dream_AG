#!/usr/bin/env node

/**
 * Machine Dream TUI - Main Executable
 *
 * This is the main entry point for the TUI that gets called when users run
 * 'machine-dream tui' command.
 */

import { MachineDreamTUI } from './tui';
import { logger } from '../cli/logger';

// Parse command line arguments for TUI options
function parseTUIArguments(): any {
    const args = process.argv.slice(2);
    const options: any = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--theme' && args[i + 1]) {
            options.theme = args[++i];
        } else if (arg === '--no-mouse') {
            options.behavior = { ...options.behavior, mouseEnabled: false };
        } else if (arg === '--help' || arg === '-h') {
            showTUIHelp();
            process.exit(0);
        }
    }

    return options;
}

function showTUIHelp(): void {
    console.log(`
Machine Dream TUI - Terminal User Interface

Usage: machine-dream tui [options]

Options:
  --theme <theme>      Set theme (dark, light, auto) (default: dark)
  --no-mouse           Disable mouse support
  --help, -h           Show this help message

Keyboard Shortcuts:
  F1          - Help (context-sensitive)
  F10         - Toggle menu
  Ctrl+C      - Exit application
  Ctrl+P      - Open command palette

Examples:
  machine-dream tui
  machine-dream tui --theme light
  machine-dream tui --no-mouse
`);
}

// Main function
async function main() {
    try {
        // Parse command line arguments
        const tuiOptions = parseTUIArguments();

        // Create and start TUI
        const tui = new MachineDreamTUI(tuiOptions);
        tui.start();

    } catch (error) {
        logger.error(`TUI Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}

// Run the TUI
main().catch(error => {
    logger.error(`TUI failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
});