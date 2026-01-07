/**
 * ConsoleScreen
 *
 * Full-screen console interface with output buffer and command input.
 * Accessible via [T] menu shortcut.
 *
 * Spec: 14-console-menu-interface-spec.md (Section 6.1)
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { ConsolePanel } from '../components/console/ConsolePanel.js';
import { CommandParserStatic, ParsedCommand } from '../services/CommandParser.js';
import type { ProgressEvent } from '../services/CLIExecutor.js';

export const ConsoleScreen: React.FC = () => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');

  const handleCommand = async (command: string) => {
    setLastCommand(command);
    setIsExecuting(true);

    try {
      // Parse command
      const parsed: ParsedCommand = CommandParserStatic.parse(command);
      console.log(`Executing: ${parsed.command} ${parsed.subcommand || ''}`);

      // Execute command
      await CommandParserStatic.execute(parsed, (event: ProgressEvent) => {
        // Progress events are automatically captured by OutputCapture
        if (event.type === 'complete' || event.type === 'error') {
          setIsExecuting(false);
        }
      });

      // If no async execution (like help), mark as complete
      setIsExecuting(false);
    } catch (error: any) {
      console.error(`Command error: ${error.message}`);
      setIsExecuting(false);
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {'>'} Console
        </Text>
      </Box>

      {/* Main Console Panel */}
      <Box flexGrow={1} flexDirection="row" gap={2}>
        {/* Console Panel - 70% width */}
        <Box flexGrow={7}>
          <ConsolePanel
            title=""
            maxOutputLines={30}
            showInput
            onCommand={handleCommand}
            height="100%"
          />
        </Box>

        {/* Info Sidebar - 30% width */}
        <Box
          flexGrow={3}
          flexDirection="column"
          borderStyle="single"
          borderColor="yellow"
          paddingX={1}
        >
          <Text bold color="yellow">
            Available Commands
          </Text>

          <Box flexDirection="column" marginTop={1}>
            <Text dimColor>• solve &lt;file&gt;</Text>
            <Text dimColor>• llm play &lt;file&gt;</Text>
            <Text dimColor>• llm dream</Text>
            <Text dimColor>• llm stats</Text>
            <Text dimColor>• memory list</Text>
            <Text dimColor>• memory search &lt;query&gt;</Text>
            <Text dimColor>• puzzle generate</Text>
            <Text dimColor>• benchmark</Text>
            <Text dimColor>• config show</Text>
            <Text dimColor>• help [command]</Text>
            <Text dimColor>• clear</Text>
          </Box>

          <Box marginTop={2} flexDirection="column">
            <Text bold color="yellow">
              Quick Tips
            </Text>
            <Box flexDirection="column" marginTop={1}>
              <Text dimColor>• ↑↓ for history</Text>
              <Text dimColor>• Tab to switch focus</Text>
              <Text dimColor>• ? for help overlay</Text>
              <Text dimColor>• ` for console overlay</Text>
            </Box>
          </Box>

          {isExecuting && (
            <Box marginTop={2}>
              <Text color="green">⚡ Executing: {lastCommand}</Text>
            </Box>
          )}
        </Box>
      </Box>

      {/* Status */}
      <Box marginTop={1}>
        <Text dimColor italic>
          Console | [?] Help | [`] Toggle Overlay | Esc to return to menu
        </Text>
      </Box>
    </Box>
  );
};
