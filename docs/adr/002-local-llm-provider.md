# ADR-002: Local LLM Provider (LM Studio)

**Date:** 2026-01-12
**Status:** accepted
**Decision Makers:** Project Team
**Master ADR:** ADR-000

## Context

In the context of running many LLM inference calls for training and experimentation,
facing the choice between cloud APIs (OpenAI, Anthropic, OpenRouter) and local inference,

## Decision

We decided for LM Studio as the primary LLM provider with OpenAI-compatible API,
and neglected cloud-first approaches and Ollama integration,

## Consequences

To achieve unlimited experimentation without API costs, faster iteration cycles, and full control over model selection,
accepting that users must download and run LM Studio, initial setup is more complex, and hardware requirements are higher.

## WH(Y) Summary

> "In the context of running many LLM calls for training, facing the choice between cloud and local, we decided for LM Studio, and neglected cloud APIs, to achieve unlimited experimentation without costs, accepting that setup is more complex."

---

## Rationale

1. **Cost**: Training runs may require hundreds of LLM calls; cloud APIs would be prohibitively expensive
2. **Speed**: Local inference avoids network latency and rate limits
3. **Control**: Full control over model selection, quantization, and parameters
4. **Privacy**: All data stays local
5. **Compatibility**: LM Studio's OpenAI-compatible API enables easy migration if needed

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| OpenAI API | Best models, simple setup | Expensive for training, rate limits |
| Anthropic API | Strong reasoning | Even more expensive |
| Ollama | Simpler setup | Less model variety, no streaming reasoning |
| LM Studio | Full control, free | Higher setup complexity |

## Dependencies

| Type | ADR | Description |
|------|-----|-------------|
| Part Of | ADR-000 | Technology choice |
| Supports | ADR-001 | Enables pure LLM approach |
| Relates To | ADR-003 | Experiences stored in memory |

## Spec References

| Spec | Section | Relationship |
|------|---------|--------------|
| [Spec 11: LLM Sudoku Player](../specs/11-llm-sudoku-player.md) | LMStudioClient | LM Studio integration |
| [Spec 13: LLM Profile Management](../specs/13-llm-profile-management.md) | Full spec | Profile management |

## Definition of Done

- [x] Evidence gathered
- [x] Agreement reached
- [x] Documentation complete
- [x] Review completed
- [x] Dependencies mapped
- [x] References linked
- [x] Master ADR updated

## Revision History

| Date | Change | Author |
|------|--------|--------|
| 2026-01-12 | Added dependencies and Master ADR | Project Team |
| 2026-01-12 | Initial version | Project Team |
