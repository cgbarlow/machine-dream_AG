# ADR-013: AISP Validator Integration

**Date:** 2026-01-16
**Status:** accepted
**Decision Makers:** Chris, Claude

## Context

In the context of AISP mode (`--aisp` and `--aisp-full`) for LLM communication,
facing the need to validate AISP compliance of all prompts and LLM responses,

## Decision

We decided for:
1. Integrating the `aisp-validator` npm package (v0.2.2) to validate AISP compliance
2. Creating `ValidatedLLMClient` wrapper that provides centralized validation for all LLM I/O
3. Implementing factory pattern (`LLMClientFactory`) to ensure all consumers use validated client
4. Implementing LLM self-critique workflow when AISP validation fails (tier ⊘, δ < 0.20)
5. Extending the `ClusteringAlgorithm` interface with `setAISPMode()` method
6. Creating new algorithm versions with AISP support:
   - FastClusterV3: AISP cluster naming
   - DeepClusterV2: AISP LLM prompts for semantic split
   - LLMClusterV2: Full AISP prompts
7. Storing `aispMode` in `PlaySession` for session-level tracking and display

And neglected:
1. Building custom AISP validation logic (reinventing the wheel)
2. Strict rejection without fallback (would break functionality if LLM fails AISP)
3. Adding validation inline to each call site (violates DRY)
4. Modifying `LMStudioClient` directly (breaks single responsibility)

## Consequences

To achieve:
- End-to-end AISP compliance when `--aisp-full` is used
- 100% AISP validation coverage when mode is enabled
- Quality metrics via density scoring (δ) and tier classification
- Actionable feedback on AISP non-compliance through LLM critique
- Consistent logging format across all LLM calls
- Session mode visibility via `llm session list` and `llm session show`
- Backward compatibility with existing learning units and workflows

Accepting that:
- Additional LLM calls are needed for critique on validation failures
- aisp-validator WASM initialization adds ~50ms startup overhead
- ~2-5ms overhead per validation call
- Fallback to English parsing reduces AISP purity when validation fails

## Implementation Details

### aisp-validator Integration

```typescript
import AISP from 'aisp-validator';

// Initialize WASM kernel on startup
await AISP.init();

// Validate AISP text
const result = AISP.validate(source);
// Returns: { valid, tier, tierValue, tierName, delta, pureDensity, ambiguity }

// Tiers:
// ◊⁺⁺ (Platinum): δ ≥ 0.75
// ◊⁺  (Gold):     δ ≥ 0.60
// ◊   (Silver):   δ ≥ 0.40
// ◊⁻  (Bronze):   δ ≥ 0.20
// ⊘   (Reject):   δ < 0.20
```

### ValidatedLLMClient Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Application Layer                            │
│  LLMSudokuPlayer  DreamingConsolidator  Clustering Algorithms   │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                    uses (via factory)
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ValidatedLLMClient                             │
│                                                                  │
│  1. IF aispMode != 'off' AND validatePrompt:                    │
│     - Validate prompt via AISPValidatorService                   │
│     - Log tier result (info/warn/error)                         │
│     - Emit 'llm:aisp:validation' event                          │
│                                                                  │
│  2. Call underlying LMStudioClient.chat()                       │
│                                                                  │
│  3. IF aispMode != 'off' AND validateResponse:                  │
│     - Validate response via AISPValidatorService                 │
│     - IF tier = Reject: request critique, log, continue         │
│     - Emit 'llm:aisp:validation' event                          │
│                                                                  │
│  4. Return result with validation metadata                       │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                         delegates to
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LMStudioClient                              │
│              (unchanged - handles HTTP, streaming)               │
└─────────────────────────────────────────────────────────────────┘
```

### AISP Mode Propagation

```
CLI (--aisp-full)
    ↓
LLMSudokuPlayer / DreamingConsolidator
    ↓
ValidatedLLMClient.setAISPMode('aisp-full')
    ↓
AISP prompts generated → validated → sent to LLM
    ↓
LLM response → validated → parsed (AISP or fallback)
```

### Validation Behavior by Mode

| Mode | Prompt Validation | Response Validation | On Reject (⊘) |
|------|------------------|---------------------|---------------|
| `off` | None | None | N/A |
| `aisp` | Yes (warn on low tier) | No | Log warning |
| `aisp-full` | Yes (warn on low tier) | Yes (critique) | Request critique, fallback |

### Tier-Based Logging

```typescript
// Platinum/Gold/Silver (info level)
console.log(`✓ AISP [${context}] ${tierName} (δ=${delta.toFixed(3)})`);

// Bronze (warn level)
console.warn(`⚠️ AISP [${context}] ${tierName} (δ=${delta.toFixed(3)})`);

// Reject (error level + critique workflow)
console.error(`❌ AISP [${context}] ${tierName} (δ=${delta.toFixed(3)})`);
```

### Factory Pattern

```typescript
// src/llm/LLMClientFactory.ts
export function createLLMClient(
  config: LLMConfig,
  aispMode: AISPMode = 'off'
): ValidatedLLMClient {
  const client = new ValidatedLLMClient(config);
  client.setAISPMode(aispMode);
  return client;
}
```

### Session Mode Display

```bash
# llm session list - Mode column
ID                                    Profile           Mode       Unit      Puzzle            Done%  Moves
abc123...                             gpt-oss-120b      aisp-full  default   9x9-easy.json     100%   36

# llm session show - Mode field
📊 Summary:
  Profile: gpt-oss-120b
  Mode: aisp-full
  Puzzle: 9x9-easy.json
```

## Related Specifications

- [Spec 16: AISP Mode Integration](../specs/16-aisp-mode-spec.md) - FR-05, Sections 4.8-4.11
- [Spec 11: LLM Sudoku Player](../specs/11-llm-sudoku-player.md) - PlaySession interface
- [Spec 18: Algorithm Versioning System](../specs/18-algorithm-versioning-system.md) - Sections 3.4-3.6

## WH(Y) Format Summary

> "In the context of AISP mode for all LLM communication, facing the need for consistent AISP validation, we decided for integrating aisp-validator with a centralized ValidatedLLMClient wrapper and factory pattern, and neglected inline validation or custom logic, to achieve end-to-end AISP compliance with quality metrics and consistent logging, accepting that WASM overhead and critique calls add latency."
