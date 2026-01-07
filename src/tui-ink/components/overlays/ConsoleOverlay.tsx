/**
 * ConsoleOverlay Component
 *
 * Half-height console overlay that toggles with backtick (`) key.
 * Provides quick access to console without leaving current screen.
 *
 * Spec: 14-console-menu-interface-spec.md (Section 6.2)
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';
import { ConsolePanel } from '../console/ConsolePanel.js';
import { CommandParserStatic, ParsedCommand } from '../../services/CommandParser.js';
import type { ProgressEvent } from '../../services/CLIExecutor.js';

interface ConsoleOverlayProps {
  onClose: () => void;
}

export const ConsoleOverlay: React.FC<ConsoleOverlayProps> = ({ onClose }) => {
  // Handle keyboard input for closing overlay
  useInput((input, key) => {
    if (input === '`' || key.escape) {
      onClose();
    }
  });
  const handleCommand = async (command: string) => {
    try {
      const parsed: ParsedCommand = CommandParserStatic.parse(command);
      await CommandParserStatic.execute(parsed, (_event: ProgressEvent) => {
        // Progress events captured by OutputCapture
      });
    } catch (error: any) {
      console.error(`Command error: ${error.message}`);
    }
  };

  return (
    <Box
      height="50%"
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      backgroundColor="black"
    >
      {/* Header */}
      <Box paddingX={1} borderBottom>
        <Text bold color="cyan">
          Console Overlay
        </Text>
        <Text dimColor> - Press ` to close</Text>
      </Box>

      {/* Console Panel */}
      <Box flexGrow={1} padding={1}>
        <ConsolePanel
          title=""
          maxOutputLines={10}
          showInput
          onCommand={handleCommand}
          height="100%"
        />
      </Box>
    </Box>
  );
};
