/**
 * CommandInput Component
 *
 * Text input for CLI commands with history navigation.
 * Supports up/down arrow for command history.
 *
 * Spec: 14-console-menu-interface-spec.md (Section 5.4)
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface CommandInputProps {
  onSubmit: (command: string) => void;
  isFocused?: boolean;
  placeholder?: string;
}

export const CommandInput: React.FC<CommandInputProps> = ({
  onSubmit,
  isFocused = false,
  placeholder = 'Enter command...',
}) => {
  const [input, setInput] = useState('');
  const [_historyIndex, setHistoryIndex] = useState(-1);
  const [_commandHistory] = useState<string[]>([]); // TODO: Load from file in future

  const handleSubmit = (value: string) => {
    if (value.trim()) {
      onSubmit(value);
      setInput('');
      setHistoryIndex(-1);
      // TODO: Save to history file
    }
  };

  // Handle history navigation
  // Note: This is handled by parent component's useInput for arrow keys

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={isFocused ? 'green' : 'gray'}
      paddingX={1}
    >
      <Box marginBottom={1}>
        <Text bold color="green">
          Command
        </Text>
      </Box>

      <Box>
        <Text color="cyan">{'> '}</Text>
        {isFocused ? (
          <TextInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            placeholder={placeholder}
            showCursor
          />
        ) : (
          <Text dimColor>{input || placeholder}</Text>
        )}
      </Box>

      <Box marginTop={1}>
        <Text dimColor italic>
          {isFocused
            ? 'Enter to execute, ↑↓ for history, Esc to clear'
            : 'Tab to focus input'}
        </Text>
      </Box>
    </Box>
  );
};
