# ADR-014: AISP Prompt Completeness

**Date:** 2026-01-16
**Status:** accepted
**Decision Makers:** Chris, Claude

## Context

In the context of `--aisp-full` mode for LLM communication,
facing the issue that 3 LLM contexts still use English prompts causing AISP validation failures:
- `fewshot-selection`: Bronze prompt (δ=0.270), Reject response (δ=0.000)
- `hierarchy-build`: Bronze prompt (δ=0.270), Reject response (δ=0.090)
- `pattern-categorization`: Platinum prompt (δ=0.920), Reject response (δ=0.000)

Analysis of `gpt-oss-120b_aisp-full_llmclusterv2_20260116_3` revealed only 66% AISP compliance (8/12 validations passed Silver+).

## Decision

We decided for:
1. Adding AISP-formatted prompts for all remaining contexts:
   - `buildAISPFewShotSelectionPrompt()` with `⟦Σ:Input⟧`, `⟦Ω:Task⟧`, `⟦Ε:Output⟧` blocks
   - `buildAISPHierarchyPrompt()` with `⟦Θ:Hierarchy⟧` output structure
2. Fixing `pattern-categorization` response format to use AISP notation (`exp[n]→P{m}`)
3. Using consistent block structure conventions:
   - `⟦Σ:Input⟧` for input data
   - `⟦Ω:Task⟧` for task definition
   - `⟦Ε:Output⟧` for expected response format
   - `⟦Θ:Hierarchy⟧` for hierarchical outputs
   - `⟦Χ:Selection⟧` for selection outputs
4. Implementing fallback parsing (try AISP first, then English)
5. Following the conditional selection pattern established in LLMClusterV2

And neglected:
1. Disabling AISP validation for these contexts (violates spec)
2. Creating separate validation tiers for different contexts (inconsistent)
3. Making AISP prompts the only option (breaks backwards compatibility)

## Consequences

To achieve:
- 100% AISP compliance (all contexts Silver+ tier) when `--aisp-full` is enabled
- Consistent AISP block structure across all prompts
- Reuse of existing helper methods (`extractAISPField`, `sanitizeForAISP`)
- Robust fallback behavior when LLM produces non-AISP output

Accepting that:
- Additional code complexity (dual prompt/parser maintenance)
- Slightly larger prompt sizes due to AISP structure
- Need for AISP-specific parser methods alongside existing English parsers

## WH(Y) Format Summary

> "In the context of `--aisp-full` mode with 3 contexts still using English prompts, facing AISP validation failures (Reject tier), we decided for adding AISP-formatted prompts for all contexts with consistent block structure and fallback parsing, and neglected disabling validation, to achieve 100% AISP compliance (Silver+ tier), accepting that dual prompt/parser maintenance is required."

---

## Implementation Notes

### Files Modified
- `src/llm/DreamingConsolidator.ts` - Add 6 new methods (AISP prompts and parsers)
- `src/llm/clustering/LLMClusterV2.ts` - Fix categorization output format
- `docs/specs/16-aisp-mode-spec.md` - Add Section 4.12

### AISP Block Reference
| Block | Purpose | Example |
|-------|---------|---------|
| `⟦Σ:Input⟧` | Input data | `candidates≔⟨s[0]≔{...}⟩` |
| `⟦Ω:Task⟧` | Task definition | `task≜select(3,strategies)` |
| `⟦Ε:Output⟧` | Output format | `format≔⟦Χ:Selection⟧{idx≔n}` |
| `⟦Θ:Hierarchy⟧` | Hierarchy output | `L0≔⟨item₁;item₂⟩` |
| `⟦Χ:Selection⟧` | Selection output | `idx≔0,why≔"..."` |

### Verification
```bash
machine-dream llm dream run --profile gpt-oss-120b --aisp-full --algorithm llmclusterv2 --debug 2>&1 | grep -E "AISP \["
```
Expected: All contexts achieve Silver+ tier (no Reject responses).
