/**
 * Main TUI Application
 *
 * Integrates all screens with navigation and keyboard shortcuts
 */

import React, { useState } from 'react';
import { Box, useInput, useApp } from 'ink';
import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { StatusBar } from './components/StatusBar.js';
import { HomeScreen } from './screens/HomeScreen.js';
import { SolveScreenInteractive } from './screens/SolveScreen.interactive.js';
import { MemoryScreenInteractive } from './screens/MemoryScreen.interactive.js';
import { DreamScreenInteractive } from './screens/DreamScreen.interactive.js';
import { BenchmarkScreenInteractive } from './screens/BenchmarkScreen.interactive.js';
import { DemoScreenInteractive } from './screens/DemoScreen.interactive.js';
import { ConfigScreenInteractive } from './screens/ConfigScreen.interactive.js';
import { ExportScreenInteractive } from './screens/ExportScreen.interactive.js';
import { SystemScreen } from './screens/SystemScreen.js';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  shortcut: string;
  screen: string;
}

const menuItems: MenuItem[] = [
  { id: 'home', label: 'Home', icon: '🏠', shortcut: '[H]', screen: 'Home' },
  { id: 'solve', label: 'Solve', icon: '🧩', shortcut: '[S]', screen: 'Solve' },
  { id: 'memory', label: 'Memory', icon: '💾', shortcut: '[M]', screen: 'Memory' },
  { id: 'dream', label: 'Dream', icon: '💭', shortcut: '[D]', screen: 'Dream' },
  { id: 'benchmark', label: 'Benchmark', icon: '⚡', shortcut: '[B]', screen: 'Benchmark' },
  { id: 'demo', label: 'Demo', icon: '🎮', shortcut: '[E]', screen: 'Demo' },
  { id: 'config', label: 'Config', icon: '⚙️', shortcut: '[C]', screen: 'Config' },
  { id: 'export', label: 'Export', icon: '📤', shortcut: '[X]', screen: 'Export' },
  { id: 'system', label: 'System', icon: '🖥️', shortcut: '[Y]', screen: 'System' },
];

export const App: React.FC = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { exit } = useApp();

  // Keyboard navigation
  useInput((input, key) => {
    // Arrow key navigation
    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : menuItems.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev < menuItems.length - 1 ? prev + 1 : 0));
    }

    // Letter shortcuts
    const shortcuts: Record<string, number> = {
      h: 0, // Home
      s: 1, // Solve
      m: 2, // Memory
      d: 3, // Dream
      b: 4, // Benchmark
      e: 5, // Demo
      c: 6, // Config
      x: 7, // Export
      y: 8, // System
    };

    if (input && shortcuts[input.toLowerCase()] !== undefined) {
      setSelectedIndex(shortcuts[input.toLowerCase()]);
    }

    // Exit on Ctrl+C or q
    if (key.ctrl && input === 'c') {
      exit();
    }
    if (input === 'q') {
      exit();
    }
  });

  // Render current screen - ALL INTERACTIVE NOW!
  const renderScreen = () => {
    const currentScreen = menuItems[selectedIndex].id;
    switch (currentScreen) {
      case 'home':
        return <HomeScreen />;
      case 'solve':
        return <SolveScreenInteractive />;
      case 'memory':
        return <MemoryScreenInteractive />;
      case 'dream':
        return <DreamScreenInteractive />;
      case 'benchmark':
        return <BenchmarkScreenInteractive />;
      case 'demo':
        return <DemoScreenInteractive />;
      case 'config':
        return <ConfigScreenInteractive />;
      case 'export':
        return <ExportScreenInteractive />;
      case 'system':
        return <SystemScreen />;
      default:
        return <HomeScreen />;
    }
  };

  const currentScreen = menuItems[selectedIndex].screen;
  const sessionId = `session-${Date.now().toString(36)}`;

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Header
        title="Machine Dream AG"
        subtitle="Advanced GRASP Solver with AgentDB Memory"
        currentScreen={currentScreen}
      />

      {/* Main Content Area */}
      <Box flexGrow={1}>
        {/* Sidebar Navigation */}
        <Sidebar
          items={menuItems}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
        />

        {/* Content Area */}
        <Box flexGrow={1} paddingLeft={1}>
          {renderScreen()}
        </Box>
      </Box>

      {/* Status Bar */}
      <StatusBar
        sessionId={sessionId}
        memoryStatus="Ready"
        databaseStatus="Connected"
      />
    </Box>
  );
};
