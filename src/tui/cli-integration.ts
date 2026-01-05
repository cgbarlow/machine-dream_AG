/**
 * TUI CLI Integration
 *
 * Handles execution of CLI commands from the TUI interface.
 */

import { spawn } from 'child_process';
import { logger } from '../cli/logger';

export async function executeCLICommand(command: string): Promise<any> {
    return new Promise((resolve, reject) => {
        logger.info(`Executing CLI command: machine-dream ${command}`);

        // Spawn the CLI process
        const cliProcess = spawn('node', ['dist/cli-bin.js', ...command.split(' ')], {
            cwd: process.cwd(),
            stdio: ['inherit', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        // Capture stdout
        cliProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        // Capture stderr
        cliProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        // Handle process completion
        cliProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    // Try to parse JSON output
                    const result = JSON.parse(stdout);
                    resolve(result);
                } catch (error) {
                    // If not JSON, return as text
                    resolve({ success: true, output: stdout });
                }
            } else {
                reject(new Error(`CLI command failed with code ${code}: ${stderr || stdout}`));
            }
        });

        // Handle errors
        cliProcess.on('error', (error) => {
            reject(new Error(`Failed to execute CLI command: ${error.message}`));
        });
    });
}

// Alternative approach using direct module import (for development)
export async function executeCLICommandDirect(command: string): Promise<any> {
    try {
        // Parse the command
        const args = command.split(' ');
        const cmd = args[0];
        const cmdArgs = args.slice(1);

        // Mock process.argv for the CLI
        const originalArgv = process.argv;
        process.argv = ['node', 'machine-dream', cmd, ...cmdArgs];

        // Execute the CLI command
        // Note: This is a simplified approach - a real implementation would need
        // to properly handle the CLI parsing and command execution
        logger.info(`Executing CLI command directly: ${command}`);

        // Restore original argv
        process.argv = originalArgv;

        return { success: true, message: `Command ${command} would be executed` };

    } catch (error: any) {
        logger.error(`Failed to execute CLI command directly: ${error.message}`);
        throw error;
    }
}