#!/bin/bash
# List all sessions and memories NOT played with 4x4-expert puzzle

set -e

echo "📋 Finding sessions NOT played with 4x4-expert puzzle..."
echo ""

# Get all sessions as JSON
SESSIONS_JSON=$(node dist/cli-bin.js llm session list --format json 2>/dev/null || echo "[]")

# Filter out 4x4-expert sessions using jq
NON_EXPERT=$(echo "$SESSIONS_JSON" | jq '[.[] | select(.puzzleId != "4x4-expert")]')

# Count results
TOTAL=$(echo "$SESSIONS_JSON" | jq 'length')
NON_EXPERT_COUNT=$(echo "$NON_EXPERT" | jq 'length')
EXPERT_COUNT=$((TOTAL - NON_EXPERT_COUNT))

echo "📊 Summary:"
echo "   Total sessions: $TOTAL"
echo "   4x4-expert sessions: $EXPERT_COUNT"
echo "   Other sessions: $NON_EXPERT_COUNT"
echo ""

if [ "$NON_EXPERT_COUNT" -eq 0 ]; then
  echo "✓ No sessions found (all are 4x4-expert or no sessions exist)"
  exit 0
fi

echo "🎯 Sessions NOT using 4x4-expert:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Display each non-expert session
echo "$NON_EXPERT" | jq -r '.[] |
  "Session: \(.sessionId)
  Puzzle:  \(.puzzleId)
  Profile: \(.profileName)
  Moves:   \(.totalMoves)
  Done:    \(.completion)%
  Solved:  \(if .solved then "✓" else "✗" end)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "'

echo ""
echo "💡 To view details of a session: machine-dream llm session show <session-id>"
echo "💡 To delete a specific session: machine-dream llm memory clear --session <session-id>"
