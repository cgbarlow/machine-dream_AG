
import { describe, it, expect, vi } from 'vitest';
import { DreamingController } from '../../src/consolidation/DreamingController';
import { AgentMemory } from '../../src/memory/AgentMemory';
import { AgentDBConfig } from '../../src/types';

describe('DreamingController (Spec 05)', () => {
    // Mock dependencies
    const mockMemory = {
        reasoningBank: {
            distillPatterns: async () => [],
            consolidate: async () => ({
                patterns: [],
                abstractionLadder: { levels: [] }
            })
        },
        // MemorySystem direct methods that DreamingController might call
        consolidate: async () => ({
            patterns: [],
            abstractionLadder: { levels: [] }
        })
    } as unknown as AgentMemory;

    const mockConfig = {} as AgentDBConfig;

    it('should instantiate correctly', () => {
        const dreamer = new DreamingController(mockMemory, mockConfig);
        expect(dreamer).toBeDefined();
    });

    it('should run a dream cycle', async () => {
        const dreamer = new DreamingController(mockMemory, mockConfig);
        const result = await dreamer.runDreamCycle('test-session');

        expect(result).toBeDefined();
        expect(result.patterns).toEqual([]); // Mock returned empty
        expect(result.verificationStatus).toBe('verified');
    });
});
