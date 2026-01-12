# Feature Plan: LLM Reasoning Token Capture

**Status**: Planned
**Created**: 2026-01-11
**Priority**: Medium

## Problem Statement

When using reasoning-capable models (e.g., gpt-oss-120b) via LM Studio, the model outputs detailed reasoning in a separate "analysis" channel that is not currently displayed in machine-dream. Users only see the final `REASONING:` field, missing the full chain-of-thought.

### Example: What LM Studio captures internally

```
<|channel|>analysis<|message|>We need to solve the Sudoku. Current grid after moves:

Rows given already filled fully except some blanks...

Let's list current board:
R1: 4 6 8 9 7 2 5 1 3
...

Check columns:
Col1: 4,2,1,7,6,8,5,3,_ -> missing numbers {9}. So R9C1 = 9.
...

<|end|><|start|>assistant<|channel|>final<|message|>ROW: 9
COL: 1
VALUE: 9
REASONING: Column 1 missing only {9}; fits row 9 without conflict.
```

### What machine-dream currently shows

```
ROW: 9
COL: 1
VALUE: 9
REASONING: Column 1 missing only {9}; fits row 9 without conflict.
```

## Solution

### 1. LM Studio Configuration (User Action)

Enable reasoning separation in LM Studio:

**LM Studio → App Settings → Developer** → Enable:
> "When applicable, separate reasoning_content and content in API responses"

### 2. API Response Fields

Once enabled, LM Studio exposes reasoning in separate fields:

| Mode | Field |
|------|-------|
| **Non-streaming** | `choices.message.reasoning` or `choices.message.reasoning_content` |
| **Streaming** | `choices.delta.reasoning` or `choices.delta.reasoning_content` |

### Version Notes

- **v0.3.9**: Added `reasoning_content` field (DeepSeek-style)
- **v0.3.26+**: For gpt-oss models, uses `reasoning` field (OpenAI o3-mini style)

## Implementation Plan

### File: `src/llm/LMStudioClient.ts`

Update `handleStreamingResponse()` to capture reasoning tokens:

```typescript
private async handleStreamingResponse(
  response: Response,
  onStream: (token: string) => void,
  signal: AbortSignal
): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let fullReasoning = '';  // NEW: Track reasoning separately
  let finishReason: string | null = null;

  try {
    while (true) {
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

            // NEW: Extract reasoning tokens (try both field names)
            const reasoning = delta?.reasoning || delta?.reasoning_content;
            if (reasoning) {
              fullReasoning += reasoning;
              onStream(reasoning);  // Stream reasoning to display
            }

            // Extract content tokens
            const token = delta?.content;
            if (token) {
              fullContent += token;
              onStream(token);
            }

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

  if (finishReason && finishReason !== 'stop') {
    throw new Error(`LLM response incomplete: finish_reason=${finishReason}`);
  }

  // Return combined content (reasoning + final answer)
  // Or return as structured object if needed
  return fullReasoning + fullContent;
}
```

### File: `src/llm/types.ts`

Optionally add reasoning to the response type:

```typescript
export interface LLMStreamResult {
  content: string;
  reasoning?: string;
}
```

### File: `src/cli/commands/llm.ts`

The streaming display already works via `process.stdout.write(token)` - no changes needed if we stream reasoning tokens through the same callback.

## Testing

1. Enable LM Studio Developer setting for reasoning separation
2. Run: `npx machine-dream llm play puzzles/9x9-easy.json --profile gpt-oss-120b --stream --debug`
3. Verify full reasoning appears before the ROW/COL/VALUE output

## Affected Models

| Model | Reasoning Style |
|-------|-----------------|
| gpt-oss-120b | Channel-based (`<\|channel\|>analysis`) |
| gpt-oss-20b | Channel-based |
| DeepSeek-R1 | `<think>...</think>` tags |
| QwQ-32B | Extended chain-of-thought in content |

## References

- [Ernest Chiang - Fixing LM Studio gpt-oss Reasoning Content](https://www.ernestchiang.com/en/posts/2025/lm-studio-separate-reasoning-content-in-api-responses/)
- [GitHub Issue #851 - GPT-OSS Thinking Content](https://github.com/lmstudio-ai/lmstudio-bug-tracker/issues/851)
- [LM Studio Blog v0.3.9](https://lmstudio.ai/blog/lmstudio-v0.3.9)
- [HuggingFace gpt-oss-20b Reasoning Guide](https://huggingface.co/openai/gpt-oss-20b/discussions/28)
- [LM Studio API Changelog](https://lmstudio.ai/docs/developer/api-changelog)
