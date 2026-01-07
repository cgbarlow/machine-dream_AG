/**
 * Status Bar Component
 *
 * Bottom status bar with system info and shortcuts
 */

import React from 'react';
import { Box, Text } from 'ink';

interface StatusBarProps {
  sessionId: string;
  memoryStatus: string;
  databaseStatus: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  sessionId,
  memoryStatus,
  databaseStatus
}) => {
  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      paddingX={2}
      justifyContent="space-between"
    >
      <Box>
        <Text dimColor>Session: </Text>
        <Text color="cyan">{sessionId}</Text>
        <Text dimColor> | Memory: </Text>
        <Text color="green">{memoryStatus}</Text>
        <Text dimColor> | DB: </Text>
        <Text color="green">{databaseStatus}</Text>
      </Box>
      <Box>
        <Text dimColor>[?] Help | [`] Console | Ctrl+C: Exit</Text>
      </Box>
    </Box>
  );
};
