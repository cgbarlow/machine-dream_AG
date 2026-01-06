/**
 * PhaseTracker Component
 *
 * Multi-phase progress tracker (for dream cycle)
 */

import React from 'react';
import { Box, Text } from 'ink';

interface Phase {
  name: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  progress?: number;
}

interface PhaseTrackerProps {
  phases: Phase[];
  showProgress?: boolean;
}

export const PhaseTracker: React.FC<PhaseTrackerProps> = ({
  phases,
  showProgress = true
}) => {
  const getStatusIcon = (status: Phase['status']): string => {
    switch (status) {
      case 'complete': return '✓';
      case 'running': return '⏵';
      case 'error': return '✗';
      default: return '○';
    }
  };

  const getStatusColor = (status: Phase['status']): string => {
    switch (status) {
      case 'complete': return 'green';
      case 'running': return 'yellow';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  return (
    <Box flexDirection="column">
      {phases.map((phase, index) => (
        <Box key={index} marginBottom={1}>
          <Text color={getStatusColor(phase.status)}>
            {index + 1}. {phase.name}
          </Text>
          <Text color={getStatusColor(phase.status)}>
            {' '}
            {getStatusIcon(phase.status)}
            {' '}
            {phase.status.charAt(0).toUpperCase() + phase.status.slice(1)}
          </Text>
          {showProgress && phase.progress !== undefined && phase.status === 'running' && (
            <Box marginLeft={3}>
              <Text color="cyan">
                {'█'.repeat(Math.floor(phase.progress / 5))}
                {'░'.repeat(20 - Math.floor(phase.progress / 5))}
              </Text>
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
};
