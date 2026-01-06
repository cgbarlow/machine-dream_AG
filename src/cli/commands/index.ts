/**
 * CLI Commands Registration
 *
 * Registers all CLI commands with the commander program.
 */

import { Command } from 'commander';
import { registerSolveCommand } from './solve';
import { registerMemoryCommand } from './memory';
import { registerDreamCommand } from './dream';
import { registerBenchmarkCommand } from './benchmark';
import { registerDemoCommand } from './demo';
import { registerConfigCommand } from './config';
import { registerExportCommand } from './export';
import { registerSystemCommand } from './system';
import { registerInteractiveCommand } from './interactive';
import { registerTUICommand } from './tui';

export function registerCommands(program: Command): void {
    // Core commands
    registerSolveCommand(program);
    registerMemoryCommand(program);
    registerDreamCommand(program);
    registerBenchmarkCommand(program);
    registerDemoCommand(program);
    registerConfigCommand(program);
    registerExportCommand(program);
    registerSystemCommand(program);

    // Interactive mode
    registerInteractiveCommand(program);

    // TUI mode
    registerTUICommand(program);
}