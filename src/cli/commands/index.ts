/**
 * CLI Commands Registration
 *
 * Registers all CLI commands with the commander program.
 */

import { Command } from 'commander';
import { registerSolveCommand } from './solve.js';
import { registerMemoryCommand } from './memory.js';
import { registerDreamCommand } from './dream.js';
import { registerBenchmarkCommand } from './benchmark.js';
import { registerDemoCommand } from './demo.js';
import { registerConfigCommand } from './config.js';
import { registerExportCommand } from './export.js';
import { registerSystemCommand } from './system.js';
import { registerInteractiveCommand } from './interactive.js';
import { registerTUICommand } from './tui.js';
import { registerLLMCommand } from './llm.js';
import { registerPuzzleCommand } from './puzzle.js';

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

    // LLM Sudoku Player (Spec 11)
    registerLLMCommand(program);

    // Puzzle Generation (Spec 12)
    registerPuzzleCommand(program);

    // Interactive mode
    registerInteractiveCommand(program);

    // TUI mode
    registerTUICommand(program);
}