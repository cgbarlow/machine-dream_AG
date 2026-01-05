/**
 * Configuration Management
 *
 * Handles loading, validation, and merging of configuration from multiple sources:
 * - Default configuration
 * - Environment variables
 * - Configuration files
 * - CLI arguments
 */

import path from 'path';
import { ConfigurationError } from './errors';
import { Configuration } from './types';
import fs from 'fs/promises';

// Default configuration
const DEFAULT_CONFIG: Configuration = {
    memorySystem: 'agentdb',
    enableRL: true,
    enableReflexion: true,
    enableSkillLibrary: true,
    solving: {
        maxIterations: 50,
        maxSolveTime: 300000,
        reflectionInterval: 5,
        attentionWindowSize: 10,
        backtrackEnabled: false,
        guessThreshold: 0.3,
        strategies: ['naked-single', 'hidden-single', 'pointing-pairs', 'box-line-reduction', 'naked-pairs', 'x-wing']
    },
    dreaming: {
        schedule: 'after-session',
        compressionRatio: 10,
        abstractionLevels: 4,
        minSuccessRate: 0.7
    },
    agentdb: {
        dbPath: '.agentdb',
        preset: 'medium',
        quantization: 'scalar',
        indexing: 'hnsw'
    },
    benchmarking: {
        enabled: true,
        outputDir: './benchmarks',
        parallel: 1
    },
    logging: {
        level: 'info',
        outputDir: './logs',
        format: 'json'
    },
    demo: {
        mode: false,
        speed: 'realtime',
        pauseOnInsight: false
    },
    hooks: {
        preTask: null,
        postTask: null,
        preEdit: null,
        postEdit: null,
        sessionEnd: null,
        sessionRestore: null
    }
};

export async function loadConfiguration(configPath: string): Promise<Configuration> {
    try {
        // Check if config file exists
        let configFileExists = false;
        try {
            await fs.access(configPath);
            configFileExists = true;
        } catch {
            // File doesn't exist, use defaults
        }

        if (configFileExists) {
            const fileContent = await fs.readFile(configPath, 'utf-8');
            const fileConfig = JSON.parse(fileContent);
            return mergeConfigurations(DEFAULT_CONFIG, fileConfig);
        }

        return DEFAULT_CONFIG;
    } catch (error) {
        throw new ConfigurationError(
            `Failed to load configuration from ${configPath}`,
            error instanceof Error ? error.message : String(error),
            ['Check file syntax', 'Use --config to specify a different file', 'Run with default configuration']
        );
    }
}

export function validateConfiguration(config: Configuration): boolean {
    // Basic validation - could be enhanced with schema validation
    const requiredFields = [
        'memorySystem',
        'solving',
        'dreaming',
        'agentdb',
        'logging'
    ];

    for (const field of requiredFields) {
        if (!(field in config)) {
            throw new ConfigurationError(
                `Missing required configuration field: ${field}`,
                undefined,
                ['Check your configuration file', 'Use default configuration']
            );
        }
    }

    return true;
}

function mergeConfigurations(defaultConfig: Configuration, fileConfig: Partial<Configuration>): Configuration {
    return {
        ...defaultConfig,
        ...fileConfig,
        solving: {
            ...defaultConfig.solving,
            ...fileConfig.solving
        },
        dreaming: {
            ...defaultConfig.dreaming,
            ...fileConfig.dreaming
        },
        agentdb: {
            ...defaultConfig.agentdb,
            ...fileConfig.agentdb
        },
        benchmarking: {
            ...defaultConfig.benchmarking,
            ...fileConfig.benchmarking
        },
        logging: {
            ...defaultConfig.logging,
            ...fileConfig.logging
        },
        demo: {
            ...defaultConfig.demo,
            ...fileConfig.demo
        },
        hooks: {
            ...defaultConfig.hooks,
            ...fileConfig.hooks
        }
    };
}

// Environment variable parsing
export function parseEnvironmentVariables(): Partial<Configuration> {
    const envConfig: Partial<Configuration> = {};

    // Memory system
    if (process.env.MACHINE_DREAM_MEMORY_SYSTEM) {
        envConfig.memorySystem = process.env.MACHINE_DREAM_MEMORY_SYSTEM as 'agentdb' | 'reasoningbank';
    }

    if (process.env.MACHINE_DREAM_ENABLE_RL) {
        envConfig.enableRL = process.env.MACHINE_DREAM_ENABLE_RL === 'true';
    }

    // Solving parameters
    if (process.env.MACHINE_DREAM_MAX_ITERATIONS) {
        envConfig.solving = envConfig.solving || {};
        envConfig.solving.maxIterations = parseInt(process.env.MACHINE_DREAM_MAX_ITERATIONS);
    }

    if (process.env.MACHINE_DREAM_MAX_SOLVE_TIME) {
        envConfig.solving = envConfig.solving || {};
        envConfig.solving.maxSolveTime = parseInt(process.env.MACHINE_DREAM_MAX_SOLVE_TIME);
    }

    // Database
    if (process.env.MACHINE_DREAM_DB_PATH) {
        envConfig.agentdb = envConfig.agentdb || {};
        envConfig.agentdb.dbPath = process.env.MACHINE_DREAM_DB_PATH;
    }

    return envConfig;
}

export async function saveConfiguration(configPath: string, config: Configuration): Promise<void> {
    try {
        const configString = JSON.stringify(config, null, 2);
        await fs.writeFile(configPath, configString, 'utf-8');
    } catch (error) {
        throw new ConfigurationError(
            `Failed to save configuration to ${configPath}`,
            error instanceof Error ? error.message : String(error),
            ['Check file permissions', 'Verify directory exists']
        );
    }
}