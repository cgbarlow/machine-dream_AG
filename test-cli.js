#!/usr/bin/env node

/**
 * Simple CLI Test Script
 *
 * This script tests the basic CLI functionality without requiring a full build.
 */

import { Command } from 'commander';

// Simple test program
const program = new Command();

program
    .name('machine-dream-test')
    .description('Test CLI for Machine Dream')
    .version('0.1.0');

program.command('test')
    .description('Test basic CLI functionality')
    .action(() => {
        console.log('✅ CLI Test: Basic command works');
    });

program.command('solve')
    .description('Test solve command')
    .argument('<puzzle-file>', 'Puzzle file')
    .option('--demo-mode', 'Demo mode')
    .action((puzzleFile, options) => {
        console.log(`🧠 Solve Command Test:`);
        console.log(`   Puzzle File: ${puzzleFile}`);
        console.log(`   Demo Mode: ${options.demoMode}`);
        console.log('✅ CLI Test: Solve command works');
    });

program.command('memory')
    .description('Test memory command')
    .command('store')
    .description('Test memory store')
    .argument('<key>', 'Memory key')
    .argument('<value>', 'Memory value')
    .action((key, value) => {
        console.log(`💾 Memory Store Test:`);
        console.log(`   Key: ${key}`);
        console.log(`   Value: ${value}`);
        console.log('✅ CLI Test: Memory command works');
    });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
}