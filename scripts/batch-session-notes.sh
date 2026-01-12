#!/bin/bash
# Batch update session notes
# Usage: ./scripts/batch-session-notes.sh --profile <name> --unit <name> --notes "your notes" [--limit <n>]

set -e

# Default values
PROFILE=""
UNIT=""
NOTES=""
LIMIT="100"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --profile)
      PROFILE="$2"
      shift 2
      ;;
    --unit)
      UNIT="$2"
      shift 2
      ;;
    --notes)
      NOTES="$2"
      shift 2
      ;;
    --limit)
      LIMIT="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 --profile <name> --unit <name> --notes \"your notes\" [--limit <n>]"
      exit 1
      ;;
  esac
done

# Validate required arguments
if [ -z "$NOTES" ]; then
  echo "Error: --notes is required"
  echo "Usage: $0 --profile <name> --unit <name> --notes \"your notes\" [--limit <n>]"
  exit 1
fi

# Build filter options
FILTER_OPTS=""
[ -n "$PROFILE" ] && FILTER_OPTS="$FILTER_OPTS --profile $PROFILE"
[ -n "$UNIT" ] && FILTER_OPTS="$FILTER_OPTS --unit $UNIT"

echo "Fetching sessions..."
echo "  Profile: ${PROFILE:-all}"
echo "  Unit: ${UNIT:-all}"
echo "  Limit: $LIMIT"
echo "  Notes: \"$NOTES\""
echo ""

# Get session IDs (skip initialization messages, extract JSON)
SESSION_IDS=$(npx machine-dream llm session list $FILTER_OPTS --format json --limit "$LIMIT" 2>/dev/null | \
  sed -n '/^\[/,/^\]/p' | \
  jq -r '.[].sessionId' 2>/dev/null)

if [ -z "$SESSION_IDS" ]; then
  echo "No sessions found matching criteria."
  exit 0
fi

# Count sessions
COUNT=$(echo "$SESSION_IDS" | wc -l)
echo "Found $COUNT sessions to update."
echo ""

# Update each session
UPDATED=0
for SESSION_ID in $SESSION_IDS; do
  echo -n "Updating $SESSION_ID... "
  npx machine-dream llm session edit "$SESSION_ID" --notes "$NOTES" 2>/dev/null | grep -q "Updated" && echo "done" || echo "failed"
  UPDATED=$((UPDATED + 1))
done

echo ""
echo "Updated $UPDATED sessions."
