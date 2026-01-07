/**
 * Move History Component
 *
 * Shows LLM reasoning and validation results for recent moves
 */

import React from 'react';
import { Box, Text } from 'ink';

export interface MoveEntry {
  moveNumber: number;
  row: number;
  col: number;
  value: number;
  reasoning: string;
  outcome: 'correct' | 'invalid' | 'valid_but_wrong';
  error?: string;
}

interface MoveHistoryProps {
  moves: MoveEntry[];
  maxLines?: number;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  moves,
  maxLines = 8,
}) => {
  // Show only the most recent moves
  const recentMoves = moves.slice(-maxLines);

  const getOutcomeIcon = (outcome: MoveEntry['outcome']): string => {
    switch (outcome) {
      case 'correct': return '✓';
      case 'invalid': return '✗';
      case 'valid_but_wrong': return '~';
    }
  };

  const getOutcomeColor = (outcome: MoveEntry['outcome']): string => {
    switch (outcome) {
      case 'correct': return 'green';
      case 'invalid': return 'red';
      case 'valid_but_wrong': return 'yellow';
    }
  };

  const getOutcomeLabel = (outcome: MoveEntry['outcome']): string => {
    switch (outcome) {
      case 'correct': return 'CORRECT';
      case 'invalid': return 'INVALID';
      case 'valid_but_wrong': return 'WRONG';
    }
  };

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="cyan" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          📝 Move History
        </Text>
        <Text color="gray"> (Last {recentMoves.length} moves)</Text>
      </Box>

      {recentMoves.length === 0 ? (
        <Text dimColor>No moves yet...</Text>
      ) : (
        <Box flexDirection="column">
          {recentMoves.map((move) => (
            <Box key={move.moveNumber} flexDirection="column" marginBottom={1}>
              {/* Move Header */}
              <Box>
                <Text color="gray">#{move.moveNumber}</Text>
                <Text> </Text>
                <Text color={getOutcomeColor(move.outcome)}>
                  {getOutcomeIcon(move.outcome)}
                </Text>
                <Text> </Text>
                <Text color="cyan">
                  ({move.row},{move.col}) = {move.value}
                </Text>
                <Text> </Text>
                <Text bold color={getOutcomeColor(move.outcome)}>
                  {getOutcomeLabel(move.outcome)}
                </Text>
              </Box>

              {/* LLM Reasoning (truncated) */}
              <Box marginLeft={2}>
                <Text color="gray" dimColor>
                  Reasoning: {move.reasoning.length > 50
                    ? move.reasoning.substring(0, 50) + '...'
                    : move.reasoning}
                </Text>
              </Box>

              {/* Error Message (if invalid) */}
              {move.outcome === 'invalid' && move.error && (
                <Box marginLeft={2}>
                  <Text color="red">
                    Error: {move.error}
                  </Text>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};
