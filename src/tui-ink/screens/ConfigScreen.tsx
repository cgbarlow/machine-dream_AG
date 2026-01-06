/**
 * Configuration Screen
 *
 * System settings and preferences
 */

import React from 'react';
import { Box, Text } from 'ink';

export const ConfigScreen: React.FC = () => {
  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          ⚙️  System Configuration
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
          🔧 Current Settings
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text>
            <Text color="gray">Memory System:    </Text>
            <Text color="green">AgentDB</Text>
          </Text>
          <Text>
            <Text color="gray">RL Enabled:       </Text>
            <Text color="green">✓ Yes</Text>
          </Text>
          <Text>
            <Text color="gray">Reflexion:        </Text>
            <Text color="green">✓ Yes</Text>
          </Text>
          <Text>
            <Text color="gray">Max Iterations:   </Text>
            <Text color="yellow">100</Text>
          </Text>
          <Text>
            <Text color="gray">Log Level:        </Text>
            <Text color="cyan">info</Text>
          </Text>
        </Box>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="yellow"
        padding={1}
        marginBottom={1}
      >
        <Text bold color="yellow">
          📂 File Locations
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text>
            <Text color="gray">Home:    </Text>
            <Text>~/.machine-dream</Text>
          </Text>
          <Text>
            <Text color="gray">Database:</Text>
            <Text>~/.machine-dream/agentdb</Text>
          </Text>
          <Text>
            <Text color="gray">Config:  </Text>
            <Text>~/.machine-dream/config.json</Text>
          </Text>
          <Text>
            <Text color="gray">Logs:    </Text>
            <Text>~/.machine-dream/logs</Text>
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column">
        <Text bold color="magenta">
          💡 Modify Settings
        </Text>
        <Box marginLeft={2} marginTop={1}>
          <Text dimColor>
            Use CLI: <Text bold>machine-dream config set &lt;key&gt; &lt;value&gt;</Text>
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
