/**
 * POC Home Screen - Ink + React
 *
 * Simple proof-of-concept to validate ink works on Node.js v24 + WSL
 */

import React from 'react';
import { Box, Text } from 'ink';

export const HomeScreen: React.FC = () => {
  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          ✨ Machine Dream TUI - ink POC ✨
        </Text>
      </Box>

      {/* System Status */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="green"
        padding={1}
        marginBottom={1}
      >
        <Text bold>System Status:</Text>
        <Box marginLeft={2} flexDirection="column">
          <Text>Memory System:  <Text color="green">AgentDB (Ready)</Text></Text>
          <Text>Sessions:       <Text color="yellow">0 total</Text></Text>
          <Text>Database:       <Text color="green">Healthy</Text></Text>
          <Text>Uptime:         <Text>Just started</Text></Text>
        </Box>
      </Box>

      {/* Quick Start */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold underline>Quick Start:</Text>
        <Box marginLeft={2} flexDirection="column">
          <Text>1. Press <Text bold color="cyan">[S]</Text> to solve a puzzle</Text>
          <Text>2. Press <Text bold color="cyan">[M]</Text> to browse memory</Text>
          <Text>3. Press <Text bold color="cyan">[D]</Text> to run dream cycle</Text>
          <Text>4. Press <Text bold color="cyan">[B]</Text> to run benchmarks</Text>
        </Box>
      </Box>

      {/* Keyboard Shortcuts */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold underline>Keyboard Shortcuts:</Text>
        <Box marginLeft={2} flexDirection="column">
          <Text><Text color="gray">F1         </Text> - Help</Text>
          <Text><Text color="gray">Ctrl+C     </Text> - Exit</Text>
          <Text><Text color="gray">Ctrl+R     </Text> - Refresh</Text>
          <Text><Text color="gray">Tab        </Text> - Next field</Text>
          <Text><Text color="gray">Enter      </Text> - Select/Submit</Text>
        </Box>
      </Box>

      {/* Footer */}
      <Box borderStyle="single" borderColor="gray" padding={1}>
        <Text dimColor>
          Navigate using the menu on the left or press keyboard shortcuts above.
        </Text>
      </Box>

      {/* Success Message */}
      <Box marginTop={1}>
        <Text bold color="green">
          ✅ If you see this, ink is working perfectly on Node.js v24 + WSL!
        </Text>
      </Box>
    </Box>
  );
};
