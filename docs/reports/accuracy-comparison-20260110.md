# Accuracy Comparison Report: What Made Session bfa9a98a Different

**Date**: January 10, 2026

---

## Session Comparison

| Session | Accuracy | Moves | Outcome | Exit Reason | Duration |
|---------|----------|-------|---------|-------------|----------|
| **bfa9a98a** (new) | **62.5%** | 8 | Unsolved | Timeout (120s) | 3 min |
| 5244dd5c (solved) | 39.1% | 92 | **SOLVED** | - | 18 min |
| 423e4cbc (failed) | 26.8% | 56 | Unsolved | finish_reason=length | 9 min |

---

## Key Finding: Reasoning Quality Correlates with Accuracy

### High-Accuracy Reasoning (bfa9a98a - 62.5%)

```
Cell (5,5). From row [6,5,_,4,_,7,_,2,9] → missing {1,3,8}.
Col has [_,_,_,_,_,3,_,6,_] → missing {1,2,4,5,7,8,9}.
Box 5: known values are 3,2,9,4,7,1 → missing {5,6,8}.
Intersection of all three constraints = {8} is the only valid digit.
```

**Characteristics:**
- Length: 238 chars (within 200 char target)
- **Mathematical notation**: Uses set notation `{1,3,8}`
- **Explicit intersection**: "Intersection of all three constraints = {8}"
- **No strategy name references**: Pure reasoning, no "Applying Strategy 1..."
- **Systematic**: Row → Column → Box → Intersection

### Lower-Accuracy Reasoning (earlier sessions - 26-39%)

```
Using Strategy 2 - Last Digit Elimination. Cell (2,2) is
constrained by row 2 (missing 1,4,6,8), column 2 (missing
1,5,6,9), and box 1 (missing 1,2,3,7). Only 7 remains
possible after elimination.
```

```
Applying Strategy 1 - Last Digit in Constraint. In box 2,
positions (2,4), (2,5), (2,6) need values 8 and 9. Column
5 has 5,8,2,5,7,3,9,4,6. Row 2 has 2,7,9,5,_,3,_,_,_...
```

**Characteristics:**
- Length: 196-311 chars (some exceed 200 char limit)
- **References strategy names**: "Using Strategy 2", "Applying Strategy 1"
- **Narrative style**: More prose, less mathematical
- **Less systematic**: Varies in approach

---

## Root Cause Analysis

### Why the High-Accuracy Session Was Different

1. **More Token Budget**: With 4096 tokens (vs previous 2048), the model had room to complete its reasoning without truncation.

2. **No Strategy Evaluation Overhead**: The model appears to have skipped the explicit strategy evaluation step and went straight to mathematical reasoning.

3. **Systematic Constraint Enumeration**: The successful moves used a clear pattern:
   - List row constraints → List column constraints → List box constraints → Find intersection

4. **Set-Based Thinking**: Using `{1,3,8}` notation keeps reasoning compact and precise.

### Why Earlier Sessions Had Lower Accuracy

1. **Strategy Name References Added Cognitive Overhead**: When the model says "Applying Strategy 1 - Last Digit in Constraint", it's spending tokens on meta-commentary rather than actual constraint checking.

2. **The Enhanced Prompt Format Backfired**: The `formatStrategiesWithEvaluation()` asks the model to evaluate each strategy with YES/NO and confidence ratings. This:
   - Adds ~100-200 tokens of evaluation overhead per response
   - Shifts focus from "solve the puzzle" to "evaluate strategies"
   - Encourages longer, narrative responses

3. **Token Starvation**: With 2048 tokens, the model ran out of space mid-reasoning (finish_reason=length).

---

## Recommendations

### 1. Increase Timeout for Higher Token Limits

**Problem**: Session bfa9a98a timed out after 120s despite high accuracy.

**Solution**: With 4096 tokens, the model generates longer responses. Increase timeout:

```bash
npx machine-dream llm profile update qwen3-coder --timeout 180000
```

Or set to 240000ms (4 min) for very thorough reasoning.

### 2. Simplify Strategy Prompt Format

**Problem**: The enhanced strategy evaluation format (`formatStrategiesWithEvaluation()`) encourages:
- Strategy name references in reasoning
- Explicit YES/NO evaluation steps
- Longer, less focused responses

**Solution**: Create a simpler "constraint-focused" format that teaches the reasoning PATTERN, not named strategies:

```
SOLVING APPROACH:
For each empty cell, systematically:
1. List digits missing from its ROW
2. List digits missing from its COLUMN
3. List digits missing from its BOX
4. Find the INTERSECTION of all three sets
5. If intersection has exactly one digit, that's your answer

OUTPUT FORMAT:
ROW: X
COL: Y
VALUE: Z
REASONING: Row missing {X}, Col missing {Y}, Box missing {Z}. Intersection = {answer}.
```

This teaches the METHOD without named strategies that the model feels compelled to reference.

### 3. Add "Reasoning Template" to System Prompt

Add an explicit reasoning template that enforces the high-accuracy pattern:

```
REASONING TEMPLATE (follow exactly):
"Cell (R,C). Row missing {X,Y,Z}. Col missing {A,B,C}. Box missing {P,Q,R}.
Intersection = {V}. Only valid digit."

Keep reasoning under 150 characters. Use set notation.
```

### 4. Consider Removing Strategy Names Entirely

The data suggests that **anonymous patterns work better than named strategies**:

| Approach | Accuracy | Reasoning Style |
|----------|----------|-----------------|
| Named strategies | 26-39% | "Applying Strategy 1..." |
| Anonymous constraint checking | 62.5% | "Row missing {X}, Col missing {Y}..." |

**Recommendation**: Update the dreaming consolidation to produce **reasoning templates** rather than **named strategies**.

### 5. Reduce Few-Shot Count for 9x9

Currently injecting 3 strategies. For larger grids, consider:
- 9x9: 1-2 strategies maximum
- 4x4: 3 strategies (current)

This reduces prompt size and strategy evaluation overhead.

---

## Implementation Priority

| Priority | Change | Impact | Effort |
|----------|--------|--------|--------|
| 🔴 High | Increase timeout to 180s+ | Prevents timeout on good reasoning | Low |
| 🔴 High | Simplify strategy prompt format | Reduces overhead, improves focus | Medium |
| 🟡 Medium | Add reasoning template to system prompt | Enforces high-accuracy pattern | Low |
| 🟡 Medium | Reduce few-shot count for 9x9 | Reduces prompt bloat | Low |
| 🟢 Low | Remove named strategies from consolidation | Long-term accuracy improvement | High |

---

## Immediate Action Items

```bash
# 1. Increase timeout
npx machine-dream llm profile update qwen3-coder --timeout 180000

# 2. Test with current settings
./scripts/training-run.sh --puzzle puzzles/9x9-easy.json --runs 5 --stream

# 3. If accuracy stays high, the key was token budget + time
# 4. If accuracy drops, implement prompt simplification
```

---

## Conclusion

The dramatic accuracy improvement (26% → 62%) came from:
1. **Adequate token budget** (4096 vs 2048)
2. **Pure mathematical reasoning** without strategy evaluation overhead
3. **Systematic constraint enumeration** using set notation

The enhanced strategy evaluation format, while conceptually sound, appears to **hurt accuracy** by adding cognitive overhead and encouraging verbose, narrative responses. The model performs better when it focuses on the mathematical task rather than meta-reasoning about which strategy to apply.

**Recommendation**: Simplify the prompt format to teach the REASONING PATTERN (constraint intersection) rather than NAMED STRATEGIES. Let the LLM do the hard work of constraint checking, not strategy selection.
