/**
 * Interactive Configuration Editor
 *
 * Edit system configuration with validation
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { CLIExecutor } from '../services/CLIExecutor.js';
import { TabbedContent } from '../components/layout/TabbedContent.js';
import { TextInputField } from '../components/forms/TextInputField.js';
import { CheckboxField } from '../components/forms/CheckboxField.js';
import { SelectField } from '../components/forms/SelectField.js';
import { ButtonGroup } from '../components/forms/ButtonGroup.js';
import { StatusIndicator } from '../components/display/StatusIndicator.js';

type Tab = 'memory' | 'solving' | 'dreaming';
type FocusField = 'memorySystem' | 'enableRL' | 'enableReflexion' | 'dbPath' | 'maxIterations' | 'save' | 'cancel' | 'reset';

export const ConfigScreenInteractive: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('memory');
  const [focusField, setFocusField] = useState<FocusField>('memorySystem');

  // Config state
  const [config, setConfig] = useState<any>(null);
  const [memorySystem, setMemorySystem] = useState('agentdb');
  const [enableRL, setEnableRL] = useState(true);
  const [enableReflexion, setEnableReflexion] = useState(true);
  const [dbPath, setDbPath] = useState('.agentdb');
  const [maxIterations, setMaxIterations] = useState('50');

  const [saveStatus, setSaveStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [modified, setModified] = useState(0);

  // Load config on mount
  useEffect(() => {
    CLIExecutor.getConfig().then(cfg => {
      setConfig(cfg);
      setMemorySystem(cfg.memorySystem || 'agentdb');
      setEnableRL(cfg.enableRL ?? true);
      setEnableReflexion(cfg.enableReflexion ?? true);
      setDbPath(cfg.agentdb?.dbPath || '.agentdb');
      setMaxIterations(String(cfg.solving?.maxIterations || 50));
    });
  }, []);

  // Handle keyboard input
  useInput((input, key) => {
    // Tab switching
    if (input === '1') setActiveTab('memory');
    if (input === '2') setActiveTab('solving');
    if (input === '3') setActiveTab('dreaming');

    // Field navigation
    if (key.tab) {
      const memoryFields: FocusField[] = ['memorySystem', 'enableRL', 'enableReflexion', 'dbPath', 'save', 'cancel', 'reset'];
      const solvingFields: FocusField[] = ['maxIterations', 'save', 'cancel', 'reset'];

      let fields: FocusField[] = [];
      if (activeTab === 'memory') fields = memoryFields;
      else if (activeTab === 'solving') fields = solvingFields;
      else fields = ['save', 'cancel', 'reset'];

      const currentIndex = fields.indexOf(focusField);

      if (key.shift) {
        const prevIndex = currentIndex === 0 ? fields.length - 1 : currentIndex - 1;
        setFocusField(fields[prevIndex]);
      } else {
        const nextIndex = (currentIndex + 1) % fields.length;
        setFocusField(fields[nextIndex]);
      }
    }

    // Toggle checkboxes
    if (input === ' ') {
      if (focusField === 'enableRL') {
        setEnableRL(!enableRL);
        setModified(modified + 1);
      }
      if (focusField === 'enableReflexion') {
        setEnableReflexion(!enableReflexion);
        setModified(modified + 1);
      }
    }

    // Execute actions
    if (key.return) {
      if (focusField === 'save') handleSave();
      if (focusField === 'cancel') handleCancel();
      if (focusField === 'reset') handleReset();
    }
  });

  const handleSave = async () => {
    setSaveStatus('running');
    setSaveMessage('Saving configuration...');

    try {
      await CLIExecutor.setConfig('memorySystem', memorySystem);
      await CLIExecutor.setConfig('enableRL', enableRL);
      await CLIExecutor.setConfig('enableReflexion', enableReflexion);
      await CLIExecutor.setConfig('agentdb.dbPath', dbPath);
      await CLIExecutor.setConfig('solving.maxIterations', parseInt(maxIterations));

      setSaveStatus('success');
      setSaveMessage('Configuration saved successfully');
      setModified(0);
    } catch (error) {
      setSaveStatus('error');
      setSaveMessage(error instanceof Error ? error.message : 'Failed to save');
    }
  };

  const handleCancel = () => {
    if (config) {
      setMemorySystem(config.memorySystem || 'agentdb');
      setEnableRL(config.enableRL ?? true);
      setEnableReflexion(config.enableReflexion ?? true);
      setDbPath(config.agentdb?.dbPath || '.agentdb');
      setMaxIterations(String(config.solving?.maxIterations || 50));
      setModified(0);
      setSaveMessage('Changes discarded');
      setSaveStatus('idle');
    }
  };

  const handleReset = async () => {
    // Reset to defaults
    setMemorySystem('agentdb');
    setEnableRL(true);
    setEnableReflexion(true);
    setDbPath('.agentdb');
    setMaxIterations('50');
    setModified(7);
    setSaveMessage('Reset to defaults (not saved yet)');
    setSaveStatus('idle');
  };

  // Tab content
  const memoryTab = (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">Memory Settings</Text>

      <Box flexDirection="column" marginTop={1}>
        <SelectField
          label="Memory System"
          value={memorySystem}
          options={[
            { value: 'agentdb', label: 'AgentDB' },
            { value: 'reasoningbank', label: 'ReasoningBank' }
          ]}
          isFocused={focusField === 'memorySystem'}
        />

        <CheckboxField
          label="Enable RL"
          checked={enableRL}
          isFocused={focusField === 'enableRL'}
        />

        <CheckboxField
          label="Enable Reflexion"
          checked={enableReflexion}
          isFocused={focusField === 'enableReflexion'}
        />

        <TextInputField
          label="Database Path"
          value={dbPath}
          onChange={(val) => { setDbPath(val); setModified(modified + 1); }}
          isFocused={focusField === 'dbPath'}
          placeholder=".agentdb"
        />
      </Box>
    </Box>
  );

  const solvingTab = (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">Solving Settings</Text>

      <Box flexDirection="column" marginTop={1}>
        <TextInputField
          label="Max Iterations"
          value={maxIterations}
          onChange={(val) => { setMaxIterations(val); setModified(modified + 1); }}
          isFocused={focusField === 'maxIterations'}
          placeholder="50"
        />
      </Box>
    </Box>
  );

  const dreamingTab = (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">Dreaming Settings</Text>
      <Box marginTop={1}>
        <Text dimColor>Dreaming configuration options coming soon...</Text>
      </Box>
    </Box>
  );

  const tabs = [
    { id: 'memory', label: 'Memory', content: memoryTab },
    { id: 'solving', label: 'Solving', content: solvingTab },
    { id: 'dreaming', label: 'Dreaming', content: dreamingTab }
  ];

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          ⚙️  System Configuration
        </Text>
      </Box>

      <TabbedContent
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as Tab)}
      />

      {/* Action Buttons */}
      <Box marginTop={1} marginBottom={1}>
        <ButtonGroup
          buttons={[
            { label: 'Save Changes', action: 'save', color: 'white', backgroundColor: 'green' },
            { label: 'Cancel', action: 'cancel', color: 'white', backgroundColor: 'red' },
            { label: 'Reset to Defaults', action: 'reset', color: 'white', backgroundColor: 'yellow' }
          ]}
          focusedIndex={
            focusField === 'save' ? 0 :
            focusField === 'cancel' ? 1 :
            focusField === 'reset' ? 2 : -1
          }
        />
      </Box>

      {/* Status */}
      {modified > 0 && (
        <Box>
          <Text color="yellow">⚠ Modified: {modified} settings</Text>
        </Box>
      )}

      {saveMessage && (
        <Box marginTop={1}>
          <StatusIndicator status={saveStatus} message={saveMessage} />
        </Box>
      )}

      {/* Help */}
      <Box marginTop={1}>
        <Text dimColor>
          1-3: Switch tabs | Tab: Next field | Space: Toggle | Enter: Execute
        </Text>
      </Box>
    </Box>
  );
};
