/**
 * CLI Error Handling
 *
 * Custom error classes for CLI-specific error handling with proper exit codes
 * and actionable error messages.
 */

export class CLIError extends Error {
    exitCode: number;
    details?: string;
    suggestions?: string[];

    constructor(message: string, exitCode: number, details?: string, suggestions?: string[]) {
        super(message);
        this.name = 'CLIError';
        this.exitCode = exitCode;
        this.details = details;
        this.suggestions = suggestions;
    }
}

export class ConfigurationError extends CLIError {
    constructor(message: string, details?: string, suggestions?: string[]) {
        super(message, 3, details, suggestions);
        this.name = 'ConfigurationError';
    }
}

export class InitializationError extends CLIError {
    constructor(message: string, details?: string, suggestions?: string[]) {
        super(message, 4, details, suggestions);
        this.name = 'InitializationError';
    }
}

export class SolveError extends CLIError {
    constructor(message: string, details?: string, suggestions?: string[]) {
        super(message, 1, details, suggestions);
        this.name = 'SolveError';
    }
}

export class ValidationError extends CLIError {
    constructor(message: string, details?: string, suggestions?: string[]) {
        super(message, 2, details, suggestions);
        this.name = 'ValidationError';
    }
}

export class UserCancellationError extends CLIError {
    constructor() {
        super('Operation cancelled by user', 6);
        this.name = 'UserCancellationError';
    }
}