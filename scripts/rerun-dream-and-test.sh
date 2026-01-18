#!/bin/bash
# Re-run dream consolidation and ABX testing
#
# This script supports multiple modes:
#
# Default (fresh start):
#   1. Clears unconsolidated memories
#   2. Runs 10 puzzles in STANDARD mode to generate fresh experiences
#   3. Dreams with llmclusterv3 and fastclusterv3 to create learning units
#   4. Runs the long-run ABX test (phases 3-4)
#
# With --skip-baseline (use existing experiences):
#   1. Skips clearing memories and baseline generation
#   2. Dreams on existing unconsolidated experiences
#   3. Runs the long-run ABX test (phases 3-4)
#
# With --dreams-only (just consolidate, no testing):
#   1. Dreams on existing unconsolidated experiences
#   2. Does NOT run ABX tests
#
# Usage:
#   ./scripts/rerun-dream-and-test.sh [options]
#
# Options:
#   --skip-baseline    Skip clearing memories and baseline generation, use existing experiences
#   --dreams-only      Only run dream consolidation (no ABX tests)
#   --dry-run          Show what would be done without executing
#   --help             Show this help message

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# Config for standard baseline
CONFIG_STANDARD="scripts/abx-configs/gpt-oss-120b-standard-baseline.json"

# Target learning units (new consolidated units)
TARGET_LLM="gpt-oss-120b_standard_llmclusterv3_20260118_1"
TARGET_FAST="gpt-oss-120b_standard_fastclusterv3_20260118_1"

# Logging
LOG_FILE="$PROJECT_DIR/logs/rerun-dream-$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$(dirname "$LOG_FILE")"

# Parse arguments
DRY_RUN=false
SKIP_BASELINE=false
DREAMS_ONLY=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --skip-baseline)
      SKIP_BASELINE=true
      shift
      ;;
    --dreams-only)
      DREAMS_ONLY=true
      SKIP_BASELINE=true  # dreams-only implies skip-baseline
      shift
      ;;
    --help|-h)
      head -28 "$0" | tail -27
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

log() {
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$timestamp] $*" | tee -a "$LOG_FILE"
}

run_cmd() {
  local desc="$1"
  shift
  log "Running: $desc"
  log "Command: $*"

  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY RUN - skipping execution"
    return 0
  fi

  if "$@" 2>&1 | tee -a "$LOG_FILE"; then
    log "✅ $desc completed"
  else
    log "❌ $desc failed"
    exit 1
  fi
}

echo "=============================================================================="
log "Re-run Dream Consolidation"
echo "=============================================================================="
log "Target units: $TARGET_LLM, $TARGET_FAST"
log "Log file: $LOG_FILE"
log "Options: dry_run=$DRY_RUN, skip_baseline=$SKIP_BASELINE, dreams_only=$DREAMS_ONLY"
echo ""

# Check for existing experiences if skipping baseline
if [[ "$SKIP_BASELINE" == "true" ]]; then
  log "Checking for existing unconsolidated experiences..."
  EXP_COUNT=$(npx machine-dream llm memory list --unconsolidated --limit 1 2>/dev/null | grep -oP 'Showing \d+ of \K\d+' || echo "0")
  log "Found $EXP_COUNT unconsolidated experiences"

  if [[ "$EXP_COUNT" -eq 0 ]]; then
    log "❌ No unconsolidated experiences found. Run without --skip-baseline to generate fresh experiences."
    exit 1
  fi

  if [[ "$EXP_COUNT" -lt 100 ]]; then
    log "⚠️  Warning: Only $EXP_COUNT experiences found (expected 300+)"
  fi
fi

if [[ "$SKIP_BASELINE" == "false" ]]; then
  # Step 1: Clear unconsolidated memories to start fresh
  run_cmd "Clear unconsolidated memories" \
    npx machine-dream llm memory clear --unconsolidated --confirm

  # Step 2: Run standard baseline ABX test (10 puzzles, no AISP)
  log "Running 10 puzzles in STANDARD mode to generate fresh experiences..."
  run_cmd "Standard baseline ABX test" \
    ./scripts/abx-test.sh "$CONFIG_STANDARD" --debug
else
  log "Skipping baseline generation (--skip-baseline), using existing $EXP_COUNT experiences"
fi

# Step 3: Dream consolidation with llmclusterv3
# Use --preserve-experiences so fastclusterv3 can also consolidate the same experiences
run_cmd "Dream consolidation (llmclusterv3)" \
  npx machine-dream llm dream run \
    --profile gpt-oss-120b \
    --algorithm llmclusterv3 \
    --learning-unit "$TARGET_LLM" \
    --preserve-experiences

# Step 4: Dream consolidation with fastclusterv3
# Final consolidation - consumes experiences (no --preserve-experiences)
run_cmd "Dream consolidation (fastclusterv3)" \
  npx machine-dream llm dream run \
    --profile gpt-oss-120b \
    --algorithm fastclusterv3 \
    --learning-unit "$TARGET_FAST"

if [[ "$DREAMS_ONLY" == "false" ]]; then
  # Step 5: Run long-run ABX test (skip phases 1-2)
  run_cmd "Long-run ABX test (phases 3-4)" \
    ./scripts/long-run-10x-dream-abx-test.sh --skip-phase 1,2
else
  log "Skipping ABX tests (--dreams-only)"
fi

echo ""
log "=============================================================================="
log "✅ All steps completed successfully"
log "=============================================================================="
