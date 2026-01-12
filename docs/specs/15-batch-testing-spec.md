# Specification 15: Batch Testing Scripts

---

## Related ADRs

| ADR | Relationship |
|-----|--------------|
| [ADR-004: Spec-First Development](../adr/004-spec-first-development.md) | Governs this spec |

---

## Overview

This specification defines shell scripts for batch testing of the LLM Sudoku player's learning capabilities. These scripts automate A/B testing and iterative learning workflows.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Language** | Bash | Universal availability, simple execution |
| **Output Format** | Plain text + JSON summary | Human readable + machine parseable |
| **Progress Feedback** | Real-time during runs | User visibility into long-running tests |
| **Learning Unit Support** | Optional parameter | Backwards compatible, enables advanced workflows |

## Scripts

### 1. ab-test-learning.sh

A/B test script comparing performance with and without learning.

#### Usage

```bash
./scripts/ab-test-learning.sh [options]

Options:
  --profile <name>       LLM profile to use (default: qwen3-coder)
  --puzzle <path>        Puzzle file to use (default: puzzles/4x4-expert.json)
  --runs <n>             Number of runs per phase (default: 10)
  --skip-dream           Skip dream cycle - use existing learned strategies
  --learning-unit <id>   Use specific learning unit (default: "default")
  --stream               Show live gameplay output during runs
  -h, --help             Show help
```

#### Phases

1. **Phase 1: Baseline** - Run N puzzles with `--no-learning`
2. **Phase 2: Dream Cycle** - Consolidate experiences (skipped if `--skip-dream`)
3. **Phase 3: Learning** - Run N puzzles with learning enabled
4. **Phase 4: Analysis** - Compare metrics and generate summary

#### Output Structure

```
./ab-test-results/YYYYMMDD_HHMMSS/
├── summary.txt           # Human-readable summary
├── summary.json          # Machine-parseable results
├── baseline_1.log        # Full output from baseline run 1
├── baseline_2.log        # ...
├── learning_1.log        # Full output from learning run 1
├── learning_2.log        # ...
├── dream.log             # Dream cycle output (if run)
├── dream_show.log        # Learned strategies display
└── session_list.txt      # All session IDs for further analysis
```

#### Summary Format

```
A/B Test Results
================
Profile: qwen3-coder
Puzzle: puzzles/9x9-easy.json
Runs per phase: 10
Learning unit: default
Date: Sat Jan 10 08:12:30 NZDT 2026

--- Baseline Runs (no learning) ---
Run 1: Not solved, 100 moves, 30.0% acc
Run 2: SOLVED, 45 moves, 75.0% acc
...

Baseline summary: 3/10 solved, avg moves: 65.2, avg accuracy: 42.3%

--- Dream Cycle ---
Dream cycle complete

--- Learning Runs (with learning) ---
Run 1: SOLVED, 32 moves, 85.0% acc
...

Learning summary: 6/10 solved, avg moves: 48.1, avg accuracy: 58.7%

--- Enhanced Analysis ---

                    Baseline    Learning    Diff
----------------------------------------------
Solve rate:         3/10        6/10        +3
Avg moves:          65.2        48.1        -17.1
Avg accuracy:       42.3%       58.7%       +16.4%
----------------------------------------------

Interpretation:
  [+] Learning improved solve rate by +3 puzzles
  [+] Learning uses fewer moves (more efficient)
  [+] Learning has higher accuracy
```

#### JSON Summary Format

```json
{
  "testId": "20260110_081230",
  "profile": "qwen3-coder",
  "puzzle": "puzzles/9x9-easy.json",
  "learningUnit": "default",
  "runsPerPhase": 10,
  "skipDream": false,
  "baseline": {
    "solved": 3,
    "total": 10,
    "avgMoves": 65.2,
    "avgAccuracy": 42.3,
    "runs": [
      {"run": 1, "solved": false, "moves": 100, "accuracy": 30.0},
      {"run": 2, "solved": true, "moves": 45, "accuracy": 75.0}
    ]
  },
  "learning": {
    "solved": 6,
    "total": 10,
    "avgMoves": 48.1,
    "avgAccuracy": 58.7,
    "runs": [...]
  },
  "diff": {
    "solveRate": 3,
    "avgMoves": -17.1,
    "avgAccuracy": 16.4
  }
}
```

#### Streaming Mode

With `--stream` flag, shows live gameplay:

```bash
./scripts/ab-test-learning.sh --stream --runs 2

Baseline run 1/2...
  Move 1: (2,3)=5 → CORRECT
  Move 2: (1,4)=7 → INVALID (already in row)
  Move 3: (1,4)=3 → CORRECT
  ...
  -> Not solved, 50 moves, 45.0% acc

Baseline run 2/2...
  Move 1: (3,1)=2 → CORRECT
  ...
```

### 2. iterative-learning.sh

Runs multiple play+dream cycles to track learning improvement over time.

#### Usage

```bash
./scripts/iterative-learning.sh [options]

Options:
  --profile <name>       LLM profile to use (default: qwen3-coder)
  --puzzle <path>        Puzzle file to use (default: puzzles/4x4-expert.json)
  --batch-size <n>       Number of plays before dreaming (default: 1)
  --total-plays <n>      Total number of plays (default: 10)
  --learning-unit <id>   Learning unit to use/update (creates if not exists)
  --stream               Show live gameplay output
  -h, --help             Show help
```

#### Algorithm

```
1. Create/load learning unit
2. For each batch:
   a. Play batch-size puzzles
   b. Run dream cycle (re-consolidate)
   c. Record batch metrics
3. Output progression summary
```

#### Example Workflow

```bash
# Train on easy puzzles with 5 batches of 2 plays each
./scripts/iterative-learning.sh \
  --puzzle puzzles/4x4-easy.json \
  --batch-size 2 \
  --total-plays 10 \
  --learning-unit easy-training
```

Output:

```
Iterative Learning Session
==========================
Profile: qwen3-coder
Puzzle: puzzles/4x4-easy.json
Batch size: 2 plays
Total plays: 10 (5 batches)
Learning unit: easy-training
Date: Sat Jan 10 10:30:00 NZDT 2026

--- Batch 1/5 ---
Play 1: SOLVED, 18 moves, 55.6% acc
Play 2: Not solved, 50 moves, 35.0% acc
Dreaming... absorbed 68 experiences
Batch summary: 1/2 solved, avg accuracy: 45.3%

--- Batch 2/5 ---
Play 3: SOLVED, 15 moves, 66.7% acc
Play 4: SOLVED, 12 moves, 83.3% acc
Dreaming... absorbed 27 experiences
Batch summary: 2/2 solved, avg accuracy: 75.0%

--- Batch 3/5 ---
...

=== Progression Summary ===

Batch    Solved    Avg Moves    Avg Accuracy
----------------------------------------------
1        1/2       34.0         45.3%
2        2/2       13.5         75.0%
3        2/2       11.0         90.9%
4        2/2       10.5         95.2%
5        2/2       10.0         100.0%
----------------------------------------------

Learning unit "easy-training" now has 4 strategies from 145 experiences.

Improvement detected:
  [+] Solve rate improved from 50% to 100%
  [+] Accuracy improved from 45.3% to 100.0%
  [+] Average moves decreased from 34.0 to 10.0
```

#### Output Structure

```
./iterative-results/YYYYMMDD_HHMMSS/
├── summary.txt           # Human-readable progression
├── summary.json          # Machine-parseable results
├── batch_1/
│   ├── play_1.log
│   ├── play_2.log
│   └── dream.log
├── batch_2/
│   └── ...
└── learning_unit_final.json  # Exported learning unit
```

#### JSON Summary Format

```json
{
  "sessionId": "20260110_103000",
  "profile": "qwen3-coder",
  "puzzle": "puzzles/4x4-easy.json",
  "learningUnit": "easy-training",
  "batchSize": 2,
  "totalPlays": 10,
  "batches": [
    {
      "batch": 1,
      "plays": [
        {"play": 1, "solved": true, "moves": 18, "accuracy": 55.6},
        {"play": 2, "solved": false, "moves": 50, "accuracy": 35.0}
      ],
      "solved": 1,
      "total": 2,
      "avgMoves": 34.0,
      "avgAccuracy": 45.3,
      "experiencesAbsorbed": 68
    }
  ],
  "progression": {
    "initialSolveRate": 0.5,
    "finalSolveRate": 1.0,
    "initialAccuracy": 45.3,
    "finalAccuracy": 100.0,
    "improvementDetected": true
  }
}
```

## Implementation Requirements

### Progress Feedback

Both scripts must provide real-time feedback:

```bash
# During runs (non-streaming mode)
echo "Baseline run $i/$RUNS..."
echo "  -> $STATUS, ${MOVES} moves, ${ACC}% acc"

# During dreaming
echo "Dreaming... absorbed ${COUNT} experiences"
```

### Metrics Extraction

Extract metrics from play command output:

```bash
# Moves
moves=$(echo "$output" | grep -oP 'Moves:\s*\K\d+' | head -1)
# Alternative patterns
moves=$(echo "$output" | grep -oP 'Total moves:\s*\K\d+' | head -1)
moves=$(echo "$output" | grep -oP '\d+(?=\s+moves)' | head -1)

# Accuracy
accuracy=$(echo "$output" | grep -oP 'Accuracy:\s*\K[\d.]+' | head -1)
accuracy=$(echo "$output" | grep -oP '[\d.]+(?=%\s*accuracy)' | head -1)

# Solved status
if echo "$output" | grep -q "SOLVED"; then
  solved=true
fi
```

### Error Handling

- Continue on individual run failures
- Log all errors to individual log files
- Report partial results if interrupted
- Exit codes: 0 (success), 1 (partial failure), 2 (total failure)

### Streaming Implementation

```bash
if [ "$STREAM" = true ]; then
  # Use tee to show output while capturing
  OUTPUT=$(npx machine-dream llm play "$PUZZLE" --profile "$PROFILE" 2>&1 | tee /dev/stderr)
else
  # Capture silently
  OUTPUT=$(npx machine-dream llm play "$PUZZLE" --profile "$PROFILE" 2>&1)
fi
```

## CLI Integration

### Required CLI Updates

The scripts depend on these CLI options:

```bash
# Play with specific learning unit
npx machine-dream llm play <puzzle> --learning-unit <id>

# Dream consolidation for specific unit
npx machine-dream llm dream run --learning-unit <id>

# Show learning unit details
npx machine-dream llm learning show <id>
```

### Backwards Compatibility

If `--learning-unit` is not specified:
- Use `default` learning unit implicitly
- Behaves identically to current implementation

## Success Criteria

1. **ab-test-learning.sh**:
   - Runs without errors for 10+ runs
   - Produces accurate metrics comparison
   - Streaming mode shows live output
   - JSON summary is valid and complete

2. **iterative-learning.sh**:
   - Correctly creates/updates learning units
   - Shows progression across batches
   - Detects and reports improvement
   - Handles interruption gracefully

3. **Integration**:
   - Works with all puzzle sizes (4x4, 9x9, 16x16)
   - Compatible with any LLM profile
   - Learning units persist correctly

## Non-Goals

- Graphical visualization (use external tools with JSON output)
- Parallel execution (runs are sequential for consistent state)
- Cloud storage of results (local filesystem only)
- Real-time web dashboard (CLI-focused)
