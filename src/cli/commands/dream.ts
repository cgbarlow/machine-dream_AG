/**
 * Dream Command Implementation
 *
 * Implements the 'machine-dream dream' command for dreaming/consolidation operations.
 */

import { Command } from 'commander';
import { getCommandConfig } from '../global-options';
import { logger } from '../logger';
import { ConfigurationError } from '../errors';

export function registerDreamCommand(program: Command): void {
    const dreamCommand = new Command('dream');

    dreamCommand
        .description('Trigger and manage night cycle (dreaming/consolidation) operations')

    // Run subcommand
    const runCommand = new Command('run');
    runCommand
        .description('Run dream cycle')
        .option('--sessions <list>', 'Comma-separated session IDs')
        .option('--phases <list>', 'Phases to run: capture,triage,compress,abstract,integrate')
        .option('--compression-ratio <n>', 'Target compression ratio', parseInt)
        .option('--abstraction-levels <n>', 'Number of abstraction levels', parseInt)
        .option('--visualize', 'Show consolidation visualization')
        .option('--output <file>', 'Save consolidated knowledge')
        .action(async (options) => {
            const { config, outputFormat } = getCommandConfig(runCommand);

            try {
                logger.info('🌙 Starting dream cycle...');

                // TODO: Implement actual dream cycle
                if (outputFormat === 'json') {
                    logger.json({
                        status: 'success',
                        action: 'dream-run',
                        sessions: options.sessions || 'all recent',
                        phases: options.phases || 'all',
                        knowledgeConsolidated: 8
                    });
                } else {
                    console.log('🌙 Dream Cycle Complete');
                    console.log('─'.repeat(40));
                    console.log('Sessions:', options.sessions || 'all recent');
                    console.log('Phases:', options.phases || 'all');
                    console.log('Knowledge Consolidated:', 8, 'patterns');
                }
            } catch (error) {
                throw new ConfigurationError(
                    `Failed to run dream cycle: ${error instanceof Error ? error.message : String(error)}`,
                    undefined,
                    ['Check session IDs', 'Try fewer phases']
                );
            }
        });

    // Schedule subcommand
    const scheduleCommand = new Command('schedule');
    scheduleCommand
        .description('Configure dream schedule')
        .argument('<schedule-type>', 'after-session|periodic|manual')
        .option('--interval <n>', 'Interval for periodic (sessions)', parseInt)
        .option('--enable', 'Enable scheduled dreaming')
        .option('--disable', 'Disable scheduled dreaming')
        .action(async (scheduleType, options) => {
            const { config, outputFormat } = getCommandConfig(scheduleCommand);

            try {
                logger.info(`⏰ Configuring dream schedule: ${scheduleType}`);

                if (outputFormat === 'json') {
                    logger.json({
                        status: 'success',
                        action: 'dream-schedule',
                        scheduleType,
                        interval: options.interval,
                        enabled: !!options.enable
                    });
                } else {
                    console.log('⏰ Dream Schedule Configured');
                    console.log('─'.repeat(40));
                    console.log('Type:', scheduleType);
                    console.log('Interval:', options.interval || 'N/A');
                    console.log('Enabled:', options.enable ? 'Yes' : options.disable ? 'No' : 'Unchanged');
                }
            } catch (error) {
                throw new ConfigurationError(
                    `Failed to configure dream schedule: ${error instanceof Error ? error.message : String(error)}`,
                    undefined,
                    ['Check schedule type', 'Verify interval value']
                );
            }
        });

    // Status subcommand
    const statusCommand = new Command('status');
    statusCommand
        .description('Check dream status')
        .option('--last <n>', 'Show last N dream cycles', parseInt)
        .option('--metrics', 'Include consolidation metrics')
        .action(async (options) => {
            const { config, outputFormat } = getCommandConfig(statusCommand);

            try {
                logger.info('📊 Checking dream status...');

                // TODO: Implement actual status check
                const mockCycles = [
                    { id: 'dream-001', timestamp: '2026-01-05T10:00:00Z', knowledgeGained: 5 },
                    { id: 'dream-002', timestamp: '2026-01-05T12:00:00Z', knowledgeGained: 8 }
                ];

                if (outputFormat === 'json') {
                    logger.json({
                        status: 'success',
                        action: 'dream-status',
                        lastCycles: mockCycles.slice(0, options.last || 5)
                    });
                } else {
                    console.log('📊 Dream Status');
                    console.log('─'.repeat(40));
                    mockCycles.slice(0, options.last || 5).forEach(cycle => {
                        console.log(`Cycle: ${cycle.id}`);
                        console.log(`  Time: ${new Date(cycle.timestamp).toLocaleString()}`);
                        console.log(`  Knowledge: ${cycle.knowledgeGained} patterns`);
                    });
                }
            } catch (error) {
                throw new ConfigurationError(
                    `Failed to get dream status: ${error instanceof Error ? error.message : String(error)}`,
                    undefined,
                    ['Check system status', 'Try again later']
                );
            }
        });

    dreamCommand.addCommand(runCommand);
    dreamCommand.addCommand(scheduleCommand);
    dreamCommand.addCommand(statusCommand);

    program.addCommand(dreamCommand);
}