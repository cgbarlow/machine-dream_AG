/**
 * Interactive Memory Browser
 *
 * Full interactive memory operations with tabs for Store/Search/List/Operations
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { CLIExecutor } from '../services/CLIExecutor.js';
import { TabbedContent } from '../components/layout/TabbedContent.js';
import { TextInputField } from '../components/forms/TextInputField.js';
import { StatusIndicator } from '../components/display/StatusIndicator.js';
import { ScrollableList } from '../components/layout/ScrollableList.js';

type Tab = 'store' | 'search' | 'list' | 'operations';
type FocusField = 'key' | 'value' | 'namespace' | 'pattern' | 'namespace-list' | 'store-button' | 'search-button' | 'consolidate-button' | 'optimize-button';

export const MemoryScreenInteractive: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('store');
  const [focusField, setFocusField] = useState<FocusField>('key');

  // Store tab state
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [namespace, setNamespace] = useState('default');
  const [storeStatus, setStoreStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [storeMessage, setStoreMessage] = useState('');

  // Search tab state
  const [pattern, setPattern] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ key: string; value: unknown; similarity: number }>>([]);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');

  // List tab state
  const [listNamespace, setListNamespace] = useState('default');
  const [keys, setKeys] = useState<string[]>([]);

  // Operations state
  const [operationStatus, setOperationStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [operationMessage, setOperationMessage] = useState('');

  // Live statistics
  const [stats, setStats] = useState({
    totalEntries: 0,
    patterns: 0,
    skills: 0,
    dbSize: '0 MB'
  });

  // Update stats periodically
  useEffect(() => {
    const updateStats = async () => {
      const newStats = await CLIExecutor.getMemoryStats();
      setStats(newStats);
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle keyboard input
  useInput((input, key) => {
    // Tab navigation between tabs
    if (input === '1') setActiveTab('store');
    if (input === '2') setActiveTab('search');
    if (input === '3') setActiveTab('list');
    if (input === '4') setActiveTab('operations');

    // Field navigation with Tab/Shift-Tab
    if (key.tab) {
      const storeFields: FocusField[] = ['key', 'value', 'namespace', 'store-button'];
      const searchFields: FocusField[] = ['pattern', 'search-button'];
      const listFields: FocusField[] = ['namespace-list'];
      const opFields: FocusField[] = ['consolidate-button', 'optimize-button'];

      let fields: FocusField[] = [];
      if (activeTab === 'store') fields = storeFields;
      else if (activeTab === 'search') fields = searchFields;
      else if (activeTab === 'list') fields = listFields;
      else if (activeTab === 'operations') fields = opFields;

      const currentIndex = fields.indexOf(focusField);

      if (key.shift) {
        const prevIndex = currentIndex === 0 ? fields.length - 1 : currentIndex - 1;
        setFocusField(fields[prevIndex]);
      } else {
        const nextIndex = (currentIndex + 1) % fields.length;
        setFocusField(fields[nextIndex]);
      }
    }

    // Execute actions with Enter
    if (key.return) {
      if (focusField === 'store-button') handleStore();
      if (focusField === 'search-button') handleSearch();
      if (focusField === 'consolidate-button') handleConsolidate();
      if (focusField === 'optimize-button') handleOptimize();
    }
  });

  const handleStore = async () => {
    setStoreStatus('running');
    setStoreMessage('Storing...');

    try {
      await CLIExecutor.memoryStore(key, value, { namespace });
      setStoreStatus('success');
      setStoreMessage(`Stored: ${key} = ${value}`);
      setKey('');
      setValue('');
    } catch (error) {
      setStoreStatus('error');
      setStoreMessage(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleSearch = async () => {
    setSearchStatus('running');

    try {
      const results = await CLIExecutor.memorySearch(pattern, { limit: 10 });
      setSearchResults(results);
      setSearchStatus('success');
    } catch (error) {
      setSearchStatus('error');
    }
  };

  const handleListKeys = async () => {
    try {
      const keysList = await CLIExecutor.memoryList(listNamespace);
      setKeys(keysList);
    } catch (error) {
      setKeys([]);
    }
  };

  const handleConsolidate = async () => {
    setOperationStatus('running');
    setOperationMessage('Consolidating patterns...');

    try {
      const result = await CLIExecutor.memoryConsolidate();
      setOperationStatus('success');
      setOperationMessage(`Consolidated ${result.patternsConsolidated} patterns`);
    } catch (error) {
      setOperationStatus('error');
      setOperationMessage(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleOptimize = async () => {
    setOperationStatus('running');
    setOperationMessage('Optimizing memory...');

    try {
      const result = await CLIExecutor.memoryOptimize();
      setOperationStatus('success');
      setOperationMessage(`Optimized: ${result.before} → ${result.after} entries`);
    } catch (error) {
      setOperationStatus('error');
      setOperationMessage(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  // Load keys when tab or namespace changes
  useEffect(() => {
    if (activeTab === 'list') {
      handleListKeys();
    }
  }, [activeTab, listNamespace]);

  // Tab content
  const storeTab = (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">Store Key-Value Pair</Text>

      <Box flexDirection="column" marginTop={1}>
        <TextInputField
          label="Key"
          value={key}
          onChange={setKey}
          onSubmit={() => setFocusField('value')}
          isFocused={focusField === 'key'}
          placeholder="my-key"
        />

        <TextInputField
          label="Value"
          value={value}
          onChange={setValue}
          onSubmit={() => setFocusField('namespace')}
          isFocused={focusField === 'value'}
          placeholder="my-value"
        />

        <TextInputField
          label="Namespace"
          value={namespace}
          onChange={setNamespace}
          onSubmit={() => setFocusField('store-button')}
          isFocused={focusField === 'namespace'}
          placeholder="default"
        />
      </Box>

      <Box marginTop={1}>
        <Text
          bold
          color={focusField === 'store-button' ? 'green' : 'white'}
          backgroundColor={focusField === 'store-button' ? 'blue' : undefined}
        >
          {focusField === 'store-button' ? '▶ ' : '  '}
          [Press Enter] Store
        </Text>
      </Box>

      {storeMessage && (
        <Box marginTop={1}>
          <StatusIndicator status={storeStatus} message={storeMessage} />
        </Box>
      )}
    </Box>
  );

  const searchTab = (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">Search Memory</Text>

      <Box flexDirection="column" marginTop={1}>
        <TextInputField
          label="Pattern"
          value={pattern}
          onChange={setPattern}
          onSubmit={() => setFocusField('search-button')}
          isFocused={focusField === 'pattern'}
          placeholder="search-pattern"
        />
      </Box>

      <Box marginTop={1}>
        <Text
          bold
          color={focusField === 'search-button' ? 'green' : 'white'}
          backgroundColor={focusField === 'search-button' ? 'blue' : undefined}
        >
          {focusField === 'search-button' ? '▶ ' : '  '}
          [Press Enter] Search
        </Text>
      </Box>

      {searchResults.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="cyan">Results:</Text>
          <ScrollableList
            items={searchResults.map((r, i) => ({
              id: String(i),
              label: `${r.key}`,
              secondary: `similarity: ${r.similarity.toFixed(2)}`
            }))}
            maxHeight={10}
          />
        </Box>
      )}
    </Box>
  );

  const listTab = (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">List All Keys</Text>

      <Box flexDirection="column" marginTop={1}>
        <TextInputField
          label="Namespace"
          value={listNamespace}
          onChange={setListNamespace}
          isFocused={focusField === 'namespace-list'}
          placeholder="default"
        />
      </Box>

      {keys.length > 0 ? (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="cyan">Keys in {listNamespace}:</Text>
          <ScrollableList
            items={keys.map((k, i) => ({ id: String(i), label: k }))}
            maxHeight={10}
            showIndex
          />
        </Box>
      ) : (
        <Box marginTop={1}>
          <Text dimColor>No keys found in namespace &quot;{listNamespace}&quot;</Text>
        </Box>
      )}
    </Box>
  );

  const operationsTab = (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">Memory Operations</Text>

      <Box flexDirection="column" marginTop={1} gap={1}>
        <Text
          bold
          color={focusField === 'consolidate-button' ? 'green' : 'white'}
          backgroundColor={focusField === 'consolidate-button' ? 'blue' : undefined}
        >
          {focusField === 'consolidate-button' ? '▶ ' : '  '}
          [Press Enter] Consolidate Patterns
        </Text>

        <Text
          bold
          color={focusField === 'optimize-button' ? 'green' : 'white'}
          backgroundColor={focusField === 'optimize-button' ? 'blue' : undefined}
        >
          {focusField === 'optimize-button' ? '▶ ' : '  '}
          [Press Enter] Optimize Memory
        </Text>
      </Box>

      {operationMessage && (
        <Box marginTop={1}>
          <StatusIndicator status={operationStatus} message={operationMessage} />
        </Box>
      )}
    </Box>
  );

  const tabs = [
    { id: 'store', label: 'Store', content: storeTab },
    { id: 'search', label: 'Search', content: searchTab },
    { id: 'list', label: 'List', content: listTab },
    { id: 'operations', label: 'Operations', content: operationsTab }
  ];

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">🧠 Memory Browser</Text>
      </Box>

      <TabbedContent
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as Tab)}
      />

      {/* Live Statistics */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="cyan"
        padding={1}
        marginTop={1}
      >
        <Text bold color="cyan">Live Statistics</Text>
        <Text>
          Total: {stats.totalEntries} | Patterns: {stats.patterns} | Skills: {stats.skills} | {stats.dbSize}
        </Text>
      </Box>

      {/* Help */}
      <Box marginTop={1}>
        <Text dimColor>
          1-4: Switch tabs | Tab: Next field | Enter: Execute
        </Text>
      </Box>
    </Box>
  );
};
