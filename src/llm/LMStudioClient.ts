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
   */
  async chat(messages: ChatMessage[]): Promise<string> {
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
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `LM Studio API error (${response.status}): ${errorText}`
        );
      }

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
}
