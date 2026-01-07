/**
 * ConsolePanel Component
 *
 * Combined output buffer + command input with focus management.
 * Reusable in both screen and overlay contexts.
 *
 * Spec: 14-console-menu-interface-spec.md (Section 5.5)
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { OutputBuffer } from './OutputBuffer.js';
import { CommandInput } from './CommandInput.js';

interface ConsolePanelProps {
  title?: string;
  maxOutputLines?: number;
  showInput?: boolean;
  onCommand?: (command: string) => void;
  height?: number | string;
}

type FocusField = 'output' | 'input';

export const ConsolePanel: React.FC<ConsolePanelProps> = ({
  title = 'Console',
  maxOutputLines = 20,
  showInput = true,
  onCommand,
  height = '100%',
}) => {
  const [focusField, setFocusField] = useState<FocusField>('input');

  // Keyboard navigation
  useInput((_input, key) => {
    // Tab switches focus
    if (key.tab) {
      setFocusField((prev) => (prev === 'output' ? 'input' : 'output'));
    }

    // Escape clears input (when in input mode)
    if (key.escape && focusField === 'input') {
      // Handled by CommandInput
    }
  });

  const handleCommand = (command: string) => {
    if (onCommand) {
      onCommand(command);
    }
  };

  return (
    <Box flexDirection="column" height={height}>
      {/* Title */}
      {title && (
        <Box marginBottom={1}>
          <Text bold color="magenta">
            {title}
          </Text>
        </Box>
      )}

      {/* Output Buffer - 70% height */}
      <Box flexGrow={7} marginBottom={1}>
        <OutputBuffer
          maxLines={maxOutputLines}
          height="100%"
          isFocused={focusField === 'output'}
        />
      </Box>

      {/* Command Input - 30% height */}
      {showInput && (
        <Box flexGrow={3}>
          <CommandInput
            onSubmit={handleCommand}
            isFocused={focusField === 'input'}
            placeholder="Enter command (solve, llm, memory, help)..."
          />
        </Box>
      )}

      {/* Help Text */}
      <Box marginTop={1}>
        <Text dimColor italic>
          Tab to switch focus | Current: {focusField === 'output' ? 'Output' : 'Input'}
        </Text>
      </Box>
    </Box>
  );
};
