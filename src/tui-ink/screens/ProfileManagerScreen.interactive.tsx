/**
 * Interactive AI Model Profile Manager
 *
 * Full profile CRUD operations with real-time updates
 * Spec 13: LLM Profile Management
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { CLIExecutor } from '../services/CLIExecutor.js';
import { StatusIndicator } from '../components/display/StatusIndicator.js';

type View = 'list' | 'add' | 'edit' | 'delete' | 'test';
type FocusField = 'list' | 'action-add' | 'action-edit' | 'action-delete' | 'action-set' | 'action-test' | 'confirm-yes' | 'confirm-no';

interface Profile {
  name: string;
  description?: string;
  provider: string;
  baseUrl: string;
  model: string;
  parameters: {
    temperature: number;
    maxTokens: number;
  };
  usageCount: number;
  lastUsed?: number;
  isActive?: boolean;
}

export const ProfileManagerScreenInteractive: React.FC = () => {
  const [view, setView] = useState<View>('list');
  const [focusField, setFocusField] = useState<FocusField>('list');

  // Profile state
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Action state
  const [actionStatus, setActionStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [actionMessage, setActionMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: string; profile: string } | null>(null);

  // Load profiles on mount
  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const loaded = await CLIExecutor.executeProfileList({ sort: 'last-used' });
      setProfiles(loaded);
      setActionStatus('idle');
      setActionMessage('');
    } catch (error) {
      setActionStatus('error');
      setActionMessage(error instanceof Error ? error.message : 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  // Handle keyboard input
  useInput((input, key) => {
    // Navigation in list view
    if (view === 'list' && focusField === 'list') {
      if (key.upArrow && selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1);
      }
      if (key.downArrow && selectedIndex < profiles.length - 1) {
        setSelectedIndex(selectedIndex + 1);
      }

      // Tab to action buttons
      if (key.tab) {
        setFocusField('action-add');
      }

      // Quick actions
      if (input === 'a') setFocusField('action-add');
      if (input === 'e') setFocusField('action-edit');
      if (input === 'd') setFocusField('action-delete');
      if (input === 's') setFocusField('action-set');
      if (input === 't') setFocusField('action-test');

      // Enter on profile = set as active
      if (key.return && profiles[selectedIndex]) {
        handleSetActive(profiles[selectedIndex].name);
      }
    }

    // Navigation between action buttons
    if (focusField.startsWith('action-')) {
      const actions: FocusField[] = ['action-add', 'action-edit', 'action-delete', 'action-set', 'action-test'];
      const currentIndex = actions.indexOf(focusField as any);

      if (key.tab) {
        if (key.shift) {
          if (currentIndex === 0) {
            setFocusField('list');
          } else {
            setFocusField(actions[currentIndex - 1]);
          }
        } else {
          const nextIndex = (currentIndex + 1) % actions.length;
          setFocusField(actions[nextIndex]);
        }
      }

      // Execute action
      if (key.return) {
        if (focusField === 'action-add') {
          setActionMessage('Use CLI: machine-dream llm profile add');
          setActionStatus('idle');
        } else if (focusField === 'action-edit') {
          setActionMessage('Use CLI: machine-dream llm profile edit <name>');
          setActionStatus('idle');
        } else if (focusField === 'action-delete' && profiles[selectedIndex]) {
          setPendingAction({ type: 'delete', profile: profiles[selectedIndex].name });
          setShowConfirm(true);
          setFocusField('confirm-no');
        } else if (focusField === 'action-set' && profiles[selectedIndex]) {
          handleSetActive(profiles[selectedIndex].name);
        } else if (focusField === 'action-test' && profiles[selectedIndex]) {
          handleTestConnection(profiles[selectedIndex].name);
        }
      }

      // Back to list
      if (key.escape) {
        setFocusField('list');
      }
    }

    // Confirmation dialog
    if (showConfirm) {
      if (key.leftArrow) setFocusField('confirm-no');
      if (key.rightArrow) setFocusField('confirm-yes');
      if (key.tab) {
        setFocusField(focusField === 'confirm-yes' ? 'confirm-no' : 'confirm-yes');
      }

      if (key.return) {
        if (focusField === 'confirm-yes' && pendingAction) {
          if (pendingAction.type === 'delete') {
            handleDelete(pendingAction.profile);
          }
        }
        setShowConfirm(false);
        setPendingAction(null);
        setFocusField('list');
      }

      if (key.escape) {
        setShowConfirm(false);
        setPendingAction(null);
        setFocusField('list');
      }
    }

    // Refresh profiles
    if (input === 'r' && !showConfirm) {
      loadProfiles();
    }
  });

  const handleSetActive = async (name: string) => {
    setActionStatus('running');
    setActionMessage(`Setting ${name} as active...`);

    try {
      await CLIExecutor.executeProfileSet(name);
      await loadProfiles();
      setActionStatus('success');
      setActionMessage(`✓ ${name} is now the active profile`);
    } catch (error) {
      setActionStatus('error');
      setActionMessage(error instanceof Error ? error.message : 'Failed to set active profile');
    }
  };

  const handleDelete = async (name: string) => {
    setActionStatus('running');
    setActionMessage(`Deleting ${name}...`);

    try {
      await CLIExecutor.executeProfileDelete(name);
      await loadProfiles();
      if (selectedIndex >= profiles.length - 1 && selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1);
      }
      setActionStatus('success');
      setActionMessage(`✓ Profile ${name} deleted`);
    } catch (error) {
      setActionStatus('error');
      setActionMessage(error instanceof Error ? error.message : 'Failed to delete profile');
    }
  };

  const handleTestConnection = async (name: string) => {
    setActionStatus('running');
    setActionMessage(`Testing connection to ${name}...`);

    try {
      const result = await CLIExecutor.executeProfileTest(name);
      if (result.healthy) {
        setActionStatus('success');
        setActionMessage(`✓ Connection successful! Latency: ${result.latency}ms`);
      } else {
        setActionStatus('error');
        setActionMessage(`✗ Connection failed: ${result.error}`);
      }
    } catch (error) {
      setActionStatus('error');
      setActionMessage(error instanceof Error ? error.message : 'Test failed');
    }
  };

  const formatTimestamp = (timestamp?: number): string => {
    if (!timestamp) return 'never';
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  if (loading) {
    return (
      <Box padding={1}>
        <Text>Loading profiles...</Text>
      </Box>
    );
  }

  const selectedProfile = profiles[selectedIndex];

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🤖 AI Model Profile Manager
        </Text>
        <Text color="gray"> (Interactive)</Text>
      </Box>

      <Box flexDirection="row" marginBottom={1}>
        {/* Profile List */}
        <Box
          flexDirection="column"
          borderStyle={focusField === 'list' ? 'double' : 'single'}
          borderColor={focusField === 'list' ? 'cyan' : 'gray'}
          padding={1}
          width={45}
        >
          <Text bold color="cyan">
            📋 Profiles ({profiles.length})
          </Text>
          <Box marginY={1}>
            <Box flexDirection="column">
            {profiles.length === 0 ? (
              <Text dimColor>No profiles found</Text>
            ) : (
              profiles.map((profile, index) => (
                <Box key={profile.name} marginBottom={0}>
                  <Text>
                    {index === selectedIndex && focusField === 'list' ? (
                      <Text color="yellow" bold>{'► '}</Text>
                    ) : (
                      <Text>{'  '}</Text>
                    )}
                    {profile.isActive ? (
                      <Text color="green">▶ </Text>
                    ) : (
                      <Text>{'  '}</Text>
                    )}
                    <Text bold={index === selectedIndex}>
                      {profile.name}
                    </Text>
                    {profile.isActive && (
                      <Text color="green"> (Active)</Text>
                    )}
                  </Text>
                  <Text dimColor>
                    {'    '}
                    {profile.provider} | {profile.model.substring(0, 20)}
                    {profile.model.length > 20 ? '...' : ''}
                  </Text>
                  <Text dimColor>
                    {'    '}
                    Used: {profile.usageCount} | {formatTimestamp(profile.lastUsed)}
                  </Text>
                </Box>
              ))
            )}
            </Box>
          </Box>
        </Box>

        {/* Profile Details */}
        {selectedProfile && (
          <Box
            flexDirection="column"
            borderStyle="single"
            borderColor="yellow"
            padding={1}
            marginLeft={1}
            width={50}
          >
            <Text bold color="yellow">
              ℹ️  {selectedProfile.name}
            </Text>
            <Box marginY={1}>
              <Box flexDirection="column">
              {selectedProfile.description && (
                <Text dimColor>{selectedProfile.description}</Text>
              )}
              <Box marginY={1}>
                <Text>
                  <Text color="gray">Provider:    </Text>
                  <Text color="cyan">{selectedProfile.provider}</Text>
                </Text>
              </Box>
              <Text>
                <Text color="gray">Model:       </Text>
                <Text>{selectedProfile.model}</Text>
              </Text>
              <Text>
                <Text color="gray">Base URL:    </Text>
                <Text dimColor>{selectedProfile.baseUrl}</Text>
              </Text>
              <Text>
                <Text color="gray">Temperature: </Text>
                <Text color="yellow">{selectedProfile.parameters.temperature}</Text>
              </Text>
              <Text>
                <Text color="gray">Max Tokens:  </Text>
                <Text color="yellow">{selectedProfile.parameters.maxTokens}</Text>
              </Text>
              <Text>
                <Text color="gray">Usage:       </Text>
                <Text>{selectedProfile.usageCount} times</Text>
              </Text>
              <Text>
                <Text color="gray">Last Used:   </Text>
                <Text>{formatTimestamp(selectedProfile.lastUsed)}</Text>
              </Text>
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      {/* Action Buttons */}
      <Box marginBottom={1}>
        <Box
          borderStyle={focusField === 'action-add' ? 'bold' : 'single'}
          borderColor={focusField === 'action-add' ? 'green' : 'gray'}
          paddingX={1}
          marginRight={1}
        >
          <Text color={focusField === 'action-add' ? 'green' : 'white'}>
            [A]dd
          </Text>
        </Box>
        <Box
          borderStyle={focusField === 'action-edit' ? 'bold' : 'single'}
          borderColor={focusField === 'action-edit' ? 'blue' : 'gray'}
          paddingX={1}
          marginRight={1}
        >
          <Text color={focusField === 'action-edit' ? 'blue' : 'white'}>
            [E]dit
          </Text>
        </Box>
        <Box
          borderStyle={focusField === 'action-delete' ? 'bold' : 'single'}
          borderColor={focusField === 'action-delete' ? 'red' : 'gray'}
          paddingX={1}
          marginRight={1}
        >
          <Text color={focusField === 'action-delete' ? 'red' : 'white'}>
            [D]elete
          </Text>
        </Box>
        <Box
          borderStyle={focusField === 'action-set' ? 'bold' : 'single'}
          borderColor={focusField === 'action-set' ? 'cyan' : 'gray'}
          paddingX={1}
          marginRight={1}
        >
          <Text color={focusField === 'action-set' ? 'cyan' : 'white'}>
            [S]et Active
          </Text>
        </Box>
        <Box
          borderStyle={focusField === 'action-test' ? 'bold' : 'single'}
          borderColor={focusField === 'action-test' ? 'yellow' : 'gray'}
          paddingX={1}
        >
          <Text color={focusField === 'action-test' ? 'yellow' : 'white'}>
            [T]est
          </Text>
        </Box>
      </Box>

      {/* Confirmation Dialog */}
      {showConfirm && pendingAction && (
        <Box
          flexDirection="column"
          borderStyle="bold"
          borderColor="red"
          padding={1}
          marginBottom={1}
        >
          <Text bold color="red">
            ⚠️  Confirm {pendingAction.type}
          </Text>
          <Box marginY={1}>
            <Text>
              {pendingAction.type === 'delete' &&
                `Delete profile "${pendingAction.profile}"?`
              }
            </Text>
          </Box>
          <Box marginY={1}>
            <Box
              borderStyle={focusField === 'confirm-yes' ? 'bold' : 'single'}
              borderColor="red"
              paddingX={1}
              marginRight={1}
            >
              <Text color={focusField === 'confirm-yes' ? 'red' : 'white'}>
                Yes, delete
              </Text>
            </Box>
            <Box
              borderStyle={focusField === 'confirm-no' ? 'bold' : 'single'}
              borderColor="green"
              paddingX={1}
            >
              <Text color={focusField === 'confirm-no' ? 'green' : 'white'}>
                No, cancel
              </Text>
            </Box>
          </Box>
        </Box>
      )}

      {/* Status Message */}
      {actionMessage && (
        <Box marginBottom={1}>
          <StatusIndicator status={actionStatus} message={actionMessage} />
        </Box>
      )}

      {/* Help */}
      <Box>
        <Text dimColor>
          ↑↓: Select | Enter: Set active | A/E/D/S/T: Actions | Tab: Navigate | R: Refresh | Esc: Back
        </Text>
      </Box>
    </Box>
  );
};
