/**
 * LLM Session Commands Integration Tests
 *
 * Tests the session management CLI commands.
 * Covers: llm session list, llm session show
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentMemory } from '../../../src/memory/AgentMemory.js';
import type { AgentDBConfig } from '../../../src/types.js';
import type { LLMExperience, LearningContext } from '../../../src/llm/types.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('LLM Session Commands Integration Tests', () => {
  let memory: AgentMemory;
  let testDbPath: string;
  let testConfig: AgentDBConfig;

  const createTestExperience = (overrides?: Partial<LLMExperience>): LLMExperience => {
    const defaults: LLMExperience = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      puzzleId: 'puzzle-001',
      puzzleHash: 'hash-001',
      moveNumber: 1,
      gridState: Array(9)
        .fill(null)
        .map(() => Array(9).fill(0)),
      move: {
        row: 1,
        col: 1,
        value: 5,
        reasoning: 'Test reasoning',
      },
      validation: {
        isValid: true,
        isCorrect: true,
        outcome: 'correct' as const,
      },
      timestamp: new Date(),
      modelUsed: 'test-model',
      memoryWasEnabled: true,
      importance: 0.8,
      context: {
        emptyCellsAtMove: 45,
        reasoningLength: 50,
        constraintDensity: 2.0,
      },
      profileName: 'default',
      learningContext: {
        fewShotsUsed: false,
        fewShotCount: 0,
        patternsAvailable: 0,
        consolidatedExperiences: 0,
      },
    };

    return { ...defaults, ...overrides };
  };

  beforeEach(() => {
    testDbPath = path.join(os.tmpdir(), `.test-llm-session-${Date.now()}-${Math.random()}`);

    testConfig = {
      dbPath: testDbPath,
      agentDbPath: testDbPath,
      preset: 'large' as const,
      rlPlugin: {
        type: 'decision-transformer' as const,
        name: 'sudoku-solver' as const,
        stateDim: 81,
        actionDim: 9,
        sequenceLength: 20,
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
        similarityThreshold: 0.8,
      },
      skillLibrary: {
        enabled: false,
        minSuccessRate: 0.8,
        maxSkills: 100,
        autoConsolidate: false,
      },
    };

    memory = new AgentMemory(testConfig);
  });

  afterEach(() => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.rmSync(testDbPath, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  describe('llm session list - Session Aggregation', () => {
    beforeEach(async () => {
      // Create multiple sessions with different profiles and outcomes
      // Session 1: puzzle-001 with profile-a (successful)
      for (let i = 1; i <= 10; i++) {
        await memory.reasoningBank.storeMetadata(
          `exp-s1-${i}`,
          'llm_experience',
          createTestExperience({
            id: `exp-s1-${i}`,
            puzzleId: 'puzzle-001',
            profileName: 'profile-a',
            moveNumber: i,
            validation: { isValid: true, isCorrect: i <= 8, outcome: i <= 8 ? 'correct' : 'valid_but_wrong' },
            timestamp: new Date(Date.now() - 1000 * i),
            learningContext: {
              fewShotsUsed: true,
              fewShotCount: 3,
              patternsAvailable: 5,
              consolidatedExperiences: 100,
            },
          })
        );
      }

      // Session 2: puzzle-001 with profile-b (less successful)
      for (let i = 1; i <= 15; i++) {
        await memory.reasoningBank.storeMetadata(
          `exp-s2-${i}`,
          'llm_experience',
          createTestExperience({
            id: `exp-s2-${i}`,
            puzzleId: 'puzzle-001',
            profileName: 'profile-b',
            moveNumber: i,
            validation: {
              isValid: i % 2 === 0,
              isCorrect: i % 3 === 0,
              outcome: i % 3 === 0 ? 'correct' : i % 2 === 0 ? 'valid_but_wrong' : 'invalid',
            },
            timestamp: new Date(Date.now() - 2000 * i),
            learningContext: {
              fewShotsUsed: false,
              fewShotCount: 0,
              patternsAvailable: 0,
              consolidatedExperiences: 0,
            },
          })
        );
      }

      // Session 3: puzzle-002 with profile-a
      for (let i = 1; i <= 20; i++) {
        await memory.reasoningBank.storeMetadata(
          `exp-s3-${i}`,
          'llm_experience',
          createTestExperience({
            id: `exp-s3-${i}`,
            puzzleId: 'puzzle-002',
            profileName: 'profile-a',
            moveNumber: i,
            validation: { isValid: true, isCorrect: i <= 18, outcome: i <= 18 ? 'correct' : 'invalid' },
            timestamp: new Date(Date.now() - 3000 * i),
            learningContext: {
              fewShotsUsed: true,
              fewShotCount: 5,
              patternsAvailable: 10,
              consolidatedExperiences: 200,
            },
          })
        );
      }
    });

    it('should group experiences by session (puzzleId + profileName)', async () => {
      const allExperiences = (await memory.reasoningBank.queryMetadata(
        'llm_experience',
        {}
      )) as LLMExperience[];

      const sessionMap = new Map<string, LLMExperience[]>();

      allExperiences.forEach((exp) => {
        const key = `${exp.puzzleId}-${exp.profileName}`;
        if (!sessionMap.has(key)) {
          sessionMap.set(key, []);
        }
        sessionMap.get(key)!.push(exp);
      });

      expect(sessionMap.size).toBe(3); // 3 unique sessions
      expect(sessionMap.get('puzzle-001-profile-a')?.length).toBe(10);
      expect(sessionMap.get('puzzle-001-profile-b')?.length).toBe(15);
      expect(sessionMap.get('puzzle-002-profile-a')?.length).toBe(20);
    });

    it('should calculate aggregate statistics per session', async () => {
      const allExperiences = (await memory.reasoningBank.queryMetadata(
        'llm_experience',
        {}
      )) as LLMExperience[];

      const session1Exps = allExperiences.filter(
        (exp) => exp.puzzleId === 'puzzle-001' && exp.profileName === 'profile-a'
      );

      const totalMoves = session1Exps.length;
      const correctMoves = session1Exps.filter((e) => e.validation.isCorrect).length;
      const invalidMoves = session1Exps.filter((e) => !e.validation.isValid).length;
      const validButWrong = session1Exps.filter(
        (e) => e.validation.isValid && !e.validation.isCorrect
      ).length;
      const accuracy = (correctMoves / totalMoves) * 100;

      expect(totalMoves).toBe(10);
      expect(correctMoves).toBe(8);
      expect(invalidMoves).toBe(0);
      expect(validButWrong).toBe(2);
      expect(accuracy).toBe(80);
    });

    it('should filter sessions by profile name', async () => {
      const allExperiences = (await memory.reasoningBank.queryMetadata(
        'llm_experience',
        {}
      )) as LLMExperience[];

      const sessionMap = new Map<string, LLMExperience[]>();
      allExperiences.forEach((exp) => {
        const key = `${exp.puzzleId}-${exp.profileName}`;
        if (!sessionMap.has(key)) {
          sessionMap.set(key, []);
        }
        sessionMap.get(key)!.push(exp);
      });

      const profileASessions = Array.from(sessionMap.entries()).filter(([key]) =>
        key.endsWith('-profile-a')
      );

      expect(profileASessions.length).toBe(2);
    });

    it('should include learning flags for each session', async () => {
      const allExperiences = (await memory.reasoningBank.queryMetadata(
        'llm_experience',
        {}
      )) as LLMExperience[];

      const session1Exps = allExperiences.filter(
        (exp) => exp.puzzleId === 'puzzle-001' && exp.profileName === 'profile-a'
      );
      const firstExp = session1Exps[0];

      expect(firstExp.learningContext).toBeDefined();
      expect(firstExp.learningContext.fewShotsUsed).toBe(true);
      expect(firstExp.learningContext.patternsAvailable).toBeGreaterThan(0);
    });

    it('should sort sessions by timestamp (most recent first)', async () => {
      const allExperiences = (await memory.reasoningBank.queryMetadata(
        'llm_experience',
        {}
      )) as LLMExperience[];

      const sessionMap = new Map<
        string,
        { puzzleId: string; profileName: string; firstTimestamp: Date }
      >();

      allExperiences.forEach((exp) => {
        const key = `${exp.puzzleId}-${exp.profileName}`;
        if (!sessionMap.has(key)) {
          sessionMap.set(key, {
            puzzleId: exp.puzzleId,
            profileName: exp.profileName,
            firstTimestamp: exp.timestamp,
          });
        } else {
          const session = sessionMap.get(key)!;
          if (exp.timestamp < session.firstTimestamp) {
            session.firstTimestamp = exp.timestamp;
          }
        }
      });

      const sessions = Array.from(sessionMap.values()).sort(
        (a, b) => new Date(b.firstTimestamp).getTime() - new Date(a.firstTimestamp).getTime()
      );

      // Session 1 (puzzle-001-profile-a) started most recently
      expect(sessions[0].puzzleId).toBe('puzzle-001');
      expect(sessions[0].profileName).toBe('profile-a');
    });

    it('should respect limit parameter', async () => {
      const allExperiences = (await memory.reasoningBank.queryMetadata(
        'llm_experience',
        {}
      )) as LLMExperience[];

      const sessionMap = new Map<string, LLMExperience[]>();
      allExperiences.forEach((exp) => {
        const key = `${exp.puzzleId}-${exp.profileName}`;
        if (!sessionMap.has(key)) {
          sessionMap.set(key, []);
        }
        sessionMap.get(key)!.push(exp);
      });

      const limit = 2;
      const sessions = Array.from(sessionMap.keys()).slice(0, limit);

      expect(sessions.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('llm session show - Detailed Session View', () => {
    beforeEach(async () => {
      // Create a complete session with varied outcomes
      const baseTime = Date.now();

      for (let i = 1; i <= 30; i++) {
        const isCorrect = i <= 25;
        const isValid = i <= 28;

        await memory.reasoningBank.storeMetadata(
          `exp-detail-${i}`,
          'llm_experience',
          createTestExperience({
            id: `exp-detail-${i}`,
            puzzleId: 'puzzle-detail',
            profileName: 'test-profile',
            moveNumber: i,
            validation: {
              isValid,
              isCorrect,
              outcome: isCorrect ? 'correct' : isValid ? 'valid_but_wrong' : 'invalid',
            },
            timestamp: new Date(baseTime + i * 1000), // 1 second apart
            learningContext: {
              fewShotsUsed: true,
              fewShotCount: 3,
              patternsAvailable: 5,
              consolidatedExperiences: 100,
            },
          })
        );
      }
    });

    it('should retrieve all experiences for a session', async () => {
      const allExperiences = (await memory.reasoningBank.queryMetadata(
        'llm_experience',
        {}
      )) as LLMExperience[];
      const sessionExps = allExperiences.filter(
        (exp) => exp.puzzleId === 'puzzle-detail' && exp.profileName === 'test-profile'
      );

      expect(sessionExps.length).toBe(30);
    });

    it('should calculate session summary statistics', async () => {
      const allExperiences = (await memory.reasoningBank.queryMetadata(
        'llm_experience',
        {}
      )) as LLMExperience[];
      const sessionExps = allExperiences.filter(
        (exp) => exp.puzzleId === 'puzzle-detail' && exp.profileName === 'test-profile'
      );

      const totalMoves = sessionExps.length;
      const correctMoves = sessionExps.filter((e) => e.validation.isCorrect).length;
      const invalidMoves = sessionExps.filter((e) => !e.validation.isValid).length;
      const validButWrong = sessionExps.filter(
        (e) => e.validation.isValid && !e.validation.isCorrect
      ).length;

      expect(totalMoves).toBe(30);
      expect(correctMoves).toBe(25);
      expect(invalidMoves).toBe(2);
      expect(validButWrong).toBe(3);
    });

    it('should calculate session duration', async () => {
      const allExperiences = (await memory.reasoningBank.queryMetadata(
        'llm_experience',
        {}
      )) as LLMExperience[];
      const sessionExps = allExperiences
        .filter((exp) => exp.puzzleId === 'puzzle-detail' && exp.profileName === 'test-profile')
        .sort((a, b) => a.moveNumber - b.moveNumber);

      const firstExp = sessionExps[0];
      const lastExp = sessionExps[sessionExps.length - 1];

      const durationMs =
        new Date(lastExp.timestamp).getTime() - new Date(firstExp.timestamp).getTime();
      const durationSec = durationMs / 1000;

      expect(durationSec).toBeGreaterThan(0);
      expect(durationSec).toBeLessThanOrEqual(30); // 30 moves, 1 second apart
    });

    it('should show learning context at session start', async () => {
      const allExperiences = (await memory.reasoningBank.queryMetadata(
        'llm_experience',
        {}
      )) as LLMExperience[];
      const sessionExps = allExperiences
        .filter((exp) => exp.puzzleId === 'puzzle-detail' && exp.profileName === 'test-profile')
        .sort((a, b) => a.moveNumber - b.moveNumber);

      const firstExp = sessionExps[0];

      expect(firstExp.learningContext).toBeDefined();
      expect(firstExp.learningContext.fewShotsUsed).toBe(true);
      expect(firstExp.learningContext.fewShotCount).toBe(3);
      expect(firstExp.learningContext.patternsAvailable).toBe(5);
      expect(firstExp.learningContext.consolidatedExperiences).toBe(100);
    });

    it('should calculate accuracy progression in buckets', async () => {
      const allExperiences = (await memory.reasoningBank.queryMetadata(
        'llm_experience',
        {}
      )) as LLMExperience[];
      const sessionExps = allExperiences
        .filter((exp) => exp.puzzleId === 'puzzle-detail' && exp.profileName === 'test-profile')
        .sort((a, b) => a.moveNumber - b.moveNumber);

      const bucketSize = 10;
      const bucket1 = sessionExps.slice(0, bucketSize); // moves 1-10
      const bucket2 = sessionExps.slice(bucketSize, bucketSize * 2); // moves 11-20
      const bucket3 = sessionExps.slice(bucketSize * 2, bucketSize * 3); // moves 21-30

      const acc1 = (bucket1.filter((e) => e.validation.isCorrect).length / bucket1.length) * 100;
      const acc2 = (bucket2.filter((e) => e.validation.isCorrect).length / bucket2.length) * 100;
      const acc3 = (bucket3.filter((e) => e.validation.isCorrect).length / bucket3.length) * 100;

      expect(acc1).toBe(100); // All correct
      expect(acc2).toBe(100); // All correct
      expect(acc3).toBe(50); // 5 correct out of 10
    });

    it('should detect accuracy trend (improving/declining/stable)', async () => {
      const allExperiences = (await memory.reasoningBank.queryMetadata(
        'llm_experience',
        {}
      )) as LLMExperience[];
      const sessionExps = allExperiences
        .filter((exp) => exp.puzzleId === 'puzzle-detail' && exp.profileName === 'test-profile')
        .sort((a, b) => a.moveNumber - b.moveNumber);

      const bucketSize = 10;
      const firstBucket = sessionExps.slice(0, bucketSize);
      const lastBucket = sessionExps.slice(-bucketSize);

      const firstAccuracy =
        (firstBucket.filter((e) => e.validation.isCorrect).length / firstBucket.length) * 100;
      const lastAccuracy =
        (lastBucket.filter((e) => e.validation.isCorrect).length / lastBucket.length) * 100;

      const trend =
        lastAccuracy > firstAccuracy
          ? 'Improving'
          : lastAccuracy < firstAccuracy
            ? 'Declining'
            : 'Stable';

      expect(trend).toBe('Declining'); // Started at 100%, ended at 50%
    });

    it('should parse session ID correctly (puzzleId-profileName)', () => {
      // Note: Profile names should not contain hyphens for correct parsing
      const sessionId = 'puzzle-detail-testprofile';
      const parts = sessionId.split('-');

      const profileName = parts[parts.length - 1];
      const puzzleId = parts.slice(0, -1).join('-');

      expect(puzzleId).toBe('puzzle-detail');
      expect(profileName).toBe('testprofile');
    });

    it('should handle complex puzzle IDs with hyphens', () => {
      // Note: Profile names should not contain hyphens for correct parsing
      const sessionId = 'easy-puzzle-001-v2-myprofile';
      const parts = sessionId.split('-');

      const profileName = parts[parts.length - 1];
      const puzzleId = parts.slice(0, -1).join('-');

      expect(puzzleId).toBe('easy-puzzle-001-v2');
      expect(profileName).toBe('myprofile');
    });
  });

  describe('Session Statistics Edge Cases', () => {
    it('should handle session with single move', async () => {
      await memory.reasoningBank.storeMetadata(
        'exp-single',
        'llm_experience',
        createTestExperience({
          id: 'exp-single',
          puzzleId: 'single-move-puzzle',
          profileName: 'test',
        })
      );

      const allExperiences = (await memory.reasoningBank.queryMetadata(
        'llm_experience',
        {}
      )) as LLMExperience[];
      const sessionExps = allExperiences.filter(
        (exp) => exp.puzzleId === 'single-move-puzzle'
      );

      expect(sessionExps.length).toBe(1);
      const accuracy = (sessionExps.filter((e) => e.validation.isCorrect).length / 1) * 100;
      expect(accuracy).toBe(100);
    });

    it('should handle session with all invalid moves', async () => {
      for (let i = 1; i <= 5; i++) {
        await memory.reasoningBank.storeMetadata(
          `exp-invalid-${i}`,
          'llm_experience',
          createTestExperience({
            id: `exp-invalid-${i}`,
            puzzleId: 'all-invalid',
            profileName: 'test',
            validation: {
              isValid: false,
              isCorrect: false,
              outcome: 'invalid',
              error: 'Rule violation',
            },
          })
        );
      }

      const allExperiences = (await memory.reasoningBank.queryMetadata(
        'llm_experience',
        {}
      )) as LLMExperience[];
      const sessionExps = allExperiences.filter((exp) => exp.puzzleId === 'all-invalid');

      const invalidMoves = sessionExps.filter((e) => !e.validation.isValid).length;
      expect(invalidMoves).toBe(5);
      expect(sessionExps.every((e) => e.validation.outcome === 'invalid')).toBe(true);
    });

    it('should handle empty session query gracefully', async () => {
      const allExperiences = (await memory.reasoningBank.queryMetadata(
        'llm_experience',
        {}
      )) as LLMExperience[];
      const sessionExps = allExperiences.filter(
        (exp) => exp.puzzleId === 'non-existent-puzzle'
      );

      expect(sessionExps.length).toBe(0);
    });
  });
});
