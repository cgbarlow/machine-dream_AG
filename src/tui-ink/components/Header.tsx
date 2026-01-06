/**
 * Header Component
 *
 * Top bar with title and context info
 */

import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  title: string;
  subtitle?: string;
  currentScreen?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, currentScreen }) => {
  return (
    <Box
      borderStyle="double"
      borderColor="cyan"
      paddingX={2}
      paddingY={0}
      justifyContent="space-between"
    >
      <Box>
        <Text bold color="cyan">
          ✨ {title}
        </Text>
        {subtitle && (
          <Text color="gray"> - {subtitle}</Text>
        )}
      </Box>
      {currentScreen && (
        <Text color="yellow">
          📍 {currentScreen}
        </Text>
      )}
    </Box>
  );
};
