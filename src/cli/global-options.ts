/**
 * Global CLI Options Configuration
 *
 * Handles global options that apply to all commands such as logging, output format,
 * configuration file, etc.
 */

import { Command } from 'commander';
import { configureLogger } from './logger.js';
import { loadConfiguration } from './config.js';
import { Configuration } from './types.js';

// Global configuration storage
let globalConfig: Configuration | null = null;

export function configureGlobalOptions(program: Command): void {
    program
        .option('--config <file>', 'Custom configuration file (.poc-config.json)', '.poc-config.json')
        .option('--log-level <level>', 'Log level: debug|info|warn|error', 'info')
        .option('--output-format <format>', 'Output format: json|table|yaml', 'table')
        .option('--quiet, -q', 'Suppress non-essential output')
        .option('--verbose, -V', 'Show detailed output')
        .option('--no-color', 'Disable colored output')
        .hook('preAction', async (thisCommand) => {
            // Load configuration
            const configPath = thisCommand.opts().config;
            const config = await loadConfiguration(configPath);
            globalConfig = config;

            // Configure logger based on CLI options and config
            configureLogger({
                logLevel: thisCommand.opts().logLevel as any,
                quiet: thisCommand.opts().quiet,
                noColor: thisCommand.opts().noColor,
                verbose: thisCommand.opts().verbose
            });

            // Store configuration in command for later use
            thisCommand.setOptionValue('config', config);
            thisCommand.setOptionValue('outputFormat', thisCommand.opts().outputFormat);
        });
}

// Helper to get current configuration from a command
export function getCommandConfig(command: Command): { config: Configuration, outputFormat: string } {
    return {
        config: globalConfig || command.opts().config,
        outputFormat: command.opts().outputFormat || 'table'
    };
}