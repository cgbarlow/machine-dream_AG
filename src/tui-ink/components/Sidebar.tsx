/**
 * Sidebar Navigation Menu
 *
 * Rich visual menu with emojis and colors (safe with ink!)
 */

import React from 'react';
import { Box, Text } from 'ink';

export interface MenuItem {
  id: string;
  icon: string;
  label: string;
  shortcut: string;
}

interface SidebarProps {
  items: MenuItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ items, selectedIndex }) => {
  return (
    <Box
      flexDirection="column"
      width={25}
      borderStyle="single"
      borderColor="cyan"
      paddingX={1}
      paddingY={1}
    >
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🧠 Machine Dream
        </Text>
      </Box>

      {/* Menu Items */}
      {items.map((item, index) => {
        const isSelected = index === selectedIndex;

        return (
          <Box key={item.id} marginBottom={0}>
            <Text
              bold={isSelected}
              color={isSelected ? 'green' : 'white'}
              backgroundColor={isSelected ? 'blue' : undefined}
            >
              {isSelected ? '▶ ' : '  '}
              {item.icon} {item.label.padEnd(12)} {item.shortcut}
            </Text>
          </Box>
        );
      })}

      {/* Help Text */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>
          Use ↑↓ or shortcuts
        </Text>
      </Box>
    </Box>
  );
};
