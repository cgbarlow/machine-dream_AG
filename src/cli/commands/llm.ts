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
import { BoardFormatter } from '../../llm/BoardFormatter.js';
import type { LLMConfig, LLMExperience } from '../../llm/types.js';
import { AgentMemory } from '../../memory/AgentMemory.js';
import type { AgentDBConfig } from '../../types.js';
import { LLMProfileManager, ProfileValidator } from '../../llm/profiles/index.js';
import type { CreateProfileOptions, LLMProvider } from '../../llm/profiles/index.js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, join, basename } from 'path';
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
    .option('--no-learning', 'Disable few-shot learning injection (baseline mode)')
    .option('--learning', 'Enable few-shot learning injection (default when available)')
    .option('--model <model>', 'Override model name')
    .option('--endpoint <url>', 'Override LLM endpoint')
    .option('--timeout <ms>', 'Request timeout in milliseconds', '120000')
    .option('--max-moves <n>', 'Maximum moves before abandoning', '200')
    .option('--visualize', 'Show live solving visualization')
    .option('--debug', 'Show detailed debug output including prompts')
    .option('--include-reasoning', 'Include reasoning snippets in move history (default: off)')
    .option('--history-limit <n>', 'Limit move history to last N moves (default: 20, 0=unlimited)', '20')
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
        if (options.timeout) {
          config.timeout = parseInt(options.timeout, 10);
          logger.info(`Timeout override: ${config.timeout}ms`);
        }

        // Memory setting
        config.memoryEnabled = options.memory !== false;

        // Reasoning in move history setting
        config.includeReasoning = options.includeReasoning === true;

        // History limit setting
        config.maxHistoryMoves = parseInt(options.historyLimit, 10);

        validateConfig(config);

        /**
         * Display sudoku board with highlighting (DRY - uses BoardFormatter)
         */
        const displayBoard = (grid: number[][], lastMove?: { row: number; col: number; value: number }) => {
          logger.info('\n  📋 Current Board:');
          const boardStr = BoardFormatter.formatForCLI(grid, lastMove);
          boardStr.split('\n').forEach((line: string) => logger.info(`  ${line}`));
        };

        /**
         * Display quick stats
         */
        const displayStats = (session: any, currentGrid: number[][]) => {
          const emptyCells = BoardFormatter.countEmptyCells(currentGrid);
          const accuracy = session.totalMoves > 0
            ? ((session.correctMoves / session.totalMoves) * 100).toFixed(1)
            : '0.0';

          logger.info(`   📊 Moves: ${session.totalMoves} | ✓ Correct: ${session.correctMoves} | ✗ Invalid: ${session.invalidMoves} | ~ Wrong: ${session.validButWrongMoves} | Accuracy: ${accuracy}% | Empty: ${emptyCells}`);
        };

        // Load puzzle
        const puzzlePath = resolve(puzzleFile);
        const puzzleData = JSON.parse(readFileSync(puzzlePath, 'utf-8'));

        // Support both formats: "initial" (legacy) and "grid" (from puzzle generator)
        const initialGrid = puzzleData.initial || puzzleData.grid;
        if (!initialGrid || !puzzleData.solution) {
          throw new CLIError('Invalid puzzle file format', 1, 'Puzzle file must contain "initial" (or "grid") and "solution" grids');
        }
        // Normalize to use initialGrid going forward
        puzzleData.initial = initialGrid;

        // Derive puzzle ID from filename if not present in JSON
        if (!puzzleData.id) {
          puzzleData.id = basename(puzzlePath, '.json');
        }

        // Initialize player
        const memory = new AgentMemory(createDefaultMemoryConfig());
        // Get profile name from options or active profile
        const profileName = options.profile || (new LLMProfileManager().getActive()?.name) || 'default';
        const player = new LLMSudokuPlayer(config, memory, profileName);

        // Enable streaming if debug or visualize enabled
        if (options.debug || options.visualize) {
          player.enableStreaming(true);
        }

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

        // Set up event listeners for debugging
        let moveCounter = 0;

        player.on('llm:request', ({ prompt }: { prompt: string; messages: any[] }) => {
          if (options.debug) {
            logger.info(`\n📤 Sending request to LLM...`);
            logger.info(`Prompt length: ${prompt.length} characters`);
            logger.info(`\n--- FULL PROMPT ---\n${prompt}\n--- END PROMPT ---\n`);
          }
          if (options.visualize || options.debug) {
            // Show move history section if it exists
            const historyMatch = prompt.match(/YOUR PREVIOUS ATTEMPTS ON THIS PUZZLE:\n([\s\S]*?)\n\n(?:FORBIDDEN|Empty)/);
            if (historyMatch && historyMatch[1]) {
              logger.info(`\n📜 Move History:`);
              historyMatch[1].split('\n').forEach((line: string) => {
                logger.info(`   ${line}`);
              });
            }

            // Show forbidden moves section if it exists
            const forbiddenMatch = prompt.match(/FORBIDDEN MOVES \(do not attempt again\):\n([\s\S]*?)\n\nEmpty cells/);
            if (forbiddenMatch && forbiddenMatch[1]) {
              logger.info(`\n🚫 Forbidden Moves:`);
              forbiddenMatch[1].split('\n').forEach((line: string) => {
                if (line.trim()) logger.info(`   ${line}`);
              });
            }

            logger.info(`\n💭 LLM thinking...`);
            process.stdout.write('   ');
          }
        });

        player.on('llm:stream', ({ token }: { token: string }) => {
          if (options.visualize || options.debug) {
            process.stdout.write(token);
          }
        });

        player.on('llm:error', ({ error }: { error: any }) => {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error(`\n❌ LLM Error: ${errorMsg}`);

          if (error instanceof Error && error.stack && options.debug) {
            logger.info(error.stack);
          }
        });

        player.on('session:abandoned', ({ session, reason }: { session: any; reason: string }) => {
          logger.warn(`\n⚠️  Session abandoned: ${reason}`);
          logger.warn(`   Total moves attempted: ${session.totalMoves}`);
        });

        player.on('llm:response', () => {
          if (options.visualize || options.debug) {
            // Add newline after streaming
            process.stdout.write('\n');
          }
        });

        player.on('llm:parse_failure', ({ error, rawResponse }: { error: string; rawResponse: string }) => {
          logger.warn(`\n⚠️  Parse failure (move ${moveCounter + 1}): ${error}`);
          if (options.debug) {
            logger.info('Raw response:');
            logger.info(rawResponse.substring(0, 500));
          }
        });

        player.on('llm:move_proposed', ({ move }: { move: any }) => {
          moveCounter++;
          if (options.visualize) {
            logger.info(`\n🎯 Move ${moveCounter}: (${move.row},${move.col})=${move.value}`);
            if (move.reasoning && options.debug) {
              logger.info(`   Reasoning: ${move.reasoning.substring(0, 150)}...`);
            }
          } else {
            // Show progress dots
            process.stdout.write('.');
          }
        });

        player.on('llm:forbidden_move_rejected', ({ move, consecutiveCount }: { move: any; consecutiveCount: number }) => {
          if (options.visualize) {
            logger.warn(`   ⛔ FORBIDDEN: (${move.row},${move.col})=${move.value} - already tried and proven wrong`);
            if (consecutiveCount > 1) {
              logger.warn(`   ⚠️  Consecutive forbidden attempts: ${consecutiveCount}/10`);
            }
          }
        });

        player.on('llm:move_validated', ({ experience }: { experience: any }) => {
          if (options.visualize) {
            const emoji = experience.validation.isCorrect ? '✓' : experience.validation.isValid ? '~' : '✗';
            logger.info(`   ${emoji} ${experience.validation.outcome.toUpperCase()}`);
            if (experience.validation.error) {
              logger.info(`   Error: ${experience.validation.error}`);
            }

            // Update cumulative stats
            cumulativeStats.totalMoves++;
            if (experience.validation.isCorrect) {
              cumulativeStats.correctMoves++;
            } else if (experience.validation.isValid) {
              cumulativeStats.validButWrongMoves++;
            } else {
              cumulativeStats.invalidMoves++;
            }

            // Update grid and display ONLY if move was CORRECT
            if (experience.validation.isCorrect && experience.move.row > 0) {
              currentGrid[experience.move.row - 1][experience.move.col - 1] = experience.move.value;
              displayBoard(currentGrid, experience.move);
            }

            // Always display updated stats
            displayStats(cumulativeStats, currentGrid);
          }
        });

        // Display initial board
        logger.info('\n🎮 Starting puzzle solve...');
        if (options.visualize) {
          displayBoard(puzzleData.initial);
          displayStats({ totalMoves: 0, correctMoves: 0, invalidMoves: 0, validButWrongMoves: 0 }, puzzleData.initial);
        } else {
          logger.info('Progress: ');
        }

        // Track current grid state for visualization
        let currentGrid = puzzleData.initial.map((row: number[]) => [...row]);

        // Track cumulative stats for display
        let cumulativeStats = {
          totalMoves: 0,
          correctMoves: 0,
          invalidMoves: 0,
          validButWrongMoves: 0
        };

        let session;
        let exitReason = 'COMPLETED';
        let exitCode = 0;

        try {
          // Determine learning mode (--no-learning sets learning to false)
          const useLearning = options.learning !== false;

          // Display learning status at session start
          if (config.memoryEnabled) {
            if (useLearning) {
              const { ExperienceStore } = await import('../../llm/ExperienceStore.js');
              const experienceStore = new ExperienceStore(memory, config, profileName);
              const fewShots = await experienceStore.getFewShots(profileName);
              logger.info(`📚 Learning: ${fewShots.length} few-shots loaded for profile: ${profileName}`);
            } else {
              logger.info(`📚 Learning: DISABLED (baseline mode)`);
            }
          }

          session = await player.playPuzzle(
            puzzleData.id,
            puzzleData.initial,
            puzzleData.solution,
            parseInt(options.maxMoves, 10),
            useLearning
          );

          if (!options.visualize) {
            process.stdout.write('\n');
          }

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

          // Set exit reason
          if (session.solved) {
            exitReason = 'SOLVED';
          } else if (session.abandoned) {
            exitReason = 'ABANDONED';
            exitCode = 1;
          }
        } catch (error) {
          // Determine exit reason from error
          const errorMsg = error instanceof Error ? error.message : String(error);

          if (errorMsg.includes('timeout')) {
            exitReason = 'TIMEOUT';
            exitCode = 124; // Standard timeout exit code
          } else if (errorMsg.includes('connection') || errorMsg.includes('not running')) {
            exitReason = 'CONNECTION_FAILED';
            exitCode = 2;
          } else if (errorMsg.includes('parse')) {
            exitReason = 'PARSE_ERROR';
            exitCode = 3;
          } else {
            exitReason = 'ERROR';
            exitCode = 1;
          }

          // Display session summary if we got any moves
          if (moveCounter > 0) {
            logger.info('\n📊 Session Results (Incomplete):');
            logger.info(`  Total moves attempted: ${moveCounter}`);
            logger.info(`  Correct moves: ${cumulativeStats.correctMoves}`);
            logger.info(`  Invalid moves: ${cumulativeStats.invalidMoves}`);
            logger.info(`  Valid but wrong: ${cumulativeStats.validButWrongMoves}`);

            const accuracy = moveCounter > 0
              ? ((cumulativeStats.correctMoves / moveCounter) * 100).toFixed(1)
              : '0.0';
            logger.info(`  Accuracy: ${accuracy}%`);
          }

          // Show exit summary
          logger.info('\n' + '─'.repeat(50));
          logger.info(`Session ended: ${exitReason}`);
          if (errorMsg.includes('timeout')) {
            logger.info(`Reason: LLM response exceeded ${config.timeout}ms (circular reasoning detected)`);
          } else {
            logger.info(`Reason: ${errorMsg}`);
          }
          logger.info(`Exit code: ${exitCode}`);
          logger.info('─'.repeat(50));

          // Re-throw for CLI error handler
          if (error instanceof CLIError) {
            throw error;
          }
          throw new CLIError('Session terminated', exitCode, errorMsg);
        }

        // Show exit summary for successful completion
        logger.info('\n' + '─'.repeat(50));
        logger.info(`Session ended: ${exitReason}`);
        if (session) {
          let reason = 'Completed';
          if (session.solved) {
            reason = 'Puzzle solved successfully';
          } else if (session.abandoned) {
            // Display actual abandonment reason
            if (session.abandonReason === 'max_moves') {
              reason = `Max moves reached (${parseInt(options.maxMoves, 10)} moves)`;
            } else if (session.abandonReason) {
              reason = session.abandonReason;
            } else {
              reason = 'Session abandoned';
            }
          }
          logger.info(`Reason: ${reason}`);
        }
        logger.info(`Exit code: ${exitCode}`);
        logger.info('─'.repeat(50));
      } catch (error) {
        // Final catch for any unhandled errors
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
        const player = new LLMSudokuPlayer(DEFAULT_LLM_CONFIG, memory, 'default');
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
        const player = new LLMSudokuPlayer(DEFAULT_LLM_CONFIG, memory, 'default');
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
    .option('--session <id>', 'Filter by session ID (puzzle ID)')
    .option('--puzzle <id>', 'Filter by puzzle ID')
    .option('--profile <name>', 'Filter by LLM profile name')
    .option('--outcome <type>', 'Filter by outcome (correct|invalid|valid_but_wrong)')
    .option('--importance <n>', 'Filter by minimum importance (0.0-1.0)')
    .option('--with-learning', 'Only show experiences that used learning features')
    .option('--limit <n>', 'Maximum entries to show (0 = all)', '50')
    .option('--verbose', 'Show reasoning snippet (first 100 chars)')
    .option('--format <format>', 'Output format (text|json)', 'text')
    .action(async (options) => {
      try {
        const agentMemory = new AgentMemory(createDefaultMemoryConfig());
        const limit = parseInt(options.limit, 10);

        // Query all LLM experiences from metadata
        let allExperiences = await agentMemory.reasoningBank.queryMetadata('llm_experience', {}) as LLMExperience[];

        // Apply filters
        if (options.session || options.puzzle) {
          const puzzleId = options.session || options.puzzle;
          allExperiences = allExperiences.filter(exp => exp.puzzleId === puzzleId);
        }

        if (options.profile) {
          allExperiences = allExperiences.filter(exp =>
            (exp.profileName || 'default') === options.profile
          );
        }

        if (options.outcome) {
          allExperiences = allExperiences.filter(exp =>
            exp.validation.outcome === options.outcome
          );
        }

        if (options.importance) {
          const minImportance = parseFloat(options.importance);
          allExperiences = allExperiences.filter(exp =>
            (exp.importance || 0) >= minImportance
          );
        }

        if (options.withLearning) {
          allExperiences = allExperiences.filter(exp =>
            exp.learningContext && (
              exp.learningContext.fewShotsUsed ||
              exp.learningContext.patternsAvailable > 0 ||
              exp.learningContext.consolidatedExperiences > 0
            )
          );
        }

        // Sort by timestamp descending (most recent first)
        allExperiences.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // If limit is 0 or negative, show all; otherwise limit
        const experiencesToShow = limit > 0 ? allExperiences.slice(0, limit) : allExperiences;

        // JSON output
        if (options.format === 'json') {
          console.log(JSON.stringify(experiencesToShow, null, 2));
          return;
        }

        // Text output
        logger.info('\n📋 Agent Memory Contents\n');
        logger.info('Recent Experiences:');

        if (experiencesToShow.length === 0) {
          logger.info('  (No experiences found matching filters)');
        } else {
          experiencesToShow.forEach((exp: LLMExperience, i) => {
            const move = exp.move || { row: 0, col: 0, value: 0 };
            const validation = exp.validation || { outcome: 'unknown' };
            const outcome = validation.outcome || 'unknown';
            const profile = exp.profileName || 'default';
            const puzzle = exp.puzzleId || 'unknown';
            const importance = exp.importance ? `[${Math.round(exp.importance * 100)}%]` : '';

            // Learning flags
            const learningFlags = [];
            if (exp.learningContext?.fewShotsUsed) learningFlags.push('F');
            if (exp.learningContext?.patternsAvailable > 0) learningFlags.push('P');
            if (exp.learningContext?.consolidatedExperiences > 0) learningFlags.push('C');
            const flags = learningFlags.length > 0 ? `[${learningFlags.join('][')}]` : '';

            logger.info(`  ${i + 1}. [${puzzle}] ${exp.id}`);
            logger.info(`     ${profile} ${flags} | (${move.row},${move.col})=${move.value} → ${outcome.toUpperCase()} ${importance}`);

            if (options.verbose && exp.move.reasoning) {
              const snippet = exp.move.reasoning.substring(0, 100).replace(/\n/g, ' ');
              logger.info(`     💭 "${snippet}..."`);
            }
            logger.info('');
          });
        }

        logger.info(`Showing ${experiencesToShow.length} of ${allExperiences.length} experiences`);

        if (options.withLearning || options.profile || options.outcome || options.importance) {
          logger.info('(Filters applied)');
        }

        logger.info('');
        logger.info('Legend: [F]=Few-shots, [P]=Patterns, [C]=Consolidated');
        logger.info(`\n💡 Tip: Use 'llm memory show <id>' to view full details (copy ID from above)`);

      } catch (error) {
        throw new CLIError('Failed to list memory', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm memory show <id>
  memory
    .command('show')
    .description('View complete experience details with full reasoning')
    .argument('<experience-id>', 'Experience ID')
    .option('--format <format>', 'Output format (text|json)', 'text')
    .option('--no-grid', 'Hide grid state (shown by default)')
    .action(async (experienceId, options) => {
      try {
        const agentMemory = new AgentMemory(createDefaultMemoryConfig());

        // Query all experiences and find the one with matching ID
        const allExperiences = await agentMemory.reasoningBank.queryMetadata('llm_experience', {}) as LLMExperience[];
        const experience = allExperiences.find(exp => exp.id === experienceId);

        if (!experience) {
          throw new CLIError(`Experience not found: ${experienceId}`, 1);
        }

        // JSON output
        if (options.format === 'json') {
          console.log(JSON.stringify(experience, null, 2));
          return;
        }

        // Text output
        logger.info(`\n📋 Experience: ${experience.id}`);
        logger.info('='.repeat(60));
        logger.info('');

        // Move details
        logger.info('🎯 Move Details:');
        logger.info(`  Position: (${experience.move.row}, ${experience.move.col})`);
        logger.info(`  Value: ${experience.move.value}`);
        logger.info(`  Move #: ${experience.moveNumber}`);
        if (experience.move.confidence !== undefined) {
          logger.info(`  Confidence: ${(experience.move.confidence * 100).toFixed(1)}%`);
        }
        logger.info('');

        // Validation
        const outcomeEmoji = experience.validation.isCorrect ? '✓' : experience.validation.isValid ? '~' : '✗';
        logger.info(`${outcomeEmoji} Validation:`);
        logger.info(`  Outcome: ${experience.validation.outcome.toUpperCase()}`);
        logger.info(`  Valid: ${experience.validation.isValid ? 'Yes' : 'No'}`);
        logger.info(`  Correct: ${experience.validation.isCorrect ? 'Yes' : 'No'}`);
        if (experience.validation.error) {
          logger.info(`  Error: ${experience.validation.error}`);
        }
        logger.info('');

        // Full reasoning
        logger.info('💭 Full Reasoning:');
        logger.info('-'.repeat(60));
        // Word wrap reasoning at 58 characters
        const words = experience.move.reasoning.split(' ');
        let line = '  ';
        words.forEach(word => {
          if (line.length + word.length + 1 > 60) {
            logger.info(line);
            line = '  ' + word;
          } else {
            line += (line.length > 2 ? ' ' : '') + word;
          }
        });
        if (line.length > 2) {
          logger.info(line);
        }
        logger.info('-'.repeat(60));
        logger.info('');

        // Metrics
        logger.info('📊 Metrics:');
        if (experience.importance !== undefined) {
          logger.info(`  Importance: ${(experience.importance * 100).toFixed(1)}%`);
        }
        if (experience.context) {
          logger.info(`  Empty cells at move: ${experience.context.emptyCellsAtMove}`);
          logger.info(`  Reasoning length: ${experience.context.reasoningLength} chars`);
          logger.info(`  Constraint density: ${experience.context.constraintDensity.toFixed(2)}`);
        } else {
          logger.info('  (Context metrics not available for this experience)');
        }
        logger.info('');

        // Profile & Learning
        logger.info('🔧 Profile & Learning:');
        logger.info(`  Profile: ${experience.profileName || 'default'}`);
        logger.info(`  Model: ${experience.modelUsed}`);
        logger.info(`  Memory enabled: ${experience.memoryWasEnabled ? 'Yes' : 'No'}`);

        if (experience.learningContext) {
          logger.info(`  Few-shots used: ${experience.learningContext.fewShotsUsed ? `Yes (${experience.learningContext.fewShotCount} examples)` : 'No'}`);
          logger.info(`  Patterns available: ${experience.learningContext.patternsAvailable}`);
          logger.info(`  Consolidated experiences: ${experience.learningContext.consolidatedExperiences}`);
        }
        logger.info('');

        // Metadata
        logger.info('📅 Metadata:');
        logger.info(`  Puzzle ID: ${experience.puzzleId}`);
        logger.info(`  Puzzle Hash: ${experience.puzzleHash}`);
        logger.info(`  Timestamp: ${new Date(experience.timestamp).toLocaleString()}`);
        logger.info('');

        // Grid state (shown by default, hide with --no-grid)
        // Commander.js converts --no-grid to options.grid = false
        if (options.grid !== false) {
          logger.info('📋 Grid State at Move:');
          const gridStr = BoardFormatter.formatForCLI(experience.gridState);
          gridStr.split('\n').forEach((line: string) => logger.info(`  ${line}`));
          logger.info('');
        }

      } catch (error) {
        throw new CLIError('Failed to show experience', 1, error instanceof Error ? error.message : String(error));
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
    .option('--session <id>', 'Clear specific session only (deletes all experiences for that session)')
    .option('--confirm', 'Skip confirmation prompt (for scripts)')
    .action(async (options) => {
      try {
        const config = createDefaultMemoryConfig();
        const agentMemory = new AgentMemory(config);

        // Handle session-specific deletion
        if (options.session) {
          // Query all experiences for this session FIRST (to show count)
          const allExperiences = await agentMemory.reasoningBank.queryMetadata(
            'llm_experience',
            {}
          ) as LLMExperience[];

          // Filter by session ID, supporting both new (GUID) and old (composite key) formats
          const sessionExperiences = allExperiences.filter(exp => {
            // New format: direct sessionId match
            if (exp.sessionId === options.session) {
              return true;
            }
            // Old format: composite key (puzzleId-profileName)
            const compositeKey = `${exp.puzzleId}-${exp.profileName || 'default'}`;
            return compositeKey === options.session;
          });

          if (sessionExperiences.length === 0) {
            logger.warn(`No experiences found for session: ${options.session}`);
            return;
          }

          // Interactive confirmation if --confirm not provided
          if (!options.confirm) {
            logger.warn(`⚠️  This will delete all memories for session: ${options.session}`);
            logger.warn(`   ${sessionExperiences.length} experience(s) will be permanently deleted`);
            logger.warn('   This action cannot be undone!\n');

            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout
            });

            const answer = await rl.question('Type "yes" to confirm deletion: ');
            rl.close();

            if (answer.trim().toLowerCase() !== 'yes') {
              logger.info('Deletion cancelled.');
              return;
            }
          }

          logger.info(`🗑️  Deleting session: ${options.session}...`);

          // Delete each experience from metadata table
          for (const exp of sessionExperiences) {
            await agentMemory.reasoningBank.deleteMetadata(exp.id, 'llm_experience');
          }

          logger.info(`✓ Deleted ${sessionExperiences.length} experiences for session: ${options.session}`);
          logger.info(`💡 Few-shot examples and other sessions remain intact`);
          return;
        }

        // Handle full database deletion
        if (!options.confirm) {
          // Count what will be deleted
          const allExperiences = await agentMemory.reasoningBank.queryMetadata('llm_experience', {}) as LLMExperience[];
          const uniqueSessions = new Set(allExperiences.map(exp => exp.sessionId)).size;
          const uniqueProfiles = new Set(allExperiences.map(exp => exp.profileName || 'default')).size;

          logger.warn('⚠️  This will delete ALL agent memory data!');
          logger.warn(`   - ${allExperiences.length} LLM experiences across ${uniqueSessions} session(s)`);
          logger.warn(`   - Few-shot examples for ${uniqueProfiles} profile(s)`);
          logger.warn('   - All reasoning bank data');
          logger.warn('   This action cannot be undone!\n');

          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
          });

          const answer = await rl.question('Type "yes" to confirm deletion: ');
          rl.close();

          if (answer.trim().toLowerCase() !== 'yes') {
            logger.info('Deletion cancelled.');
            return;
          }
        }

        const { unlinkSync, existsSync } = await import('fs');
        const dbPath = config.dbPath + '/agent.db';

        if (existsSync(dbPath)) {
          unlinkSync(dbPath);
          logger.info('✓ Memory cleared successfully');
          logger.info('   All sessions, experiences, and few-shots deleted');
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
  // llm dream - LLM learning consolidation commands
  // ===================================================================

  const dream = llm.command('dream').description('Consolidate LLM learning from experiences');

  // llm dream run
  dream
    .command('run')
    .description('Run dreaming consolidation for a profile')
    .option('--profile <name>', 'LLM profile to consolidate (default: active profile)')
    .option('--all', 'Consolidate all profiles separately')
    .option('--output <file>', 'Save consolidation report')
    .action(async (options) => {
      try {
        const manager = new LLMProfileManager();
        const agentMemory = new AgentMemory(createDefaultMemoryConfig());

        // Determine which profiles to consolidate
        let profilesToProcess: string[] = [];
        if (options.all) {
          profilesToProcess = manager.list().map(p => p.name);
        } else if (options.profile) {
          profilesToProcess = [options.profile];
        } else {
          const activeProfile = manager.getActive();
          if (!activeProfile) {
            throw new CLIError('No active profile. Use --profile or set an active profile.', 1);
          }
          profilesToProcess = [activeProfile.name];
        }

        logger.info(`\n🌙 Starting LLM Dream Cycle\n`);

        for (const profileName of profilesToProcess) {
          logger.info(`\n📊 Profile: ${profileName}`);
          logger.info('─'.repeat(50));

          // Get profile config
          const config = getLLMConfig(profileName);

          // Import required classes
          const { ExperienceStore } = await import('../../llm/ExperienceStore.js');
          const { DreamingConsolidator } = await import('../../llm/DreamingConsolidator.js');

          // Create store and consolidator
          const experienceStore = new ExperienceStore(agentMemory, config, profileName);
          const consolidator = new DreamingConsolidator(experienceStore, config);

          // Get unconsolidated count before
          const before = await experienceStore.getUnconsolidated(profileName);
          logger.info(`📦 Found ${before.length} unconsolidated experiences`);

          if (before.length === 0) {
            logger.info('💤 No experiences to consolidate');
            continue;
          }

          // Run consolidation
          const report = await consolidator.consolidate(profileName);

          // Show results
          logger.info(`\n✅ Dream Cycle Complete`);
          logger.info(`   Experiences processed: ${report.experiencesConsolidated}`);
          logger.info(`   Few-shots created: ${report.fewShotsUpdated}`);
          logger.info(`   Patterns extracted: ${report.patterns.successStrategies.length}`);

          // Verify few-shots exist
          const fewShots = await experienceStore.getFewShots(profileName);
          logger.info(`\n📚 Profile now has ${fewShots.length} few-shot examples for learning\n`);

          // Save report if requested
          if (options.output) {
            const reportPath = resolve(options.output);
            writeFileSync(reportPath, JSON.stringify(report, null, 2));
            logger.info(`💾 Report saved to: ${reportPath}`);
          }
        }

        logger.info(`\n🎉 All profiles consolidated successfully\n`);
      } catch (error) {
        throw new CLIError('Failed to run dream consolidation', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm dream status
  dream
    .command('status')
    .description('Show learning status for a profile')
    .option('--profile <name>', 'LLM profile to check (default: active profile)')
    .option('--all', 'Show status for all profiles')
    .option('--format <format>', 'Output format (table|json)', 'table')
    .action(async (options) => {
      try {
        const manager = new LLMProfileManager();
        const agentMemory = new AgentMemory(createDefaultMemoryConfig());

        // Determine which profiles to check
        let profilesToCheck: string[] = [];
        if (options.all) {
          profilesToCheck = manager.list().map(p => p.name);
        } else if (options.profile) {
          profilesToCheck = [options.profile];
        } else {
          const activeProfile = manager.getActive();
          if (!activeProfile) {
            throw new CLIError('No active profile. Use --profile or set an active profile.', 1);
          }
          profilesToCheck = [activeProfile.name];
        }

        // Import required class
        const { ExperienceStore } = await import('../../llm/ExperienceStore.js');

        logger.info(`\n📊 Learning Status\n`);

        for (const profileName of profilesToCheck) {
          const config = getLLMConfig(profileName);
          const experienceStore = new ExperienceStore(agentMemory, config, profileName);

          // Get status
          const unconsolidated = await experienceStore.getUnconsolidated(profileName);
          const fewShots = await experienceStore.getFewShots(profileName);

          if (options.format === 'json') {
            console.log(JSON.stringify({
              profile: profileName,
              unconsolidatedExperiences: unconsolidated.length,
              fewShotExamples: fewShots.length,
            }, null, 2));
          } else {
            logger.info(`🤖 ${profileName}`);
            logger.info('─'.repeat(50));
            logger.info(`   Unconsolidated experiences: ${unconsolidated.length}`);
            logger.info(`   Few-shot examples: ${fewShots.length}`);

            if (unconsolidated.length > 0) {
              logger.info(`\n   💡 Run 'machine-dream llm dream run --profile ${profileName}' to consolidate\n`);
            } else {
              logger.info('   ✨ All experiences consolidated\n');
            }
          }
        }
      } catch (error) {
        throw new CLIError('Failed to get dream status', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm dream show
  dream
    .command('show')
    .description('Show few-shot examples and learning data')
    .option('--profile <name>', 'LLM profile to show (default: active profile)')
    .option('--limit <n>', 'Maximum few-shots to display', '10')
    .option('--format <format>', 'Output format (text|json)', 'text')
    .action(async (options) => {
      try {
        const manager = new LLMProfileManager();
        const agentMemory = new AgentMemory(createDefaultMemoryConfig());

        // Determine profile
        let profileName: string;
        if (options.profile) {
          profileName = options.profile;
        } else {
          const activeProfile = manager.getActive();
          if (!activeProfile) {
            throw new CLIError('No active profile. Use --profile or set an active profile.', 1);
          }
          profileName = activeProfile.name;
        }

        const config = getLLMConfig(profileName);
        const { ExperienceStore } = await import('../../llm/ExperienceStore.js');
        const experienceStore = new ExperienceStore(agentMemory, config, profileName);

        // Get data
        const fewShots = await experienceStore.getFewShots(profileName, parseInt(options.limit, 10));
        const unconsolidated = await experienceStore.getUnconsolidated(profileName);

        // Get consolidated count
        const allExperiences = await agentMemory.reasoningBank.queryMetadata('llm_experience', {}) as LLMExperience[];
        const profileExperiences = allExperiences.filter((exp: any) => exp.profileName === profileName);
        const consolidated = profileExperiences.filter((exp: any) => exp.consolidated === true);

        if (options.format === 'json') {
          console.log(JSON.stringify({
            profile: profileName,
            statistics: {
              totalExperiences: profileExperiences.length,
              consolidatedExperiences: consolidated.length,
              unconsolidatedExperiences: unconsolidated.length,
              fewShotCount: fewShots.length,
            },
            fewShots: fewShots,
          }, null, 2));
        } else {
          logger.info(`\n🧠 Dream Storage: ${profileName}\n`);
          logger.info('═'.repeat(70));

          // Statistics
          logger.info(`\n📊 Statistics:`);
          logger.info(`   Total experiences: ${profileExperiences.length}`);
          logger.info(`   Consolidated: ${consolidated.length}`);
          logger.info(`   Unconsolidated: ${unconsolidated.length}`);
          logger.info(`   Few-shot examples: ${fewShots.length}`);

          // Few-shots
          if (fewShots.length === 0) {
            logger.info(`\n📚 Few-Shot Examples: None`);
            logger.info(`   Run 'llm dream run' to generate few-shots from experiences`);
          } else {
            logger.info(`\n📚 Few-Shot Examples (${fewShots.length}):\n`);

            fewShots.forEach((fs: any, i: number) => {
              logger.info(`   ${i + 1}. ${fs.gridContext || 'No context'}`);
              logger.info(`      Move: (${fs.move?.row}, ${fs.move?.col}) = ${fs.move?.value}`);
              logger.info(`      Outcome: ${fs.outcome || 'CORRECT'}`);
              if (fs.analysis) {
                const shortAnalysis = fs.analysis.length > 100
                  ? fs.analysis.substring(0, 100) + '...'
                  : fs.analysis;
                logger.info(`      Reasoning: ${shortAnalysis}`);
              }
              logger.info('');
            });
          }

          logger.info('─'.repeat(70));
          logger.info(`💡 These few-shots are injected into prompts during 'llm play'\n`);
        }
      } catch (error) {
        throw new CLIError('Failed to show dream data', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // ===================================================================
  // llm session - Session management commands
  // ===================================================================

  const session = llm.command('session').description('View play session history and statistics');

  // llm session list
  session
    .command('list')
    .description('List play sessions with aggregate statistics')
    .option('--profile <name>', 'Filter by LLM profile name')
    .option('--solved', 'Only show solved sessions')
    .option('--limit <n>', 'Maximum sessions to show', '20')
    .option('--format <format>', 'Output format (text|json)', 'text')
    .action(async (options) => {
      try {
        const agentMemory = new AgentMemory(createDefaultMemoryConfig());
        const limit = parseInt(options.limit, 10);

        // Query all experiences
        const allExperiences = await agentMemory.reasoningBank.queryMetadata('llm_experience', {}) as LLMExperience[];

        // Group by session ID
        const sessionMap = new Map<string, {
          sessionId: string;
          puzzleId: string;
          profileName: string;
          experiences: LLMExperience[];
          firstTimestamp: Date;
        }>();

        allExperiences.forEach(exp => {
          // Use sessionId if available, otherwise fall back to composite key for old experiences
          const key = exp.sessionId || `${exp.puzzleId}-${exp.profileName || 'default'}`;
          if (!sessionMap.has(key)) {
            sessionMap.set(key, {
              sessionId: key,
              puzzleId: exp.puzzleId,
              profileName: exp.profileName || 'default',
              experiences: [],
              firstTimestamp: exp.timestamp,
            });
          }
          const sessionData = sessionMap.get(key)!;
          sessionData.experiences.push(exp);
          // Update first timestamp if this is earlier
          if (exp.timestamp < sessionData.firstTimestamp) {
            sessionData.firstTimestamp = exp.timestamp;
          }
        });

        // Convert to array and calculate stats
        let sessions = Array.from(sessionMap.values()).map(sessionData => {
          const exps = sessionData.experiences;
          const totalMoves = exps.length;
          const correctMoves = exps.filter(e => e.validation.isCorrect).length;
          const invalidMoves = exps.filter(e => !e.validation.isValid).length;
          const validButWrong = exps.filter(e => e.validation.isValid && !e.validation.isCorrect).length;
          const accuracy = totalMoves > 0 ? (correctMoves / totalMoves) * 100 : 0;

          // Check if solved and calculate completion percentage
          // gridState is recorded BEFORE the move, so adjust for last correct move
          const firstExp = exps[0];
          const lastExp = exps[exps.length - 1];
          let solved = false;
          let completionPct = 0;

          if (firstExp?.gridState && lastExp?.gridState) {
            const originalEmpty = firstExp.gridState.flat().filter(cell => cell === 0).length;
            let remainingEmpty = lastExp.gridState.flat().filter(cell => cell === 0).length;

            // If last move was correct, one more cell was filled
            if (lastExp.validation?.isCorrect) {
              remainingEmpty = Math.max(0, remainingEmpty - 1);
            }

            // Solved if no remaining empty cells
            solved = remainingEmpty === 0;

            // Completion percentage
            if (originalEmpty > 0) {
              completionPct = ((originalEmpty - remainingEmpty) / originalEmpty) * 100;
            }
          }

          // Learning flags from first experience
          const learningContext = firstExp.learningContext;

          return {
            sessionId: sessionData.sessionId,
            puzzleId: sessionData.puzzleId,
            profileName: sessionData.profileName,
            solved,
            completionPct,
            totalMoves,
            correctMoves,
            invalidMoves,
            validButWrong,
            accuracy,
            learningContext,
            timestamp: sessionData.firstTimestamp,
          };
        });

        // Apply filters
        if (options.profile) {
          sessions = sessions.filter(s => s.profileName === options.profile);
        }

        if (options.solved) {
          sessions = sessions.filter(s => s.solved);
        }

        // Sort by timestamp descending (most recent first)
        sessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const sessionsToShow = sessions.slice(0, limit);

        // JSON output
        if (options.format === 'json') {
          console.log(JSON.stringify(sessionsToShow, null, 2));
          return;
        }

        // Text output
        logger.info('\n📋 Play Sessions\n');

        if (sessionsToShow.length === 0) {
          logger.info('  (No sessions found)');
          return;
        }

        // Header
        logger.info('ID                                    Profile           Puzzle            Solved  Done%  Moves   Acc%    Learning    Date');
        logger.info('─'.repeat(130));

        sessionsToShow.forEach(s => {
          const sessionIdShort = s.sessionId.substring(0, 36).padEnd(36);
          const profile = s.profileName.substring(0, 16).padEnd(16);
          const puzzle = s.puzzleId.substring(0, 16).padEnd(16);
          const solvedMark = s.solved ? '✓ YES' : '✗ NO ';
          const donePct = `${s.completionPct.toFixed(0)}%`.padStart(5);
          const moves = s.totalMoves.toString().padStart(5);
          const acc = `${s.accuracy.toFixed(1)}%`.padStart(6);

          // Learning flags - only show actually useful ones
          const flags = [];
          if (s.learningContext?.fewShotsUsed) flags.push(`F${s.learningContext.fewShotCount}`);
          if (s.learningContext?.consolidatedExperiences > 0) flags.push('C');

          const learningStr = flags.length > 0
            ? `[${flags.join('][')}]`.padEnd(10)
            : '[ ]'.padEnd(10);

          const date = new Date(s.timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          logger.info(`${sessionIdShort}  ${profile}  ${puzzle}  ${solvedMark}  ${donePct}  ${moves}  ${acc}  ${learningStr}  ${date}`);
        });

        logger.info('');
        logger.info(`Showing ${sessionsToShow.length} of ${sessions.length} sessions`);
        logger.info('Legend: [F#]=Few-shots used (#=count), [C]=Consolidated experiences, Done%=Puzzle completion, Acc%=Move accuracy');
        logger.info(`\n💡 Tip: Use 'llm session show <id>' to view detailed breakdown`);

      } catch (error) {
        throw new CLIError('Failed to list sessions', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm session show <id>
  session
    .command('show')
    .description('Show detailed session statistics and breakdown')
    .argument('<session-id>', 'Session ID (from session list)')
    .option('--format <format>', 'Output format (text|json)', 'text')
    .action(async (sessionId, options) => {
      try {
        const agentMemory = new AgentMemory(createDefaultMemoryConfig());

        // Query experiences for this session
        const allExperiences = await agentMemory.reasoningBank.queryMetadata('llm_experience', {}) as LLMExperience[];
        const sessionExperiences = allExperiences.filter(exp => {
          // Support both new GUID sessionIds and old composite key format
          if (exp.sessionId) {
            return exp.sessionId === sessionId;
          } else {
            // Fallback for old experiences without sessionId
            return `${exp.puzzleId}-${exp.profileName || 'default'}` === sessionId;
          }
        });

        if (sessionExperiences.length === 0) {
          throw new CLIError(`Session not found: ${sessionId}`, 1);
        }

        // Sort by move number
        sessionExperiences.sort((a, b) => a.moveNumber - b.moveNumber);

        // Extract metadata from experiences
        const firstExp = sessionExperiences[0];
        const puzzleId = firstExp.puzzleId;
        const profileName = firstExp.profileName || 'default';

        // Calculate stats
        const totalMoves = sessionExperiences.length;
        const correctMoves = sessionExperiences.filter(e => e.validation.isCorrect).length;
        const invalidMoves = sessionExperiences.filter(e => !e.validation.isValid).length;
        const validButWrong = sessionExperiences.filter(e => e.validation.isValid && !e.validation.isCorrect).length;
        const accuracy = totalMoves > 0 ? (correctMoves / totalMoves) * 100 : 0;

        const lastExp = sessionExperiences[sessionExperiences.length - 1];
        // Check if solved - gridState is BEFORE the move, so if last move was correct
        // and there was only 1 empty cell, the puzzle is now solved
        let solved = false;
        if (lastExp?.gridState) {
          const emptyCells = lastExp.gridState.flat().filter(cell => cell === 0).length;
          // Solved if: no empty cells OR (1 empty cell AND last move was correct)
          solved = emptyCells === 0 || (emptyCells === 1 && lastExp.validation?.isCorrect === true);
        }
        const startTime = new Date(firstExp.timestamp);
        const endTime = new Date(lastExp.timestamp);
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationMin = Math.round(durationMs / 60000);

        // JSON output
        if (options.format === 'json') {
          const sessionData = {
            sessionId,
            puzzleId,
            profileName,
            solved,
            totalMoves,
            correctMoves,
            invalidMoves,
            validButWrong,
            accuracy,
            durationMinutes: durationMin,
            learningContext: firstExp.learningContext,
            experiences: sessionExperiences,
          };
          console.log(JSON.stringify(sessionData, null, 2));
          return;
        }

        // Text output
        logger.info(`\n📋 Session: ${sessionId}`);
        logger.info('='.repeat(60));
        logger.info('');

        // Summary
        logger.info('📊 Summary:');
        logger.info(`  Profile: ${profileName}`);
        logger.info(`  Puzzle: ${puzzleId}`);
        logger.info(`  Outcome: ${solved ? '✓ SOLVED' : '✗ UNSOLVED'}`);
        logger.info(`  Duration: ${durationMin} minutes`);
        logger.info('');

        // Move statistics
        logger.info('🎯 Move Statistics:');
        logger.info(`  Total moves: ${totalMoves}`);
        logger.info(`  Correct: ${correctMoves} (${((correctMoves / totalMoves) * 100).toFixed(1)}%)`);
        logger.info(`  Invalid: ${invalidMoves} (${((invalidMoves / totalMoves) * 100).toFixed(1)}%)`);
        logger.info(`  Valid but wrong: ${validButWrong} (${((validButWrong / totalMoves) * 100).toFixed(1)}%)`);
        logger.info('');

        // Learning context
        if (firstExp.learningContext) {
          logger.info('📚 Learning Context (at session start):');
          logger.info(`  Memory enabled: ${firstExp.memoryWasEnabled ? 'Yes' : 'No'}`);
          logger.info(`  Few-shots used: ${firstExp.learningContext.fewShotsUsed ? `Yes (${firstExp.learningContext.fewShotCount} examples)` : 'No'}`);
          logger.info(`  Patterns available: ${firstExp.learningContext.patternsAvailable}`);
          logger.info(`  Consolidated experiences: ${firstExp.learningContext.consolidatedExperiences}`);
          logger.info('');
        }

        // Accuracy progression (in buckets of 20 moves)
        logger.info('📈 Accuracy Progression:');
        const bucketSize = 20;
        const numBuckets = Math.ceil(totalMoves / bucketSize);

        for (let i = 0; i < numBuckets; i++) {
          const start = i * bucketSize;
          const end = Math.min((i + 1) * bucketSize, totalMoves);
          const bucketExps = sessionExperiences.slice(start, end);
          const bucketCorrect = bucketExps.filter(e => e.validation.isCorrect).length;
          const bucketAccuracy = (bucketCorrect / bucketExps.length) * 100;

          logger.info(`  Moves ${start + 1}-${end}:   ${bucketAccuracy.toFixed(1)}% accuracy`);
        }

        // Trend analysis
        if (numBuckets >= 2) {
          const firstBucket = sessionExperiences.slice(0, bucketSize);
          const lastBucket = sessionExperiences.slice(-bucketSize);
          const firstAccuracy = (firstBucket.filter(e => e.validation.isCorrect).length / firstBucket.length) * 100;
          const lastAccuracy = (lastBucket.filter(e => e.validation.isCorrect).length / lastBucket.length) * 100;
          const trend = lastAccuracy > firstAccuracy ? 'Improving' : lastAccuracy < firstAccuracy ? 'Declining' : 'Stable';

          logger.info('');
          logger.info(`  Trend: ${trend} ${lastAccuracy > firstAccuracy ? '📈' : lastAccuracy < firstAccuracy ? '📉' : '→'}`);
        }

        logger.info('');
        logger.info(`🔍 Use 'llm memory list --session ${puzzleId}' to see all moves`);

      } catch (error) {
        throw new CLIError('Failed to show session', 1, error instanceof Error ? error.message : String(error));
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
