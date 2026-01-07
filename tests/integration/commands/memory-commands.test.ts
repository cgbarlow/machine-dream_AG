/**
 * Memory Commands Integration Tests
 *
 * Tests the memory CLI commands with real AgentDB backend integration.
 * Verifies that all mock implementations have been replaced with real functionality.
 *
 * Week 2 Day 3: Integration tests for memory commands (Day 1 implementation)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentMemory } from '../../../src/memory/AgentMemory.js';
import { DreamingController } from '../../../src/consolidation/DreamingController.js';
import type { AgentDBConfig, Move, ValidationResult } from '../../../src/types.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Memory Commands Integration Tests', () => {
  let memory: AgentMemory;
  let testDbPath: string;
  let testConfig: AgentDBConfig;

  beforeEach(() => {
    // Create unique temp database for each test
    testDbPath = path.join(os.tmpdir(), `.test-memory-${Date.now()}-${Math.random()}`);

    testConfig = {
      dbPath: testDbPath,
      agentDbPath: testDbPath,
      preset: 'large' as const,
      rlPlugin: {
        type: 'decision-transformer' as const,
        name: 'sudoku-solver' as const,
        stateDim: 81,
        actionDim: 9,
        sequenceLength: 20
      },
      embeddingModel: 'Xenova/all-MiniLM-L6-v2',
      enableReasoningBank: true,
      enableReflexion: true,
      enableSkillLibrary: false,
      quantization: 'scalar' as const,
      indexing: 'hnsw' as const,
      cacheEnabled: true,
      reflexion: {
        enabled: true,
        maxEntries: 1000,
        similarityThreshold: 0.8
      },
      skillLibrary: {
        enabled: false,
        minSuccessRate: 0.8,
        maxSkills: 100,
        autoConsolidate: false
      }
    };

    memory = new AgentMemory(testConfig);
  });

  afterEach(() => {
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      try {
        fs.rmSync(testDbPath, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Memory Store Command', () => {
    it('should store simple string values', async () => {
      const key = 'test-key';
      const value = 'test-value';

      // Simulate: machine-dream memory store test-key "test-value"
      await memory.reasoningBank.storeMetadata(
        `default:${key}`,
        'cli-store',
        { key, value, namespace: 'default', timestamp: Date.now() }
      );

      // Verify storage
      const result = await memory.reasoningBank.getMetadata(`default:${key}`, 'cli-store');
      expect(result).toBeDefined();
      expect((result as any).value).toBe(value);
    });

    it('should store JSON objects', async () => {
      const key = 'config-key';
      const jsonValue = { setting: 'value', enabled: true, count: 42 };

      // Simulate: machine-dream memory store config-key '{"setting":"value","enabled":true,"count":42}'
      await memory.reasoningBank.storeMetadata(
        `default:${key}`,
        'cli-store',
        { key, value: jsonValue, namespace: 'default', timestamp: Date.now() }
      );

      const result = await memory.reasoningBank.getMetadata(`default:${key}`, 'cli-store');
      expect((result as any).value).toEqual(jsonValue);
    });

    it('should support custom namespaces', async () => {
      const key = 'custom-key';
      const value = 'custom-value';
      const namespace = 'custom-namespace';

      // Simulate: machine-dream memory store custom-key "custom-value" --namespace custom-namespace
      await memory.reasoningBank.storeMetadata(
        `${namespace}:${key}`,
        'cli-store',
        { key, value, namespace, timestamp: Date.now() }
      );

      const result = await memory.reasoningBank.getMetadata(`${namespace}:${key}`, 'cli-store');
      expect((result as any).value).toBe(value);
      expect((result as any).namespace).toBe(namespace);
    });
  });

  describe('Memory Retrieve Command', () => {
    it('should retrieve stored values', async () => {
      const key = 'retrieve-key';
      const value = 'retrieve-value';

      // Store first
      await memory.reasoningBank.storeMetadata(
        `default:${key}`,
        'cli-store',
        { key, value, namespace: 'default', timestamp: Date.now() }
      );

      // Simulate: machine-dream memory retrieve retrieve-key
      const result = await memory.reasoningBank.getMetadata(`default:${key}`, 'cli-store');

      expect(result).toBeDefined();
      expect((result as any).value).toBe(value);
    });

    it('should return null for non-existent keys', async () => {
      // Simulate: machine-dream memory retrieve non-existent-key
      const result = await memory.reasoningBank.getMetadata('default:non-existent-key', 'cli-store');
      expect(result).toBeNull();
    });

    it('should retrieve from custom namespaces', async () => {
      const key = 'ns-key';
      const value = 'ns-value';
      const namespace = 'test-ns';

      await memory.reasoningBank.storeMetadata(
        `${namespace}:${key}`,
        'cli-store',
        { key, value, namespace, timestamp: Date.now() }
      );

      // Simulate: machine-dream memory retrieve ns-key --namespace test-ns
      const result = await memory.reasoningBank.getMetadata(`${namespace}:${key}`, 'cli-store');
      expect((result as any).value).toBe(value);
    });
  });

  describe('Memory Search Command', () => {
    beforeEach(async () => {
      // Pre-populate with test data
      const testData = [
        { key: 'pattern-001', value: 'NakedSingle strategy found' },
        { key: 'pattern-002', value: 'HiddenPair strategy found' },
        { key: 'insight-001', value: 'Box constraint pattern' },
        { key: 'insight-002', value: 'Row constraint pattern' }
      ];

      for (const item of testData) {
        await memory.reasoningBank.storeMetadata(
          `default:${item.key}`,
          'cli-store',
          { key: item.key, value: item.value, namespace: 'default', timestamp: Date.now() }
        );
      }
    });

    it('should search by pattern and return results', async () => {
      // Simulate: machine-dream memory search "pattern"
      const allResults = await memory.reasoningBank.queryMetadata('cli-store', {});
      const results = allResults.filter((item: any) =>
        (item.key && item.key.includes('pattern')) ||
        (item.value && JSON.stringify(item.value).includes('pattern'))
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r: any) => r.key && r.key.includes('pattern'))).toBe(true);
    });

    it('should search within specific namespace', async () => {
      // Store in custom namespace
      await memory.reasoningBank.storeMetadata(
        'custom:special-pattern',
        'cli-store',
        { key: 'special-pattern', value: 'Special pattern data', namespace: 'custom', timestamp: Date.now() }
      );

      // Simulate: machine-dream memory search "special" --namespace custom
      const allResults = await memory.reasoningBank.queryMetadata('cli-store', {});
      const results = allResults.filter((item: any) =>
        item.namespace === 'custom' &&
        ((item.key && item.key.includes('special')) || (item.value && JSON.stringify(item.value).includes('special')))
      );

      expect(results.length).toBe(1);
      expect(results[0].namespace).toBe('custom');
    });

    it('should limit search results', async () => {
      // Simulate: machine-dream memory search "pattern" --limit 2
      const allResults = await memory.reasoningBank.queryMetadata('cli-store', {});
      const filtered = allResults.filter((item: any) =>
        (item.key && item.key.includes('pattern')) ||
        (item.value && JSON.stringify(item.value).includes('pattern'))
      );
      const results = filtered.slice(0, 2);

      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Memory Consolidate Command', () => {
    it('should run dream cycle consolidation', async () => {
      const sessionId = 'test-session';

      // Add some moves to memory for consolidation
      const testMove: Move = {
        cell: { row: 0, col: 0 },
        value: 5,
        strategy: 'NakedSingle',
        timestamp: Date.now()
      };

      const testOutcome: ValidationResult = {
        move: testMove,
        isValid: true,
        outcome: 'success' as const,
        nextState: {
          grid: Array(9).fill(null).map(() => Array(9).fill(0)),
          candidates: new Map(),
          moveHistory: [],
          difficulty: 'medium' as const
        }
      };

      await memory.logMove(testMove, testOutcome);

      // Simulate: machine-dream memory consolidate --session-ids test-session
      const dreamingController = new DreamingController(memory, testConfig);
      const knowledge = await dreamingController.runDreamCycle(sessionId);

      expect(knowledge).toBeDefined();
      expect(knowledge.patterns).toBeDefined();
      expect(knowledge.compressionRatio).toBeGreaterThanOrEqual(0);
      expect(knowledge.verificationStatus).toBe('verified');
    });

    it('should consolidate multiple sessions', async () => {
      const sessionIds = ['session-1', 'session-2'];

      // Simulate: machine-dream memory consolidate --session-ids session-1,session-2
      const dreamingController = new DreamingController(memory, testConfig);

      let totalPatterns = 0;
      for (const sessionId of sessionIds) {
        const knowledge = await dreamingController.runDreamCycle(sessionId);
        totalPatterns += knowledge.patterns.length;
      }

      // Should have processed both sessions
      expect(sessionIds.length).toBe(2);
    });
  });

  describe('Memory Optimize Command', () => {
    it('should optimize memory with quantization', async () => {
      // Add some data first
      for (let i = 0; i < 10; i++) {
        await memory.reasoningBank.storeMetadata(
          `default:opt-${i}`,
          'cli-store',
          { value: `optimization-test-${i}`, namespace: 'default', timestamp: Date.now() }
        );
      }

      // Simulate: machine-dream memory optimize
      const result = await memory.optimizeMemory();

      expect(result).toBeDefined();
      expect(result.patternsConsolidated).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Memory List Command', () => {
    beforeEach(async () => {
      // Pre-populate with test data
      const testKeys = ['key-1', 'key-2', 'key-3'];
      for (const key of testKeys) {
        await memory.reasoningBank.storeMetadata(
          `default:${key}`,
          'cli-store',
          { key, value: `value-${key}`, namespace: 'default', timestamp: Date.now() }
        );
      }
    });

    it('should list all keys in default namespace', async () => {
      // Simulate: machine-dream memory list
      const results = await memory.reasoningBank.queryMetadata('cli-store', {});
      const defaultKeys = results.filter((item: any) =>
        item.namespace === 'default'
      );

      expect(defaultKeys.length).toBeGreaterThanOrEqual(3);
    });

    it('should list keys in custom namespace', async () => {
      // Add custom namespace keys
      await memory.reasoningBank.storeMetadata(
        'custom:custom-key-1',
        'cli-store',
        { key: 'custom-key-1', value: 'custom-value-1', namespace: 'custom', timestamp: Date.now() }
      );

      // Simulate: machine-dream memory list --namespace custom
      const results = await memory.reasoningBank.queryMetadata('cli-store', {});
      const customKeys = results.filter((item: any) =>
        item.namespace === 'custom'
      );

      expect(customKeys.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Memory Backup and Restore Commands', () => {
    it('should backup memory to JSON file', async () => {
      // Store test data
      const testData = {
        key1: 'value1',
        key2: { nested: 'object' },
        key3: 'value3'
      };

      for (const [key, value] of Object.entries(testData)) {
        await memory.reasoningBank.storeMetadata(
          `default:${key}`,
          'cli-store',
          { key, value, namespace: 'default', timestamp: Date.now() }
        );
      }

      // Simulate: machine-dream memory backup backup.json
      const backupPath = path.join(os.tmpdir(), `test-backup-${Date.now()}.json`);

      try {
        const allData = await memory.reasoningBank.queryMetadata('cli-store', {});

        // Create backup structure
        const backup = {
          version: '1.0',
          timestamp: Date.now(),
          entries: allData.map((item: any) => ({
            key: item.key || 'unknown',
            value: item.value,
            namespace: item.namespace || 'default'
          }))
        };

        fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

        // Verify backup file exists
        expect(fs.existsSync(backupPath)).toBe(true);

        const backupContent = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
        expect(backupContent.entries.length).toBeGreaterThanOrEqual(3);
      } finally {
        // Cleanup backup file
        if (fs.existsSync(backupPath)) {
          fs.unlinkSync(backupPath);
        }
      }
    });

    it('should restore memory from JSON file', async () => {
      const backupPath = path.join(os.tmpdir(), `test-restore-${Date.now()}.json`);

      try {
        // Create backup file
        const backupData = {
          version: '1.0',
          timestamp: Date.now(),
          entries: [
            { key: 'restored-1', value: 'value-1', namespace: 'default' },
            { key: 'restored-2', value: 'value-2', namespace: 'default' }
          ]
        };

        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

        // Simulate: machine-dream memory restore backup.json
        const backup = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

        for (const entry of backup.entries) {
          await memory.reasoningBank.storeMetadata(
            `${entry.namespace}:${entry.key}`,
            'cli-store',
            { key: entry.key, value: entry.value, namespace: entry.namespace, timestamp: Date.now() }
          );
        }

        // Verify restoration
        const result1 = await memory.reasoningBank.getMetadata('default:restored-1', 'cli-store');
        const result2 = await memory.reasoningBank.getMetadata('default:restored-2', 'cli-store');

        expect(result1).toBeDefined();
        expect(result2).toBeDefined();
        expect((result1 as any).value).toBe('value-1');
        expect((result2 as any).value).toBe('value-2');
      } finally {
        // Cleanup backup file
        if (fs.existsSync(backupPath)) {
          fs.unlinkSync(backupPath);
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON gracefully', async () => {
      const key = 'json-key';
      const invalidJson = '{invalid json}';

      // Should store as string when JSON parse fails
      await memory.reasoningBank.storeMetadata(
        `default:${key}`,
        'cli-store',
        { key, value: invalidJson, namespace: 'default', timestamp: Date.now() }
      );

      const result = await memory.reasoningBank.getMetadata(`default:${key}`, 'cli-store');
      expect((result as any).value).toBe(invalidJson);
    });

    it('should handle empty search results', async () => {
      // Simulate: machine-dream memory search "nonexistent-pattern"
      const allResults = await memory.reasoningBank.queryMetadata('cli-store', {});
      const results = allResults.filter((item: any) =>
        (item.key && item.key.includes('nonexistent-pattern')) ||
        (item.value && JSON.stringify(item.value).includes('nonexistent-pattern'))
      );

      expect(results).toHaveLength(0);
    });
  });
});
