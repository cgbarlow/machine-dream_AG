# Performance Analysis Report: 9x9-Easy Degradation

**Date**: January 10, 2026
**Profile**: qwen3-coder
**Model**: qwen3-coder-30b-a3b-instruct via LM Studio

---

## Executive Summary

Performance on 9x9-easy puzzles has significantly degraded. The afternoon training runs (4:47-5:20 PM) show **0/9 solved** with all sessions terminating due to `llm_error: finish_reason=length`. This is a **critical regression** caused by the LLM response being truncated before completing the move output.

**Root Cause**: The `maxTokens: 2048` limit is insufficient for 9x9 puzzles when using the enhanced strategy evaluation prompt format with 3 learned strategies.

---

## Historical Comparison

| Test Run | Date/Time | Puzzle | Solve Rate | Primary Exit Reason |
|----------|-----------|--------|------------|---------------------|
| 4x4-expert A/B | Jan 9, 11:40 PM | 4x4-expert | 10/10 (both) | SOLVED |
| 9x9-easy A/B | Jan 10, 8:12 AM | 9x9-easy | 1/10 baseline, 1/10 learning | max_moves, stuck |
| 9x9-easy Training | Jan 10, 4:47-5:20 PM | 9x9-easy | **0/9** | llm_error: finish_reason=length |

### Performance Degradation Timeline

```
Jan 9 11:40 PM  │  4x4-expert  │  100% solve rate (no token issues)
       ↓
Jan 10 8:12 AM  │  9x9-easy    │  10% solve rate (max_moves/stuck exits)
       ↓
Jan 10 4:47 PM  │  9x9-easy    │  0% solve rate (all token length errors)
```

---

## Detailed Session Analysis (Jan 10 Afternoon)

All 9 training run sessions failed identically:

| Session ID | Moves | Correct | Accuracy | Exit Reason |
|------------|-------|---------|----------|-------------|
| 8ebfb4f1 | 15 | 3 | 20.0% | llm_error: finish_reason=length |
| 99e9663a | 11 | 5 | 45.5% | llm_error: finish_reason=length |
| 17eadfd0 | 7 | 2 | 28.6% | llm_error: finish_reason=length |
| 5f900f80 | 17 | 5 | 29.4% | llm_error: finish_reason=length |
| 423e4cbc | 56 | 15 | 26.8% | llm_error: finish_reason=length |
| 889375ec | 19 | 4 | 21.1% | llm_error: finish_reason=length |
| 80ee7aab | 1 | 0 | 0.0% | llm_error: finish_reason=length |
| 8da501d9 | 15 | 5 | 33.3% | llm_error: finish_reason=length |
| fb4d945d | 13 | 4 | 30.8% | llm_error: finish_reason=length |

**Key Observation**: Some sessions made 56+ moves before failing, indicating the token limit problem is intermittent based on prompt length variations (move history accumulates).

---

## Root Cause Analysis

### 1. Token Budget Exhaustion

**Profile Settings**:
```
Max Tokens: 2048
Temperature: 0.7
```

**What the prompt contains for 9x9 with learning**:
1. System prompt (~400 tokens): Rules, notation, output format, reasoning constraints
2. Puzzle state (~150 tokens): 9 rows of grid data
3. **Enhanced strategies (~600-800 tokens)**: 3 strategies with multi-line reasoning steps PLUS evaluation instructions
4. Move history (variable): Grows with each move, ~30 tokens per move
5. Forbidden moves (variable): Grows with wrong moves

**Estimated total prompt tokens**: 1200-1500+ tokens

**Available for response**: 500-850 tokens

**What the model tries to output**:
```
// With enhanced evaluation format, model must evaluate EACH strategy:
Strategy 1: "Last Digit in Constraint" - Does this apply? YES/NO, Confidence: X/10
Strategy 2: "Last Digit Elimination" - Does this apply? YES/NO, Confidence: X/10
Strategy 3: "Intersection Consistency Check" - Does this apply? YES/NO, Confidence: X/10

Then reasoning and move...

ROW: X
COL: Y
VALUE: Z
REASONING: ...
```

This evaluation pattern encourages verbose responses that exceed the token limit.

### 2. The Enhanced Prompt Format Problem

The `formatStrategiesWithEvaluation()` method (PromptBuilder.ts:212-248) adds:

```
LEARNED STRATEGIES - EVALUATE EACH BEFORE MOVING:

Strategy 1: "Last Digit in Constraint"
Situation: When a row, column, or box has only one empty cell...
Steps:
  1. Identify a constraint (row, column, or box) that is nearly complete...
  2. Check which digits from 1-9 are missing in that constraint...
  3. For each missing digit, determine if it has only one possible location...
  4. If exactly one empty cell remains as the valid placement...

[+ 2 more strategies with similar detail]

Before moving, for EACH strategy above:
1. Does this situation match the current board? (YES/NO)
2. If YES, what is your confidence (1-10)?

Use the highest-confidence applicable strategy (7+).
If none apply confidently, use your own reasoning.
```

This adds ~600-800 tokens AND encourages the model to output evaluation text before the move.

### 3. Contrast with 4x4 Success

4x4 puzzles work because:
- Smaller grid = fewer tokens (~60 vs ~150)
- Simpler strategies needed
- Shorter move history typically
- Combined prompt + response fits within 2048 easily

### 4. Why Morning Runs Didn't Show This

The morning A/B test (8:12 AM) had different exit reasons (max_moves, stuck) not llm_error. This suggests:
- Fewer accumulated experiences at that point
- Possibly fewer/simpler strategies being injected
- The enhanced prompt format may have been slightly different

---

## Contributing Factors

### Primary (Critical)
1. **maxTokens: 2048 is too low for 9x9 with enhanced prompts**

### Secondary
2. **Enhanced strategy format encourages verbose evaluation responses**
3. **3 strategies × multi-line reasoning = substantial prompt overhead**
4. **System prompt tells model to "keep reasoning under 200 characters" but the strategy evaluation instructions contradict this**

### Tertiary
5. **Move history grows, eating into response budget**
6. **Forbidden moves list grows, further reducing budget**

---

## Recommendations

### Immediate Fix (High Priority)

**Option A: Increase maxTokens to 4096**
```bash
npx machine-dream llm profile update qwen3-coder --max-tokens 4096
```
- Pros: Quick fix, allows complete responses
- Cons: Slower generation, higher memory usage

**Option B: Reduce strategy count for 9x9+**
Limit to 1-2 strategies instead of 3 for larger grids.

### Short-Term Improvements

1. **Conditional strategy format by grid size**:
   - 4x4: Use enhanced evaluation format (current)
   - 9x9+: Use compact strategy format (old `formatFewShots()`)

2. **Cap move history more aggressively**:
   - Current: 20 moves
   - For 9x9+: Reduce to 10 most recent

3. **Simplify strategy evaluation instructions**:
   ```
   // Instead of requiring YES/NO + confidence for EACH strategy:
   "Apply the most relevant strategy or use your own reasoning."
   ```

### Long-Term Improvements

1. **Dynamic token budget management**:
   - Calculate prompt token count before sending
   - Trim strategies/history if approaching limit
   - Warn when response space is constrained

2. **Grid-size-aware prompting**:
   - Different strategy counts by size
   - Different reasoning length limits by size

3. **Profile-specific max_tokens defaults**:
   - Small grids (4x4, 6x6): 2048
   - Medium grids (9x9): 4096
   - Large grids (16x16+): 8192

---

## Verification Commands

```bash
# Update profile to increase token limit
npx machine-dream llm profile update qwen3-coder --max-tokens 4096

# Run a test session to verify fix
npx machine-dream llm play puzzles/9x9-easy.json --profile qwen3-coder --visualize

# Or run training with updated profile
./scripts/training-run.sh --puzzle puzzles/9x9-easy.json --runs 5 --stream
```

---

## Conclusion

The 9x9-easy performance degradation is a direct result of **token budget exhaustion**. The enhanced strategy evaluation format, while conceptually sound for encouraging thoughtful application of learned strategies, generates prompts that leave insufficient space for the model's response when combined with 9x9 grid data.

**Immediate action**: Increase `maxTokens` to 4096 for the qwen3-coder profile.

**Follow-up**: Implement grid-size-aware prompting to use compact formats for larger puzzles.
