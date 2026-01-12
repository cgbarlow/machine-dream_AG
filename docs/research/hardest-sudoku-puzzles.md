# World's Hardest Sudoku Puzzles

**Date:** 2026-01-12
**Purpose:** Research document for extreme difficulty puzzles

---

## 9x9 Sudoku

### AI Escargot (2006)

**Author:** Arto Inkala
**Clues:** 23
**Difficulty Rating:** Expert/Diabolical

Considered the world's hardest 9x9 Sudoku puzzle. Named "AI Escargot" because the pattern resembles a snail.

```
1 . . | . . 7 | . 9 .
. 3 . | . 2 . | . . 8
. . 9 | 6 . . | 5 . .
------+-------+------
. . 5 | 3 . . | 9 . .
. 1 . | . 8 . | . . 2
6 . . | . . 4 | . . .
------+-------+------
3 . . | . . . | . 1 .
. 4 . | . . . | . . 7
. . 7 | . . . | 3 . .
```

**Puzzle String:** `100007090030020008009600500005300900010080002600004000300000010040000007007000300`

**Why It's Hard:**
- Requires advanced techniques (X-Wing, Swordfish, Forcing Chains)
- Multiple levels of candidate elimination needed
- No "easy" starting moves
- Designed to defeat simple constraint propagation

### Inkala 2012

**Author:** Arto Inkala
**Clues:** 23
**Published:** 2012

Inkala claimed this puzzle was even harder than AI Escargot.

```
8 . . | . . . | . . .
. . 3 | 6 . . | . . .
. 7 . | . 9 . | 2 . .
------+-------+------
. 5 . | . . 7 | . . .
. . . | . 4 5 | 7 . .
. . . | 1 . . | . 3 .
------+-------+------
. . 1 | . . . | . 6 8
. . 8 | 5 . . | . 1 .
. 9 . | . . . | 4 . .
```

**Puzzle String:** `800000000003600000070090200050007000000045700000100030001000068008500010090000400`

### Golden Nugget (2010)

Another Inkala creation with 22 clues, considered extremely difficult.

---

## 16x16 Sudoku

For 16x16 grids, "hardest" is less well-defined. Community-generated puzzles exist, but no widely recognized "hardest" puzzle.

**Challenges:**
- 256 cells instead of 81
- More possible candidates per cell (1-16)
- Exponentially larger search space
- Few competitive puzzle-design efforts

---

## Larger Grids (25x25, 36x36, etc.)

### 25x25 and Beyond

The concept of "hardest" becomes less meaningful:

| Grid Size | Cells | Box Size | Notes |
|-----------|-------|----------|-------|
| 25x25 | 625 | 5x5 | Community puzzles exist |
| 36x36 | 1,296 | 6x6 | Rare |
| 100x100 | 10,000 | 10x10 | Academic interest only |
| 144x144 | 20,736 | 12x12 | Theoretical |

**Research Areas:**
- NP-completeness of Sudoku (proven for general NxN)
- SAT solver performance on larger grids
- Human solvability limits

---

## Difficulty Metrics

### Traditional Metrics

1. **Clue Count**: Fewer clues generally means harder
2. **Technique Required**: What solving methods are needed
3. **Solution Uniqueness**: Must have exactly one solution

### LLM-Specific Metrics

For machine-dream research:

1. **Accuracy Rate**: % of correct moves
2. **Moves to Solve**: Total attempts needed
3. **Backtrack Frequency**: How often wrong paths are taken
4. **Learning Curve**: Improvement over training iterations

---

## Puzzle Sources

### 9x9 Puzzles

| Source | Type | Notes |
|--------|------|-------|
| Inkala puzzles | Expert | Designed to be difficult |
| NYT Hard | Variable | Daily puzzles |
| Sudoku.com Expert | Expert | Large collection |
| Project Euler | Logic | Algorithmic focus |

### Programmatic Generation

The machine-dream project generates puzzles using:
- Constraint-based generation (Spec 12)
- Difficulty estimation via empty cell count
- Solution uniqueness verification

---

## References

- Inkala, Arto. "AI Escargot." 2006.
- Inkala, Arto. "World's Hardest Sudoku." 2012.
- Gary McGuire et al. "There is no 16-Clue Sudoku." 2012.
- [Sudoku Solving Algorithms - Wikipedia](https://en.wikipedia.org/wiki/Sudoku_solving_algorithms)

---

## Available Puzzles in machine-dream

| File | Difficulty | Size |
|------|------------|------|
| `puzzles/9x9-ai-escargot.json` | Expert | 9x9 |
| `puzzles/9x9-easy.json` | Easy | 9x9 |
| `puzzles/9x9-medium.json` | Medium | 9x9 |
| `puzzles/4x4-expert.json` | Expert | 4x4 |
| `puzzles/4x4-diabolical.json` | Diabolical | 4x4 |
