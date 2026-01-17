#!/bin/bash
# A/B/X Multi-Model Comparison Script with Resume Support
# Specification: docs/specs/15-batch-testing-spec.md
#
# Usage: ./scripts/abx-test.sh <config.json> [options]
#
# Options:
#   --debug          Enable debug output for LLM calls
#   --output-dir     Custom output directory (default: ./abx-results/YYYYMMDD_HHMMSS)
#   --resume <dir>   Resume from an interrupted batch in the specified directory
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
RESUME_DIR=""

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
    --resume)
      RESUME_DIR="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 <config.json> [options]"
      echo ""
      echo "Options:"
      echo "  --debug          Enable debug output for LLM calls"
      echo "  --output-dir     Custom output directory (default: ./abx-results/YYYYMMDD_HHMMSS)"
      echo "  --resume <dir>   Resume from an interrupted batch in the specified directory"
      echo ""
      echo "Config file required. See scripts/abx-config.example.json for format."
      echo ""
      echo "Resume example:"
      echo "  $0 config.json --resume ./abx-results/20260117_113629"
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
  echo "  --resume <dir>   Resume from an interrupted batch"
  echo ""
  echo "Config file required. See scripts/abx-config.example.json for format."
  exit 1
fi

# Parse config
TEST_NAME=$(jq -r '.testName // "A/B/X Test"' "$CONFIG")
RUNS_PER_CONFIG=$(jq -r '.runsPerConfig // 5' "$CONFIG")
PUZZLES=$(jq -r '.puzzles[]' "$CONFIG")
NUM_CONFIGS=$(jq -r '.configurations | map(select(.name)) | length' "$CONFIG")

# Set results directory
if [[ -n "$RESUME_DIR" ]]; then
  if [[ ! -d "$RESUME_DIR" ]]; then
    echo "Error: Resume directory does not exist: $RESUME_DIR"
    exit 1
  fi
  RESULTS_DIR="$RESUME_DIR"
  RESUMING=true
  echo ""
  echo "🔄 RESUMING from: $RESULTS_DIR"
elif [[ -n "$OUTPUT_DIR" ]]; then
  RESULTS_DIR="$OUTPUT_DIR"
  RESUMING=false
else
  RESULTS_DIR="./abx-results/$(date +%Y%m%d_%H%M%S)"
  RESUMING=false
fi
mkdir -p "$RESULTS_DIR"

# Progress tracking file
PROGRESS_FILE="$RESULTS_DIR/progress.json"

# Function to check if a run is completed
is_run_completed() {
  local config_name="$1"
  local puzzle_name="$2"
  local run_num="$3"
  local run_key="${config_name}|${puzzle_name}|${run_num}"

  if [[ -f "$PROGRESS_FILE" ]]; then
    if jq -e ".completed | index(\"$run_key\")" "$PROGRESS_FILE" > /dev/null 2>&1; then
      return 0  # true - completed
    fi
  fi
  return 1  # false - not completed
}

# Function to mark a run as completed
mark_run_completed() {
  local config_name="$1"
  local puzzle_name="$2"
  local run_num="$3"
  local run_key="${config_name}|${puzzle_name}|${run_num}"

  if [[ ! -f "$PROGRESS_FILE" ]]; then
    echo '{"completed":[],"current":null,"lastUpdate":""}' > "$PROGRESS_FILE"
  fi

  # Add to completed list and update timestamp
  jq --arg key "$run_key" --arg ts "$(date -Iseconds)" \
    '.completed += [$key] | .completed |= unique | .lastUpdate = $ts' \
    "$PROGRESS_FILE" > "${PROGRESS_FILE}.tmp" && mv "${PROGRESS_FILE}.tmp" "$PROGRESS_FILE"
}

# Function to set current run (for crash recovery info)
set_current_run() {
  local config_name="$1"
  local puzzle_name="$2"
  local run_num="$3"

  if [[ ! -f "$PROGRESS_FILE" ]]; then
    echo '{"completed":[],"current":null,"lastUpdate":""}' > "$PROGRESS_FILE"
  fi

  jq --arg cfg "$config_name" --arg puz "$puzzle_name" --arg run "$run_num" --arg ts "$(date -Iseconds)" \
    '.current = {config: $cfg, puzzle: $puz, run: ($run | tonumber)} | .lastUpdate = $ts' \
    "$PROGRESS_FILE" > "${PROGRESS_FILE}.tmp" && mv "${PROGRESS_FILE}.tmp" "$PROGRESS_FILE"
}

# Function to clear current run
clear_current_run() {
  if [[ -f "$PROGRESS_FILE" ]]; then
    jq '.current = null' "$PROGRESS_FILE" > "${PROGRESS_FILE}.tmp" && mv "${PROGRESS_FILE}.tmp" "$PROGRESS_FILE"
  fi
}

# Function to get progress stats
get_progress_stats() {
  if [[ -f "$PROGRESS_FILE" ]]; then
    local completed=$(jq '.completed | length' "$PROGRESS_FILE")
    local total=$((NUM_CONFIGS * RUNS_PER_CONFIG))
    echo "$completed/$total"
  else
    echo "0/$((NUM_CONFIGS * RUNS_PER_CONFIG))"
  fi
}

echo "=============================================="
echo "A/B/X Multi-Model Comparison"
echo "=============================================="
echo "Test: $TEST_NAME"
echo "Runs per config: $RUNS_PER_CONFIG"
echo "Configurations: $NUM_CONFIGS"
echo "Results dir: $RESULTS_DIR"
if [[ "$RESUMING" == "true" ]]; then
  echo "Mode: RESUMING ($(get_progress_stats) completed)"
else
  echo "Mode: NEW RUN"
fi
if [[ -n "$DEBUG_FLAG" ]]; then
  echo "Debug mode: enabled"
fi
echo ""
echo "Configurations to test:"

# Get actual config indices (skipping section markers)
CONFIG_INDICES=$(jq -r '.configurations | to_entries | map(select(.value.name)) | .[].key' "$CONFIG")

for i in $CONFIG_INDICES; do
  CFG_NAME=$(jq -r ".configurations[$i].name" "$CONFIG")

  # Check if all runs for this config are completed
  ALL_DONE=true
  for PUZZLE in $PUZZLES; do
    PUZZLE_NAME=$(basename "$PUZZLE" .json)
    for run in $(seq 1 $RUNS_PER_CONFIG); do
      if ! is_run_completed "$CFG_NAME" "$PUZZLE_NAME" "$run"; then
        ALL_DONE=false
        break 2
      fi
    done
  done

  if [[ "$ALL_DONE" == "true" ]]; then
    STATUS="✓"
  else
    STATUS=" "
  fi

  echo "  [$STATUS] $CFG_NAME"
done

# Show disabled configurations if any
DISABLED_CONFIGS=$(jq -r '._disabled_configurations // [] | map(select(.name)) | .[].name' "$CONFIG" 2>/dev/null)
if [[ -n "$DISABLED_CONFIGS" ]]; then
  DISABLED_COUNT=$(echo "$DISABLED_CONFIGS" | wc -l)
  echo ""
  echo "Disabled configurations ($DISABLED_COUNT):"
  echo "$DISABLED_CONFIGS" | while read -r cfg_name; do
    echo "  [-] $cfg_name"
  done
fi
echo "=============================================="
echo ""

# Copy config for reference (only if new run)
if [[ "$RESUMING" != "true" ]]; then
  cp "$CONFIG" "$RESULTS_DIR/config.json"
fi

# Initialize or append to results CSV
RESULTS_CSV="$RESULTS_DIR/results.csv"
if [[ "$RESUMING" != "true" ]] || [[ ! -f "$RESULTS_CSV" ]]; then
  echo "Configuration,Profile,LearningUnit,Puzzle,Run,Solved,Moves,Correct,Accuracy,Status" > "$RESULTS_CSV"
fi

# Detailed log
DETAIL_LOG="$RESULTS_DIR/detailed.log"
if [[ "$RESUMING" != "true" ]]; then
  echo "A/B/X Test: $TEST_NAME" > "$DETAIL_LOG"
  echo "Started: $(date)" >> "$DETAIL_LOG"
  echo "" >> "$DETAIL_LOG"
else
  echo "" >> "$DETAIL_LOG"
  echo "=== RESUMED: $(date) ===" >> "$DETAIL_LOG"
  echo "" >> "$DETAIL_LOG"
fi

# Initialize progress file if new run
if [[ "$RESUMING" != "true" ]]; then
  echo '{"completed":[],"current":null,"lastUpdate":"","startTime":"'$(date -Iseconds)'"}' > "$PROGRESS_FILE"
fi

SKIPPED_COUNT=0
COMPLETED_COUNT=0

for i in $CONFIG_INDICES; do
  NAME=$(jq -r ".configurations[$i].name" "$CONFIG")
  PROFILE=$(jq -r ".configurations[$i].profile" "$CONFIG")
  UNIT=$(jq -r ".configurations[$i].learningUnit // empty" "$CONFIG")
  OPTIONS=$(jq -r ".configurations[$i].options // [] | join(\" \")" "$CONFIG")

  echo ">>> Configuration: $NAME"
  echo "    Profile: $PROFILE, Unit: ${UNIT:-none}, Options: ${OPTIONS:-none}"

  for PUZZLE in $PUZZLES; do
    PUZZLE_NAME=$(basename "$PUZZLE" .json)
    echo "    Puzzle: $PUZZLE_NAME"

    for run in $(seq 1 $RUNS_PER_CONFIG); do
      # Check if this run is already completed
      if is_run_completed "$NAME" "$PUZZLE_NAME" "$run"; then
        echo "      Run $run: ⏭️  SKIPPED (already completed)"
        SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
        continue
      fi

      # Mark as current (for crash recovery info)
      set_current_run "$NAME" "$PUZZLE_NAME" "$run"

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
      echo "      Progress: $(get_progress_stats)"
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
        SOLVED=1
        STATUS="SOLVED"
      elif echo "$OUTPUT" | grep -q "timeout"; then
        SOLVED=0
        STATUS="TIMEOUT"
      elif echo "$OUTPUT" | grep -q "Error"; then
        SOLVED=0
        STATUS="ERROR"
      else
        SOLVED=0
        STATUS="FAIL"
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

      echo "      ─────────────────────────────────────────────"
      if [[ "$STATUS" == "SOLVED" ]]; then
        echo "      Run $run: ✅ $STATUS"
      elif [[ "$STATUS" == "TIMEOUT" ]]; then
        echo "      Run $run: ⏱️  $STATUS"
      else
        echo "      Run $run: ❌ $STATUS"
      fi
      echo "        Moves: ${MOVES:-0} total, ${CORRECT:-0} correct"
      echo "        Accuracy: ${ACC:-0}%"
      if [[ -n "$STRATEGIES" && "$STRATEGIES" != "0" ]]; then
        echo "        Strategies loaded: $STRATEGIES"
      fi
      echo ""

      # Write to CSV (one row per run for detailed tracking)
      echo "$NAME,$PROFILE,${UNIT:-none},$PUZZLE_NAME,$run,$SOLVED,${MOVES:-0},${CORRECT:-0},${ACC:-0},$STATUS" >> "$RESULTS_CSV"

      # Write to detailed log
      echo "[$NAME] $PUZZLE_NAME run $run: $STATUS (moves: ${MOVES:-0}, correct: ${CORRECT:-0}, acc: ${ACC:-0}%)" >> "$DETAIL_LOG"

      # Mark run as completed
      mark_run_completed "$NAME" "$PUZZLE_NAME" "$run"
      clear_current_run
      COMPLETED_COUNT=$((COMPLETED_COUNT + 1))

    done
  done

  echo ""
done

echo "=============================================="
echo "A/B/X TEST COMPLETE"
echo "=============================================="
echo ""
echo "Summary:"
echo "  Completed this session: $COMPLETED_COUNT"
echo "  Skipped (already done): $SKIPPED_COUNT"
echo "  Total progress: $(get_progress_stats)"
echo ""
echo "Results Summary:"
echo ""
# Show aggregated results by configuration
echo "Configuration,Profile,LearningUnit,Puzzle,Solved,Total,SolveRate,AvgMoves,AvgAccuracy"
tail -n +2 "$RESULTS_CSV" | awk -F',' '
{
  key=$1","$2","$3","$4
  total[key]++
  solved[key]+=$6
  moves[key]+=$7
  correct[key]+=$8
  acc[key]+=$9
}
END {
  for (k in total) {
    rate = (solved[k]/total[k])*100
    avgmoves = moves[k]/total[k]
    avgacc = acc[k]/total[k]
    printf "%s,%d,%d,%.1f%%,%.1f,%.1f%%\n", k, solved[k], total[k], rate, avgmoves, avgacc
  }
}' | sort | column -t -s','
echo ""
echo "Results saved to: $RESULTS_DIR"
echo "Progress file: $PROGRESS_FILE"
echo ""

# Generate leaderboard
echo ""
echo "Leaderboard (by solve rate):"
echo ""
tail -n +2 "$RESULTS_CSV" | awk -F',' '
{
  key=$1
  total[key]++
  solved[key]+=$6
  acc[key]+=$9
}
END {
  for (k in total) {
    rate = (solved[k]/total[k])*100
    avgacc = acc[k]/total[k]
    printf "%s,%.1f%%,%.1f%%\n", k, rate, avgacc
  }
}' | sort -t',' -k2 -rn | head -10 | column -t -s','
echo ""
echo "To resume an interrupted batch:"
echo "  $0 $CONFIG --resume $RESULTS_DIR"
