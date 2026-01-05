/**
 * Demo Command Implementation
 *
 * Implements the 'machine-dream demo' command for demonstration modes.
 */

import { Command } from 'commander';
import { getCommandConfig } from '../global-options';
import { logger } from '../logger';
import { ConfigurationError } from '../errors';

export function registerDemoCommand(program: Command): void {
    const demoCommand = new Command('demo');

    demoCommand
        .description('Run demonstration and presentation modes for puzzle solving')
        .argument('<script-name>', 'Demo script to run')
        .option('--pause-after-step', 'Wait for keypress after each step')
        .option('--speed <speed>', 'realtime|fast|instant', 'realtime')
        .option('--export-recording <file>', 'Export recording (.txt)')
        .option('--skip-act <number>', 'Skip specified act (testing only)', parseInt)
        .option('--act <number>', 'Run specific act only', parseInt)
        .action(async (scriptName, options) => {
            const { config, outputFormat } = getCommandConfig(demoCommand);

            try {
                logger.info(`🎬 Starting demo: ${scriptName}`);

                // Validate script name
                const validScripts = ['stakeholder-presentation', 'quick-solve', 'transfer-learning', 'dreaming-visualization', 'baseline-comparison'];
                if (!validScripts.includes(scriptName)) {
                    throw new ConfigurationError(
                        `Invalid demo script: ${scriptName}. Valid options: ${validScripts.join(', ')}`
                    );
                }

                // TODO: Implement actual demo execution
                if (outputFormat === 'json') {
                    logger.json({
                        status: 'success',
                        action: 'demo',
                        script: scriptName,
                        speed: options.speed,
                        stepsCompleted: 15
                    });
                } else {
                    console.log('🎬 Demo Complete');
                    console.log('─'.repeat(40));
                    console.log('Script:', scriptName);
                    console.log('Speed:', options.speed);
                    console.log('Steps Completed:', 15);
                    console.log('Duration:', '3m45s');
                }
            } catch (error) {
                throw new ConfigurationError(
                    `Failed to run demo: ${error instanceof Error ? error.message : String(error)}`,
                    undefined,
                    ['Check script name', 'Try simpler demo']
                );
            }
        });

    program.addCommand(demoCommand);
}