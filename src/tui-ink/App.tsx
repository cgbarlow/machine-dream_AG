/**
 * Main TUI Application
 *
 * Integrates all screens with navigation and keyboard shortcuts
 */

import React, { useState, useEffect } from 'react';
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
import { LLMScreenInteractive } from './screens/LLMScreen.interactive.js';
import { PuzzleGeneratorScreenInteractive } from './screens/PuzzleGeneratorScreen.interactive.js';
import { ProfileManagerScreenInteractive } from './screens/ProfileManagerScreen.interactive.js';
import { ConsoleScreen } from './screens/ConsoleScreen.js';
import { ConsoleOverlay } from './components/overlays/ConsoleOverlay.js';
import { HelpOverlay } from './components/overlays/HelpOverlay.js';
import { OutputCapture } from './services/OutputCapture.js';

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
  { id: 'generate', label: 'Generate', icon: '🎲', shortcut: '[G]', screen: 'Generate' },
  { id: 'llm', label: 'LLM Play', icon: '🤖', shortcut: '[L]', screen: 'LLM' },
  { id: 'profiles', label: 'AI Models', icon: '🔧', shortcut: '[A]', screen: 'Profiles' },
  { id: 'memory', label: 'Memory', icon: '💾', shortcut: '[M]', screen: 'Memory' },
  { id: 'dream', label: 'Dream', icon: '💭', shortcut: '[D]', screen: 'Dream' },
  { id: 'benchmark', label: 'Benchmark', icon: '⚡', shortcut: '[B]', screen: 'Benchmark' },
  { id: 'demo', label: 'Demo', icon: '🎮', shortcut: '[E]', screen: 'Demo' },
  { id: 'config', label: 'Config', icon: '⚙️', shortcut: '[C]', screen: 'Config' },
  { id: 'export', label: 'Export', icon: '📤', shortcut: '[X]', screen: 'Export' },
  { id: 'system', label: 'System', icon: '🖥️', shortcut: '[Y]', screen: 'System' },
  { id: 'console', label: 'Console', icon: '>', shortcut: '[T]', screen: 'Console' },
];

export const App: React.FC = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showConsoleOverlay, setShowConsoleOverlay] = useState(false);
  const [showHelpOverlay, setShowHelpOverlay] = useState(false);
  const { exit } = useApp();

  // Start output capture on mount
  useEffect(() => {
    OutputCapture.start();
    return () => OutputCapture.stop();
  }, []);

  // Keyboard navigation
  useInput((input, key) => {
    // Backtick toggles console overlay
    if (input === '`') {
      setShowConsoleOverlay((prev) => !prev);
      return;
    }

    // ? toggles help overlay
    if (input === '?') {
      setShowHelpOverlay((prev) => !prev);
      return;
    }

    // Escape closes overlays
    if (key.escape) {
      if (showConsoleOverlay) {
        setShowConsoleOverlay(false);
        return;
      }
      if (showHelpOverlay) {
        setShowHelpOverlay(false);
        return;
      }
    }

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
      g: 2, // Generate
      l: 3, // LLM Play
      a: 4, // AI Models
      m: 5, // Memory
      d: 6, // Dream
      b: 7, // Benchmark
      e: 8, // Demo
      c: 9, // Config
      x: 10, // Export
      y: 11, // System
      t: 12, // Console
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
      case 'generate':
        return <PuzzleGeneratorScreenInteractive />;
      case 'llm':
        return <LLMScreenInteractive />;
      case 'profiles':
        return <ProfileManagerScreenInteractive />;
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
      case 'console':
        return <ConsoleScreen />;
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

      {/* Overlays */}
      {showConsoleOverlay && (
        <ConsoleOverlay onClose={() => setShowConsoleOverlay(false)} />
      )}
      {showHelpOverlay && (
        <HelpOverlay
          screen={currentScreen}
          onClose={() => setShowHelpOverlay(false)}
        />
      )}
    </Box>
  );
};
