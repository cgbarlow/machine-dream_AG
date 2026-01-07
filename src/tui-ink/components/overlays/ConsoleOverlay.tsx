/**
 * ConsoleOverlay Component
 *
 * Half-height console overlay that toggles with backtick (`) key.
 * Provides quick access to console without leaving current screen.
 *
 * Spec: 14-console-menu-interface-spec.md (Section 6.2)
 */

import React from 'react';
import { Box, Text } from 'ink';
import { ConsolePanel } from '../console/ConsolePanel.js';
import { CommandParser, ParsedCommand } from '../../services/CommandParser.js';
import type { ProgressEvent } from '../../services/CLIExecutor.js';

interface ConsoleOverlayProps {
  onClose: () => void;
}

export const ConsoleOverlay: React.FC<ConsoleOverlayProps> = ({ onClose }) => {
  const handleCommand = async (command: string) => {
    try {
      const parsed: ParsedCommand = CommandParser.parse(command);
      await CommandParser.execute(parsed, (event: ProgressEvent) => {
        // Progress events captured by OutputCapture
      });
    } catch (error: any) {
      console.error(`Command error: ${error.message}`);
    }
  };

  return (
    <Box
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      height="50%"
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      backgroundColor="black"
    >
      {/* Header */}
      <Box paddingX={1} borderBottom>
        <Text bold color="cyan">
          Console (`) - Quick Access
        </Text>
        <Text dimColor> | ` or Esc to close</Text>
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
