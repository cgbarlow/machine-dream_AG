# ADR-010: Immutable Puzzle Engine Foundation

**Date:** 2026-01-12
**Status:** accepted
**Decision Makers:** Project Team
**Master ADR:** ADR-000

## Context

In the context of building the foundational puzzle manipulation layer,
facing the choice between mutable state with in-place updates or immutable data structures,

## Decision

We decided for immutable puzzle state where all operations return new grid instances,
and neglected mutable in-place grid modifications,

## Consequences

To achieve reproducibility, debugging simplicity, safe concurrency, and clear state history,
accepting higher memory allocation and requiring functional programming patterns.

## WH(Y) Summary

> "In the context of puzzle state management, facing mutability vs immutability trade-offs, we decided for immutable operations returning new grids, and neglected in-place mutation, to achieve reproducibility and safe concurrency, accepting higher memory usage."

---

## Rationale

1. **Reproducibility**: Any state can be recreated from initial grid + move sequence
2. **Debugging**: State at any point can be inspected without time-travel
3. **Concurrency**: No race conditions on grid access
4. **Undo/Redo**: Natural support for backtracking
5. **Testing**: Pure functions are easier to test
6. **History Tracking**: Each move creates a new state, history is explicit

## Design Principles

### Immutability
```typescript
// All operations return new grids
function setCell(grid: number[][], row: number, col: number, value: number): number[][] {
  const newGrid = grid.map(r => [...r]);
  newGrid[row][col] = value;
  return newGrid;
}
```

### Pure Functions
- Zero side effects in puzzle engine
- No dependency on AI/LLM components
- All validation is deterministic

### 2D Array Representation
```typescript
// Favors readability over memory efficiency
type Grid = number[][];  // grid[row][col]
```

## Variant Support

| Grid Size | Box Size | Cells | Candidates |
|-----------|----------|-------|------------|
| 9×9 | 3×3 | 81 | 1-9 |
| 16×16 | 4×4 | 256 | 1-16 (hex display) |

## Dependencies

| Type | ADR | Description |
|------|-----|-------------|
| Part Of | ADR-000 | Foundation component |
| Required By | ADR-006 | GRASP loop needs puzzle ops |
| Required By | ADR-008 | Dreaming needs puzzle state |

## Spec References

| Spec | Section | Relationship |
|------|---------|--------------|
| [Spec 01: Puzzle Engine](../specs/01-puzzle-engine-spec.md) | Full spec | Primary specification |
| [Spec 12: Puzzle Generation](../specs/12-randomized-puzzle-generation.md) | Full spec | Generation uses puzzle engine |

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
| 2026-01-12 | Initial version | Project Team |
