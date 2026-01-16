/**
 * Validated LLM Client
 *
 * Wrapper around LMStudioClient that provides centralized AISP validation
 * for all LLM I/O when AISP mode is enabled.
 *
 * Spec 16: AISP Mode Integration - Section 4.11
 * ADR-014: Centralized AISP Validation
 */

import { LMStudioClient } from './LMStudioClient.js';
import { AISPValidatorService, type AISPValidationResult } from './AISPValidator.js';
import type { AISPMode } from './AISPBuilder.js';
import type { LLMConfig, ChatMessage, AISPValidationOptions, ValidatedChatResult } from './types.js';
import { EventEmitter } from 'events';

/**
 * Event emitted on each AISP validation
 */
export interface AISPValidationEvent {
  context?: string;
  tier: string;
  tierName: string;
  delta: number;
  isPrompt: boolean;
  critique?: string;
}

/**
 * Global event emitter for AISP validation events
 */
export const validationEventEmitter = new EventEmitter();

/**
 * Validated LLM Client
 *
 * Wraps LMStudioClient with automatic AISP validation based on mode.
 *
 * Validation behavior by mode:
 * - 'off': No validation (passthrough to LMStudioClient)
 * - 'aisp': Validate prompts only (warn on low tier)
 * - 'aisp-full': Validate both prompts AND responses (critique on Reject)
 */
export class ValidatedLLMClient {
  private client: LMStudioClient;
  private validator: AISPValidatorService;
  private aispMode: AISPMode = 'off';
  private validatorInitialized = false;

  constructor(config: LLMConfig) {
    this.client = new LMStudioClient(config);
    this.validator = new AISPValidatorService();
  }

  /**
   * Get the current AISP mode
   */
  getAISPMode(): AISPMode {
    return this.aispMode;
  }

  /**
   * Set the AISP validation mode
   *
   * @param mode - 'off' | 'aisp' | 'aisp-full'
   */
  setAISPMode(mode: AISPMode): void {
    this.aispMode = mode;
  }

  /**
   * Initialize the AISP validator (lazy initialization)
   */
  private async ensureValidatorInitialized(): Promise<void> {
    if (this.validatorInitialized) return;

    try {
      await this.validator.init();
      this.validatorInitialized = true;
    } catch (error) {
      console.warn(`⚠️ AISP validator initialization failed: ${error instanceof Error ? error.message : error}`);
      // Continue without validation rather than failing
    }
  }

  /**
   * Chat with optional AISP validation
   *
   * @param messages - Chat messages to send
   * @param options - Validation options
   * @param onStream - Optional callback for streaming tokens
   * @param onReasoning - Optional callback for reasoning tokens
   * @returns ValidatedChatResult with content and optional validation metadata
   */
  async chat(
    messages: ChatMessage[],
    options?: AISPValidationOptions,
    onStream?: (token: string) => void,
    onReasoning?: (token: string) => void
  ): Promise<ValidatedChatResult> {
    const {
      validatePrompt = false,
      validateResponse = false,
      context = 'unknown',
    } = options ?? {};

    let promptValidation: AISPValidationResult | undefined;
    let responseValidation: AISPValidationResult | undefined;
    let critiqueFallback = false;

    // === PROMPT VALIDATION ===
    if (this.aispMode !== 'off' && validatePrompt) {
      await this.ensureValidatorInitialized();

      if (this.validatorInitialized) {
        // Extract user message content for validation
        const userMessages = messages.filter(m => m.role === 'user');
        const promptContent = userMessages.map(m => m.content).join('\n');

        // Strip embedded natural language before validating AISP structure
        const strippedContent = this.stripNaturalLanguageForValidation(promptContent);
        // Validate in chunks (AISP validator has 1KB WASM limit)
        promptValidation = this.validateInChunks(strippedContent);
        this.logValidation(promptValidation, context, true);
        this.emitValidationEvent(promptValidation, context, true);
      }
    }

    // === LLM CALL ===
    const result = await this.client.chat(messages, onStream, onReasoning);

    // === RESPONSE VALIDATION ===
    // Only validate response in aisp-full mode
    if (this.aispMode === 'aisp-full' && validateResponse) {
      await this.ensureValidatorInitialized();

      if (this.validatorInitialized) {
        responseValidation = this.validator.validate(result.content);
        this.logValidation(responseValidation, context, false);
        this.emitValidationEvent(responseValidation, context, false);

        // Request critique on Reject tier
        if (responseValidation.tierValue === 0) {
          const userContent = messages.find(m => m.role === 'user')?.content ?? '';
          const critiqueResult = await this.validator.validateWithCritique(
            result.content,
            userContent,
            this.client
          );

          if (critiqueResult.critique) {
            console.warn(`   💭 AISP Critique [${context}]: ${critiqueResult.critique}`);
            if (critiqueResult.guidance) {
              console.warn(`   📝 Guidance: ${critiqueResult.guidance}`);
            }
            critiqueFallback = true;

            // Emit with critique
            this.emitValidationEvent(responseValidation, context, false, critiqueResult.critique);
          }
        }
      }
    }

    return {
      content: result.content,
      reasoning: result.reasoning,
      promptValidation,
      responseValidation,
      critiqueFallback,
    };
  }

  /**
   * Chat with streaming support
   *
   * Validates prompt before sending and response after receiving.
   *
   * @param messages - Chat messages to send
   * @param onToken - Callback for each streaming token
   * @param options - Validation options
   * @returns ValidatedChatResult
   */
  async chatStream(
    messages: ChatMessage[],
    onToken: (token: string) => void,
    options?: AISPValidationOptions
  ): Promise<ValidatedChatResult> {
    return this.chat(messages, options, onToken);
  }

  /**
   * Get the underlying LMStudioClient for advanced operations
   * (e.g., when you need direct access without validation)
   */
  getUnderlyingClient(): LMStudioClient {
    return this.client;
  }

  /**
   * Strip embedded natural language content from AISP prompts before validation.
   *
   * AISP prompts often contain embedded natural language data (experience reasoning,
   * puzzle states) in quoted strings. This dilutes the AISP density score.
   *
   * This method replaces quoted string content with stubs to preserve AISP structure
   * while allowing accurate validation of the AISP syntax.
   *
   * Example:
   *   Before: e1≔"The cell at position (1,2) can only be 5 because..."
   *   After:  e1≔"…"
   */
  private stripNaturalLanguageForValidation(text: string): string {
    // Replace content in double-quoted strings with ellipsis stub
    // Preserves AISP structure (e1≔"…") while removing natural language
    return text.replace(/"[^"]*"/g, '"…"');
  }

  /**
   * Validate content in chunks to handle AISP validator's 1KB WASM limit.
   *
   * Splits content into ≤1KB chunks, validates each, and aggregates:
   * - delta: weighted average across chunks
   * - tier: minimum tier (weakest link)
   * - valid: true only if all chunks valid
   *
   * @param text - Full content to validate
   * @returns Aggregated validation result
   */
  private validateInChunks(text: string): AISPValidationResult {
    const CHUNK_SIZE = 1000; // Leave margin under 1024 limit
    const chunks: string[] = [];

    // Split into chunks
    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
      chunks.push(text.substring(i, i + CHUNK_SIZE));
    }

    if (chunks.length === 0) {
      return {
        valid: false,
        tier: '⊘',
        tierValue: 0,
        tierName: 'Reject',
        delta: 0,
        pureDensity: 0,
        error: 'Empty content',
      };
    }

    // Validate each chunk
    const results = chunks.map(chunk => this.validator.validate(chunk));

    // Aggregate results
    const totalLength = text.length;
    let weightedDelta = 0;
    let weightedPureDensity = 0;
    let minTierValue = 4; // Start with max (Platinum)
    let minTier = '◊⁺⁺';
    let minTierName = 'Platinum';
    let allValid = true;
    const errors: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const chunkLength = chunks[i].length;
      const weight = chunkLength / totalLength;

      // Weighted average for delta and pureDensity
      weightedDelta += (result.delta ?? 0) * weight;
      weightedPureDensity += (result.pureDensity ?? 0) * weight;

      // Track minimum tier (weakest link)
      const tierValue = result.tierValue ?? 0;
      if (tierValue < minTierValue) {
        minTierValue = tierValue;
        minTier = result.tier ?? '⊘';
        minTierName = result.tierName ?? 'Reject';
      }

      // Track validity and errors
      if (!result.valid) allValid = false;
      if (result.error) errors.push(`Chunk ${i + 1}: ${result.error}`);
    }

    return {
      valid: allValid,
      tier: minTier,
      tierValue: minTierValue,
      tierName: minTierName,
      delta: weightedDelta,
      pureDensity: weightedPureDensity,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  }

  /**
   * Log validation result with appropriate level
   */
  private logValidation(
    result: AISPValidationResult,
    context: string,
    isPrompt: boolean
  ): void {
    const type = isPrompt ? 'prompt' : 'response';
    const prefix = `AISP [${context}:${type}]`;
    const delta = result.delta ?? 0;

    if (result.tierValue >= 2) {
      // Silver or above - info level
      console.log(`✓ ${prefix} ${result.tierName} (δ=${delta.toFixed(3)})`);
    } else if (result.tierValue === 1) {
      // Bronze - warning level
      console.warn(`⚠️ ${prefix} ${result.tierName} (δ=${delta.toFixed(3)})`);
    } else {
      // Reject - error level
      console.error(`❌ ${prefix} ${result.tierName} (δ=${delta.toFixed(3)})`);
    }
  }

  /**
   * Emit validation event
   */
  private emitValidationEvent(
    result: AISPValidationResult,
    context: string,
    isPrompt: boolean,
    critique?: string
  ): void {
    const event: AISPValidationEvent = {
      context,
      tier: result.tier ?? '⊘',
      tierName: result.tierName ?? 'Reject',
      delta: result.delta ?? 0,
      isPrompt,
      critique,
    };

    validationEventEmitter.emit('llm:aisp:validation', event);
  }
}
