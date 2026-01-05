/**
 * CLI Types and Interfaces
 *
 * Type definitions for CLI configuration, commands, and options.
 */

export interface Configuration {
    memorySystem: 'agentdb' | 'reasoningbank';
    enableRL: boolean;
    enableReflexion: boolean;
    enableSkillLibrary: boolean;
    solving: {
        maxIterations: number;
        maxSolveTime: number;
        reflectionInterval: number;
        attentionWindowSize: number;
        backtrackEnabled: boolean;
        guessThreshold: number;
        strategies: string[];
    };
    dreaming: {
        schedule: 'after-session' | 'periodic' | 'manual';
        compressionRatio: number;
        abstractionLevels: number;
        minSuccessRate: number;
    };
    agentdb: {
        dbPath: string;
        preset: 'small' | 'medium' | 'large';
        quantization: 'scalar' | 'binary' | 'product';
        indexing: 'hnsw' | 'flat';
    };
    benchmarking: {
        enabled: boolean;
        outputDir: string;
        parallel: number;
    };
    logging: {
        level: 'debug' | 'info' | 'warn' | 'error';
        outputDir: string;
        format: 'json' | 'text';
    };
    demo: {
        mode: boolean;
        speed: 'realtime' | 'fast' | 'instant';
        pauseOnInsight: boolean;
    };
    hooks: {
        preTask: string | null;
        postTask: string | null;
        preEdit: string | null;
        postEdit: string | null;
        sessionEnd: string | null;
        sessionRestore: string | null;
    };
}

export interface SolveOptions {
    puzzleFile: string;
    memorySystem?: 'agentdb' | 'reasoningbank';
    enableRL?: boolean;
    enableReflexion?: boolean;
    enableSkillLibrary?: boolean;
    maxIterations?: number;
    maxTime?: number;
    reflectionInterval?: number;
    attentionWindow?: number;
    strategies?: string;
    backtrackEnabled?: boolean;
    guessThreshold?: number;
    output?: string;
    sessionId?: string;
    dreamAfter?: boolean;
    visualize?: boolean;
    exportTrajectory?: boolean;
    demoMode?: boolean;
    demoSpeed?: 'realtime' | 'fast' | 'instant';
    pauseOnInsight?: boolean;
}

export interface MemoryStoreOptions {
    key: string;
    value: string;
    namespace?: string;
    ttl?: number;
    type?: 'experience' | 'pattern' | 'skill' | 'insight';
}

export interface MemoryRetrieveOptions {
    key: string;
    namespace?: string;
    format?: 'json' | 'yaml' | 'table';
}

export interface MemorySearchOptions {
    pattern: string;
    namespace?: string;
    limit?: number;
    type?: string;
    similarity?: number;
}

export interface MemoryConsolidateOptions {
    sessionIds?: string;
    compressionRatio?: number;
    minSuccessRate?: number;
    output?: string;
}

export interface MemoryOptimizeOptions {
    quantization?: 'scalar' | 'binary' | 'product';
    pruneRedundancy?: boolean;
    similarityThreshold?: number;
}

export interface DreamRunOptions {
    sessions?: string;
    phases?: string;
    compressionRatio?: number;
    abstractionLevels?: number;
    visualize?: boolean;
    output?: string;
}

export interface BenchmarkRunOptions {
    suiteName: string;
    baseline?: string;
    difficulty?: string;
    count?: number;
    outputDir?: string;
    parallel?: number;
    compareWith?: string;
}

export interface ExportOptions {
    type: 'metrics' | 'results' | 'config' | 'logs' | 'memory' | 'all';
    outputDir?: string;
    format?: 'json' | 'csv' | 'markdown';
    sessions?: string;
    compress?: boolean;
    includeRaw?: boolean;
}

export interface SystemInitOptions {
    force?: boolean;
    dbPath?: string;
    preset?: 'default' | 'minimal' | 'full';
}

export interface SystemStatusOptions {
    verbose?: boolean;
    format?: 'table' | 'json' | 'yaml';
}

export interface SystemCleanupOptions {
    sessions?: boolean;
    logs?: boolean;
    cache?: boolean;
    all?: boolean;
    olderThan?: number;
    dryRun?: boolean;
}

export interface ConfigSetOptions {
    key: string;
    value: string;
    type?: 'string' | 'number' | 'boolean' | 'json';
    global?: boolean;
}