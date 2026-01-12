#!/bin/bash
# A/B Test: Learning vs No Learning
# Runs baseline sessions, optionally runs dream cycle, then learning sessions
#
# Usage: ./scripts/ab-test-learning.sh [options]
#   --profile <name>        LLM profile to use (default: qwen3-coder)
#   --puzzle <path>         Puzzle file to use (default: puzzles/4x4-expert.json)
#   --runs <n>              Number of runs per phase (default: 10)
#   --learning-unit <id>    Use specific learning unit (default: "default")
#   --stream                Show live gameplay during runs (verbose mode)
#   --skip-dream            Skip Phase 2 (dream cycle) - use existing learned strategies
#   --reasoning-template    Use structured constraint-intersection format (improves accuracy)
#   --anonymous-patterns    Use anonymous pattern format for learned strategies
#   --debug                 Show full prompts sent to LLM
#   -h, --help              Show this help
#
# Examples:
#   ./scripts/ab-test-learning.sh --puzzle puzzles/4x4-diabolical.json
#   ./scripts/ab-test-learning.sh --skip-dream --runs 5
#   ./scripts/ab-test-learning.sh --profile qwen3-coder --learning-unit training-v1
#   ./scripts/ab-test-learning.sh --stream --runs 2
#   ./scripts/ab-test-learning.sh --reasoning-template --runs 5

set -e

# Default values
PROFILE="qwen3-coder"
PUZZLE="puzzles/4x4-expert.json"
RUNS=10
SKIP_DREAM=false
LEARNING_UNIT="default"
STREAM=false
REASONING_TEMPLATE=false
ANONYMOUS_PATTERNS=false
DEBUG=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --profile)
      PROFILE="$2"
      shift 2
      ;;
    --puzzle)
      PUZZLE="$2"
      shift 2
      ;;
    --runs)
      RUNS="$2"
      shift 2
      ;;
    --learning-unit)
      LEARNING_UNIT="$2"
      shift 2
      ;;
    --stream)
      STREAM=true
      shift
      ;;
    --skip-dream)
      SKIP_DREAM=true
      shift
      ;;
    --reasoning-template)
      REASONING_TEMPLATE=true
      shift
      ;;
    --anonymous-patterns)
      ANONYMOUS_PATTERNS=true
      shift
      ;;
    --debug)
      DEBUG=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo "  --profile <name>        LLM profile to use (default: qwen3-coder)"
      echo "  --puzzle <path>         Puzzle file to use (default: puzzles/4x4-expert.json)"
      echo "  --runs <n>              Number of runs per phase (default: 10)"
      echo "  --learning-unit <id>    Use specific learning unit (default: \"default\")"
      echo "  --stream                Show live gameplay during runs (verbose mode)"
      echo "  --skip-dream            Skip Phase 2 (dream cycle) - use existing learned strategies"
      echo "  --reasoning-template    Use structured constraint-intersection format"
      echo "  --anonymous-patterns    Use anonymous pattern format for learned strategies"
      echo "  --debug                 Show full prompts sent to LLM"
      echo "  -h, --help              Show this help"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

RESULTS_DIR="./ab-test-results/$(date +%Y%m%d_%H%M%S)"

echo "=============================================="
echo "A/B Test: Learning vs No Learning"
echo "=============================================="
echo "Profile: $PROFILE"
echo "Puzzle: $PUZZLE"
echo "Runs per phase: $RUNS"
echo "Learning unit: $LEARNING_UNIT"
echo "Stream mode: $STREAM"
echo "Skip dream cycle: $SKIP_DREAM"
echo "Reasoning template: $REASONING_TEMPLATE"
echo "Anonymous patterns: $ANONYMOUS_PATTERNS"
echo "Debug mode: $DEBUG"
echo "Results: $RESULTS_DIR"
echo "=============================================="
echo ""

# Build extra options for play command
EXTRA_OPTS=""
if [ "$STREAM" = true ]; then
  EXTRA_OPTS="$EXTRA_OPTS --visualize"
fi
if [ "$REASONING_TEMPLATE" = true ]; then
  EXTRA_OPTS="$EXTRA_OPTS --reasoning-template"
fi
if [ "$ANONYMOUS_PATTERNS" = true ]; then
  EXTRA_OPTS="$EXTRA_OPTS --anonymous-patterns"
fi
if [ "$DEBUG" = true ]; then
  EXTRA_OPTS="$EXTRA_OPTS --debug"
fi

# Build extra options for dream command
DREAM_OPTS=""
if [ "$ANONYMOUS_PATTERNS" = true ]; then
  DREAM_OPTS="$DREAM_OPTS --anonymous-patterns"
fi

mkdir -p "$RESULTS_DIR"

# Function to extract metrics from output
extract_metrics() {
  local output="$1"
  local moves=""
  local accuracy=""

  # Extract moves (look for "Moves: X" or similar patterns)
  moves=$(echo "$output" | grep -oP 'Moves:\s*\K\d+' | head -1) || true
  if [ -z "$moves" ]; then
    moves=$(echo "$output" | grep -oP 'Total moves:\s*\K\d+' | head -1) || true
  fi
  if [ -z "$moves" ]; then
    # Try to extract from session summary line
    moves=$(echo "$output" | grep -oP '\d+(?=\s+moves)' | head -1) || true
  fi

  # Extract accuracy (look for "Accuracy: X%" or "X% accuracy")
  accuracy=$(echo "$output" | grep -oP 'Accuracy:\s*\K[\d.]+' | head -1) || true
  if [ -z "$accuracy" ]; then
    accuracy=$(echo "$output" | grep -oP '[\d.]+(?=%\s*accuracy)' | head -1) || true
  fi
  if [ -z "$accuracy" ]; then
    # Try to extract from the final stats line (e.g., "10 moves, 90.0% accuracy")
    accuracy=$(echo "$output" | grep -oP '\d+\s+moves.*?(\d+\.?\d*)%' | grep -oP '(\d+\.?\d*)(?=%)' | head -1) || true
  fi

  echo "$moves|$accuracy"
}

# Write header to summary
cat > "$RESULTS_DIR/summary.txt" << EOF
A/B Test Results
================
Profile: $PROFILE
Puzzle: $PUZZLE
Runs per phase: $RUNS
Learning unit: $LEARNING_UNIT
Stream mode: $STREAM
Skip dream cycle: $SKIP_DREAM
Date: $(date)

EOF

# Phase 1: Baseline (no learning)
echo "=== Phase 1: Baseline ($RUNS runs, no learning) ==="
echo "" >> "$RESULTS_DIR/summary.txt"
echo "--- Baseline Runs (no learning) ---" >> "$RESULTS_DIR/summary.txt"

BASELINE_SOLVED=0
BASELINE_TOTAL_MOVES=0
BASELINE_TOTAL_ACC=0
BASELINE_ACC_COUNT=0

for i in $(seq 1 $RUNS); do
  echo "Baseline run $i/$RUNS..."
  if [ "$STREAM" = true ]; then
    # Stream to stdout AND capture to file
    npx machine-dream llm play "$PUZZLE" --profile "$PROFILE" --no-learning --max-moves 100 $EXTRA_OPTS 2>&1 | tee "$RESULTS_DIR/baseline_$i.log" || true
    OUTPUT=$(cat "$RESULTS_DIR/baseline_$i.log")
  else
    OUTPUT=$(npx machine-dream llm play "$PUZZLE" --profile "$PROFILE" --no-learning --max-moves 100 $EXTRA_OPTS 2>&1) || true
    echo "$OUTPUT" > "$RESULTS_DIR/baseline_$i.log"
  fi

  # Extract metrics
  METRICS=$(extract_metrics "$OUTPUT")
  MOVES=$(echo "$METRICS" | cut -d'|' -f1)
  ACC=$(echo "$METRICS" | cut -d'|' -f2)

  # Check if solved
  if echo "$OUTPUT" | grep -q "SOLVED"; then
    BASELINE_SOLVED=$((BASELINE_SOLVED + 1))
    STATUS="SOLVED"
  else
    STATUS="Not solved"
  fi

  # Accumulate metrics
  if [ -n "$MOVES" ] && [ "$MOVES" -gt 0 ] 2>/dev/null; then
    BASELINE_TOTAL_MOVES=$((BASELINE_TOTAL_MOVES + MOVES))
  fi
  if [ -n "$ACC" ]; then
    BASELINE_TOTAL_ACC=$(echo "$BASELINE_TOTAL_ACC + $ACC" | bc)
    BASELINE_ACC_COUNT=$((BASELINE_ACC_COUNT + 1))
  fi

  # Display and log
  DETAIL="$STATUS"
  [ -n "$MOVES" ] && DETAIL="$DETAIL, ${MOVES} moves"
  [ -n "$ACC" ] && DETAIL="$DETAIL, ${ACC}% acc"
  echo "  -> $DETAIL"
  echo "Run $i: $DETAIL" >> "$RESULTS_DIR/summary.txt"
done

# Calculate averages
BASELINE_AVG_MOVES="-"
BASELINE_AVG_ACC="-"
if [ $BASELINE_SOLVED -gt 0 ]; then
  BASELINE_AVG_MOVES=$(echo "scale=1; $BASELINE_TOTAL_MOVES / $BASELINE_SOLVED" | bc)
fi
if [ $BASELINE_ACC_COUNT -gt 0 ]; then
  BASELINE_AVG_ACC=$(echo "scale=1; $BASELINE_TOTAL_ACC / $BASELINE_ACC_COUNT" | bc)
fi

echo ""
echo "Baseline: $BASELINE_SOLVED/$RUNS solved, avg moves: $BASELINE_AVG_MOVES, avg accuracy: $BASELINE_AVG_ACC%"
echo "" >> "$RESULTS_DIR/summary.txt"
echo "Baseline summary: $BASELINE_SOLVED/$RUNS solved, avg moves: $BASELINE_AVG_MOVES, avg accuracy: $BASELINE_AVG_ACC%" >> "$RESULTS_DIR/summary.txt"

# Phase 2: Dream cycle (optional)
if [ "$SKIP_DREAM" = false ]; then
  echo ""
  echo "=== Phase 2: Run dream cycle ==="
  echo "" >> "$RESULTS_DIR/summary.txt"
  echo "--- Dream Cycle ---" >> "$RESULTS_DIR/summary.txt"

  echo "Running dream cycle..."
  npx machine-dream llm dream run --profile "$PROFILE" --learning-unit "$LEARNING_UNIT" $DREAM_OPTS 2>&1 | tee "$RESULTS_DIR/dream.log" || true

  echo "Showing learned strategies..."
  npx machine-dream llm learning show "$LEARNING_UNIT" --profile "$PROFILE" 2>&1 | tee "$RESULTS_DIR/learning_unit.log" || true

  echo "Dream cycle complete" >> "$RESULTS_DIR/summary.txt"
else
  echo ""
  echo "=== Phase 2: SKIPPED (--skip-dream) ==="
  echo "" >> "$RESULTS_DIR/summary.txt"
  echo "--- Dream Cycle: SKIPPED ---" >> "$RESULTS_DIR/summary.txt"
  echo "Using existing learned strategies" >> "$RESULTS_DIR/summary.txt"
fi

# Phase 3: Learning runs
echo ""
echo "=== Phase 3: Learning ($RUNS runs, with learning) ==="
echo "" >> "$RESULTS_DIR/summary.txt"
echo "--- Learning Runs (with learning) ---" >> "$RESULTS_DIR/summary.txt"

LEARNING_SOLVED=0
LEARNING_TOTAL_MOVES=0
LEARNING_TOTAL_ACC=0
LEARNING_ACC_COUNT=0

for i in $(seq 1 $RUNS); do
  echo "Learning run $i/$RUNS..."
  if [ "$STREAM" = true ]; then
    # Stream to stdout AND capture to file
    npx machine-dream llm play "$PUZZLE" --profile "$PROFILE" --learning-unit "$LEARNING_UNIT" --max-moves 100 $EXTRA_OPTS 2>&1 | tee "$RESULTS_DIR/learning_$i.log" || true
    OUTPUT=$(cat "$RESULTS_DIR/learning_$i.log")
  else
    OUTPUT=$(npx machine-dream llm play "$PUZZLE" --profile "$PROFILE" --learning-unit "$LEARNING_UNIT" --max-moves 100 $EXTRA_OPTS 2>&1) || true
    echo "$OUTPUT" > "$RESULTS_DIR/learning_$i.log"
  fi

  # Extract metrics
  METRICS=$(extract_metrics "$OUTPUT")
  MOVES=$(echo "$METRICS" | cut -d'|' -f1)
  ACC=$(echo "$METRICS" | cut -d'|' -f2)

  # Check if solved
  if echo "$OUTPUT" | grep -q "SOLVED"; then
    LEARNING_SOLVED=$((LEARNING_SOLVED + 1))
    STATUS="SOLVED"
  else
    STATUS="Not solved"
  fi

  # Accumulate metrics
  if [ -n "$MOVES" ] && [ "$MOVES" -gt 0 ] 2>/dev/null; then
    LEARNING_TOTAL_MOVES=$((LEARNING_TOTAL_MOVES + MOVES))
  fi
  if [ -n "$ACC" ]; then
    LEARNING_TOTAL_ACC=$(echo "$LEARNING_TOTAL_ACC + $ACC" | bc)
    LEARNING_ACC_COUNT=$((LEARNING_ACC_COUNT + 1))
  fi

  # Display and log
  DETAIL="$STATUS"
  [ -n "$MOVES" ] && DETAIL="$DETAIL, ${MOVES} moves"
  [ -n "$ACC" ] && DETAIL="$DETAIL, ${ACC}% acc"
  echo "  -> $DETAIL"
  echo "Run $i: $DETAIL" >> "$RESULTS_DIR/summary.txt"
done

# Calculate averages
LEARNING_AVG_MOVES="-"
LEARNING_AVG_ACC="-"
if [ $LEARNING_SOLVED -gt 0 ]; then
  LEARNING_AVG_MOVES=$(echo "scale=1; $LEARNING_TOTAL_MOVES / $LEARNING_SOLVED" | bc)
fi
if [ $LEARNING_ACC_COUNT -gt 0 ]; then
  LEARNING_AVG_ACC=$(echo "scale=1; $LEARNING_TOTAL_ACC / $LEARNING_ACC_COUNT" | bc)
fi

echo ""
echo "Learning: $LEARNING_SOLVED/$RUNS solved, avg moves: $LEARNING_AVG_MOVES, avg accuracy: $LEARNING_AVG_ACC%"
echo "" >> "$RESULTS_DIR/summary.txt"
echo "Learning summary: $LEARNING_SOLVED/$RUNS solved, avg moves: $LEARNING_AVG_MOVES, avg accuracy: $LEARNING_AVG_ACC%" >> "$RESULTS_DIR/summary.txt"

# Phase 4: Enhanced Analysis
echo ""
echo "=== Phase 4: Enhanced Analysis ==="
echo "" >> "$RESULTS_DIR/summary.txt"
echo "--- Enhanced Analysis ---" >> "$RESULTS_DIR/summary.txt"

# Get session list
npx machine-dream llm session list --profile "$PROFILE" --limit 25 2>&1 | tee "$RESULTS_DIR/session_list.txt" || true

# Calculate differences
SOLVE_DIFF=$((LEARNING_SOLVED - BASELINE_SOLVED))

# Calculate move difference (negative = fewer moves = better)
MOVE_DIFF="-"
if [ "$BASELINE_AVG_MOVES" != "-" ] && [ "$LEARNING_AVG_MOVES" != "-" ]; then
  MOVE_DIFF=$(echo "scale=1; $LEARNING_AVG_MOVES - $BASELINE_AVG_MOVES" | bc)
fi

# Calculate accuracy difference (positive = better)
ACC_DIFF="-"
if [ "$BASELINE_AVG_ACC" != "-" ] && [ "$LEARNING_AVG_ACC" != "-" ]; then
  ACC_DIFF=$(echo "scale=1; $LEARNING_AVG_ACC - $BASELINE_AVG_ACC" | bc)
fi

# Summary
echo ""
echo "=============================================="
echo "A/B TEST RESULTS - ENHANCED ANALYSIS"
echo "=============================================="
echo ""
echo "                    Baseline    Learning    Diff"
echo "----------------------------------------------"
printf "Solve rate:         %d/%d        %d/%d        %+d\n" $BASELINE_SOLVED $RUNS $LEARNING_SOLVED $RUNS $SOLVE_DIFF
printf "Avg moves:          %-10s  %-10s  %s\n" "$BASELINE_AVG_MOVES" "$LEARNING_AVG_MOVES" "$MOVE_DIFF"
printf "Avg accuracy:       %-10s  %-10s  %s%%\n" "${BASELINE_AVG_ACC}%" "${LEARNING_AVG_ACC}%" "$ACC_DIFF"
echo "----------------------------------------------"
echo ""

# Interpretation
echo "Interpretation:"
if [ $SOLVE_DIFF -gt 0 ]; then
  echo "  [+] Learning improved solve rate by +$SOLVE_DIFF puzzles"
elif [ $SOLVE_DIFF -lt 0 ]; then
  echo "  [-] Learning HURT solve rate by $SOLVE_DIFF puzzles"
else
  echo "  [=] No difference in solve rate"
fi

if [ "$MOVE_DIFF" != "-" ]; then
  MOVE_CMP=$(echo "$MOVE_DIFF < 0" | bc)
  if [ "$MOVE_CMP" = "1" ]; then
    echo "  [+] Learning uses fewer moves (more efficient)"
  else
    MOVE_CMP=$(echo "$MOVE_DIFF > 0" | bc)
    if [ "$MOVE_CMP" = "1" ]; then
      echo "  [-] Learning uses more moves (less efficient)"
    else
      echo "  [=] No difference in move count"
    fi
  fi
fi

if [ "$ACC_DIFF" != "-" ]; then
  ACC_CMP=$(echo "$ACC_DIFF > 0" | bc)
  if [ "$ACC_CMP" = "1" ]; then
    echo "  [+] Learning has higher accuracy"
  else
    ACC_CMP=$(echo "$ACC_DIFF < 0" | bc)
    if [ "$ACC_CMP" = "1" ]; then
      echo "  [-] Learning has lower accuracy"
    else
      echo "  [=] No difference in accuracy"
    fi
  fi
fi

echo ""
echo "=============================================="
echo ""
echo "Results saved to: $RESULTS_DIR"
echo "View summary: cat $RESULTS_DIR/summary.txt"
echo "View session list: cat $RESULTS_DIR/session_list.txt"

# Write final summary
cat >> "$RESULTS_DIR/summary.txt" << EOF

==============================================
ENHANCED ANALYSIS RESULTS
==============================================

                    Baseline    Learning    Diff
----------------------------------------------
Solve rate:         $BASELINE_SOLVED/$RUNS        $LEARNING_SOLVED/$RUNS        $SOLVE_DIFF
Avg moves:          $BASELINE_AVG_MOVES          $LEARNING_AVG_MOVES          $MOVE_DIFF
Avg accuracy:       ${BASELINE_AVG_ACC}%         ${LEARNING_AVG_ACC}%         ${ACC_DIFF}%
----------------------------------------------

==============================================
EOF
