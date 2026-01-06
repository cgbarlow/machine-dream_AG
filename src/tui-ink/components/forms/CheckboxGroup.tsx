/**
 * CheckboxGroup Component
 *
 * Multiple checkboxes group
 */

import React from 'react';
import { Box, Text } from 'ink';

interface CheckboxGroupProps {
  label?: string;
  options: Array<{ value: string; label: string; checked: boolean }>;
  onChange?: (value: string, checked: boolean) => void;
  focusedIndex?: number;
}

export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  label,
  options,
  onChange,
  focusedIndex
}) => {
  return (
    <Box flexDirection="column">
      {label && (
        <Box marginBottom={1}>
          <Text bold color="cyan">{label}</Text>
        </Box>
      )}
      {options.map((option, index) => (
        <Box key={option.value}>
          <Text color={focusedIndex === index ? 'green' : 'gray'}>
            {focusedIndex === index ? '▶ ' : '  '}
            {option.checked ? '[✓] ' : '[ ] '}
            {option.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
};
