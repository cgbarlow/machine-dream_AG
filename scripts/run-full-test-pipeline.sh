#!/bin/bash
# Full Test Pipeline
# Specification: docs/specs/15-batch-testing-spec.md
#
# Runs the complete test pipeline:
# 1. Comprehensive test suite to generate learning units
# 2. A/B/X comparison using generated units
#
# Usage: ./scripts/run-full-test-pipeline.sh [options]
#   --runs <n>           Training runs per mode (default: 3)
#   --puzzle <path>      Puzzle for training (default: 9x9-easy)
#   --abx-runs <n>       A/B/X comparison runs (default: 5)
#   --abx-puzzle <path>  Puzzle for comparison (default: same as training)
#   --no-dual            Disable dual unit generation (default: creates BOTH standard and -2x)
#   --save-reasoning     Store full reasoning tokens
#   --skip-training      Skip training phase (use existing units)
#   --skip-abx           Skip A/B/X comparison phase
#   --profiles <list>    Comma-separated list of profiles
#   -h, --help           Show help

set -e

# Defaults
TRAINING_RUNS=3
TRAINING_PUZZLE="puzzles/9x9-easy.json"
ABX_RUNS=5
ABX_PUZZLE=""  # Default: same as training
NO_DUAL=""
SAVE_REASONING=""
SKIP_TRAINING=false
SKIP_ABX=false
PROFILE_FILTER=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --runs) TRAINING_RUNS="$2"; shift 2 ;;
    --puzzle) TRAINING_PUZZLE="$2"; shift 2 ;;
    --abx-runs) ABX_RUNS="$2"; shift 2 ;;
    --abx-puzzle) ABX_PUZZLE="$2"; shift 2 ;;
    --no-dual) NO_DUAL="--no-dual"; shift ;;
    --save-reasoning) SAVE_REASONING="--save-reasoning"; shift ;;
    --skip-training) SKIP_TRAINING=true; shift ;;
    --skip-abx) SKIP_ABX=true; shift ;;
    --profiles) PROFILE_FILTER="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --runs <n>           Training runs per mode (default: 3)"
      echo "  --puzzle <path>      Puzzle for training (default: puzzles/9x9-easy.json)"
      echo "  --abx-runs <n>       A/B/X comparison runs (default: 5)"
      echo "  --abx-puzzle <path>  Puzzle for comparison (default: same as training)"
      echo "  --no-dual            Disable dual unit generation (default: creates BOTH standard and -2x)"
      echo "  --save-reasoning     Store full reasoning tokens"
      echo "  --skip-training      Skip training phase (use existing units)"
      echo "  --skip-abx           Skip A/B/X comparison phase"
      echo "  --profiles <list>    Comma-separated list of profiles (default: all)"
      echo "  -h, --help           Show help"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Default ABX puzzle to training puzzle if not specified
ABX_PUZZLE="${ABX_PUZZLE:-$TRAINING_PUZZLE}"

# Extract puzzle name from path (e.g., "puzzles/9x9-easy.json" -> "9x9-easy")
PUZZLE_NAME=$(basename "$TRAINING_PUZZLE" .json)

# Get current date in YYYYMMDD format
DATE_STR=$(date +%Y%m%d)

RESULTS_DIR="./pipeline-results/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo "=============================================="
echo "Full Test Pipeline"
echo "=============================================="
echo "Training runs: $TRAINING_RUNS"
echo "Training puzzle: $TRAINING_PUZZLE"
echo "A/B/X runs: $ABX_RUNS"
echo "A/B/X puzzle: $ABX_PUZZLE"
if [[ -n "$NO_DUAL" ]]; then echo "Dual mode: disabled"; else echo "Dual mode: enabled (default)"; fi
if [[ -n "$SAVE_REASONING" ]]; then echo "Save reasoning: enabled"; else echo "Save reasoning: disabled"; fi
echo "Skip training: $SKIP_TRAINING"
echo "Skip A/B/X: $SKIP_ABX"
echo "Results: $RESULTS_DIR"
echo "=============================================="
echo ""

# ============================================
# PHASE 1: Generate Learning Units
# ============================================
if [[ "$SKIP_TRAINING" != "true" ]]; then
  echo ""
  echo "=============================================="
  echo ">>> PHASE 1: Generating Learning Units"
  echo "=============================================="
  echo ""

  TRAINING_OPTS=""
  [[ -n "$NO_DUAL" ]] && TRAINING_OPTS="$TRAINING_OPTS --no-dual"
  [[ -n "$SAVE_REASONING" ]] && TRAINING_OPTS="$TRAINING_OPTS --save-reasoning"
  [[ -n "$PROFILE_FILTER" ]] && TRAINING_OPTS="$TRAINING_OPTS --profiles $PROFILE_FILTER"

  ./scripts/comprehensive-test-suite.sh \
    --runs "$TRAINING_RUNS" \
    --puzzle "$TRAINING_PUZZLE" \
    $TRAINING_OPTS \
    2>&1 | tee "$RESULTS_DIR/phase1-training.log"

  # Copy comprehensive results
  LATEST_COMPREHENSIVE=$(ls -td ./comprehensive-results/*/ 2>/dev/null | head -1)
  if [[ -n "$LATEST_COMPREHENSIVE" && -d "$LATEST_COMPREHENSIVE" ]]; then
    cp -r "$LATEST_COMPREHENSIVE" "$RESULTS_DIR/comprehensive-results/"
  fi
else
  echo ""
  echo "=============================================="
  echo ">>> PHASE 1: SKIPPED (using existing units)"
  echo "=============================================="
  echo ""
fi

# ============================================
# PHASE 2: Generate A/B/X Config
# ============================================
if [[ "$SKIP_ABX" != "true" ]]; then
  echo ""
  echo "=============================================="
  echo ">>> PHASE 2: Generating A/B/X Configuration"
  echo "=============================================="
  echo ""

  # Get all profiles (or filtered list)
  if [[ -n "$PROFILE_FILTER" ]]; then
    PROFILES=$(echo "$PROFILE_FILTER" | tr ',' ' ')
  else
    PROFILES=$(npx machine-dream llm profile list --format json 2>/dev/null | jq -r '.[].name' | tr '\n' ' ')
  fi

  if [[ -z "$PROFILES" ]]; then
    echo "WARNING: No profiles found. Skipping A/B/X phase."
    SKIP_ABX=true
  else
    echo "Profiles: $PROFILES"

    # Build configurations array dynamically
    CONFIG_FILE="$RESULTS_DIR/abx-config.json"

    cat > "$CONFIG_FILE" << EOF
{
  "testName": "Full Pipeline Comparison - $(date +%Y-%m-%d)",
  "runsPerConfig": $ABX_RUNS,
  "puzzles": ["$ABX_PUZZLE"],
  "configurations": [
EOF

    FIRST=true
    for PROFILE in $PROFILES; do
      # Determine which modes to test (dual mode is default, -2x units always created)
      if [[ -n "$NO_DUAL" ]]; then
        MODES="baseline standard aisp aisp-full"
      else
        MODES="baseline standard standard-2x aisp aisp-2x aisp-full aisp-full-2x"
      fi

      for MODE in $MODES; do
        # Build unit name and options based on mode
        case "$MODE" in
          "baseline")
            UNIT="null"
            OPTS='[]'
            ;;
          "standard")
            UNIT="\"${PROFILE}_${PUZZLE_NAME}_standard_${DATE_STR}\""
            OPTS='[]'
            ;;
          "standard-2x")
            UNIT="\"${PROFILE}_${PUZZLE_NAME}_standard_${DATE_STR}-2x\""
            OPTS='[]'
            ;;
          "aisp")
            UNIT="\"${PROFILE}_${PUZZLE_NAME}_aisp_${DATE_STR}\""
            OPTS='["--aisp"]'
            ;;
          "aisp-2x")
            UNIT="\"${PROFILE}_${PUZZLE_NAME}_aisp_${DATE_STR}-2x\""
            OPTS='["--aisp"]'
            ;;
          "aisp-full")
            UNIT="\"${PROFILE}_${PUZZLE_NAME}_aisp-full_${DATE_STR}\""
            OPTS='["--aisp-full"]'
            ;;
          "aisp-full-2x")
            UNIT="\"${PROFILE}_${PUZZLE_NAME}_aisp-full_${DATE_STR}-2x\""
            OPTS='["--aisp-full"]'
            ;;
        esac

        # Add comma separator (except first)
        if [[ "$FIRST" == "true" ]]; then
          FIRST=false
        else
          echo "," >> "$CONFIG_FILE"
        fi

        cat >> "$CONFIG_FILE" << EOF
    {
      "name": "${PROFILE}_${PUZZLE_NAME}_${MODE}_${DATE_STR}",
      "profile": "$PROFILE",
      "learningUnit": $UNIT,
      "options": $OPTS
    }
EOF
      done
    done

    cat >> "$CONFIG_FILE" << EOF

  ]
}
EOF

    echo "Generated config: $CONFIG_FILE"
    echo "Configurations: $(jq '.configurations | length' "$CONFIG_FILE")"
  fi
fi

# ============================================
# PHASE 3: Run A/B/X Comparison
# ============================================
if [[ "$SKIP_ABX" != "true" ]]; then
  echo ""
  echo "=============================================="
  echo ">>> PHASE 3: Running A/B/X Comparison"
  echo "=============================================="
  echo ""

  ./scripts/abx-test.sh "$CONFIG_FILE" 2>&1 | tee "$RESULTS_DIR/phase3-abx.log"

  # Copy ABX results
  LATEST_ABX=$(ls -td ./abx-results/*/ 2>/dev/null | head -1)
  if [[ -n "$LATEST_ABX" && -d "$LATEST_ABX" ]]; then
    cp "$LATEST_ABX/results.csv" "$RESULTS_DIR/abx-results.csv" 2>/dev/null || true
  fi
fi

# ============================================
# PHASE 4: Summary Report
# ============================================
echo ""
echo "=============================================="
echo "PIPELINE COMPLETE"
echo "=============================================="
echo ""
echo "Results directory: $RESULTS_DIR"
echo ""
echo "Files:"
ls -la "$RESULTS_DIR"
echo ""

# Show A/B/X results if available
if [[ -f "$RESULTS_DIR/abx-results.csv" ]]; then
  echo "=============================================="
  echo "A/B/X Results Summary"
  echo "=============================================="
  echo ""
  column -t -s',' "$RESULTS_DIR/abx-results.csv"
  echo ""

  # Show top performers
  echo "Top 5 Configurations (by solve rate):"
  tail -n +2 "$RESULTS_DIR/abx-results.csv" | sort -t',' -k7 -rn | head -5 | column -t -s','
fi

echo ""
echo "=============================================="
