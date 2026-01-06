/**
 * CheckboxField Component
 *
 * Single checkbox with label
 */

import React from 'react';
import { Box, Text } from 'ink';

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  isFocused?: boolean;
  disabled?: boolean;
}

export const CheckboxField: React.FC<CheckboxFieldProps> = ({
  label,
  checked,
  onChange: _onChange,
  isFocused = false,
  disabled = false
}) => {
  return (
    <Box>
      <Text color={isFocused ? 'green' : disabled ? 'gray' : 'white'}>
        {isFocused ? '▶ ' : '  '}
        {label}:{' '}
      </Text>
      {checked ? (
        <Text color="green">✓</Text>
      ) : (
        <Text color="red">✗</Text>
      )}
    </Box>
  );
};
