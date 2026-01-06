/**
 * Solve Puzzle Screen
 *
 * Interactive puzzle solving with GRASP loop
 */

import React from 'react';
import { Box, Text } from 'ink';

export const SolveScreen: React.FC = () => {
  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🧩 Solve Puzzle
        </Text>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="double"
        borderColor="cyan"
        padding={1}
        marginBottom={1}
      >
        <Text bold color="cyan">
          ⚙️  GRASP Configuration
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text>
            <Text color="gray">Puzzle File:     </Text>
            <Text color="white">puzzles/easy-01.json</Text>
          </Text>
          <Text>
            <Text color="gray">Session ID:      </Text>
            <Text color="yellow">tui-session-001</Text>
          </Text>
          <Text>
            <Text color="gray">Max Iterations:  </Text>
            <Text color="cyan">100</Text>
          </Text>
          <Text>
            <Text color="gray">Memory System:   </Text>
            <Text color="green">✓ AgentDB</Text>
          </Text>
          <Text>
            <Text color="gray">RL Enabled:      </Text>
            <Text color="green">✓ Yes</Text>
          </Text>
        </Box>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="green"
        padding={1}
        marginBottom={1}
      >
        <Text bold color="green">
          🎯 Solving Strategies
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text>• <Text color="cyan">naked-single</Text> - Logical deduction</Text>
          <Text>• <Text color="cyan">hidden-single</Text> - Pattern recognition</Text>
          <Text>• <Text color="yellow">pointing-pairs</Text> - Advanced technique</Text>
          <Text>• <Text color="red">guess</Text> - Search when stuck</Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="yellow">
          📊 Progress
        </Text>
        <Box marginLeft={2} marginTop={1}>
          <Text dimColor>
            Ready to solve - Press <Text bold color="green">Enter</Text> to start
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column">
        <Text bold color="magenta">
          💡 Tips
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text dimColor>
            - Watch the GRASP loop in real-time
          </Text>
          <Text dimColor>
            - See strategies as they're applied
          </Text>
          <Text dimColor>
            - View success/failure for each move
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
