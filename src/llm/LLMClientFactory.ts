/**
 * LLM Client Factory
 *
 * Factory function for creating LLM clients with automatic AISP validation.
 * All LLM consumers should use this factory instead of direct instantiation.
 *
 * Spec 16: AISP Mode Integration - Section 4.11
 * ADR-014: Centralized AISP Validation
 */

import { ValidatedLLMClient } from './ValidatedLLMClient.js';
import type { AISPMode } from './AISPBuilder.js';
import type { LLMConfig } from './types.js';

/**
 * Create an LLM client with optional AISP validation
 *
 * This is the recommended way to create LLM clients. It ensures all
 * consumers use the validated wrapper which provides:
 * - Automatic prompt/response validation when AISP mode enabled
 * - Consistent tier-based logging across all LLM calls
 * - Critique workflow on validation failures
 * - Event emission for monitoring
 *
 * @param config - LLM configuration
 * @param aispMode - AISP validation mode (default: 'off')
 * @returns ValidatedLLMClient instance
 *
 * @example
 * ```typescript
 * // Create client without validation
 * const client = createLLMClient(config);
 *
 * // Create client with AISP validation
 * const validatedClient = createLLMClient(config, 'aisp-full');
 *
 * // Use the client
 * const result = await client.chat(messages, {
 *   validatePrompt: true,
 *   validateResponse: true,
 *   context: 'move-generation'
 * });
 * ```
 */
export function createLLMClient(
  config: LLMConfig,
  aispMode: AISPMode = 'off'
): ValidatedLLMClient {
  const client = new ValidatedLLMClient(config);
  client.setAISPMode(aispMode);
  return client;
}

/**
 * Create an LLM client from a profile configuration
 *
 * Convenience function that extracts LLMConfig from a profile.
 *
 * @param profile - LLM profile with connection details
 * @param aispMode - AISP validation mode (default: 'off')
 * @returns ValidatedLLMClient instance
 */
export function createLLMClientFromProfile(
  profile: {
    baseUrl: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
  },
  aispMode: AISPMode = 'off'
): ValidatedLLMClient {
  const config: LLMConfig = {
    baseUrl: profile.baseUrl,
    model: profile.model,
    temperature: profile.temperature ?? 0.7,
    maxTokens: profile.maxTokens ?? 2048,
    timeout: profile.timeout ?? 60000,
    memoryEnabled: true,
    maxHistoryMoves: 20,
    includeReasoning: false,
  };

  return createLLMClient(config, aispMode);
}
