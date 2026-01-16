# ADR-015: AISP Response Parsing Robustness

**Date:** 2026-01-16
**Status:** accepted
**Decision Makers:** Chris, Claude

## Context

In the context of AISP-mode categorization in LLMClusterV2,
facing the issue that 100% of experiences go to "uncategorized" despite Gold-tier AISP validation:

- Prompt uses `P{n}` placeholder notation showing expected format
- LLM interprets `{n}` literally and outputs `P{1}` with curly braces
- Parser regex `/P(\d+)/` expects `P1` without braces → fails to match
- Fallback to `parseInt()` fails → all experiences uncategorized

**Evidence from logs:**
- `dream_aisp-full_20260116_13.log`: pattern-categorization response Gold (δ=0.600)
- But "Final clusters: 1" with all 36 experiences in "uncategorized"
- Strategy created: single "Uncategorized" with 36 experiences

## Decision

We decided for:

1. **Tolerant regex**: Update to `/P\{?(\d+)\}?/i` to accept both `P1` and `P{1}`
   - Optional curly brace before number: `\{?`
   - Optional curly brace after number: `\}?`
   - Case-insensitive: `/i`

2. **Concrete examples in prompts**: Replace placeholder notation with actual examples
   - Before: `exp[0]→P{n}` (ambiguous)
   - After: `exp[0]→P1` then `exp[1]→P3` (concrete)

3. **Debug logging**: Add structured logging for parsing stages when debug mode enabled
   - Response preview (first 5 lines)
   - Parsing summary (AISP/fallback/uncategorized counts)
   - Validation warnings at thresholds

4. **Validation checks**: Warn when >50% uncategorized, log full response when >80%

And neglected:

1. **Strict format enforcement** - Would break with LLM output variations
2. **Retry with different prompt** - Adds latency for marginal benefit
3. **Embedding-based fallback** - Too complex for this specific issue
4. **Custom LLM fine-tuning** - Out of scope

## Consequences

To achieve:
- Robust parsing of both `P1` and `P{1}` formats
- Clear debugging output when parsing fails
- Early warning for categorization issues
- Categorized experiences: 0% → 80%+ expected

Accepting that:
- Regex is slightly more permissive (could match malformed input)
- Debug output adds to log volume when `--debug` enabled
- Dual prompt maintenance (AISP + English) continues

## WH(Y) Format Summary

> "In the context of AISP-mode categorization with 100% uncategorized experiences, facing a parser/prompt mismatch where LLM outputs `P{1}` but regex expects `P1`, we decided for a tolerant regex, concrete prompt examples, and structured debug logging, and neglected strict format enforcement and retry logic, to achieve robust parsing of LLM responses, accepting that the regex is slightly more permissive and debug output adds to log volume."

---

## Implementation Notes

### Files Modified
- `src/llm/clustering/LLMClusterV2.ts` - Fix regex, update prompts, add debug logging
- `docs/specs/16-aisp-mode-spec.md` - Add Section 4.13

### Regex Change
```typescript
// Before (broken)
const aispMatch = line.match(/(?:exp\[\d+\]→)?P(\d+)/i);

// After (handles curly braces)
const aispMatch = line.match(/(?:exp\[\d+\]→)?P\{?(\d+)\}?/i);
```

### Prompt Change
```aisp
;; Before (ambiguous placeholder)
format≔⟨exp[0]→P{n}⟩

;; After (concrete examples)
format≔⟨
  exp[0]→P1
  exp[1]→P3
  exp[2]→P2
⟩
```

### Verification
```bash
npm test -- tests/unit/llm/aisp-categorization-parsing.test.ts
npx machine-dream llm dream run --aisp-full --algorithm llmclusterv2 --debug
```
