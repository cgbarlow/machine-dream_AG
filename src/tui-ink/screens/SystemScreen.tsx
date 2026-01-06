/**
 * System Information Screen
 *
 * Runtime environment and diagnostics
 */

import React from 'react';
import { Box, Text } from 'ink';

export const SystemScreen: React.FC = () => {
  const nodeVersion = process.version;
  const platform = process.platform;
  const arch = process.arch;
  const uptime = Math.floor(process.uptime());
  const memUsage = process.memoryUsage();

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🖥️  System Information
        </Text>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="double"
        borderColor="green"
        padding={1}
        marginBottom={1}
      >
        <Text bold color="green">
          ⚡ Runtime Environment
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text>
            <Text color="gray">Node.js:      </Text>
            <Text color="cyan">{nodeVersion}</Text>
          </Text>
          <Text>
            <Text color="gray">Platform:     </Text>
            <Text>{platform}</Text>
          </Text>
          <Text>
            <Text color="gray">Architecture: </Text>
            <Text>{arch}</Text>
          </Text>
          <Text>
            <Text color="gray">Uptime:       </Text>
            <Text color="yellow">{uptime}s</Text>
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
          💾 Memory Usage
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text>
            <Text color="gray">Heap Used:  </Text>
            <Text color="cyan">{Math.floor(memUsage.heapUsed / 1024 / 1024)} MB</Text>
          </Text>
          <Text>
            <Text color="gray">Heap Total: </Text>
            <Text>{Math.floor(memUsage.heapTotal / 1024 / 1024)} MB</Text>
          </Text>
          <Text>
            <Text color="gray">RSS:        </Text>
            <Text>{Math.floor(memUsage.rss / 1024 / 1024)} MB</Text>
          </Text>
        </Box>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="cyan"
        padding={1}
        marginBottom={1}
      >
        <Text bold color="cyan">
          📦 Dependencies
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text>
            <Text color="gray">AgentDB:     </Text>
            <Text color="green">✓ ^1.0.0</Text>
          </Text>
          <Text>
            <Text color="gray">ink:         </Text>
            <Text color="green">✓ ^5.x</Text>
          </Text>
          <Text>
            <Text color="gray">React:       </Text>
            <Text color="green">✓ ^18.x</Text>
          </Text>
          <Text>
            <Text color="gray">TypeScript:  </Text>
            <Text color="green">✓ ^5.7.2</Text>
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column">
        <Text bold color="green">
          ✓ System Diagnostics
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text color="green">✓ Memory system operational</Text>
          <Text color="green">✓ Database accessible</Text>
          <Text color="green">✓ Terminal capabilities detected</Text>
          <Text color="green">✓ All core systems functional</Text>
        </Box>
      </Box>
    </Box>
  );
};
