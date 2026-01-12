# Scripts Overview

This directory contains batch testing, training, and utility scripts for the Machine Dream LLM Sudoku learning system.

## Training & Testing Scripts

### `training-run.sh`
Basic training script that runs multiple play sessions with learning enabled. No A/B testing or dreaming between runs - just accumulates experiences.

```bash
./scripts/training-run.sh --profile qwen3-coder --puzzle puzzles/9x9-easy.json --runs 10
```

### `iterative-learning.sh`
Runs play sessions in batches with dream consolidation after each batch. Tracks improvement over time to measure learning effectiveness.

```bash
./scripts/iterative-learning.sh --profile qwen3-coder --puzzle puzzles/4x4-expert.json --batch-size 3 --total-plays 15
```

### `ab-test-learning.sh`
A/B test comparing performance with and without learning. Runs baseline sessions first, optionally runs dream cycle, then learning sessions.

```bash
./scripts/ab-test-learning.sh --profile qwen3-coder --puzzle puzzles/4x4-expert.json --runs 10
```

### `abx-test.sh`
Multi-model A/B/X comparison script. Runs tests across multiple configurations defined in a JSON config file.

```bash
./scripts/abx-test.sh scripts/abx-config.example.json
```

### `comprehensive-test-suite.sh`
Runs all profiles through all modes (standard, aisp, aisp-full) to generate learning units. Creates both standard and doubled (-2x) learning units by default.

```bash
./scripts/comprehensive-test-suite.sh --runs 3 --puzzle puzzles/9x9-easy.json
```

### `run-full-test-pipeline.sh`
Complete end-to-end pipeline that:
1. Generates learning units via comprehensive test suite
2. Builds A/B/X configuration dynamically
3. Runs comparison tests across all configurations

```bash
./scripts/run-full-test-pipeline.sh --runs 3 --abx-runs 5
```

## Configuration Files

### `abx-config.example.json`
Example configuration for `abx-test.sh`. Defines test configurations with profiles, learning units, and options.

## Utility Scripts

### `batch-session-notes.sh`
Bulk update session notes for multiple sessions matching a profile/unit filter.

```bash
./scripts/batch-session-notes.sh --profile qwen3-coder --unit default --notes "Batch training run"
```

### `list-non-expert-sessions.sh`
Lists all sessions NOT played with 4x4-expert puzzle. Useful for filtering session data.

### `list-non-expert-sessions-simple.sh`
Simpler version of above that doesn't require `jq`.

### `inspect-storage.js`
Node.js utility to inspect AgentDB storage - counts experiences, shows recent entries with importance scores.

```bash
node scripts/inspect-storage.js
```

### `check-sessions.js`
Node.js utility to query and display session data from storage.

### `check-schema.js`
Node.js utility to verify database schema structure.

### `fix-imports.js`
Build post-processor that fixes ES module import statements in compiled JavaScript files.

## Quick Reference

| Script | Purpose |
|--------|---------|
| `training-run.sh` | Simple training runs |
| `iterative-learning.sh` | Training with periodic dreaming |
| `ab-test-learning.sh` | A/B test learning vs no-learning |
| `abx-test.sh` | Multi-config comparison from JSON |
| `comprehensive-test-suite.sh` | Generate learning units for all profiles |
| `run-full-test-pipeline.sh` | Full pipeline: train + test |
