#!/usr/bin/env node

/**
 * Machine Dream CLI - Main Entry Point
 *
 * This file implements the complete CLI interface as specified in the CLI spec document.
 * It provides hierarchical commands organized by domain with intuitive defaults and
 * progressive disclosure of advanced options.
 */

import { Command } from 'commander';
import pkg from '../../package.json' with { type: 'json' };
import { CLIError } from './errors.js';

const { version } = pkg;
import { configureGlobalOptions } from './global-options.js';
import { registerCommands } from './commands/index.js';
import { logger } from './logger.js';
import { initializeAlgorithmRegistry } from '../llm/clustering/index.js';

// Initialize algorithm registry (Spec 18: Algorithm Versioning System)
initializeAlgorithmRegistry();

// CLI Entry Point
export async function runCLI() {
    const program = new Command();

    try {
        // Set up base command
        program
            .name('machine-dream')
            .description('Machine Dream - Cognitive Puzzle Solver with Continuous Thinking')
            .version(version, '--version, -v', 'Show version information')
            .showHelpAfterError('(Use --help for more information)');

        // Configure global options
        configureGlobalOptions(program);

        // Register all commands
        registerCommands(program);

        // Parse arguments
        await program.parseAsync(process.argv);

        // If no command provided, show help
        if (!process.argv.slice(2).length) {
            program.outputHelp();
        }

    } catch (error) {
        if (error instanceof CLIError) {
            logger.error(error.message);
            if (error.details) {
                logger.info(`Details: ${error.details}`);
            }
            if (error.suggestions && error.suggestions.length > 0) {
                logger.info('Suggestions:');
                error.suggestions.forEach(suggestion => logger.info(`  • ${suggestion}`));
            }
            process.exit(error.exitCode || 1);
        } else {
            logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
    }
}

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runCLI().catch(error => {
        logger.error(`CLI failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    });
}