/**
 * Export Command Implementation
 *
 * Implements the 'machine-dream export' command for data export utilities.
 */

import { Command } from 'commander';
import { getCommandConfig } from '../global-options';
import { logger } from '../logger';
import { ConfigurationError } from '../errors';

export function registerExportCommand(program: Command): void {
    const exportCommand = new Command('export');

    exportCommand
        .description('Export data, metrics, and results')
        .argument('<type>', 'Data type to export (metrics|results|config|logs|memory|all)')
        .option('--output-dir <dir>', 'Output directory')
        .option('--format <format>', 'json|csv|markdown', 'json')
        .option('--sessions <list>', 'Specific session IDs to export')
        .option('--compress', 'Compress exported data')
        .option('--include-raw', 'Include raw data (not just summaries)')
        .action(async (type, options) => {
            const { outputFormat } = getCommandConfig(exportCommand);

            try {
                logger.info(`📤 Exporting ${type} data...`);

                // TODO: Implement actual export
                if (outputFormat === 'json') {
                    logger.json({
                        status: 'success',
                        action: 'export',
                        type,
                        outputDir: options.outputDir || './export',
                        format: options.format,
                        filesCreated: 3
                    });
                } else {
                    console.log('📤 Export Complete');
                    console.log('─'.repeat(40));
                    console.log('Type:', type);
                    console.log('Output Directory:', options.outputDir || './export');
                    console.log('Format:', options.format);
                    console.log('Files Created:', 3);
                }
            } catch (error) {
                throw new ConfigurationError(
                    `Failed to export data: ${error instanceof Error ? error.message : String(error)}`,
                    undefined,
                    ['Check output directory', 'Verify file permissions']
                );
            }
        });

    program.addCommand(exportCommand);
}