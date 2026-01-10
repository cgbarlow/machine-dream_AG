#!/bin/bash
# Iterative Learning Script
# Runs play sessions in batches, consolidating learning after each batch
# Tracks improvement over time to measure learning effectiveness
#
# Usage: ./scripts/iterative-learning.sh [options]
#   --profile <name>        LLM profile to use (default: qwen3-coder)
#   --puzzle <path>         Puzzle file to use (default: puzzles/4x4-expert.json)
#   --batch-size <n>        Number of plays before dreaming (default: 1)
#   --total-plays <n>       Total number of plays (default: 10)
#   --learning-unit <id>    Learning unit to use/update (auto-creates if missing)
#   --stream                Show live gameplay during runs
#   --reasoning-template    Use structured constraint-intersection format (improves accuracy)
#   --anonymous-patterns    Use anonymous pattern format for learned strategies
#   -h, --help              Show this help
#
# Examples:
#   ./scripts/iterative-learning.sh --batch-size 2 --total-plays 10
#   ./scripts/iterative-learning.sh --learning-unit training-v1 --batch-size 1
#   ./scripts/iterative-learning.sh --stream --total-plays 5
#   ./scripts/iterative-learning.sh --reasoning-template --total-plays 5

set -e

# Default values
PROFILE="qwen3-coder"
PUZZLE="puzzles/4x4-expert.json"
BATCH_SIZE=1
TOTAL_PLAYS=10
LEARNING_UNIT=""
STREAM=false
REASONING_TEMPLATE=false
ANONYMOUS_PATTERNS=false

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
    --batch-size)
      BATCH_SIZE="$2"
      shift 2
      ;;
    --total-plays)
      TOTAL_PLAYS="$2"
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
    --reasoning-template)
      REASONING_TEMPLATE=true
      shift
      ;;
    --anonymous-patterns)
      ANONYMOUS_PATTERNS=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo "  --profile <name>        LLM profile to use (default: qwen3-coder)"
      echo "  --puzzle <path>         Puzzle file to use (default: puzzles/4x4-expert.json)"
      echo "  --batch-size <n>        Number of plays before dreaming (default: 1)"
      echo "  --total-plays <n>       Total number of plays (default: 10)"
      echo "  --learning-unit <id>    Learning unit to use/update (auto-creates if missing)"
      echo "  --stream                Show live gameplay during runs"
      echo "  --reasoning-template    Use structured constraint-intersection format"
      echo "  --anonymous-patterns    Use anonymous pattern format for learned strategies"
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

# Generate learning unit ID if not specified
if [ -z "$LEARNING_UNIT" ]; then
  LEARNING_UNIT="iterative-$(date +%Y%m%d_%H%M%S)"
  echo "Auto-generated learning unit: $LEARNING_UNIT"
fi

RESULTS_DIR="./iterative-results/$LEARNING_UNIT"
mkdir -p "$RESULTS_DIR"

echo "=============================================="
echo "Iterative Learning"
echo "=============================================="
echo "Profile: $PROFILE"
echo "Puzzle: $PUZZLE"
echo "Batch size: $BATCH_SIZE plays before dreaming"
echo "Total plays: $TOTAL_PLAYS"
echo "Learning unit: $LEARNING_UNIT"
echo "Stream mode: $STREAM"
echo "Reasoning template: $REASONING_TEMPLATE"
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

# Function to extract metrics from output
extract_metrics() {
  local output="$1"
  local moves=""
  local accuracy=""

  # Extract moves
  moves=$(echo "$output" | grep -oP 'Moves:\s*\K\d+' | head -1) || true
  if [ -z "$moves" ]; then
    moves=$(echo "$output" | grep -oP 'Total moves:\s*\K\d+' | head -1) || true
  fi
  if [ -z "$moves" ]; then
    moves=$(echo "$output" | grep -oP '\d+(?=\s+moves)' | head -1) || true
  fi

  # Extract accuracy
  accuracy=$(echo "$output" | grep -oP 'Accuracy:\s*\K[\d.]+' | head -1) || true
  if [ -z "$accuracy" ]; then
    accuracy=$(echo "$output" | grep -oP '[\d.]+(?=%\s*accuracy)' | head -1) || true
  fi
  if [ -z "$accuracy" ]; then
    accuracy=$(echo "$output" | grep -oP '\d+\s+moves.*?(\d+\.?\d*)%' | grep -oP '(\d+\.?\d*)(?=%)' | head -1) || true
  fi

  echo "$moves|$accuracy"
}

# Check if learning unit exists, create if needed
echo "Checking learning unit..."
UNIT_EXISTS=$(npx machine-dream llm learning show "$LEARNING_UNIT" --profile "$PROFILE" 2>&1) || true
if echo "$UNIT_EXISTS" | grep -q "not found"; then
  echo "Creating learning unit: $LEARNING_UNIT"
  npx machine-dream llm learning create "$LEARNING_UNIT" --profile "$PROFILE" --name "Iterative Learning" --description "Created by iterative-learning.sh" || true
else
  echo "Using existing learning unit: $LEARNING_UNIT"
fi

# Write header to summary
cat > "$RESULTS_DIR/summary.txt" << EOF
Iterative Learning Results
==========================
Profile: $PROFILE
Puzzle: $PUZZLE
Batch size: $BATCH_SIZE
Total plays: $TOTAL_PLAYS
Learning unit: $LEARNING_UNIT
Date: $(date)

EOF

# Arrays to track results
declare -a BATCH_SOLVE_RATES
declare -a BATCH_ACCURACIES
declare -a CUMULATIVE_SOLVES

# Main iterative learning loop
PLAY_COUNT=0
BATCH_NUM=0
TOTAL_SOLVED=0
PLAYS_IN_BATCH=0
BATCH_SOLVED=0
BATCH_ACC_SUM=0
BATCH_ACC_COUNT=0

echo ""
echo "Starting iterative learning..."
echo ""

while [ $PLAY_COUNT -lt $TOTAL_PLAYS ]; do
  PLAY_COUNT=$((PLAY_COUNT + 1))
  PLAYS_IN_BATCH=$((PLAYS_IN_BATCH + 1))

  echo "--- Play $PLAY_COUNT/$TOTAL_PLAYS (Batch $((BATCH_NUM + 1)), play $PLAYS_IN_BATCH of $BATCH_SIZE) ---"

  # Run play session
  OUTPUT=$(npx machine-dream llm play "$PUZZLE" --profile "$PROFILE" --learning-unit "$LEARNING_UNIT" --max-moves 100 $EXTRA_OPTS 2>&1) || true
  echo "$OUTPUT" > "$RESULTS_DIR/play_${PLAY_COUNT}.log"

  # Extract metrics
  METRICS=$(extract_metrics "$OUTPUT")
  MOVES=$(echo "$METRICS" | cut -d'|' -f1)
  ACC=$(echo "$METRICS" | cut -d'|' -f2)

  # Check if solved
  if echo "$OUTPUT" | grep -q "SOLVED"; then
    TOTAL_SOLVED=$((TOTAL_SOLVED + 1))
    BATCH_SOLVED=$((BATCH_SOLVED + 1))
    STATUS="SOLVED"
  else
    STATUS="Not solved"
  fi

  # Accumulate accuracy
  if [ -n "$ACC" ]; then
    BATCH_ACC_SUM=$(echo "$BATCH_ACC_SUM + $ACC" | bc)
    BATCH_ACC_COUNT=$((BATCH_ACC_COUNT + 1))
  fi

  # Display
  DETAIL="$STATUS"
  [ -n "$MOVES" ] && DETAIL="$DETAIL, ${MOVES} moves"
  [ -n "$ACC" ] && DETAIL="$DETAIL, ${ACC}% acc"
  echo "  -> $DETAIL"
  echo "Play $PLAY_COUNT: $DETAIL" >> "$RESULTS_DIR/summary.txt"

  # Check if batch is complete
  if [ $PLAYS_IN_BATCH -ge $BATCH_SIZE ] || [ $PLAY_COUNT -ge $TOTAL_PLAYS ]; then
    BATCH_NUM=$((BATCH_NUM + 1))

    # Calculate batch metrics
    BATCH_SOLVE_RATE="$BATCH_SOLVED/$PLAYS_IN_BATCH"
    BATCH_AVG_ACC="-"
    if [ $BATCH_ACC_COUNT -gt 0 ]; then
      BATCH_AVG_ACC=$(echo "scale=1; $BATCH_ACC_SUM / $BATCH_ACC_COUNT" | bc)
    fi

    echo ""
    echo "=== Batch $BATCH_NUM Complete ==="
    echo "  Solved: $BATCH_SOLVED/$PLAYS_IN_BATCH"
    echo "  Avg accuracy: ${BATCH_AVG_ACC}%"
    echo "  Cumulative solved: $TOTAL_SOLVED/$PLAY_COUNT"
    echo "" >> "$RESULTS_DIR/summary.txt"
    echo "Batch $BATCH_NUM: Solved $BATCH_SOLVED/$PLAYS_IN_BATCH, Avg accuracy: ${BATCH_AVG_ACC}%, Cumulative: $TOTAL_SOLVED/$PLAY_COUNT" >> "$RESULTS_DIR/summary.txt"

    # Store batch results
    BATCH_SOLVE_RATES+=("$BATCH_SOLVE_RATE")
    BATCH_ACCURACIES+=("$BATCH_AVG_ACC")
    CUMULATIVE_SOLVES+=("$TOTAL_SOLVED")

    # Run dream cycle if not the last batch (or if there are experiences to consolidate)
    if [ $PLAY_COUNT -lt $TOTAL_PLAYS ]; then
      echo ""
      echo "Running dream cycle to consolidate learning..."
      npx machine-dream llm dream run --profile "$PROFILE" --learning-unit "$LEARNING_UNIT" 2>&1 | tee "$RESULTS_DIR/dream_batch${BATCH_NUM}.log" || true
      echo "Dream cycle complete"
      echo "Dream cycle $BATCH_NUM complete" >> "$RESULTS_DIR/summary.txt"
      echo ""
    fi

    # Reset batch counters
    PLAYS_IN_BATCH=0
    BATCH_SOLVED=0
    BATCH_ACC_SUM=0
    BATCH_ACC_COUNT=0
  fi
done

# Final dream cycle
echo ""
echo "=== Final Dream Cycle ==="
npx machine-dream llm dream run --profile "$PROFILE" --learning-unit "$LEARNING_UNIT" 2>&1 | tee "$RESULTS_DIR/dream_final.log" || true

# Show final learning unit state
echo ""
echo "=== Final Learning Unit State ==="
npx machine-dream llm learning show "$LEARNING_UNIT" --profile "$PROFILE" 2>&1 | tee "$RESULTS_DIR/learning_unit_final.log" || true

# Calculate overall solve rate
OVERALL_SOLVE_RATE=$(echo "scale=1; $TOTAL_SOLVED * 100 / $TOTAL_PLAYS" | bc)

# Summary
echo ""
echo "=============================================="
echo "ITERATIVE LEARNING RESULTS"
echo "=============================================="
echo ""
echo "Profile: $PROFILE"
echo "Learning unit: $LEARNING_UNIT"
echo "Total plays: $TOTAL_PLAYS"
echo "Batches: $BATCH_NUM (size: $BATCH_SIZE)"
echo ""
echo "Overall solve rate: $TOTAL_SOLVED/$TOTAL_PLAYS (${OVERALL_SOLVE_RATE}%)"
echo ""
echo "Batch progression:"
for i in "${!BATCH_SOLVE_RATES[@]}"; do
  echo "  Batch $((i + 1)): ${BATCH_SOLVE_RATES[$i]} solved, ${BATCH_ACCURACIES[$i]}% avg accuracy, cumulative: ${CUMULATIVE_SOLVES[$i]}"
done
echo ""
echo "=============================================="
echo ""
echo "Results saved to: $RESULTS_DIR"
echo "View summary: cat $RESULTS_DIR/summary.txt"
echo "View learning unit: npx machine-dream llm learning show $LEARNING_UNIT"

# Write final summary
cat >> "$RESULTS_DIR/summary.txt" << EOF

==============================================
ITERATIVE LEARNING SUMMARY
==============================================

Overall solve rate: $TOTAL_SOLVED/$TOTAL_PLAYS (${OVERALL_SOLVE_RATE}%)
Batches: $BATCH_NUM (size: $BATCH_SIZE)

Batch progression:
EOF

for i in "${!BATCH_SOLVE_RATES[@]}"; do
  echo "  Batch $((i + 1)): ${BATCH_SOLVE_RATES[$i]} solved, ${BATCH_ACCURACIES[$i]}% avg accuracy" >> "$RESULTS_DIR/summary.txt"
done

echo "" >> "$RESULTS_DIR/summary.txt"
echo "===============================================" >> "$RESULTS_DIR/summary.txt"
