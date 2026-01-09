/**
 * CLI Logger
 *
 * Centralized logging utility with support for different log levels and output formats.
 */

import chalk from 'chalk';

interface LoggerOptions {
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    quiet?: boolean;
    noColor?: boolean;
    verbose?: boolean;
    simple?: boolean; // Disable timestamp/level prefix for clean CLI output
}

export class Logger {
    private logLevel: 'debug' | 'info' | 'warn' | 'error';
    private quiet: boolean;
    private noColor: boolean;
    private simple: boolean;

    constructor(options: LoggerOptions = {}) {
        this.logLevel = options.logLevel || 'info';
        this.quiet = options.quiet || false;
        this.noColor = options.noColor || false;
        this.simple = options.simple || false;
        // verbose option not yet implemented
        void options.verbose;
    }

    private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
        if (this.quiet && level !== 'error') return false;

        const levels = ['debug', 'info', 'warn', 'error'];
        const levelIndex = levels.indexOf(level);
        const currentLevelIndex = levels.indexOf(this.logLevel);

        return levelIndex >= currentLevelIndex;
    }

    private formatMessage(level: string, message: string): string {
        // Simple mode: just return the message without prefix
        if (this.simple) {
            return message;
        }

        const timestamp = new Date().toISOString();

        if (this.noColor) {
            return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        }

        let coloredLevel;
        switch (level) {
            case 'debug':
                coloredLevel = chalk.blue('DEBUG');
                break;
            case 'info':
                coloredLevel = chalk.green('INFO');
                break;
            case 'warn':
                coloredLevel = chalk.yellow('WARN');
                break;
            case 'error':
                coloredLevel = chalk.red('ERROR');
                break;
            default:
                coloredLevel = level.toUpperCase();
        }

        return `[${chalk.gray(timestamp)}] [${coloredLevel}] ${message}`;
    }

    debug(message: string): void {
        if (this.shouldLog('debug')) {
            console.debug(this.formatMessage('debug', message));
        }
    }

    info(message: string): void {
        if (this.shouldLog('info')) {
            console.info(this.formatMessage('info', message));
        }
    }

    warn(message: string): void {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message));
        }
    }

    error(message: string): void {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message));
        }
    }

    // JSON output for machine-readable logging
    json(data: any): void {
        if (!this.quiet) {
            console.log(JSON.stringify(data, null, 2));
        }
    }

    // Table output for human-readable structured data
    table(data: any[]): void {
        if (!this.quiet) {
            // Simple table formatting - could be enhanced with proper table library
            if (data.length === 0) {
                console.log('No data available');
                return;
            }

            const headers = Object.keys(data[0]);
            const headerRow = headers.join(' | ');
            const separator = headers.map(h => '-'.repeat(h.length)).join('-|-');

            console.log(headerRow);
            console.log(separator);

            data.forEach(row => {
                const rowValues = headers.map(header => String(row[header]));
                console.log(rowValues.join(' | '));
            });
        }
    }
}

// Global logger instance (simple mode by default for clean CLI output)
export const logger = new Logger({ simple: true });

// Function to configure global logger
export function configureLogger(options: LoggerOptions): void {
    const globalLogger = logger as any;
    Object.assign(globalLogger, {
        logLevel: options.logLevel || globalLogger.logLevel,
        quiet: options.quiet || globalLogger.quiet,
        noColor: options.noColor || globalLogger.noColor,
        verbose: options.verbose || globalLogger.verbose,
        simple: options.simple !== undefined ? options.simple : globalLogger.simple
    });
}