/**
 * Puzzle Grid Visualization Component
 *
 * Live display of Sudoku puzzle state during solving
 */

import React from 'react';
import { Box, Text } from 'ink';

interface PuzzleGridProps {
  grid: number[][];
  size?: number;
  highlightCell?: { row: number; col: number };
}

export const PuzzleGrid: React.FC<PuzzleGridProps> = ({
  grid,
  size = 9,
  highlightCell
}) => {
  const renderCell = (value: number, row: number, col: number): string => {
    const isHighlighted = highlightCell?.row === row && highlightCell?.col === col;
    const cellValue = value === 0 ? '·' : value.toString();
    return isHighlighted ? `*${cellValue}*` : ` ${cellValue} `;
  };

  const renderRow = (rowIndex: number): React.ReactElement => {
    const row = grid[rowIndex];
    const cells: React.ReactElement[] = [];

    for (let col = 0; col < size; col++) {
      const value = row[col];
      const isHighlighted = highlightCell?.row === rowIndex && highlightCell?.col === col;

      cells.push(
        <Text key={col} color={isHighlighted ? 'yellow' : value === 0 ? 'gray' : 'green'}>
          {renderCell(value, rowIndex, col)}
        </Text>
      );

      // Add box separators for 9x9
      if (size === 9 && (col === 2 || col === 5)) {
        cells.push(<Text key={`sep-${col}`} color="cyan"> │ </Text>);
      }
    }

    return <Box key={rowIndex}>{cells}</Box>;
  };

  const renderSeparator = (): React.ReactElement => {
    return (
      <Text color="cyan">
        {size === 9 ? '───────────────────────────' : '─'.repeat(size * 3)}
      </Text>
    );
  };

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="cyan" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">Puzzle Grid ({size}x{size})</Text>
      </Box>

      {grid.map((_, rowIndex) => {
        const elements: React.ReactElement[] = [];

        // Add row
        elements.push(renderRow(rowIndex));

        // Add separator after rows 2 and 5 for 9x9
        if (size === 9 && (rowIndex === 2 || rowIndex === 5)) {
          elements.push(
            <Box key={`sep-${rowIndex}`}>
              {renderSeparator()}
            </Box>
          );
        }

        return elements;
      })}

      <Box marginTop={1}>
        <Text dimColor>*Highlighted  ·Empty  #Filled</Text>
      </Box>
    </Box>
  );
};
