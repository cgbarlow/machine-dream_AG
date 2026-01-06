/**
 * Interactive Data Export
 *
 * Export data with format and type selection
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { CLIExecutor } from '../services/CLIExecutor.js';
import { CheckboxGroup } from '../components/forms/CheckboxGroup.js';
import { RadioGroup } from '../components/forms/RadioGroup.js';
import { TextInputField } from '../components/forms/TextInputField.js';
import { CheckboxField } from '../components/forms/CheckboxField.js';
import { StatusIndicator } from '../components/display/StatusIndicator.js';

type FocusField = 'types' | 'format' | 'outputDir' | 'compress' | 'execute';

export const ExportScreenInteractive: React.FC = () => {
  const [focusField, setFocusField] = useState<FocusField>('types');
  const [focusedTypeIndex, setFocusedTypeIndex] = useState(0);
  const [focusedFormatIndex, setFocusedFormatIndex] = useState(0);

  // Export options
  const [exportTypes, setExportTypes] = useState<Array<{ value: string; label: string; checked: boolean }>>([]);
  const [format, setFormat] = useState('json');
  const [outputDir, setOutputDir] = useState('./exports');
  const [compress, setCompress] = useState(false);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [exportMessage, setExportMessage] = useState('');
  const [exportResult, setExportResult] = useState<{ path: string; size: number } | null>(null);

  // Load available export types
  useEffect(() => {
    CLIExecutor.getExportTypes().then(types => {
      setExportTypes(types.map(t => ({ value: t.type, label: t.description, checked: false })));
    });
  }, []);

  // Handle keyboard input
  useInput((input, key) => {
    if (isExecuting) return;

    // Tab navigation
    if (key.tab) {
      const fields: FocusField[] = ['types', 'format', 'outputDir', 'compress', 'execute'];
      const currentIndex = fields.indexOf(focusField);

      if (key.shift) {
        const prevIndex = currentIndex === 0 ? fields.length - 1 : currentIndex - 1;
        setFocusField(fields[prevIndex]);
      } else {
        const nextIndex = (currentIndex + 1) % fields.length;
        setFocusField(fields[nextIndex]);
      }
    }

    // Navigate within checkbox/radio groups
    if (key.upArrow || key.downArrow) {
      if (focusField === 'types') {
        const delta = key.upArrow ? -1 : 1;
        const newIndex = (focusedTypeIndex + delta + exportTypes.length) % exportTypes.length;
        setFocusedTypeIndex(newIndex);
      } else if (focusField === 'format') {
        const formats = ['json', 'csv', 'markdown'];
        const currentIdx = formats.indexOf(format);
        const delta = key.upArrow ? -1 : 1;
        const newIndex = (currentIdx + delta + formats.length) % formats.length;
        setFocusedFormatIndex(newIndex);
        setFormat(formats[newIndex]);
      }
    }

    // Toggle checkboxes
    if (input === ' ') {
      if (focusField === 'types') {
        const newTypes = [...exportTypes];
        newTypes[focusedTypeIndex].checked = !newTypes[focusedTypeIndex].checked;
        setExportTypes(newTypes);
      } else if (focusField === 'compress') {
        setCompress(!compress);
      }
    }

    // Execute
    if (key.return && focusField === 'execute') {
      handleExecute();
    }
  });

  const handleExecute = async () => {
    const selectedTypes = exportTypes.filter(t => t.checked).map(t => t.value);

    if (selectedTypes.length === 0) {
      setExportStatus('error');
      setExportMessage('Please select at least one export type');
      return;
    }

    setIsExecuting(true);
    setExportStatus('running');
    setExportMessage('Exporting data...');

    try {
      const result = await CLIExecutor.executeExport(selectedTypes, {
        format,
        outputDir,
        compress
      });

      setExportResult(result);
      setExportStatus('success');
      setExportMessage(`Export complete: ${result.path}`);
      setIsExecuting(false);
    } catch (error) {
      setExportStatus('error');
      setExportMessage(error instanceof Error ? error.message : 'Export failed');
      setIsExecuting(false);
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          💾 Data Export
        </Text>
      </Box>

      {/* Export Types */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={focusField === 'types' ? 'green' : 'cyan'}
        padding={1}
        marginBottom={1}
      >
        <CheckboxGroup
          label="Export Types:"
          options={exportTypes}
          focusedIndex={focusField === 'types' ? focusedTypeIndex : undefined}
        />
      </Box>

      {/* Format Selection */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={focusField === 'format' ? 'green' : 'cyan'}
        padding={1}
        marginBottom={1}
      >
        <RadioGroup
          label="Format:"
          options={[
            { value: 'json', label: 'JSON' },
            { value: 'csv', label: 'CSV' },
            { value: 'markdown', label: 'Markdown' }
          ]}
          value={format}
          focusedIndex={focusField === 'format' ? focusedFormatIndex : undefined}
        />
      </Box>

      {/* Options */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="cyan"
        padding={1}
        marginBottom={1}
      >
        <Text bold color="cyan">Options</Text>

        <Box flexDirection="column" marginTop={1}>
          <TextInputField
            label="Output Directory"
            value={outputDir}
            onChange={setOutputDir}
            isFocused={focusField === 'outputDir'}
            placeholder="./exports"
          />

          <CheckboxField
            label="Compress"
            checked={compress}
            isFocused={focusField === 'compress'}
          />
        </Box>
      </Box>

      {/* Execute Button */}
      <Box marginBottom={1}>
        <Text
          bold
          color={focusField === 'execute' ? 'green' : 'white'}
          backgroundColor={focusField === 'execute' ? 'blue' : undefined}
        >
          {focusField === 'execute' ? '▶ ' : '  '}
          [Press Enter] Execute Export
        </Text>
      </Box>

      {/* Status */}
      {exportMessage && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={exportStatus === 'error' ? 'red' : exportStatus === 'success' ? 'green' : 'cyan'}
          padding={1}
          marginBottom={1}
        >
          <StatusIndicator status={exportStatus} message={exportMessage} />

          {exportResult && (
            <Box marginTop={1}>
              <Text>
                <Text color="gray">Path: </Text>
                <Text color="cyan">{exportResult.path}</Text>
              </Text>
            </Box>
          )}
        </Box>
      )}

      {/* Help */}
      <Box marginTop={1}>
        <Text dimColor>
          Tab: Next field | ↑↓: Navigate | Space: Toggle | Enter: Execute
        </Text>
      </Box>
    </Box>
  );
};
