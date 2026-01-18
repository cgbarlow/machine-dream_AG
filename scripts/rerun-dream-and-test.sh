#!/bin/bash
# Re-run standard baseline and dream consolidation
#
# This script:
#   1. Clears unconsolidated memories
#   2. Runs 10 puzzles in STANDARD mode (no AISP) to generate fresh experiences
#   3. Dreams with llmclusterv3 and fastclusterv3 to create learning units
#   4. Runs the long-run ABX test (skipping phases 1-2, starting from phase 3)
#
# Usage: ./scripts/rerun-dream-and-test.sh [--dry-run]

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

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

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
log "Re-run Standard Baseline + Dream Consolidation"
echo "=============================================================================="
log "Target units: $TARGET_LLM, $TARGET_FAST"
log "Log file: $LOG_FILE"
log "Dry run: $DRY_RUN"
echo ""

# Step 1: Clear unconsolidated memories to start fresh
run_cmd "Clear unconsolidated memories" \
  npx machine-dream llm memory clear --unconsolidated --confirm

# Step 2: Run standard baseline ABX test (10 puzzles, no AISP)
log "Running 10 puzzles in STANDARD mode to generate fresh experiences..."
run_cmd "Standard baseline ABX test" \
  ./scripts/abx-test.sh "$CONFIG_STANDARD" --debug

# Step 3: Dream consolidation with llmclusterv3
run_cmd "Dream consolidation (llmclusterv3)" \
  npx machine-dream llm dream run \
    --profile gpt-oss-120b \
    --algorithm llmclusterv3 \
    --learning-unit "$TARGET_LLM"

# Step 4: Dream consolidation with fastclusterv3
run_cmd "Dream consolidation (fastclusterv3)" \
  npx machine-dream llm dream run \
    --profile gpt-oss-120b \
    --algorithm fastclusterv3 \
    --learning-unit "$TARGET_FAST"

# Step 5: Run long-run ABX test (skip phases 1-2)
run_cmd "Long-run ABX test (phases 3-4)" \
  ./scripts/long-run-10x-dream-abx-test.sh --skip-phase 1,2

echo ""
log "=============================================================================="
log "✅ All steps completed successfully"
log "=============================================================================="
