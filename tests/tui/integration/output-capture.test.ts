/**
 * OutputCapture Service Integration Tests
 *
 * Tests the stdout/stderr capture service that routes console output to TUI.
 * Verifies:
 * - Output interception and buffering
 * - Listener subscription/unsubscription
 * - Escape code filtering
 * - Buffer management
 * - Multi-listener support
 *
 * Specification: docs/specs/14-console-menu-interface-spec.md Section 6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OutputCapture } from '../../../src/tui-ink/services/OutputCapture.js';

describe('OutputCapture Service Integration Tests (Spec 14 Section 6)', () => {
  beforeEach(() => {
    // Clear buffer and listeners before each test
    OutputCapture.stop();
    OutputCapture['buffer'] = [];
    OutputCapture['listeners'].clear();
  });

  afterEach(() => {
    // Ensure service is stopped after each test
    OutputCapture.stop();
  });

  describe('Service Lifecycle', () => {
    it('should start capturing output', () => {
      OutputCapture.start();

      // Verify that the service has patched stdout
      // (implementation detail - would need to verify behavior)
      expect(OutputCapture['isActive']).toBe(true);
    });

    it('should stop capturing output', () => {
      OutputCapture.start();
      OutputCapture.stop();

      // Verify restoration
      expect(OutputCapture['isActive']).toBe(false);
    });

    it('should not fail when stopped multiple times', () => {
      OutputCapture.start();
      OutputCapture.stop();
      OutputCapture.stop(); // Should not throw

      expect(OutputCapture['isActive']).toBe(false);
    });

    it('should not fail when started multiple times', () => {
      OutputCapture.start();
      OutputCapture.start(); // Should not create duplicate patches

      expect(OutputCapture['isActive']).toBe(true);

      OutputCapture.stop();
    });
  });

  describe('Output Buffering', () => {
    it('should capture console.log output', () => {
      OutputCapture.start();

      console.log('Test output line');

      const buffer = OutputCapture.getBuffer();
      expect(buffer.some(line => line.includes('Test output line'))).toBe(true);

      OutputCapture.stop();
    });

    it('should capture multiple lines', () => {
      OutputCapture.start();

      console.log('Line 1');
      console.log('Line 2');
      console.log('Line 3');

      const buffer = OutputCapture.getBuffer();
      expect(buffer.length).toBeGreaterThanOrEqual(3);
      expect(buffer.some(line => line.includes('Line 1'))).toBe(true);
      expect(buffer.some(line => line.includes('Line 2'))).toBe(true);
      expect(buffer.some(line => line.includes('Line 3'))).toBe(true);

      OutputCapture.stop();
    });

    it('should filter Ink escape codes', () => {
      OutputCapture.start();

      // Simulate Ink cursor positioning codes
      process.stdout.write('\x1b[2J'); // Clear screen
      process.stdout.write('\x1b[H'); // Home cursor
      console.log('Actual output');

      const buffer = OutputCapture.getBuffer();

      // Escape codes should be filtered out
      expect(buffer.some(line => line.includes('\x1b[2J'))).toBe(false);
      expect(buffer.some(line => line.includes('\x1b[H'))).toBe(false);

      // Actual output should be captured
      expect(buffer.some(line => line.includes('Actual output'))).toBe(true);

      OutputCapture.stop();
    });

    it('should maintain buffer across multiple captures', () => {
      OutputCapture.start();

      console.log('First');
      const buffer1 = OutputCapture.getBuffer();

      console.log('Second');
      const buffer2 = OutputCapture.getBuffer();

      // Second buffer should include both lines
      expect(buffer2.length).toBeGreaterThan(buffer1.length);
      expect(buffer2.some(line => line.includes('First'))).toBe(true);
      expect(buffer2.some(line => line.includes('Second'))).toBe(true);

      OutputCapture.stop();
    });

    it('should respect max buffer size', () => {
      const maxLines = 100;
      OutputCapture.start(maxLines);

      // Add more than max lines
      for (let i = 0; i < maxLines + 50; i++) {
        console.log(`Line ${i}`);
      }

      const buffer = OutputCapture.getBuffer();

      // Buffer should not exceed max size
      expect(buffer.length).toBeLessThanOrEqual(maxLines);

      // Oldest lines should be removed (FIFO)
      expect(buffer.some(line => line.includes('Line 0'))).toBe(false);
      expect(buffer.some(line => line.includes(`Line ${maxLines + 40}`))).toBe(true);

      OutputCapture.stop();
    });
  });

  describe('Listener Subscription', () => {
    it('should notify listeners of new output', () => {
      const listener = vi.fn();
      const unsubscribe = OutputCapture.subscribe(listener);

      OutputCapture.start();
      console.log('Test line');

      expect(listener).toHaveBeenCalledWith('Test line');

      unsubscribe();
      OutputCapture.stop();
    });

    it('should support multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsub1 = OutputCapture.subscribe(listener1);
      const unsub2 = OutputCapture.subscribe(listener2);

      OutputCapture.start();
      console.log('Broadcast message');

      expect(listener1).toHaveBeenCalledWith('Broadcast message');
      expect(listener2).toHaveBeenCalledWith('Broadcast message');

      unsub1();
      unsub2();
      OutputCapture.stop();
    });

    it('should remove listener when unsubscribed', () => {
      const listener = vi.fn();
      const unsubscribe = OutputCapture.subscribe(listener);

      OutputCapture.start();
      console.log('Before unsubscribe');

      expect(listener).toHaveBeenCalledWith('Before unsubscribe');

      listener.mockClear();
      unsubscribe();

      console.log('After unsubscribe');

      // Listener should not be called after unsubscription
      expect(listener).not.toHaveBeenCalled();

      OutputCapture.stop();
    });

    it('should handle listener errors gracefully', () => {
      const badListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = vi.fn();

      OutputCapture.subscribe(badListener);
      OutputCapture.subscribe(goodListener);

      OutputCapture.start();

      // Should not throw even if listener fails
      expect(() => {
        console.log('Test');
      }).not.toThrow();

      // Good listener should still be called
      expect(goodListener).toHaveBeenCalled();

      OutputCapture.stop();
    });
  });

  describe('Integration: Real-world Scenarios', () => {
    it('should capture CLI command output', () => {
      OutputCapture.start();

      // Simulate CLI command output
      console.log('🤖 Starting LLM Sudoku Player...');
      console.log('Using profile: lmstudio-local');
      console.log('✓ Connected to LM Studio');
      console.log('\n📊 Session Results:');
      console.log('  Solved: ✓ YES');

      const buffer = OutputCapture.getBuffer();

      expect(buffer.some(line => line.includes('Starting LLM Sudoku Player'))).toBe(true);
      expect(buffer.some(line => line.includes('Using profile'))).toBe(true);
      expect(buffer.some(line => line.includes('Connected to LM Studio'))).toBe(true);
      expect(buffer.some(line => line.includes('Session Results'))).toBe(true);
      expect(buffer.some(line => line.includes('Solved: ✓ YES'))).toBe(true);

      OutputCapture.stop();
    });

    it('should support real-time streaming to TUI', () => {
      const receivedLines: string[] = [];

      const listener = (line: string) => {
        receivedLines.push(line);
      };

      const unsubscribe = OutputCapture.subscribe(listener);
      OutputCapture.start();

      // Simulate streaming output
      console.log('Move 1: Row 0, Col 3 = 5');
      console.log('Move 2: Row 1, Col 7 = 2');
      console.log('Move 3: Row 4, Col 2 = 8');

      // Listener should receive all lines in real-time
      expect(receivedLines.length).toBeGreaterThanOrEqual(3);
      expect(receivedLines.some(line => line.includes('Move 1'))).toBe(true);
      expect(receivedLines.some(line => line.includes('Move 2'))).toBe(true);
      expect(receivedLines.some(line => line.includes('Move 3'))).toBe(true);

      unsubscribe();
      OutputCapture.stop();
    });

    it('should handle concurrent output from multiple sources', () => {
      const lines: string[] = [];
      const listener = (line: string) => lines.push(line);

      OutputCapture.subscribe(listener);
      OutputCapture.start();

      // Simulate concurrent output
      console.log('Source A: Line 1');
      process.stdout.write('Source B: Line 1\n');
      console.log('Source A: Line 2');
      process.stdout.write('Source B: Line 2\n');

      const buffer = OutputCapture.getBuffer();

      // All lines should be captured
      expect(buffer.some(line => line.includes('Source A: Line 1'))).toBe(true);
      expect(buffer.some(line => line.includes('Source B: Line 1'))).toBe(true);
      expect(buffer.some(line => line.includes('Source A: Line 2'))).toBe(true);
      expect(buffer.some(line => line.includes('Source B: Line 2'))).toBe(true);

      OutputCapture.stop();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty output', () => {
      OutputCapture.start();

      const buffer = OutputCapture.getBuffer();
      expect(buffer).toEqual([]);

      OutputCapture.stop();
    });

    it('should handle very long lines', () => {
      OutputCapture.start();

      const longLine = 'A'.repeat(10000);
      console.log(longLine);

      const buffer = OutputCapture.getBuffer();
      expect(buffer.some(line => line.includes('A'.repeat(100)))).toBe(true);

      OutputCapture.stop();
    });

    it('should handle special characters', () => {
      OutputCapture.start();

      console.log('Special: \n\t\\/"\'');
      console.log('Unicode: 你好世界 🎮');

      const buffer = OutputCapture.getBuffer();
      expect(buffer.some(line => line.includes('Special:'))).toBe(true);
      expect(buffer.some(line => line.includes('Unicode:'))).toBe(true);

      OutputCapture.stop();
    });

    it('should clear buffer when requested', () => {
      OutputCapture.start();

      console.log('Line 1');
      console.log('Line 2');

      expect(OutputCapture.getBuffer().length).toBeGreaterThan(0);

      OutputCapture.clearBuffer();

      expect(OutputCapture.getBuffer()).toEqual([]);

      OutputCapture.stop();
    });
  });
});
