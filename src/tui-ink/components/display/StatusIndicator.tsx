/**
 * StatusIndicator Component
 *
 * Color-coded status icons and labels
 */

import React from 'react';
import { Box, Text } from 'ink';

type Status = 'idle' | 'running' | 'success' | 'error' | 'warning';

interface StatusIndicatorProps {
  status: Status;
  message?: string;
  showIcon?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  message,
  showIcon = true
}) => {
  const getStatusIcon = (): string => {
    switch (status) {
      case 'running': return '⚡';
      case 'success': return '✓';
      case 'error': return '✗';
      case 'warning': return '⚠';
      default: return '○';
    }
  };

  const getStatusColor = (): string => {
    switch (status) {
      case 'running': return 'yellow';
      case 'success': return 'green';
      case 'error': return 'red';
      case 'warning': return 'yellow';
      default: return 'gray';
    }
  };

  const getStatusLabel = (): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <Box>
      {showIcon && (
        <Text color={getStatusColor()}>{getStatusIcon()} </Text>
      )}
      <Text bold color={getStatusColor()}>
        {message || getStatusLabel()}
      </Text>
    </Box>
  );
};
