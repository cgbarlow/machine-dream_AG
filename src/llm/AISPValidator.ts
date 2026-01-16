/**
 * AISP Validator Service
 *
 * Wraps the aisp-validator package for validating AISP compliance
 * and provides LLM critique workflow when validation fails.
 *
 * Spec 16: AISP Mode Integration - Section 4.9
 * ADR-013: AISP Validator Integration
 */

import AISP from 'aisp-validator';
import type { LMStudioClient } from './LMStudioClient.js';

/**
 * Result of AISP validation
 */
export interface AISPValidationResult {
  /** Whether the document is valid AISP */
  valid: boolean;

  /** Tier symbol: ◊⁺⁺, ◊⁺, ◊, ◊⁻, ⊘ */
  tier: string;

  /** Tier numeric value: 4=Platinum, 3=Gold, 2=Silver, 1=Bronze, 0=Reject */
  tierValue: number;

  /** Tier name: Platinum, Gold, Silver, Bronze, Reject */
  tierName: string;

  /** Semantic density score [0, 1] */
  delta: number;

  /** Pure density (symbol/token ratio) */
  pureDensity: number;

  /** Ambiguity score (lower is better) */
  ambiguity?: number;

  /** Error message if validation failed */
  error?: string;

  /** Error code from parser */
  errorCode?: number;
}

/**
 * Debug breakdown of AISP validation
 */
export interface AISPDebugBreakdown {
  /** Block coverage score */
  blockScore: number;

  /** Binding density score */
  bindingScore: number;

  /** Detailed counts */
  breakdown: {
    blocksFound: number;
    blocksRequired: number;
    definitions: number;
    assignments: number;
    quantifiers: number;
    lambdas: number;
    implications: number;
    setOps: number;
    totalBindings: number;
    symbolCount: number;
    tokenCount: number;
  };
}

/**
 * Result of validation with LLM critique
 */
export interface AISPValidationWithCritique {
  /** Validation result */
  result: AISPValidationResult;

  /** LLM critique if validation failed (tier = ⊘) */
  critique?: string;

  /** Guidance on how to make the text AISP compliant */
  guidance?: string;
}

/**
 * AISP Validator Service
 *
 * Provides AISP validation with optional LLM critique on failure.
 * Uses aisp-validator package for WASM-based validation.
 */
export class AISPValidatorService {
  private initialized = false;

  constructor() {
    // No initialization needed
  }

  /**
   * Initialize the AISP WASM kernel
   * Must be called before any validation operations
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await AISP.init();
      this.initialized = true;
      console.log('🔤 AISP validator initialized');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize AISP validator: ${message}`);
    }
  }

  /**
   * Check if the validator is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Validate AISP text
   *
   * @param text - AISP text to validate
   * @returns Validation result with tier and delta
   * @throws Error if validator not initialized
   */
  validate(text: string): AISPValidationResult {
    if (!this.initialized) {
      throw new Error('AISP validator not initialized. Call init() first.');
    }

    try {
      const result = AISP.validate(text);
      return {
        valid: result.valid,
        tier: result.tier ?? '⊘',
        tierValue: result.tierValue ?? 0,
        tierName: result.tierName ?? 'Reject',
        delta: result.delta ?? 0,
        pureDensity: result.pureDensity ?? 0,
        ambiguity: result.ambiguity,
        error: result.error,
        errorCode: result.errorCode,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        tier: '⊘',
        tierValue: 0,
        tierName: 'Reject',
        delta: 0,
        pureDensity: 0,
        error: message,
      };
    }
  }

  /**
   * Smart validation with NL stripping for LLM prompts/responses.
   *
   * Strips embedded natural language from quoted strings before validation
   * to improve AISP density scores. With aisp-validator 0.3.0+, the default
   * limit is 64KB which covers all typical LLM responses.
   *
   * @param text - AISP text to validate
   * @returns Validation result with tier and delta
   */
  validateSmart(text: string): AISPValidationResult {
    // Strip embedded natural language from quoted strings
    // This improves density scores by removing NL that dilutes AISP symbols
    const stripped = text.replace(/"[^"]*"/g, '"…"');

    // aisp-validator 0.3.0+ supports 64KB default, 1MB max
    // Only sample if document exceeds 60KB (leave headroom)
    const MAX_SIZE = 60 * 1024; // 60KB
    if (stripped.length <= MAX_SIZE) {
      return this.validate(stripped);
    }

    // For extremely large documents (>60KB), sample first 60KB
    // This is rare - typical LLM responses are <10KB
    const sample = stripped.substring(0, MAX_SIZE);
    const result = this.validate(sample);

    // Log sampling for transparency (only for oversized docs)
    const sampleNote = `(sampled ${(MAX_SIZE / 1024).toFixed(0)}KB/${(stripped.length / 1024).toFixed(1)}KB)`;
    console.log(`   📊 AISP: ${result.tierName} δ=${(result.delta ?? 0).toFixed(3)} ${sampleNote}`);

    return result;
  }

  /**
   * Validate with LLM critique on failure
   *
   * If validation fails (tier = ⊘), requests LLM critique
   * explaining why the text isn't AISP compliant and how to fix it.
   *
   * @param text - AISP text to validate
   * @param originalPrompt - The original prompt that produced this text
   * @param llmClient - LLM client for critique requests
   * @returns Validation result with optional critique and guidance
   */
  async validateWithCritique(
    text: string,
    originalPrompt: string,
    llmClient: LMStudioClient
  ): Promise<AISPValidationWithCritique> {
    const result = this.validateSmart(text);

    // Only request critique if tier is Reject (⊘)
    if (result.tierValue > 0) {
      return { result };
    }

    // Request LLM critique
    try {
      const critiquePrompt = this.buildCritiquePrompt(text, originalPrompt, result);

      const response = await llmClient.chat([
        {
          role: 'system',
          content: `You are an AISP compliance reviewer. Analyze why the response isn't AISP compliant and provide specific guidance.`,
        },
        {
          role: 'user',
          content: critiquePrompt,
        },
      ]);

      const { critique, guidance } = this.parseCritiqueResponse(response.content);

      return {
        result,
        critique,
        guidance,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️ Failed to get LLM critique: ${message}`);
      return { result };
    }
  }

  /**
   * Get detailed debug breakdown
   *
   * @param text - AISP text to analyze
   * @returns Debug breakdown with scores and counts
   */
  debug(text: string): AISPValidationResult & AISPDebugBreakdown {
    if (!this.initialized) {
      throw new Error('AISP validator not initialized. Call init() first.');
    }

    const debugResult = AISP.debug(text);
    return {
      valid: true, // debug doesn't validate, just analyzes
      tier: debugResult.tier,
      tierValue: debugResult.tierValue,
      tierName: debugResult.tierName,
      delta: debugResult.delta,
      pureDensity: debugResult.pureDensity,
      blockScore: debugResult.blockScore,
      bindingScore: debugResult.bindingScore,
      breakdown: debugResult.breakdown,
    };
  }

  /**
   * Quick check if text is valid AISP
   */
  isValid(text: string): boolean {
    return this.validateSmart(text).valid;
  }

  /**
   * Get density score for text
   */
  getDensity(text: string): number {
    return this.validateSmart(text).delta;
  }

  /**
   * Get tier symbol for text
   */
  getTier(text: string): string {
    return this.validateSmart(text).tier;
  }

  /**
   * Get tier name for text
   */
  getTierName(text: string): string {
    return this.validateSmart(text).tierName;
  }

  /**
   * Check if tier meets minimum threshold
   *
   * @param text - AISP text to check
   * @param minTier - Minimum tier: 'Bronze' (1), 'Silver' (2), 'Gold' (3), 'Platinum' (4)
   * @returns true if tier meets or exceeds minimum
   */
  meetsTier(text: string, minTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'): boolean {
    const tierMap = { Bronze: 1, Silver: 2, Gold: 3, Platinum: 4 };
    const result = this.validateSmart(text);
    return result.tierValue >= tierMap[minTier];
  }

  /**
   * Build AISP critique prompt
   */
  private buildCritiquePrompt(
    text: string,
    originalPrompt: string,
    result: AISPValidationResult
  ): string {
    const date = new Date().toISOString().split('T')[0];

    return `𝔸1.0.aisp.critique@${date}
γ≔aisp.compliance.review

⟦Σ:Input⟧{
  original_request≔"${originalPrompt.substring(0, 500).replace(/"/g, "'")}"
  llm_response≔"${text.substring(0, 500).replace(/"/g, "'")}"
  validation_result≔{valid:${result.valid ? '⊤' : '⊥'}, tier:"${result.tier}", delta:${(result.delta ?? 0).toFixed(3)}}
}

⟦Ω:Task⟧{
  task≜critique(llm_response)
  goal≜identify(non_compliance_reasons)∧suggest(improvements)
}

⟦Ε:Output⟧{
  ;; Provide critique and guidance
  CRITIQUE: [Why this response isn't AISP compliant]
  GUIDANCE: [Specific changes to make it AISP compliant]
  EXAMPLE: [Brief corrected version snippet]
}`;
  }

  /**
   * Parse LLM critique response
   */
  private parseCritiqueResponse(response: string): { critique?: string; guidance?: string } {
    const critiqueMatch = response.match(/CRITIQUE:\s*(.+?)(?=GUIDANCE:|EXAMPLE:|$)/s);
    const guidanceMatch = response.match(/GUIDANCE:\s*(.+?)(?=EXAMPLE:|$)/s);

    return {
      critique: critiqueMatch?.[1]?.trim(),
      guidance: guidanceMatch?.[1]?.trim(),
    };
  }

  /**
   * Log validation result with appropriate level
   */
  logValidation(text: string, context?: string): void {
    const result = this.validateSmart(text);
    const prefix = context ? `[${context}] ` : '';

    const delta = result.delta ?? 0;
    if (result.tierValue >= 2) {
      // Silver or above - info level
      console.log(`${prefix}✓ AISP ${result.tierName} (δ=${delta.toFixed(3)})`);
    } else if (result.tierValue === 1) {
      // Bronze - warning level
      console.warn(`${prefix}⚠️ AISP ${result.tierName} (δ=${delta.toFixed(3)}) - below Silver`);
    } else {
      // Reject - error level
      console.error(`${prefix}❌ AISP ${result.tierName} (δ=${delta.toFixed(3)}) - validation failed`);
    }
  }
}
