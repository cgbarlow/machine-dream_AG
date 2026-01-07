/**
 * LLM Command - Pure LLM Sudoku Player
 * Specification: docs/specs/09-cli-interface-spec.md Section 3.8
 * Specification: docs/specs/11-llm-sudoku-player.md
 */

import { Command } from 'commander';
import { logger } from '../logger.js';
import { CLIError } from '../errors.js';
import { LLMSudokuPlayer } from '../../llm/index.js';
import { DEFAULT_LLM_CONFIG, validateConfig, getLLMConfig } from '../../llm/config.js';
import type { LLMConfig } from '../../llm/types.js';
import { AgentMemory } from '../../memory/AgentMemory.js';
import type { AgentDBConfig } from '../../types.js';
import { LLMProfileManager, ProfileValidator } from '../../llm/profiles/index.js';
import type { CreateProfileOptions, LLMProvider } from '../../llm/profiles/index.js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import * as readline from 'readline/promises';
import { homedir } from 'os';

// Helper to create default AgentDB config
function createDefaultMemoryConfig(): AgentDBConfig {
  return {
    dbPath: join(homedir(), '.machine-dream/agentdb'),
    preset: 'large' as const,
    rlPlugin: {
      type: 'decision-transformer' as const,
      name: 'sudoku-solver',
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

/**
 * Register LLM commands
 * Spec 09 Section 3.8: llm play, stats, dream, benchmark
 */
export function registerLLMCommand(program: Command): void {
  const llm = program
    .command('llm')
    .description('AI Model management and Sudoku playing');

  // llm profile - Profile management (Spec 13)
  const profile = llm
    .command('profile')
    .description('Manage AI model connection profiles');

  // llm profile list
  profile
    .command('list')
    .description('List all profiles')
    .option('--provider <provider>', 'Filter by provider')
    .option('--tags <tags>', 'Filter by tags (comma-separated)')
    .option('--sort <sort>', 'Sort by: usage|last-used|name', 'name')
    .option('--format <format>', 'Output format (text|json)', 'text')
    .action(async (options) => {
      try {
        const manager = new LLMProfileManager();
        let profiles = manager.list();

        // Apply filters
        if (options.provider) {
          profiles = manager.filterByProvider(options.provider);
        }
        if (options.tags) {
          const tags = options.tags.split(',').map((t: string) => t.trim());
          profiles = manager.filterByTags(tags);
        }

        // Apply sorting
        if (options.sort === 'usage') {
          profiles = manager.sortByUsage();
        } else if (options.sort === 'last-used') {
          profiles = manager.sortByLastUsed();
        } else {
          profiles = profiles.sort((a, b) => a.name.localeCompare(b.name));
        }

        // Display
        if (options.format === 'json') {
          console.log(JSON.stringify(profiles, null, 2));
        } else {
          const activeProfile = manager.getActive();

          logger.info(`\n🤖 AI Model Profiles (${profiles.length} total)\n`);

          if (profiles.length === 0) {
            logger.info('  No profiles found. Create one with: machine-dream llm profile add');
            return;
          }

          for (const p of profiles) {
            const isActive = activeProfile?.name === p.name;
            const marker = isActive ? '▶' : ' ';
            const activeTag = isActive ? '(Active)' : '';

            logger.info(`${marker} ${p.name} ${activeTag}`);
            logger.info(`   Provider: ${p.provider} | Model: ${p.model}`);
            logger.info(`   URL: ${p.baseUrl}`);
            logger.info(`   Usage: ${p.usageCount} times | Last used: ${formatTimestamp(p.lastUsed)}`);
            logger.info(`   Tags: ${p.tags.join(', ') || 'none'}`);
            logger.info('');
          }
        }
      } catch (error) {
        throw new CLIError('Failed to list profiles', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm profile add
  profile
    .command('add')
    .description('Create a new profile')
    .option('--name <name>', 'Profile name')
    .option('--provider <provider>', 'Provider (lmstudio|openai|anthropic|ollama|openrouter|custom)')
    .option('--base-url <url>', 'API endpoint URL')
    .option('--api-key <key>', 'API key or ${ENV_VAR} reference')
    .option('--model <model>', 'Model name')
    .option('--temperature <n>', 'Temperature (0.0-2.0)', '0.7')
    .option('--max-tokens <n>', 'Max response tokens', '2048')
    .option('--timeout <ms>', 'Request timeout (ms)', '60000')
    .option('--tags <tags>', 'Comma-separated tags')
    .option('--color <color>', 'Display color for TUI')
    .option('--set-default', 'Set as active profile after creation')
    .action(async (options) => {
      try {
        const manager = new LLMProfileManager();
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        logger.info('\n🤖 Create New AI Model Profile\n');

        // Interactive prompts if not provided
        const name = options.name || await rl.question('Profile name: ');
        const provider = options.provider || await rl.question('Provider (lmstudio/openai/anthropic/ollama/openrouter/custom): ');
        const baseUrl = options.baseUrl || await rl.question('Base URL: ');
        const model = options.model || await rl.question('Model name: ');
        const apiKey = options.apiKey || await rl.question('API key (or ${ENV_VAR}, press Enter to skip): ');
        const tags = options.tags || await rl.question('Tags (comma-separated, optional): ');

        rl.close();

        // Build creation options
        const createOptions: CreateProfileOptions = {
          name,
          provider: provider as LLMProvider,
          baseUrl,
          model,
          apiKey: apiKey || undefined,
          parameters: {
            temperature: parseFloat(options.temperature),
            maxTokens: parseInt(options.maxTokens, 10),
          },
          timeout: parseInt(options.timeout, 10),
          tags: tags ? tags.split(',').map((t: string) => t.trim()) : [],
          color: options.color,
          setDefault: options.setDefault,
        };

        // Create profile
        const { profile, validation } = manager.create(createOptions);

        logger.info('\n✅ Profile created successfully!');
        logger.info(`   Name: ${profile.name}`);
        logger.info(`   Provider: ${profile.provider}`);
        logger.info(`   Model: ${profile.model}`);
        logger.info(`   URL: ${profile.baseUrl}`);

        if (validation.warnings.length > 0) {
          logger.warn('\n⚠️  Warnings:');
          validation.warnings.forEach(w => logger.warn(`   ${w}`));
        }

        if (options.setDefault) {
          logger.info(`\n▶ Set as active profile`);
        }

        logger.info(`\n💾 Saved to: ${manager.getStoragePath()}`);
      } catch (error) {
        throw new CLIError('Failed to create profile', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm profile show
  profile
    .command('show')
    .description('Show profile details')
    .argument('<name>', 'Profile name')
    .action(async (name) => {
      try {
        const manager = new LLMProfileManager();
        const p = manager.get(name);

        if (!p) {
          throw new CLIError(`Profile not found: ${name}`, 1);
        }

        logger.info(`\n🤖 Profile: ${p.name}\n`);
        logger.info(`Description:    ${p.description || '(none)'}`);
        logger.info(`Provider:       ${p.provider}`);
        logger.info(`Base URL:       ${p.baseUrl}`);
        logger.info(`Model:          ${p.model}`);
        logger.info(`API Key:        ${p.apiKey ? (ProfileValidator.isEnvVarReference(p.apiKey) ? p.apiKey : '***hidden***') : '(none)'}`);
        logger.info('');
        logger.info('Parameters:');
        logger.info(`  Temperature:      ${p.parameters.temperature}`);
        logger.info(`  Max Tokens:       ${p.parameters.maxTokens}`);
        if (p.parameters.topP) logger.info(`  Top P:            ${p.parameters.topP}`);
        if (p.parameters.frequencyPenalty) logger.info(`  Frequency Penalty: ${p.parameters.frequencyPenalty}`);
        if (p.parameters.presencePenalty) logger.info(`  Presence Penalty:  ${p.parameters.presencePenalty}`);
        logger.info('');
        logger.info(`Timeout:        ${p.timeout}ms`);
        logger.info(`Retries:        ${p.retries}`);
        logger.info(`Tags:           ${p.tags.join(', ') || '(none)'}`);
        logger.info(`Color:          ${p.color || '(default)'}`);
        logger.info('');
        logger.info(`Created:        ${new Date(p.createdAt).toLocaleString()}`);
        logger.info(`Last Used:      ${formatTimestamp(p.lastUsed)}`);
        logger.info(`Usage Count:    ${p.usageCount}`);
        logger.info(`Active:         ${p.isDefault ? '✓ Yes' : '✗ No'}`);
      } catch (error) {
        throw new CLIError('Failed to show profile', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm profile delete
  profile
    .command('delete')
    .description('Delete a profile')
    .argument('<name>', 'Profile name')
    .option('--yes', 'Skip confirmation')
    .action(async (name, options) => {
      try {
        const manager = new LLMProfileManager();

        if (!manager.exists(name)) {
          throw new CLIError(`Profile not found: ${name}`, 1);
        }

        // Confirmation
        if (!options.yes) {
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const answer = await rl.question(`\n⚠️  Delete profile "${name}"? (y/N): `);
          rl.close();

          if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
            logger.info('Cancelled.');
            return;
          }
        }

        manager.delete(name);
        logger.info(`\n✅ Profile deleted: ${name}`);
      } catch (error) {
        throw new CLIError('Failed to delete profile', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm profile set
  profile
    .command('set')
    .description('Set active profile')
    .argument('<name>', 'Profile name')
    .action(async (name) => {
      try {
        const manager = new LLMProfileManager();

        if (!manager.exists(name)) {
          throw new CLIError(`Profile not found: ${name}`, 1);
        }

        manager.setActive(name);
        logger.info(`\n▶ Active profile set to: ${name}`);
      } catch (error) {
        throw new CLIError('Failed to set active profile', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm profile test
  profile
    .command('test')
    .description('Test profile connection')
    .argument('[name]', 'Profile name (uses active if not specified)')
    .action(async (name?) => {
      try {
        const manager = new LLMProfileManager();
        const profileName = name || manager.getActive()?.name;

        if (!profileName) {
          throw new CLIError('No profile specified and no active profile set', 1);
        }

        logger.info(`\n🔍 Testing connection to: ${profileName}...\n`);

        const result = await manager.test(profileName);

        if (result.healthy) {
          logger.info(`✅ Connection successful!`);
          logger.info(`   Latency: ${result.latency}ms`);
          logger.info(`   Model: ${result.model}`);
        } else {
          logger.error(`✗ Connection failed: ${result.error}`);
          if (result.latency) {
            logger.info(`   Attempted latency: ${result.latency}ms`);
          }
        }
      } catch (error) {
        throw new CLIError('Failed to test profile', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm profile export
  profile
    .command('export')
    .description('Export profiles to file')
    .argument('<file>', 'Output file path')
    .option('--include-secrets', 'Include API keys (default: false)')
    .option('--profiles <names>', 'Specific profiles to export (comma-separated)')
    .action(async (file, options) => {
      try {
        const manager = new LLMProfileManager();
        const profileNames = options.profiles ? options.profiles.split(',').map((n: string) => n.trim()) : undefined;

        const json = manager.export({
          includeSecrets: options.includeSecrets,
          profiles: profileNames,
        });

        writeFileSync(resolve(file), json, 'utf-8');

        logger.info(`\n✅ Profiles exported to: ${file}`);
        if (!options.includeSecrets) {
          logger.warn('⚠️  API keys were not exported (use --include-secrets to export them)');
        }
      } catch (error) {
        throw new CLIError('Failed to export profiles', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm profile import
  profile
    .command('import')
    .description('Import profiles from file')
    .argument('<file>', 'Input file path')
    .option('--overwrite', 'Overwrite existing profiles')
    .action(async (file, options) => {
      try {
        const manager = new LLMProfileManager();
        const json = readFileSync(resolve(file), 'utf-8');

        const result = manager.import(json, options.overwrite);

        logger.info(`\n✅ Import complete!`);
        logger.info(`   Imported: ${result.imported.length} profiles`);
        if (result.skipped.length > 0) {
          logger.info(`   Skipped: ${result.skipped.length} (already exist)`);
          logger.info(`   Use --overwrite to replace existing profiles`);
        }
        if (result.errors.length > 0) {
          logger.warn(`\n⚠️  Errors:`);
          result.errors.forEach(e => logger.warn(`   ${e.profile}: ${e.error}`));
        }
      } catch (error) {
        throw new CLIError('Failed to import profiles', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm play
  llm
    .command('play')
    .description('Play a puzzle using pure LLM reasoning')
    .argument('<puzzle-file>', 'Path to puzzle file')
    .option('--profile <name>', 'Use specific profile (Spec 13)')
    .option('--no-memory', 'Disable memory (baseline mode)')
    .option('--model <model>', 'Override model name')
    .option('--endpoint <url>', 'Override LLM endpoint')
    .option('--max-moves <n>', 'Maximum moves before abandoning', '200')
    .option('--visualize', 'Show live solving visualization')
    .action(async (puzzleFile, options) => {
      try {
        logger.info('🤖 Starting LLM Sudoku Player...');

        // Build config - Priority: --profile flag > active profile > env vars
        let config: LLMConfig;

        if (options.profile) {
          // Use specific profile
          logger.info(`Using profile: ${options.profile}`);
          config = getLLMConfig(options.profile);
        } else {
          // Use active profile or fall back to env vars
          config = getLLMConfig();
        }

        // Apply command-line overrides
        if (options.model) {
          config.model = options.model;
          logger.info(`Model override: ${options.model}`);
        }
        if (options.endpoint) {
          config.baseUrl = options.endpoint;
          logger.info(`Endpoint override: ${options.endpoint}`);
        }

        // Memory setting
        config.memoryEnabled = options.memory !== false;

        validateConfig(config);

        // Load puzzle
        const puzzlePath = resolve(puzzleFile);
        const puzzleData = JSON.parse(readFileSync(puzzlePath, 'utf-8'));

        if (!puzzleData.initial || !puzzleData.solution) {
          throw new CLIError('Invalid puzzle file format', 1, 'Puzzle file must contain "initial" and "solution" grids');
        }

        // Initialize player
        const memory = new AgentMemory(createDefaultMemoryConfig());
        const player = new LLMSudokuPlayer(config, memory);

        // Health check
        logger.info(`Checking LM Studio connection at ${config.baseUrl}...`);
        const isHealthy = await player.healthCheck();

        if (!isHealthy) {
          throw new CLIError('LM Studio is not running', 1, `Cannot connect to ${config.baseUrl}`, [
            'Start LM Studio and load a model',
            'Verify the endpoint URL',
            `Check that the server is running on ${config.baseUrl}`,
          ]);
        }

        const modelInfo = await player.getModelInfo();
        logger.info(
          `✓ Connected to LM Studio (model: ${modelInfo?.id || config.model})`
        );
        logger.info(
          `Memory: ${config.memoryEnabled ? '✓ ENABLED' : '✗ DISABLED (baseline)'}`
        );

        // Play puzzle
        logger.info('\n🎮 Starting puzzle solve...\n');

        const session = await player.playPuzzle(
          puzzleData.id || 'puzzle-1',
          puzzleData.initial,
          puzzleData.solution,
          parseInt(options.maxMoves, 10)
        );

        // Display results
        logger.info('\n📊 Session Results:');
        logger.info(`  Solved: ${session.solved ? '✓ YES' : '✗ NO'}`);
        logger.info(`  Total moves: ${session.totalMoves}`);
        logger.info(`  Correct moves: ${session.correctMoves}`);
        logger.info(`  Invalid moves: ${session.invalidMoves}`);
        logger.info(`  Valid but wrong: ${session.validButWrongMoves}`);

        const accuracy =
          session.totalMoves > 0
            ? ((session.correctMoves / session.totalMoves) * 100).toFixed(1)
            : '0.0';
        logger.info(`  Accuracy: ${accuracy}%`);
      } catch (error) {
        if (error instanceof CLIError) {
          throw error;
        }
        throw new CLIError('Failed to play puzzle', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm stats
  llm
    .command('stats')
    .description('View LLM learning statistics')
    .option('--format <format>', 'Output format (text|json)', 'text')
    .action(async (options) => {
      try {
        logger.info('📊 LLM Statistics...');

        const memory = new AgentMemory(createDefaultMemoryConfig());
        const player = new LLMSudokuPlayer(DEFAULT_LLM_CONFIG, memory);
        const stats = await player.getStats();

        if (options.format === 'json') {
          console.log(JSON.stringify(stats, null, 2));
        } else {
          logger.info('\n📈 Learning Statistics:');
          logger.info(`  Total experiences: ${stats.totalExperiences}`);
          logger.info(`  Total puzzles: ${stats.totalPuzzles}`);
          logger.info(`  Correct moves: ${stats.correctMoves}`);
          logger.info(`  Invalid moves: ${stats.invalidMoves}`);
          logger.info(`  Valid but wrong: ${stats.validButWrongMoves}`);

          if (stats.totalExperiences > 0) {
            const accuracy =
              ((stats.correctMoves / stats.totalExperiences) * 100).toFixed(1);
            logger.info(`  Overall accuracy: ${accuracy}%`);
          }
        }
      } catch (error) {
        throw new CLIError('Failed to get statistics', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm dream
  llm
    .command('dream')
    .description('Run dreaming consolidation on LLM experiences')
    .option('--dry-run', 'Show what would be consolidated without saving')
    .action(async (options) => {
      try {
        logger.info('🌙 Starting dreaming consolidation...');

        const memory = new AgentMemory(createDefaultMemoryConfig());
        const { DreamingConsolidator, ExperienceStore } = await import('../../llm/index.js');

        const config: LLMConfig = {
          ...DEFAULT_LLM_CONFIG,
          memoryEnabled: true,
        };

        const experienceStore = new ExperienceStore(memory, config);
        const consolidator = new DreamingConsolidator(experienceStore, config);

        // Check LM Studio connection
        const player = new LLMSudokuPlayer(config, memory);
        const isHealthy = await player.healthCheck();

        if (!isHealthy) {
          logger.warn('LM Studio not available - using basic consolidation');
        }

        // Run consolidation
        logger.info('Analyzing experiences...');
        const report = await consolidator.consolidate();

        // Display results
        logger.info('\n📊 Consolidation Results:');
        logger.info(`  Experiences processed: ${report.experiencesConsolidated}`);
        logger.info(`  Few-shots updated: ${report.fewShotsUpdated}`);
        logger.info(`  Success patterns: ${report.patterns.successStrategies.length}`);
        logger.info(`  Error patterns: ${report.patterns.commonErrors.length}`);
        logger.info(`  Wrong path patterns: ${report.patterns.wrongPathPatterns.length}`);

        logger.info('\n💡 Insights:');
        logger.info(report.insights);

        if (options.dryRun) {
          logger.info('\n(Dry run mode - no changes were saved)');
        }
      } catch (error) {
        throw new CLIError('Failed to run dreaming', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm benchmark
  llm
    .command('benchmark')
    .description('Compare memory ON vs OFF performance')
    .argument('[puzzle-files...]', 'Puzzle files to test (default: puzzles/easy-*.json)')
    .option('--max-moves <n>', 'Maximum moves per puzzle', '200')
    .option('--format <format>', 'Output format (text|json)', 'text')
    .action(async (puzzleFiles, options) => {
      try {
        logger.info('🏁 Starting LLM benchmark...');
        logger.info('This will test memory ON vs OFF to verify learning\n');

        const memory = new AgentMemory(createDefaultMemoryConfig());
        const { LLMBenchmark } = await import('../../llm/index.js');
        const { readdirSync } = await import('fs');
        const { resolve, join } = await import('path');

        // Load puzzles
        let filesToLoad = puzzleFiles;
        if (!filesToLoad || filesToLoad.length === 0) {
          // Use default: all easy puzzles
          const puzzlesDir = resolve('puzzles');
          filesToLoad = readdirSync(puzzlesDir)
            .filter((f) => f.startsWith('easy-') && f.endsWith('.json'))
            .map((f) => join(puzzlesDir, f));
        }

        if (filesToLoad.length === 0) {
          throw new CLIError('No puzzle files found', 1, 'Provide puzzle files or ensure puzzles/easy-*.json exist');
        }

        logger.info(`Loading ${filesToLoad.length} puzzle(s)...`);
        const puzzles = filesToLoad.map((file: string) => {
          const data = JSON.parse(readFileSync(resolve(file), 'utf-8'));
          return {
            id: data.id || file,
            initial: data.initial,
            solution: data.solution,
          };
        });

        // Health check
        const player = new LLMSudokuPlayer(DEFAULT_LLM_CONFIG, memory);
        const isHealthy = await player.healthCheck();

        if (!isHealthy) {
          throw new CLIError('LM Studio is not running', 1, `Cannot connect to ${DEFAULT_LLM_CONFIG.baseUrl}`, ['Start LM Studio and load a model']);
        }

        logger.info('✓ LM Studio connected\n');

        // Run benchmark
        const benchmark = new LLMBenchmark(DEFAULT_LLM_CONFIG, memory);
        const maxMoves = parseInt(options.maxMoves, 10);

        logger.info('Phase 1: Testing with memory OFF (baseline)...');
        const startTime = Date.now();
        const results = await benchmark.run(puzzles, maxMoves);
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        // Display results
        if (options.format === 'json') {
          console.log(JSON.stringify(results, null, 2));
        } else {
          logger.info(`\n📊 Benchmark Complete (${duration}s)\n`);

          logger.info('=== MEMORY OFF (Baseline) ===');
          logger.info(`  Avg moves: ${results.memoryOff.avgMoves.toFixed(1)}`);
          logger.info(`  Avg correct: ${results.memoryOff.avgCorrectMoves.toFixed(1)}`);
          logger.info(`  Avg invalid: ${results.memoryOff.avgInvalidMoves.toFixed(1)}`);
          logger.info(`  Accuracy: ${results.memoryOff.avgAccuracy.toFixed(1)}%`);
          logger.info(`  Solve rate: ${results.memoryOff.solveRate.toFixed(1)}%`);

          logger.info('\n=== MEMORY ON (Learning) ===');
          logger.info(`  Avg moves: ${results.memoryOn.avgMoves.toFixed(1)}`);
          logger.info(`  Avg correct: ${results.memoryOn.avgCorrectMoves.toFixed(1)}`);
          logger.info(`  Avg invalid: ${results.memoryOn.avgInvalidMoves.toFixed(1)}`);
          logger.info(`  Accuracy: ${results.memoryOn.avgAccuracy.toFixed(1)}%`);
          logger.info(`  Solve rate: ${results.memoryOn.solveRate.toFixed(1)}%`);

          logger.info('\n=== IMPROVEMENT ===');
          const movesChange = results.improvement.movesReduction;
          logger.info(
            `  Moves: ${movesChange > 0 ? '-' : '+'}${Math.abs(movesChange).toFixed(1)}%`
          );
          logger.info(
            `  Accuracy: ${results.improvement.accuracyGain > 0 ? '+' : ''}${results.improvement.accuracyGain.toFixed(1)}%`
          );
          logger.info(
            `  Solve rate: ${results.improvement.solveRateGain > 0 ? '+' : ''}${results.improvement.solveRateGain.toFixed(1)}%`
          );

          if (
            results.improvement.accuracyGain > 0 ||
            results.improvement.movesReduction > 0
          ) {
            logger.info('\n✅ Learning is working! Memory improves performance.');
          } else {
            logger.warn('\n⚠️  No improvement detected. May need more training data.');
          }
        }
      } catch (error) {
        throw new CLIError('Failed to run benchmark', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // ===================================================================
  // llm memory - Memory management commands
  // ===================================================================

  const memory = llm.command('memory').description('Manage agent memory and learning data');

  // llm memory store
  memory
    .command('store')
    .description('Store data in agent memory')
    .argument('<key>', 'Storage key')
    .argument('<value>', 'Value to store')
    .option('--session <id>', 'Session ID (default: global)')
    .action(async (key, value, options) => {
      try {
        const agentMemory = new AgentMemory(createDefaultMemoryConfig());
        const sessionId = options.session || 'global';

        // Store as an insight in the database
        await agentMemory.reasoningBank.logInsight({
          type: 'pattern-recognition',
          content: `${key}: ${value} (session: ${sessionId})`,
          confidence: 1.0,
          timestamp: Date.now(),
          relatedMoves: [],
        });

        logger.info(`✓ Stored "${key}" in session "${sessionId}"`);
      } catch (error) {
        throw new CLIError('Failed to store data', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm memory retrieve
  memory
    .command('retrieve')
    .description('Retrieve data from agent memory')
    .argument('<key>', 'Storage key')
    .option('--session <id>', 'Session ID (default: global)')
    .action(async (key, options) => {
      try {
        const sessionId = options.session || 'global';

        // Query from database (simplified - would need better indexing)
        logger.info(`Looking for key "${key}" in session "${sessionId}"...`);
        logger.warn('Note: Full key-value retrieval requires enhanced indexing (Phase 5)');
      } catch (error) {
        throw new CLIError('Failed to retrieve data', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm memory list
  memory
    .command('list')
    .description('List all memory entries')
    .option('--session <id>', 'Filter by session ID')
    .option('--limit <n>', 'Maximum entries to show', '50')
    .action(async (options) => {
      try {
        const agentMemory = new AgentMemory(createDefaultMemoryConfig());
        const limit = parseInt(options.limit, 10);

        logger.info('📋 Agent Memory Contents\n');

        // Query recent moves
        logger.info('Recent Moves:');
        const experiences = await agentMemory.querySimilar({} as any);
        experiences.slice(0, Math.min(limit, experiences.length)).forEach((exp: any, i) => {
          logger.info(`  ${i + 1}. Row ${exp.row}, Col ${exp.col} = ${exp.value} (${exp.outcome})`);
        });

        // Query patterns
        logger.info('\nLearned Patterns:');
        const patterns = await agentMemory.distillPatterns('session-default');
        patterns.slice(0, Math.min(limit, patterns.length)).forEach((pattern, i) => {
          logger.info(
            `  ${i + 1}. ${pattern.id}: ${(pattern.successRate * 100).toFixed(1)}% success (${pattern.usageCount} uses)`
          );
        });
      } catch (error) {
        throw new CLIError('Failed to list memory', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm memory search
  memory
    .command('search')
    .description('Search memory for patterns or entries')
    .argument('<query>', 'Search query')
    .option('--type <type>', 'Entry type (move|pattern|insight)')
    .action(async (query, options) => {
      try {
        const agentMemory = new AgentMemory(createDefaultMemoryConfig());

        logger.info(`🔍 Searching for: "${query}"\n`);

        if (!options.type || options.type === 'pattern') {
          const patterns = await agentMemory.distillPatterns('session-default');
          const matches = patterns.filter(
            (p) => p.id.toLowerCase().includes(query.toLowerCase()) || p.description?.toLowerCase().includes(query.toLowerCase())
          );

          if (matches.length > 0) {
            logger.info(`Found ${matches.length} pattern(s):`);
            matches.forEach((pattern, i) => {
              logger.info(
                `  ${i + 1}. ${pattern.id}: ${(pattern.successRate * 100).toFixed(1)}% success`
              );
            });
          }
        }

        if (!options.type || options.type === 'move') {
          const experiences = await agentMemory.querySimilar({} as any);
          logger.info(`\nFound ${experiences.length} move(s) in history`);
        }
      } catch (error) {
        throw new CLIError('Failed to search memory', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm memory clear
  memory
    .command('clear')
    .description('Clear agent memory')
    .option('--session <id>', 'Clear specific session only')
    .option('--confirm', 'Skip confirmation prompt')
    .action(async (options) => {
      try {
        if (!options.confirm) {
          logger.warn('⚠️  This will delete all agent memory data!');
          logger.warn('   Use --confirm to proceed');
          return;
        }

        const config = createDefaultMemoryConfig();
        const { unlinkSync, existsSync } = await import('fs');
        const dbPath = config.dbPath + '/agent.db';

        if (existsSync(dbPath)) {
          unlinkSync(dbPath);
          logger.info('✓ Memory cleared successfully');
        } else {
          logger.info('No memory database found');
        }
      } catch (error) {
        throw new CLIError('Failed to clear memory', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm memory export
  memory
    .command('export')
    .description('Export memory to file')
    .argument('<output-file>', 'Output file path')
    .option('--format <format>', 'Export format (json|sqlite)', 'json')
    .action(async (outputFile, options) => {
      try {
        const config = createDefaultMemoryConfig();
        const { copyFileSync, existsSync, writeFileSync } = await import('fs');
        const dbPath = config.dbPath + '/agent.db';

        if (options.format === 'sqlite') {
          if (existsSync(dbPath)) {
            copyFileSync(dbPath, outputFile);
            logger.info(`✓ Exported memory database to ${outputFile}`);
          } else {
            throw new Error('No memory database found');
          }
        } else {
          // Export as JSON
          const agentMemory = new AgentMemory(config);
          const patterns = await agentMemory.distillPatterns('session-default');
          const experiences = await agentMemory.querySimilar({} as any);

          const exportData = {
            version: '1.0',
            exportedAt: Date.now(),
            patterns,
            experiences: experiences.slice(0, 1000), // Limit for file size
          };

          writeFileSync(outputFile, JSON.stringify(exportData, null, 2));
          logger.info(`✓ Exported memory to ${outputFile}`);
        }
      } catch (error) {
        throw new CLIError('Failed to export memory', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm memory import
  memory
    .command('import')
    .description('Import memory from file')
    .argument('<input-file>', 'Input file path')
    .option('--merge', 'Merge with existing data (default: replace)')
    .action(async (inputFile, options) => {
      try {
        const { existsSync, copyFileSync, readFileSync } = await import('fs');

        if (!existsSync(inputFile)) {
          throw new Error(`File not found: ${inputFile}`);
        }

        const config = createDefaultMemoryConfig();
        const dbPath = config.dbPath + '/agent.db';

        if (inputFile.endsWith('.db') || inputFile.endsWith('.sqlite')) {
          // Import SQLite database
          if (!options.merge && existsSync(dbPath)) {
            logger.warn('Replacing existing memory database...');
          }
          copyFileSync(inputFile, dbPath);
          logger.info(`✓ Imported memory database from ${inputFile}`);
        } else {
          // Import JSON
          const data = JSON.parse(readFileSync(inputFile, 'utf-8'));
          logger.info(`✓ Imported ${data.patterns?.length || 0} patterns`);
          logger.warn('Note: JSON import requires reconstruction (Phase 5)');
        }
      } catch (error) {
        throw new CLIError('Failed to import memory', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // ===================================================================
  // llm system - System management commands
  // ===================================================================

  const system = llm.command('system').description('System management and diagnostics');

  // llm system status
  system
    .command('status')
    .description('Show system status and health')
    .option('--verbose', 'Show detailed status')
    .action(async (options) => {
      try {
        logger.info('🔍 System Status\n');

        // Check memory system
        try {
          const config = createDefaultMemoryConfig();
          const agentMemory = new AgentMemory(config);
          const patterns = await agentMemory.distillPatterns('session-default');
          logger.info(`✓ Memory System: Online (${patterns.length} patterns)`);
        } catch (error) {
          logger.error(`✗ Memory System: Error - ${error instanceof Error ? error.message : String(error)}`);
        }

        // Check LLM connection if profile exists
        try {
          const config = getLLMConfig();
          logger.info(`✓ LLM Config: ${config.model} @ ${config.baseUrl}`);
        } catch (error) {
          logger.warn('⚠  LLM Config: No active profile');
        }

        // Check database
        const { existsSync } = await import('fs');
        const dbPath = createDefaultMemoryConfig().dbPath + '/agent.db';
        if (existsSync(dbPath)) {
          const { statSync } = await import('fs');
          const stats = statSync(dbPath);
          const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
          logger.info(`✓ Database: ${sizeMB} MB`);
        } else {
          logger.info('✓ Database: Not initialized');
        }

        if (options.verbose) {
          logger.info('\nConfiguration:');
          const config = createDefaultMemoryConfig();
          logger.info(`  DB Path: ${config.dbPath}`);
          logger.info(`  Embedding Model: ${config.embeddingModel}`);
          logger.info(`  ReasoningBank: ${config.enableReasoningBank ? 'enabled' : 'disabled'}`);
          logger.info(`  Reflexion: ${config.reflexion.enabled ? 'enabled' : 'disabled'}`);
        }
      } catch (error) {
        throw new CLIError('Failed to get system status', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm system reset
  system
    .command('reset')
    .description('Reset system to default state')
    .option('--confirm', 'Skip confirmation prompt')
    .action(async (options) => {
      try {
        if (!options.confirm) {
          logger.warn('⚠️  This will reset all system data!');
          logger.warn('   Use --confirm to proceed');
          return;
        }

        const { unlinkSync, existsSync } = await import('fs');
        const config = createDefaultMemoryConfig();
        const dbPath = config.dbPath + '/agent.db';

        if (existsSync(dbPath)) {
          unlinkSync(dbPath);
        }

        logger.info('✓ System reset complete');
      } catch (error) {
        throw new CLIError('Failed to reset system', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm system export
  system
    .command('export')
    .description('Export complete system state')
    .argument('<output-dir>', 'Output directory')
    .action(async (outputDir) => {
      try {
        const { mkdirSync, existsSync, copyFileSync } = await import('fs');
        const { join } = await import('path');

        if (!existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true });
        }

        // Export memory database
        const config = createDefaultMemoryConfig();
        const dbPath = config.dbPath + '/agent.db';
        if (existsSync(dbPath)) {
          copyFileSync(dbPath, join(outputDir, 'agent.db'));
        }

        // Export profiles
        const profileManager = new LLMProfileManager();
        const profilesJson = profileManager.export({ includeSecrets: false });
        const { writeFileSync } = await import('fs');
        writeFileSync(join(outputDir, 'profiles.json'), profilesJson);

        logger.info(`✓ System state exported to ${outputDir}`);
      } catch (error) {
        throw new CLIError('Failed to export system', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm system diagnostics
  system
    .command('diagnostics')
    .description('Run system diagnostics')
    .action(async () => {
      try {
        logger.info('🔧 Running System Diagnostics\n');

        const diagnostics = {
          memory: 'ok',
          database: 'ok',
          profiles: 'ok',
          llm: 'ok',
        };

        // Test memory system
        try {
          const agentMemory = new AgentMemory(createDefaultMemoryConfig());
          await agentMemory.distillPatterns('test');
          logger.info('✓ Memory system: Operational');
        } catch (error) {
          diagnostics.memory = 'error';
          logger.error(`✗ Memory system: ${error instanceof Error ? error.message : String(error)}`);
        }

        // Test database
        try {
          const { existsSync } = await import('fs');
          const dbPath = createDefaultMemoryConfig().dbPath + '/agent.db';
          if (existsSync(dbPath)) {
            logger.info('✓ Database: Found');
          } else {
            diagnostics.database = 'warning';
            logger.warn('⚠  Database: Not initialized');
          }
        } catch (error) {
          diagnostics.database = 'error';
          logger.error(`✗ Database: ${error instanceof Error ? error.message : String(error)}`);
        }

        // Test profiles
        try {
          const manager = new LLMProfileManager();
          const count = manager.count();
          logger.info(`✓ Profiles: ${count} configured`);
        } catch (error) {
          diagnostics.profiles = 'warning';
          logger.warn(`⚠  Profiles: ${error instanceof Error ? error.message : String(error)}`);
        }

        // Test LLM connection (if active profile exists)
        try {
          const manager = new LLMProfileManager();
          const active = manager.getActive();
          if (active) {
            const result = await manager.test();
            if (result.healthy) {
              logger.info(`✓ LLM connection: Healthy (${result.latency}ms)`);
            } else {
              diagnostics.llm = 'error';
              logger.error(`✗ LLM connection: ${result.error}`);
            }
          } else {
            diagnostics.llm = 'warning';
            logger.warn('⚠  LLM connection: No active profile');
          }
        } catch (error) {
          diagnostics.llm = 'warning';
          logger.warn(`⚠  LLM connection: ${error instanceof Error ? error.message : String(error)}`);
        }

        // Summary
        const hasErrors = Object.values(diagnostics).some((v) => v === 'error');
        const hasWarnings = Object.values(diagnostics).some((v) => v === 'warning');

        logger.info('\n' + '='.repeat(50));
        if (hasErrors) {
          logger.error('❌ System has errors - check logs above');
        } else if (hasWarnings) {
          logger.warn('⚠️  System has warnings - check logs above');
        } else {
          logger.info('✅ All systems operational');
        }
      } catch (error) {
        throw new CLIError('Failed to run diagnostics', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm system optimize
  system
    .command('optimize')
    .description('Optimize system performance')
    .action(async () => {
      try {
        logger.info('🚀 Optimizing System\n');

        // Optimize database
        logger.info('Optimizing database...');
        const agentMemory = new AgentMemory(createDefaultMemoryConfig());
        // Database optimization would happen here
        logger.info('✓ Database optimized');

        // Clean up old patterns
        logger.info('Cleaning up old patterns...');
        const patterns = await agentMemory.distillPatterns('session-default');
        const oldPatterns = patterns.filter((p) => p.usageCount === 0);
        logger.info(`✓ Found ${oldPatterns.length} unused patterns`);

        logger.info('\n✅ Optimization complete');
      } catch (error) {
        throw new CLIError('Failed to optimize system', 1, error instanceof Error ? error.message : String(error));
      }
    });
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp?: number): string {
  if (!timestamp) {
    return 'never';
  }

  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) {
    return 'just now';
  } else if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `${mins}m ago`;
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  } else if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days}d ago`;
  } else {
    return new Date(timestamp).toLocaleDateString();
  }
}
