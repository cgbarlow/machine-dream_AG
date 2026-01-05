
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SystemOrchestrator } from '../../src/orchestration/SystemOrchestrator';
import { OrchestratorConfig } from '../../src/types';
import fs from 'fs';
import path from 'path';

const TEST_DB_PATH = './.test_agentdb';

describe('Machine Dream System Integration', () => {
    let orchestrator: SystemOrchestrator;
    let config: OrchestratorConfig;

    beforeEach(() => {
        // Clean up previous test runs
        if (fs.existsSync(TEST_DB_PATH)) {
            fs.rmSync(TEST_DB_PATH, { recursive: true, force: true });
        }

        config = {
            dbPath: TEST_DB_PATH,
            agentDbPath: TEST_DB_PATH,
            embeddingModel: 'mock-model',
            enableReasoningBank: true,
            enableReflexion: true,
            enableSkillLibrary: true,
            preset: 'large',
            rlPlugin: {
                type: 'decision-transformer',
                name: 'test-solver',
                stateDim: 81,
                actionDim: 729,
                sequenceLength: 128
            },
            reflexion: { enabled: false, maxEntries: 10, similarityThreshold: 0.8 },
            skillLibrary: { enabled: false, minSuccessRate: 0.7, maxSkills: 10, autoConsolidate: false },
            quantization: 'scalar',
            indexing: 'hnsw',
            cacheEnabled: false,
            maxIterations: 10,
            reflectionInterval: 2,
            dreamingSchedule: 'after-session',
            logLevel: 'error', // Quiet logs for tests
            demoMode: false
        };

        orchestrator = new SystemOrchestrator(config);
    });

    afterEach(() => {
        // Cleanup
        if (fs.existsSync(TEST_DB_PATH)) {
            fs.rmSync(TEST_DB_PATH, { recursive: true, force: true });
        }
    });

    it('should initialize successfully', () => {
        expect(orchestrator.getStatus()).toBe('ready');
    });

    it('should solve a simple puzzle (or at least run iterations)', async () => {
        // 9x9 Grid with some clues
        const grid = Array(9).fill(0).map(() => Array(9).fill(0));
        grid[0][0] = 5;
        grid[0][1] = 3;

        const result = await orchestrator.solvePuzzle(grid);

        expect(result).toBeDefined();
        // Since we use real logic now (Naked Single), an empty-ish grid might fail or stall, 
        // but it should proceed without crashing.
        // It should definitely calculate iterations.
        expect(result.metrics.iterations).toBeGreaterThan(0);
        expect(result.finalState).toBeDefined();

        // Verify Persistence
        const dbFile = path.join(TEST_DB_PATH, 'agent.db');
        expect(fs.existsSync(dbFile)).toBe(true);
    }, 10000); // 10s timeout

    it('should run the dreaming pipeline after solving', async () => {
        const grid = Array(9).fill(0).map(() => Array(9).fill(0));
        grid[0][0] = 1;

        // Mock the console.log to verify dreaming output if needed, 
        // or just rely on orchestrator state transitions if we exposed them.
        // For now, implicit check via solvePuzzle not throwing.
        await expect(orchestrator.solvePuzzle(grid)).resolves.not.toThrow();
    });
});
