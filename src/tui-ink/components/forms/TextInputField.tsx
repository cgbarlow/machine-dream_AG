/**
 * TextInputField Component
 *
 * Labeled text input field with optional validation
 */

import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface TextInputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  isFocused?: boolean;
  error?: string;
  showCursor?: boolean;
}

export const TextInputField: React.FC<TextInputFieldProps> = ({
  label,
  value,
  onChange,
  onSubmit,
  placeholder,
  isFocused = false,
  error,
  showCursor = true
}) => {
  return (
    <Box flexDirection="column">
      <Box>
        <Text color={isFocused ? 'green' : 'gray'}>
          {isFocused ? '▶ ' : '  '}
          {label}:{' '}
        </Text>
        {isFocused ? (
          <TextInput
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            placeholder={placeholder}
            showCursor={showCursor}
          />
        ) : (
          <Text>{value || <Text dimColor>{placeholder || ''}</Text>}</Text>
        )}
      </Box>
      {error && (
        <Box marginLeft={2}>
          <Text color="red">⚠ {error}</Text>
        </Box>
      )}
    </Box>
  );
};
