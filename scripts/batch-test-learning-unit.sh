#!/bin/bash
# Batch Test with Profile-Specific Learning Units
# Test multiple profiles with their own learning units (no dream cycle)
#
# Usage: ./scripts/batch-test-learning-unit.sh --profiles <list> [options]
#   --profiles <list>      Comma-separated list of profile:unit pairs (REQUIRED)
#                          Format: profile1:unit1,profile2:unit2
#   --runs <n>             Runs per profile (default: 3)
#   --puzzle <path>        Puzzle file (default: puzzles/9x9-easy.json)
#   --exclude <list>       Comma-separated list of profiles to exclude
#   --no-save-reasoning    Disable full reasoning storage (enabled by default)
#   --modes <list>         Comma-separated list of modes: standard,aisp,aisp-full (default: standard)
#   -h, --help             Show help

set -e

# Defaults
RUNS=3
PUZZLE="puzzles/9x9-easy.json"
NO_SAVE_REASONING=""
PROFILE_LIST=""
PROFILE_EXCLUDE=""
MODES="standard"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --runs) RUNS="$2"; shift 2 ;;
    --puzzle) PUZZLE="$2"; shift 2 ;;
    --no-save-reasoning) NO_SAVE_REASONING="--no-save-reasoning"; shift ;;
    --profiles) PROFILE_LIST="$2"; shift 2 ;;
    --exclude) PROFILE_EXCLUDE="$2"; shift 2 ;;
    --modes) MODES="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 --profiles <list> [options]"
      echo ""
      echo "Required:"
      echo "  --profiles <list>      Comma-separated list of profile:unit pairs"
      echo "                         Format: profile1:unit1,profile2:unit2"
      echo ""
      echo "Options:"
      echo "  --runs <n>             Runs per profile (default: 3)"
      echo "  --puzzle <path>        Puzzle file (default: puzzles/9x9-easy.json)"
      echo "  --exclude <list>       Comma-separated list of profiles to exclude"
      echo "  --no-save-reasoning    Disable full reasoning storage (enabled by default)"
      echo "  --modes <list>         Comma-separated modes: standard,aisp,aisp-full (default: standard)"
      echo "  -h, --help             Show help"
      echo ""
      echo "Examples:"
      echo "  # Test two profiles with their own units"
      echo "  $0 --profiles gpt-oss-120b:unit1,qwq-32b:unit2"
      echo ""
      echo "  # Test with different modes"
      echo "  $0 --profiles gpt-oss:unit1,qwq:unit2 --modes standard,aisp"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Validate required parameters
if [[ -z "$PROFILE_LIST" ]]; then
  echo "ERROR: --profiles is required"
  echo "Run with -h for help"
  exit 1
fi

RESULTS_DIR="./batch-results/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo "=============================================="
echo "Batch Test - Profile-Specific Learning Units"
echo "=============================================="
echo "Runs per profile: $RUNS"
echo "Puzzle: $PUZZLE"
echo "Modes: $MODES"
if [[ -n "$NO_SAVE_REASONING" ]]; then echo "Save reasoning: disabled"; else echo "Save reasoning: enabled (default)"; fi
echo "Results dir: $RESULTS_DIR"
echo "=============================================="
echo ""

# Get profile JSON
PROFILE_JSON=$(npx machine-dream llm profile list --format json 2>/dev/null)

if [[ -z "$PROFILE_JSON" || "$PROFILE_JSON" == "[]" ]]; then
  echo "ERROR: No profiles found. Create profiles first with: machine-dream llm profile add"
  exit 1
fi

# Parse profile:unit pairs and build list with sizes
# Format: SIZE:PROFILE:UNIT
declare -A PROFILE_UNITS  # Associative array to store profile -> unit mapping
PROFILE_SIZE_LIST=""

for pair in $(echo "$PROFILE_LIST" | tr ',' ' '); do
  # Split profile:unit
  PROFILE=$(echo "$pair" | cut -d: -f1)
  UNIT=$(echo "$pair" | cut -d: -f2)

  # Skip if in exclude list
  if [[ -n "$PROFILE_EXCLUDE" ]] && echo "$PROFILE_EXCLUDE" | tr ',' '\n' | grep -q "^$PROFILE$"; then
    echo "Excluding profile: $PROFILE"
    continue
  fi

  # Get size from tags
  SIZE=$(echo "$PROFILE_JSON" | jq -r --arg name "$PROFILE" '.[] | select(.name == $name) | .tags[]?' 2>/dev/null | grep -oE '[0-9]+' | head -1)
  SIZE=${SIZE:-0}

  # Store mapping
  PROFILE_UNITS["$PROFILE"]="$UNIT"

  # Add to size list
  PROFILE_SIZE_LIST="$PROFILE_SIZE_LIST$SIZE:$PROFILE "
done

# Sort by size descending and extract names
PROFILES=$(echo "$PROFILE_SIZE_LIST" | tr ' ' '\n' | grep -v '^$' | sort -t: -k1 -rn | cut -d: -f2 | tr '\n' ' ')

if [[ -z "$PROFILES" ]]; then
  echo "ERROR: No profiles found after filtering."
  exit 1
fi

echo "Profile:Unit pairs (ordered by model size, largest first):"
for PROFILE in $PROFILES; do
  echo "  $PROFILE -> ${PROFILE_UNITS[$PROFILE]}"
done
echo ""

# Summary tracking
TOTAL_RUNS=0
TOTAL_SOLVED=0

# Extract puzzle name from path
PUZZLE_NAME=$(basename "$PUZZLE" .json)

# Convert modes string to array
MODES_ARRAY=($(echo "$MODES" | tr ',' ' '))

for PROFILE in $PROFILES; do
  LEARNING_UNIT="${PROFILE_UNITS[$PROFILE]}"

  echo "=============================================="
  echo ">>> Profile: $PROFILE"
  echo ">>> Learning Unit: $LEARNING_UNIT"
  echo "=============================================="

  for MODE in "${MODES_ARRAY[@]}"; do
    MODE_OPTS=""

    case "$MODE" in
      "standard") MODE_OPTS="" ;;
      "aisp") MODE_OPTS="--aisp" ;;
      "aisp-full") MODE_OPTS="--aisp-full" ;;
      *) echo "Unknown mode: $MODE, skipping..."; continue ;;
    esac

    echo ""
    echo ">>> Mode: $MODE"
    echo "-------------------------------------------"

    # Test runs
    for i in $(seq 1 $RUNS); do
      echo "  Run $i/$RUNS..."
      TOTAL_RUNS=$((TOTAL_RUNS + 1))

      LOG_FILE="$RESULTS_DIR/${PROFILE}_${LEARNING_UNIT}_${MODE}_run${i}.log"

      # Run with tee to show output live and save to log
      npx machine-dream llm play "$PUZZLE" \
        --profile "$PROFILE" \
        --learning-unit "$LEARNING_UNIT" \
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
  done

  echo ""
done

# Summary
echo ""
echo "=============================================="
echo "BATCH TEST COMPLETE"
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
echo "Profile,LearningUnit,Mode,Puzzle,Runs,Solved,Rate" > "$SUMMARY_FILE"

for PROFILE in $PROFILES; do
  LEARNING_UNIT="${PROFILE_UNITS[$PROFILE]}"
  for MODE in "${MODES_ARRAY[@]}"; do
    RUNS_COUNT=0
    SOLVED_COUNT=0
    for LOG in "$RESULTS_DIR/${PROFILE}_${LEARNING_UNIT}_${MODE}_run"*.log; do
      if [[ -f "$LOG" ]]; then
        RUNS_COUNT=$((RUNS_COUNT + 1))
        if grep -q "SOLVED" "$LOG" 2>/dev/null; then
          SOLVED_COUNT=$((SOLVED_COUNT + 1))
        fi
      fi
    done
    if [[ $RUNS_COUNT -gt 0 ]]; then
      RATE=$(echo "scale=1; $SOLVED_COUNT * 100 / $RUNS_COUNT" | bc)
      echo "$PROFILE,$LEARNING_UNIT,$MODE,$PUZZLE_NAME,$RUNS_COUNT,$SOLVED_COUNT,$RATE%" >> "$SUMMARY_FILE"
    fi
  done
done

echo ""
echo "Summary saved to: $SUMMARY_FILE"
echo ""
cat "$SUMMARY_FILE" | column -t -s','
