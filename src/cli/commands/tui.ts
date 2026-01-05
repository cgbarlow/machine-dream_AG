/**
 * TUI Command Implementation
 *
 * Implements the 'machine-dream tui' command for launching the Terminal User Interface.
 */

import { Command } from 'commander';
import { logger } from '../logger';
import { ConfigurationError } from '../errors';

export function registerTUICommand(program: Command): void {
    const tuiCommand = new Command('tui');

    tuiCommand
        .description('Launch Terminal User Interface')
        .option('--theme <theme>', 'Set theme (dark, light, auto)', 'dark')
        .option('--no-mouse', 'Disable mouse support')
        .action(async (options) => {
            // TUI under reconstruction - see docs/specs/10-terminal-menu-interface-spec.md
            logger.warn('⚠️  TUI is currently being rebuilt with enhanced testability and architecture.');
            logger.info('📖 See docs/specs/10-terminal-menu-interface-spec.md for details.');
            logger.info('🔜 TUI will be available again soon with improved features.');

            // TODO: Uncomment when TUI rebuild is complete
            /*
            try {
                logger.info('🎯 Starting Machine Dream TUI...');

                // Import and launch the TUI
                const { MachineDreamTUI } = await import('../../tui/tui');

                const tuiOptions = {
                    theme: options.theme as 'dark' | 'light' | 'auto',
                    behavior: {
                        mouseEnabled: !options.noMouse
                    }
                };

                const tui = new MachineDreamTUI(tuiOptions);
                tui.start();

            } catch (error) {
                throw new ConfigurationError(
                    `Failed to start TUI: ${error instanceof Error ? error.message : String(error)}`,
                    undefined,
                    ['Check TUI dependencies', 'Try again with --theme dark']
                );
            }
            */
        });

    program.addCommand(tuiCommand);
}