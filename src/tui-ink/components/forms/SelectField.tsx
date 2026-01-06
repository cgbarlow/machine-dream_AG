/**
 * SelectField Component
 *
 * Dropdown/select field with options
 */

import React from 'react';
import { Box, Text } from 'ink';

interface SelectFieldProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange?: (value: string) => void;
  isFocused?: boolean;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  options,
  onChange: _onChange,
  isFocused = false
}) => {
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <Box>
      <Text color={isFocused ? 'green' : 'gray'}>
        {isFocused ? '▶ ' : '  '}
        {label}:{' '}
      </Text>
      <Text color="cyan">
        {selectedOption?.label || value} {isFocused && '▼'}
      </Text>
    </Box>
  );
};
