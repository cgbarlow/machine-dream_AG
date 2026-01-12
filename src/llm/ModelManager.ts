/**
 * LM Studio Model Manager
 * Specification: docs/specs/11-llm-sudoku-player.md (Model Management section)
 *
 * Provides API access to LM Studio model management:
 * - List available and loaded models
 * - Load models with TTL configuration
 * - Unload models from memory
 *
 * Note: Some endpoints may require LM Studio v0.3.9+
 */

import type { LLMConfig } from './types.js';
import { LLM_RETRY_CONFIG } from './config.js';

/**
 * Model information from LM Studio API
 */
export interface ModelInfo {
  id: string;                          // Model identifier (e.g., "qwen3-30b-instruct")
  object: string;                      // "model"
  type?: string;                       // Model type (e.g., "llm")
  publisher?: string;                  // Model publisher
  arch?: string;                       // Architecture (e.g., "qwen2")
  compatibilityType?: string;          // e.g., "gguf"
  quantization?: string;               // e.g., "Q4_K_M"
  state: 'loaded' | 'not-loaded';      // Current memory state
  maxContextLength?: number;           // Maximum context window
}

/**
 * Model list response from LM Studio API
 */
interface ModelsResponse {
  data: ModelInfo[];
  object: string;
}

/**
 * Memory estimate for a model
 */
export interface MemoryEstimate {
  modelId: string;
  estimatedVram: string;               // e.g., "8.5 GB"
  estimatedRam: string;                // e.g., "2.1 GB"
  contextLength: number;
}

/**
 * Model load options
 */
export interface ModelLoadOptions {
  ttl?: number;                        // Auto-unload after N seconds of idle time
  contextLength?: number;              // Override default context length
  gpuLayers?: number;                  // Number of layers to offload to GPU
}

/**
 * LM Studio Model Manager
 *
 * Manages model lifecycle via LM Studio's REST API.
 * Supports both OpenAI-compatible and LM Studio-native endpoints.
 */
export class LMStudioModelManager {
  private baseUrl: string;

  constructor(config: LLMConfig | string) {
    // Accept either full config or just base URL
    this.baseUrl = typeof config === 'string' ? config : config.baseUrl;
    // Ensure base URL doesn't end with /v1 for v0 API calls
    this.baseUrl = this.baseUrl.replace(/\/v1\/?$/, '');
  }

  /**
   * List all available models
   *
   * Uses the LM Studio v0 API which provides extended model information
   * including state (loaded/not-loaded) and quantization details.
   *
   * @param loadedOnly - If true, only return loaded models
   */
  async listModels(loadedOnly = false): Promise<ModelInfo[]> {
    try {
      // Try LM Studio v0 API first (has state information)
      const response = await fetch(`${this.baseUrl}/api/v0/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        // Fall back to OpenAI-compatible endpoint
        return this.listModelsOpenAI(loadedOnly);
      }

      const data = await response.json() as ModelsResponse;

      if (loadedOnly) {
        return data.data.filter(m => m.state === 'loaded');
      }

      return data.data;
    } catch (error) {
      // Fall back to OpenAI-compatible endpoint
      return this.listModelsOpenAI(loadedOnly);
    }
  }

  /**
   * List models using OpenAI-compatible endpoint
   * Falls back when v0 API is not available
   * Note: OpenAI endpoint only returns loaded models, so loadedOnly is implicit
   */
  private async listModelsOpenAI(_loadedOnly: boolean): Promise<ModelInfo[]> {
    const response = await fetch(`${this.baseUrl}/v1/models`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { data: Array<{ id: string; object: string }> };

    // OpenAI endpoint only returns loaded models, so loadedOnly filter is implicit
    return data.data.map(m => ({
      id: m.id,
      object: m.object,
      state: 'loaded' as const,
    }));
  }

  /**
   * Get information about a specific model
   */
  async getModel(modelId: string): Promise<ModelInfo | null> {
    const models = await this.listModels();
    return models.find(m => m.id === modelId) ?? null;
  }

  /**
   * Check if a model is currently loaded in memory
   */
  async isModelLoaded(modelId: string): Promise<boolean> {
    const model = await this.getModel(modelId);
    return model?.state === 'loaded';
  }

  /**
   * Load a model into memory
   *
   * Uses the LM Studio v0 API POST endpoint if available,
   * otherwise triggers JIT loading via a minimal API request.
   *
   * @param modelId - Model identifier to load
   * @param options - Load options (TTL, context length, etc.)
   */
  async loadModel(modelId: string, options?: ModelLoadOptions): Promise<void> {
    // Try v0 API load endpoint first
    try {
      const response = await fetch(`${this.baseUrl}/api/v0/models/${encodeURIComponent(modelId)}/load`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ttl: options?.ttl,
          context_length: options?.contextLength,
          gpu_layers: options?.gpuLayers,
        }),
        signal: AbortSignal.timeout(120000), // 2 minute timeout for loading
      });

      if (response.ok) {
        return;
      }

      // If 404, try JIT loading approach
      if (response.status === 404) {
        return this.loadModelViaJIT(modelId, options);
      }

      throw new Error(`Failed to load model: ${response.status} ${response.statusText}`);
    } catch (error) {
      // If the v0 endpoint doesn't exist, try JIT loading
      if (error instanceof Error && error.message.includes('404')) {
        return this.loadModelViaJIT(modelId, options);
      }
      // If it's a network error or timeout, also try JIT
      if (error instanceof TypeError || (error instanceof Error && error.name === 'AbortError')) {
        return this.loadModelViaJIT(modelId, options);
      }
      throw error;
    }
  }

  /**
   * Load model via JIT (just-in-time) by making a minimal chat request
   *
   * LM Studio supports JIT loading - when a request specifies a model
   * that isn't loaded, it automatically loads it with a default 60-minute TTL.
   */
  private async loadModelViaJIT(modelId: string, options?: ModelLoadOptions): Promise<void> {
    const payload: Record<string, unknown> = {
      model: modelId,
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 1,
    };

    // Add TTL if specified
    if (options?.ttl) {
      payload.ttl = options.ttl;
    }

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120000), // 2 minute timeout for loading
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to load model via JIT: ${response.status} - ${errorText}`);
    }

    // Consume response body
    await response.text();
  }

  /**
   * Unload a model from memory
   *
   * Uses the LM Studio v0 API POST endpoint if available.
   * Note: This may not be available in older LM Studio versions.
   *
   * @param modelId - Model identifier to unload (optional - unloads all if not specified)
   */
  async unloadModel(modelId?: string): Promise<void> {
    const endpoint = modelId
      ? `${this.baseUrl}/api/v0/models/${encodeURIComponent(modelId)}/unload`
      : `${this.baseUrl}/api/v0/models/unload`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          'Model unload via API is not available. Use the LM Studio GUI or CLI (lms unload) instead.'
        );
      }
      throw new Error(`Failed to unload model: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Estimate memory requirements for a model
   *
   * Note: This is a heuristic estimation based on model metadata.
   * Actual memory usage may vary based on context length and GPU offloading.
   */
  async estimateMemory(modelId: string): Promise<MemoryEstimate | null> {
    const model = await this.getModel(modelId);
    if (!model) {
      return null;
    }

    // Heuristic estimation based on quantization
    // These are rough estimates for typical models
    const quantizationMultipliers: Record<string, number> = {
      'Q2_K': 0.3,
      'Q3_K_S': 0.35,
      'Q3_K_M': 0.4,
      'Q4_0': 0.45,
      'Q4_K_S': 0.5,
      'Q4_K_M': 0.55,
      'Q5_0': 0.6,
      'Q5_K_S': 0.65,
      'Q5_K_M': 0.7,
      'Q6_K': 0.8,
      'Q8_0': 1.0,
      'F16': 2.0,
      'F32': 4.0,
    };

    // Extract model size from ID (e.g., "30b" from "qwen3-30b")
    const sizeMatch = modelId.match(/(\d+)[bB]/);
    const paramBillions = sizeMatch ? parseInt(sizeMatch[1], 10) : 7; // Default 7B

    // Base memory: ~1GB per 1B parameters at Q4
    const quantMult = model.quantization
      ? (quantizationMultipliers[model.quantization] ?? 0.55)
      : 0.55;

    const estimatedGb = paramBillions * quantMult;

    // Assume 80% VRAM, 20% RAM spillover
    return {
      modelId,
      estimatedVram: `${(estimatedGb * 0.8).toFixed(1)} GB`,
      estimatedRam: `${(estimatedGb * 0.2).toFixed(1)} GB`,
      contextLength: model.maxContextLength ?? 8192,
    };
  }

  /**
   * Health check - verify LM Studio is running
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Wait for LLM to become available with retry logic
   *
   * Uses LLM_RETRY_CONFIG for retry parameters:
   * - 10 second wait between retries
   * - 6 maximum retries (60 seconds total)
   *
   * @param retries - Maximum number of retry attempts (default: 6)
   * @param delayMs - Delay between retries in ms (default: 10000)
   * @returns true if available, false if not available after all retries
   */
  async waitForAvailability(
    retries = LLM_RETRY_CONFIG.maxRetries,
    delayMs = LLM_RETRY_CONFIG.retryDelayMs
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      if (await this.healthCheck()) {
        if (attempt > 1) {
          console.log(`✅ LLM available after ${attempt} attempts`);
        }
        return true;
      }

      if (attempt < retries) {
        console.log(`⏳ LLM unavailable. Retry ${attempt}/${retries} in ${delayMs / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    console.error(`❌ LLM not available after ${retries} retries`);
    return false;
  }

  /**
   * Get LM Studio server information
   */
  async getServerInfo(): Promise<{ version?: string; apiVersion?: string } | null> {
    try {
      // Try to get version from v0 API
      const response = await fetch(`${this.baseUrl}/api/v0`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        return await response.json() as { version?: string; apiVersion?: string };
      }

      return null;
    } catch {
      return null;
    }
  }
}
