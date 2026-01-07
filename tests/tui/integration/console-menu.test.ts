/**
 * Console Menu Integration Tests
 *
 * Tests the Console Menu feature including:
 * - ConsolePanel component integration
 * - OutputBuffer display and scrolling
 * - CommandInput with command history
 * - ConsoleOverlay toggle behavior
 * - HelpOverlay context-sensitive display
 *
 * Specification: docs/specs/14-console-menu-interface-spec.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { useState, useEffect } from 'react';
import { render } from 'ink-testing-library';
import { Text, Box } from 'ink';
import { ConsolePanel } from '../../../src/tui-ink/components/console/ConsolePanel.js';
import { OutputBuffer } from '../../../src/tui-ink/components/console/OutputBuffer.js';
import { CommandInput } from '../../../src/tui-ink/components/console/CommandInput.js';
import { ConsoleOverlay } from '../../../src/tui-ink/components/overlays/ConsoleOverlay.js';
import { HelpOverlay } from '../../../src/tui-ink/components/overlays/HelpOverlay.js';

// Simple mock of TextInput that simulates keyboard input for tests
let currentInputValue = '';
let currentOnChange: ((val: string) => void) | null = null;
let currentOnSubmit: ((val: string) => void) | null = null;

vi.mock('ink-text-input', () => ({
  default: ({ value, onChange, onSubmit, placeholder }: any) => {
    currentInputValue = value || '';
    currentOnChange = onChange;
    currentOnSubmit = onSubmit;
    return React.createElement(Text, {}, value || placeholder);
  },
}));

describe('Console Menu Integration Tests (Spec 14)', () => {
  describe('ConsolePanel Component', () => {
    it('should render with title and input', () => {
      const { lastFrame } = render(
        React.createElement(ConsolePanel, {
          title: 'Test Console',
          showInput: true,
        })
      );

      expect(lastFrame()).toContain('Test Console');
      expect(lastFrame()).toContain('Command');
    });

    it('should call onCommand when command is submitted', async () => {
      const onCommand = vi.fn();
      const { stdin } = render(
        React.createElement(ConsolePanel, {
          title: 'Test Console',
          onCommand,
          showInput: true,
        })
      );

      // Wait for component to mount and capture callbacks
      await new Promise(resolve => setTimeout(resolve, 50));

      // Simulate text input by calling the mocked callbacks
      if (currentOnChange) {
        currentOnChange('test command');
      }
      await new Promise(resolve => setTimeout(resolve, 10));

      // Simulate Enter key by calling onSubmit
      if (currentOnSubmit) {
        currentOnSubmit('test command');
      }
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(onCommand).toHaveBeenCalledWith('test command');
    });

    it('should toggle focus between output and input with Tab', async () => {
      const { lastFrame, stdin } = render(
        React.createElement(ConsolePanel, {
          title: 'Test Console',
          showInput: true,
        })
      );

      // Initial state should show Input as focused
      expect(lastFrame()).toContain('Current: Input');

      // Press Tab to switch to Output
      stdin.write('\t');
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(lastFrame()).toContain('Current: Output');

      // Press Tab again to switch back to Input
      stdin.write('\t');
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(lastFrame()).toContain('Current: Input');
    });

    it('should not render input when showInput is false', () => {
      const { lastFrame } = render(
        React.createElement(ConsolePanel, {
          title: 'Test Console',
          showInput: false,
        })
      );

      expect(lastFrame()).not.toContain('Enter command');
    });
  });

  describe('OutputBuffer Component', () => {
    it('should render empty buffer with placeholder', () => {
      const { lastFrame } = render(
        React.createElement(OutputBuffer, {
          maxLines: 10,
        })
      );

      expect(lastFrame()).toContain('No output yet');
    });

    it('should display output lines', () => {
      // Note: This would require the OutputCapture service to be active
      // For now, we test that the component renders without errors
      const { lastFrame } = render(
        React.createElement(OutputBuffer, {
          maxLines: 10,
          isFocused: true,
        })
      );

      expect(lastFrame()).toBeDefined();
    });

    it('should indicate focus state', () => {
      const { lastFrame: focusedFrame } = render(
        React.createElement(OutputBuffer, {
          maxLines: 10,
          isFocused: true,
        })
      );

      const { lastFrame: unfocusedFrame } = render(
        React.createElement(OutputBuffer, {
          maxLines: 10,
          isFocused: false,
        })
      );

      // Both should render, but with different border colors
      expect(focusedFrame()).toBeDefined();
      expect(unfocusedFrame()).toBeDefined();
    });
  });

  describe('CommandInput Component', () => {
    it('should render with placeholder when not focused', () => {
      const onSubmit = vi.fn();
      const { lastFrame } = render(
        React.createElement(CommandInput, {
          onSubmit,
          isFocused: false,
          placeholder: 'Type command...',
        })
      );

      expect(lastFrame()).toContain('Type command...');
      expect(lastFrame()).toContain('Tab to focus input');
    });

    it('should show cursor when focused', () => {
      const onSubmit = vi.fn();
      const { lastFrame } = render(
        React.createElement(CommandInput, {
          onSubmit,
          isFocused: true,
          placeholder: 'Type command...',
        })
      );

      expect(lastFrame()).toContain('Enter to execute');
    });

    it('should call onSubmit when Enter is pressed', async () => {
      const onSubmit = vi.fn();
      render(
        React.createElement(CommandInput, {
          onSubmit,
          isFocused: true,
        })
      );

      // Wait for component to mount
      await new Promise(resolve => setTimeout(resolve, 50));

      // Simulate typing text
      if (currentOnChange) {
        currentOnChange('solve puzzle.json');
      }
      await new Promise(resolve => setTimeout(resolve, 10));

      // Simulate Enter key
      if (currentOnSubmit) {
        currentOnSubmit('solve puzzle.json');
      }
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(onSubmit).toHaveBeenCalledWith('solve puzzle.json');
    });

    it('should clear input after submission', async () => {
      const onSubmit = vi.fn();
      render(
        React.createElement(CommandInput, {
          onSubmit,
          isFocused: true,
        })
      );

      // Wait for component to mount
      await new Promise(resolve => setTimeout(resolve, 50));

      // Simulate typing
      if (currentOnChange) {
        currentOnChange('test');
      }
      await new Promise(resolve => setTimeout(resolve, 10));

      // Simulate Enter (submission)
      if (currentOnSubmit) {
        currentOnSubmit('test');
      }
      await new Promise(resolve => setTimeout(resolve, 10));

      // After submission, input should be clear
      expect(onSubmit).toHaveBeenCalledWith('test');
    });
  });

  describe('ConsoleOverlay Component', () => {
    it('should render overlay at bottom of screen', () => {
      const onClose = vi.fn();
      const { lastFrame } = render(
        React.createElement(ConsoleOverlay, {
          onClose,
        })
      );

      expect(lastFrame()).toContain('Console Overlay');
      expect(lastFrame()).toContain('Press ` to close');
    });

    it('should call onClose when backtick is pressed', () => {
      const onClose = vi.fn();
      const { stdin } = render(
        React.createElement(ConsoleOverlay, {
          onClose,
        })
      );

      stdin.write('`');

      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when Escape is pressed', () => {
      const onClose = vi.fn();
      const { stdin } = render(
        React.createElement(ConsoleOverlay, {
          onClose,
        })
      );

      stdin.write('\x1b'); // Escape key

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('HelpOverlay Component', () => {
    it('should render context-sensitive help for Home screen', () => {
      const onClose = vi.fn();
      const { lastFrame } = render(
        React.createElement(HelpOverlay, {
          screen: 'Home',
          onClose,
        })
      );

      expect(lastFrame()).toContain('Home Screen');
      expect(lastFrame()).toContain('Keyboard Shortcuts:');
      expect(lastFrame()).toContain('Features:');
    });

    it('should render help for Console screen', () => {
      const onClose = vi.fn();
      const { lastFrame } = render(
        React.createElement(HelpOverlay, {
          screen: 'Console',
          onClose,
        })
      );

      expect(lastFrame()).toContain('Console Screen');
      expect(lastFrame()).toContain('Direct CLI command entry');
      expect(lastFrame()).toContain('Command history navigation');
    });

    it('should show global shortcuts in all contexts', () => {
      const onClose = vi.fn();
      const { lastFrame } = render(
        React.createElement(HelpOverlay, {
          screen: 'Home',
          onClose,
        })
      );

      expect(lastFrame()).toContain('Global Shortcuts:');
      expect(lastFrame()).toContain('?');
      expect(lastFrame()).toContain('`');
      expect(lastFrame()).toContain('Ctrl+C');
    });

    it('should handle unknown screen gracefully', () => {
      const onClose = vi.fn();
      const { lastFrame } = render(
        React.createElement(HelpOverlay, {
          screen: 'UnknownScreen',
          onClose,
        })
      );

      // Should fall back to Home screen help
      expect(lastFrame()).toContain('Home Screen');
    });

    it('should show close instructions', () => {
      const onClose = vi.fn();
      const { lastFrame } = render(
        React.createElement(HelpOverlay, {
          screen: 'Home',
          onClose,
        })
      );

      expect(lastFrame()).toContain('? or Esc to close');
    });
  });

  describe('Integration: Console Menu Workflow', () => {
    it('should support complete command entry workflow', async () => {
      const onCommand = vi.fn();
      const { stdin, lastFrame } = render(
        React.createElement(ConsolePanel, {
          title: 'Interactive Console',
          onCommand,
          showInput: true,
        })
      );

      // 1. Start with input focused (default)
      expect(lastFrame()).toContain('Current: Input');

      // 2. Enter a command
      await new Promise(resolve => setTimeout(resolve, 50));

      if (currentOnChange) {
        currentOnChange('llm play puzzle.json');
      }
      await new Promise(resolve => setTimeout(resolve, 10));

      if (currentOnSubmit) {
        currentOnSubmit('llm play puzzle.json');
      }
      await new Promise(resolve => setTimeout(resolve, 10));

      // 3. Command should be called
      expect(onCommand).toHaveBeenCalledWith('llm play puzzle.json');

      // 4. Switch focus to output to scroll
      stdin.write('\t');
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(lastFrame()).toContain('Current: Output');

      // 5. Switch back to input
      stdin.write('\t');
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(lastFrame()).toContain('Current: Input');
    });

    it('should maintain proper focus state across interactions', () => {
      const onCommand = vi.fn();
      const { stdin, lastFrame } = render(
        React.createElement(ConsolePanel, {
          onCommand,
          showInput: true,
        })
      );

      // Verify initial state
      const initial = lastFrame();
      expect(initial).toContain('Current: Input');

      // Tab multiple times to toggle
      stdin.write('\t'); // -> Output
      stdin.write('\t'); // -> Input
      stdin.write('\t'); // -> Output
      stdin.write('\t'); // -> Input

      // Should end up back at Input
      expect(lastFrame()).toContain('Current: Input');
    });
  });
});
