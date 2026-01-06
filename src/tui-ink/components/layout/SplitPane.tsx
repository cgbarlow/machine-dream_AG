/**
 * SplitPane Component
 *
 * Two-pane layout (side-by-side or stacked)
 */

import React from 'react';
import { Box } from 'ink';

interface SplitPaneProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  top?: React.ReactNode;
  bottom?: React.ReactNode;
  direction?: 'horizontal' | 'vertical';
  leftWidth?: number;
  rightWidth?: number;
  gap?: number;
}

export const SplitPane: React.FC<SplitPaneProps> = ({
  left,
  right,
  top,
  bottom,
  direction = 'horizontal',
  leftWidth,
  rightWidth,
  gap = 2
}) => {
  if (direction === 'horizontal') {
    return (
      <Box flexDirection="row" gap={gap}>
        {left && (
          <Box flexDirection="column" width={leftWidth}>
            {left}
          </Box>
        )}
        {right && (
          <Box flexDirection="column" width={rightWidth}>
            {right}
          </Box>
        )}
      </Box>
    );
  } else {
    return (
      <Box flexDirection="column" gap={gap}>
        {top && (
          <Box flexDirection="column">
            {top}
          </Box>
        )}
        {bottom && (
          <Box flexDirection="column">
            {bottom}
          </Box>
        )}
      </Box>
    );
  }
};
