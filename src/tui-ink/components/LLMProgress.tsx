/**
 * LLM Progress Component
 *
 * Real-time metrics during LLM puzzle solving
 */

import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

interface LLMProgressProps {
  isRunning: boolean;
  moveNumber: number;
  maxMoves: number;
  correctMoves: number;
  invalidMoves: number;
  wrongMoves: number;
  cellsFilled: number;
  totalCells: number;
  currentMove?: string;
  elapsedTime: number;
  status: 'idle' | 'running' | 'success' | 'error' | 'abandoned';
  errorMessage?: string;
  memoryEnabled: boolean;
}

export const LLMProgress: React.FC<LLMProgressProps> = ({
  isRunning,
  moveNumber,
  maxMoves,
  correctMoves,
  invalidMoves,
  wrongMoves,
  cellsFilled,
  totalCells,
  currentMove,
  elapsedTime,
  status,
  errorMessage,
  memoryEnabled,
}) => {
  const percentComplete = Math.floor((cellsFilled / totalCells) * 100);
  const progressBar = '█'.repeat(Math.floor(percentComplete / 5)) + '░'.repeat(20 - Math.floor(percentComplete / 5));

  const accuracy = moveNumber > 0 ? Math.floor((correctMoves / moveNumber) * 100) : 0;

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
  };

  const getStatusColor = (): string => {
    switch (status) {
      case 'running': return 'magenta';
      case 'success': return 'green';
      case 'error': return 'red';
      case 'abandoned': return 'yellow';
      default: return 'gray';
    }
  };

  const getStatusIcon = (): string => {
    switch (status) {
      case 'running': return '🤖';
      case 'success': return '✓';
      case 'error': return '✗';
      case 'abandoned': return '⚠';
      default: return '○';
    }
  };

  return (
    <Box flexDirection="column" borderStyle="double" borderColor={getStatusColor()} padding={1}>
      <Box marginBottom={1}>
        <Text bold color={getStatusColor()}>
          {isRunning && <Text color="magenta"><Spinner type="dots" /></Text>} {getStatusIcon()} LLM Progress
        </Text>
        <Text color="gray"> [{memoryEnabled ? <Text color="green">Memory ON</Text> : <Text color="yellow">Memory OFF</Text>}]</Text>
      </Box>

      {/* Move Progress */}
      <Box flexDirection="column" marginBottom={1}>
        <Text>
          <Text color="gray">Move: </Text>
          <Text color="magenta" bold>{moveNumber}</Text>
          <Text color="gray"> / {maxMoves}</Text>
          <Text color="gray"> ({Math.floor((moveNumber / maxMoves) * 100)}%)</Text>
        </Text>
      </Box>

      {/* Move Statistics */}
      <Box flexDirection="column" marginBottom={1}>
        <Text>
          <Text color="gray">Correct:  </Text>
          <Text color="green" bold>{correctMoves}</Text>
          <Text color="gray"> ({accuracy}% accuracy)</Text>
        </Text>
        <Text>
          <Text color="gray">Invalid:  </Text>
          <Text color="red" bold>{invalidMoves}</Text>
        </Text>
        <Text>
          <Text color="gray">Wrong:    </Text>
          <Text color="yellow" bold>{wrongMoves}</Text>
        </Text>
      </Box>

      {/* Cells Filled */}
      <Box flexDirection="column" marginBottom={1}>
        <Text>
          <Text color="gray">Cells: </Text>
          <Text color="cyan" bold>{cellsFilled}</Text>
          <Text color="gray"> / {totalCells}</Text>
          <Text color="gray"> ({percentComplete}%)</Text>
        </Text>
        <Text color="cyan">{progressBar}</Text>
      </Box>

      {/* Current Move */}
      {currentMove && (
        <Box marginBottom={1}>
          <Text>
            <Text color="gray">Current: </Text>
            <Text color="yellow">{currentMove}</Text>
          </Text>
        </Box>
      )}

      {/* Elapsed Time */}
      <Box marginBottom={1}>
        <Text>
          <Text color="gray">Elapsed: </Text>
          <Text color="cyan">{formatTime(elapsedTime)}</Text>
        </Text>
      </Box>

      {/* Status Message */}
      {status === 'success' && (
        <Box>
          <Text bold color="green">✓ Puzzle Solved by LLM!</Text>
        </Box>
      )}

      {status === 'abandoned' && (
        <Box>
          <Text bold color="yellow">⚠ Abandoned (max moves reached)</Text>
        </Box>
      )}

      {status === 'error' && errorMessage && (
        <Box flexDirection="column">
          <Text bold color="red">✗ Error Occurred</Text>
          <Text color="red">{errorMessage}</Text>
        </Box>
      )}
    </Box>
  );
};
