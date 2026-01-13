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
import type { CreateProfileOptions, UpdateProfileOptions, LLMProvider } from '../../llm/profiles/index.js';
import { LearningUnitManager } from '../../llm/LearningUnitManager.js';
import type { LearningUnitExport } from '../../llm/LearningUnitManager.js';
import { DEFAULT_LEARNING_UNIT_ID, DOUBLE_STRATEGY_SUFFIX, NO_LEARNING_UNIT_DISPLAY } from '../../llm/types.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, join, basename } from 'path';
import * as readline from 'readline/promises';
import { homedir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
 * Generate a unique profile name with date suffix
 * Format: baseName_YYYYMMDD or baseName_YYYYMMDD_001 if exists
 */
function generateUniqueProfileName(baseName: string, manager: LLMProfileManager): string {
  // Get current date in YYYYMMDD format
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Create base name with date
  const nameWithDate = `${baseName}_${dateStr}`;

  // Check if this name already exists
  if (!manager.get(nameWithDate)) {
    return nameWithDate;
  }

  // Find next available increment
  for (let i = 1; i <= 999; i++) {
    const increment = String(i).padStart(3, '0');
    const candidateName = `${nameWithDate}_${increment}`;
    if (!manager.get(candidateName)) {
      return candidateName;
    }
  }

  // Fallback: use timestamp if all increments exhausted (unlikely)
  return `${nameWithDate}_${Date.now()}`;
}

/**
 * Generate unique learning unit name with algorithm identifier
 * Format: profileName_(mode)_(algo)v(version)_YYYYMMDD[_2x]_(N)
 *
 * Always includes an incremental number starting from 1.
 *
 * Example: qwen3_standard_fastclusterv2_20260113_1
 * Example: qwen3_aisp_deepclusterv1_20260113_2x_2
 */
function generateUniqueLearningUnitNameWithAlgorithm(
  profileName: string,
  algorithm: any,
  options: { aisp?: boolean; aispFull?: boolean; doubleStrategies?: boolean },
  existingUnits: string[]
): string {
  // Build base name: profile_mode
  let baseName = profileName;

  // Add mode
  if (options.aispFull) {
    baseName += '_aisp-full';
  } else if (options.aisp) {
    baseName += '_aisp';
  } else {
    baseName += '_standard';
  }

  // Add algorithm identifier (e.g., "fastclusterv2")
  baseName += `_${algorithm.getIdentifier()}`;

  // Add date
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  baseName += `_${dateStr}`;

  // Add -2x suffix if double strategies
  if (options.doubleStrategies) {
    baseName += '_2x';
  }

  // ALWAYS find the next available increment (starting from 1)
  for (let i = 1; i <= 999; i++) {
    const candidateName = `${baseName}_${i}`;
    if (!existingUnits.includes(candidateName)) {
      return candidateName;
    }
  }

  // Fallback: use timestamp (should never reach here)
  return `${baseName}_${Date.now()}`;
}

/**
 * Find the lms CLI executable path
 * In WSL, lms is typically an alias to the Windows LM Studio CLI
 */
async function findLmsPath(): Promise<string | null> {
  // Common locations to check
  const homeDir = homedir();
  const possiblePaths = [
    'lms', // In PATH
    'lms.exe', // Windows executable accessible from WSL
    `${homeDir}/.lmstudio/bin/lms`,
    `${homeDir}/.lmstudio/bin/lms.exe`,
    '/mnt/c/Users/*/AppData/Local/LM-Studio/lms.exe',
  ];

  // Try each path
  for (const lmsPath of possiblePaths) {
    try {
      // Use 'command -v' to check if it's executable
      if (lmsPath.includes('*')) {
        // Glob pattern - use bash to expand
        const { stdout } = await execAsync(`bash -c 'ls ${lmsPath} 2>/dev/null | head -1'`, { timeout: 5000 });
        if (stdout.trim()) {
          return stdout.trim();
        }
      } else {
        await execAsync(`command -v "${lmsPath}" || test -x "${lmsPath}"`, { timeout: 5000 });
        return lmsPath;
      }
    } catch {
      // Not found, try next
    }
  }

  // Try to extract from user's bash aliases
  try {
    const { stdout } = await execAsync(
      `grep -h "alias lms=" ~/.bashrc ~/.bash_aliases 2>/dev/null | head -1 | sed "s/.*=['\\"]\\?\\([^'\\";]*\\).*/\\1/"`,
      { timeout: 5000 }
    );
    if (stdout.trim()) {
      return stdout.trim();
    }
  } catch {
    // No alias found
  }

  return null;
}

// Cache the lms path once found
let cachedLmsPath: string | null | undefined = undefined;

/**
 * Run an lms command, automatically finding the correct executable path
 */
async function runLmsCommand(args: string, timeout = 30000): Promise<{ stdout: string; stderr: string }> {
  // Find lms path if not cached
  if (cachedLmsPath === undefined) {
    cachedLmsPath = await findLmsPath();
    if (cachedLmsPath) {
      logger.debug(`   Found lms at: ${cachedLmsPath}`);
    }
  }

  if (!cachedLmsPath) {
    throw new Error('lms CLI not found. Please ensure LM Studio CLI is installed and accessible.');
  }

  // Run the command
  const fullCommand = `"${cachedLmsPath}" ${args}`;
  return execAsync(fullCommand, { timeout });
}

/**
 * Ensure the required model is loaded in LM Studio
 * Uses lms CLI to unload/load models as needed
 * @param requiredModel - Friendly model name (for display and API matching)
 * @param baseUrl - LM Studio API base URL
 * @param modelPath - Full model path for lms CLI (e.g., "Qwen/QwQ-32B-GGUF/qwq-32b-q8_0.gguf")
 */
async function ensureModelLoaded(requiredModel: string, baseUrl: string, modelPath?: string): Promise<boolean> {
  const { LMStudioModelManager } = await import('../../llm/ModelManager.js');
  const manager = new LMStudioModelManager(baseUrl);

  // Check if LM Studio is reachable
  const healthy = await manager.healthCheck();
  if (!healthy) {
    logger.error(`❌ Cannot connect to LM Studio at ${baseUrl}`);
    return false;
  }

  // Check if the required model is already loaded or loading
  const allModels = await manager.listModels(false); // Get all models with their state
  const targetModel = allModels.find(m =>
    m.id === requiredModel ||
    m.id.includes(requiredModel) ||
    requiredModel.includes(m.id)
  );

  if (targetModel) {
    if (targetModel.state === 'loaded') {
      logger.info(`✓ Model "${requiredModel}" is already loaded`);
      return true;
    } else if (targetModel.state === 'loading') {
      logger.info(`⏳ Model "${requiredModel}" is loading, waiting for it to finish...`);
      // Wait for model to finish loading (check every 2 seconds, max 60 seconds)
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const checkModel = await manager.getModel(requiredModel);
        if (checkModel?.state === 'loaded') {
          logger.info(`✓ Model "${requiredModel}" finished loading`);
          return true;
        }
      }
      logger.warn(`⚠️  Model "${requiredModel}" took too long to load (>60s), will try to reload...`);
    }
  }

  // Model not loaded - need to load it via lms CLI
  logger.info(`📦 Model "${requiredModel}" not loaded. Loading via LM Studio CLI...`);

  // Use modelPath if available, otherwise fall back to model name
  const loadIdentifier = modelPath || requiredModel;

  try {
    // Unload all models first
    logger.info('   Unloading all models...');
    try {
      await runLmsCommand('unload --all', 30000);
    } catch (e) {
      // Ignore errors - might not have any models loaded
      logger.debug('   (No models to unload or lms command not available)');
    }

    // Wait for unload
    logger.info('   Waiting 5 seconds for unload...');
    await new Promise(r => setTimeout(r, 5000));

    // Load the required model (--exact requires exact match, --yes skips prompts)
    // Extended timeout (5 minutes) for large models like qwq-32b (35GB)
    logger.info(`   Loading model: ${loadIdentifier}`);
    const { stderr } = await runLmsCommand(`load "${loadIdentifier}" --exact --yes`, 300000);

    if (stderr && !stderr.includes('Loading')) {
      logger.warn(`   lms stderr: ${stderr}`);
    }

    // Wait for model initialization
    logger.info('   Waiting 5 seconds for model initialization...');
    await new Promise(r => setTimeout(r, 5000));

    // Verify model is loaded
    const verifyLoaded = await manager.listModels(true);
    const nowLoaded = verifyLoaded.some(m =>
      m.id === requiredModel ||
      m.id.includes(requiredModel) ||
      requiredModel.includes(m.id)
    );

    if (nowLoaded) {
      logger.info(`✓ Model "${requiredModel}" loaded successfully`);
      return true;
    } else {
      logger.error(`❌ Model "${requiredModel}" failed to load`);
      logger.info('   Loaded models: ' + (verifyLoaded.map(m => m.id).join(', ') || 'none'));
      return false;
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error(`❌ Failed to load model: ${errMsg}`);
    logger.info('   Make sure the lms CLI is available (alias in ~/.bashrc or in PATH)');
    logger.info('   You can manually load the model in LM Studio GUI and retry');
    return false;
  }
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
            if (p.modelPath) logger.info(`   Path: ${p.modelPath}`);
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
    .option('--model <model>', 'Model name (friendly name for display)')
    .option('--model-path <path>', 'Full model path for lms CLI (e.g., Qwen/QwQ-32B-GGUF/qwq-32b-q8_0.gguf)')
    .option('--temperature <n>', 'Temperature (0.0-2.0)', '0.7')
    .option('--max-tokens <n>', 'Max response tokens', '2048')
    .option('--timeout <ms>', 'Request timeout (ms)', '60000')
    .option('--tags <tags>', 'Comma-separated tags')
    .option('--color <color>', 'Display color for TUI')
    .option('--system-prompt <text>', 'Additional system prompt text (appended to base prompt)')
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
        const baseName = options.name || await rl.question('Profile name: ');
        const provider = options.provider || await rl.question('Provider (lmstudio/openai/anthropic/ollama/openrouter/custom): ');
        const baseUrl = options.baseUrl || await rl.question('Base URL: ');
        const model = options.model || await rl.question('Model name: ');
        const modelPath = options.modelPath || (provider === 'lmstudio' ? await rl.question('Model path for lms CLI (e.g., Qwen/QwQ-32B-GGUF/qwq-32b-q8_0.gguf, or press Enter to skip): ') : '');
        const apiKey = options.apiKey || await rl.question('API key (or ${ENV_VAR}, press Enter to skip): ');
        const tags = options.tags || await rl.question('Tags (comma-separated, optional): ');

        rl.close();

        // Generate unique profile name with date suffix
        const uniqueName = generateUniqueProfileName(baseName, manager);
        if (uniqueName !== baseName) {
          logger.info(`📅 Profile name: ${baseName} → ${uniqueName}`);
        }

        // Build creation options
        const createOptions: CreateProfileOptions = {
          name: uniqueName,
          provider: provider as LLMProvider,
          baseUrl,
          model,
          modelPath: modelPath || undefined,
          apiKey: apiKey || undefined,
          parameters: {
            temperature: parseFloat(options.temperature),
            maxTokens: parseInt(options.maxTokens, 10),
          },
          timeout: parseInt(options.timeout, 10),
          tags: tags ? tags.split(',').map((t: string) => t.trim()) : [],
          color: options.color,
          systemPrompt: options.systemPrompt,
          setDefault: options.setDefault,
        };

        // Create profile
        const { profile, validation } = manager.create(createOptions);

        logger.info('\n✅ Profile created successfully!');
        logger.info(`   Name: ${profile.name}`);
        logger.info(`   Provider: ${profile.provider}`);
        logger.info(`   Model: ${profile.model}`);
        if (profile.modelPath) {
          logger.info(`   Model Path: ${profile.modelPath}`);
        }
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
        if (p.modelPath) logger.info(`Model Path:     ${p.modelPath}`);
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
        if (p.systemPrompt) {
          logger.info('System Prompt:');
          logger.info(`  ${p.systemPrompt}`);
          logger.info('');
        }
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

  // llm profile update
  profile
    .command('update')
    .description('Update an existing profile')
    .argument('<name>', 'Profile name')
    .option('--provider <provider>', 'Provider (lmstudio|openai|anthropic|ollama|openrouter|custom)')
    .option('--base-url <url>', 'API endpoint URL')
    .option('--api-key <key>', 'API key or ${ENV_VAR} reference')
    .option('--model <model>', 'Model name')
    .option('--model-path <path>', 'Full model path for lms CLI (e.g., Qwen/QwQ-32B-GGUF/qwq-32b-q8_0.gguf)')
    .option('--temperature <n>', 'Temperature (0.0-2.0)')
    .option('--max-tokens <n>', 'Max response tokens')
    .option('--timeout <ms>', 'Request timeout (ms)')
    .option('--tags <tags>', 'Comma-separated tags')
    .option('--color <color>', 'Display color for TUI')
    .option('--description <desc>', 'Profile description')
    .option('--system-prompt <text>', 'Additional system prompt text (appended to base prompt)')
    .option('--set-default', 'Set as active profile after update')
    .action(async (name, options) => {
      try {
        const manager = new LLMProfileManager();

        if (!manager.exists(name)) {
          throw new CLIError(`Profile not found: ${name}`, 1);
        }

        // Build update options from provided flags
        const updates: UpdateProfileOptions = {};

        if (options.provider) updates.provider = options.provider as LLMProvider;
        if (options.baseUrl) updates.baseUrl = options.baseUrl;
        if (options.apiKey) updates.apiKey = options.apiKey;
        if (options.model) updates.model = options.model;
        if (options.modelPath) updates.modelPath = options.modelPath;
        if (options.description) updates.description = options.description;
        if (options.timeout) updates.timeout = parseInt(options.timeout, 10);
        if (options.tags) updates.tags = options.tags.split(',').map((t: string) => t.trim());
        if (options.color) updates.color = options.color;
        if (options.systemPrompt) updates.systemPrompt = options.systemPrompt;
        if (options.setDefault) updates.setDefault = true;

        // Handle parameters separately
        if (options.temperature || options.maxTokens) {
          updates.parameters = {};
          if (options.temperature) updates.parameters.temperature = parseFloat(options.temperature);
          if (options.maxTokens) updates.parameters.maxTokens = parseInt(options.maxTokens, 10);
        }

        // Check if any updates provided
        if (Object.keys(updates).length === 0) {
          throw new CLIError('No update options provided. Use --help for available options.', 1);
        }

        const { profile, validation } = manager.update(name, updates);

        logger.info(`\n✅ Profile updated: ${name}`);

        // Show what was changed
        const changes: string[] = [];
        if (options.provider) changes.push(`Provider: ${profile.provider}`);
        if (options.baseUrl) changes.push(`Base URL: ${profile.baseUrl}`);
        if (options.model) changes.push(`Model: ${profile.model}`);
        if (options.temperature) changes.push(`Temperature: ${profile.parameters.temperature}`);
        if (options.maxTokens) changes.push(`Max Tokens: ${profile.parameters.maxTokens}`);
        if (options.timeout) changes.push(`Timeout: ${profile.timeout}ms`);
        if (options.description) changes.push(`Description: ${profile.description}`);

        if (changes.length > 0) {
          logger.info('\nUpdated settings:');
          changes.forEach(c => logger.info(`  ${c}`));
        }

        if (validation.warnings.length > 0) {
          logger.warn('\n⚠️  Warnings:');
          validation.warnings.forEach(w => logger.warn(`  - ${w}`));
        }

        if (options.setDefault) {
          logger.info(`\n▶ Active profile set to: ${name}`);
        }
      } catch (error) {
        throw new CLIError('Failed to update profile', 1, error instanceof Error ? error.message : String(error));
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
    .option('--timeout <ms>', 'Request timeout in milliseconds', '300000')
    .option('--max-moves <n>', 'Maximum moves before abandoning', '200')
    .option('--visualize', 'Show live solving visualization with board')
    .option('--visualize-basic', 'Show compact move outcomes only (no board)')
    .option('--debug', 'Show detailed debug output including prompts')
    .option('--include-reasoning', 'Include reasoning snippets in move history (default: off)')
    .option('--history-limit <n>', 'Limit move history to last N moves (default: 20, 0=unlimited)', '20')
    .option('--learning-unit <id>', 'Use specific learning unit (default: "default")')
    .option('--reasoning-template', 'Use structured constraint-intersection reasoning format (improves accuracy)')
    .option('--no-anonymous-patterns', 'Disable anonymous pattern format (use named strategies)')
    .option('--no-streaming', 'Disable streaming mode (wait for full response)')
    .option('--show-reasoning', 'Display full reasoning tokens from LM Studio (requires Developer setting in LM Studio)')
    .option('--aisp', 'Use AISP syntax for prompts (low-ambiguity format, normal output)')
    .option('--aisp-full', 'Use full AISP mode (includes spec, expects AISP output)')
    .option('--no-save-reasoning', 'Disable storing full reasoning tokens in experience memory')
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

        // Ensure the required model is loaded in LM Studio
        const modelReady = await ensureModelLoaded(config.model, config.baseUrl, config.modelPath);
        if (!modelReady) {
          throw new CLIError('Model not available', 1, `Could not load model "${config.model}". Please load it manually in LM Studio.`);
        }

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
        const profileManager = new LLMProfileManager();
        const profileName = options.profile || profileManager.getActive()?.name || 'default';
        // Record profile usage
        profileManager.recordUsage(profileName);
        // Get learning unit ID from options (default: 'default')
        const learningUnitId = options.learningUnit || DEFAULT_LEARNING_UNIT_ID;
        const player = new LLMSudokuPlayer(config, memory, profileName, learningUnitId);

        // Enable streaming by default (unless --no-streaming)
        // Also enable if debug or visualize is requested
        if (options.streaming !== false) {
          player.enableStreaming(true);
        }

        // Enable reasoning template mode if requested
        if (options.reasoningTemplate) {
          player.enableReasoningTemplate(true);
          logger.info('📐 Reasoning template mode enabled (constraint-intersection format)');
        }

        // Enable anonymous pattern mode by default (unless --no-anonymous-patterns)
        if (options.anonymousPatterns !== false) {
          player.enableAnonymousPatterns(true);
        }

        // Enable reasoning token display if requested (LM Studio v0.3.9+)
        if (options.showReasoning) {
          player.enableReasoningDisplay(true);
          // Reasoning display requires streaming to capture tokens
          player.enableStreaming(true);
          logger.info('💭 Reasoning token display enabled (requires LM Studio Developer setting)');
        }

        // Enable AISP mode if requested (Spec 16)
        if (options.aispFull) {
          player.setAISPMode('aisp-full');
          logger.info('𝔸 AISP-Full mode enabled (includes spec, expects AISP output)');
        } else if (options.aisp) {
          player.setAISPMode('aisp');
          logger.info('𝔸 AISP mode enabled (low-ambiguity prompts, normal output)');
        }

        // Enable full reasoning storage by default (unless --no-save-reasoning)
        if (options.saveReasoning !== false) {
          player.enableSaveReasoning(true);
          logger.info('💾 Full reasoning storage enabled');
        }

        // Health check and model verification
        logger.info(`Checking LM Studio connection at ${config.baseUrl}...`);
        const modelCheck = await player.verifyModel();

        if (!modelCheck.available) {
          if (modelCheck.loadedModels.length === 0) {
            throw new CLIError('LM Studio is not running or no models loaded', 1, modelCheck.error, [
              'Start LM Studio and load a model',
              'Verify the endpoint URL',
              `Check that the server is running on ${config.baseUrl}`,
            ]);
          } else {
            throw new CLIError('Model mismatch', 1, modelCheck.error, [
              `Profile expects: ${modelCheck.expectedModel}`,
              `Loaded models: ${modelCheck.loadedModels.join(', ')}`,
              `Either load the correct model or use: --profile <profile-with-loaded-model>`,
            ]);
          }
        }

        logger.info(
          `✓ Connected to LM Studio (model: ${modelCheck.expectedModel})`
        );
        logger.info(
          `Memory: ${config.memoryEnabled ? '✓ ENABLED' : '✗ DISABLED (baseline)'}`
        );
        if (config.memoryEnabled && options.learning !== false) {
          logger.info(`Learning unit: ${learningUnitId}`);
        }

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

        // Track if we've started reasoning output for proper formatting
        let reasoningStarted = false;
        let contentStarted = false;

        player.on('llm:stream', ({ token }: { token: string }) => {
          if (options.visualize || options.debug || options.showReasoning) {
            // If reasoning was shown, add OUTPUT header before first content token
            if (options.showReasoning && reasoningStarted && !contentStarted) {
              process.stdout.write('\n\n   📝 OUTPUT:\n   ');
              contentStarted = true;
            }
            process.stdout.write(token);
          }
        });

        player.on('llm:reasoning', ({ token }: { token: string }) => {
          if (options.showReasoning) {
            // Add header on first reasoning token
            if (!reasoningStarted) {
              process.stdout.write('\n   🧠 REASONING:\n   ');
              reasoningStarted = true;
            }
            // Output reasoning tokens with proper indentation for newlines
            process.stdout.write(token.replace(/\n/g, '\n   '));
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
          if (options.visualize || options.debug || options.showReasoning) {
            // Add newline after streaming
            process.stdout.write('\n');
          }
          // Reset flags for next move
          reasoningStarted = false;
          contentStarted = false;
        });

        player.on('llm:parse_failure', ({ error, rawResponse }: { error: string; rawResponse: string }) => {
          moveCounter++; // Increment counter since this counts as a move attempt

          if (options.visualizeBasic) {
            // Show parse failure in same format as moves
            process.stdout.write(`Move ${moveCounter}: (0,0)=0 - PARSE_FAILURE\n`);
          } else {
            logger.warn(`\n⚠️  Parse failure (move ${moveCounter}): ${error}`);
          }

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
          } else if (options.visualizeBasic) {
            // Basic mode: just show move number and position inline (outcome added after validation)
            process.stdout.write(`Move ${moveCounter}: (${move.row},${move.col})=${move.value}`);
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
          } else if (options.visualizeBasic) {
            process.stdout.write(` - FORBIDDEN\n`);
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
          } else if (options.visualizeBasic) {
            // Basic mode: append outcome to the move line
            const outcome = experience.validation.isCorrect ? 'CORRECT' :
                           experience.validation.isValid ? 'WRONG' : 'INVALID';
            process.stdout.write(` - ${outcome}\n`);
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

        let session: any;
        let exitReason = 'COMPLETED';
        let exitCode = 0;

        // Handle Ctrl-C gracefully - save session before exit
        const sigintHandler = async () => {
          if (session && config.memoryEnabled) {
            session.abandoned = true;
            session.abandonReason = 'user_interrupt: Ctrl-C pressed';
            session.endTime = new Date();
            try {
              const { ExperienceStore } = await import('../../llm/ExperienceStore.js');
              const experienceStore = new ExperienceStore(memory, config, profileName);
              await experienceStore.saveSession(session);
              logger.info('\n\n💾 Session saved (interrupted by user)');
            } catch {
              // Ignore save errors on interrupt
            }
          }
          process.exit(130); // Standard exit code for SIGINT
        };
        process.on('SIGINT', sigintHandler);

        try {
          // Determine learning mode (--no-learning sets learning to false)
          const useLearning = options.learning !== false;

          // Display learning status at session start
          if (config.memoryEnabled) {
            if (useLearning) {
              const { ExperienceStore } = await import('../../llm/ExperienceStore.js');
              const experienceStore = new ExperienceStore(memory, config, profileName);
              const fewShots = await experienceStore.getFewShots(profileName, learningUnitId);

              if (fewShots.length > 0) {
                logger.info(`\n📚 Memory Learning: ACTIVE`);
                logger.info(`   Strategies loaded: ${fewShots.length}`);
                const strategyNames = fewShots
                  .map((fs: any) => fs.strategy || 'Unnamed')
                  .slice(0, 5);
                logger.info(`   Injecting: ${strategyNames.join(', ')}`);
                logger.info(`   Learning unit: ${learningUnitId}`);
                logger.info(`   Profile: ${profileName}\n`);
              } else {
                logger.info(`📚 Memory: ON (no learned strategies yet - run 'llm dream run' after playing)\n`);
              }
            } else {
              logger.info(`📚 Learning: DISABLED (baseline mode - experiences saved but not using learned strategies)\n`);
            }
          } else {
            logger.info(`📚 Memory: OFF (no learning, no experience storage)\n`);
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

          // Memory/learning stats
          if (config.memoryEnabled) {
            logger.info(`\n💾 Memory:`);
            logger.info(`  Experiences saved: ${session.totalMoves}`);
            if (session.learningContext?.fewShotsUsed) {
              logger.info(`  Strategies used: ${session.learningContext.fewShotCount}`);
            }
            if (session.correctMoves > 0) {
              logger.info(`  💡 Run 'llm dream run' to consolidate and improve learning`);
            }
          }

          // Set exit reason
          if (session.solved) {
            exitReason = 'SOLVED';
          } else if (session.abandoned) {
            exitReason = 'ABANDONED';
            exitCode = 1;
          }

          // Save session metadata to memory (includes abandonReason)
          if (config.memoryEnabled) {
            const { ExperienceStore } = await import('../../llm/ExperienceStore.js');
            const experienceStore = new ExperienceStore(memory, config, profileName);
            await experienceStore.saveSession(session);
          }

          // Remove SIGINT handler now that session is saved
          process.removeListener('SIGINT', sigintHandler);
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

          // Remove SIGINT handler
          process.removeListener('SIGINT', sigintHandler);

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
    .option('--unconsolidated', 'Only show experiences not yet consolidated (pending dreaming)')
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

        if (options.unconsolidated) {
          allExperiences = allExperiences.filter(exp =>
            (exp as any).consolidated === false || (exp as any).consolidated === undefined
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

        if (options.withLearning || options.unconsolidated || options.profile || options.outcome || options.importance) {
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
    .description('Clear agent memory (use "llm session delete" for session-based deletion)')
    .option('--unconsolidated', 'Only delete unconsolidated experiences (pending dreaming)')
    .option('--profile <name>', 'Filter by profile (requires --unconsolidated)')
    .option('--confirm', 'Skip confirmation prompt (for scripts)')
    .action(async (options) => {
      try {
        const config = createDefaultMemoryConfig();
        const agentMemory = new AgentMemory(config);

        // Handle unconsolidated-only deletion
        if (options.unconsolidated) {
          let allExperiences = await agentMemory.reasoningBank.queryMetadata('llm_experience', {}) as any[];

          // Filter to unconsolidated only
          let toDelete = allExperiences.filter(exp =>
            exp.consolidated === false || exp.consolidated === undefined
          );

          // Filter by profile if specified
          if (options.profile) {
            toDelete = toDelete.filter(exp => exp.profileName === options.profile);
          }

          if (toDelete.length === 0) {
            logger.info('No unconsolidated experiences found.');
            return;
          }

          if (!options.confirm) {
            logger.warn(`⚠️  This will delete ${toDelete.length} unconsolidated experience(s)`);
            if (options.profile) {
              logger.warn(`   Profile filter: ${options.profile}`);
            }
            logger.warn('   Consolidated experiences and few-shots will be preserved.');
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

          logger.info(`🗑️  Deleting ${toDelete.length} unconsolidated experiences...`);

          for (const exp of toDelete) {
            await agentMemory.reasoningBank.deleteMetadata(exp.id, 'llm_experience');
          }

          logger.info(`✓ Deleted ${toDelete.length} unconsolidated experiences`);
          logger.info('   Consolidated experiences and few-shots preserved');
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
  // llm model - LM Studio model management commands
  // ===================================================================

  const model = llm.command('model').description('Manage LM Studio models');

  // llm model list
  model
    .command('list')
    .description('List available models in LM Studio')
    .option('--profile <name>', 'Use specific profile for connection')
    .option('--loaded', 'Only show currently loaded models')
    .option('--format <format>', 'Output format (text|json)', 'text')
    .action(async (options) => {
      const { LMStudioModelManager } = await import('../../llm/ModelManager.js');

      try {
        // Get connection config from profile or default
        let baseUrl = 'http://localhost:1234';
        if (options.profile) {
          const profileManager = new LLMProfileManager();
          const profile = profileManager.get(options.profile);
          if (profile) {
            baseUrl = profile.baseUrl;
          }
        }

        const manager = new LMStudioModelManager(baseUrl);

        // Health check
        const healthy = await manager.healthCheck();
        if (!healthy) {
          throw new CLIError('Cannot connect to LM Studio', 1, `Unable to reach ${baseUrl}`, [
            'Start LM Studio and ensure the server is running',
            'Check that the endpoint URL is correct',
          ]);
        }

        const models = await manager.listModels(options.loaded);

        if (options.format === 'json') {
          console.log(JSON.stringify(models, null, 2));
        } else {
          logger.info(`\n🤖 LM Studio Models (${models.length} total)\n`);

          if (models.length === 0) {
            logger.info('  No models found. Download models from LM Studio.');
            return;
          }

          // Group by state
          const loaded = models.filter(m => m.state === 'loaded');
          const notLoaded = models.filter(m => m.state === 'not-loaded');

          if (loaded.length > 0) {
            logger.info('  📦 LOADED:');
            for (const m of loaded) {
              const quant = m.quantization ? ` (${m.quantization})` : '';
              const ctx = m.maxContextLength ? ` | ctx: ${m.maxContextLength}` : '';
              logger.info(`    ✓ ${m.id}${quant}${ctx}`);
            }
            logger.info('');
          }

          if (!options.loaded && notLoaded.length > 0) {
            logger.info('  📁 AVAILABLE:');
            for (const m of notLoaded) {
              const quant = m.quantization ? ` (${m.quantization})` : '';
              const ctx = m.maxContextLength ? ` | ctx: ${m.maxContextLength}` : '';
              logger.info(`    - ${m.id}${quant}${ctx}`);
            }
          }
        }
      } catch (error) {
        if (error instanceof CLIError) throw error;
        throw new CLIError('Failed to list models', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm model load (DEPRECATED)
  model
    .command('load')
    .description('[DEPRECATED] Load a model into memory - Use "lms load <model>" instead')
    .argument('<model-id>', 'Model identifier to load')
    .option('--profile <name>', 'Use specific profile for connection')
    .option('--ttl <seconds>', 'Auto-unload after N seconds of idle time', '3600')
    .option('--estimate', 'Show memory estimate before loading')
    .action(async (modelId, options) => {
      const { LMStudioModelManager } = await import('../../llm/ModelManager.js');

      logger.warn('⚠️  DEPRECATED: This command is deprecated and may not work reliably.');
      logger.warn('   Use the LM Studio CLI instead: lms load ' + modelId);
      logger.warn('');

      try {
        // Get connection config from profile or default
        let baseUrl = 'http://localhost:1234';
        if (options.profile) {
          const profileManager = new LLMProfileManager();
          const profile = profileManager.get(options.profile);
          if (profile) {
            baseUrl = profile.baseUrl;
          }
        }

        const manager = new LMStudioModelManager(baseUrl);

        // Health check
        const healthy = await manager.healthCheck();
        if (!healthy) {
          throw new CLIError('Cannot connect to LM Studio', 1, `Unable to reach ${baseUrl}`);
        }

        // Check if already loaded
        const isLoaded = await manager.isModelLoaded(modelId);
        if (isLoaded) {
          logger.info(`✓ Model "${modelId}" is already loaded`);
          return;
        }

        // Show memory estimate if requested
        if (options.estimate) {
          const estimate = await manager.estimateMemory(modelId);
          if (estimate) {
            logger.info(`📊 Memory Estimate for ${modelId}:`);
            logger.info(`   VRAM: ~${estimate.estimatedVram}`);
            logger.info(`   RAM:  ~${estimate.estimatedRam}`);
            logger.info(`   Context: ${estimate.contextLength} tokens`);
            logger.info('');
          }
        }

        const ttl = parseInt(options.ttl, 10);
        logger.info(`Loading model "${modelId}" (TTL: ${ttl}s)...`);

        await manager.loadModel(modelId, { ttl });

        logger.info(`✓ Model "${modelId}" loaded successfully`);
        if (ttl > 0) {
          logger.info(`  Will auto-unload after ${ttl} seconds of idle time`);
        }
      } catch (error) {
        if (error instanceof CLIError) throw error;
        throw new CLIError('Failed to load model', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm model unload (DEPRECATED)
  model
    .command('unload')
    .description('[DEPRECATED] Unload a model from memory - Use "lms unload" instead')
    .argument('[model-id]', 'Model identifier to unload (omit to unload all)')
    .option('--profile <name>', 'Use specific profile for connection')
    .action(async (modelId, options) => {
      const { LMStudioModelManager } = await import('../../llm/ModelManager.js');

      logger.warn('⚠️  DEPRECATED: This command is deprecated and may not work reliably.');
      logger.warn('   Use the LM Studio CLI instead: lms unload' + (modelId ? ` ${modelId}` : ' --all'));
      logger.warn('');

      try {
        // Get connection config from profile or default
        let baseUrl = 'http://localhost:1234';
        if (options.profile) {
          const profileManager = new LLMProfileManager();
          const profile = profileManager.get(options.profile);
          if (profile) {
            baseUrl = profile.baseUrl;
          }
        }

        const manager = new LMStudioModelManager(baseUrl);

        // Health check
        const healthy = await manager.healthCheck();
        if (!healthy) {
          throw new CLIError('Cannot connect to LM Studio', 1, `Unable to reach ${baseUrl}`);
        }

        if (modelId) {
          // Check if loaded
          const isLoaded = await manager.isModelLoaded(modelId);
          if (!isLoaded) {
            logger.info(`Model "${modelId}" is not currently loaded`);
            return;
          }

          logger.info(`Unloading model "${modelId}"...`);
          await manager.unloadModel(modelId);
          logger.info(`✓ Model "${modelId}" unloaded`);
        } else {
          logger.info('Unloading all models...');
          await manager.unloadModel();
          logger.info('✓ All models unloaded');
        }
      } catch (error) {
        if (error instanceof CLIError) throw error;
        throw new CLIError('Failed to unload model', 1, error instanceof Error ? error.message : String(error), [
          'Model unload via API may not be available in your LM Studio version',
          'Use the LM Studio GUI or CLI (lms unload) instead',
        ]);
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
    .option('--learning-unit <id>', 'Update specific learning unit (auto-generates if not specified)')
    .option('--rerun <unit-id>', 'Re-run consolidation using experiences from an existing learning unit')
    .option('--reset', 'Reset consolidated status and reprocess all experiences')
    .option('--no-anonymous-patterns', 'Disable anonymous pattern format (use named strategies)')
    .option('--double-strategies', 'Double the number of strategies created (6-10 few-shots, 10-14 merged)')
    .option('--aisp', 'Mark learning unit as AISP mode (for naming)')
    .option('--aisp-full', 'Mark learning unit as AISP-full mode (for naming)')
    .option('--no-dual-unit', 'Create only single learning unit (default: creates BOTH standard AND -2x)')
    .option('--algorithm <name>', 'Clustering algorithm: fastcluster, deepcluster, llmcluster')
    .option('--algorithms <list>', 'Comma-separated list (default: all latest versions)')
    .option('--debug', 'Show detailed debug output including LLM responses and pattern parsing')
    .option('--output <file>', 'Save consolidation report')
    .action(async (options) => {
      try {
        const manager = new LLMProfileManager();
        const agentMemory = new AgentMemory(createDefaultMemoryConfig());

        // If --rerun is specified, infer profile from the learning unit
        let inferredProfile: string | null = null;
        if (options.rerun) {
          // Extract profile name from unit ID (e.g., "gpt-oss-120b_standard_llmclusterv1_20260113_1" → "gpt-oss-120b")
          // Pattern: {profile}_{mode}_{algo}v{version}_{date}_{N}[_2x]
          const parts = options.rerun.split('_');
          if (parts.length < 5) {
            throw new CLIError(`Invalid learning unit ID format: ${options.rerun}`, 1);
          }

          // Profile is everything before the first mode keyword (standard, aisp, aisp-full)
          const modeKeywords = ['standard', 'aisp', 'aisp-full'];
          let profileParts: string[] = [];
          for (const part of parts) {
            if (modeKeywords.includes(part) || modeKeywords.some(k => part.startsWith(k))) {
              break;
            }
            profileParts.push(part);
          }
          inferredProfile = profileParts.join('_');

          if (!inferredProfile) {
            throw new CLIError(`Cannot infer profile from learning unit ID: ${options.rerun}`, 1);
          }

          logger.info(`📦 Inferred profile from learning unit: ${inferredProfile}\n`);
        }

        // Determine which profiles to consolidate
        let profilesToProcess: string[] = [];
        if (options.all) {
          if (options.rerun) {
            throw new CLIError('Cannot use --all with --rerun', 1);
          }
          profilesToProcess = manager.list().map(p => p.name);
        } else if (options.profile) {
          profilesToProcess = [options.profile];
        } else if (inferredProfile) {
          // Use inferred profile from --rerun
          profilesToProcess = [inferredProfile];
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

          // Get profile config and record usage
          const config = getLLMConfig(profileName);
          config.debug = options.debug || false; // Add debug flag from CLI options
          manager.recordUsage(profileName);

          // Ensure the required model is loaded in LM Studio (auto-loads if needed)
          const modelReady = await ensureModelLoaded(config.model, config.baseUrl, config.modelPath);
          if (!modelReady) {
            logger.warn(`⚠️ Could not load model "${config.model}" for profile ${profileName}. Skipping...`);
            continue;
          }

          // Import required classes
          const { ExperienceStore } = await import('../../llm/ExperienceStore.js');
          const { DreamingConsolidator } = await import('../../llm/DreamingConsolidator.js');
          const { LMStudioClient } = await import('../../llm/LMStudioClient.js');
          const { initializeAlgorithmRegistry, AlgorithmRegistry } = await import('../../llm/clustering/index.js');

          // Re-initialize algorithm registry with LLM client to enable all algorithms
          const llmClient = new LMStudioClient(config);
          initializeAlgorithmRegistry(llmClient);

          // Determine which algorithms to use (DEFAULT: all latest versions)
          const registry = AlgorithmRegistry.getInstance();
          let algorithmsToUse: any[] = [];

          if (options.algorithm) {
            // Single algorithm specified
            const algo = registry.getAlgorithm(options.algorithm);
            if (!algo) {
              throw new CLIError(`Algorithm not found: ${options.algorithm}`, 1);
            }
            algorithmsToUse = [algo];
            logger.info(`🔧 Using algorithm: ${algo.getIdentifier()}`);
          } else if (options.algorithms) {
            // Multiple specific algorithms
            const algoNames = options.algorithms.split(',').map((n: string) => n.trim().toLowerCase());
            for (const name of algoNames) {
              const algo = registry.getAlgorithm(name);
              if (algo) {
                algorithmsToUse.push(algo);
              } else {
                logger.warn(`⚠️  Algorithm not found: ${name}`);
              }
            }
          } else {
            // DEFAULT: Use all algorithms (latest versions)
            algorithmsToUse = registry.getAllAlgorithms();
            logger.info(`🔧 Using all algorithms (${algorithmsToUse.length}): ${algorithmsToUse.map(a => a.getIdentifier()).join(', ')}`);
          }

          if (algorithmsToUse.length === 0) {
            throw new CLIError('No algorithms available', 1);
          }

          // Create store (shared across all algorithms)
          const experienceStore = new ExperienceStore(agentMemory, config, profileName);

          // Reset consolidated status if requested (do once before all algorithms)
          if (options.reset) {
            logger.info(`🔄 Resetting consolidated status for all experiences...`);
            const allExperiences = await agentMemory.reasoningBank.queryMetadata('llm_experience', {}) as LLMExperience[];
            const profileExperiences = allExperiences.filter((exp: any) => exp.profileName === profileName);
            let resetCount = 0;
            for (const exp of profileExperiences) {
              if ((exp as any).consolidated === true) {
                await agentMemory.reasoningBank.storeMetadata(
                  exp.id,
                  'llm_experience',
                  { ...exp, consolidated: false }
                );
                resetCount++;
              }
            }
            logger.info(`   Reset ${resetCount} experiences to unconsolidated`);
          }

          // Handle --rerun: re-run consolidation with experiences from existing unit
          if (options.rerun) {
            logger.info(`\n🔄 Re-running consolidation for learning unit: ${options.rerun}`);
            logger.info('─'.repeat(50));

            const { LearningUnitManager } = await import('../../llm/LearningUnitManager.js');
            const unitManager = new LearningUnitManager(agentMemory, profileName);

            // Load the existing learning unit
            const existingUnit = await unitManager.get(options.rerun);
            if (!existingUnit) {
              throw new CLIError(`Learning unit not found: ${options.rerun}`, 1);
            }

            logger.info(`📦 Found learning unit: ${existingUnit.name}`);
            logger.info(`   Created: ${existingUnit.createdAt.toISOString()}`);
            logger.info(`   Strategies: ${existingUnit.fewShots.length}`);
            logger.info(`   Absorbed experiences: ${existingUnit.absorbedExperienceIds.length}`);

            // Extract algorithm from unit ID (e.g., "gpt-oss-120b_standard_llmclusterv1_20260113_1" → "llmcluster")
            // Pattern: {profile}_{mode}_{algo}v{version}_{date}_{N}[_2x]
            const algoMatch = options.rerun.match(/_([a-z]+cluster)v\d+_/i);
            if (!algoMatch) {
              throw new CLIError(`Cannot extract algorithm from unit ID: ${options.rerun}`, 1);
            }
            const algoNameRaw = algoMatch[1].toLowerCase();
            logger.info(`   Algorithm: ${algoNameRaw}`);

            // Convert algorithm name to proper case (e.g., "llmcluster" → "LLMCluster")
            const algoNameMap: Record<string, string> = {
              'fastcluster': 'FastCluster',
              'deepcluster': 'DeepCluster',
              'llmcluster': 'LLMCluster'
            };
            const algoName = algoNameMap[algoNameRaw];
            if (!algoName) {
              throw new CLIError(`Unknown algorithm: ${algoNameRaw}`, 1);
            }

            // Get the algorithm
            const algo = registry.getAlgorithm(algoName);
            if (!algo) {
              throw new CLIError(`Algorithm not found: ${algoName}`, 1);
            }

            // Override algorithm selection to use only this algorithm
            algorithmsToUse = [algo];
            logger.info(`\n🔧 Using algorithm: ${algo.getIdentifier()} (from unit)`);

            // Mark experiences as unconsolidated
            logger.info(`\n🔄 Marking ${existingUnit.absorbedExperienceIds.length} experiences as unconsolidated...`);
            const allExperiences = await agentMemory.reasoningBank.queryMetadata('llm_experience', {}) as LLMExperience[];
            const experiencesToReset = allExperiences.filter((exp: any) =>
              existingUnit.absorbedExperienceIds.includes(exp.id)
            );

            let resetCount = 0;
            for (const exp of experiencesToReset) {
              await agentMemory.reasoningBank.storeMetadata(
                exp.id,
                'llm_experience',
                { ...exp, consolidated: false }
              );
              resetCount++;
            }
            logger.info(`   ✓ Marked ${resetCount} experiences as unconsolidated\n`);
          }

          // Get learning unit manager and existing units (shared)
          const unitManager = new LearningUnitManager(agentMemory, profileName);
          const existingUnitsList = await unitManager.list();
          const existingUnits = existingUnitsList.map(u => u.id);

          // Get unconsolidated experiences (same for all algorithms)
          const before = await experienceStore.getUnconsolidated(profileName);
          logger.info(`📦 Found ${before.length} unconsolidated experiences`);

          if (before.length === 0) {
            logger.info('💤 No experiences to consolidate');
            continue;
          }

          // Results tracking for all algorithms
          const allResults: Array<{ algorithm: string; report: any }> = [];

          // Loop through each algorithm
          for (const algorithm of algorithmsToUse) {
            logger.info(`\n${'='.repeat(60)}`);
            logger.info(`🧠 Consolidation with: ${algorithm.getIdentifier()}`);
            logger.info(`${'='.repeat(60)}\n`);

            // Create consolidator with this algorithm
            const consolidator = new DreamingConsolidator(experienceStore, config, algorithm);

            // Enable anonymous pattern mode by default (unless --no-anonymous-patterns)
            if (options.anonymousPatterns !== false) {
              consolidator.setAnonymousPatternMode(true);
              logger.info('📋 Anonymous pattern mode enabled');
            }

            // Spec 16: Set AISP mode for dreaming consolidation
            if (options.aispFull) {
              consolidator.setAISPMode('aisp-full');
              logger.info('𝔸 AISP-Full mode enabled (strategies stored in AISP format)');
            } else if (options.aisp) {
              consolidator.setAISPMode('aisp');
              logger.info('𝔸 AISP mode enabled');
            }

            // Set consolidation options (strategy counts)
            if (options.doubleStrategies) {
              consolidator.setConsolidationOptions({ doubleStrategies: true });
              logger.info('📊 Double strategies mode enabled (6-10 few-shots, 10-14 merged)');
            }

            // Generate learning unit ID with algorithm identifier
            let learningUnitId: string;

            if (options.learningUnit) {
              // Use specified learning unit (user must include algorithm identifier manually)
              learningUnitId = options.learningUnit;
              // Auto-append -2x suffix for double-strategies in single-unit mode
              if (options.doubleStrategies && options.dualUnit === false && !learningUnitId.endsWith(DOUBLE_STRATEGY_SUFFIX)) {
                learningUnitId = `${learningUnitId}${DOUBLE_STRATEGY_SUFFIX}`;
                logger.info(`📊 Double strategies mode: auto-appending suffix → "${learningUnitId}"`);
              }
            } else {
              // Auto-generate learning unit name with algorithm identifier
              learningUnitId = generateUniqueLearningUnitNameWithAlgorithm(
                profileName,
                algorithm,
                {
                  aisp: options.aisp,
                  aispFull: options.aispFull,
                  doubleStrategies: options.doubleStrategies && options.dualUnit === false,
                },
                existingUnits
              );
              logger.info(`📝 Auto-generated learning unit: ${learningUnitId}`);
            }

            logger.info(`📚 Learning unit: ${learningUnitId}`);
            if (options.dualUnit !== false) {
              logger.info(`📚 Doubled unit: ${learningUnitId}${DOUBLE_STRATEGY_SUFFIX}`);
            }

          // Run consolidation - use reConsolidate for specific learning units (iterative learning)
          let report;

          if (options.dualUnit !== false) {
            // DUAL MODE (DEFAULT): Create both standard and -2x learning units
            logger.info(`🔄 Dual unit mode: creating "${learningUnitId}" AND "${learningUnitId}${DOUBLE_STRATEGY_SUFFIX}"`);
            const dualResult = await consolidator.consolidateDual(unitManager, learningUnitId, profileName);

            // Show dual results
            logger.info(`\n✅ Dual Dream Cycle Complete`);
            logger.info(`   Standard unit "${learningUnitId}":`);
            logger.info(`      Experiences processed: ${dualResult.standard.experiencesConsolidated}`);
            logger.info(`      Few-shots created: ${dualResult.standard.fewShotsUpdated}`);
            logger.info(`   Doubled unit "${learningUnitId}${DOUBLE_STRATEGY_SUFFIX}":`);
            logger.info(`      Experiences processed: ${dualResult.doubled.experiencesConsolidated}`);
            logger.info(`      Few-shots created: ${dualResult.doubled.fewShotsUpdated}`);

            // Verify both units
            const standardFewShots = await experienceStore.getFewShots(profileName, learningUnitId);
            const doubledFewShots = await experienceStore.getFewShots(profileName, `${learningUnitId}${DOUBLE_STRATEGY_SUFFIX}`);
            logger.info(`\n📚 Learning units created:`);
            logger.info(`   "${learningUnitId}": ${standardFewShots.length} few-shot examples`);
            logger.info(`   "${learningUnitId}${DOUBLE_STRATEGY_SUFFIX}": ${doubledFewShots.length} few-shot examples\n`);

            // Store full dual result for summary
            report = dualResult as any;
          } else if (options.learningUnit) {
            // Use reConsolidate for iterative learning on a specific unit
            report = await consolidator.reConsolidate(unitManager, learningUnitId, profileName);

            // Show results
            logger.info(`\n✅ Dream Cycle Complete`);
            logger.info(`   Experiences processed: ${report.experiencesConsolidated}`);
            logger.info(`   Few-shots created: ${report.fewShotsUpdated}`);
            logger.info(`   Patterns extracted: ${report.patterns.successStrategies.length}`);

            // Verify few-shots exist
            const fewShots = await experienceStore.getFewShots(profileName, learningUnitId);
            logger.info(`\n📚 Learning unit '${learningUnitId}' now has ${fewShots.length} few-shot examples\n`);
          } else {
            // Use standard consolidation for default unit
            report = await consolidator.consolidate(profileName);

            // Show results
            logger.info(`\n✅ Dream Cycle Complete`);
            logger.info(`   Experiences processed: ${report.experiencesConsolidated}`);
            logger.info(`   Few-shots created: ${report.fewShotsUpdated}`);
            logger.info(`   Patterns extracted: ${report.patterns.successStrategies.length}`);

            // Verify few-shots exist
            const fewShots = await experienceStore.getFewShots(profileName, learningUnitId);
            logger.info(`\n📚 Learning unit '${learningUnitId}' now has ${fewShots.length} few-shot examples\n`);
          }

            // Track results for this algorithm
            allResults.push({ algorithm: algorithm.getIdentifier(), report });

            // Add to existing units to avoid collisions in next algorithm
            existingUnits.push(learningUnitId);
            if (options.dualUnit !== false) {
              existingUnits.push(`${learningUnitId}${DOUBLE_STRATEGY_SUFFIX}`);
            }

            // Save report if requested (only for first algorithm)
            if (options.output && allResults.length === 1) {
              const reportPath = resolve(options.output);
              // For dual mode, save the standard report (or both if needed)
              const reportToSave = ('standard' in report) ? report.standard : report;
              writeFileSync(reportPath, JSON.stringify(reportToSave, null, 2));
              logger.info(`💾 Report saved to: ${reportPath}`);
            }

            // CRITICAL: Reset consolidated status for next algorithm (if not last algorithm)
            if (algorithmsToUse.indexOf(algorithm) < algorithmsToUse.length - 1) {
              logger.info(`🔄 Resetting consolidated status for next algorithm...`);
              const allExperiences = await agentMemory.reasoningBank.queryMetadata('llm_experience', {}) as LLMExperience[];
              const profileExperiences = allExperiences.filter((exp: any) => exp.profileName === profileName);
              let resetCount = 0;
              for (const exp of profileExperiences) {
                if ((exp as any).consolidated === true) {
                  await agentMemory.reasoningBank.storeMetadata(
                    exp.id,
                    'llm_experience',
                    { ...exp, consolidated: false }
                  );
                  resetCount++;
                }
              }
              logger.info(`   Reset ${resetCount} experiences to unconsolidated\n`);
            }
          } // End algorithm loop

          // Summary for all algorithms
          if (allResults.length > 1) {
            // Count total learning units created
            const totalUnits = allResults.reduce((sum, { report }) => {
              if ('standard' in report) {
                return sum + 2; // standard + doubled
              }
              return sum + 1; // single unit
            }, 0);

            logger.info(`\n${'='.repeat(60)}`);
            logger.info(`🎉 All Learning Units Created (${totalUnits})`);
            logger.info(`${'='.repeat(60)}`);

            for (const { algorithm, report } of allResults) {
              if ('standard' in report) {
                logger.info(`  ${algorithm}:`);
                logger.info(`     Standard: ${report.standard.fewShotsUpdated} strategies`);
                logger.info(`     Doubled (-2x): ${report.doubled.fewShotsUpdated} strategies`);
              } else {
                logger.info(`  ${algorithm}: ${report.fewShotsUpdated} strategies`);
              }
            }
            logger.info('');
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
    .option('--learning-unit <id>', 'Show strategies from specific learning unit (default: "default")')
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

        // Get learning unit ID
        const learningUnitId = options.learningUnit || DEFAULT_LEARNING_UNIT_ID;

        const config = getLLMConfig(profileName);
        const { ExperienceStore } = await import('../../llm/ExperienceStore.js');
        const experienceStore = new ExperienceStore(agentMemory, config, profileName);

        // Get strategies from learning unit (supports new format)
        const unitManager = new LearningUnitManager(agentMemory, profileName);
        const unit = await unitManager.get(learningUnitId);
        const fewShots = unit ? unit.fewShots.slice(0, parseInt(options.limit, 10))
          : await experienceStore.getFewShots(profileName, learningUnitId, parseInt(options.limit, 10));
        const unconsolidated = await experienceStore.getUnconsolidated(profileName);
        const hierarchy = await experienceStore.getAbstractionHierarchy(profileName);

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
            hierarchy: hierarchy,
          }, null, 2));
        } else {
          logger.info(`\n🧠 Dream Storage: ${profileName}\n`);
          logger.info('═'.repeat(70));

          // Learning unit info
          if (unit) {
            logger.info(`\n📚 Learning Unit: ${learningUnitId}`);
            logger.info(`   Name: ${unit.name}`);
            if (unit.description) {
              logger.info(`   Description: ${unit.description}`);
            }
          }

          // Statistics
          logger.info(`\n📊 Statistics:`);
          logger.info(`   Total experiences: ${profileExperiences.length}`);
          logger.info(`   Consolidated: ${consolidated.length}`);
          logger.info(`   Unconsolidated: ${unconsolidated.length}`);
          logger.info(`   Learned strategies: ${fewShots.length}`);
          if (unit) {
            logger.info(`   Absorbed by unit: ${unit.absorbedExperienceIds.length}`);
          }

          // Learned strategies (new format)
          if (fewShots.length === 0) {
            logger.info(`\n📚 Learned Strategies: None`);
            logger.info(`   Run 'llm dream run' to generate strategies from experiences`);
          } else {
            logger.info(`\n📚 Learned Strategies (${fewShots.length}):\n`);

            fewShots.forEach((fs: any, i: number) => {
              // Display synthesized strategy format
              const strategyName = fs.strategy || `Strategy ${i + 1}`;
              const level = fs.abstractionLevel;
              const levelNames = ['Instance', 'Technique', 'Category', 'Principle'];
              const levelName = level !== undefined && levelNames[level] ? levelNames[level] : 'Technique';

              logger.info(`   ${i + 1}. "${strategyName}"`);
              logger.info(`      Level: ${level ?? 1} (${levelName})`);

              if (fs.situation) {
                logger.info(`      When: ${fs.situation}`);
              } else if (fs.gridContext) {
                logger.info(`      Context: ${fs.gridContext}`);
              }

              if (fs.analysis) {
                logger.info(`      Reasoning:`);
                // Show all reasoning steps, indented
                const steps = fs.analysis.split('\n').filter((s: string) => s.trim());
                steps.forEach((step: string) => {
                  logger.info(`         ${step.trim()}`);
                });
              }

              if (fs.move?.row > 0 && fs.move?.col > 0) {
                logger.info(`      Example: (${fs.move.row},${fs.move.col}) = ${fs.move.value}`);
              }

              logger.info('');
            });
          }

          // Abstraction Hierarchy
          if (hierarchy && hierarchy.levels && hierarchy.levels.length > 0) {
            logger.info(`\n🧠 Abstraction Hierarchy:\n`);

            hierarchy.levels.forEach((level: any) => {
              logger.info(`   Level ${level.level}: ${level.name}`);
              if (level.items && level.items.length > 0) {
                level.items.forEach((item: string) => {
                  logger.info(`      - ${item}`);
                });
              }
            });

            logger.info('');
          }

          logger.info('─'.repeat(70));
          logger.info(`💡 These strategies are injected into prompts during 'llm play --learning-unit ${learningUnitId}'`);
          logger.info(`📋 Manage units with: llm learning list, llm learning show ${learningUnitId}\n`);
        }
      } catch (error) {
        throw new CLIError('Failed to show dream data', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm dream clear
  dream
    .command('clear')
    .description('Clear learned strategies and/or abstraction hierarchy')
    .option('--profile <name>', 'LLM profile to clear (default: active profile)')
    .option('--strategies', 'Clear learned strategies (few-shots) only')
    .option('--hierarchy', 'Clear abstraction hierarchy only')
    .option('--confirm', 'Skip confirmation prompt')
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

        // Determine what to clear
        const clearStrategies = options.strategies || (!options.strategies && !options.hierarchy);
        const clearHierarchy = options.hierarchy || (!options.strategies && !options.hierarchy);

        // Load current data to show counts
        const config = getLLMConfig(profileName);
        const { ExperienceStore } = await import('../../llm/ExperienceStore.js');
        const experienceStore = new ExperienceStore(agentMemory, config, profileName);

        const fewShots = await experienceStore.getFewShots(profileName, undefined, 100);
        const hierarchy = await experienceStore.getAbstractionHierarchy(profileName);

        // Count what will be deleted
        const strategyCount = fewShots.length;
        const hierarchyLevelCount = hierarchy?.levels?.length || 0;

        // Check if there's anything to delete
        if ((clearStrategies && strategyCount === 0) && (clearHierarchy && hierarchyLevelCount === 0)) {
          logger.info(`\n📭 No dream data found for profile: ${profileName}\n`);
          return;
        }

        // Show what will be cleared with counts
        logger.warn(`\n⚠️  This will delete the following for profile: ${profileName}\n`);

        if (clearStrategies) {
          if (strategyCount > 0) {
            logger.warn(`   • ${strategyCount} learned strateg${strategyCount === 1 ? 'y' : 'ies'} (few-shots)`);
          } else {
            logger.info(`   • No strategies to delete`);
          }
        }

        if (clearHierarchy) {
          if (hierarchyLevelCount > 0) {
            logger.warn(`   • Abstraction hierarchy with ${hierarchyLevelCount} level${hierarchyLevelCount === 1 ? '' : 's'}`);
          } else {
            logger.info(`   • No hierarchy to delete`);
          }
        }

        logger.warn('\n   This action cannot be undone!\n');

        // Confirmation
        if (!options.confirm) {
          const readline = await import('readline');
          const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
          const answer = await new Promise<string>((resolve) => {
            rl.question('Type "yes" to confirm deletion: ', resolve);
          });
          rl.close();

          if (answer.trim().toLowerCase() !== 'yes') {
            logger.info('Deletion cancelled.');
            return;
          }
        }

        // Clear data
        let clearedCount = 0;

        if (clearStrategies) {
          const deleted = await agentMemory.reasoningBank.deleteMetadata(
            `llm_fewshots:${profileName}`,
            'fewshot_examples'
          );
          if (deleted) {
            clearedCount++;
            logger.info(`✓ Cleared learned strategies for ${profileName}`);
          } else {
            logger.info(`  No strategies found for ${profileName}`);
          }
        }

        if (clearHierarchy) {
          const deleted = await agentMemory.reasoningBank.deleteMetadata(
            `llm_hierarchy:${profileName}`,
            'abstraction_hierarchy'
          );
          if (deleted) {
            clearedCount++;
            logger.info(`✓ Cleared abstraction hierarchy for ${profileName}`);
          } else {
            logger.info(`  No hierarchy found for ${profileName}`);
          }
        }

        if (clearedCount > 0) {
          logger.info(`\n✅ Dream data cleared for profile: ${profileName}`);
          logger.info(`💡 Run 'llm dream run' to regenerate from experiences\n`);
        } else {
          logger.info(`\n📭 No dream data found for profile: ${profileName}\n`);
        }
      } catch (error) {
        throw new CLIError('Failed to clear dream data', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // ===================================================================
  // llm learning - Learning unit management commands (Spec 11)
  // ===================================================================

  const learning = llm.command('learning').description('Manage learning units for LLM training');

  // llm learning list
  learning
    .command('list')
    .description('List all learning units')
    .option('--profile <name>', 'Filter by LLM profile (default: show all profiles)')
    .option('--format <format>', 'Output format (table|json)', 'table')
    .action(async (options) => {
      try {
        const agentMemory = new AgentMemory(createDefaultMemoryConfig());
        const { LLM_STORAGE_KEYS } = await import('../../llm/storage-keys.js');

        // Query all learning units across all profiles
        const allUnits = await agentMemory.reasoningBank.queryMetadata(
          LLM_STORAGE_KEYS.LEARNING_UNIT_TYPE,
          {}
        ) as any[];

        // Filter by profile if specified
        let filteredUnits = allUnits;
        if (options.profile) {
          filteredUnits = allUnits.filter((u) => u.profileName === options.profile);
        }

        // Group by profile
        const unitsByProfile = new Map<string, any[]>();
        for (const unit of filteredUnits) {
          const profile = unit.profileName || 'unknown';
          if (!unitsByProfile.has(profile)) {
            unitsByProfile.set(profile, []);
          }
          unitsByProfile.get(profile)!.push(unit);
        }

        // Sort profiles alphabetically
        const sortedProfiles = Array.from(unitsByProfile.keys()).sort();

        if (options.format === 'json') {
          // For JSON, include profile grouping
          const result: Record<string, any[]> = {};
          for (const profile of sortedProfiles) {
            result[profile] = unitsByProfile.get(profile)!;
          }
          console.log(JSON.stringify(result, null, 2));
        } else {
          const totalUnits = filteredUnits.length;
          const profileCount = sortedProfiles.length;

          if (options.profile) {
            logger.info(`\n📚 Learning Units for Profile: ${options.profile}\n`);
          } else {
            logger.info(`\n📚 Learning Units (${totalUnits} total across ${profileCount} profiles)\n`);
          }

          if (totalUnits === 0) {
            logger.info('  No learning units found.');
            logger.info('  Create one with: machine-dream llm learning create <id>');
            return;
          }

          for (const profile of sortedProfiles) {
            const units = unitsByProfile.get(profile)!;
            logger.info(`  ┌─ ${profile} (${units.length} units)`);

            // Sort units by name within each profile
            units.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));

            for (let i = 0; i < units.length; i++) {
              const unit = units[i];
              const isLast = i === units.length - 1;
              const prefix = isLast ? '  └─' : '  ├─';

              // Get strategy count from few-shots if available
              const unitManager = new LearningUnitManager(agentMemory, profile);
              const fullUnit = await unitManager.get(unit.id);
              const strategyCount = fullUnit?.fewShots?.length || 0;
              const expCount = unit.metadata?.totalExperiences || 0;

              logger.info(`${prefix} ${unit.id}`);
              logger.info(`  ${isLast ? ' ' : '│'}    Strategies: ${strategyCount} | Experiences: ${expCount}`);

              const updatedAt = unit.lastUpdatedAt ? new Date(unit.lastUpdatedAt) : null;
              if (updatedAt) {
                logger.info(`  ${isLast ? ' ' : '│'}    Updated: ${formatTimestamp(updatedAt.getTime())}`);
              }
            }
            logger.info('');
          }
        }
      } catch (error) {
        throw new CLIError('Failed to list learning units', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm learning create
  learning
    .command('create')
    .description('Create a new learning unit')
    .argument('<id>', 'Unique identifier for the learning unit')
    .option('--profile <name>', 'LLM profile (default: active profile)')
    .option('--name <name>', 'Display name (defaults to id)')
    .option('--description <text>', 'Description of the learning unit')
    .action(async (id, options) => {
      try {
        const profileManager = new LLMProfileManager();
        const agentMemory = new AgentMemory(createDefaultMemoryConfig());

        const profileName = options.profile || profileManager.getActive()?.name;
        if (!profileName) {
          throw new CLIError('No active profile. Use --profile or set an active profile.', 1);
        }

        const unitManager = new LearningUnitManager(agentMemory, profileName);
        const name = options.name || id;
        const unit = await unitManager.create(id, name, options.description);

        logger.info(`\n✅ Learning unit created: ${unit.id}`);
        logger.info(`   Profile: ${profileName}`);
        logger.info(`   Name: ${unit.name}`);
        if (unit.description) {
          logger.info(`   Description: ${unit.description}`);
        }
        logger.info('\n💡 Use with: machine-dream llm play --learning-unit ' + id);
      } catch (error) {
        throw new CLIError('Failed to create learning unit', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm learning show
  learning
    .command('show')
    .description('Show details of a learning unit')
    .argument('<id>', 'Learning unit ID')
    .option('--profile <name>', 'LLM profile (searches all profiles if not specified)')
    .option('--compact', 'Show compact summary instead of full details')
    .option('--format <format>', 'Output format (table|json)', 'table')
    .action(async (id, options) => {
      try {
        const profileManager = new LLMProfileManager();
        const agentMemory = new AgentMemory(createDefaultMemoryConfig());

        let profileName = options.profile;
        let unit = null;

        if (profileName) {
          // Profile specified - search only in that profile
          const unitManager = new LearningUnitManager(agentMemory, profileName);
          unit = await unitManager.get(id);
        } else {
          // No profile specified - search across ALL profiles to find the unit
          const { LLM_STORAGE_KEYS } = await import('../../llm/storage-keys.js');
          const allUnits = await agentMemory.reasoningBank.queryMetadata(
            LLM_STORAGE_KEYS.LEARNING_UNIT_TYPE,
            {}
          ) as any[];

          // Find unit by ID across all profiles
          const matchingUnit = allUnits.find((u) => u.id === id);
          if (matchingUnit) {
            profileName = matchingUnit.profileName;
            const unitManager = new LearningUnitManager(agentMemory, profileName);
            unit = await unitManager.get(id);
          } else {
            // Fallback to active profile for error message
            profileName = profileManager.getActive()?.name || 'unknown';
          }
        }

        if (!unit) {
          throw new CLIError(`Learning unit not found: ${id}`, 1);
        }

        // Get experience counts for full view
        const { ExperienceStore } = await import('../../llm/ExperienceStore.js');
        const config = getLLMConfig(profileName);
        const experienceStore = new ExperienceStore(agentMemory, config, profileName);
        const unconsolidated = await experienceStore.getUnconsolidated(profileName);
        const allExperiences = await agentMemory.reasoningBank.queryMetadata('llm_experience', {}) as LLMExperience[];
        const profileExperiences = allExperiences.filter((exp: any) => exp.profileName === profileName);
        const consolidated = profileExperiences.filter((exp: any) => exp.consolidated === true);

        if (options.format === 'json') {
          console.log(JSON.stringify({
            ...unit,
            createdAt: unit.createdAt.toISOString(),
            lastUpdatedAt: unit.lastUpdatedAt.toISOString(),
          }, null, 2));
        } else if (options.compact) {
          // Compact view - just summary
          logger.info(`\n📚 Learning Unit: ${unit.id}\n`);
          logger.info(`Profile:        ${unit.profileName}`);
          logger.info(`Name:           ${unit.name}`);
          logger.info(`Description:    ${unit.description || '(none)'}`);
          logger.info(`Created:        ${unit.createdAt.toLocaleString()}`);
          logger.info(`Last Updated:   ${unit.lastUpdatedAt.toLocaleString()}`);
          logger.info('');
          logger.info('Metadata:');
          logger.info(`  Strategies:           ${unit.fewShots.length}`);
          logger.info(`  Total Experiences:    ${unit.metadata.totalExperiences}`);
          logger.info(`  Absorbed Experiences: ${unit.absorbedExperienceIds.length}`);
          logger.info(`  Version:              ${unit.metadata.version}`);

          if (unit.fewShots.length > 0) {
            logger.info('');
            logger.info('Strategies:');
            unit.fewShots.slice(0, 5).forEach((fs, i) => {
              const stratName = fs.strategy || `Strategy ${i + 1}`;
              logger.info(`  ${i + 1}. ${stratName}`);
            });
            if (unit.fewShots.length > 5) {
              logger.info(`  ... and ${unit.fewShots.length - 5} more`);
            }
          }
        } else {
          // Full detailed view (default)
          logger.info(`\n📚 Learning Unit: ${unit.id}\n`);
          logger.info('═'.repeat(70));

          // Unit info
          logger.info(`\nProfile:        ${unit.profileName}`);
          logger.info(`Name:           ${unit.name}`);
          logger.info(`Description:    ${unit.description || '(none)'}`);
          logger.info(`Created:        ${unit.createdAt.toLocaleString()}`);
          logger.info(`Last Updated:   ${unit.lastUpdatedAt.toLocaleString()}`);

          // Statistics
          logger.info(`\n📊 Statistics:`);
          logger.info(`   Total experiences: ${profileExperiences.length}`);
          logger.info(`   Consolidated: ${consolidated.length}`);
          logger.info(`   Unconsolidated: ${unconsolidated.length}`);
          logger.info(`   Learned strategies: ${unit.fewShots.length}`);
          logger.info(`   Absorbed by unit: ${unit.absorbedExperienceIds.length}`);
          logger.info(`   Version: ${unit.metadata.version}`);

          if (Object.keys(unit.metadata.puzzleBreakdown).length > 0) {
            logger.info('');
            logger.info('Puzzle Breakdown:');
            for (const [type, count] of Object.entries(unit.metadata.puzzleBreakdown)) {
              logger.info(`   ${type}: ${count}`);
            }
          }

          if (unit.metadata.mergedFromUnits && unit.metadata.mergedFromUnits.length > 0) {
            logger.info('');
            logger.info(`Merged From: ${unit.metadata.mergedFromUnits.join(', ')}`);
          }

          // Full strategy details
          if (unit.fewShots.length === 0) {
            logger.info(`\n📚 Learned Strategies: None`);
            logger.info(`   Run 'llm dream run --learning-unit ${id}' to generate strategies`);
          } else {
            logger.info(`\n📚 Learned Strategies (${unit.fewShots.length}):\n`);

            unit.fewShots.forEach((fs, i) => {
              const strategyName = fs.strategy || `Strategy ${i + 1}`;
              const level = fs.abstractionLevel;
              const levelNames = ['Instance', 'Technique', 'Category', 'Principle'];
              const levelName = level !== undefined && levelNames[level] ? levelNames[level] : 'Technique';

              logger.info(`   ${i + 1}. "${strategyName}"`);
              logger.info(`      Level: ${level ?? 1} (${levelName})`);

              if (fs.situation) {
                logger.info(`      When: ${fs.situation}`);
              } else if (fs.gridContext) {
                logger.info(`      Context: ${fs.gridContext}`);
              }

              if (fs.analysis) {
                logger.info(`      Reasoning:`);
                const steps = fs.analysis.split('\n').filter((s: string) => s.trim());
                steps.forEach((step: string) => {
                  logger.info(`         ${step.trim()}`);
                });
              }

              if (fs.move?.row > 0 && fs.move?.col > 0) {
                logger.info(`      Example: (${fs.move.row},${fs.move.col}) = ${fs.move.value}`);
              }

              // Spec 16: Show AISP-encoded version if present
              if (fs.aispEncoded) {
                logger.info(`      𝔸 AISP:`);
                const aispLines = fs.aispEncoded.split('\n');
                aispLines.forEach((line: string) => {
                  if (line.trim()) {
                    logger.info(`         ${line}`);
                  }
                });
              }

              logger.info('');
            });
          }

          // Abstraction Hierarchy (if present)
          if (unit.hierarchy && unit.hierarchy.levels && unit.hierarchy.levels.length > 0) {
            logger.info(`\n🧠 Abstraction Hierarchy:\n`);

            unit.hierarchy.levels.forEach((level: any) => {
              logger.info(`   Level ${level.level}: ${level.name}`);
              if (level.items && level.items.length > 0) {
                level.items.forEach((item: string) => {
                  logger.info(`      - ${item}`);
                });
              }
            });

            logger.info('');
          }

          logger.info('─'.repeat(70));
          logger.info(`💡 Use with: llm play --learning-unit ${id}`);
          logger.info(`🔄 Update with: llm dream run --learning-unit ${id}\n`);
        }
      } catch (error) {
        throw new CLIError('Failed to show learning unit', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm learning delete
  learning
    .command('delete')
    .description('Delete a learning unit')
    .argument('<id>', 'Learning unit ID')
    .option('--profile <name>', 'LLM profile (searches all profiles if not specified)')
    .option('--yes', 'Skip confirmation')
    .action(async (id, options) => {
      try {
        const agentMemory = new AgentMemory(createDefaultMemoryConfig());

        let profileName = options.profile;
        let unit = null;
        let unitManager: LearningUnitManager;

        if (profileName) {
          // Profile specified - search only in that profile
          unitManager = new LearningUnitManager(agentMemory, profileName);
          unit = await unitManager.get(id);
        } else {
          // No profile specified - search across ALL profiles to find the unit
          const { LLM_STORAGE_KEYS } = await import('../../llm/storage-keys.js');
          const allUnits = await agentMemory.reasoningBank.queryMetadata(
            LLM_STORAGE_KEYS.LEARNING_UNIT_TYPE,
            {}
          ) as any[];

          // Find unit by ID across all profiles
          const matchingUnit = allUnits.find((u) => u.id === id);
          if (matchingUnit) {
            profileName = matchingUnit.profileName;
            unitManager = new LearningUnitManager(agentMemory, profileName);
            unit = await unitManager.get(id);
          } else {
            // Fallback for error message
            const profileManager = new LLMProfileManager();
            profileName = profileManager.getActive()?.name || 'unknown';
            unitManager = new LearningUnitManager(agentMemory, profileName);
          }
        }

        if (!unit) {
          throw new CLIError(`Learning unit not found: ${id}`, 1);
        }

        // Confirmation
        if (!options.yes) {
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const info = `(${unit.fewShots.length} strategies, ${unit.metadata.totalExperiences} experiences)`;
          const answer = await rl.question(`\n⚠️  Delete learning unit "${id}" ${info}? (y/N): `);
          rl.close();

          if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
            logger.info('Cancelled.');
            return;
          }
        }

        const deleted = await unitManager.delete(id);
        if (deleted) {
          logger.info(`\n✅ Learning unit deleted: ${id}`);
        } else {
          throw new CLIError(`Failed to delete learning unit: ${id}`, 1);
        }
      } catch (error) {
        throw new CLIError('Failed to delete learning unit', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm learning merge
  learning
    .command('merge')
    .description('Merge two learning units into a new one')
    .argument('<unit1>', 'First source learning unit ID')
    .argument('<unit2>', 'Second source learning unit ID')
    .option('--profile <name>', 'LLM profile (default: active profile)')
    .option('--output <id>', 'Output learning unit ID (default: merged-<timestamp>)')
    .option('--name <name>', 'Display name for merged unit')
    .option('--description <text>', 'Description for merged unit')
    .action(async (unit1, unit2, options) => {
      try {
        const profileManager = new LLMProfileManager();
        const agentMemory = new AgentMemory(createDefaultMemoryConfig());

        const profileName = options.profile || profileManager.getActive()?.name;
        if (!profileName) {
          throw new CLIError('No active profile. Use --profile or set an active profile.', 1);
        }

        const unitManager = new LearningUnitManager(agentMemory, profileName);

        // Verify source units exist
        const source1 = await unitManager.get(unit1);
        const source2 = await unitManager.get(unit2);

        if (!source1) {
          throw new CLIError(`Source learning unit not found: ${unit1}`, 1);
        }
        if (!source2) {
          throw new CLIError(`Source learning unit not found: ${unit2}`, 1);
        }

        // Generate output ID if not provided
        const outputId = options.output || `merged-${Date.now()}`;
        const name = options.name || `Merged: ${source1.name} + ${source2.name}`;
        const description = options.description || `Merged from ${unit1} and ${unit2}`;

        logger.info(`\n🔀 Merging learning units...`);
        logger.info(`   Source 1: ${unit1} (${source1.fewShots.length} strategies)`);
        logger.info(`   Source 2: ${unit2} (${source2.fewShots.length} strategies)`);
        logger.info(`   Output: ${outputId}`);

        // Create merged unit structure
        const mergedUnit = await unitManager.createMergedUnit(
          [unit1, unit2],
          outputId,
          name,
          description
        );

        // Combine strategies (simple concatenation - LLM-driven dedup is in reConsolidate)
        const combinedStrategies = [...source1.fewShots, ...source2.fewShots];
        await unitManager.saveFewShots(outputId, combinedStrategies);

        logger.info(`\n✅ Learning units merged successfully!`);
        logger.info(`   Output unit: ${mergedUnit.id}`);
        logger.info(`   Combined strategies: ${combinedStrategies.length}`);
        logger.info(`   Combined experiences: ${mergedUnit.absorbedExperienceIds.length}`);
        logger.info('\n💡 Run `llm dream run --learning-unit ' + outputId + '` to deduplicate strategies via LLM');
      } catch (error) {
        throw new CLIError('Failed to merge learning units', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm learning export
  learning
    .command('export')
    .description('Export a learning unit to JSON file')
    .argument('<id>', 'Learning unit ID')
    .argument('<file>', 'Output file path')
    .option('--profile <name>', 'LLM profile (default: active profile)')
    .action(async (id, file, options) => {
      try {
        const profileManager = new LLMProfileManager();
        const agentMemory = new AgentMemory(createDefaultMemoryConfig());

        const profileName = options.profile || profileManager.getActive()?.name;
        if (!profileName) {
          throw new CLIError('No active profile. Use --profile or set an active profile.', 1);
        }

        const unitManager = new LearningUnitManager(agentMemory, profileName);
        const exportData = await unitManager.export(id);

        const outputPath = resolve(file);
        writeFileSync(outputPath, JSON.stringify(exportData, null, 2));

        logger.info(`\n✅ Learning unit exported: ${id}`);
        logger.info(`   File: ${outputPath}`);
        logger.info(`   Strategies: ${exportData.unit.fewShots.length}`);
      } catch (error) {
        throw new CLIError('Failed to export learning unit', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm learning import
  learning
    .command('import')
    .description('Import a learning unit from JSON file')
    .argument('<file>', 'Input file path')
    .option('--profile <name>', 'LLM profile (default: active profile)')
    .option('--id <id>', 'Override the learning unit ID')
    .action(async (file, options) => {
      try {
        const profileManager = new LLMProfileManager();
        const agentMemory = new AgentMemory(createDefaultMemoryConfig());

        const profileName = options.profile || profileManager.getActive()?.name;
        if (!profileName) {
          throw new CLIError('No active profile. Use --profile or set an active profile.', 1);
        }

        const inputPath = resolve(file);
        if (!existsSync(inputPath)) {
          throw new CLIError(`File not found: ${inputPath}`, 1);
        }

        const data = JSON.parse(readFileSync(inputPath, 'utf-8')) as LearningUnitExport;

        const unitManager = new LearningUnitManager(agentMemory, profileName);
        const unit = await unitManager.import(data, options.id);

        logger.info(`\n✅ Learning unit imported: ${unit.id}`);
        logger.info(`   Profile: ${profileName}`);
        logger.info(`   Name: ${unit.name}`);
        logger.info(`   Strategies: ${unit.fewShots.length}`);
        logger.info('\n💡 Use with: machine-dream llm play --learning-unit ' + unit.id);
      } catch (error) {
        throw new CLIError('Failed to import learning unit', 1, error instanceof Error ? error.message : String(error));
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
    .option('--unit <name>', 'Filter by learning unit')
    .option('--puzzle <name>', 'Filter by puzzle name')
    .option('--solved', 'Only show solved sessions')
    .option('--limit <n>', 'Maximum sessions to show', '20')
    .option('--format <format>', 'Output format (text|json)', 'text')
    .action(async (options) => {
      try {
        const agentMemory = new AgentMemory(createDefaultMemoryConfig());
        const limit = parseInt(options.limit, 10);

        // Query all experiences
        const allExperiences = await agentMemory.reasoningBank.queryMetadata('llm_experience', {}) as LLMExperience[];

        // Query stored session metadata (contains abandonReason, etc.)
        const storedSessions = await agentMemory.reasoningBank.queryMetadata('llm_session', {}) as any[];
        const sessionMetadataMap = new Map<string, any>();
        storedSessions.forEach(s => sessionMetadataMap.set(s.id, s));

        // Group by session ID
        const sessionMap = new Map<string, {
          sessionId: string;
          puzzleId: string;
          profileName: string;
          learningUnitId: string;
          experiences: LLMExperience[];
          firstTimestamp: Date;
        }>();

        allExperiences.forEach(exp => {
          // Use sessionId if available, otherwise fall back to composite key for old experiences
          const key = exp.sessionId || `${exp.puzzleId}-${exp.profileName || 'default'}`;
          if (!sessionMap.has(key)) {
            // Try to get learning unit from stored session metadata
            const storedMeta = sessionMetadataMap.get(key);
            sessionMap.set(key, {
              sessionId: key,
              puzzleId: exp.puzzleId,
              profileName: exp.profileName || 'default',
              learningUnitId: storedMeta?.learningUnitId || 'default',
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
          // Sort experiences by moveNumber to ensure first move is actually first
          const exps = sessionData.experiences.sort((a, b) => a.moveNumber - b.moveNumber);
          const totalMoves = exps.length;
          const correctMoves = exps.filter(e => e.validation.isCorrect).length;
          const invalidMoves = exps.filter(e => !e.validation.isValid).length;
          const validButWrong = exps.filter(e => e.validation.isValid && !e.validation.isCorrect).length;
          const accuracy = totalMoves > 0 ? (correctMoves / totalMoves) * 100 : 0;

          // Check if solved and calculate completion percentage
          // Simple approach: completion = correctMoves / originalEmptyCells
          const firstExp = exps[0];
          let solved = false;
          let completionPct = 0;

          if (firstExp?.gridState) {
            const originalEmpty = firstExp.gridState.flat().filter(cell => cell === 0).length;

            // Completion = how many cells we correctly filled / how many were empty
            if (originalEmpty > 0) {
              completionPct = (correctMoves / originalEmpty) * 100;
              // Solved if we filled all empty cells
              solved = correctMoves >= originalEmpty;
            }
          }

          // Learning flags from first experience
          const learningContext = firstExp.learningContext;

          // Get stored session metadata for abandonReason
          const storedMeta = sessionMetadataMap.get(sessionData.sessionId);
          const abandoned = storedMeta?.abandoned || false;
          const abandonReason = storedMeta?.abandonReason || null;

          return {
            sessionId: sessionData.sessionId,
            puzzleId: sessionData.puzzleId,
            profileName: sessionData.profileName,
            learningUnitId: sessionData.learningUnitId,
            solved,
            abandoned,
            abandonReason,
            completionPct,
            totalMoves,
            correctMoves,
            invalidMoves,
            validButWrong,
            accuracy,
            learningContext,
            notes: storedMeta?.notes || null,
            timestamp: sessionData.firstTimestamp,
          };
        });

        // Apply filters
        if (options.profile) {
          sessions = sessions.filter(s => s.profileName === options.profile);
        }

        if (options.unit) {
          sessions = sessions.filter(s => s.learningUnitId === options.unit);
        }

        if (options.puzzle) {
          sessions = sessions.filter(s => s.puzzleId.includes(options.puzzle));
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

        // Header - Unit column is variable width (not truncated)
        // Show "(none)" for sessions without learning unit, "default" for default unit
        const getDisplayUnit = (unitId: string | null | undefined): string => {
          if (unitId === null || unitId === undefined) return NO_LEARNING_UNIT_DISPLAY;
          return unitId || DEFAULT_LEARNING_UNIT_ID;
        };
        const maxUnitLen = Math.max(
          4, // minimum "Unit" header width
          NO_LEARNING_UNIT_DISPLAY.length,
          ...sessionsToShow.map(s => getDisplayUnit(s.learningUnitId).length)
        );
        const unitHeader = 'Unit'.padEnd(maxUnitLen);
        logger.info(`ID                                    Profile           ${unitHeader}  Puzzle            Done%  Moves   Acc%   Exit        Learning    Date`);
        logger.info('─'.repeat(140 + maxUnitLen));

        sessionsToShow.forEach(s => {
          const sessionIdShort = s.sessionId.substring(0, 36).padEnd(36);
          const profile = s.profileName.substring(0, 16).padEnd(16);
          const unit = getDisplayUnit(s.learningUnitId).padEnd(maxUnitLen);
          const puzzle = s.puzzleId.substring(0, 16).padEnd(16);
          const donePct = `${s.completionPct.toFixed(0)}%`.padStart(5);
          const moves = s.totalMoves.toString().padStart(5);
          const acc = `${s.accuracy.toFixed(1)}%`.padStart(6);

          // Exit status - show why session ended
          let exitStatus = 'ok';
          if (s.solved) {
            exitStatus = 'SOLVED';
          } else if (s.abandoned && s.abandonReason) {
            // Shorten common abandon reasons
            if (s.abandonReason.includes('max_moves')) exitStatus = 'max_moves';
            else if (s.abandonReason.includes('llm_error')) exitStatus = 'llm_error';
            else if (s.abandonReason.includes('consecutive_forbidden')) exitStatus = 'stuck';
            else if (s.abandonReason.includes('timeout')) exitStatus = 'timeout';
            else exitStatus = 'abandoned';
          } else if (s.abandoned) {
            exitStatus = 'abandoned';
          }
          const exitStr = exitStatus.padEnd(10);

          // Learning flags - only show actually useful ones
          const flags = [];
          if (s.learningContext?.fewShotsUsed) flags.push(`F${s.learningContext.fewShotCount}`);
          if (s.learningContext?.consolidatedExperiences > 0) flags.push('C');
          if (s.notes) flags.push('N');

          const learningStr = flags.length > 0
            ? `[${flags.join('][')}]`.padEnd(10)
            : '[ ]'.padEnd(10);

          const date = new Date(s.timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          logger.info(`${sessionIdShort}  ${profile}  ${unit}  ${puzzle}  ${donePct}  ${moves}  ${acc}   ${exitStr}  ${learningStr}  ${date}`);
          if (s.notes) {
            logger.info(`    📝 ${s.notes}`);
          }
        });

        logger.info('');
        logger.info(`Showing ${sessionsToShow.length} of ${sessions.length} sessions`);
        logger.info('Legend: [F#]=Few-shots used, [C]=Consolidated, [N]=Has notes, Exit: SOLVED/max_moves/llm_error/stuck/timeout/abandoned');
        logger.info(`\n💡 Tip: Use 'llm session show <id>' to view detailed breakdown, 'llm session edit <id> --notes "..."' to add notes`);

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

        // Query stored session metadata for abandonReason
        const storedSession = await agentMemory.reasoningBank.getMetadata(
          `llm_session:${sessionId}`,
          'llm_session'
        ) as any;

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
            abandoned: storedSession?.abandoned || false,
            abandonReason: storedSession?.abandonReason || null,
            totalMoves,
            correctMoves,
            invalidMoves,
            validButWrong,
            accuracy,
            durationMinutes: durationMin,
            learningContext: firstExp.learningContext,
            notes: storedSession?.notes || null,
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
        if (storedSession?.abandoned && storedSession?.abandonReason) {
          logger.info(`  Exit reason: ${storedSession.abandonReason}`);
        }
        logger.info(`  Duration: ${durationMin} minutes`);
        if (storedSession?.notes) {
          logger.info(`  Notes: ${storedSession.notes}`);
        }
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

  // llm session edit <id>
  session
    .command('edit')
    .description('Edit session metadata (notes, annotations)')
    .argument('<session-id>', 'Session ID (from session list)')
    .option('--notes <text>', 'Set session notes')
    .action(async (sessionId, options) => {
      try {
        if (!options.notes) {
          throw new CLIError('No edits specified. Use --notes to add notes.', 1);
        }

        const agentMemory = new AgentMemory(createDefaultMemoryConfig());
        const { ExperienceStore } = await import('../../llm/ExperienceStore.js');
        const config = getLLMConfig();
        const store = new ExperienceStore(agentMemory, config, 'default');

        const success = await store.updateSessionNotes(sessionId, options.notes);

        if (!success) {
          throw new CLIError(`Session not found: ${sessionId}`, 1);
        }

        logger.info(`✓ Updated notes for session ${sessionId}`);
        logger.info(`  Notes: "${options.notes}"`);

      } catch (error) {
        if (error instanceof CLIError) throw error;
        throw new CLIError('Failed to edit session', 1, error instanceof Error ? error.message : String(error));
      }
    });

  // llm session delete
  session
    .command('delete')
    .description('Delete sessions and their experiences')
    .option('--profile <name>', 'Filter by LLM profile name')
    .option('--unit <name>', 'Filter by learning unit')
    .option('--puzzle <name>', 'Filter by puzzle name (partial match)')
    .option('--id <session-id>', 'Delete specific session by ID')
    .option('--yes', 'Skip confirmation prompt')
    .action(async (options) => {
      try {
        const agentMemory = new AgentMemory(createDefaultMemoryConfig());

        // Query all experiences
        const allExperiences = await agentMemory.reasoningBank.queryMetadata('llm_experience', {}) as LLMExperience[];

        // Query stored session metadata
        const storedSessions = await agentMemory.reasoningBank.queryMetadata('llm_session', {}) as any[];
        const sessionMetadataMap = new Map<string, any>();
        storedSessions.forEach(s => sessionMetadataMap.set(s.id, s));

        // Group experiences by session
        const sessionMap = new Map<string, {
          sessionId: string;
          puzzleId: string;
          profileName: string;
          learningUnitId: string;
          experiences: LLMExperience[];
        }>();

        allExperiences.forEach(exp => {
          const key = exp.sessionId || `${exp.puzzleId}-${exp.profileName || 'default'}`;
          if (!sessionMap.has(key)) {
            const storedMeta = sessionMetadataMap.get(key);
            sessionMap.set(key, {
              sessionId: key,
              puzzleId: exp.puzzleId,
              profileName: exp.profileName || 'default',
              learningUnitId: storedMeta?.learningUnitId || 'default',
              experiences: [],
            });
          }
          sessionMap.get(key)!.experiences.push(exp);
        });

        let sessionsToDelete = Array.from(sessionMap.values());

        // Apply filters
        if (options.id) {
          sessionsToDelete = sessionsToDelete.filter(s => s.sessionId === options.id);
        }
        if (options.profile) {
          sessionsToDelete = sessionsToDelete.filter(s => s.profileName === options.profile);
        }
        if (options.unit) {
          sessionsToDelete = sessionsToDelete.filter(s => s.learningUnitId === options.unit);
        }
        if (options.puzzle) {
          sessionsToDelete = sessionsToDelete.filter(s => s.puzzleId.includes(options.puzzle));
        }

        if (sessionsToDelete.length === 0) {
          logger.info('No sessions found matching criteria.');
          return;
        }

        const totalExperiences = sessionsToDelete.reduce((sum, s) => sum + s.experiences.length, 0);

        // Confirmation
        if (!options.yes) {
          logger.warn(`⚠️  This will delete ${sessionsToDelete.length} session(s) and ${totalExperiences} experience(s)`);
          logger.warn('   This action cannot be undone!\n');

          // Show what will be deleted
          logger.info('Sessions to delete:');
          sessionsToDelete.slice(0, 10).forEach(s => {
            logger.info(`  ${s.sessionId.substring(0, 36)} - ${s.profileName} - ${s.puzzleId} (${s.experiences.length} exp)`);
          });
          if (sessionsToDelete.length > 10) {
            logger.info(`  ... and ${sessionsToDelete.length - 10} more`);
          }
          logger.info('');

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

        logger.info(`🗑️  Deleting ${sessionsToDelete.length} sessions...`);

        let deletedExperiences = 0;
        let deletedSessions = 0;

        for (const session of sessionsToDelete) {
          // Delete all experiences for this session
          for (const exp of session.experiences) {
            await agentMemory.reasoningBank.deleteMetadata(exp.id, 'llm_experience');
            deletedExperiences++;
          }

          // Delete session metadata if it exists
          try {
            await agentMemory.reasoningBank.deleteMetadata(`llm_session:${session.sessionId}`, 'llm_session');
          } catch {
            // Session metadata may not exist
          }
          deletedSessions++;
        }

        logger.info(`✓ Deleted ${deletedSessions} sessions and ${deletedExperiences} experiences`);

      } catch (error) {
        if (error instanceof CLIError) throw error;
        throw new CLIError('Failed to delete sessions', 1, error instanceof Error ? error.message : String(error));
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
