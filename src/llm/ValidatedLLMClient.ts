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

        // Use centralized smart validation (NL stripping + sampling)
        promptValidation = this.validator.validateSmart(promptContent);
        this.logValidation(promptValidation, context, true);
        this.emitValidationEvent(promptValidation, context, true);
      }
    }

    // === LLM CALL ===
    if (context && context !== 'unknown') {
      console.log(`   ⏳ Waiting for LLM response [${context}]...`);
    }
    const result = await this.client.chat(messages, onStream, onReasoning);

    // === RESPONSE VALIDATION ===
    // Only validate response in aisp-full mode
    if (this.aispMode === 'aisp-full' && validateResponse) {
      await this.ensureValidatorInitialized();

      if (this.validatorInitialized) {
        // Use centralized smart validation (NL stripping + sampling)
        responseValidation = this.validator.validateSmart(result.content);
        this.logValidation(responseValidation, context, false);
        this.emitValidationEvent(responseValidation, context, false);

        // Request critique on Reject tier
        if (responseValidation.tierValue === 0) {
          // Check for known false-positive patterns before requesting expensive critique
          const knownFalsePositive = this.detectKnownFalsePositive(result.content, context);
          if (knownFalsePositive) {
            console.warn(`   ⚠️ AISP validation false-positive [${context}]: ${knownFalsePositive}`);
            critiqueFallback = true;
            this.emitValidationEvent(responseValidation, context, false, knownFalsePositive);
          } else {
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

    // Check for known false-positive contexts before logging as error
    const knownFalsePositiveContext = this.isKnownFalsePositiveContext(context);

    if (result.tierValue >= 2) {
      // Silver or above - info level
      console.log(`✓ ${prefix} ${result.tierName} (δ=${delta.toFixed(3)})`);
    } else if (result.tierValue === 1) {
      // Bronze - warning level
      console.warn(`⚠️ ${prefix} ${result.tierName} (δ=${delta.toFixed(3)})`);
    } else if (knownFalsePositiveContext) {
      // Known false-positive context - warning level instead of error
      console.warn(`⚠️ ${prefix} ${result.tierName} (δ=${delta.toFixed(3)}) [expected for ${context}]`);
    } else {
      // Reject - error level
      console.error(`❌ ${prefix} ${result.tierName} (δ=${delta.toFixed(3)})`);
    }
  }

  /**
   * Check if context is a known false-positive context
   *
   * These contexts use valid AISP-like formats that the validator doesn't
   * fully recognize, so Reject tier is expected and not an error.
   */
  private isKnownFalsePositiveContext(context: string): boolean {
    const knownFalsePositiveContexts = [
      'fewshot-selection',
      'hierarchy-build',
    ];
    return knownFalsePositiveContexts.includes(context);
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

  /**
   * Detect known false-positive validation failures
   *
   * Some AISP responses use simple line-based formats that the validator
   * rejects because it expects JSON metadata. If the response matches our
   * expected format, return a brief explanation instead of triggering
   * expensive LLM critique.
   *
   * @returns Explanation string if known false-positive, null otherwise
   */
  private detectKnownFalsePositive(response: string, context: string): string | null {
    // fewshot-selection: expects sel[n]→sm format
    if (context === 'fewshot-selection') {
      const hasSelectionFormat = /sel\[\d+\]→s\d+/i.test(response);
      if (hasSelectionFormat) {
        return 'Response uses valid sel[n]→sm format; validator expects JSON metadata (known incompatibility)';
      }
    }

    // hierarchy-build: expects L0≔...; L1≔... format
    if (context === 'hierarchy-build') {
      const hasHierarchyFormat = /L[0-3][≔=].+/i.test(response);
      if (hasHierarchyFormat) {
        return 'Response uses valid Ln≔items format; validator expects JSON metadata (known incompatibility)';
      }
    }

    return null;
  }
}
