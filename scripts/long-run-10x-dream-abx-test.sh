#!/bin/bash
# Long-running ABX test with dreaming consolidation
# Creates baseline learning units from 10-puzzle runs, then tests transfer across models
#
# Phases:
#   1. Full matrix test (uses existing 20260117 learning units)
#   2. Generate standard mode baseline (10 puzzles → dream → learning unit)
#   3. Generate aisp-full mode baseline (10 puzzles → dream → learning unit)
#   4. Comparison test (3 models × 9 configs × 3 puzzles × 3 runs = 243 runs)
#      - Per model: 3 no-learning baselines + 2 aisp-full + 2 aisp-lite + 2 standard
#
# Usage: ./scripts/long-run-10x-dream-abx-test.sh [--skip-matrix] [--skip-baselines] [--dry-run]

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# Config files
CONFIG_MATRIX="scripts/abx-configs/full-matrix-test.json"
CONFIG_STANDARD="scripts/abx-configs/gpt-oss-120b-standard-baseline.json"
CONFIG_AISP="scripts/abx-configs/gpt-oss-120b-aisp-full-baseline.json"
CONFIG_COMPARISON="scripts/abx-configs/gpt-oss-120b_qwen3-coder_deepseek-r1_baseline-comparison.json"

# Learning unit names (fixed version identifiers)
UNIT_STANDARD="gpt-oss-120b-standard-10run-baseline_20260118_1"
UNIT_AISP="gpt-oss-120b-aisp-full-10run-baseline_20260118_1"

# Logging
LOG_FILE="$PROJECT_DIR/logs/long-run-$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$(dirname "$LOG_FILE")"

# ============================================================================
# Utility Functions
# ============================================================================
log() {
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$timestamp] $*" | tee -a "$LOG_FILE"
}

log_phase() {
  echo "" | tee -a "$LOG_FILE"
  echo "==============================================================================" | tee -a "$LOG_FILE"
  log "PHASE: $*"
  echo "==============================================================================" | tee -a "$LOG_FILE"
}

log_success() {
  log "✅ $*"
}

log_error() {
  log "❌ ERROR: $*"
}

log_warning() {
  log "⚠️  WARNING: $*"
}

log_info() {
  log "ℹ️  $*"
}

check_file() {
  if [[ ! -f "$1" ]]; then
    log_error "Required file not found: $1"
    exit 1
  fi
  log_info "Found: $1"
}

run_cmd() {
  local desc="$1"
  shift
  log_info "Running: $desc"
  log_info "Command: $*"

  if [[ "$DRY_RUN" == "true" ]]; then
    log_warning "DRY RUN - skipping execution"
    return 0
  fi

  local start_time=$(date +%s)
  if "$@" 2>&1 | tee -a "$LOG_FILE"; then
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    log_success "$desc completed (${duration}s)"
    return 0
  else
    local exit_code=$?
    log_error "$desc failed with exit code $exit_code"
    return $exit_code
  fi
}

format_duration() {
  local seconds=$1
  local hours=$((seconds / 3600))
  local minutes=$(((seconds % 3600) / 60))
  local secs=$((seconds % 60))
  printf "%02d:%02d:%02d" $hours $minutes $secs
}

# ============================================================================
# Parse Arguments
# ============================================================================
SKIP_MATRIX=false
SKIP_BASELINES=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-matrix)
      SKIP_MATRIX=true
      shift
      ;;
    --skip-baselines)
      SKIP_BASELINES=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --skip-matrix     Skip phase 1 (full matrix test)"
      echo "  --skip-baselines  Skip phases 2-3 (baseline generation)"
      echo "  --dry-run         Show commands without executing"
      echo "  -h, --help        Show this help"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# ============================================================================
# Pre-flight Checks
# ============================================================================
SCRIPT_START=$(date +%s)

log_phase "PRE-FLIGHT CHECKS"
log_info "Project directory: $PROJECT_DIR"
log_info "Log file: $LOG_FILE"
log_info "Options: skip-matrix=$SKIP_MATRIX, skip-baselines=$SKIP_BASELINES, dry-run=$DRY_RUN"

echo "" | tee -a "$LOG_FILE"
log_info "Checking required config files..."
check_file "$CONFIG_MATRIX"
check_file "$CONFIG_STANDARD"
check_file "$CONFIG_AISP"
check_file "$CONFIG_COMPARISON"

echo "" | tee -a "$LOG_FILE"
log_info "Checking required puzzle files..."
for puzzle in puzzles/batch/9x9-easy/9x9-easy-{001..010}.json; do
  if [[ ! -f "$puzzle" ]]; then
    log_error "Missing puzzle: $puzzle"
    exit 1
  fi
done
log_success "All 10 baseline puzzles found"

# Check comparison puzzles
for puzzle in puzzles/batch/9x9-easy/9x9-easy-{011..013}.json; do
  if [[ ! -f "$puzzle" ]]; then
    log_warning "Missing comparison puzzle: $puzzle (will fail in phase 4)"
  fi
done

echo "" | tee -a "$LOG_FILE"
log_info "Checking abx-test.sh script..."
check_file "scripts/abx-test.sh"
if [[ ! -x "scripts/abx-test.sh" ]]; then
  log_warning "scripts/abx-test.sh is not executable, fixing..."
  chmod +x scripts/abx-test.sh
fi

log_success "Pre-flight checks passed"

# ============================================================================
# Phase 1: Full Matrix Test
# ============================================================================
if [[ "$SKIP_MATRIX" == "true" ]]; then
  log_phase "PHASE 1: FULL MATRIX TEST [SKIPPED]"
else
  log_phase "PHASE 1: FULL MATRIX TEST"
  log_info "Testing all profiles with existing 20260117 learning units"
  log_info "This validates the test infrastructure before long baseline runs"

  PHASE1_START=$(date +%s)

  run_cmd "Clear unconsolidated memories" \
    npx machine-dream llm memory clear --unconsolidated --confirm

  run_cmd "Full matrix ABX test" \
    ./scripts/abx-test.sh "$CONFIG_MATRIX" --debug

  PHASE1_END=$(date +%s)
  log_success "Phase 1 completed in $(format_duration $((PHASE1_END - PHASE1_START)))"
fi

# ============================================================================
# Phase 2: Standard Mode Baseline Generation
# ============================================================================
if [[ "$SKIP_BASELINES" == "true" ]]; then
  log_phase "PHASE 2: STANDARD MODE BASELINE [SKIPPED]"
else
  log_phase "PHASE 2: STANDARD MODE BASELINE"
  log_info "Running 10 puzzles without learning to generate experiences"
  log_info "Then dreaming to create: $UNIT_STANDARD"

  PHASE2_START=$(date +%s)

  run_cmd "Clear unconsolidated memories" \
    npx machine-dream llm memory clear --unconsolidated --confirm

  run_cmd "Standard baseline ABX test (10 puzzles)" \
    ./scripts/abx-test.sh "$CONFIG_STANDARD" --debug

  run_cmd "Dream consolidation (standard mode)" \
    npx machine-dream llm dream run --profile gpt-oss-120b --learning-unit "$UNIT_STANDARD" --debug

  PHASE2_END=$(date +%s)
  log_success "Phase 2 completed in $(format_duration $((PHASE2_END - PHASE2_START)))"

  # Verify learning unit was created
  if [[ "$DRY_RUN" != "true" ]]; then
    if npx machine-dream llm learning list 2>&1 | grep -q "$UNIT_STANDARD"; then
      log_success "Learning unit created: $UNIT_STANDARD"
    else
      log_error "Learning unit not found: $UNIT_STANDARD"
      exit 1
    fi
  fi
fi

# ============================================================================
# Phase 3: AISP-Full Mode Baseline Generation
# ============================================================================
if [[ "$SKIP_BASELINES" == "true" ]]; then
  log_phase "PHASE 3: AISP-FULL MODE BASELINE [SKIPPED]"
else
  log_phase "PHASE 3: AISP-FULL MODE BASELINE"
  log_info "Running 10 puzzles with --aisp-full to generate experiences"
  log_info "Then dreaming to create: $UNIT_AISP"

  PHASE3_START=$(date +%s)

  run_cmd "Clear unconsolidated memories" \
    npx machine-dream llm memory clear --unconsolidated --confirm

  run_cmd "AISP-full baseline ABX test (10 puzzles)" \
    ./scripts/abx-test.sh "$CONFIG_AISP" --debug

  run_cmd "Dream consolidation (aisp-full mode)" \
    npx machine-dream llm dream run --profile gpt-oss-120b --aisp-full --learning-unit "$UNIT_AISP" --debug

  PHASE3_END=$(date +%s)
  log_success "Phase 3 completed in $(format_duration $((PHASE3_END - PHASE3_START)))"

  # Verify learning unit was created
  if [[ "$DRY_RUN" != "true" ]]; then
    if npx machine-dream llm learning list 2>&1 | grep -q "$UNIT_AISP"; then
      log_success "Learning unit created: $UNIT_AISP"
    else
      log_error "Learning unit not found: $UNIT_AISP"
      exit 1
    fi
  fi
fi

# ============================================================================
# Phase 4: Multi-Model Comparison Test
# ============================================================================
log_phase "PHASE 4: MULTI-MODEL COMPARISON TEST"
log_info "Testing 3 models (gpt-oss-120b, qwen3-coder, deepseek-r1)"
log_info "27 configs total: 9 per model (3 no-learning + 2 aisp-full + 2 aisp-lite + 2 standard)"
log_info "3 puzzles × 3 runs per config = 243 total runs"
log_info "Using baseline learning units: $UNIT_STANDARD, $UNIT_AISP (+ -2x variants)"

PHASE4_START=$(date +%s)

# Verify learning units exist before starting (skip in dry-run)
if [[ "$DRY_RUN" != "true" ]]; then
  log_info "Verifying learning units..."
  for unit in "$UNIT_STANDARD" "${UNIT_STANDARD}-2x" "$UNIT_AISP" "${UNIT_AISP}-2x"; do
    if npx machine-dream llm learning list 2>&1 | grep -q "$unit"; then
      log_success "Found: $unit"
    else
      log_error "Missing learning unit: $unit"
      log_error "Run phases 2-3 first to create baseline units"
      exit 1
    fi
  done
else
  log_warning "DRY RUN - skipping learning unit verification"
fi

run_cmd "Multi-model comparison ABX test" \
  ./scripts/abx-test.sh "$CONFIG_COMPARISON" --debug

PHASE4_END=$(date +%s)
log_success "Phase 4 completed in $(format_duration $((PHASE4_END - PHASE4_START)))"

# ============================================================================
# Summary
# ============================================================================
SCRIPT_END=$(date +%s)
TOTAL_DURATION=$((SCRIPT_END - SCRIPT_START))

log_phase "SUMMARY"
log_info "Total runtime: $(format_duration $TOTAL_DURATION)"
log_info "Log file: $LOG_FILE"
echo "" | tee -a "$LOG_FILE"

if [[ "$SKIP_MATRIX" != "true" ]]; then
  log_info "Phase 1 (Full Matrix): Completed"
fi
if [[ "$SKIP_BASELINES" != "true" ]]; then
  log_info "Phase 2 (Standard Baseline): Created $UNIT_STANDARD"
  log_info "Phase 3 (AISP Baseline): Created $UNIT_AISP"
fi
log_info "Phase 4 (Comparison): Completed"

echo "" | tee -a "$LOG_FILE"
log_success "Long-run ABX test completed successfully!"
echo "" | tee -a "$LOG_FILE"
log_info "Results can be found in the abx-results/ directory"
log_info "Learning units available for future tests:"
log_info "  - $UNIT_STANDARD"
log_info "  - ${UNIT_STANDARD}-2x"
log_info "  - $UNIT_AISP"
log_info "  - ${UNIT_AISP}-2x"
