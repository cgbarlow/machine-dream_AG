#!/bin/bash
# List all sessions NOT played with 4x4-expert puzzle (no jq required)

set -e

echo "📋 Finding sessions NOT played with 4x4-expert puzzle..."
echo ""

# Get all sessions in text format
SESSIONS=$(node dist/cli-bin.js llm session list --format text 2>/dev/null)

# Filter out lines containing "4x4-expert"
echo "$SESSIONS" | grep -v "4x4-expert" || echo "No non-expert sessions found"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Sessions with '4x4-expert' have been filtered out"
echo "💡 To view details: machine-dream llm session show <session-id>"
echo "💡 To delete a session: machine-dream llm memory clear --session <session-id>"
