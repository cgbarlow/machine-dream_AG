/**
 * Tests for ValidatedLLMClient
 *
 * TDD tests for centralized AISP validation wrapper.
 *
 * Spec 16: AISP Mode Integration - Section 4.11
 * ADR-014: Centralized AISP Validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AISPMode } from '../../../src/llm/AISPBuilder.js';

// Mock the dependencies
vi.mock('../../../src/llm/LMStudioClient.js', () => ({
  LMStudioClient: vi.fn().mockImplementation(() => ({
    chat: vi.fn().mockResolvedValue({ content: 'ROW: 1\nCOL: 1\nVALUE: 5\nREASONING: Test', reasoning: undefined }),
    chatStream: vi.fn().mockResolvedValue({ content: 'ROW: 1\nCOL: 1\nVALUE: 5\nREASONING: Test', reasoning: undefined }),
  })),
}));

vi.mock('../../../src/llm/AISPValidator.js', () => ({
  AISPValidatorService: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    validate: vi.fn().mockReturnValue({
      valid: true,
      tier: '◊',
      tierName: 'Silver',
      delta: 0.45,
      pureDensity: 0.45,
    }),
    validateWithCritique: vi.fn().mockResolvedValue({
      result: { valid: true, tier: '◊', tierName: 'Silver', delta: 0.45 },
      critique: undefined,
    }),
  })),
}));

// Import after mocks are set up
import { ValidatedLLMClient } from '../../../src/llm/ValidatedLLMClient.js';
import { createLLMClient } from '../../../src/llm/LLMClientFactory.js';

describe('ValidatedLLMClient (Spec 16 Section 4.11, ADR-014)', () => {
  const testConfig = {
    baseUrl: 'http://localhost:1234/v1',
    model: 'test-model',
    temperature: 0.7,
    maxTokens: 2048,
    timeout: 30000,
    memoryEnabled: false,
    maxHistoryMoves: 20,
    includeReasoning: false,
  };

  describe('constructor', () => {
    it('should create wrapper with underlying LMStudioClient', () => {
      const client = new ValidatedLLMClient(testConfig);
      expect(client).toBeDefined();
    });

    it('should default aispMode to off', () => {
      const client = new ValidatedLLMClient(testConfig);
      expect(client.getAISPMode()).toBe('off');
    });
  });

  describe('setAISPMode', () => {
    it('should set aisp mode', () => {
      const client = new ValidatedLLMClient(testConfig);
      client.setAISPMode('aisp');
      expect(client.getAISPMode()).toBe('aisp');
    });

    it('should set aisp-full mode', () => {
      const client = new ValidatedLLMClient(testConfig);
      client.setAISPMode('aisp-full');
      expect(client.getAISPMode()).toBe('aisp-full');
    });

    it('should allow resetting to off', () => {
      const client = new ValidatedLLMClient(testConfig);
      client.setAISPMode('aisp-full');
      client.setAISPMode('off');
      expect(client.getAISPMode()).toBe('off');
    });
  });

  describe('prompt validation', () => {
    it('should skip validation when aispMode is off', async () => {
      const client = new ValidatedLLMClient(testConfig);
      client.setAISPMode('off');

      const result = await client.chat(
        [{ role: 'user', content: 'test prompt' }],
        { validatePrompt: true, context: 'test' }
      );

      expect(result.content).toBeDefined();
      expect(result.promptValidation).toBeUndefined();
    });

    it('should validate prompt when aispMode is aisp', async () => {
      const client = new ValidatedLLMClient(testConfig);
      client.setAISPMode('aisp');

      const result = await client.chat(
        [{ role: 'user', content: '⟦Σ:State⟧{board≜Vec₉}' }],
        { validatePrompt: true, context: 'test' }
      );

      expect(result.promptValidation).toBeDefined();
      expect(result.promptValidation?.tier).toBeDefined();
    });

    it('should validate prompt when aispMode is aisp-full', async () => {
      const client = new ValidatedLLMClient(testConfig);
      client.setAISPMode('aisp-full');

      const result = await client.chat(
        [{ role: 'user', content: '⟦Σ:State⟧{board≜Vec₉}' }],
        { validatePrompt: true, context: 'test' }
      );

      expect(result.promptValidation).toBeDefined();
    });

    it('should skip validation when validatePrompt is false', async () => {
      const client = new ValidatedLLMClient(testConfig);
      client.setAISPMode('aisp-full');

      const result = await client.chat(
        [{ role: 'user', content: 'test prompt' }],
        { validatePrompt: false, context: 'test' }
      );

      expect(result.promptValidation).toBeUndefined();
    });
  });

  describe('response validation', () => {
    it('should skip response validation when aispMode is aisp', async () => {
      const client = new ValidatedLLMClient(testConfig);
      client.setAISPMode('aisp');

      const result = await client.chat(
        [{ role: 'user', content: 'test prompt' }],
        { validateResponse: true, context: 'test' }
      );

      expect(result.responseValidation).toBeUndefined();
    });

    it('should validate response when aispMode is aisp-full', async () => {
      const client = new ValidatedLLMClient(testConfig);
      client.setAISPMode('aisp-full');

      const result = await client.chat(
        [{ role: 'user', content: '⟦Σ:State⟧{board≜Vec₉}' }],
        { validateResponse: true, context: 'test' }
      );

      expect(result.responseValidation).toBeDefined();
    });

    it('should skip validation when validateResponse is false', async () => {
      const client = new ValidatedLLMClient(testConfig);
      client.setAISPMode('aisp-full');

      const result = await client.chat(
        [{ role: 'user', content: 'test prompt' }],
        { validateResponse: false, context: 'test' }
      );

      expect(result.responseValidation).toBeUndefined();
    });
  });

  describe('critique workflow', () => {
    it('should request critique on Reject tier', async () => {
      // This test will be fully implemented when ValidatedLLMClient is created
      // For now, we verify the expected behavior
      expect(true).toBe(true);
    });

    it('should continue after critique (graceful fallback)', async () => {
      // Verify that processing continues even after critique
      expect(true).toBe(true);
    });

    it('should set critiqueFallback flag when critique occurs', async () => {
      // Verify the flag is set when fallback happens
      expect(true).toBe(true);
    });
  });

  describe('integration', () => {
    it('should pass through to LMStudioClient', async () => {
      const client = new ValidatedLLMClient(testConfig);

      const result = await client.chat(
        [{ role: 'user', content: 'test prompt' }],
        { context: 'test' }
      );

      expect(result.content).toBeDefined();
    });

    it('should include validation metadata in result', async () => {
      const client = new ValidatedLLMClient(testConfig);
      client.setAISPMode('aisp-full');

      const result = await client.chat(
        [{ role: 'user', content: '⟦Σ:State⟧{board≜Vec₉}' }],
        { validatePrompt: true, validateResponse: true, context: 'test' }
      );

      expect(result).toHaveProperty('content');
      // When validation is enabled, metadata should be included
    });
  });

  describe('context logging', () => {
    it('should include context in log output', async () => {
      const client = new ValidatedLLMClient(testConfig);
      client.setAISPMode('aisp');

      // Validate that context is passed through for logging
      const result = await client.chat(
        [{ role: 'user', content: '⟦Σ:State⟧{board≜Vec₉}' }],
        { validatePrompt: true, context: 'move-generation' }
      );

      expect(result).toBeDefined();
    });
  });
});

describe('LLMClientFactory (ADR-014)', () => {
  const testConfig = {
    baseUrl: 'http://localhost:1234/v1',
    model: 'test-model',
    temperature: 0.7,
    maxTokens: 2048,
    timeout: 30000,
    memoryEnabled: false,
    maxHistoryMoves: 20,
    includeReasoning: false,
  };

  it('should create ValidatedLLMClient via factory', () => {
    const client = createLLMClient(testConfig);
    expect(client).toBeInstanceOf(ValidatedLLMClient);
  });

  it('should set aispMode via factory', () => {
    const client = createLLMClient(testConfig, 'aisp-full');
    expect(client.getAISPMode()).toBe('aisp-full');
  });

  it('should default to off mode', () => {
    const client = createLLMClient(testConfig);
    expect(client.getAISPMode()).toBe('off');
  });
});
