#!/bin/bash
# Comprehensive Test Suite - All profiles, selected modes
# Specification: docs/specs/15-batch-testing-spec.md
#
# Usage: ./scripts/comprehensive-test-suite.sh [options]
#   --runs <n>         Runs per mode (default: 3)
#   --puzzle <path>    Puzzle file (default: puzzles/9x9-easy.json)
#   --no-dual          Disable dual mode (default: creates BOTH standard and -2x units)
#   --no-save-reasoning   Disable full reasoning storage (enabled by default)
#   --skip-dream       Skip dreaming consolidation
#   --profiles <list>  Comma-separated list of profiles (default: all)
#   --exclude <list>   Comma-separated list of profiles to exclude
#   --modes <list>     Space-separated mode list (default: 'standard aisp-full')
#   --algorithm <name> Use specific clustering algorithm
#   --algorithms <list> Comma-separated algorithm list (default: all)
#   -h, --help         Show help

set -e

# Defaults
RUNS=3
PUZZLE="puzzles/9x9-easy.json"
NO_DUAL=""
NO_SAVE_REASONING=""
SKIP_DREAM=false
PROFILE_FILTER=""
PROFILE_EXCLUDE=""
ALGORITHM=""
ALGORITHM_LIST=""
MODES="standard aisp-full"  # Default: exclude aisp mode

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --runs) RUNS="$2"; shift 2 ;;
    --puzzle) PUZZLE="$2"; shift 2 ;;
    --no-dual) NO_DUAL="--no-dual-unit"; shift ;;
    --no-save-reasoning) NO_SAVE_REASONING="--no-save-reasoning"; shift ;;
    --skip-dream) SKIP_DREAM=true; shift ;;
    --profiles) PROFILE_FILTER="$2"; shift 2 ;;
    --exclude) PROFILE_EXCLUDE="$2"; shift 2 ;;
    --modes) MODES="$2"; shift 2 ;;
    --algorithm) ALGORITHM="$2"; shift 2 ;;
    --algorithms) ALGORITHM_LIST="$2"; shift 2 ;;
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
      echo "  --exclude <list>   Comma-separated list of profiles to exclude"
      echo "  --modes <list>     Space-separated mode list (default: 'standard aisp-full')"
      echo "  --algorithm <name> Use specific clustering algorithm"
      echo "  --algorithms <list> Comma-separated algorithm list (default: all)"
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
echo "Modes: $MODES"
if [[ -n "$NO_DUAL" ]]; then echo "Dual mode: disabled"; else echo "Dual mode: enabled (default)"; fi
if [[ -n "$NO_SAVE_REASONING" ]]; then echo "Save reasoning: disabled"; else echo "Save reasoning: enabled (default)"; fi
echo "Results dir: $RESULTS_DIR"
echo "=============================================="
echo ""

# Get all profiles (or filtered list) and sort by size tag (largest to smallest)
PROFILE_JSON=$(npx machine-dream llm profile list --format json 2>/dev/null)

if [[ -z "$PROFILE_JSON" || "$PROFILE_JSON" == "[]" ]]; then
  echo "ERROR: No profiles found. Create profiles first with: machine-dream llm profile add"
  exit 1
fi

# Build list of profiles with sizes
PROFILE_LIST=""
if [[ -n "$PROFILE_FILTER" ]]; then
  # Use filtered list
  for p in $(echo "$PROFILE_FILTER" | tr ',' ' '); do
    # Get size from tags (extract number from tags like "120b", "32b", etc.)
    SIZE=$(echo "$PROFILE_JSON" | jq -r --arg name "$p" '.[] | select(.name == $name) | .tags[]?' 2>/dev/null | grep -oE '[0-9]+' | head -1)
    SIZE=${SIZE:-0}
    PROFILE_LIST="$PROFILE_LIST$SIZE:$p "
  done
else
  # Get all profiles with their size tags
  PROFILE_LIST=$(echo "$PROFILE_JSON" | jq -r '.[] | .name as $name | (.tags // []) as $tags | ($tags | map(select(test("[0-9]+")) | gsub("[^0-9]"; "") | tonumber) | if length > 0 then .[0] else 0 end) as $size | "\($size):\($name)"' 2>/dev/null)
  # Convert to space-separated
  PROFILE_LIST=$(echo "$PROFILE_LIST" | tr '\n' ' ')
fi

# Apply exclusions
if [[ -n "$PROFILE_EXCLUDE" ]]; then
  EXCLUDED=""
  for exclude in $(echo "$PROFILE_EXCLUDE" | tr ',' ' '); do
    PROFILE_LIST=$(echo "$PROFILE_LIST" | tr ' ' '\n' | grep -v ":$exclude$" | tr '\n' ' ')
    EXCLUDED="$EXCLUDED $exclude"
  done
  echo "Excluding profiles:$EXCLUDED"
fi

# Sort by size descending and extract names
PROFILES=$(echo "$PROFILE_LIST" | tr ' ' '\n' | grep -v '^$' | sort -t: -k1 -rn | cut -d: -f2 | tr '\n' ' ')

if [[ -z "$PROFILES" ]]; then
  echo "ERROR: No profiles found after filtering."
  exit 1
fi

echo "Profiles to test (ordered by model size, largest first): $PROFILES"
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

  for MODE in $MODES; do
    # Base name for log files (without algorithm identifier)
    LOG_BASE="${PROFILE}_${PUZZLE_NAME}_${MODE}_${DATE_STR}"
    MODE_OPTS=""

    case "$MODE" in
      "standard") MODE_OPTS="" ;;
      "aisp") MODE_OPTS="--aisp" ;;
      "aisp-full") MODE_OPTS="--aisp-full" ;;
    esac

    echo ""
    echo ">>> Mode: $MODE"
    echo "-------------------------------------------"
    echo "  Training runs will use: default (no learned strategies)"
    echo "  Dream consolidation will create units like: ${PROFILE}_${MODE}_*_${DATE_STR}_1"
    echo ""

    # Training runs (no learning unit - generates fresh experiences)
    for i in $(seq 1 $RUNS); do
      echo "  Run $i/$RUNS..."
      TOTAL_RUNS=$((TOTAL_RUNS + 1))

      LOG_FILE="$RESULTS_DIR/${LOG_BASE}_run${i}.log"

      # Run with tee to show output live and save to log
      npx machine-dream llm play "$PUZZLE" \
        --profile "$PROFILE" \
        --visualize-basic \
        $MODE_OPTS \
        $NO_SAVE_REASONING \
        2>&1 | tee "$LOG_FILE"

      # Check log file for result
      if grep -q "SOLVED" "$LOG_FILE" 2>/dev/null; then
        TOTAL_SOLVED=$((TOTAL_SOLVED + 1))
        echo "    Result: SOLVED"
      else
        echo "    Result: Not solved"
      fi
    done

    # Dream consolidation (dual mode is default, creates BOTH standard and -2x units)
    if [[ "$SKIP_DREAM" != "true" ]]; then
      echo ""
      echo "  Running dream consolidation..."

      # Determine which algorithms will be used
      if [[ -n "$ALGORITHM" ]]; then
        echo "    Algorithm: $ALGORITHM"
        echo "    Will create: ${PROFILE}_${MODE}_${ALGORITHM}*_${DATE_STR}_N"
      elif [[ -n "$ALGORITHM_LIST" ]]; then
        echo "    Algorithms: $ALGORITHM_LIST"
        echo "    Will create units for each algorithm (pattern: ${PROFILE}_${MODE}_<algo>_${DATE_STR}_N)"
      else
        echo "    Using all algorithms (default)"
        echo "    Will create: ${PROFILE}_${MODE}_fastclusterv2_${DATE_STR}_1"
        echo "                 ${PROFILE}_${MODE}_deepclusterv1_${DATE_STR}_1"
        echo "                 ${PROFILE}_${MODE}_llmclusterv1_${DATE_STR}_1"
        if [[ -z "$NO_DUAL" ]]; then
          echo "    Plus -2x variants for validation"
        fi
      fi
      echo ""

      DREAM_OPTS=""
      [[ -n "$NO_DUAL" ]] && DREAM_OPTS="$DREAM_OPTS $NO_DUAL"
      # Pass AISP mode flags to dream consolidation
      [[ "$MODE" == "aisp" ]] && DREAM_OPTS="$DREAM_OPTS --aisp"
      [[ "$MODE" == "aisp-full" ]] && DREAM_OPTS="$DREAM_OPTS --aisp-full"

      # Build algorithm options (default: all algorithms)
      ALGO_OPTS=""
      if [[ -n "$ALGORITHM" ]]; then
        ALGO_OPTS="--algorithm $ALGORITHM"
      elif [[ -n "$ALGORITHM_LIST" ]]; then
        ALGO_OPTS="--algorithms $ALGORITHM_LIST"
      fi
      # If neither specified, don't pass any option (uses all algorithms)

      npx machine-dream llm dream run \
        --profile "$PROFILE" \
        $DREAM_OPTS \
        $ALGO_OPTS \
        2>&1 | tee "$RESULTS_DIR/${LOG_BASE}_dream.log"

      # Clear any remaining unconsolidated experiences after dream cycle
      UNCONSOLIDATED_COUNT=$(npx machine-dream llm memory clear --unconsolidated --profile "$PROFILE" --confirm 2>&1 | grep -oP 'Deleted \K\d+' || echo "0")
      if [[ "$UNCONSOLIDATED_COUNT" != "0" && -n "$UNCONSOLIDATED_COUNT" ]]; then
        echo "  Cleared $UNCONSOLIDATED_COUNT unconsolidated experiences"
      fi

      # Validation runs using -2x learning units (if dual mode enabled)
      if [[ -z "$NO_DUAL" ]]; then
        echo ""
        echo "  >>> Finding -2x learning units for validation..."

        # Query learning units matching this profile/mode/date with -2x suffix
        UNITS_2X=$(npx machine-dream llm learning list --profile "$PROFILE" --format json 2>/dev/null | \
          jq -r --arg base "$LOG_BASE" '.[] | select(.id | (startswith($base) and endswith("-2x"))) | .id' | \
          tr '\n' ' ')

        if [[ -z "$UNITS_2X" ]]; then
          echo "    ⚠️  No -2x units found (dual mode may have been disabled)"
        else
          echo "    Found units: $UNITS_2X"

          # Run validation for each -2x unit found
          for UNIT_2X in $UNITS_2X; do
            echo ""
            echo "    Testing with: $UNIT_2X"

            for i in $(seq 1 $RUNS); do
              echo "      Validation run $i/$RUNS..."
              TOTAL_RUNS=$((TOTAL_RUNS + 1))

              LOG_FILE="$RESULTS_DIR/${UNIT_2X}_validation_${i}.log"

              # Run with tee to show output live and save to log
              npx machine-dream llm play "$PUZZLE" \
                --profile "$PROFILE" \
                --learning-unit "$UNIT_2X" \
                --visualize-basic \
                $MODE_OPTS \
                $NO_SAVE_REASONING \
                2>&1 | tee "$LOG_FILE"

              # Check log file for result
              if grep -q "SOLVED" "$LOG_FILE" 2>/dev/null; then
                TOTAL_SOLVED=$((TOTAL_SOLVED + 1))
                echo "        Result: SOLVED"
              else
                echo "        Result: Not solved"
              fi
            done
          done
        fi
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
  for MODE in $MODES; do
    LOG_BASE="${PROFILE}_${PUZZLE_NAME}_${MODE}_${DATE_STR}"

    # Training runs
    RUNS_COUNT=0
    SOLVED_COUNT=0
    for LOG in "$RESULTS_DIR/${LOG_BASE}_run"*.log; do
      if [[ -f "$LOG" ]]; then
        RUNS_COUNT=$((RUNS_COUNT + 1))
        if grep -q "SOLVED" "$LOG" 2>/dev/null; then
          SOLVED_COUNT=$((SOLVED_COUNT + 1))
        fi
      fi
    done
    if [[ $RUNS_COUNT -gt 0 ]]; then
      RATE=$(echo "scale=1; $SOLVED_COUNT * 100 / $RUNS_COUNT" | bc)
      echo "$PROFILE,$MODE,training,N/A,$RUNS_COUNT,$SOLVED_COUNT,$RATE%" >> "$SUMMARY_FILE"
    fi

    # Validation runs (all -2x units for this profile/mode/date)
    # Find all validation logs matching the pattern
    VALIDATION_LOGS=$(find "$RESULTS_DIR" -name "*${LOG_BASE}*-2x_validation_*.log" 2>/dev/null | wc -l)

    if [[ $VALIDATION_LOGS -gt 0 ]]; then
      # Group by unique learning unit
      for UNIT_LOG_PREFIX in $(find "$RESULTS_DIR" -name "*${LOG_BASE}*-2x_validation_*.log" 2>/dev/null | \
        sed 's/_validation_[0-9]*\.log$//' | sort -u); do

        UNIT_NAME=$(basename "$UNIT_LOG_PREFIX")
        RUNS_COUNT=0
        SOLVED_COUNT=0

        for LOG in "${UNIT_LOG_PREFIX}_validation_"*.log; do
          if [[ -f "$LOG" ]]; then
            RUNS_COUNT=$((RUNS_COUNT + 1))
            if grep -q "SOLVED" "$LOG" 2>/dev/null; then
              SOLVED_COUNT=$((SOLVED_COUNT + 1))
            fi
          fi
        done

        if [[ $RUNS_COUNT -gt 0 ]]; then
          RATE=$(echo "scale=1; $SOLVED_COUNT * 100 / $RUNS_COUNT" | bc)
          echo "$PROFILE,$MODE,validation,$UNIT_NAME,$RUNS_COUNT,$SOLVED_COUNT,$RATE%" >> "$SUMMARY_FILE"
        fi
      done
    fi
  done
done

echo ""
echo "Summary saved to: $SUMMARY_FILE"
echo ""
cat "$SUMMARY_FILE" | column -t -s','
