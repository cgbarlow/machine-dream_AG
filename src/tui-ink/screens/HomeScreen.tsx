/**
 * Home Screen - Full Version
 *
 * Dashboard with system status and quick actions
 */

import React from 'react';
import { Box, Text } from 'ink';

export const HomeScreen: React.FC = () => {
  return (
    <Box flexDirection="column" padding={1}>
      {/* Welcome Header */}
      <Box marginBottom={1} justifyContent="center">
        <Text bold color="cyan">
          🧠 Welcome to Machine Dream
        </Text>
      </Box>

      {/* System Status */}
      <Box
        flexDirection="column"
        borderStyle="double"
        borderColor="green"
        padding={1}
        marginBottom={1}
      >
        <Text bold color="green">
          ⚡ System Status
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text>
            <Text color="gray">Memory System: </Text>
            <Text color="green" bold>✓ AgentDB (Ready)</Text>
          </Text>
          <Text>
            <Text color="gray">Active Sessions: </Text>
            <Text color="yellow">0 total</Text>
          </Text>
          <Text>
            <Text color="gray">Database Health: </Text>
            <Text color="green" bold>✓ Healthy</Text>
          </Text>
          <Text>
            <Text color="gray">Neural Networks: </Text>
            <Text color="cyan">Ready</Text>
          </Text>
          <Text>
            <Text color="gray">Uptime: </Text>
            <Text>Just started</Text>
          </Text>
        </Box>
      </Box>

      {/* Quick Start */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="cyan" underline>
          🚀 Quick Start
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text>
            1. Press <Text bold color="green">[S]</Text> to solve a puzzle 🧩
          </Text>
          <Text>
            2. Press <Text bold color="green">[M]</Text> to browse memory 💾
          </Text>
          <Text>
            3. Press <Text bold color="green">[D]</Text> to run dream cycle 💭
          </Text>
          <Text>
            4. Press <Text bold color="green">[B]</Text> to run benchmarks 📊
          </Text>
        </Box>
      </Box>

      {/* Recent Activity */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="yellow"
        padding={1}
        marginBottom={1}
      >
        <Text bold color="yellow">
          📈 Recent Activity
        </Text>
        <Box marginLeft={2} marginTop={1}>
          <Text dimColor>
            No recent activity - Start by solving a puzzle!
          </Text>
        </Box>
      </Box>

      {/* Keyboard Shortcuts */}
      <Box flexDirection="column">
        <Text bold color="magenta" underline>
          ⌨️  Keyboard Shortcuts
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text>
            <Text color="gray">F1         </Text> - Show help
          </Text>
          <Text>
            <Text color="gray">Ctrl+C     </Text> - Exit application
          </Text>
          <Text>
            <Text color="gray">Ctrl+R     </Text> - Refresh current view
          </Text>
          <Text>
            <Text color="gray">↑↓         </Text> - Navigate menu
          </Text>
          <Text>
            <Text color="gray">Enter      </Text> - Select item
          </Text>
        </Box>
      </Box>

      {/* Footer Note */}
      <Box marginTop={1} justifyContent="center">
        <Text dimColor italic>
          Navigate using the menu on the left or press keyboard shortcuts above
        </Text>
      </Box>
    </Box>
  );
};
