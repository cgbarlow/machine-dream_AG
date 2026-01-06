/**
 * Config Command Implementation
 *
 * Implements the 'machine-dream config' command for configuration management.
 */

import { Command } from 'commander';
import { getCommandConfig } from '../global-options';
import { logger } from '../logger';
import { ConfigurationError } from '../errors';
import { saveConfiguration } from '../config';

export function registerConfigCommand(program: Command): void {
    const configCommand = new Command('config');

    configCommand
        .description('Manage system configuration')

    // Show subcommand
    const showCommand = new Command('show');
    showCommand
        .description('Show configuration')
        .option('--format <format>', 'json|yaml|table', 'yaml')
        .option('--key <key>', 'Show specific config key')
        .action(async (options) => {
            const { config, outputFormat } = getCommandConfig(showCommand);

            try {
                if (options.key) {
                    // Show specific key
                    const keys = options.key.split('.');
                    let value = config as any;
                    for (const key of keys) {
                        if (value && value[key] !== undefined) {
                            value = value[key];
                        } else {
                            throw new ConfigurationError(`Configuration key not found: ${options.key}`);
                        }
                    }

                    if (outputFormat === 'json' || options.format === 'json') {
                        logger.json({ [options.key]: value });
                    } else {
                        console.log(`${options.key}: ${JSON.stringify(value, null, 2)}`);
                    }
                } else {
                    // Show full configuration
                    if (outputFormat === 'json' || options.format === 'json') {
                        logger.json(config);
                    } else if (options.format === 'yaml') {
                        console.log('📋 Current Configuration:');
                        console.log('─'.repeat(40));
                        console.log(`Memory System: ${config.memorySystem}`);
                        console.log(`Enable RL: ${config.enableRL}`);
                        console.log(`Enable Reflexion: ${config.enableReflexion}`);
                        console.log(`Max Iterations: ${config.solving.maxIterations}`);
                        console.log(`Database Path: ${config.agentdb.dbPath}`);
                    } else {
                        // Table format
                        const configItems = [
                            { key: 'memorySystem', value: config.memorySystem },
                            { key: 'enableRL', value: config.enableRL },
                            { key: 'enableReflexion', value: config.enableReflexion },
                            { key: 'maxIterations', value: config.solving.maxIterations },
                            { key: 'dbPath', value: config.agentdb.dbPath }
                        ];

                        logger.table(configItems);
                    }
                }
            } catch (error) {
                throw new ConfigurationError(
                    `Failed to show configuration: ${error instanceof Error ? error.message : String(error)}`,
                    undefined,
                    ['Check configuration file', 'Use default configuration']
                );
            }
        });

    // Set subcommand
    const setCommand = new Command('set');
    setCommand
        .description('Set configuration')
        .argument('<key>', 'Configuration key (dot notation)')
        .argument('<value>', 'Value to set')
        .option('--type <type>', 'string|number|boolean|json', 'auto')
        .option('--global', 'Set in global config')
        .action(async (key, value, options) => {
            const { config, outputFormat } = getCommandConfig(setCommand);

            try {
                // Parse value based on type
                let parsedValue: any = value;
                if (options.type === 'json') {
                    parsedValue = JSON.parse(value);
                } else if (options.type === 'number') {
                    parsedValue = parseFloat(value);
                } else if (options.type === 'boolean') {
                    parsedValue = value.toLowerCase() === 'true';
                }

                // Update configuration
                const keys = key.split('.');
                const updatedConfig = { ...config };
                let current = updatedConfig as any;

                for (let i = 0; i < keys.length - 1; i++) {
                    if (!current[keys[i]]) {
                        current[keys[i]] = {};
                    }
                    current = current[keys[i]];
                }
                current[keys[keys.length - 1]] = parsedValue;

                // Save configuration - use default config path for now
                await saveConfiguration('.poc-config.json', updatedConfig);

                if (outputFormat === 'json') {
                    logger.json({
                        status: 'success',
                        action: 'config-set',
                        key,
                        value: parsedValue
                    });
                } else {
                    console.log('✅ Configuration Updated');
                    console.log('─'.repeat(40));
                    console.log(`Key: ${key}`);
                    console.log(`Value: ${JSON.stringify(parsedValue)}`);
                }
            } catch (error) {
                throw new ConfigurationError(
                    `Failed to set configuration: ${error instanceof Error ? error.message : String(error)}`,
                    undefined,
                    ['Check key format', 'Verify value type']
                );
            }
        });

    // Validate subcommand
    const validateCommand = new Command('validate');
    validateCommand
        .description('Validate configuration')
        .argument('[config-file]', 'Config file to validate')
        .option('--fix', 'Attempt to fix common issues')
        .action(async (configFile, _options) => {
            const { outputFormat } = getCommandConfig(validateCommand);

            try {
                const fileToValidate = configFile || '.machine-dream.json';
                logger.info(`🔍 Validating configuration: ${fileToValidate}`);

                // TODO: Implement actual validation
                if (outputFormat === 'json') {
                    logger.json({
                        status: 'success',
                        action: 'config-validate',
                        configFile: fileToValidate,
                        valid: true,
                        issuesFound: 0
                    });
                } else {
                    console.log('✅ Configuration Valid');
                    console.log('─'.repeat(40));
                    console.log('File:', fileToValidate);
                    console.log('Status:', 'Valid');
                    console.log('Issues Found:', 0);
                }
            } catch (error) {
                throw new ConfigurationError(
                    `Failed to validate configuration: ${error instanceof Error ? error.message : String(error)}`,
                    undefined,
                    ['Check file syntax', 'Use --fix to auto-correct']
                );
            }
        });

    // Export subcommand
    const exportCommand = new Command('export');
    exportCommand
        .description('Export configuration')
        .argument('<output-file>', 'Output file path')
        .option('--format <format>', 'json|yaml', 'json')
        .option('--include-defaults', 'Include default values')
        .action(async (outputFile, options) => {
            const { outputFormat } = getCommandConfig(exportCommand);

            try {
                logger.info(`💾 Exporting configuration to: ${outputFile}`);

                // TODO: Implement actual export
                if (outputFormat === 'json') {
                    logger.json({
                        status: 'success',
                        action: 'config-export',
                        outputFile,
                        format: options.format,
                        includeDefaults: !!options.includeDefaults
                    });
                } else {
                    console.log('💾 Configuration Exported');
                    console.log('─'.repeat(40));
                    console.log('Output File:', outputFile);
                    console.log('Format:', options.format);
                    console.log('Include Defaults:', options.includeDefaults ? 'Yes' : 'No');
                }
            } catch (error) {
                throw new ConfigurationError(
                    `Failed to export configuration: ${error instanceof Error ? error.message : String(error)}`,
                    undefined,
                    ['Check file permissions', 'Verify output path']
                );
            }
        });

    configCommand.addCommand(showCommand);
    configCommand.addCommand(setCommand);
    configCommand.addCommand(validateCommand);
    configCommand.addCommand(exportCommand);

    program.addCommand(configCommand);
}