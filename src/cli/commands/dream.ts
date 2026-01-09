/**
 * Dream Command Implementation
 *
 * Implements the 'machine-dream dream' command for dreaming/consolidation operations.
 */

import { Command } from 'commander';
import { getCommandConfig } from '../global-options.js';
import { logger } from '../logger.js';
import { ConfigurationError } from '../errors.js';
import { AgentMemory } from '../../memory/AgentMemory.js';
import { DreamingController } from '../../consolidation/DreamingController.js';
import type { AgentDBConfig } from '../../types.js';
import { join } from 'path';
import { homedir } from 'os';

// Helper to create default AgentDB config for dream operations
function createDefaultDreamConfig(): AgentDBConfig {
  return {
    dbPath: join(homedir(), '.machine-dream/agentdb'),
    preset: 'large' as const,
    rlPlugin: {
      type: 'decision-transformer' as const,
      name: 'sudoku-solver' as const,
      stateDim: 81,
      actionDim: 9,
      sequenceLength: 20
    },
    agentDbPath: join(homedir(), '.machine-dream/agentdb'),
    embeddingModel: 'Xenova/all-MiniLM-L6-v2',
    enableReasoningBank: true,
    enableReflexion: true,
    enableSkillLibrary: false,
    quantization: 'scalar' as const,
    indexing: 'hnsw' as const,
    cacheEnabled: true,
    reflexion: { enabled: true, maxEntries: 1000, similarityThreshold: 0.8 },
    skillLibrary: { enabled: false, minSuccessRate: 0.8, maxSkills: 100, autoConsolidate: false }
  };
}

export function registerDreamCommand(program: Command): void {
    const dreamCommand = new Command('dream');

    dreamCommand
        .description('Trigger and manage night cycle (dreaming/consolidation) operations')

    // Run subcommand
    const runCommand = new Command('run');
    runCommand
        .description('Run dream cycle')
        .option('--sessions <list>', 'Comma-separated session IDs')
        .option('--phases <list>', 'Phases to run: capture,triage,compress,abstract,integrate')
        .option('--compression-ratio <n>', 'Target compression ratio', parseInt)
        .option('--abstraction-levels <n>', 'Number of abstraction levels', parseInt)
        .option('--visualize', 'Show consolidation visualization')
        .option('--output <file>', 'Save consolidated knowledge')
        .action(async (options) => {
            const { outputFormat } = getCommandConfig(runCommand);

            try {
                // Warning about LLM vs deterministic dreaming
                logger.warn('⚠️  This command is for DETERMINISTIC SOLVER dreaming.');
                logger.warn('⚠️  For LLM learning consolidation, use: machine-dream llm dream run\n');

                logger.info('🌙 Starting dream cycle...');

                // Initialize memory and dreaming controller with real backends
                const memoryConfig = createDefaultDreamConfig();
                const memory = new AgentMemory(memoryConfig);
                const dreamingController = new DreamingController(memory, memoryConfig);

                // Parse session IDs from options
                const sessionIds = options.sessions?.split(',') || ['default-session'];

                let totalPatterns = 0;
                let totalCompressionRatio = 0;
                const results = [];

                // Run dream cycle for each session
                for (const sessionId of sessionIds) {
                    const knowledge = await dreamingController.runDreamCycle(sessionId);
                    totalPatterns += knowledge.patterns.length;
                    totalCompressionRatio += knowledge.compressionRatio;

                    results.push({
                        sessionId,
                        patterns: knowledge.patterns.length,
                        compressionRatio: knowledge.compressionRatio,
                        verificationStatus: knowledge.verificationStatus
                    });
                }

                const avgCompressionRatio = totalCompressionRatio / sessionIds.length;

                if (outputFormat === 'json') {
                    logger.json({
                        status: 'success',
                        action: 'dream-run',
                        sessions: sessionIds,
                        phases: options.phases || 'all',
                        knowledgeConsolidated: totalPatterns,
                        avgCompressionRatio: avgCompressionRatio.toFixed(2),
                        results
                    });
                } else {
                    console.log('🌙 Dream Cycle Complete');
                    console.log('─'.repeat(40));
                    console.log('Sessions:', sessionIds.join(', '));
                    console.log('Phases:', options.phases || 'all');
                    console.log('Knowledge Consolidated:', totalPatterns, 'patterns');
                    console.log('Avg Compression Ratio:', avgCompressionRatio.toFixed(2) + 'x');
                    console.log('\nSession Details:');
                    results.forEach(r => {
                        console.log(`  ${r.sessionId}: ${r.patterns} patterns (${r.compressionRatio.toFixed(2)}x compression)`);
                    });
                }
            } catch (error) {
                throw new ConfigurationError(
                    `Failed to run dream cycle: ${error instanceof Error ? error.message : String(error)}`,
                    undefined,
                    ['Check session IDs', 'Try fewer phases', 'Verify database path']
                );
            }
        });

    // Schedule subcommand
    const scheduleCommand = new Command('schedule');
    scheduleCommand
        .description('Configure dream schedule')
        .argument('<schedule-type>', 'after-session|periodic|manual')
        .option('--interval <n>', 'Interval for periodic (sessions)', parseInt)
        .option('--enable', 'Enable scheduled dreaming')
        .option('--disable', 'Disable scheduled dreaming')
        .action(async (scheduleType, options) => {
            const { outputFormat } = getCommandConfig(scheduleCommand);

            try {
                logger.info(`⏰ Configuring dream schedule: ${scheduleType}`);

                if (outputFormat === 'json') {
                    logger.json({
                        status: 'success',
                        action: 'dream-schedule',
                        scheduleType,
                        interval: options.interval,
                        enabled: !!options.enable
                    });
                } else {
                    console.log('⏰ Dream Schedule Configured');
                    console.log('─'.repeat(40));
                    console.log('Type:', scheduleType);
                    console.log('Interval:', options.interval || 'N/A');
                    console.log('Enabled:', options.enable ? 'Yes' : options.disable ? 'No' : 'Unchanged');
                }
            } catch (error) {
                throw new ConfigurationError(
                    `Failed to configure dream schedule: ${error instanceof Error ? error.message : String(error)}`,
                    undefined,
                    ['Check schedule type', 'Verify interval value']
                );
            }
        });

    // Status subcommand
    const statusCommand = new Command('status');
    statusCommand
        .description('Check dream status')
        .option('--last <n>', 'Show last N dream cycles', parseInt)
        .option('--metrics', 'Include consolidation metrics')
        .action(async (options) => {
            const { outputFormat } = getCommandConfig(statusCommand);

            try {
                logger.info('📊 Checking dream status...');

                // Initialize memory to query dream cycle history
                const memoryConfig = createDefaultDreamConfig();
                const memory = new AgentMemory(memoryConfig);

                // Query recent dream cycles from metadata
                const allCycles = await memory.reasoningBank.queryMetadata('dream-cycle', {});

                // Sort by timestamp (most recent first)
                const sortedCycles = allCycles
                    .map((cycle: any) => ({
                        id: cycle.sessionId || 'unknown',
                        timestamp: cycle.timestamp || Date.now(),
                        knowledgeGained: cycle.patterns || 0,
                        compressionRatio: cycle.compressionRatio || 0,
                        verificationStatus: cycle.verificationStatus || 'unknown'
                    }))
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, options.last || 5);

                const cycleCount = sortedCycles.length;
                const totalKnowledge = sortedCycles.reduce((sum, c) => sum + c.knowledgeGained, 0);

                if (outputFormat === 'json') {
                    logger.json({
                        status: 'success',
                        action: 'dream-status',
                        totalCycles: cycleCount,
                        totalKnowledge,
                        lastCycles: sortedCycles
                    });
                } else {
                    console.log('📊 Dream Status');
                    console.log('─'.repeat(40));
                    console.log(`Total Dream Cycles: ${cycleCount}`);
                    console.log(`Total Knowledge Consolidated: ${totalKnowledge} patterns`);

                    if (sortedCycles.length > 0) {
                        console.log('\nRecent Cycles:');
                        sortedCycles.forEach(cycle => {
                            console.log(`\nCycle: ${cycle.id}`);
                            console.log(`  Time: ${new Date(cycle.timestamp).toLocaleString()}`);
                            console.log(`  Knowledge: ${cycle.knowledgeGained} patterns`);
                            console.log(`  Compression: ${cycle.compressionRatio.toFixed(2)}x`);
                            console.log(`  Status: ${cycle.verificationStatus}`);
                        });
                    } else {
                        console.log('\nNo dream cycles found. Run "machine-dream dream run" to start consolidation.');
                    }
                }
            } catch (error) {
                throw new ConfigurationError(
                    `Failed to get dream status: ${error instanceof Error ? error.message : String(error)}`,
                    undefined,
                    ['Check database path', 'Verify system initialization', 'Try again later']
                );
            }
        });

    dreamCommand.addCommand(runCommand);
    dreamCommand.addCommand(scheduleCommand);
    dreamCommand.addCommand(statusCommand);

    program.addCommand(dreamCommand);
}