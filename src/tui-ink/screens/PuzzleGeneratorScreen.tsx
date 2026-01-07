/**
 * Puzzle Generator Screen (Static Layout)
 *
 * Randomized puzzle generation with seed-based reproducibility (Spec 12)
 */

import React from 'react';
import { Box, Text } from 'ink';

export const PuzzleGeneratorScreen: React.FC = () => {
  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🎲 Puzzle Generator
        </Text>
        <Text color="gray"> - Spec 12</Text>
      </Box>

      {/* Generation Configuration */}
      <Box
        flexDirection="column"
        borderStyle="double"
        borderColor="cyan"
        padding={1}
        marginBottom={1}
      >
        <Text bold color="cyan">
          ⚙️  Generation Configuration
        </Text>

        <Box flexDirection="column" paddingLeft={2} paddingTop={1}>
          <Text>
            <Text color="gray">Seed Number:     </Text>
            <Text color="white">Random (auto-generate)</Text>
          </Text>
          <Text>
            <Text color="gray">Grid Size:       </Text>
            <Text color="cyan">9×9</Text>
          </Text>
          <Text>
            <Text color="gray">Difficulty:      </Text>
            <Text color="yellow">Medium</Text>
          </Text>
          <Text>
            <Text color="gray">Symmetry:        </Text>
            <Text color="white">None</Text>
          </Text>
          <Text>
            <Text color="green">✓</Text>
            <Text color="gray"> Validate uniqueness (ensure single solution)</Text>
          </Text>
          <Text>
            <Text color="green">✓</Text>
            <Text color="gray"> Show preview after generation</Text>
          </Text>
        </Box>
      </Box>

      {/* Batch Generation */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="magenta"
        padding={1}
        marginBottom={1}
      >
        <Text bold color="magenta">
          📦 Batch Generation (Optional)
        </Text>

        <Box flexDirection="column" paddingLeft={2} paddingTop={1}>
          <Text>
            <Text color="gray">□</Text>
            <Text color="gray"> Generate multiple puzzles</Text>
          </Text>
          <Text>
            <Text color="gray">Count:      </Text>
            <Text dimColor>10</Text>
          </Text>
          <Text>
            <Text color="gray">Seed Mode:  </Text>
            <Text dimColor>Sequential</Text>
          </Text>
          <Text>
            <Text color="gray">Seed Start: </Text>
            <Text dimColor>1000</Text>
          </Text>
        </Box>
      </Box>

      {/* Actions */}
      <Box marginBottom={1}>
        <Text bold color="green">
          📊 Actions
        </Text>
      </Box>
      <Box paddingLeft={2}>
        <Text dimColor>
          Press <Text bold color="green">Enter</Text> to generate puzzle
        </Text>
      </Box>

      {/* Tips */}
      <Box flexDirection="column" paddingTop={1}>
        <Text bold color="yellow">
          💡 Tips
        </Text>
        <Box flexDirection="column" paddingLeft={2} paddingTop={1}>
          <Text dimColor>
            - Use seeds for reproducible puzzles
          </Text>
          <Text dimColor>
            - Larger grids (16×16, 25×25) take longer to generate
          </Text>
          <Text dimColor>
            - Batch mode for training data generation
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
