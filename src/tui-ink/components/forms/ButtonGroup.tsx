/**
 * ButtonGroup Component
 *
 * Group of action buttons (Save/Cancel/Reset)
 */

import React from 'react';
import { Box, Text } from 'ink';

interface Button {
  label: string;
  action: string;
  color?: string;
  backgroundColor?: string;
}

interface ButtonGroupProps {
  buttons: Button[];
  focusedIndex?: number;
  onAction?: (action: string) => void;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  buttons,
  focusedIndex,
  onAction: _onAction
}) => {
  return (
    <Box gap={1}>
      {buttons.map((button, index) => {
        const isFocused = focusedIndex === index;
        return (
          <Box key={button.action} paddingX={1}>
            <Text
              bold
              color={isFocused ? button.color || 'white' : 'gray'}
              backgroundColor={isFocused ? button.backgroundColor || 'blue' : undefined}
            >
              {isFocused ? '▶ ' : ''}
              [{button.label}]
            </Text>
          </Box>
        );
      })}
    </Box>
  );
};
