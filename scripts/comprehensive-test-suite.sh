#!/bin/bash
# Comprehensive Test Suite - All profiles, all modes
# Specification: docs/specs/15-batch-testing-spec.md
#
# Usage: ./scripts/comprehensive-test-suite.sh [options]
#   --runs <n>         Runs per mode (default: 3)
#   --puzzle <path>    Puzzle file (default: puzzles/9x9-easy.json)
#   --no-dual          Disable dual mode (default: creates BOTH standard and -2x units)
#   --no-save-reasoning   Disable full reasoning storage (enabled by default)
#   --skip-dream       Skip dreaming consolidation
#   --profiles <list>  Comma-separated list of profiles (default: all)
#   -h, --help         Show help

set -e

# Defaults
RUNS=3
PUZZLE="puzzles/9x9-easy.json"
NO_DUAL=""
NO_SAVE_REASONING=""
SKIP_DREAM=false
PROFILE_FILTER=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --runs) RUNS="$2"; shift 2 ;;
    --puzzle) PUZZLE="$2"; shift 2 ;;
    --no-dual) NO_DUAL="--no-dual-unit"; shift ;;
    --no-save-reasoning) NO_SAVE_REASONING="--no-save-reasoning"; shift ;;
    --skip-dream) SKIP_DREAM=true; shift ;;
    --profiles) PROFILE_FILTER="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --runs <n>         Runs per mode (default: 3)"
      echo "  --puzzle <path>    Puzzle file (default: puzzles/9x9-easy.json)"
      echo "  --no-dual          Disable dual mode (default: creates BOTH standard and -2x units)"
      echo "  --no-save-reasoning   Disable full reasoning storage (enabled by default)"
      echo "  --skip-dream       Skip dreaming consolidation"
      echo "  --profiles <list>  Comma-separated list of profiles (default: all)"
      echo "  -h, --help         Show help"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

RESULTS_DIR="./comprehensive-results/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo "=============================================="
echo "Comprehensive Test Suite"
echo "=============================================="
echo "Runs per mode: $RUNS"
echo "Puzzle: $PUZZLE"
if [[ -n "$NO_DUAL" ]]; then echo "Dual mode: disabled"; else echo "Dual mode: enabled (default)"; fi
if [[ -n "$NO_SAVE_REASONING" ]]; then echo "Save reasoning: disabled"; else echo "Save reasoning: enabled (default)"; fi
echo "Results dir: $RESULTS_DIR"
echo "=============================================="
echo ""

# Get all profiles (or filtered list)
if [[ -n "$PROFILE_FILTER" ]]; then
  PROFILES=$(echo "$PROFILE_FILTER" | tr ',' ' ')
else
  PROFILES=$(npx machine-dream llm profile list --format json 2>/dev/null | jq -r '.[].name' | tr '\n' ' ')
fi

if [[ -z "$PROFILES" ]]; then
  echo "ERROR: No profiles found. Create profiles first with: machine-dream llm profile add"
  exit 1
fi

echo "Profiles to test: $PROFILES"
echo ""

# Summary tracking
TOTAL_RUNS=0
TOTAL_SOLVED=0

# Extract puzzle name from path (e.g., "puzzles/9x9-easy.json" -> "9x9-easy")
PUZZLE_NAME=$(basename "$PUZZLE" .json)

# Get current date in YYYYMMDD format
DATE_STR=$(date +%Y%m%d)

for PROFILE in $PROFILES; do
  echo "=============================================="
  echo ">>> Profile: $PROFILE"
  echo "=============================================="

  # Clear unconsolidated experiences for this profile (fresh start)
  echo "Clearing unconsolidated experiences..."
  npx machine-dream llm memory clear --unconsolidated --profile "$PROFILE" --confirm 2>/dev/null || true

  for MODE in "standard" "aisp" "aisp-full"; do
    UNIT_NAME="${PROFILE}_${PUZZLE_NAME}_${MODE}_${DATE_STR}"
    MODE_OPTS=""

    case "$MODE" in
      "standard") MODE_OPTS="" ;;
      "aisp") MODE_OPTS="--aisp" ;;
      "aisp-full") MODE_OPTS="--aisp-full" ;;
    esac

    echo ""
    echo ">>> Mode: $MODE (unit: $UNIT_NAME)"
    echo "-------------------------------------------"

    # Training runs
    for i in $(seq 1 $RUNS); do
      echo "  Run $i/$RUNS..."
      TOTAL_RUNS=$((TOTAL_RUNS + 1))

      LOG_FILE="$RESULTS_DIR/${UNIT_NAME}_run${i}.log"

      OUTPUT=$(npx machine-dream llm play "$PUZZLE" \
        --profile "$PROFILE" \
        --learning-unit "$UNIT_NAME" \
        $MODE_OPTS \
        $NO_SAVE_REASONING \
        2>&1 | tee "$LOG_FILE")

      # Check if solved
      if echo "$OUTPUT" | grep -q "SOLVED"; then
        TOTAL_SOLVED=$((TOTAL_SOLVED + 1))
        echo "    Result: SOLVED"
      else
        echo "    Result: Not solved"
      fi
    done

    # Dream consolidation (dual mode is default, creates BOTH standard and -2x units)
    if [[ "$SKIP_DREAM" != "true" ]]; then
      echo ""
      echo "  Running dream consolidation for $UNIT_NAME..."
      DREAM_OPTS=""
      [[ -n "$NO_DUAL" ]] && DREAM_OPTS="$DREAM_OPTS $NO_DUAL"
      # Pass AISP mode flags to dream consolidation
      [[ "$MODE" == "aisp" ]] && DREAM_OPTS="$DREAM_OPTS --aisp"
      [[ "$MODE" == "aisp-full" ]] && DREAM_OPTS="$DREAM_OPTS --aisp-full"

      npx machine-dream llm dream run \
        --profile "$PROFILE" \
        --learning-unit "$UNIT_NAME" \
        $DREAM_OPTS \
        2>&1 | tee "$RESULTS_DIR/${UNIT_NAME}_dream.log"

      # Clear any remaining unconsolidated experiences after dream cycle
      UNCONSOLIDATED_COUNT=$(npx machine-dream llm memory clear --unconsolidated --profile "$PROFILE" --confirm 2>&1 | grep -oP 'Deleted \K\d+' || echo "0")
      if [[ "$UNCONSOLIDATED_COUNT" != "0" && -n "$UNCONSOLIDATED_COUNT" ]]; then
        echo "  Cleared $UNCONSOLIDATED_COUNT unconsolidated experiences"
      fi

      # Validation runs using -2x learning unit (if dual mode enabled)
      if [[ -z "$NO_DUAL" ]]; then
        UNIT_2X="${UNIT_NAME}-2x"
        echo ""
        echo "  >>> Validation runs with -2x unit: $UNIT_2X"

        for i in $(seq 1 $RUNS); do
          echo "    Validation run $i/$RUNS..."
          TOTAL_RUNS=$((TOTAL_RUNS + 1))

          LOG_FILE="$RESULTS_DIR/${UNIT_2X}_validation${i}.log"

          OUTPUT=$(npx machine-dream llm play "$PUZZLE" \
            --profile "$PROFILE" \
            --learning-unit "$UNIT_2X" \
            $MODE_OPTS \
            $NO_SAVE_REASONING \
            2>&1 | tee "$LOG_FILE")

          # Check if solved
          if echo "$OUTPUT" | grep -q "SOLVED"; then
            TOTAL_SOLVED=$((TOTAL_SOLVED + 1))
            echo "      Result: SOLVED"
          else
            echo "      Result: Not solved"
          fi
        done
      fi
    fi
  done

  echo ""
done

# Summary
echo ""
echo "=============================================="
echo "COMPREHENSIVE TEST SUITE COMPLETE"
echo "=============================================="
echo "Total runs: $TOTAL_RUNS"
echo "Total solved: $TOTAL_SOLVED"
if [[ $TOTAL_RUNS -gt 0 ]]; then
  RATE=$(echo "scale=1; $TOTAL_SOLVED * 100 / $TOTAL_RUNS" | bc)
  echo "Overall solve rate: ${RATE}%"
fi
echo "Results directory: $RESULTS_DIR"
echo ""

# Generate summary CSV
SUMMARY_FILE="$RESULTS_DIR/summary.csv"
echo "Profile,Mode,Phase,Unit,Runs,Solved,Rate" > "$SUMMARY_FILE"

for PROFILE in $PROFILES; do
  for MODE in "standard" "aisp" "aisp-full"; do
    UNIT_NAME="${PROFILE}_${PUZZLE_NAME}_${MODE}_${DATE_STR}"

    # Training runs
    RUNS_COUNT=0
    SOLVED_COUNT=0
    for LOG in "$RESULTS_DIR/${UNIT_NAME}_run"*.log; do
      if [[ -f "$LOG" ]]; then
        RUNS_COUNT=$((RUNS_COUNT + 1))
        if grep -q "SOLVED" "$LOG" 2>/dev/null; then
          SOLVED_COUNT=$((SOLVED_COUNT + 1))
        fi
      fi
    done
    if [[ $RUNS_COUNT -gt 0 ]]; then
      RATE=$(echo "scale=1; $SOLVED_COUNT * 100 / $RUNS_COUNT" | bc)
      echo "$PROFILE,$MODE,training,$UNIT_NAME,$RUNS_COUNT,$SOLVED_COUNT,$RATE%" >> "$SUMMARY_FILE"
    fi

    # Validation runs (-2x unit)
    UNIT_2X="${UNIT_NAME}-2x"
    RUNS_COUNT=0
    SOLVED_COUNT=0
    for LOG in "$RESULTS_DIR/${UNIT_2X}_validation"*.log; do
      if [[ -f "$LOG" ]]; then
        RUNS_COUNT=$((RUNS_COUNT + 1))
        if grep -q "SOLVED" "$LOG" 2>/dev/null; then
          SOLVED_COUNT=$((SOLVED_COUNT + 1))
        fi
      fi
    done
    if [[ $RUNS_COUNT -gt 0 ]]; then
      RATE=$(echo "scale=1; $SOLVED_COUNT * 100 / $RUNS_COUNT" | bc)
      echo "$PROFILE,$MODE,validation,$UNIT_2X,$RUNS_COUNT,$SOLVED_COUNT,$RATE%" >> "$SUMMARY_FILE"
    fi
  done
done

echo ""
echo "Summary saved to: $SUMMARY_FILE"
echo ""
cat "$SUMMARY_FILE" | column -t -s','
