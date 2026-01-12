# Scripts Overview

This directory contains batch testing, training, and utility scripts for the Machine Dream LLM Sudoku learning system.

## Recent Improvements (2026-01-13)

✅ **Smart Model Loading** - Scripts now detect models in "loading" state and wait instead of triggering unnecessary unload/reload
✅ **Live Move Output** - `--visualize-basic` flag shows compact move-by-move results in all test scripts
✅ **Profile Exclusion** - Use `--exclude` to skip specific profiles during testing
✅ **Size-Based Ordering** - Profiles automatically tested in order from largest to smallest model
✅ **Parse Failure Display** - Parse errors now correctly increment move counter and show in output
✅ **New Validation Script** - `batch-test-learning-unit.sh` for testing specific learning units without dream cycle

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

**Features:**
- Tests profiles in size order (largest first) based on tags
- Creates dual learning units: standard (3-5 strategies) and -2x (6-10 strategies)
- Shows live move-by-move output with `--visualize-basic`
- Smart model loading (detects already-loaded models, waits for loading state)
- Profile exclusion support

**Options:**
- `--runs <n>` - Runs per mode (default: 3)
- `--puzzle <path>` - Puzzle file (default: puzzles/9x9-easy.json)
- `--profiles <list>` - Comma-separated list of profiles (default: all)
- `--exclude <list>` - Comma-separated profiles to exclude
- `--no-dual` - Disable dual mode (only create standard units)
- `--no-save-reasoning` - Disable full reasoning storage
- `--skip-dream` - Skip dreaming consolidation

```bash
# Test all profiles
./scripts/comprehensive-test-suite.sh --runs 3

# Test specific profiles, exclude one
./scripts/comprehensive-test-suite.sh --profiles gpt-oss-120b,qwq-32b --exclude deepseek-r1

# Disable dual mode
./scripts/comprehensive-test-suite.sh --no-dual --skip-dream
```

### `batch-test-learning-unit.sh`
Test multiple profiles using specific learning units without dream consolidation. Perfect for validation runs comparing different learning units.

**Features:**
- Profile-specific learning units (each profile can use its own unit)
- No dream cycle (pure testing/validation)
- Tests profiles in size order (largest first)
- Shows live move-by-move output with `--visualize-basic`
- Multiple mode support (standard, aisp, aisp-full)
- Smart model loading

**Options:**
- `--profiles <list>` - **REQUIRED** Comma-separated profile:unit pairs (format: profile1:unit1,profile2:unit2)
- `--runs <n>` - Runs per profile (default: 3)
- `--puzzle <path>` - Puzzle file (default: puzzles/9x9-easy.json)
- `--modes <list>` - Comma-separated modes (default: standard)
- `--exclude <list>` - Comma-separated profiles to exclude
- `--no-save-reasoning` - Disable full reasoning storage

```bash
# Test two profiles with their own learning units
./scripts/batch-test-learning-unit.sh \
  --profiles gpt-oss-120b:unit1,qwq-32b:unit2 \
  --runs 5

# Compare standard vs -2x units for same profile
./scripts/batch-test-learning-unit.sh \
  --profiles gpt-oss:unit_standard,gpt-oss:unit_standard-2x \
  --runs 10

# Test with multiple modes
./scripts/batch-test-learning-unit.sh \
  --profiles qwq:unit1,nemotron:unit2 \
  --modes standard,aisp,aisp-full
```

**Output:**
- Creates `batch-results/<timestamp>/` directory
- Generates `summary.csv` with Profile, LearningUnit, Mode, Runs, Solved, Rate
- Saves individual run logs

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

| Script | Purpose | Use Case |
|--------|---------|----------|
| `training-run.sh` | Simple training runs | Basic experience collection |
| `iterative-learning.sh` | Training with periodic dreaming | Iterative improvement tracking |
| `ab-test-learning.sh` | A/B test learning vs no-learning | Measure learning effectiveness |
| `abx-test.sh` | Multi-config comparison from JSON | Compare multiple configurations |
| `comprehensive-test-suite.sh` | Generate learning units for all profiles | Initial training + dual unit creation |
| `batch-test-learning-unit.sh` | Test specific learning units | Validation runs, unit comparison |
| `run-full-test-pipeline.sh` | Full pipeline: train + test | Complete workflow automation |

## Typical Workflows

### 1. Initial Training & Validation
```bash
# Step 1: Generate learning units for all profiles
./scripts/comprehensive-test-suite.sh --runs 3

# Step 2: Compare standard vs doubled units
./scripts/batch-test-learning-unit.sh \
  --profiles gpt-oss:gpt-oss_9x9-easy_standard_20260113,gpt-oss:gpt-oss_9x9-easy_standard_20260113-2x \
  --runs 10
```

### 2. Cross-Profile Comparison
```bash
# Test multiple profiles with their best units
./scripts/batch-test-learning-unit.sh \
  --profiles gpt-oss-120b:unit1,qwq-32b:unit2,nemotron:unit3 \
  --runs 5 \
  --modes standard,aisp
```

### 3. Full Pipeline
```bash
# Train and automatically compare all configurations
./scripts/run-full-test-pipeline.sh --runs 3 --abx-runs 10
```

## Output Directories

Different scripts save results to different directories:

| Script | Output Directory | Contents |
|--------|-----------------|----------|
| `comprehensive-test-suite.sh` | `comprehensive-results/<timestamp>/` | Training logs, dream logs, summary.csv |
| `batch-test-learning-unit.sh` | `batch-results/<timestamp>/` | Validation logs, summary.csv |
| `ab-test-learning.sh` | `ab-results/<timestamp>/` | Baseline & learning logs, comparison |
| `abx-test.sh` | `abx-results/<timestamp>/` | Per-config logs, summary.csv |
| `run-full-test-pipeline.sh` | Multiple (comprehensive + abx) | Combined results |

All scripts generate a `summary.csv` for easy analysis and comparison.
