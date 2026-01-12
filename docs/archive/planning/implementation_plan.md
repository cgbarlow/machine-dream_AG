# Machine Dream Implementation Master Plan

## Goal Description
Build the "Machine Dream" Continuous Machine Thinking system, a research Proof-of-Concept that utilizes `agentdb` for persistent memory and the GRASP loop for cognitive processing. This implementation follows the "All-in on AgentDB" strategy.

## User Review Required
> [!IMPORTANT]
> This is the Master Plan governing the entire POC development. It is divided into 4 phases aligned with the Research Specs.

## Phased Implementation Roadmap

### Phase 1: Foundation (Memory & Engine)
**Goal**: Establish the persistent memory layer and the core puzzle logic.
-   **Specs**: `02-memory-system-spec.md`, `08-agentdb-integration-spec.md`, `01-puzzle-engine-spec.md`
-   **Key Components**:
    -   `AgentDBMemory`: Wrapper for `ReasoningBank`, `ReflexionMemory`, `SkillLibrary`.
    -   `PuzzleBoard`: Grid representation, constraints, immutable state updates.
    -   `SudokuRules`: Validation logic.
-   **Verification**:
    -   Store/Retrieve pattern from AgentDB.
    -   Load a Sudoku puzzle, make valid/invalid moves.

### Phase 2: Cognition (GRASP & Attention)
**Goal**: Implement the "Day Cycle" - the active thinking loop.
-   **Specs**: `03-grasp-loop-spec.md`, `04-attention-mechanism-spec.md`
-   **Key Components**:
    -   `AttentionManager`: Calculate cell importance (entropy, connectivity).
    -   `GRASPController`: Orchestrate Generate -> Review -> Absorb -> Synthesize -> Persist.
    -   `StrategyRegistry`: Implementation of solving strategies (Naked Singles, etc.).
-   **Verification**:
    -   Run GRASP loop on "Easy" puzzle.
    -   Verify logs in AgentDB.

### Phase 3: Consolidation (Dreaming)
**Goal**: Implement the "Night Cycle" - background knowledge processing.
-   **Specs**: `05-dreaming-pipeline-spec.md`
-   **Key Components**:
    -   `DreamingPipeline`: 5-phase orchestration.
    -   `PatternDistiller`: Extract patterns from raw logs.
    -   `AbstractionBuilder`: Create hierarchy (Ladder).
-   **Verification**:
    -   Run Dreaming Pipeline on collected session logs.
    -   Verify abstraction ladder creation.

### Phase 4: Integration & Verification
**Goal**: Connect all systems and benchmark.
-   **Specs**: `07-integration-orchestration-spec.md`, `06-benchmarking-framework-spec.md`
-   **Key Components**:
    -   `Orchestrator`: Manage Day/Night cycles.
    -   `BenchmarkSuite`: Run standard datasets (SWE-bench equivalent for Sudoku).
-   **Verification**:
    -   Full end-to-end solve of "Hard" puzzles.
    -   Performance metrics report.

## Immediate Next Step
Start **Phase 1: Foundation**.
1.  Initialize `src/memory/AgentMemory.ts`.
2.  Implement `src/engine/PuzzleBoard.ts`.
