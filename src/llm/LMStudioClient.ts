/**
 * LLM Studio Client - OpenAI-compatible API client
 * Specification: docs/specs/11-llm-sudoku-player.md
 */

import type { LLMConfig, ChatMessage } from './types.js';

/**
 * Result from chat() method
 * Contains both content and optional full reasoning tokens
 */
export interface ChatResult {
  content: string;
  reasoning?: string;  // Full streaming reasoning tokens from LM Studio
}

/**
 * OpenAI-compatible API response
 */
interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * LM Studio Client
 *
 * Connects to LM Studio's local server using OpenAI-compatible API.
 * Supports Qwen3 30B and other capable local models.
 */
export class LMStudioClient {
  private maxRetries = 3;
  private baseRetryDelay = 1000; // 1 second

  constructor(private config: LLMConfig) {}

  /**
   * Send chat completion request to LM Studio with automatic retry
   *
   * Spec 11: Uses OpenAI-compatible /v1/chat/completions endpoint
   * @param messages - Chat messages to send
   * @param onStream - Optional callback for streaming tokens
   * @param onReasoning - Optional callback for reasoning tokens (LM Studio v0.3.9+ with Developer setting)
   * @returns ChatResult with content and optional full reasoning
   */
  async chat(
    messages: ChatMessage[],
    onStream?: (token: string) => void,
    onReasoning?: (token: string) => void
  ): Promise<ChatResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.chatAttempt(messages, onStream, onReasoning);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        if (attempt < this.maxRetries && this.isRetryableError(lastError)) {
          const delay = this.baseRetryDelay * Math.pow(2, attempt);
          if (this.config.debug) {
            console.warn(`   ⚠️  LLM request failed (attempt ${attempt + 1}/${this.maxRetries + 1}): ${lastError.message}`);
            console.warn(`   🔄 Retrying in ${delay}ms...`);
          }
          await this.sleep(delay);
          continue;
        }

        // Non-retryable error or max retries exceeded
        throw lastError;
      }
    }

    throw lastError || new Error('Unknown error in chat()');
  }

  /**
   * Check if an error is retryable (transient network errors)
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const cause = (error as any).cause?.message?.toLowerCase() || '';

    // Socket errors (connection closed, reset, refused)
    if (message.includes('socket') || cause.includes('socket')) return true;
    if (message.includes('other side closed') || cause.includes('other side closed')) return true;
    if (message.includes('econnreset') || cause.includes('econnreset')) return true;
    if (message.includes('econnrefused') || cause.includes('econnrefused')) return true;

    // Fetch errors
    if (message.includes('fetch failed')) return true;
    if (message.includes('network') || cause.includes('network')) return true;

    // Timeout errors are NOT retryable (already waited long enough)
    if (message.includes('timeout')) return false;

    // HTTP 5xx errors are retryable
    if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) return true;

    return false;
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Single attempt at chat completion
   */
  private async chatAttempt(
    messages: ChatMessage[],
    onStream?: (token: string) => void,
    onReasoning?: (token: string) => void
  ): Promise<ChatResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          stream: !!onStream, // Enable streaming if callback provided
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `LM Studio API error (${response.status}): ${errorText}`
        );
      }

      // Handle streaming response
      if (onStream && response.body) {
        return await this.handleStreamingResponse(response, onStream, controller.signal, onReasoning);
      }

      // Handle non-streaming response
      const data = await response.json() as ChatCompletionResponse;

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from LM Studio');
      }

      return { content: data.choices[0].message.content };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(
          `LM Studio request timeout after ${this.config.timeout}ms`
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Handle streaming response from LM Studio
   * Now properly respects abort signal during streaming
   * Supports reasoning token capture (LM Studio v0.3.9+)
   *
   * @param response - Fetch response with streaming body
   * @param onStream - Callback for content tokens
   * @param signal - Abort signal for timeout handling
   * @param onReasoning - Optional callback for reasoning tokens (LM Studio Developer setting required)
   * @returns ChatResult with content and optional full reasoning
   */
  private async handleStreamingResponse(
    response: Response,
    onStream: (token: string) => void,
    signal: AbortSignal,
    onReasoning?: (token: string) => void
  ): Promise<ChatResult> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let fullReasoning = '';
    let finishReason: string | null = null;

    // Spec 16 Fix 5: Thinking timeout for reasoning models
    // Tracks <think> blocks in content and truncates if they exceed limit
    let thinkingTokenCount = 0;
    let inThinkingBlock = false;
    let thinkingTruncated = false;
    const thinkingMaxTokens = this.config.thinkingMaxTokens ?? 4096;

    try {
      while (true) {
        // Check if request was aborted (timeout or manual cancellation)
        if (signal.aborted) {
          reader.cancel('Request timeout');
          throw new Error('LM Studio request timeout during streaming');
        }

        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;

              // Extract reasoning tokens (LM Studio v0.3.9+ with Developer setting enabled)
              // Try both field names: reasoning (gpt-oss style) and reasoning_content (DeepSeek style)
              const reasoning = delta?.reasoning || delta?.reasoning_content;
              if (reasoning) {
                fullReasoning += reasoning;
                if (onReasoning) {
                  onReasoning(reasoning);
                }
              }

              // Extract content tokens
              const token = delta?.content;
              if (token) {
                // Spec 16 Fix 5: Track <think> blocks for thinking timeout
                if (token.includes('<think>')) {
                  inThinkingBlock = true;
                  thinkingTokenCount = 0;
                }

                // Count tokens and check for truncation while in thinking block
                if (inThinkingBlock && !thinkingTruncated) {
                  thinkingTokenCount++;
                  if (thinkingTokenCount > thinkingMaxTokens) {
                    // Force closure - append </think> and continue to answer
                    fullContent += '</think>\n[Thinking truncated at ' + thinkingMaxTokens + ' tokens - producing answer]\n';
                    onStream('</think>\n[Thinking truncated - producing answer]\n');
                    inThinkingBlock = false;
                    thinkingTruncated = true;
                    continue; // Skip adding this token to content
                  }
                }

                if (token.includes('</think>')) {
                  inThinkingBlock = false;
                }

                // Skip content tokens while truncated and still in thinking
                if (thinkingTruncated && inThinkingBlock) {
                  continue;
                }

                fullContent += token;
                onStream(token);
              }

              // Capture finish_reason when it appears
              const reason = parsed.choices?.[0]?.finish_reason;
              if (reason) {
                finishReason = reason;
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Check if response was truncated
    if (finishReason && finishReason !== 'stop') {
      throw new Error(`LLM response incomplete: finish_reason=${finishReason}`);
    }

    // Return both content and reasoning (if any was captured)
    return {
      content: fullContent,
      reasoning: fullReasoning || undefined,
    };
  }

  /**
   * Health check - verify LM Studio is running
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get loaded model information
   */
  async getModelInfo(): Promise<{ id: string; object: string } | null> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as { data?: Array<{ id: string; object: string }> };
      if (data.data && data.data.length > 0) {
        return data.data[0];
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Verify that the expected model is loaded in LM Studio
   * @returns Object with available status and list of loaded models
   */
  async verifyModel(): Promise<{
    available: boolean;
    expectedModel: string;
    loadedModels: string[];
    error?: string;
  }> {
    const expectedModel = this.config.model;

    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return {
          available: false,
          expectedModel,
          loadedModels: [],
          error: `Cannot connect to LM Studio at ${this.config.baseUrl}`,
        };
      }

      const data = await response.json() as { data?: Array<{ id: string; object: string }> };
      const loadedModels = data.data?.map(m => m.id) || [];

      const available = loadedModels.includes(expectedModel);

      return {
        available,
        expectedModel,
        loadedModels,
        error: available ? undefined : `Model "${expectedModel}" not loaded. Available: ${loadedModels.join(', ') || 'none'}`,
      };
    } catch (err) {
      return {
        available: false,
        expectedModel,
        loadedModels: [],
        error: `Cannot connect to LM Studio: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}
