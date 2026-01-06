/**
 * ResultsTable Component
 *
 * Formatted table with headers and rows
 */

import React from 'react';
import { Box, Text } from 'ink';

interface Column {
  key: string;
  label: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
}

interface ResultsTableProps {
  columns: Column[];
  rows: Array<Record<string, any>>;
  highlightRow?: number;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
  columns,
  rows,
  highlightRow
}) => {
  const formatCell = (value: any, width: number = 15, align: 'left' | 'right' | 'center' = 'left'): string => {
    const str = String(value);
    if (str.length > width) {
      return str.slice(0, width - 3) + '...';
    }

    if (align === 'right') {
      return str.padStart(width);
    } else if (align === 'center') {
      const padding = width - str.length;
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
    } else {
      return str.padEnd(width);
    }
  };

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box>
        {columns.map((col, i) => (
          <Text key={col.key} bold color="cyan">
            {formatCell(col.label, col.width, col.align)}
            {i < columns.length - 1 && ' │ '}
          </Text>
        ))}
      </Box>

      {/* Separator */}
      <Box>
        <Text color="cyan">{'─'.repeat(columns.reduce((sum, col) => sum + (col.width || 15) + 3, 0))}</Text>
      </Box>

      {/* Rows */}
      {rows.map((row, rowIndex) => (
        <Box key={rowIndex}>
          {columns.map((col, colIndex) => (
            <Text
              key={col.key}
              color={highlightRow === rowIndex ? 'yellow' : 'white'}
            >
              {formatCell(row[col.key], col.width, col.align)}
              {colIndex < columns.length - 1 && ' │ '}
            </Text>
          ))}
        </Box>
      ))}
    </Box>
  );
};
