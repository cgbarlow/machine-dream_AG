/**
 * ProgressBar Component
 *
 * Horizontal progress bar with percentage display
 */

import React from 'react';
import { Box, Text } from 'ink';

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  width?: number;
  color?: string;
  showPercentage?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  label,
  width = 20,
  color = 'cyan',
  showPercentage = true
}) => {
  const percentage = total > 0 ? Math.floor((current / total) * 100) : 0;
  const filled = Math.floor((percentage / 100) * width);
  const empty = width - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);

  return (
    <Box flexDirection="column">
      {label && (
        <Box marginBottom={1}>
          <Text color="gray">{label}</Text>
        </Box>
      )}
      <Box>
        <Text color={color}>{bar}</Text>
        {showPercentage && (
          <Text color="gray"> {percentage}%</Text>
        )}
      </Box>
    </Box>
  );
};
