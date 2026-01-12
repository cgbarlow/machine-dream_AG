# Puzzle Engine Specification

**Component ID:** PE-001
**Version:** 1.0.0
**Date:** January 4, 2026
**Status:** Implementation Ready
**Dependencies:** None (Foundation Component)

---

## Related ADRs

| ADR | Relationship |
|-----|--------------|
| [ADR-010: Immutable Puzzle Engine](../adr/010-immutable-puzzle-engine.md) | Authorizes this spec |

---

## 1. Component Overview

### 1.1 Purpose and Responsibilities

The Puzzle Engine is the foundational component of the Machine Dream POC, responsible for:

1. **Grid Representation**: Managing 9×9 (standard) and 16×16 (variant) Sudoku grids
2. **Constraint Validation**: Enforcing row, column, and box uniqueness rules
3. **Candidate Management**: Tracking possible values for empty cells
4. **Puzzle I/O**: Loading, saving, and validating puzzle formats
5. **Solution Verification**: Determining puzzle completion and correctness
6. **Difficulty Assessment**: Supporting easy/medium/hard/expert difficulty levels

The Puzzle Engine provides a **pure, deterministic foundation** that other components (GRASP Loop, Attention Mechanism, Memory System) build upon. It has zero dependencies on AI/LLM components.

### 1.2 Position in Overall Architecture

```
┌─────────────────────────────────────────────────────┐
│              COGNITIVE PUZZLE SOLVER                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────┐     │
│  │        GRASP Loop (depends on PE)         │     │
│  └───────────────────────────────────────────┘     │
│                        ↓                            │
│  ┌───────────────────────────────────────────┐     │
│  │  ┌────────────────────────────────────┐   │     │
│  │  │     PUZZLE ENGINE (PE-001)         │   │     │  ← THIS COMPONENT
│  │  │                                    │   │     │
│  │  │  • Grid Management                 │   │     │
│  │  │  • Constraint Checking             │   │     │
│  │  │  • Candidate Sets                  │   │     │
│  │  │  • Puzzle I/O                      │   │     │
│  │  │  • Validation                      │   │     │
│  │  └────────────────────────────────────┘   │     │
│  └───────────────────────────────────────────┘     │
│                                                     │
│  ┌───────────────────────────────────────────┐     │
│  │    Memory System (uses PE types)          │     │
│  └───────────────────────────────────────────┘     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 1.3 Dependencies

**Upstream (None):**
The Puzzle Engine is a foundation component with no dependencies.

**Downstream (Components that depend on Puzzle Engine):**
- GRASP Loop (PE-002): Uses grid state, validation, candidate management
- Attention Mechanism (PE-004): Uses candidate sets, constraint analysis
- Memory System (PE-005): Stores puzzle states as experiences
- Benchmarking Framework (PE-006): Validates solutions, measures progress

---

## 2. Functional Requirements

### FR-2.1: Grid Representation

**FR-2.1.1: Standard 9×9 Grid Support**
- MUST support standard 9×9 Sudoku grids
- MUST represent empty cells as 0
- MUST represent filled cells as integers 1-9
- MUST store grids as 2D arrays (`number[][]`)
- MUST provide cell access via `(row, col)` indexing (0-indexed)

**FR-2.1.2: 16×16 Variant Grid Support**
- SHOULD support 16×16 Sudoku grids (for transfer learning tests)
- MUST represent filled cells as integers 1-16
- MUST adapt box constraints to 4×4 sub-grids
- MUST provide runtime grid size detection

**FR-2.1.3: Cell Addressing**
- MUST provide consistent `Cell` type: `{ row: number, col: number }`
- MUST validate cell coordinates are within grid bounds
- MUST support conversion between cell coordinates and string keys (`"row,col"`)

**Acceptance Criteria:**
```typescript
// Test 1: Grid creation
const grid = createGrid(9); // 9x9 with all zeros
expect(grid.length).toBe(9);
expect(grid[0].length).toBe(9);

// Test 2: Cell access
const cell = { row: 3, col: 5 };
const value = getCell(grid, cell);
expect(value).toBeGreaterThanOrEqual(0);
expect(value).toBeLessThanOrEqual(9);

// Test 3: 16x16 support
const largeGrid = createGrid(16);
expect(largeGrid.length).toBe(16);
```

### FR-2.2: Constraint Checking

**FR-2.2.1: Row Uniqueness Validation**
- MUST verify each row contains at most one instance of each digit (1-9 or 1-16)
- MUST identify constraint violations by row index
- MUST return validation result: `{ valid: boolean, conflicts: Cell[] }`

**FR-2.2.2: Column Uniqueness Validation**
- MUST verify each column contains at most one instance of each digit
- MUST identify constraint violations by column index
- MUST return validation result with conflict locations

**FR-2.2.3: Box Uniqueness Validation**
- MUST verify each 3×3 box (or 4×4 for 16×16) contains at most one instance of each digit
- MUST calculate box index from cell coordinates: `boxIndex = floor(row/3) * 3 + floor(col/3)`
- MUST identify all cells in a box: `getCellsInBox(boxIndex): Cell[]`

**FR-2.2.4: Unified Constraint Validation**
- MUST provide single function `isValidMove(grid, cell, value): boolean`
- MUST check all three constraints (row, column, box) simultaneously
- MUST return `false` if ANY constraint violated

**FR-2.2.5: Grid-Wide Validation**
- MUST provide `isValidGrid(grid): ValidationResult`
- MUST return all constraint violations across entire grid
- MUST distinguish between incomplete (valid) and invalid (rule-breaking) grids

**Acceptance Criteria:**
```typescript
// Test 1: Valid move in empty grid
const grid = createGrid(9);
expect(isValidMove(grid, { row: 0, col: 0 }, 5)).toBe(true);

// Test 2: Row conflict detection
grid[0][3] = 5;
expect(isValidMove(grid, { row: 0, col: 7 }, 5)).toBe(false);

// Test 3: Box conflict detection
grid[1][1] = 5;
expect(isValidMove(grid, { row: 2, col: 2 }, 5)).toBe(false);

// Test 4: Complete validation
const result = isValidGrid(grid);
expect(result.valid).toBe(true);
expect(result.conflicts.length).toBe(0);
```

### FR-2.3: Candidate Set Management

**FR-2.3.1: Initial Candidate Calculation**
- MUST calculate all possible values for each empty cell
- MUST return `Map<string, Set<number>>` where key is `"row,col"`
- MUST exclude values already present in row, column, or box
- MUST update candidates when grid changes

**FR-2.3.2: Candidate Elimination**
- MUST remove candidate when value placed in same row
- MUST remove candidate when value placed in same column
- MUST remove candidate when value placed in same box
- MUST recalculate candidates affected by a move

**FR-2.3.3: Naked Single Detection**
- MUST identify cells with exactly one candidate
- MUST return list of `{ cell: Cell, value: number }` for all naked singles
- MUST prioritize naked singles for solving (used by attention mechanism)

**FR-2.3.4: Hidden Single Detection**
- MUST identify digits with only one possible cell in a unit (row/column/box)
- MUST return list of hidden singles with justification
- MUST support discovery of intermediate-level strategies

**FR-2.3.5: Candidate Set Queries**
- MUST provide `getCandidates(cell): Set<number>`
- MUST provide `getCandidateCount(cell): number`
- MUST provide `getAllCandidates(): Map<string, Set<number>>`

**Acceptance Criteria:**
```typescript
// Test 1: Initial candidates for empty cell
const grid = loadPuzzle("easy-01");
const candidates = calculateCandidates(grid);
const cellCandidates = candidates.get("0,0");
expect(cellCandidates.size).toBeGreaterThan(0);
expect(cellCandidates.size).toBeLessThanOrEqual(9);

// Test 2: Naked single detection
const nakedSingles = findNakedSingles(candidates);
expect(nakedSingles.length).toBeGreaterThan(0);
expect(nakedSingles[0].value).toBeGreaterThan(0);

// Test 3: Candidate elimination
placeValue(grid, { row: 0, col: 0 }, 5);
const updated = updateCandidates(candidates, grid, { row: 0, col: 0 }, 5);
expect(updated.get("0,1")?.has(5)).toBe(false); // Same row
expect(updated.get("1,0")?.has(5)).toBe(false); // Same column
```

### FR-2.4: Puzzle Generator/Loader

**FR-2.4.1: Puzzle Loading from String**
- MUST parse 81-character strings (9×9) or 256-character strings (16×16)
- MUST treat `0` or `.` as empty cells
- MUST treat `1-9` (or `1-9,A-G` for 16×16) as filled cells
- MUST validate string length and character validity
- MUST return `Grid` or throw `InvalidPuzzleFormatError`

**FR-2.4.2: Puzzle Loading from JSON**
- MUST parse JSON format:
  ```json
  {
    "size": 9,
    "grid": [[0,0,5,...], [3,0,0,...], ...],
    "difficulty": "hard",
    "id": "puzzle-123",
    "solution": [[...], [...]] // optional
  }
  ```
- MUST validate grid dimensions match declared size
- MUST validate all values are in valid range
- MUST preserve metadata (difficulty, id)

**FR-2.4.3: Puzzle Loading from File**
- MUST support `.txt`, `.sdk`, `.json` file extensions
- MUST auto-detect format based on content
- MUST provide `loadPuzzleFromFile(path): Promise<PuzzleState>`
- MUST throw `FileNotFoundError` or `InvalidFormatError` with helpful messages

**FR-2.4.4: Difficulty Classification**
- MUST support four difficulty levels: `easy`, `medium`, `hard`, `expert`
- SHOULD estimate difficulty based on:
  - Number of given clues (more = easier)
  - Minimum required strategy complexity
  - Branching factor (guessing depth)
- MUST provide `estimateDifficulty(grid): DifficultyLevel`

**FR-2.4.5: Puzzle Set Management**
- MUST provide curated puzzle sets for each difficulty level
- MUST ensure each set has minimum 20 puzzles for statistical validity
- MUST include known solutions for validation
- SHOULD support external puzzle databases (websudoku.com, sudoku.com formats)

**Acceptance Criteria:**
```typescript
// Test 1: String parsing
const puzzleString = "530070000600195000098000060800060003400803001700020006060000280000419005000080079";
const grid = parseGridString(puzzleString);
expect(grid[0][0]).toBe(5);
expect(grid[0][1]).toBe(3);
expect(grid[0][2]).toBe(0);

// Test 2: JSON parsing
const json = { size: 9, grid: [[5,3,0,...]], difficulty: "easy" };
const puzzle = loadPuzzleFromJSON(json);
expect(puzzle.difficulty).toBe("easy");

// Test 3: Difficulty estimation
const easyPuzzle = loadPuzzle("easy-01");
expect(estimateDifficulty(easyPuzzle.grid)).toBe("easy");

// Test 4: Puzzle set loading
const puzzles = loadPuzzleSet("hard", 20);
expect(puzzles.length).toBe(20);
expect(puzzles[0].difficulty).toBe("hard");
```

### FR-2.5: Solution Verification

**FR-2.5.1: Completeness Check**
- MUST verify all cells are filled (no zeros)
- MUST return `{ complete: boolean, emptyCells: Cell[] }`

**FR-2.5.2: Correctness Check**
- MUST verify all constraints satisfied (rows, columns, boxes)
- MUST return `{ correct: boolean, violations: Violation[] }`
- MUST distinguish between complete+correct (solved) and complete+incorrect (invalid)

**FR-2.5.3: Solution Matching**
- MUST compare candidate solution against known solution
- MUST return `{ matches: boolean, differences: Cell[] }`
- MUST support partial solution matching (for progress tracking)

**FR-2.5.4: Progress Metrics**
- MUST calculate cells filled: `count(cell where cell != 0)`
- MUST calculate progress percentage: `filledCells / totalCells * 100`
- MUST calculate constraint satisfaction rate

**Acceptance Criteria:**
```typescript
// Test 1: Incomplete puzzle
const incomplete = loadPuzzle("easy-01");
expect(isComplete(incomplete.grid)).toBe(false);

// Test 2: Complete valid solution
const solved = loadPuzzle("easy-01-solution");
expect(isComplete(solved)).toBe(true);
expect(isCorrect(solved)).toBe(true);

// Test 3: Complete invalid solution
const invalid = createInvalidSolution(); // Violates row constraint
expect(isComplete(invalid)).toBe(true);
expect(isCorrect(invalid)).toBe(false);

// Test 4: Progress tracking
const partial = loadPuzzle("easy-01");
placeValue(partial.grid, { row: 0, col: 0 }, 5);
const progress = calculateProgress(partial.grid);
expect(progress.percentage).toBeGreaterThan(0);
expect(progress.cellsFilled).toBe(givenClues + 1);
```

### FR-2.6: Puzzle I/O Formats

**FR-2.6.1: Export to String**
- MUST convert `Grid` to 81-character string (9×9) or 256-character string (16×16)
- MUST use `0` for empty cells
- MUST preserve filled values as digits

**FR-2.6.2: Export to JSON**
- MUST include all metadata: size, difficulty, id, creation timestamp
- MUST include grid state
- MUST optionally include solution, move history, candidate sets
- MUST follow schema version for forward compatibility

**FR-2.6.3: Export to File**
- MUST support `.txt` (string format), `.json` (full state), `.sdk` (standard Sudoku format)
- MUST create parent directories if needed
- MUST overwrite with confirmation or throw error
- MUST return `Promise<void>` or throw `FileWriteError`

**Acceptance Criteria:**
```typescript
// Test 1: Grid to string
const grid = loadPuzzle("easy-01").grid;
const str = gridToString(grid);
expect(str.length).toBe(81);
expect(str).toMatch(/^[0-9.]+$/);

// Test 2: Grid to JSON
const json = gridToJSON(grid, { difficulty: "easy", id: "test-01" });
expect(json.size).toBe(9);
expect(json.difficulty).toBe("easy");
expect(json.grid.length).toBe(9);

// Test 3: File export
await savePuzzle("output/test.json", puzzle);
const loaded = await loadPuzzleFromFile("output/test.json");
expect(loaded.grid).toEqual(puzzle.grid);
```

---

## 3. Non-Functional Requirements

### NFR-3.1: Performance Targets

| Operation | Target | Measurement |
|-----------|--------|-------------|
| Grid creation (9×9) | < 1ms | Benchmark on M1 Mac |
| Constraint validation (single move) | < 0.1ms | Average over 1000 checks |
| Candidate calculation (full grid) | < 5ms | Cold start, no caching |
| Candidate update (after move) | < 1ms | Incremental update |
| Grid-wide validation | < 10ms | All constraints checked |
| Puzzle loading (string) | < 2ms | Parsing + validation |
| Puzzle loading (JSON file) | < 20ms | I/O + parsing |

**Rationale:**
Fast puzzle operations ensure the GRASP loop spends token budget on AI reasoning, not waiting for grid calculations. Target: <1% of solve time on puzzle engine overhead.

### NFR-3.2: Memory Constraints

| Component | Maximum Memory | Notes |
|-----------|----------------|-------|
| Single 9×9 grid | 648 bytes | 81 cells × 8 bytes (number) |
| Candidate sets (9×9) | ~5KB | 81 cells × ~60 bytes (Set overhead) |
| Puzzle state (full) | ~10KB | Grid + candidates + metadata |
| Puzzle set (100 puzzles) | ~1MB | Acceptable for POC |

**Constraint:**
Total puzzle engine memory footprint MUST remain < 5MB during active solving to leave memory for LLM context and memory systems.

### NFR-3.3: Error Handling

**NFR-3.3.1: Input Validation Errors**
- MUST throw `InvalidCellError` if cell coordinates out of bounds
- MUST throw `InvalidValueError` if value outside valid range (1-9 or 1-16)
- MUST throw `InvalidPuzzleFormatError` if string/JSON malformed
- MUST provide error messages with specific violation details

**NFR-3.3.2: Runtime Errors**
- MUST throw `ConstraintViolationError` if move violates Sudoku rules
- MUST throw `FileNotFoundError` with path if puzzle file missing
- MUST throw `FileWriteError` if export fails

**NFR-3.3.3: Error Recovery**
- MUST NOT corrupt grid state on invalid operations
- MUST preserve previous valid state if update fails
- MUST provide rollback mechanism for move application

**Acceptance Criteria:**
```typescript
// Test 1: Invalid cell coordinates
expect(() => getCell(grid, { row: 10, col: 5 }))
  .toThrow(InvalidCellError);

// Test 2: Invalid value
expect(() => placeValue(grid, { row: 0, col: 0 }, 15))
  .toThrow(InvalidValueError);

// Test 3: State preservation on error
const before = cloneGrid(grid);
try {
  placeValue(grid, { row: 0, col: 0 }, -1);
} catch (e) {
  expect(grid).toEqual(before); // No corruption
}
```

### NFR-3.4: Code Quality Standards

- **Type Safety:** 100% TypeScript strict mode, zero `any` types
- **Test Coverage:** Minimum 90% line coverage, 100% branch coverage for constraint logic
- **Documentation:** JSDoc comments for all public functions
- **Naming:** Clear, descriptive names (`calculateCandidates`, not `calc`)
- **Pure Functions:** All grid operations are pure (no side effects) except I/O functions
- **Immutability:** Prefer immutable operations; mutations must be explicit

---

## 4. API/Interface Design

### 4.1 Core Grid Operations

```typescript
/**
 * Creates an empty Sudoku grid of specified size.
 *
 * @param size - Grid dimension (9 or 16)
 * @returns Empty grid with all cells initialized to 0
 * @throws InvalidSizeError if size is not 9 or 16
 */
export function createGrid(size: 9 | 16 = 9): Grid;

/**
 * Gets the value at a specific cell.
 *
 * @param grid - The Sudoku grid
 * @param cell - Cell coordinates
 * @returns Cell value (0 for empty, 1-9/16 for filled)
 * @throws InvalidCellError if coordinates out of bounds
 */
export function getCell(grid: Grid, cell: Cell): number;

/**
 * Places a value at a specific cell.
 *
 * @param grid - The Sudoku grid
 * @param cell - Cell coordinates
 * @param value - Value to place (1-9 or 1-16)
 * @returns New grid with value placed (immutable)
 * @throws InvalidCellError if coordinates invalid
 * @throws InvalidValueError if value out of range
 */
export function placeValue(grid: Grid, cell: Cell, value: number): Grid;

/**
 * Clears a cell (sets to 0).
 *
 * @param grid - The Sudoku grid
 * @param cell - Cell coordinates
 * @returns New grid with cell cleared (immutable)
 */
export function clearCell(grid: Grid, cell: Cell): Grid;

/**
 * Deep clones a grid.
 *
 * @param grid - Grid to clone
 * @returns Independent copy of grid
 */
export function cloneGrid(grid: Grid): Grid;

/**
 * Gets grid size (9 or 16).
 *
 * @param grid - The Sudoku grid
 * @returns Grid dimension
 */
export function getGridSize(grid: Grid): 9 | 16;
```

### 4.2 Constraint Checking

```typescript
/**
 * Validation result for constraint checks.
 */
export interface ValidationResult {
  valid: boolean;
  conflicts: Cell[];
  violationType?: 'row' | 'column' | 'box';
}

/**
 * Checks if placing a value at a cell is valid.
 *
 * @param grid - The Sudoku grid
 * @param cell - Target cell
 * @param value - Value to check
 * @returns True if move is valid (no constraint violations)
 */
export function isValidMove(grid: Grid, cell: Cell, value: number): boolean;

/**
 * Validates entire grid for constraint satisfaction.
 *
 * @param grid - The Sudoku grid
 * @returns Validation result with all conflicts
 */
export function isValidGrid(grid: Grid): ValidationResult;

/**
 * Checks if a row satisfies uniqueness constraint.
 *
 * @param grid - The Sudoku grid
 * @param rowIndex - Row to check (0-indexed)
 * @returns Validation result
 */
export function isValidRow(grid: Grid, rowIndex: number): ValidationResult;

/**
 * Checks if a column satisfies uniqueness constraint.
 *
 * @param grid - The Sudoku grid
 * @param colIndex - Column to check (0-indexed)
 * @returns Validation result
 */
export function isValidColumn(grid: Grid, colIndex: number): ValidationResult;

/**
 * Checks if a box satisfies uniqueness constraint.
 *
 * @param grid - The Sudoku grid
 * @param boxIndex - Box to check (0-indexed, row-major order)
 * @returns Validation result
 */
export function isValidBox(grid: Grid, boxIndex: number): ValidationResult;

/**
 * Gets all cells in a specific box.
 *
 * @param grid - The Sudoku grid
 * @param boxIndex - Box index (0-8 for 9×9, 0-15 for 16×16)
 * @returns Array of cells in the box
 */
export function getCellsInBox(grid: Grid, boxIndex: number): Cell[];

/**
 * Calculates box index from cell coordinates.
 *
 * @param cell - Cell coordinates
 * @param gridSize - Grid dimension (9 or 16)
 * @returns Box index
 */
export function getBoxIndex(cell: Cell, gridSize: 9 | 16): number;
```

### 4.3 Candidate Set Management

```typescript
/**
 * Calculates all candidate sets for a grid.
 *
 * @param grid - The Sudoku grid
 * @returns Map of cell keys to candidate sets
 */
export function calculateCandidates(grid: Grid): Map<string, CandidateSet>;

/**
 * Updates candidates after a move.
 *
 * @param candidates - Current candidate map
 * @param grid - Updated grid
 * @param cell - Cell where value was placed
 * @param value - Placed value
 * @returns Updated candidate map
 */
export function updateCandidates(
  candidates: Map<string, CandidateSet>,
  grid: Grid,
  cell: Cell,
  value: number
): Map<string, CandidateSet>;

/**
 * Gets candidates for a specific cell.
 *
 * @param candidates - Candidate map
 * @param cell - Target cell
 * @returns Set of possible values (empty if cell filled)
 */
export function getCandidates(
  candidates: Map<string, CandidateSet>,
  cell: Cell
): CandidateSet;

/**
 * Finds all naked singles (cells with exactly one candidate).
 *
 * @param candidates - Candidate map
 * @returns Array of cells and their forced values
 */
export function findNakedSingles(
  candidates: Map<string, CandidateSet>
): Array<{ cell: Cell; value: number }>;

/**
 * Finds all hidden singles in a unit.
 *
 * @param grid - The Sudoku grid
 * @param candidates - Candidate map
 * @param unit - Unit type ('row' | 'column' | 'box')
 * @param index - Unit index
 * @returns Array of hidden singles
 */
export function findHiddenSingles(
  grid: Grid,
  candidates: Map<string, CandidateSet>,
  unit: 'row' | 'column' | 'box',
  index: number
): Array<{ cell: Cell; value: number; reason: string }>;

/**
 * Converts cell coordinates to string key.
 *
 * @param cell - Cell coordinates
 * @returns String key "row,col"
 */
export function cellToKey(cell: Cell): string;

/**
 * Converts string key to cell coordinates.
 *
 * @param key - String key "row,col"
 * @returns Cell coordinates
 */
export function keyToCell(key: string): Cell;
```

### 4.4 Puzzle I/O

```typescript
/**
 * Difficulty levels for Sudoku puzzles.
 */
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';

/**
 * Puzzle metadata and state.
 */
export interface PuzzleState {
  id: string;
  grid: Grid;
  difficulty: DifficultyLevel;
  givenClues: number;
  solution?: Grid;
  createdAt: number;
}

/**
 * Parses a puzzle from an 81-character string.
 *
 * @param str - Puzzle string (0 or . for empty, 1-9 for filled)
 * @returns Grid
 * @throws InvalidPuzzleFormatError if string malformed
 */
export function parseGridString(str: string): Grid;

/**
 * Converts grid to string format.
 *
 * @param grid - The Sudoku grid
 * @returns 81-character string
 */
export function gridToString(grid: Grid): string;

/**
 * Loads puzzle from JSON object.
 *
 * @param json - JSON object with puzzle data
 * @returns Puzzle state
 * @throws InvalidPuzzleFormatError if JSON invalid
 */
export function loadPuzzleFromJSON(json: any): PuzzleState;

/**
 * Converts puzzle to JSON object.
 *
 * @param puzzle - Puzzle state
 * @returns JSON object
 */
export function puzzleToJSON(puzzle: PuzzleState): any;

/**
 * Loads puzzle from file.
 *
 * @param path - File path (.txt, .sdk, .json)
 * @returns Puzzle state
 * @throws FileNotFoundError if file doesn't exist
 * @throws InvalidPuzzleFormatError if format invalid
 */
export async function loadPuzzleFromFile(path: string): Promise<PuzzleState>;

/**
 * Saves puzzle to file.
 *
 * @param path - File path
 * @param puzzle - Puzzle state
 * @param format - Output format (auto-detected from extension if not specified)
 */
export async function savePuzzleToFile(
  path: string,
  puzzle: PuzzleState,
  format?: 'string' | 'json'
): Promise<void>;

/**
 * Loads a curated puzzle set.
 *
 * @param difficulty - Difficulty level
 * @param count - Number of puzzles to load
 * @returns Array of puzzles
 * @throws Error if insufficient puzzles available
 */
export function loadPuzzleSet(
  difficulty: DifficultyLevel,
  count: number
): PuzzleState[];

/**
 * Estimates puzzle difficulty.
 *
 * @param grid - The Sudoku grid
 * @returns Estimated difficulty level
 */
export function estimateDifficulty(grid: Grid): DifficultyLevel;
```

### 4.5 Solution Verification

```typescript
/**
 * Progress metrics for partial solutions.
 */
export interface ProgressMetrics {
  cellsFilled: number;
  totalCells: number;
  percentage: number;
  constraintsSatisfied: number;
  totalConstraints: number;
}

/**
 * Checks if grid is completely filled.
 *
 * @param grid - The Sudoku grid
 * @returns True if no empty cells (zeros)
 */
export function isComplete(grid: Grid): boolean;

/**
 * Checks if grid satisfies all Sudoku constraints.
 *
 * @param grid - The Sudoku grid
 * @returns True if all constraints satisfied
 */
export function isCorrect(grid: Grid): boolean;

/**
 * Checks if grid is both complete and correct (solved).
 *
 * @param grid - The Sudoku grid
 * @returns True if puzzle is solved
 */
export function isSolved(grid: Grid): boolean;

/**
 * Compares grid against known solution.
 *
 * @param grid - Current grid
 * @param solution - Known solution
 * @returns Cells that differ
 */
export function compareSolution(grid: Grid, solution: Grid): Cell[];

/**
 * Calculates progress metrics.
 *
 * @param grid - The Sudoku grid
 * @param initialGrid - Original puzzle state (for tracking progress)
 * @returns Progress metrics
 */
export function calculateProgress(
  grid: Grid,
  initialGrid: Grid
): ProgressMetrics;

/**
 * Gets all empty cells in grid.
 *
 * @param grid - The Sudoku grid
 * @returns Array of empty cell coordinates
 */
export function getEmptyCells(grid: Grid): Cell[];

/**
 * Counts filled cells in grid.
 *
 * @param grid - The Sudoku grid
 * @returns Number of non-zero cells
 */
export function countFilledCells(grid: Grid): number;
```

---

## 5. Implementation Notes

### 5.1 Key Algorithms

#### 5.1.1 Constraint Validation Algorithm

```typescript
// Optimized constraint checking using Sets for O(1) lookup
function isValidMove(grid: Grid, cell: Cell, value: number): boolean {
  const { row, col } = cell;
  const size = grid.length;
  const boxSize = Math.sqrt(size);

  // Check row constraint
  for (let c = 0; c < size; c++) {
    if (c !== col && grid[row][c] === value) return false;
  }

  // Check column constraint
  for (let r = 0; r < size; r++) {
    if (r !== row && grid[r][col] === value) return false;
  }

  // Check box constraint
  const boxRow = Math.floor(row / boxSize) * boxSize;
  const boxCol = Math.floor(col / boxSize) * boxSize;
  for (let r = boxRow; r < boxRow + boxSize; r++) {
    for (let c = boxCol; c < boxCol + boxSize; c++) {
      if ((r !== row || c !== col) && grid[r][c] === value) {
        return false;
      }
    }
  }

  return true;
}

// Time Complexity: O(N) where N = grid size (9 or 16)
// Space Complexity: O(1)
```

#### 5.1.2 Candidate Calculation Algorithm

```typescript
// Efficient candidate calculation using elimination
function calculateCandidates(grid: Grid): Map<string, CandidateSet> {
  const size = grid.length;
  const candidates = new Map<string, CandidateSet>();

  // Initialize all possible values for each empty cell
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (grid[row][col] === 0) {
        const key = cellToKey({ row, col });
        const possibleValues = new Set<number>();

        // Try each value
        for (let value = 1; value <= size; value++) {
          if (isValidMove(grid, { row, col }, value)) {
            possibleValues.add(value);
          }
        }

        candidates.set(key, possibleValues);
      }
    }
  }

  return candidates;
}

// Time Complexity: O(N^3) where N = grid size
// Space Complexity: O(N^2 * N) = O(N^3) worst case
// For 9×9: ~81 cells × 9 values = 729 operations (acceptable)
```

#### 5.1.3 Incremental Candidate Update

```typescript
// Optimized update after placing a value
function updateCandidates(
  candidates: Map<string, CandidateSet>,
  grid: Grid,
  cell: Cell,
  value: number
): Map<string, CandidateSet> {
  const { row, col } = cell;
  const size = grid.length;
  const boxSize = Math.sqrt(size);
  const updated = new Map(candidates);

  // Remove this cell's candidates (it's now filled)
  updated.delete(cellToKey(cell));

  // Eliminate value from same row
  for (let c = 0; c < size; c++) {
    const key = cellToKey({ row, col: c });
    const candidateSet = updated.get(key);
    if (candidateSet) {
      candidateSet.delete(value);
    }
  }

  // Eliminate value from same column
  for (let r = 0; r < size; r++) {
    const key = cellToKey({ row: r, col });
    const candidateSet = updated.get(key);
    if (candidateSet) {
      candidateSet.delete(value);
    }
  }

  // Eliminate value from same box
  const boxRow = Math.floor(row / boxSize) * boxSize;
  const boxCol = Math.floor(col / boxSize) * boxSize;
  for (let r = boxRow; r < boxRow + boxSize; r++) {
    for (let c = boxCol; c < boxCol + boxSize; c++) {
      const key = cellToKey({ row: r, col: c });
      const candidateSet = updated.get(key);
      if (candidateSet) {
        candidateSet.delete(value);
      }
    }
  }

  return updated;
}

// Time Complexity: O(N) for each update
// Space Complexity: O(N^2) for candidate map
// Significantly faster than full recalculation
```

### 5.2 Edge Cases to Handle

1. **Empty Grid:**
   - `calculateCandidates()` should return full candidate sets (1-9 for each cell)
   - `isValidGrid()` should return `{ valid: true, conflicts: [] }` (incomplete but valid)

2. **Completely Filled Grid:**
   - `calculateCandidates()` should return empty map
   - `isComplete()` should return `true`
   - `isCorrect()` must still validate constraints

3. **Invalid Initial State:**
   - `loadPuzzle()` should detect constraint violations in given clues
   - `isValidGrid()` should report conflicts even in unfilled grids

4. **16×16 Grids:**
   - Box size is 4×4 instead of 3×3
   - Box index calculation: `floor(row/4) * 4 + floor(col/4)`
   - Valid values are 1-16 instead of 1-9

5. **Candidate Set Edge Cases:**
   - Cell with zero candidates → puzzle is unsolvable from this state
   - All cells have naked singles → puzzle is easy
   - No naked singles, some hidden singles → puzzle is medium

6. **String Parsing Edge Cases:**
   - Leading/trailing whitespace should be trimmed
   - Mixed separators (periods and zeros) should both work
   - Case-insensitive hex digits (a-f and A-F) for 16×16

### 5.3 Testing Strategy

#### 5.3.1 Unit Tests (90%+ coverage)

```typescript
describe('Puzzle Engine - Grid Operations', () => {
  test('createGrid creates empty 9×9 grid', () => { ... });
  test('createGrid creates empty 16×16 grid', () => { ... });
  test('getCell retrieves correct value', () => { ... });
  test('placeValue updates cell correctly', () => { ... });
  test('placeValue throws InvalidCellError for out-of-bounds', () => { ... });
  test('cloneGrid creates independent copy', () => { ... });
});

describe('Puzzle Engine - Constraint Checking', () => {
  test('isValidMove detects row conflict', () => { ... });
  test('isValidMove detects column conflict', () => { ... });
  test('isValidMove detects box conflict', () => { ... });
  test('isValidMove allows valid placements', () => { ... });
  test('isValidGrid detects all conflicts', () => { ... });
  test('isValidBox handles 3×3 and 4×4 boxes', () => { ... });
});

describe('Puzzle Engine - Candidate Management', () => {
  test('calculateCandidates finds all valid candidates', () => { ... });
  test('updateCandidates eliminates correctly after move', () => { ... });
  test('findNakedSingles identifies forced moves', () => { ... });
  test('findHiddenSingles discovers intermediate strategies', () => { ... });
  test('getCandidates returns correct set for cell', () => { ... });
});

describe('Puzzle Engine - Puzzle I/O', () => {
  test('parseGridString parses 81-character string', () => { ... });
  test('parseGridString throws on invalid length', () => { ... });
  test('gridToString exports correctly', () => { ... });
  test('loadPuzzleFromJSON validates schema', () => { ... });
  test('loadPuzzleFromFile handles .txt format', () => { ... });
  test('loadPuzzleFromFile handles .json format', () => { ... });
  test('loadPuzzleSet returns requested count', () => { ... });
  test('estimateDifficulty classifies correctly', () => { ... });
});

describe('Puzzle Engine - Solution Verification', () => {
  test('isComplete detects filled grids', () => { ... });
  test('isCorrect validates constraints', () => { ... });
  test('isSolved requires both complete and correct', () => { ... });
  test('compareSolution finds differences', () => { ... });
  test('calculateProgress tracks filling progress', () => { ... });
});
```

#### 5.3.2 Integration Tests

```typescript
describe('Puzzle Engine - Integration', () => {
  test('Load → Validate → Solve → Verify workflow', async () => {
    const puzzle = await loadPuzzleFromFile('puzzles/easy-01.json');
    expect(isValidGrid(puzzle.grid).valid).toBe(true);

    const candidates = calculateCandidates(puzzle.grid);
    const nakedSingles = findNakedSingles(candidates);

    // Apply all naked singles
    let currentGrid = puzzle.grid;
    for (const { cell, value } of nakedSingles) {
      currentGrid = placeValue(currentGrid, cell, value);
    }

    expect(isSolved(currentGrid)).toBe(true);
  });

  test('16×16 puzzle handling', () => {
    const large = createGrid(16);
    expect(getGridSize(large)).toBe(16);

    const cell = { row: 5, col: 7 };
    const boxIndex = getBoxIndex(cell, 16);
    expect(boxIndex).toBe(5); // Correct 4×4 box calculation

    const boxCells = getCellsInBox(large, boxIndex);
    expect(boxCells.length).toBe(16); // 4×4 = 16 cells
  });
});
```

#### 5.3.3 Performance Benchmarks

```typescript
describe('Puzzle Engine - Performance', () => {
  test('Grid creation < 1ms', () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      createGrid(9);
    }
    const elapsed = performance.now() - start;
    expect(elapsed / 1000).toBeLessThan(1); // < 1ms average
  });

  test('Constraint validation < 0.1ms', () => {
    const grid = loadPuzzle('easy-01').grid;
    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      isValidMove(grid, { row: 0, col: 0 }, 5);
    }
    const elapsed = performance.now() - start;
    expect(elapsed / 10000).toBeLessThan(0.1);
  });

  test('Full candidate calculation < 5ms', () => {
    const grid = loadPuzzle('hard-01').grid;
    const start = performance.now();
    calculateCandidates(grid);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5);
  });
});
```

---

## 6. Success Criteria

### 6.1 Functional Success

- [ ] All functional requirements (FR-2.1 through FR-2.6) implemented
- [ ] 100% unit test pass rate
- [ ] 90%+ code coverage
- [ ] All edge cases handled with appropriate errors
- [ ] Both 9×9 and 16×16 grids supported

### 6.2 Performance Success

- [ ] All performance targets (NFR-3.1) met or exceeded
- [ ] Memory usage < 5MB during active solving
- [ ] Zero memory leaks in 1-hour stress test
- [ ] Benchmark results documented

### 6.3 Integration Success

- [ ] GRASP Loop successfully uses puzzle engine API
- [ ] Attention Mechanism successfully queries candidates
- [ ] Memory System successfully serializes puzzle states
- [ ] No circular dependencies with other components

### 6.4 Quality Success

- [ ] TypeScript strict mode compliance
- [ ] Zero linter errors or warnings
- [ ] JSDoc comments on all public functions
- [ ] API documentation generated and reviewed
- [ ] Code review completed with no blockers

### 6.5 Acceptance Tests

**Test 1: Easy Puzzle Workflow**
```typescript
// Load an easy puzzle
const puzzle = await loadPuzzleFromFile('puzzles/easy-01.json');

// Validate initial state
expect(isValidGrid(puzzle.grid).valid).toBe(true);
expect(isComplete(puzzle.grid)).toBe(false);

// Calculate candidates
const candidates = calculateCandidates(puzzle.grid);
expect(candidates.size).toBeGreaterThan(0);

// Find and apply naked singles until solved
let grid = puzzle.grid;
while (!isSolved(grid)) {
  const nakedSingles = findNakedSingles(calculateCandidates(grid));
  if (nakedSingles.length === 0) break;

  const { cell, value } = nakedSingles[0];
  grid = placeValue(grid, cell, value);
}

// Verify solution
expect(isSolved(grid)).toBe(true);
expect(compareSolution(grid, puzzle.solution!)).toHaveLength(0);
```

**Test 2: Constraint Violation Detection**
```typescript
const grid = createGrid(9);

// Create row conflict
let updated = placeValue(grid, { row: 0, col: 0 }, 5);
updated = placeValue(updated, { row: 0, col: 5 }, 5);

const validation = isValidGrid(updated);
expect(validation.valid).toBe(false);
expect(validation.conflicts.length).toBeGreaterThan(0);
expect(validation.violationType).toBe('row');
```

**Test 3: 16×16 Grid Support**
```typescript
const largeGrid = createGrid(16);

// Verify box calculations
const cell = { row: 7, col: 11 };
const boxIndex = getBoxIndex(cell, 16);
expect(boxIndex).toBe(11); // floor(7/4) * 4 + floor(11/4)

const boxCells = getCellsInBox(largeGrid, boxIndex);
expect(boxCells).toHaveLength(16);

// Verify constraint checking
const filled = placeValue(largeGrid, { row: 7, col: 11 }, 12);
expect(isValidMove(filled, { row: 7, col: 3 }, 12)).toBe(false); // Same row
expect(isValidMove(filled, { row: 5, col: 10 }, 12)).toBe(false); // Same box
```

---

## 7. Dependencies and Integration Points

### 7.1 External Dependencies

- **TypeScript 5+**: Type system and compilation
- **Node.js 20+**: Runtime environment
- **fs/promises**: File I/O operations
- **path**: File path utilities

**No third-party libraries required** - Puzzle Engine is a pure TypeScript implementation.

### 7.2 Integration with Other Components

#### 7.2.1 GRASP Loop (Consumer)

```typescript
// GRASP Loop uses Puzzle Engine for:
import {
  PuzzleState,
  calculateCandidates,
  isValidMove,
  placeValue,
  isSolved
} from './puzzle-engine';

// In Generate phase:
const candidates = calculateCandidates(state.grid);
const nakedSingles = findNakedSingles(candidates);

// In Review phase:
const isValid = isValidMove(state.grid, move.cell, move.value);

// In Persist phase:
const solved = isSolved(state.grid);
```

#### 7.2.2 Attention Mechanism (Consumer)

```typescript
// Attention Mechanism uses candidate sets for scoring:
import { calculateCandidates, getCandidates } from './puzzle-engine';

const candidates = calculateCandidates(state.grid);
const attentionScore = 1 / getCandidates(candidates, cell).size; // Uncertainty
```

#### 7.2.3 Memory System (Consumer)

```typescript
// Memory System stores puzzle states:
import { PuzzleState, gridToJSON, parseGridString } from './puzzle-engine';

const serialized = gridToJSON(state.grid);
await memorySystem.store('puzzle-state', serialized);

const retrieved = await memorySystem.retrieve('puzzle-state');
const grid = parseGridString(retrieved.grid);
```

### 7.3 Type Exports

The Puzzle Engine exports all types defined in `/workspaces/machine-dream/src/types.ts` related to puzzle domain:

```typescript
export type {
  Cell,
  Grid,
  CandidateSet,
  Move,
  PuzzleState,
  DifficultyLevel,
  ValidationResult,
  ProgressMetrics,
  Constraint
};
```

---

## 8. Open Questions and Future Considerations

### 8.1 Open Questions (To be resolved before implementation)

1. **Puzzle Set Curation:**
   - Source of curated puzzle sets? (Generate programmatically? Download from public databases?)
   - Licensing for third-party puzzles?
   - Recommendation: Use https://github.com/attractivechaos/plb/blob/master/sudoku/sudoku.txt (Public domain, 95 hard puzzles)

2. **Difficulty Estimation Algorithm:**
   - Simple heuristic (clue count) or complex analysis (strategy requirements)?
   - Recommendation: Start with clue count + required strategies (naked singles = easy, X-Wing = hard)

3. **16×16 Priority:**
   - Should 16×16 support be Phase 1 or Phase 2?
   - Recommendation: Phase 2 (after 9×9 fully working) to reduce initial complexity

### 8.2 Future Enhancements (Beyond POC)

1. **Additional Sudoku Variants:**
   - Killer Sudoku (cages with sum constraints)
   - Samurai Sudoku (5 overlapping grids)
   - Thermo Sudoku (thermometer constraints)
   - Diagonal Sudoku (main diagonals must be unique)

2. **Advanced Strategy Detection:**
   - X-Wing, Swordfish, Jellyfish patterns
   - XY-Wing, XYZ-Wing chains
   - Forcing chains and loops
   - Nishio (trial and error)

3. **Puzzle Generation:**
   - Generate puzzles of specified difficulty
   - Ensure unique solutions
   - Minimize given clues while maintaining solvability

4. **Performance Optimizations:**
   - Bitwise operations for candidate sets (faster than Set)
   - Constraint propagation caching
   - Lazy candidate recalculation

5. **Visualization Support:**
   - ASCII art grid rendering
   - HTML/SVG export for web display
   - Highlight candidates, conflicts, insights

---

## 9. Appendix

### 9.1 Sudoku Constraint Rules Reference

**Row Constraint:**
- Each of the 9 rows (or 16 rows) must contain the digits 1-9 (or 1-16) exactly once
- Formally: `∀r ∈ [0,8]: |{grid[r][c] : c ∈ [0,8] ∧ grid[r][c] ≠ 0}| = |{grid[r][c] : c ∈ [0,8] ∧ grid[r][c] ≠ 0}|` (no duplicates)

**Column Constraint:**
- Each of the 9 columns (or 16 columns) must contain the digits 1-9 (or 1-16) exactly once
- Formally: `∀c ∈ [0,8]: |{grid[r][c] : r ∈ [0,8] ∧ grid[r][c] ≠ 0}| = |{grid[r][c] : r ∈ [0,8] ∧ grid[r][c] ≠ 0}|`

**Box Constraint:**
- Each of the 9 boxes (3×3) or 16 boxes (4×4) must contain the digits 1-9 (or 1-16) exactly once
- Box calculation for 9×9: `boxRow = floor(row / 3) * 3`, `boxCol = floor(col / 3) * 3`
- Box calculation for 16×16: `boxRow = floor(row / 4) * 4`, `boxCol = floor(col / 4) * 4`

### 9.2 Grid Coordinate System

```
9×9 Grid Coordinates (0-indexed):

     Col: 0   1   2   3   4   5   6   7   8
Row 0:   +---+---+---+---+---+---+---+---+---+
         | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
Row 1:   +---+---+---+---+---+---+---+---+---+
         | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
         ...

Box Numbering (0-indexed):
         +---+---+---+
         | 0 | 1 | 2 |
         +---+---+---+
         | 3 | 4 | 5 |
         +---+---+---+
         | 6 | 7 | 8 |
         +---+---+---+

Cell to Box Mapping:
  Cell (row=4, col=7) → Box 5
  Calculation: floor(4/3) * 3 + floor(7/3) = 1 * 3 + 2 = 5 ✓
```

### 9.3 Example Puzzle Formats

**String Format (81 characters):**
```
530070000600195000098000060800060003400803001700020006060000280000419005000080079
```

**JSON Format:**
```json
{
  "id": "easy-01",
  "size": 9,
  "difficulty": "easy",
  "givenClues": 36,
  "grid": [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9]
  ],
  "solution": [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9]
  ],
  "createdAt": 1735977600000
}
```

**File Formats:**
- `.txt`: String format, one puzzle per line
- `.sdk`: Standard Sudoku format (same as .txt)
- `.json`: Full JSON format with metadata

### 9.4 Difficulty Estimation Heuristics

| Difficulty | Given Clues | Minimum Strategy | Naked Singles | Hidden Singles | Advanced |
|------------|-------------|------------------|---------------|----------------|----------|
| Easy       | 36-46       | Naked singles    | Many          | Few            | None     |
| Medium     | 32-35       | Hidden singles   | Some          | Many           | Few      |
| Hard       | 28-31       | Pairs/pointing   | Few           | Some           | Some     |
| Expert     | 22-27       | X-Wing/chains    | Rare          | Some           | Many     |

**Algorithm Sketch:**
```typescript
function estimateDifficulty(grid: Grid): DifficultyLevel {
  const givenClues = countFilledCells(grid);

  if (givenClues >= 36) return 'easy';
  if (givenClues >= 32) return 'medium';
  if (givenClues >= 28) return 'hard';
  return 'expert';

  // Future: Analyze required strategies by attempting to solve
  // with progressively advanced techniques
}
```

---

## 10. Document History

| Version | Date       | Author           | Changes                          |
|---------|------------|------------------|----------------------------------|
| 1.0.0   | 2026-01-04 | Specification Agent | Initial specification complete   |

---

**Status:** ✅ Ready for Implementation
**Estimated Implementation Time:** 2-3 days (16-24 hours)
**Next Steps:**
1. Create `/workspaces/machine-dream/src/puzzle-engine/` directory
2. Implement core grid operations (Day 1)
3. Implement constraint checking and candidates (Day 2)
4. Implement puzzle I/O and verification (Day 3)
5. Write comprehensive test suite (concurrent with implementation)
6. Generate API documentation from JSDoc comments
7. Integration testing with GRASP Loop mock

**Dependencies Required Before Starting:**
- None (foundation component)

**Components Blocked Until Complete:**
- GRASP Loop (PE-002)
- Attention Mechanism (PE-004)
- Memory System (PE-005) - partial dependency

---

*End of Puzzle Engine Specification (PE-001)*
