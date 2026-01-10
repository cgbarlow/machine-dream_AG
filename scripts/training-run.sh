#!/bin/bash
# Training Run Script
# Runs multiple plays with learning enabled, tracks results
# No A/B testing, no dreaming between runs
#
# Usage: ./scripts/training-run.sh [options]
#   --profile <name>        LLM profile to use (default: qwen3-coder)
#   --puzzle <path>         Puzzle file to use (required)
#   --runs <n>              Number of runs (default: 10)
#   --learning-unit <id>    Learning unit to use (default: "default")
#   --max-moves <n>         Max moves per puzzle (default: 200)
#   --stream                Show live gameplay during runs
#   --dream-after           Run dream cycle after all runs complete
#   --reasoning-template    Use structured constraint-intersection format (improves accuracy)
#   -h, --help              Show this help
#
# Examples:
#   ./scripts/training-run.sh --puzzle puzzles/9x9-easy.json --runs 10
#   ./scripts/training-run.sh --puzzle puzzles/4x4-expert.json --runs 5 --stream
#   ./scripts/training-run.sh --puzzle puzzles/9x9-medium.json --dream-after
#   ./scripts/training-run.sh --puzzle puzzles/9x9-easy.json --reasoning-template --runs 5

set -e

# Default values
PROFILE="qwen3-coder"
PUZZLE=""
RUNS=10
LEARNING_UNIT="default"
MAX_MOVES=200
STREAM=false
DREAM_AFTER=false
REASONING_TEMPLATE=false

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
    --max-moves)
      MAX_MOVES="$2"
      shift 2
      ;;
    --stream)
      STREAM=true
      shift
      ;;
    --dream-after)
      DREAM_AFTER=true
      shift
      ;;
    --reasoning-template)
      REASONING_TEMPLATE=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo "  --profile <name>        LLM profile to use (default: qwen3-coder)"
      echo "  --puzzle <path>         Puzzle file to use (required)"
      echo "  --runs <n>              Number of runs (default: 10)"
      echo "  --learning-unit <id>    Learning unit to use (default: \"default\")"
      echo "  --max-moves <n>         Max moves per puzzle (default: 200)"
      echo "  --stream                Show live gameplay during runs"
      echo "  --dream-after           Run dream cycle after all runs complete"
      echo "  --reasoning-template    Use structured constraint-intersection format"
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

# Validate puzzle is provided
if [ -z "$PUZZLE" ]; then
  echo "Error: --puzzle is required"
  echo "Usage: $0 --puzzle <path> [options]"
  exit 1
fi

# Check puzzle exists
if [ ! -f "$PUZZLE" ]; then
  echo "Error: Puzzle file not found: $PUZZLE"
  exit 1
fi

# Extract puzzle name for display
PUZZLE_NAME=$(basename "$PUZZLE" .json)

echo "=============================================="
echo "Training Run"
echo "=============================================="
echo "Profile: $PROFILE"
echo "Puzzle: $PUZZLE"
echo "Runs: $RUNS"
echo "Learning unit: $LEARNING_UNIT"
echo "Max moves: $MAX_MOVES"
echo "Stream: $STREAM"
echo "Dream after: $DREAM_AFTER"
echo "Reasoning template: $REASONING_TEMPLATE"
echo "=============================================="
echo ""

# Build extra options
EXTRA_OPTS=""
if [ "$STREAM" = true ]; then
  EXTRA_OPTS="$EXTRA_OPTS --visualize"
fi
if [ "$REASONING_TEMPLATE" = true ]; then
  EXTRA_OPTS="$EXTRA_OPTS --reasoning-template"
fi

# Track results
SOLVED=0
TOTAL_MOVES=0
TOTAL_ACC=0
ACC_COUNT=0

# Function to extract metrics from output
extract_metrics() {
  local output="$1"
  local moves=""
  local accuracy=""

  moves=$(echo "$output" | grep -oP 'Moves:\s*\K\d+' | head -1) || true
  if [ -z "$moves" ]; then
    moves=$(echo "$output" | grep -oP '\d+(?=\s+moves)' | head -1) || true
  fi

  accuracy=$(echo "$output" | grep -oP 'Accuracy:\s*\K[\d.]+' | head -1) || true
  if [ -z "$accuracy" ]; then
    accuracy=$(echo "$output" | grep -oP '[\d.]+(?=%\s*accuracy)' | head -1) || true
  fi

  echo "$moves|$accuracy"
}

# Run training
for i in $(seq 1 $RUNS); do
  echo ""
  echo "=============================================="
  echo "Run $i/$RUNS"
  echo "=============================================="

  # Create temp file for output
  TMPFILE=$(mktemp)

  if [ "$STREAM" = true ]; then
    # Stream mode: show output live AND capture it
    npx machine-dream llm play "$PUZZLE" \
      --profile "$PROFILE" \
      --learning-unit "$LEARNING_UNIT" \
      --max-moves "$MAX_MOVES" \
      $EXTRA_OPTS 2>&1 | tee "$TMPFILE" || true
    OUTPUT=$(cat "$TMPFILE")
  else
    # Quiet mode: just capture output
    OUTPUT=$(npx machine-dream llm play "$PUZZLE" \
      --profile "$PROFILE" \
      --learning-unit "$LEARNING_UNIT" \
      --max-moves "$MAX_MOVES" \
      $EXTRA_OPTS 2>&1) || true
  fi

  rm -f "$TMPFILE"

  # Extract metrics
  METRICS=$(extract_metrics "$OUTPUT")
  MOVES=$(echo "$METRICS" | cut -d'|' -f1)
  ACC=$(echo "$METRICS" | cut -d'|' -f2)

  # Check if solved
  if echo "$OUTPUT" | grep -q "SOLVED"; then
    SOLVED=$((SOLVED + 1))
    STATUS="SOLVED"
  else
    STATUS="Not solved"
  fi

  # Accumulate metrics
  if [ -n "$MOVES" ] && [ "$MOVES" -gt 0 ] 2>/dev/null; then
    TOTAL_MOVES=$((TOTAL_MOVES + MOVES))
  fi
  if [ -n "$ACC" ]; then
    TOTAL_ACC=$(echo "$TOTAL_ACC + $ACC" | bc)
    ACC_COUNT=$((ACC_COUNT + 1))
  fi

  # Display summary for this run
  echo ""
  DETAIL="Run $i: $STATUS"
  [ -n "$MOVES" ] && DETAIL="$DETAIL, ${MOVES} moves"
  [ -n "$ACC" ] && DETAIL="$DETAIL, ${ACC}% acc"
  echo ">>> $DETAIL"
done

# Calculate averages
AVG_MOVES="-"
AVG_ACC="-"
if [ $SOLVED -gt 0 ]; then
  AVG_MOVES=$(echo "scale=1; $TOTAL_MOVES / $SOLVED" | bc)
fi
if [ $ACC_COUNT -gt 0 ]; then
  AVG_ACC=$(echo "scale=1; $TOTAL_ACC / $ACC_COUNT" | bc)
fi

SOLVE_RATE=$(echo "scale=1; $SOLVED * 100 / $RUNS" | bc)

# Summary
echo ""
echo "=============================================="
echo "TRAINING RESULTS: $PUZZLE_NAME"
echo "=============================================="
echo ""
echo "Profile:        $PROFILE"
echo "Learning unit:  $LEARNING_UNIT"
echo "Puzzle:         $PUZZLE_NAME"
echo ""
echo "----------------------------------------------"
echo "Solved:         $SOLVED/$RUNS (${SOLVE_RATE}%)"
echo "Avg moves:      $AVG_MOVES"
echo "Avg accuracy:   ${AVG_ACC}%"
echo "----------------------------------------------"
echo ""
echo "=============================================="

# Show session list
echo ""
echo "=== Recent Sessions ==="
npx machine-dream llm session list --profile "$PROFILE" --limit 15 2>&1 | grep -v "Initializing\|AgentDB" || true

# Show learning unit status
echo ""
echo "=== Learning Unit Status ==="
npx machine-dream llm learning show "$LEARNING_UNIT" --profile "$PROFILE" --compact 2>&1 | grep -v "Initializing\|AgentDB" || true

# Dream after if requested
if [ "$DREAM_AFTER" = true ]; then
  echo ""
  echo "Running dream cycle to consolidate experiences..."
  npx machine-dream llm dream run --profile "$PROFILE" --learning-unit "$LEARNING_UNIT" || true
  echo ""
  echo "Dream cycle complete. View updated strategies with:"
  echo "  npx machine-dream llm learning show $LEARNING_UNIT"
fi

echo ""
echo "Done!"
