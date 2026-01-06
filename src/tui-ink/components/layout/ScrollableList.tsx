/**
 * ScrollableList Component
 *
 * Scrollable list with selection
 */

import React from 'react';
import { Box, Text } from 'ink';

interface ListItem {
  id: string;
  label: string;
  secondary?: string;
}

interface ScrollableListProps {
  items: ListItem[];
  selectedIndex?: number;
  onSelect?: (id: string, index: number) => void;
  maxHeight?: number;
  showIndex?: boolean;
}

export const ScrollableList: React.FC<ScrollableListProps> = ({
  items,
  selectedIndex,
  onSelect: _onSelect,
  maxHeight = 10,
  showIndex = false
}) => {
  // Simple implementation - in a real app, would handle scrolling
  const visibleItems = items.slice(0, maxHeight);

  return (
    <Box flexDirection="column">
      {visibleItems.map((item, index) => {
        const isSelected = selectedIndex === index;
        return (
          <Box key={item.id}>
            <Text color={isSelected ? 'green' : 'gray'}>
              {isSelected ? '▶ ' : '  '}
              {showIndex && `${index + 1}. `}
              {item.label}
            </Text>
            {item.secondary && (
              <Text dimColor> {item.secondary}</Text>
            )}
          </Box>
        );
      })}
      {items.length > maxHeight && (
        <Box marginTop={1}>
          <Text dimColor>
            ... and {items.length - maxHeight} more items (scroll to see all)
          </Text>
        </Box>
      )}
    </Box>
  );
};
