/**
 * TabBar Component
 *
 * Tab navigation bar
 */

import React from 'react';
import { Box, Text } from 'ink';

interface Tab {
  id: string;
  label: string;
  badge?: string | number;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange?: (tabId: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTab,
  onTabChange
}) => {
  return (
    <Box gap={1}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <Box key={tab.id} paddingX={1}>
            <Text
              bold={isActive}
              color={isActive ? 'cyan' : 'gray'}
              backgroundColor={isActive ? 'blue' : undefined}
            >
              [{tab.label}]
            </Text>
            {tab.badge !== undefined && (
              <Text color="yellow"> ({tab.badge})</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
};
