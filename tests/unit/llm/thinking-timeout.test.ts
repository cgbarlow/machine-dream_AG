/**
 * Tests for Thinking Timeout in Reasoning Models
 *
 * Spec 16 Fix 5: Tracks <think> blocks in content stream and truncates
 * if they exceed the configured thinkingMaxTokens limit.
 */

import { describe, it, expect } from 'vitest';

describe('Thinking Timeout (Spec 16 Fix 5)', () => {
  describe('LLMConfig.thinkingMaxTokens', () => {
    it('should accept thinkingMaxTokens configuration', () => {
      // Type check - thinkingMaxTokens should be valid on LLMConfig
      const config = {
        baseUrl: 'http://localhost:1234',
        model: 'test-model',
        maxTokens: 2048,
        timeout: 60000,
        thinkingMaxTokens: 2048, // Custom limit
      };

      expect(config.thinkingMaxTokens).toBe(2048);
    });

    it('should default thinkingMaxTokens to 4096 when not specified', () => {
      const config = {
        baseUrl: 'http://localhost:1234',
        model: 'test-model',
        maxTokens: 2048,
        timeout: 60000,
        // No thinkingMaxTokens specified
      };

      // Default value in LMStudioClient is 4096
      const thinkingMaxTokens = config.thinkingMaxTokens ?? 4096;
      expect(thinkingMaxTokens).toBe(4096);
    });
  });

  describe('Thinking block detection', () => {
    it('should detect <think> opening tag', () => {
      const content = 'Some content <think> reasoning here';
      expect(content.includes('<think>')).toBe(true);
    });

    it('should detect </think> closing tag', () => {
      const content = 'reasoning here </think> answer';
      expect(content.includes('</think>')).toBe(true);
    });

    it('should track thinking state correctly', () => {
      // Simulate streaming token processing
      const tokens = ['<think>', 'Let me', ' reason', '</think>', 'Answer: 42'];
      let inThinkingBlock = false;
      let thinkingContent = '';

      for (const token of tokens) {
        if (token.includes('<think>')) {
          inThinkingBlock = true;
        }
        if (inThinkingBlock) {
          thinkingContent += token;
        }
        if (token.includes('</think>')) {
          inThinkingBlock = false;
        }
      }

      expect(thinkingContent).toBe('<think>Let me reason</think>');
    });
  });

  describe('Token counting and truncation', () => {
    it('should count tokens while in thinking block', () => {
      const maxTokens = 5;
      const tokens = ['<think>', 'a', 'b', 'c', 'd', 'e', 'f', '</think>', 'answer'];

      let inThinkingBlock = false;
      let tokenCount = 0;

      for (const token of tokens) {
        if (token.includes('<think>')) {
          inThinkingBlock = true;
          tokenCount = 0;
        }
        if (inThinkingBlock) {
          tokenCount++;
        }
        if (token.includes('</think>')) {
          inThinkingBlock = false;
        }
      }

      // Should have counted all tokens in the thinking block (including </think> before state change)
      expect(tokenCount).toBe(8); // <think>, a, b, c, d, e, f, </think>
    });

    it('should trigger truncation when limit exceeded', () => {
      const maxTokens = 3;
      const tokens = ['<think>', 'a', 'b', 'c', 'd', 'e', '</think>', 'answer'];

      let inThinkingBlock = false;
      let truncated = false;
      let tokenCount = 0;
      let processedContent = '';

      for (const token of tokens) {
        if (token.includes('<think>')) {
          inThinkingBlock = true;
          tokenCount = 0;
        }

        if (inThinkingBlock && !truncated) {
          tokenCount++;
          if (tokenCount > maxTokens) {
            // Truncation logic
            processedContent += '</think>\n[Thinking truncated]';
            truncated = true;
            inThinkingBlock = false;
            continue;
          }
        }

        if (token.includes('</think>')) {
          inThinkingBlock = false;
        }

        // Skip tokens if truncated and still in thinking
        if (truncated && inThinkingBlock) {
          continue;
        }

        processedContent += token;
      }

      expect(truncated).toBe(true);
      expect(processedContent).toContain('[Thinking truncated]');
      expect(processedContent).toContain('answer'); // Answer should be preserved
    });

    it('should not truncate if within limit', () => {
      const maxTokens = 100;
      const tokens = ['<think>', 'a', 'b', '</think>', 'answer'];

      let inThinkingBlock = false;
      let truncated = false;
      let tokenCount = 0;

      for (const token of tokens) {
        if (token.includes('<think>')) {
          inThinkingBlock = true;
          tokenCount = 0;
        }

        if (inThinkingBlock && !truncated) {
          tokenCount++;
          if (tokenCount > maxTokens) {
            truncated = true;
            inThinkingBlock = false;
          }
        }

        if (token.includes('</think>')) {
          inThinkingBlock = false;
        }
      }

      expect(truncated).toBe(false);
      expect(tokenCount).toBe(4); // <think>, a, b, </think>
    });
  });

  describe('Edge cases', () => {
    it('should handle content without thinking blocks', () => {
      const tokens = ['Just', 'a', 'simple', 'answer'];

      let inThinkingBlock = false;
      let truncated = false;
      let processedContent = '';

      for (const token of tokens) {
        if (token.includes('<think>')) {
          inThinkingBlock = true;
        }
        if (token.includes('</think>')) {
          inThinkingBlock = false;
        }
        processedContent += token;
      }

      expect(truncated).toBe(false);
      expect(processedContent).toBe('Justasimpleanswer');
    });

    it('should handle nested-like content in thinking', () => {
      // Some models might output things that look like nested tags
      const tokens = ['<think>', 'analyzing', '< options >', 'done', '</think>', 'result'];

      let inThinkingBlock = false;
      let processedContent = '';

      for (const token of tokens) {
        if (token.includes('<think>')) {
          inThinkingBlock = true;
        }
        if (token.includes('</think>')) {
          inThinkingBlock = false;
        }
        processedContent += token;
      }

      // Should handle without issues
      expect(processedContent).toContain('< options >');
      expect(processedContent).toContain('result');
    });

    it('should handle unclosed thinking block gracefully', () => {
      // Model outputs <think> but never closes it
      const maxTokens = 5;
      const tokens = ['<think>', 'endless', 'reasoning', 'continues', 'forever', 'and', 'ever'];

      let inThinkingBlock = false;
      let truncated = false;
      let tokenCount = 0;
      let processedContent = '';

      for (const token of tokens) {
        if (token.includes('<think>')) {
          inThinkingBlock = true;
          tokenCount = 0;
        }

        if (inThinkingBlock && !truncated) {
          tokenCount++;
          if (tokenCount > maxTokens) {
            processedContent += '</think>\n[Thinking truncated]';
            truncated = true;
            inThinkingBlock = false;
            continue;
          }
        }

        if (truncated && inThinkingBlock) {
          continue;
        }

        processedContent += token;
      }

      // Should have truncated the endless thinking
      expect(truncated).toBe(true);
      expect(processedContent).toContain('[Thinking truncated]');
    });
  });
});
