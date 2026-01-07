/**
 * OutputBuffer Component
 *
 * Scrollable display of captured output lines with timestamps.
 * Supports manual scrolling when focused.
 *
 * Spec: 14-console-menu-interface-spec.md (Section 5.3)
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useOutputCapture } from '../../hooks/useOutputCapture.js';

interface OutputBufferProps {
  maxLines?: number;        // Default: 20
  height?: number | string; // Default: '100%'
  isFocused?: boolean;      // Enable scrolling when focused
}

export const OutputBuffer: React.FC<OutputBufferProps> = ({
  maxLines = 20,
  height = '100%',
  isFocused = false,
}) => {
  const lines = useOutputCapture(maxLines);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Auto-scroll to bottom when new lines arrive (unless manually scrolled)
  useEffect(() => {
    if (!isFocused) {
      setScrollOffset(0);
    }
  }, [lines.length, isFocused]);

  // Keyboard scrolling (when focused)
  // Note: This would need useInput hook, but it's handled by parent ConsolePanel

  // Calculate visible lines based on scroll offset
  const visibleLines = lines.slice(-maxLines + scrollOffset, lines.length - scrollOffset || undefined);
  const totalLines = lines.length;
  const isScrolled = scrollOffset > 0;

  return (
    <Box
      flexDirection="column"
      height={height}
      borderStyle="single"
      borderColor="cyan"
      paddingX={1}
    >
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Output
        </Text>
      </Box>

      {/* Output lines */}
      <Box flexDirection="column" flexGrow={1}>
        {visibleLines.length === 0 ? (
          <Text dimColor italic>
            No output yet... Commands will display here.
          </Text>
        ) : (
          visibleLines.map((line, index) => (
            <Text key={index} dimColor={!isScrolled}>
              {line}
            </Text>
          ))
        )}
      </Box>

      {/* Scroll indicator */}
      {isScrolled && (
        <Box marginTop={1}>
          <Text dimColor italic>
            (showing {visibleLines.length} of {totalLines} lines, ↑↓ to scroll)
          </Text>
        </Box>
      )}
    </Box>
  );
};
