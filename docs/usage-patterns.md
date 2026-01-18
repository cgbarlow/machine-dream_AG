# Usage Patterns Guide

Comprehensive patterns for Machine Dream's LLM dreaming and learning unit workflows.

---

## Table of Contents

1. [Basic Dreaming Workflow](#basic-dreaming-workflow)
2. [Multi-Algorithm Dreaming](#multi-algorithm-dreaming)
3. [Learning Unit Management](#learning-unit-management)
4. [Re-running Consolidation](#re-running-consolidation)
5. [Experience Management](#experience-management)
6. [Dual Mode (Standard + 2x)](#dual-mode-standard--2x)
7. [Named Learning Units](#named-learning-units)
8. [A/B Testing Workflows](#ab-testing-workflows)
9. [Troubleshooting](#troubleshooting)

---

## Basic Dreaming Workflow

### Generate Experiences → Dream → Use Learning

```bash
# Step 1: Generate experiences by playing puzzles
machine-dream llm play puzzles/9x9-easy.json --profile gpt-oss-120b

# Step 2: Consolidate experiences into learning unit
machine-dream llm dream run --profile gpt-oss-120b

# Step 3: Play with learned strategies
machine-dream llm play puzzles/9x9-easy.json --learning-unit gpt-oss-120b_standard_fastclusterv3_20260119_1
```

### Play + Dream in One Command

```bash
# Auto-consolidate after play session
machine-dream llm play --profile gpt-oss-120b --dream puzzles/9x9-easy.json
```

---

## Multi-Algorithm Dreaming

### Default: All Algorithms

By default, `dream run` uses all registered algorithms (fastclusterv2, fastclusterv3, llmclusterv3):

```bash
machine-dream llm dream run --profile gpt-oss-120b
# Creates 6 learning units (3 algorithms × 2 modes each)
```

### Specific Algorithm

```bash
# Use only llmclusterv3
machine-dream llm dream run --profile gpt-oss-120b --algorithm llmclusterv3
```

### Multiple Specific Algorithms

```bash
# Use only llmclusterv3 and fastclusterv3
machine-dream llm dream run --profile gpt-oss-120b --algorithms llmclusterv3,fastclusterv3
```

### Exclude Algorithms

```bash
# Exclude deepcluster (slow)
machine-dream llm dream run --profile gpt-oss-120b --exclude-algorithms deepcluster
```

---

## Learning Unit Management

### List Learning Units

```bash
# List all units for active profile
machine-dream llm learning list

# List with sorting
machine-dream llm learning list --sort created --reverse
```

### Show Unit Details

```bash
machine-dream llm learning show gpt-oss-120b_standard_llmclusterv3_20260118_1
```

### Clone a Learning Unit

Create a backup or experimental copy:

```bash
machine-dream llm learning clone \
  gpt-oss-120b_standard_llmclusterv3_20260118_1 \
  gpt-oss-120b_standard_llmclusterv3_20260118_1_backup
```

### Delete a Learning Unit

```bash
machine-dream llm learning delete gpt-oss-120b_standard_llmclusterv3_20260118_1 --confirm
```

---

## Re-running Consolidation

### Basic Re-run

Re-run dreaming using experiences from an existing learning unit:

```bash
machine-dream llm dream run \
  --rerun gpt-oss-120b_standard_llmclusterv3_20260118_1 \
  --debug
```

The `--rerun` flag:
1. Loads the specified learning unit
2. Marks its absorbed experiences as unconsolidated
3. Filters processing to only those experiences
4. Infers profile and mode from the unit ID

### Re-run with Different Algorithm

```bash
machine-dream llm dream run \
  --rerun gpt-oss-120b_standard_llmclusterv3_20260118_1 \
  --algorithm fastclusterv3 \
  --debug
```

### Re-run with Fixed Learning Unit Name

Specify an exact learning unit name instead of auto-generated:

```bash
machine-dream llm dream run \
  --rerun gpt-oss-120b_standard_llmclusterv3_20260118_1 \
  --algorithm llmclusterv3 \
  --learning-unit gpt-oss-120b_standard_llmclusterv3_20260118_1 \
  --debug
```

---

## Experience Management

### View Unconsolidated Experiences

```bash
# List unconsolidated experiences
machine-dream llm memory list --unconsolidated

# Show count only
machine-dream llm memory list --unconsolidated --limit 1
```

### Clear Unconsolidated Experiences

```bash
machine-dream llm memory clear --unconsolidated --confirm
```

### Unconsolidate from Learning Unit

Restore experiences from a learning unit back to the global unconsolidated pool:

```bash
machine-dream llm learning unconsolidate gpt-oss-120b_standard_llmclusterv3_20260118_1 --yes
```

This is useful when:
- You want to re-dream with different algorithms
- The original experiences were consumed but you need them back
- You want to create multiple learning units from the same experience set

### Preserve Experiences for Multi-Algorithm Runs

Use `--preserve-experiences` to keep original experiences after absorption:

```bash
# First algorithm - preserve for next run
machine-dream llm dream run \
  --profile gpt-oss-120b \
  --algorithm llmclusterv3 \
  --preserve-experiences

# Second algorithm - still has access to experiences
machine-dream llm dream run \
  --profile gpt-oss-120b \
  --algorithm fastclusterv3 \
  --preserve-experiences

# Final algorithm - consume experiences
machine-dream llm dream run \
  --profile gpt-oss-120b \
  --algorithm deepclusterv3
```

---

## Dual Mode (Standard + 2x)

### Default Behavior

By default, `dream run` creates BOTH standard (3-5 strategies) and doubled (6-10 strategies) units:

```bash
machine-dream llm dream run --profile gpt-oss-120b
# Creates:
#   gpt-oss-120b_standard_fastclusterv3_20260119_1     (3-5 strategies)
#   gpt-oss-120b_standard_fastclusterv3_20260119_1-2x  (6-10 strategies)
```

### Disable Dual Mode

Create only standard unit:

```bash
machine-dream llm dream run --profile gpt-oss-120b --no-dual-unit
```

### Create Only Doubled Unit

```bash
machine-dream llm dream run --profile gpt-oss-120b --double-strategies --no-dual-unit
```

### How Dual Mode Works

Dual consolidation uses **shared clustering**:
1. Clustering runs ONCE using doubled targets (for maximum pattern diversity)
2. Phase 1: Select 3-5 strategies → standard unit
3. Phase 2: Select 6-10 strategies → 2x unit

Both units use the same patterns, ensuring consistent coverage.

---

## Named Learning Units

### Auto-Generated Names

Default naming convention: `{profile}_{mode}_{algorithm}_{date}_{N}[-2x]`

Example: `gpt-oss-120b_standard_llmclusterv3_20260119_1`

### Custom Names

Specify exact unit name with `--learning-unit`:

```bash
machine-dream llm dream run \
  --profile gpt-oss-120b \
  --algorithm llmclusterv3 \
  --learning-unit my-custom-unit
# Creates: my-custom-unit and my-custom-unit-2x
```

### Recreate Unit with Same Name

To recreate a unit with the same name (e.g., after fixing bugs):

```bash
# Step 1: Restore experiences from existing unit
machine-dream llm learning unconsolidate gpt-oss-120b_standard_llmclusterv3_20260118_1 --yes

# Step 2: Dream with explicit unit name (overwrites existing)
machine-dream llm dream run \
  --profile gpt-oss-120b \
  --algorithm llmclusterv3 \
  --learning-unit gpt-oss-120b_standard_llmclusterv3_20260118_1 \
  --debug
```

---

## A/B Testing Workflows

### Create 4 Units from Same Experiences

Create standard and 2x units for two algorithms from the same 372 experiences:

```bash
# Step 1: Restore experiences to global pool
npx machine-dream llm learning unconsolidate gpt-oss-120b_standard_llmclusterv3_20260118_1 --yes

# Step 2: Create llmclusterv3 units (preserve for next algorithm)
npx machine-dream llm dream run \
  --profile gpt-oss-120b \
  --algorithm llmclusterv3 \
  --learning-unit gpt-oss-120b_standard_llmclusterv3_20260118_1 \
  --preserve-experiences \
  --debug

# Step 3: Create fastclusterv3 units (consume experiences)
npx machine-dream llm dream run \
  --profile gpt-oss-120b \
  --algorithm fastclusterv3 \
  --learning-unit gpt-oss-120b_standard_fastclusterv3_20260118_1 \
  --debug
```

Result:
- `gpt-oss-120b_standard_llmclusterv3_20260118_1` (3-5 strategies)
- `gpt-oss-120b_standard_llmclusterv3_20260118_1-2x` (6-10 strategies)
- `gpt-oss-120b_standard_fastclusterv3_20260118_1` (3-5 strategies)
- `gpt-oss-120b_standard_fastclusterv3_20260118_1-2x` (6-10 strategies)

### One-Liner Version

```bash
npx machine-dream llm learning unconsolidate gpt-oss-120b_standard_llmclusterv3_20260118_1 --yes && npx machine-dream llm dream run --profile gpt-oss-120b --algorithm llmclusterv3 --learning-unit gpt-oss-120b_standard_llmclusterv3_20260118_1 --preserve-experiences --debug && npx machine-dream llm dream run --profile gpt-oss-120b --algorithm fastclusterv3 --learning-unit gpt-oss-120b_standard_fastclusterv3_20260118_1 --debug
```

### Run ABX Tests on Multiple Units

```bash
./scripts/abx-test.sh scripts/abx-configs/compare-algorithms.json --debug
```

---

## Troubleshooting

### "No unconsolidated experiences to process"

**Cause**: Experiences were consumed by a previous dream run.

**Solution**: Unconsolidate from the learning unit that absorbed them:

```bash
# Check which unit has the experiences
machine-dream llm learning show <unit-id>
# Look for "Absorbed by unit: N"

# Restore experiences
machine-dream llm learning unconsolidate <unit-id> --yes
```

### "Marked 0 experiences as unconsolidated" with --rerun

**Cause**: Experiences exist in unit-specific storage, not global storage.

**Solution**: Use `unconsolidate` command first:

```bash
# Instead of:
machine-dream llm dream run --rerun <unit-id>

# Do this:
machine-dream llm learning unconsolidate <unit-id> --yes
machine-dream llm dream run --profile <profile> --algorithm <algo> --learning-unit <unit-id>
```

### 2x Unit Has Fewer Strategies Than Expected

**Cause**: In older versions, dual mode ran clustering twice independently.

**Solution**: Update to latest version. The fix ensures shared clustering:
- Both standard and 2x units now use the same patterns
- 2x unit is guaranteed to have more strategies (superset)

### Learning Unit Not Found

**Cause**: Unit ID may have changed due to algorithm versioning.

**Solution**: List units and use exact ID:

```bash
machine-dream llm learning list
# Copy exact unit ID from output
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Play + auto-dream | `machine-dream llm play --dream <puzzle>` |
| Dream all algorithms | `machine-dream llm dream run` |
| Dream specific algorithm | `machine-dream llm dream run --algorithm llmclusterv3` |
| List learning units | `machine-dream llm learning list` |
| Show unit details | `machine-dream llm learning show <unit-id>` |
| Clone unit | `machine-dream llm learning clone <src> <dest>` |
| Restore experiences | `machine-dream llm learning unconsolidate <unit-id> --yes` |
| Delete unit | `machine-dream llm learning delete <unit-id> --confirm` |
| Re-run from unit | `machine-dream llm dream run --rerun <unit-id>` |
| Preserve experiences | `machine-dream llm dream run --preserve-experiences` |
| Single unit only | `machine-dream llm dream run --no-dual-unit` |
| Custom unit name | `machine-dream llm dream run --learning-unit <name>` |
| Clear unconsolidated | `machine-dream llm memory clear --unconsolidated --confirm` |

---

## See Also

- [CLI Reference](cli-reference.md) — Complete command documentation
- [User Guide](USER_GUIDE.md) — Getting started guide
- [Spec 05: Dreaming Pipeline](specs/05-dreaming-pipeline-spec.md) — Technical specification
- [Spec 11: LLM Integration](specs/11-llm-sudoku-player.md) — Learning unit details
- [Scripts Guide](../scripts/SCRIPTS.md) — Batch testing workflows
