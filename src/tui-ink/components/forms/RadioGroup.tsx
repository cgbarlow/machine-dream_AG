/**
 * RadioGroup Component
 *
 * Radio button group (single selection)
 */

import React from 'react';
import { Box, Text } from 'ink';

interface RadioGroupProps {
  label?: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange?: (value: string) => void;
  focusedIndex?: number;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  label,
  options,
  value,
  onChange: _onChange,
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
            {value === option.value ? '(•) ' : '( ) '}
            {option.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
};
