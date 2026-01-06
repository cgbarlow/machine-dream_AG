/**
 * Interactive Command Implementation
 *
 * Implements the 'machine-dream interactive' command for REPL mode.
 */

import { Command } from 'commander';
import { getCommandConfig } from '../global-options';
import { logger } from '../logger';
import { ConfigurationError } from '../errors';

export function registerInteractiveCommand(program: Command): void {
    const interactiveCommand = new Command('interactive');

    interactiveCommand
        .description('Launch interactive REPL for exploratory operations')
        .alias('-i')
        .action(async () => {
            const { outputFormat: _outputFormat } = getCommandConfig(interactiveCommand);

            try {
                logger.info('🎯 Starting interactive mode...');

                // TODO: Implement actual REPL
                console.log('🎯 Interactive Mode');
                console.log('─'.repeat(40));
                console.log('Type "help" for available commands');
                console.log('Type "exit" or press Ctrl+C to quit');
                console.log('');
                console.log('> '); // Show prompt

                // For now, just show a message
                logger.info('Interactive mode started (REPL implementation pending)');

            } catch (error) {
                throw new ConfigurationError(
                    `Failed to start interactive mode: ${error instanceof Error ? error.message : String(error)}`,
                    undefined,
                    ['Check system status', 'Try again later']
                );
            }
        });

    program.addCommand(interactiveCommand);
}