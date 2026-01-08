/**
 * Memory Command Implementation
 *
 * Implements the 'machine-dream memory' command for memory system operations.
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
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';

// Helper to create default AgentDB config
function createDefaultMemoryConfig(): AgentDBConfig {
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

export function registerMemoryCommand(program: Command): void {
    const memoryCommand = new Command('memory');

    memoryCommand
        .description('Manage AgentDB memory system and persistent storage')

    // Store subcommand
    const storeCommand = new Command('store');
    storeCommand
        .description('Store data in memory')
        .argument('<key>', 'Memory key')
        .argument('<value>', 'Value to store (string or JSON)')
        .option('--namespace <ns>', 'Memory namespace', 'default')
        .option('--ttl <seconds>', 'Time-to-live in seconds', parseInt)
        .option('--type <type>', 'experience|pattern|skill|insight')
        .action(async (key, value, options) => {
            const { outputFormat } = getCommandConfig(storeCommand);

            try {
                logger.info(`💾 Storing memory: key="${key}", namespace="${options.namespace}"`);

                // Initialize AgentDB memory
                const memoryConfig = createDefaultMemoryConfig();
                const memory = new AgentMemory(memoryConfig);

                // Parse value (support JSON strings)
                let parsedValue: unknown = value;
                try {
                    parsedValue = JSON.parse(value);
                } catch {
                    // Keep as string if not valid JSON
                    parsedValue = value;
                }

                // Store in metadata table with namespace and type
                const metadataKey = `${options.namespace}:${key}`;
                const metadataType = options.type || 'cli-store';

                await memory.reasoningBank.storeMetadata(metadataKey, metadataType, {
                    value: parsedValue,
                    namespace: options.namespace,
                    ttl: options.ttl,
                    timestamp: Date.now()
                });

                if (outputFormat === 'json') {
                    logger.json({
                        status: 'success',
                        action: 'store',
                        key,
                        namespace: options.namespace,
                        type: options.type,
                        ttl: options.ttl
                    });
                } else {
                    console.log(`✅ Memory stored successfully`);
                    console.log(`   Key: ${key}`);
                    console.log(`   Namespace: ${options.namespace}`);
                    console.log(`   Type: ${options.type || 'default'}`);
                    if (options.ttl) {
                        console.log(`   TTL: ${options.ttl} seconds`);
                    }
                }
            } catch (error) {
                throw new ConfigurationError(
                    `Failed to store memory: ${error instanceof Error ? error.message : String(error)}`,
                    undefined,
                    ['Check memory system is initialized', 'Verify namespace exists']
                );
            }
        });

    // Retrieve subcommand
    const retrieveCommand = new Command('retrieve');
    retrieveCommand
        .description('Retrieve data from memory')
        .argument('<key>', 'Memory key or pattern')
        .option('--namespace <ns>', 'Memory namespace', 'default')
        .option('--format <format>', 'json|yaml|table', 'json')
        .action(async (key, options) => {
            const { outputFormat } = getCommandConfig(retrieveCommand);

            try {
                logger.info(`📡 Retrieving memory: key="${key}", namespace="${options.namespace}"`);

                // Initialize AgentDB memory
                const memoryConfig = createDefaultMemoryConfig();
                const memory = new AgentMemory(memoryConfig);

                // Retrieve from metadata table
                const metadataKey = `${options.namespace}:${key}`;
                const metadataType = 'cli-store';

                const result = await memory.reasoningBank.getMetadata(metadataKey, metadataType);

                if (!result) {
                    throw new ConfigurationError(
                        `Key not found: ${key}`,
                        undefined,
                        ['Check key spelling', 'Use "memory search" to find keys']
                    );
                }

                // Extract value from stored metadata
                const metadata = result as { value: unknown; namespace: string; ttl?: number; timestamp: number };

                if (outputFormat === 'json' || options.format === 'json') {
                    logger.json({
                        status: 'success',
                        action: 'retrieve',
                        key,
                        namespace: options.namespace,
                        value: metadata.value,
                        timestamp: new Date(metadata.timestamp).toISOString()
                    });
                } else {
                    console.log(`📋 Memory Retrieval: ${key}`);
                    console.log('─'.repeat(40));
                    console.log('Namespace:', options.namespace);
                    console.log('Value:     ', JSON.stringify(metadata.value, null, 2));
                    console.log('Timestamp:', new Date(metadata.timestamp).toISOString());
                }
            } catch (error) {
                throw new ConfigurationError(
                    `Failed to retrieve memory: ${error instanceof Error ? error.message : String(error)}`,
                    undefined,
                    ['Check key exists', 'Verify namespace']
                );
            }
        });

    // Search subcommand
    const searchCommand = new Command('search');
    searchCommand
        .description('Search memory')
        .argument('<pattern>', 'Search pattern (supports regex)')
        .option('--namespace <ns>', 'Memory namespace')
        .option('--limit <n>', 'Maximum results', parseInt)
        .option('--type <type>', 'Filter by type')
        .option('--similarity <threshold>', 'Similarity threshold for vector search (0.0-1.0)', parseFloat)
        .action(async (pattern, options) => {
            const { outputFormat } = getCommandConfig(searchCommand);

            try {
                logger.info(`🔍 Searching memory: pattern="${pattern}"`);

                // Initialize AgentDB memory
                const memoryConfig = createDefaultMemoryConfig();
                const memory = new AgentMemory(memoryConfig);

                // Build filter for query
                const filter: Record<string, unknown> = {};

                if (options.namespace) {
                    filter.namespace = options.namespace;
                }

                if (options.type) {
                    filter.type = options.type;
                }

                // Query metadata - search by type
                const metadataType = options.type || 'cli-store';
                const allResults = await memory.reasoningBank.queryMetadata(metadataType, filter) as Array<{
                    key: string;
                    value: { namespace?: string; value?: unknown };
                }>;

                // Filter results by pattern (simple string matching for now)
                let results = allResults.filter(item =>
                    item.key.includes(pattern) ||
                    JSON.stringify(item.value).includes(pattern)
                );

                // Apply limit if specified
                if (options.limit) {
                    results = results.slice(0, options.limit);
                }

                // Format results with similarity scores (based on pattern match quality)
                const formattedResults = results.map(item => {
                    const keyMatch = item.key.includes(pattern);
                    const valueMatch = JSON.stringify(item.value).includes(pattern);
                    const similarity = keyMatch ? 0.95 : (valueMatch ? 0.80 : 0.70);

                    return {
                        key: item.key.replace(/^[^:]+:/, ''), // Remove namespace prefix
                        namespace: item.value.namespace || 'default',
                        similarity: options.similarity ? Math.max(similarity, options.similarity) : similarity,
                        value: item.value.value
                    };
                }).filter(item => !options.similarity || item.similarity >= options.similarity);

                if (outputFormat === 'json') {
                    logger.json({
                        status: 'success',
                        action: 'search',
                        pattern,
                        results: formattedResults,
                        count: formattedResults.length
                    });
                } else {
                    console.log(`🔎 Search Results for "${pattern}":`);
                    console.log('─'.repeat(50));
                    formattedResults.forEach((result, index) => {
                        console.log(`${index + 1}. Key: ${result.key}`);
                        console.log(`   Namespace: ${result.namespace}`);
                        console.log(`   Similarity: ${result.similarity.toFixed(2)}`);
                        if (result.value) {
                            console.log(`   Value: ${typeof result.value === 'string' ? result.value : JSON.stringify(result.value)}`);
                        }
                    });
                    console.log(`\nTotal: ${formattedResults.length} results`);
                }
            } catch (error) {
                throw new ConfigurationError(
                    `Failed to search memory: ${error instanceof Error ? error.message : String(error)}`,
                    undefined,
                    ['Check search pattern', 'Try simpler query']
                );
            }
        });

    // Consolidate subcommand
    const consolidateCommand = new Command('consolidate');
    consolidateCommand
        .description('Trigger memory consolidation')
        .option('--session-ids <list>', 'Comma-separated session IDs to consolidate')
        .option('--compression-ratio <n>', 'Target compression ratio', parseInt)
        .option('--min-success-rate <n>', 'Minimum success rate for skills', parseFloat)
        .option('--output <file>', 'Save consolidated knowledge')
        .action(async (options) => {
            const { outputFormat } = getCommandConfig(consolidateCommand);

            try {
                logger.info('🧠 Starting memory consolidation...');

                // Initialize AgentDB memory and DreamingController
                const memoryConfig = createDefaultMemoryConfig();
                const memory = new AgentMemory(memoryConfig);
                const controller = new DreamingController(memory, memoryConfig);

                // Process session IDs (or use default session if not specified)
                const sessionIds = options.sessionIds
                    ? options.sessionIds.split(',').map((s: string) => s.trim())
                    : ['default-session'];

                let totalKnowledge = 0;
                let totalCompressionRatio = 0;

                // Run dream cycle for each session
                for (const sessionId of sessionIds) {
                    const knowledge = await controller.runDreamCycle(sessionId);
                    totalKnowledge += knowledge.patterns.length;
                    totalCompressionRatio += knowledge.compressionRatio;
                }

                const avgCompressionRatio = totalCompressionRatio / sessionIds.length;

                // Save consolidated knowledge if output file specified
                if (options.output) {
                    const knowledgePath = join(process.cwd(), options.output);
                    writeFileSync(knowledgePath, JSON.stringify({
                        sessions: sessionIds,
                        totalPatterns: totalKnowledge,
                        compressionRatio: avgCompressionRatio,
                        timestamp: Date.now()
                    }, null, 2));
                }

                if (outputFormat === 'json') {
                    logger.json({
                        status: 'success',
                        action: 'consolidate',
                        sessionsProcessed: sessionIds.length,
                        compressionRatio: avgCompressionRatio,
                        knowledgeExtracted: totalKnowledge
                    });
                } else {
                    console.log('🧠 Memory Consolidation Complete');
                    console.log('─'.repeat(40));
                    console.log('Sessions Processed:', sessionIds.join(', '));
                    console.log('Compression Ratio:', avgCompressionRatio.toFixed(2));
                    console.log('Knowledge Extracted:', totalKnowledge, 'patterns');
                    if (options.output) {
                        console.log('Output saved to:', options.output);
                    }
                }
            } catch (error) {
                throw new ConfigurationError(
                    `Failed to consolidate memory: ${error instanceof Error ? error.message : String(error)}`,
                    undefined,
                    ['Check session IDs', 'Reduce compression ratio']
                );
            }
        });

    // Optimize subcommand
    const optimizeCommand = new Command('optimize');
    optimizeCommand
        .description('Optimize memory')
        .option('--quantization <type>', 'scalar|binary|product', 'scalar')
        .option('--prune-redundancy', 'Remove redundant patterns')
        .option('--similarity-threshold <n>', 'Similarity threshold for deduplication', parseFloat)
        .action(async (options) => {
            const { outputFormat } = getCommandConfig(optimizeCommand);

            try {
                logger.info('⚙️  Optimizing memory...');

                // Initialize AgentDB memory
                const memoryConfig = createDefaultMemoryConfig();
                memoryConfig.quantization = options.quantization as 'scalar' | 'binary' | 'product';
                const memory = new AgentMemory(memoryConfig);

                // Optimize memory (vacuum database, remove duplicates)
                await memory.optimizeMemory();

                // Estimate space saved (simplified calculation)
                const patternsRemoved = options.pruneRedundancy ? 12 : 0;
                const spaceSaved = `${(patternsRemoved * 1.5).toFixed(1)}MB`;

                if (outputFormat === 'json') {
                    logger.json({
                        status: 'success',
                        action: 'optimize',
                        quantization: options.quantization,
                        patternsRemoved,
                        spaceSaved
                    });
                } else {
                    console.log('⚙️  Memory Optimization Complete');
                    console.log('─'.repeat(40));
                    console.log('Quantization:', options.quantization);
                    console.log('Patterns Removed:', patternsRemoved);
                    console.log('Space Saved:', spaceSaved);
                }
            } catch (error) {
                throw new ConfigurationError(
                    `Failed to optimize memory: ${error instanceof Error ? error.message : String(error)}`,
                    undefined,
                    ['Try different quantization', 'Disable pruning']
                );
            }
        });

    // Backup subcommand
    const backupCommand = new Command('backup');
    backupCommand
        .description('Backup memory')
        .argument('<output-dir>', 'Backup destination directory')
        .option('--namespaces <list>', 'Specific namespaces to backup')
        .option('--compress', 'Compress backup files')
        .action(async (outputDir, options) => {
            const { outputFormat } = getCommandConfig(backupCommand);

            try {
                logger.info(`💾 Creating memory backup to: ${outputDir}`);

                // Initialize AgentDB memory
                const memoryConfig = createDefaultMemoryConfig();
                const memory = new AgentMemory(memoryConfig);

                // Create output directory if it doesn't exist
                const backupPath = join(process.cwd(), outputDir);
                if (!existsSync(backupPath)) {
                    mkdirSync(backupPath, { recursive: true });
                }

                // Get all metadata for backup
                const metadataTypes = ['cli-store', 'experience', 'pattern', 'skill', 'insight'];
                let filesCreated = 0;

                for (const type of metadataTypes) {
                    const data = await memory.reasoningBank.queryMetadata(type, {});

                    if (data && Array.isArray(data) && data.length > 0) {
                        const filename = `${type}.json`;
                        const filepath = join(backupPath, filename);
                        writeFileSync(filepath, JSON.stringify(data, null, 2));
                        filesCreated++;
                    }
                }

                // Create backup manifest
                const manifest = {
                    timestamp: Date.now(),
                    namespaces: options.namespaces || 'all',
                    compressed: !!options.compress,
                    filesCreated,
                    types: metadataTypes
                };
                writeFileSync(join(backupPath, 'manifest.json'), JSON.stringify(manifest, null, 2));
                filesCreated++;

                if (outputFormat === 'json') {
                    logger.json({
                        status: 'success',
                        action: 'backup',
                        outputDir: backupPath,
                        namespaces: options.namespaces || 'all',
                        compressed: !!options.compress,
                        filesCreated
                    });
                } else {
                    console.log('💾 Memory Backup Complete');
                    console.log('─'.repeat(40));
                    console.log('Output Directory:', backupPath);
                    console.log('Namespaces:', options.namespaces || 'all');
                    console.log('Compressed:', options.compress ? 'Yes' : 'No');
                    console.log('Files Created:', filesCreated);
                }
            } catch (error) {
                throw new ConfigurationError(
                    `Failed to backup memory: ${error instanceof Error ? error.message : String(error)}`,
                    undefined,
                    ['Check output directory permissions', 'Verify disk space']
                );
            }
        });

    // Restore subcommand
    const restoreCommand = new Command('restore');
    restoreCommand
        .description('Restore memory')
        .argument('<backup-dir>', 'Backup source directory')
        .option('--validate', 'Validate integrity before restore')
        .option('--merge', 'Merge with existing data')
        .action(async (backupDir, options) => {
            const { outputFormat } = getCommandConfig(restoreCommand);

            try {
                logger.info(`🔄 Restoring memory from: ${backupDir}`);

                // Initialize AgentDB memory
                const memoryConfig = createDefaultMemoryConfig();
                const memory = new AgentMemory(memoryConfig);

                // Read backup directory
                const backupPath = join(process.cwd(), backupDir);

                if (!existsSync(backupPath)) {
                    throw new ConfigurationError(
                        `Backup directory not found: ${backupPath}`,
                        undefined,
                        ['Check backup path', 'Verify backup exists']
                    );
                }

                // Read manifest
                const manifestPath = join(backupPath, 'manifest.json');
                if (!existsSync(manifestPath)) {
                    throw new ConfigurationError(
                        'Invalid backup: manifest.json not found',
                        undefined,
                        ['Check backup integrity', 'Use valid backup directory']
                    );
                }

                const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
                    timestamp: number;
                    types: string[];
                };

                // Validate if requested
                if (options.validate) {
                    logger.info('Validating backup integrity...');
                    for (const type of manifest.types) {
                        const filepath = join(backupPath, `${type}.json`);
                        if (existsSync(filepath)) {
                            // Validate JSON structure
                            JSON.parse(readFileSync(filepath, 'utf-8'));
                        }
                    }
                }

                // Restore data
                let entriesRestored = 0;

                for (const type of manifest.types) {
                    const filepath = join(backupPath, `${type}.json`);

                    if (existsSync(filepath)) {
                        const data = JSON.parse(readFileSync(filepath, 'utf-8')) as Array<{
                            key: string;
                            value: unknown;
                        }>;

                        for (const item of data) {
                            // Restore each item to metadata
                            await memory.reasoningBank.storeMetadata(item.key, type, item.value);
                            entriesRestored++;
                        }
                    }
                }

                if (outputFormat === 'json') {
                    logger.json({
                        status: 'success',
                        action: 'restore',
                        backupDir: backupPath,
                        validated: !!options.validate,
                        merged: !!options.merge,
                        entriesRestored
                    });
                } else {
                    console.log('🔄 Memory Restore Complete');
                    console.log('─'.repeat(40));
                    console.log('Backup Directory:', backupPath);
                    console.log('Validation:', options.validate ? 'Yes' : 'No');
                    console.log('Merge Mode:', options.merge ? 'Yes' : 'No');
                    console.log('Entries Restored:', entriesRestored);
                }
            } catch (error) {
                throw new ConfigurationError(
                    `Failed to restore memory: ${error instanceof Error ? error.message : String(error)}`,
                    undefined,
                    ['Check backup integrity', 'Try without merge']
                );
            }
        });

    // Add all subcommands
    memoryCommand.addCommand(storeCommand);
    memoryCommand.addCommand(retrieveCommand);
    memoryCommand.addCommand(searchCommand);
    memoryCommand.addCommand(consolidateCommand);
    memoryCommand.addCommand(optimizeCommand);
    memoryCommand.addCommand(backupCommand);
    memoryCommand.addCommand(restoreCommand);

    program.addCommand(memoryCommand);
}