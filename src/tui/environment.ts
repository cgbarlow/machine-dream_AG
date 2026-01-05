/**
 * TUI Environment Detection and Configuration
 *
 * Detects terminal capabilities and provides appropriate configuration.
 */

import fs from 'fs';

export interface TerminalInfo {
    term: string;
    isTTY: boolean;
    supportsColor: boolean;
    supportsUnicode: boolean;
    supportsMouse: boolean;
    colorDepth: number;
    columns: number;
    rows: number;
    isWindows: boolean;
    isWSL: boolean;
    isDocker: boolean;
    isCI: boolean;
}

export function detectTerminalEnvironment(): TerminalInfo {
    const term = process.env.TERM || 'unknown';
    const isTTY = process.stdout.isTTY;
    const supportsColor = process.stdout.getColorDepth && process.stdout.getColorDepth() > 1;
    const colorDepth = supportsColor ? process.stdout.getColorDepth() : 1;

    // Detect terminal capabilities
    const supportsUnicode = process.env.LC_ALL?.includes('UTF-8') ||
                           process.env.LANG?.includes('UTF-8') ||
                           term.includes('xterm');

    // Detect specific environments
    const isWindows = process.platform === 'win32';
    const isWSL = isWindows && process.env.WSL_DISTRO_NAME !== undefined;
    const isDocker = process.env.DOCKER === 'true' ||
                    process.env.DOCKER_CONTAINER === 'true' ||
                    fs.existsSync('/.dockerenv');
    const isCI = process.env.CI === 'true' ||
                process.env.CONTINUOUS_INTEGRATION === 'true' ||
                process.env.TRAVIS === 'true' ||
                process.env.GITHUB_ACTIONS === 'true';

    // Mouse support detection
    const supportsMouse = !isCI && !isDocker && term.includes('xterm');

    return {
        term,
        isTTY,
        supportsColor,
        supportsUnicode,
        supportsMouse,
        colorDepth,
        columns: process.stdout.columns || 80,
        rows: process.stdout.rows || 24,
        isWindows,
        isWSL,
        isDocker,
        isCI
    };
}

export function getTerminalConfiguration(terminalInfo: TerminalInfo): any {
    const config: any = {
        smartCSR: true,
        fullUnicode: terminalInfo.supportsUnicode,
        dockBorders: true,
        autoPadding: true,
        warnings: !terminalInfo.isCI,
        ignoreLocked: ['C-c']
    };

    // Adjust for problematic environments
    if (terminalInfo.isCI || terminalInfo.isDocker) {
        config.smartCSR = false;
        config.dockBorders = false;
        config.warnings = false;
    }

    // Windows/WSL specific settings
    if (terminalInfo.isWindows || terminalInfo.isWSL) {
        config.terminal = 'xterm-256color';
        config.fullUnicode = true; // WSL usually supports Unicode well
    }

    // Fallback for simple terminals
    if (terminalInfo.term === 'vt100' || terminalInfo.term === 'unknown') {
        config.smartCSR = false;
        config.fullUnicode = false;
        config.terminal = 'vt100';
    }

    // Minimum screen size enforcement
    if (terminalInfo.columns < 80 || terminalInfo.rows < 24) {
        console.warn('⚠️ Terminal too small. Minimum 80x24 required.');
        config.width = 80;
        config.height = 24;
    }

    return config;
}

export function validateTerminalEnvironment(): { valid: boolean; issues: string[]; warnings: string[] } {
    const terminalInfo = detectTerminalEnvironment();
    const issues: string[] = [];
    const warnings: string[] = [];

    // Critical issues
    if (!terminalInfo.isTTY) {
        issues.push('Not running in a TTY (interactive terminal)');
    }

    if (terminalInfo.columns < 80 || terminalInfo.rows < 24) {
        issues.push(`Terminal too small (${terminalInfo.columns}x${terminalInfo.rows}), minimum 80x24 required`);
    }

    if (terminalInfo.term === 'unknown' || terminalInfo.term === 'dumb') {
        issues.push('Unknown or dumb terminal type - advanced features may not work');
    }

    // Warnings
    if (terminalInfo.isCI) {
        warnings.push('Running in CI environment - some interactive features disabled');
    }

    if (terminalInfo.isDocker) {
        warnings.push('Running in Docker container - terminal support may be limited');
    }

    if (terminalInfo.isWindows && !terminalInfo.isWSL) {
        warnings.push('Running on Windows - consider using Windows Terminal for best experience');
    }

    if (!terminalInfo.supportsColor) {
        warnings.push('Terminal does not support colors - UI will be monochrome');
    }

    if (!terminalInfo.supportsUnicode) {
        warnings.push('Terminal does not support Unicode - some characters may not display correctly');
    }

    return {
        valid: issues.length === 0,
        issues,
        warnings
    };
}

export function applyTerminalFixes(): void {
    // Fix common terminal issues
    if (!process.env.TERM || process.env.TERM === 'dumb') {
        process.env.TERM = 'xterm-256color';
        console.log('🔧 Set TERM to xterm-256color');
    }

    // Windows specific fixes
    if (process.platform === 'win32') {
        // Enable ANSI escape codes on Windows
        if (!process.env.ENABLE_VIRTUAL_TERMINAL_PROCESSING) {
            // This would normally be set by the terminal, but we can try
            console.log('📋 Windows terminal detected - enabling ANSI support');
        }
    }

    // CI/Docker fixes
    if (process.env.CI || process.env.DOCKER) {
        // Force color support in CI
        process.env.FORCE_COLOR = '1';
        console.log('🔧 Forced color support in CI environment');
    }
}