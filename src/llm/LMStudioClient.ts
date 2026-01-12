/**
 * LLM Studio Client - OpenAI-compatible API client
 * Specification: docs/specs/11-llm-sudoku-player.md
 */

import type { LLMConfig, ChatMessage } from './types.js';

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
  constructor(private config: LLMConfig) {}

  /**
   * Send chat completion request to LM Studio
   *
   * Spec 11: Uses OpenAI-compatible /v1/chat/completions endpoint
   * @param messages - Chat messages to send
   * @param onStream - Optional callback for streaming tokens
   */
  async chat(
    messages: ChatMessage[],
    onStream?: (token: string) => void
  ): Promise<string> {
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
        return await this.handleStreamingResponse(response, onStream, controller.signal);
      }

      // Handle non-streaming response
      const data = await response.json() as ChatCompletionResponse;

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from LM Studio');
      }

      return data.choices[0].message.content;
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
   */
  private async handleStreamingResponse(
    response: Response,
    onStream: (token: string) => void,
    signal: AbortSignal
  ): Promise<string> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let finishReason: string | null = null;

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
              const token = parsed.choices?.[0]?.delta?.content;
              if (token) {
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

    return fullContent;
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
