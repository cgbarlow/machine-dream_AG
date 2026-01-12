# ADR-004: Specification-First Development

**Date:** 2026-01-12
**Status:** accepted
**Decision Makers:** Project Team
**Master ADR:** ADR-000

## Context

In the context of building a complex multi-component system with evolving requirements,
facing the risk of inconsistency between components and undocumented behavior,

## Decision

We decided for specification-first development where specs are updated before code,
and neglected code-first approaches with documentation as afterthought,

## Consequences

To achieve consistent behavior across components, living documentation, and clear contracts between subsystems,
accepting that development velocity may be slower initially and specs require maintenance.

## WH(Y) Summary

> "In the context of building a complex system, facing risks of inconsistency, we decided for spec-first development, and neglected code-first approaches, to achieve consistent behavior and living documentation, accepting that initial velocity is slower."

---

## Rationale

1. **Consistency**: All components follow defined contracts
2. **Traceability**: Every feature maps to a specification
3. **Review Quality**: Changes validated against specs
4. **Onboarding**: New contributors understand system through specs
5. **Integration**: Clear interfaces between subsystems

## Specification Documents

| Spec | Purpose |
|------|---------|
| 01-05 | Core system (puzzle engine, memory, GRASP, attention, dreaming) |
| 06-10 | Infrastructure (benchmarking, orchestration, AgentDB, CLI, TUI) |
| 11-16 | LLM integration (player, puzzles, profiles, menus, batch, AISP) |

## Workflow

1. **Before Implementation**: Update or create specification
2. **During Implementation**: Follow spec exactly
3. **Spec Conflicts**: Propose spec updates, get approval, then implement
4. **Post-Implementation**: Verify spec compliance

## Dependencies

| Type | ADR | Description |
|------|-----|-------------|
| Part Of | ADR-000 | Development process |
| Governs | All ADRs | All decisions follow spec-first |

## Spec References

| Spec | Section | Relationship |
|------|---------|--------------|
| [Spec 17: ADR Implementation](../specs/17-adr-implementation-spec.md) | Full spec | ADR implementation spec |
| [Spec 06: Benchmarking](../specs/06-benchmarking-framework-spec.md) | Full spec | Verification framework |
| [Spec 15: Batch Testing](../specs/15-batch-testing-spec.md) | Full spec | Testing automation |

## Definition of Done

- [x] Evidence gathered
- [x] Agreement reached
- [x] Documentation complete
- [x] Review completed
- [x] Dependencies mapped
- [x] References linked
- [x] Master ADR updated

## Related

- CLAUDE.md: Project configuration
- All spec files in `docs/specs/`

## Revision History

| Date | Change | Author |
|------|--------|--------|
| 2026-01-12 | Added dependencies and Master ADR | Project Team |
| 2026-01-12 | Initial version | Project Team |
