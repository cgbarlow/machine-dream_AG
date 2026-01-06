/**
 * Solve Progress Component
 *
 * Real-time metrics during puzzle solving
 */

import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

interface SolveProgressProps {
  isRunning: boolean;
  iteration: number;
  maxIterations: number;
  cellsFilled: number;
  totalCells: number;
  currentStrategy?: string;
  elapsedTime: number;
  status: 'idle' | 'running' | 'success' | 'error';
  errorMessage?: string;
}

export const SolveProgress: React.FC<SolveProgressProps> = ({
  isRunning,
  iteration,
  maxIterations,
  cellsFilled,
  totalCells,
  currentStrategy,
  elapsedTime,
  status,
  errorMessage,
}) => {
  const percentComplete = Math.floor((cellsFilled / totalCells) * 100);
  const progressBar = '█'.repeat(Math.floor(percentComplete / 5)) + '░'.repeat(20 - Math.floor(percentComplete / 5));

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
  };

  const getStatusColor = (): string => {
    switch (status) {
      case 'running': return 'yellow';
      case 'success': return 'green';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  const getStatusIcon = (): string => {
    switch (status) {
      case 'running': return '⚡';
      case 'success': return '✓';
      case 'error': return '✗';
      default: return '○';
    }
  };

  return (
    <Box flexDirection="column" borderStyle="double" borderColor={getStatusColor()} padding={1}>
      <Box marginBottom={1}>
        <Text bold color={getStatusColor()}>
          {isRunning && <Text color="cyan"><Spinner type="dots" /></Text>} {getStatusIcon()} Solve Progress
        </Text>
      </Box>

      {/* Iteration Progress */}
      <Box flexDirection="column" marginBottom={1}>
        <Text>
          <Text color="gray">Iteration: </Text>
          <Text color="cyan" bold>{iteration}</Text>
          <Text color="gray"> / {maxIterations}</Text>
          <Text color="gray"> ({Math.floor((iteration / maxIterations) * 100)}%)</Text>
        </Text>
      </Box>

      {/* Cells Filled */}
      <Box flexDirection="column" marginBottom={1}>
        <Text>
          <Text color="gray">Cells Filled: </Text>
          <Text color="green" bold>{cellsFilled}</Text>
          <Text color="gray"> / {totalCells}</Text>
          <Text color="gray"> ({percentComplete}%)</Text>
        </Text>
        <Text color="cyan">{progressBar}</Text>
      </Box>

      {/* Current Strategy */}
      {currentStrategy && (
        <Box marginBottom={1}>
          <Text>
            <Text color="gray">Strategy: </Text>
            <Text color="yellow">{currentStrategy}</Text>
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
          <Text bold color="green">✓ Puzzle Solved Successfully!</Text>
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
