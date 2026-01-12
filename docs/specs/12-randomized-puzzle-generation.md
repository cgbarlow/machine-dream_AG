# Randomized Puzzle Generation Specification

**Component ID:** PG-012
**Version:** 1.0.0
**Date:** January 6, 2026
**Status:** Implementation Ready
**Dependencies:** PE-001 (Puzzle Engine)

---

## Related ADRs

| ADR | Relationship |
|-----|--------------|
| [ADR-010: Immutable Puzzle Engine](../adr/010-immutable-puzzle-engine.md) | Foundation spec |

---

## 1. Component Overview

### 1.1 Purpose and Responsibilities

The Randomized Puzzle Generation component extends the existing Sudoku system to support:

1. **Seed-Based Generation**: Reproducible puzzle creation using deterministic random number generation
2. **Variable Grid Sizes**: Support for 4×4, 9×9, 16×16, and 25×25 Sudoku grids
3. **Difficulty Control**: Precise difficulty targeting through strategic cell removal
4. **Batch Generation**: Efficient creation of multiple puzzles with sequential or random seeds
5. **Puzzle Validation**: Ensures unique solutions and solvability guarantees

### 1.2 Motivation

**Current Limitations:**
- Static JSON puzzle files limit training data variety
- No ability to reproduce specific puzzles
- Fixed 9×9 grid size only
- LLM learning may overfit to known puzzles

**Benefits of Randomized Generation:**
- **Unlimited Training Data**: Generate infinite unique puzzles for LLM learning
- **Reproducibility**: Seed numbers allow exact puzzle recreation for debugging/testing
- **Scalability**: Support different grid sizes for complexity scaling
- **A/B Testing**: Generate matched-difficulty puzzle pairs for benchmarking
- **Overfitting Prevention**: LLM trains on diverse, never-seen-before puzzles

### 1.3 Position in Overall Architecture

```
┌─────────────────────────────────────────────────────────┐
│           MACHINE DREAM PUZZLE SYSTEM                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────┐         │
│  │    LLM Sudoku Player (depends on PG)      │         │
│  └───────────────────────────────────────────┘         │
│                        ↓                                │
│  ┌───────────────────────────────────────────┐         │
│  │    PUZZLE GENERATION (PG-012) ← NEW      │         │
│  │                                           │         │
│  │  • Seed-Based Random Generator            │         │
│  │  • Variable Grid Sizes (4-25)             │         │
│  │  • Difficulty Targeting                   │         │
│  │  • Batch Generation                       │         │
│  │  • Validation & Uniqueness                │         │
│  └───────────────────────────────────────────┘         │
│                        ↓                                │
│  ┌───────────────────────────────────────────┐         │
│  │      PUZZLE ENGINE (PE-001)               │         │
│  │  (Grid, Validation, Candidates)           │         │
│  └───────────────────────────────────────────┘         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Functional Requirements

### FR-2.1: Seed-Based Random Number Generation

**FR-2.1.1: Deterministic PRNG**
- MUST implement seeded pseudo-random number generator (PRNG)
- MUST produce identical puzzle for same seed value
- MUST support seed range: 0 to 2^32-1 (4,294,967,295)
- MUST use seedable algorithm (e.g., Mulberry32, xoshiro128**)
- MUST NOT use Math.random() for puzzle generation

**FR-2.1.2: Seed Specification**
- MUST accept seed as number parameter
- MUST accept seed as string (parsed to number)
- MUST generate random seed if not provided
- MUST log/return seed used for puzzle generation
- MUST support seed serialization in puzzle metadata

**Acceptance Criteria:**
```typescript
// Test 1: Same seed produces identical puzzles
const gen1 = new PuzzleGenerator({ seed: 12345 });
const puzzle1 = gen1.generate();

const gen2 = new PuzzleGenerator({ seed: 12345 });
const puzzle2 = gen2.generate();

expect(puzzle1.grid).toEqual(puzzle2.grid);

// Test 2: Different seeds produce different puzzles
const gen3 = new PuzzleGenerator({ seed: 67890 });
const puzzle3 = gen3.generate();

expect(puzzle3.grid).not.toEqual(puzzle1.grid);

// Test 3: Random seed generation
const genAuto = new PuzzleGenerator(); // No seed
const puzzleAuto = genAuto.generate();
expect(puzzleAuto.seed).toBeDefined();
expect(puzzleAuto.seed).toBeGreaterThan(0);
```

### FR-2.2: Variable Grid Size Support

**FR-2.2.1: Grid Size Configuration**
- MUST support grid sizes: 4×4, 9×9, 16×16, 25×25
- MUST validate grid size is perfect square with integer box size
- MUST adapt box dimensions: 2×2 (4×4), 3×3 (9×9), 4×4 (16×16), 5×5 (25×25)
- MUST support value ranges: 1-4 (4×4), 1-9 (9×9), 1-16 (16×16), 1-25 (25×25)

**FR-2.2.2: Size-Specific Generation**
- MUST generate valid completed grid for each size
- MUST ensure all constraints satisfied for grid size
- MUST scale cell removal strategy by grid size
- MUST provide difficulty mapping per grid size

**FR-2.2.3: Default Behavior**
- MUST default to 9×9 grid if size not specified
- MUST preserve backward compatibility with existing code
- MUST validate size parameter before generation

**Acceptance Criteria:**
```typescript
// Test 1: 4×4 generation
const gen4 = new PuzzleGenerator({ size: 4, seed: 123 });
const puzzle4 = gen4.generate();
expect(puzzle4.grid.length).toBe(4);
expect(puzzle4.grid[0].length).toBe(4);
expect(Math.max(...puzzle4.grid.flat())).toBeLessThanOrEqual(4);

// Test 2: 9×9 generation (default)
const gen9 = new PuzzleGenerator({ seed: 123 });
const puzzle9 = gen9.generate();
expect(puzzle9.grid.length).toBe(9);

// Test 3: 16×16 generation
const gen16 = new PuzzleGenerator({ size: 16, seed: 123 });
const puzzle16 = gen16.generate();
expect(puzzle16.grid.length).toBe(16);
expect(Math.max(...puzzle16.grid.flat())).toBeLessThanOrEqual(16);

// Test 4: 25×25 generation
const gen25 = new PuzzleGenerator({ size: 25, seed: 123 });
const puzzle25 = gen25.generate();
expect(puzzle25.grid.length).toBe(25);

// Test 5: Invalid size rejected
expect(() => new PuzzleGenerator({ size: 7 }))
  .toThrow('Invalid grid size: must be 4, 9, 16, or 25');
```

### FR-2.3: Difficulty Control

**FR-2.3.1: Difficulty Levels**
- MUST support difficulty levels: easy, medium, hard, expert, diabolical
- MUST map difficulty to clue count ranges (size-specific)
- MUST ensure generated puzzles match target difficulty
- MUST validate puzzle difficulty after generation

**FR-2.3.2: Difficulty Mapping (9×9 Grid)**
| Difficulty | Clue Range | Min Strategy | Characteristics |
|------------|------------|--------------|-----------------|
| easy       | 36-46      | Naked singles | Many naked singles |
| medium     | 32-35      | Hidden singles | Some hidden singles |
| hard       | 28-31      | Pairs/pointing | Advanced techniques |
| expert     | 24-27      | X-Wing/chains | Minimal backtracking |
| diabolical | 22-23      | Trial & error | Heavy backtracking |

**FR-2.3.3: Size-Specific Scaling**
- MUST scale clue counts proportionally to grid size
- MUST maintain relative difficulty across sizes
- MUST provide difficulty estimation function

**Acceptance Criteria:**
```typescript
// Test 1: Easy puzzle generation
const genEasy = new PuzzleGenerator({
  seed: 123,
  difficulty: 'easy'
});
const puzzleEasy = genEasy.generate();
const clueCount = countClues(puzzleEasy.grid);
expect(clueCount).toBeGreaterThanOrEqual(36);
expect(clueCount).toBeLessThanOrEqual(46);

// Test 2: Expert puzzle generation
const genExpert = new PuzzleGenerator({
  seed: 456,
  difficulty: 'expert'
});
const puzzleExpert = genExpert.generate();
const expertClues = countClues(puzzleExpert.grid);
expect(expertClues).toBeGreaterThanOrEqual(24);
expect(expertClues).toBeLessThanOrEqual(27);

// Test 3: Difficulty validation
const difficulty = estimateDifficulty(puzzleEasy.grid);
expect(difficulty).toBe('easy');
```

### FR-2.4: Puzzle Validation & Uniqueness

**FR-2.4.1: Solution Uniqueness**
- MUST guarantee exactly one solution per generated puzzle
- MUST validate uniqueness before returning puzzle
- MUST retry generation if multiple solutions found
- MUST limit retry attempts (max 100) to prevent infinite loops

**FR-2.4.2: Solvability Guarantee**
- MUST ensure puzzle is solvable without guessing (for easy/medium)
- MUST verify required strategy complexity matches difficulty
- MUST validate no impossible states created

**FR-2.4.3: Symmetry Options**
- SHOULD support symmetrical cell removal patterns
- MUST support symmetry types: none, rotational, reflectional, diagonal
- MUST preserve uniqueness when using symmetry

**Acceptance Criteria:**
```typescript
// Test 1: Unique solution
const gen = new PuzzleGenerator({ seed: 789 });
const puzzle = gen.generate();
const solutions = findAllSolutions(puzzle.grid, { maxSolutions: 2 });
expect(solutions.length).toBe(1);

// Test 2: Solvability (easy)
const genEasy = new PuzzleGenerator({ seed: 111, difficulty: 'easy' });
const puzzleEasy = genEasy.generate();
const solvable = isSolvableWithoutGuessing(puzzleEasy.grid);
expect(solvable).toBe(true);

// Test 3: Symmetry
const genSym = new PuzzleGenerator({
  seed: 222,
  symmetry: 'rotational'
});
const puzzleSym = genSym.generate();
expect(hasRotationalSymmetry(puzzleSym.grid)).toBe(true);
```

### FR-2.5: Batch Generation

**FR-2.5.1: Multi-Puzzle Generation**
- MUST support generating N puzzles in one call
- MUST allow sequential seeds (seed, seed+1, seed+2, ...) or random
- MUST return array of generated puzzles with metadata
- MUST support progress callbacks for long-running batch jobs

**FR-2.5.2: Batch Configuration**
- MUST allow mixed difficulties in batch
- MUST allow mixed grid sizes in batch
- MUST support parallel generation (optional optimization)
- MUST provide batch summary statistics

**Acceptance Criteria:**
```typescript
// Test 1: Sequential seed batch
const batch = generateBatch({
  count: 5,
  seedStart: 1000,
  seedMode: 'sequential',
  difficulty: 'medium'
});
expect(batch.length).toBe(5);
expect(batch[0].seed).toBe(1000);
expect(batch[1].seed).toBe(1001);
expect(batch[4].seed).toBe(1004);

// Test 2: Random seed batch
const randomBatch = generateBatch({
  count: 10,
  seedMode: 'random',
  difficulty: 'hard'
});
expect(randomBatch.length).toBe(10);
const seeds = randomBatch.map(p => p.seed);
expect(new Set(seeds).size).toBe(10); // All unique

// Test 3: Mixed difficulty batch
const mixedBatch = generateBatch({
  count: 6,
  difficulties: ['easy', 'easy', 'medium', 'medium', 'hard', 'hard']
});
expect(mixedBatch.filter(p => p.difficulty === 'easy').length).toBe(2);
```

### FR-2.6: Puzzle Metadata & Serialization

**FR-2.6.1: Metadata Capture**
- MUST include seed in puzzle metadata
- MUST include grid size in metadata
- MUST include actual difficulty (estimated)
- MUST include target difficulty (requested)
- MUST include generation timestamp
- MUST include generation time (ms)

**FR-2.6.2: Export Formats**
- MUST support export to JSON with seed
- MUST support export to string with seed in comment
- MUST support import from seed (regenerate puzzle)
- MUST provide CLI command for generation

**Acceptance Criteria:**
```typescript
// Test 1: Metadata completeness
const gen = new PuzzleGenerator({ seed: 5555, difficulty: 'hard' });
const puzzle = gen.generate();
expect(puzzle.seed).toBe(5555);
expect(puzzle.size).toBe(9);
expect(puzzle.targetDifficulty).toBe('hard');
expect(puzzle.actualDifficulty).toBeDefined();
expect(puzzle.generatedAt).toBeDefined();
expect(puzzle.generationTimeMs).toBeGreaterThan(0);

// Test 2: JSON export with seed
const json = puzzleToJSON(puzzle);
expect(json.seed).toBe(5555);

// Test 3: Regeneration from seed
const regenerated = generateFromSeed(5555, { difficulty: 'hard' });
expect(regenerated.grid).toEqual(puzzle.grid);
```

---

## 3. Non-Functional Requirements

### NFR-3.1: Performance Targets

| Operation | Target | Measurement |
|-----------|--------|-------------|
| 4×4 puzzle generation | < 10ms | Average over 100 puzzles |
| 9×9 puzzle generation | < 100ms | Average over 100 puzzles |
| 16×16 puzzle generation | < 500ms | Average over 100 puzzles |
| 25×25 puzzle generation | < 2000ms | Average over 100 puzzles |
| Uniqueness validation | < 200ms | Per puzzle (9×9) |
| Batch generation (10 puzzles) | < 1000ms | 9×9, medium difficulty |

**Rationale:**
Fast generation enables real-time LLM training data creation and interactive puzzle selection in TUI.

### NFR-3.2: Memory Constraints

| Component | Maximum Memory | Notes |
|-----------|----------------|-------|
| Generator instance | < 10KB | PRNG state + config |
| 9×9 puzzle generation | < 50KB | Temporary working space |
| 25×25 puzzle generation | < 500KB | Larger grid overhead |
| Batch (100 puzzles, 9×9) | < 10MB | Acceptable for training |

### NFR-3.3: Code Quality Standards

- **Type Safety:** 100% TypeScript strict mode
- **Test Coverage:** Minimum 90% line coverage
- **Documentation:** JSDoc comments for all public functions
- **Reproducibility:** 100% deterministic given same seed
- **Validation:** All generated puzzles must pass uniqueness check

---

## 4. API/Interface Design

### 4.1 Core Generator Interface

```typescript
/**
 * Configuration for puzzle generation
 */
export interface PuzzleGenerationConfig {
  seed?: number;              // Random seed (auto-generated if not provided)
  size?: 4 | 9 | 16 | 25;    // Grid size (default: 9)
  difficulty?: DifficultyLevel; // Target difficulty (default: 'medium')
  symmetry?: SymmetryType;    // Cell removal symmetry (default: 'none')
  validateUniqueness?: boolean; // Ensure single solution (default: true)
  maxRetries?: number;        // Max retry attempts (default: 100)
}

/**
 * Generated puzzle with metadata
 */
export interface GeneratedPuzzle extends PuzzleState {
  seed: number;               // Seed used for generation
  size: number;               // Grid size
  targetDifficulty: DifficultyLevel; // Requested difficulty
  actualDifficulty: DifficultyLevel; // Estimated difficulty
  symmetry: SymmetryType;     // Symmetry pattern used
  generatedAt: number;        // Timestamp (ms)
  generationTimeMs: number;   // Generation time
  retryCount: number;         // Attempts needed for uniqueness
}

/**
 * Symmetry types for cell removal
 */
export type SymmetryType = 'none' | 'rotational' | 'reflectional' | 'diagonal';

/**
 * Seeded random number generator for reproducible puzzles
 */
export class SeededRandom {
  constructor(seed: number);
  next(): number;             // Returns [0, 1)
  nextInt(min: number, max: number): number; // Returns [min, max]
  shuffle<T>(array: T[]): T[]; // Fisher-Yates shuffle
}

/**
 * Main puzzle generator class
 */
export class PuzzleGenerator {
  constructor(config?: PuzzleGenerationConfig);

  /**
   * Generates a single puzzle
   */
  generate(): GeneratedPuzzle;

  /**
   * Gets the current seed (useful if auto-generated)
   */
  getSeed(): number;

  /**
   * Gets the current configuration
   */
  getConfig(): PuzzleGenerationConfig;
}

/**
 * Generates a puzzle from a specific seed
 */
export function generateFromSeed(
  seed: number,
  config?: Omit<PuzzleGenerationConfig, 'seed'>
): GeneratedPuzzle;

/**
 * Generates a random seed
 */
export function generateRandomSeed(): number;
```

### 4.2 Batch Generation Interface

```typescript
/**
 * Configuration for batch generation
 */
export interface BatchGenerationConfig {
  count: number;              // Number of puzzles to generate
  seedStart?: number;         // Starting seed (auto if not provided)
  seedMode?: 'sequential' | 'random'; // Seed selection (default: 'sequential')
  size?: 4 | 9 | 16 | 25;    // Grid size
  difficulty?: DifficultyLevel | DifficultyLevel[]; // Single or per-puzzle
  symmetry?: SymmetryType;    // Symmetry pattern
  onProgress?: (progress: BatchProgress) => void; // Progress callback
}

/**
 * Batch progress information
 */
export interface BatchProgress {
  current: number;            // Current puzzle number
  total: number;              // Total puzzles to generate
  successful: number;         // Successfully generated
  failed: number;             // Failed validation
  averageTimeMs: number;      // Average generation time
}

/**
 * Batch generation result
 */
export interface BatchGenerationResult {
  puzzles: GeneratedPuzzle[]; // Generated puzzles
  summary: {
    total: number;
    successful: number;
    failed: number;
    totalTimeMs: number;
    averageTimeMs: number;
  };
}

/**
 * Generates a batch of puzzles
 */
export function generateBatch(
  config: BatchGenerationConfig
): Promise<BatchGenerationResult>;
```

### 4.3 Validation Interface

```typescript
/**
 * Validation result for puzzle uniqueness
 */
export interface UniquenessValidation {
  isUnique: boolean;          // True if exactly one solution
  solutionCount: number;      // Number of solutions found (0-2+)
  solutions?: Grid[];         // Solutions found (if requested)
}

/**
 * Validates puzzle has unique solution
 */
export function validateUniqueness(
  grid: Grid,
  options?: {
    maxSolutions?: number;    // Stop after finding N solutions (default: 2)
    includeSolutions?: boolean; // Return solutions (default: false)
  }
): UniquenessValidation;

/**
 * Estimates actual difficulty of generated puzzle
 */
export function estimateGeneratedDifficulty(
  grid: Grid,
  size: number
): DifficultyLevel;

/**
 * Checks if puzzle is solvable without guessing
 */
export function isSolvableWithoutGuessing(
  grid: Grid
): boolean;
```

### 4.4 CLI Interface (Spec 09 Extension)

```typescript
/**
 * CLI commands for puzzle generation (to be added to Spec 09)
 */

// Generate single puzzle
machine-dream puzzle generate \
  --seed 12345 \
  --size 9 \
  --difficulty medium \
  --output puzzles/generated-001.json

// Generate puzzle with random seed (seed printed)
machine-dream puzzle generate \
  --size 16 \
  --difficulty hard \
  --output puzzles/generated-002.json

// Generate batch of puzzles
machine-dream puzzle batch \
  --count 10 \
  --seed-start 1000 \
  --seed-mode sequential \
  --difficulty medium \
  --output-dir puzzles/batch-001/

// Generate from seed (recreate puzzle)
machine-dream puzzle from-seed 12345 \
  --size 9 \
  --difficulty medium \
  --output puzzles/recreated.json

// Validate puzzle uniqueness
machine-dream puzzle validate puzzles/custom.json \
  --check-uniqueness
```

### 4.5 TUI Interface (Spec 10 Extension)

```typescript
/**
 * TUI Puzzle Generator Screen
 *
 * - Seed input field (number or "random")
 * - Size selector (4x4 / 9x9 / 16x16 / 25x25)
 * - Difficulty selector
 * - Symmetry selector
 * - Generate button
 * - Preview generated puzzle
 * - Save to file option
 * - Use for LLM play option
 */
```

---

## 5. Implementation Plan

### 5.1 Phase 1: Core Seeded Generator

**Files to Create:**
- `src/engine/SeededRandom.ts` - Seeded PRNG implementation
- `src/engine/PuzzleGenerator.ts` - Enhanced generator with seed support
- `src/engine/PuzzleValidator.ts` - Uniqueness and solvability validation

**Files to Modify:**
- `src/engine/SudokuGenerator.ts` - Deprecate or migrate to new system

**Implementation Steps:**
1. Implement `SeededRandom` class using Mulberry32 algorithm
2. Extend `PuzzleGenerator` with seed and size support
3. Add uniqueness validation using solution counter
4. Add difficulty estimation based on clue count + strategy analysis
5. Comprehensive unit tests (90%+ coverage)

**Estimated Time:** 1 day (8 hours)

### 5.2: Phase 2: Variable Grid Sizes

**Implementation Steps:**
1. Add size parameter validation (4, 9, 16, 25)
2. Update box calculation for each size
3. Scale value ranges per grid size
4. Add size-specific difficulty mapping
5. Test all sizes with various difficulties

**Estimated Time:** 0.5 days (4 hours)

### 5.3: Phase 3: Batch Generation

**Implementation Steps:**
1. Implement `generateBatch()` function
2. Add progress callbacks
3. Support sequential and random seed modes
4. Add batch summary statistics
5. Performance optimization for large batches

**Estimated Time:** 0.5 days (4 hours)

### 5.4: Phase 4: CLI Integration

**Files to Modify:**
- `src/cli/commands/puzzle.ts` (NEW) - Puzzle generation commands

**Implementation Steps:**
1. Add `puzzle generate` command
2. Add `puzzle batch` command
3. Add `puzzle from-seed` command
4. Add `puzzle validate` command
5. Update Spec 09 documentation

**Estimated Time:** 0.5 days (4 hours)

### 5.5: Phase 5: TUI Integration

**Files to Create:**
- `src/tui-ink/screens/GeneratorScreen.tsx` - Puzzle generator UI
- `src/tui-ink/screens/GeneratorScreen.interactive.tsx` - Interactive version

**Files to Modify:**
- `src/tui-ink/App.tsx` - Add generator menu item
- `src/tui-ink/services/CLIExecutor.ts` - Add generator methods

**Implementation Steps:**
1. Create generator configuration form
2. Add live preview of generated puzzle
3. Add save/export functionality
4. Add "Use for LLM Play" quick action
5. Update Spec 10 documentation

**Estimated Time:** 0.5 days (4 hours)

### 5.6: Phase 6: Documentation & Testing

**Implementation Steps:**
1. Update USER_GUIDE.md with generation examples
2. Update README.md with seed-based features
3. Create RANDOMIZED_PUZZLES.md tutorial
4. Integration tests with LLM player
5. Performance benchmarks

**Estimated Time:** 0.5 days (4 hours)

**Total Estimated Time:** 3.5 days (28 hours)

---

## 6. Integration Points

### 6.1 LLM Sudoku Player Integration

```typescript
// Use generated puzzles for LLM training
const gen = new PuzzleGenerator({
  seed: Date.now(),
  difficulty: 'medium'
});

const trainingPuzzle = gen.generate();

await llmPlayer.playPuzzle(
  trainingPuzzle.id,
  trainingPuzzle.grid,
  trainingPuzzle.solution!
);
```

### 6.2 Benchmark Integration

```typescript
// Generate matched puzzle pairs for A/B testing
const baseSeed = 1000;

const puzzles = [
  generateFromSeed(baseSeed, { difficulty: 'medium' }),
  generateFromSeed(baseSeed + 1, { difficulty: 'medium' }),
  // ...
];

await llmBenchmark.run(puzzles);
```

### 6.3 Static Puzzle Files (Backward Compatibility)

```typescript
// Generated puzzles can be saved as static JSON files
const puzzle = generateFromSeed(12345, { difficulty: 'hard' });

await savePuzzleToFile('puzzles/generated-hard-12345.json', puzzle);

// Can be loaded like any other puzzle
const loaded = await loadPuzzleFromFile('puzzles/generated-hard-12345.json');
expect(loaded.seed).toBe(12345); // Seed preserved
```

---

## 7. Success Criteria

### 7.1 Functional Success

- ✅ Seeded generation produces identical puzzles for same seed
- ✅ All grid sizes (4, 9, 16, 25) generate valid puzzles
- ✅ All difficulty levels map to appropriate clue counts
- ✅ 100% of generated puzzles have unique solutions
- ✅ Batch generation supports sequential and random seeds
- ✅ CLI commands work as documented
- ✅ TUI integration complete and functional

### 7.2 Performance Success

- ✅ 9×9 generation < 100ms average
- ✅ Batch of 100 puzzles < 10 seconds
- ✅ No memory leaks in long-running batch jobs
- ✅ Uniqueness validation < 200ms per puzzle

### 7.3 Quality Success

- ✅ 90%+ test coverage
- ✅ TypeScript strict mode compliance
- ✅ Zero linter errors or warnings
- ✅ JSDoc documentation complete
- ✅ Integration tests pass with LLM player

### 7.4 Acceptance Tests

**Test 1: Seed Reproducibility**
```typescript
const puzzle1 = generateFromSeed(777, { difficulty: 'easy' });
const puzzle2 = generateFromSeed(777, { difficulty: 'easy' });
expect(puzzle1.grid).toEqual(puzzle2.grid);
```

**Test 2: Grid Size Variety**
```typescript
const sizes: (4 | 9 | 16 | 25)[] = [4, 9, 16, 25];
for (const size of sizes) {
  const puzzle = new PuzzleGenerator({ size, seed: 123 }).generate();
  expect(puzzle.grid.length).toBe(size);
  expect(validateUniqueness(puzzle.grid).isUnique).toBe(true);
}
```

**Test 3: Difficulty Accuracy**
```typescript
const difficulties: DifficultyLevel[] = ['easy', 'medium', 'hard', 'expert'];
for (const difficulty of difficulties) {
  const puzzle = new PuzzleGenerator({ difficulty, seed: 456 }).generate();
  const estimated = estimateGeneratedDifficulty(puzzle.grid, puzzle.size);
  expect(estimated).toBe(difficulty);
}
```

**Test 4: Batch Generation**
```typescript
const batch = await generateBatch({
  count: 50,
  seedStart: 1000,
  seedMode: 'sequential',
  difficulty: 'medium'
});

expect(batch.puzzles.length).toBe(50);
expect(batch.puzzles[0].seed).toBe(1000);
expect(batch.puzzles[49].seed).toBe(1049);

// All unique
const uniqueGrids = new Set(batch.puzzles.map(p => JSON.stringify(p.grid)));
expect(uniqueGrids.size).toBe(50);
```

---

## 8. Migration & Backward Compatibility

### 8.1 Existing Code Impact

**Files Affected:**
- `src/engine/SudokuGenerator.ts` - Will be deprecated
- `src/cli/commands/*.ts` - May use generated puzzles
- `src/llm/LLMSudokuPlayer.ts` - Can use generated puzzles

**Migration Strategy:**
1. Keep old `SudokuGenerator` for backward compatibility
2. Mark as `@deprecated` with migration guide
3. New code should use `PuzzleGenerator` with seeds
4. Static JSON puzzles continue to work unchanged

### 8.2 Breaking Changes

**None** - This is a pure addition. All existing functionality remains intact.

---

## 9. Future Enhancements

### 9.1 Advanced Features (Post-V1)

1. **Pattern-Based Generation**: Generate puzzles with specific strategy requirements
2. **Minimal Clue Puzzles**: Find minimum clues while maintaining uniqueness
3. **Custom Constraints**: Support variant Sudoku rules (Killer, Thermo, etc.)
4. **Puzzle Grading**: Machine learning-based difficulty prediction
5. **Solution Path Analysis**: Track which strategies are required

### 9.2 Performance Optimizations

1. **Parallel Batch Generation**: Multi-threaded generation for large batches
2. **Generator Pool**: Reuse generator instances to avoid initialization overhead
3. **Caching**: Cache recently generated puzzles by seed
4. **Incremental Validation**: Early termination when multiple solutions detected

---

## 10. Appendix

### 10.1 Seeded PRNG Algorithm (Mulberry32)

```typescript
class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0; // Ensure 32-bit unsigned
  }

  next(): number {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
```

### 10.2 Grid Size Specifications

| Size | Box Size | Value Range | Typical Clues (Medium) | Generation Time |
|------|----------|-------------|------------------------|-----------------|
| 4×4  | 2×2      | 1-4         | 6-8                    | < 10ms          |
| 9×9  | 3×3      | 1-9         | 32-35                  | < 100ms         |
| 16×16 | 4×4     | 1-16        | 80-100                 | < 500ms         |
| 25×25 | 5×5     | 1-25        | 200-250                | < 2000ms        |

### 10.3 Example Usage

```bash
# Generate puzzle with specific seed
npm run puzzle:generate -- --seed 42 --difficulty hard

# Generate batch for LLM training
npm run puzzle:batch -- --count 100 --seed-start 1000

# Recreate exact puzzle from seed
npm run puzzle:from-seed 42 --output puzzles/puzzle-42.json

# Use in LLM player
npm run llm:play puzzles/puzzle-42.json
```

---

**Status:** ✅ Ready for Implementation
**Next Steps:**
1. Implement Phase 1 (Seeded Generator)
2. Test with existing LLM player
3. Implement remaining phases sequentially
4. Update documentation

---

*End of Randomized Puzzle Generation Specification (PG-012)*
