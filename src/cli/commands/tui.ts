/**
 * TUI Command Implementation
 *
 * Implements the 'machine-dream tui' command for launching the Terminal User Interface.
 */

import { Command } from 'commander';
import { logger } from '../logger.js';
import { ConfigurationError } from '../errors.js';

export function registerTUICommand(program: Command): void {
    const tuiCommand = new Command('tui');

    tuiCommand
        .description('Launch Terminal User Interface')
        .option('--theme <theme>', 'Set theme (dark, light, auto)', 'dark')
        .option('--no-mouse', 'Disable mouse support')
        .action(async (_options) => {
            try {
                logger.info('🎯 Starting Machine Dream TUI...');

                // Import and launch the modern Ink-based TUI
                // Use dynamic import to avoid loading React at CLI startup
                const { spawn } = await import('child_process');
                const { join } = await import('path');
                const { fileURLToPath } = await import('url');
                const { dirname } = await import('path');

                // Get the path to the tui-ink entry point
                const __dirname = dirname(fileURLToPath(import.meta.url));
                const tuiPath = join(__dirname, '../../tui-ink/tui.js');

                // Spawn the Ink TUI in a child process
                const tuiProcess = spawn('node', [tuiPath], {
                    stdio: 'inherit',
                    cwd: process.cwd()
                });

                // Wait for TUI to exit
                await new Promise<void>((resolve, reject) => {
                    tuiProcess.on('exit', (code) => {
                        if (code === 0) {
                            resolve();
                        } else {
                            reject(new Error(`TUI exited with code ${code}`));
                        }
                    });
                    tuiProcess.on('error', reject);
                });

            } catch (error) {
                throw new ConfigurationError(
                    `Failed to start TUI: ${error instanceof Error ? error.message : String(error)}`,
                    undefined,
                    ['Check TUI dependencies', 'Try again with --theme dark']
                );
            }
        });

    program.addCommand(tuiCommand);
}