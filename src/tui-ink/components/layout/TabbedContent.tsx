/**
 * TabbedContent Component
 *
 * Tab container with content switching
 */

import React from 'react';
import { Box } from 'ink';
import { TabBar } from '../display/TabBar.js';

interface Tab {
  id: string;
  label: string;
  badge?: string | number;
  content: React.ReactNode;
}

interface TabbedContentProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange?: (tabId: string) => void;
}

export const TabbedContent: React.FC<TabbedContentProps> = ({
  tabs,
  activeTab,
  onTabChange
}) => {
  const currentTab = tabs.find(tab => tab.id === activeTab);

  return (
    <Box flexDirection="column">
      {/* Tab Bar */}
      <Box marginBottom={1}>
        <TabBar
          tabs={tabs.map(t => ({ id: t.id, label: t.label, badge: t.badge }))}
          activeTab={activeTab}
          onTabChange={onTabChange}
        />
      </Box>

      {/* Tab Content */}
      <Box flexDirection="column">
        {currentTab?.content}
      </Box>
    </Box>
  );
};
