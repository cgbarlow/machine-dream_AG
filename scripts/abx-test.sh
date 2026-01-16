#!/bin/bash
# A/B/X Multi-Model Comparison Script
# Specification: docs/specs/15-batch-testing-spec.md
#
# Usage: ./scripts/abx-test.sh <config.json> [options]
#
# Options:
#   --debug          Enable debug output for LLM calls
#   --output-dir     Custom output directory (default: ./abx-results/YYYYMMDD_HHMMSS)
#
# Config file format:
# {
#   "testName": "Test description",
#   "runsPerConfig": 5,
#   "puzzles": ["puzzles/9x9-easy.json"],
#   "configurations": [
#     {
#       "name": "config-name",
#       "profile": "profile-name",
#       "learningUnit": "unit-name" | null,
#       "options": ["--aisp", "--anonymous-patterns"]
#     }
#   ]
# }

set -e

# Parse command line arguments
CONFIG=""
DEBUG_FLAG=""
OUTPUT_DIR=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --debug)
      DEBUG_FLAG="--debug"
      shift
      ;;
    --output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 <config.json> [options]"
      echo ""
      echo "Options:"
      echo "  --debug          Enable debug output for LLM calls"
      echo "  --output-dir     Custom output directory (default: ./abx-results/YYYYMMDD_HHMMSS)"
      echo ""
      echo "Config file required. See scripts/abx-config.example.json for format."
      exit 0
      ;;
    *)
      if [[ -z "$CONFIG" ]]; then
        CONFIG="$1"
      fi
      shift
      ;;
  esac
done

if [[ ! -f "$CONFIG" ]]; then
  echo "Usage: $0 <config.json> [options]"
  echo ""
  echo "Options:"
  echo "  --debug          Enable debug output for LLM calls"
  echo "  --output-dir     Custom output directory (default: ./abx-results/YYYYMMDD_HHMMSS)"
  echo ""
  echo "Config file required. See scripts/abx-config.example.json for format."
  exit 1
fi

# Parse config
TEST_NAME=$(jq -r '.testName // "A/B/X Test"' "$CONFIG")
RUNS_PER_CONFIG=$(jq -r '.runsPerConfig // 5' "$CONFIG")
PUZZLES=$(jq -r '.puzzles[]' "$CONFIG")
NUM_CONFIGS=$(jq -r '.configurations | length' "$CONFIG")

# Set results directory
if [[ -n "$OUTPUT_DIR" ]]; then
  RESULTS_DIR="$OUTPUT_DIR"
else
  RESULTS_DIR="./abx-results/$(date +%Y%m%d_%H%M%S)"
fi
mkdir -p "$RESULTS_DIR"

echo "=============================================="
echo "A/B/X Multi-Model Comparison"
echo "=============================================="
echo "Test: $TEST_NAME"
echo "Runs per config: $RUNS_PER_CONFIG"
echo "Configurations: $NUM_CONFIGS"
echo "Results dir: $RESULTS_DIR"
if [[ -n "$DEBUG_FLAG" ]]; then
  echo "Debug mode: enabled"
fi
echo "=============================================="
echo ""

# Copy config for reference
cp "$CONFIG" "$RESULTS_DIR/config.json"

# Initialize results CSV
RESULTS_CSV="$RESULTS_DIR/results.csv"
echo "Configuration,Profile,LearningUnit,Puzzle,Solved,Total,SolveRate,AvgMoves,AvgAccuracy" > "$RESULTS_CSV"

# Detailed log
DETAIL_LOG="$RESULTS_DIR/detailed.log"
echo "A/B/X Test: $TEST_NAME" > "$DETAIL_LOG"
echo "Started: $(date)" >> "$DETAIL_LOG"
echo "" >> "$DETAIL_LOG"

for i in $(seq 0 $((NUM_CONFIGS - 1))); do
  NAME=$(jq -r ".configurations[$i].name" "$CONFIG")
  PROFILE=$(jq -r ".configurations[$i].profile" "$CONFIG")
  UNIT=$(jq -r ".configurations[$i].learningUnit // empty" "$CONFIG")
  OPTIONS=$(jq -r ".configurations[$i].options // [] | join(\" \")" "$CONFIG")

  echo ">>> Configuration: $NAME"
  echo "    Profile: $PROFILE, Unit: ${UNIT:-none}, Options: ${OPTIONS:-none}"

  for PUZZLE in $PUZZLES; do
    PUZZLE_NAME=$(basename "$PUZZLE" .json)
    echo "    Puzzle: $PUZZLE_NAME"

    SOLVED=0
    TOTAL=0
    TOTAL_MOVES=0
    TOTAL_ACCURACY=0

    for run in $(seq 1 $RUNS_PER_CONFIG); do
      TOTAL=$((TOTAL + 1))

      # Build command
      CMD="npx machine-dream llm play \"$PUZZLE\" --profile \"$PROFILE\""
      if [[ -n "$UNIT" && "$UNIT" != "null" ]]; then
        CMD="$CMD --learning-unit \"$UNIT\""
      else
        CMD="$CMD --no-learning"
      fi
      if [[ -n "$OPTIONS" ]]; then
        CMD="$CMD $OPTIONS"
      fi
      if [[ -n "$DEBUG_FLAG" ]]; then
        CMD="$CMD $DEBUG_FLAG"
      fi

      # Run and capture output - show moves in real-time
      LOG_FILE="$RESULTS_DIR/${NAME}_${PUZZLE_NAME}_run${run}.log"
      echo ""
      echo "      ─────────────────────────────────────────────"
      echo "      Run $run: Starting... (logging to ${LOG_FILE##*/})"
      echo "      ─────────────────────────────────────────────"

      # Run with output streaming - filter to show key events
      eval $CMD 2>&1 | tee "$LOG_FILE" | while IFS= read -r line; do
        # Show move attempts and results
        if [[ "$line" =~ ^Move[[:space:]] ]] || \
           [[ "$line" =~ CORRECT ]] || \
           [[ "$line" =~ INVALID ]] || \
           [[ "$line" =~ VALID_BUT_WRONG ]] || \
           [[ "$line" =~ SOLVED ]] || \
           [[ "$line" =~ "Session Results" ]] || \
           [[ "$line" =~ "Total moves:" ]] || \
           [[ "$line" =~ "Correct moves:" ]] || \
           [[ "$line" =~ "Accuracy:" ]] || \
           [[ "$line" =~ "Session ended:" ]] || \
           [[ "$line" =~ "Reason:" ]] || \
           [[ "$line" =~ "timeout" ]] || \
           [[ "$line" =~ "Error" ]] || \
           [[ "$line" =~ "strategies" ]] || \
           [[ "$line" =~ "Learning unit:" ]]; then
          echo "      | $line"
        fi
      done

      # Parse results from log file
      OUTPUT=$(cat "$LOG_FILE")

      if echo "$OUTPUT" | grep -q "SOLVED"; then
        SOLVED=$((SOLVED + 1))
        STATUS="✅ SOLVED"
      elif echo "$OUTPUT" | grep -q "timeout"; then
        STATUS="⏱️ TIMEOUT"
      elif echo "$OUTPUT" | grep -q "Error"; then
        STATUS="❌ ERROR"
      else
        STATUS="❌ FAIL"
      fi

      # Extract moves and accuracy from output
      MOVES=$(echo "$OUTPUT" | grep -oP 'Total moves:\s*\K\d+' | tail -1 || echo "0")
      if [[ -z "$MOVES" || "$MOVES" == "0" ]]; then
        MOVES=$(echo "$OUTPUT" | grep -oP 'Moves:\s*\K\d+' | tail -1 || echo "0")
      fi
      CORRECT=$(echo "$OUTPUT" | grep -oP 'Correct moves:\s*\K\d+' | tail -1 || echo "0")
      ACC=$(echo "$OUTPUT" | grep -oP 'Accuracy:\s*\K[\d.]+' | tail -1 || echo "0")

      # Extract strategy count if present
      STRATEGIES=$(echo "$OUTPUT" | grep -oP 'Learned strategies:\s*\K\d+' | tail -1 || echo "0")

      TOTAL_MOVES=$((TOTAL_MOVES + ${MOVES:-0}))
      TOTAL_ACCURACY=$(echo "$TOTAL_ACCURACY + ${ACC:-0}" | bc 2>/dev/null || echo "0")

      echo "      ─────────────────────────────────────────────"
      echo "      Run $run: $STATUS"
      echo "        Moves: ${MOVES:-0} total, ${CORRECT:-0} correct"
      echo "        Accuracy: ${ACC:-0}%"
      if [[ -n "$STRATEGIES" && "$STRATEGIES" != "0" ]]; then
        echo "        Strategies loaded: $STRATEGIES"
      fi
      echo ""

      echo "[$NAME] $PUZZLE_NAME run $run: $STATUS (moves: ${MOVES:-0}, correct: ${CORRECT:-0}, acc: ${ACC:-0}%)" >> "$DETAIL_LOG"
    done

    # Calculate averages
    if [[ $TOTAL -gt 0 ]]; then
      RATE=$(echo "scale=1; $SOLVED * 100 / $TOTAL" | bc)
      AVG_MOVES=$(echo "scale=1; $TOTAL_MOVES / $TOTAL" | bc)
      AVG_ACC=$(echo "scale=1; $TOTAL_ACCURACY / $TOTAL" | bc)
    else
      RATE=0
      AVG_MOVES=0
      AVG_ACC=0
    fi

    echo "$NAME,$PROFILE,${UNIT:-none},$PUZZLE_NAME,$SOLVED,$TOTAL,${RATE}%,$AVG_MOVES,${AVG_ACC}%" >> "$RESULTS_CSV"
    echo "    Result: $SOLVED/$TOTAL solved (${RATE}%)"
  done

  echo ""
done

echo "=============================================="
echo "A/B/X TEST COMPLETE"
echo "=============================================="
echo ""
echo "Results Summary:"
echo ""
cat "$RESULTS_CSV" | column -t -s','
echo ""
echo "Results saved to: $RESULTS_DIR"
echo ""

# Generate leaderboard
echo ""
echo "Leaderboard (by solve rate):"
echo ""
tail -n +2 "$RESULTS_CSV" | sort -t',' -k7 -rn | head -10 | column -t -s','
