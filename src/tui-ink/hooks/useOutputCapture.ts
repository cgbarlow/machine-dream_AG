/**
 * useOutputCapture Hook
 *
 * React hook wrapper for OutputCapture service.
 * Manages subscription lifecycle and component-level line state.
 *
 * Spec: 14-console-menu-interface-spec.md (Section 5.2)
 */

import { useState, useEffect } from 'react';
import { OutputCapture } from '../services/OutputCapture.js';

/**
 * Hook to subscribe to captured output
 * @param maxLines Maximum number of lines to keep in state (default: 100)
 * @returns Array of output lines
 */
export const useOutputCapture = (maxLines: number = 100): string[] => {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    // Subscribe to OutputCapture
    const unsubscribe = OutputCapture.subscribe((line) => {
      setLines((prev) => [...prev.slice(-(maxLines - 1)), line]);
    });

    // Load initial buffer
    const initialBuffer = OutputCapture.getBuffer();
    setLines(initialBuffer.slice(-maxLines));

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [maxLines]);

  return lines;
};
