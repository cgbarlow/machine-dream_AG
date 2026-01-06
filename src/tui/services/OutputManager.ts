/**
 * Output Manager
 *
 * Manages JSON event stream for TUI testability.
 * All TUI actions are emitted as JSON events that can be captured for testing.
 */

import { appendFileSync } from 'fs';
import { TUIOutputEvent } from '../types';

export class OutputManager {
  private events: TUIOutputEvent[] = [];
  private outputPath?: string;
  private enabled: boolean;

  constructor(config?: { debugOutput?: string; enabled?: boolean }) {
    this.outputPath = config?.debugOutput || process.env.TUI_DEBUG_OUTPUT;
    this.enabled = config?.enabled ?? true;

    // Disable if output is /dev/null
    if (this.outputPath === '/dev/null') {
      this.enabled = false;
    }
  }

  emit(event: Omit<TUIOutputEvent, 'timestamp'>): void {
    if (!this.enabled) {
      return;
    }

    const fullEvent: TUIOutputEvent = {
      ...event,
      timestamp: Date.now()
    };

    // Store in memory
    this.events.push(fullEvent);

    // Write to file if configured
    if (this.outputPath && this.outputPath !== '/dev/null') {
      try {
        const jsonLine = JSON.stringify(fullEvent) + '\n';
        appendFileSync(this.outputPath, jsonLine, 'utf-8');
      } catch (error) {
        // Silently fail - don't break TUI if logging fails
        console.error('Failed to write TUI event:', error);
      }
    }

    // Optionally emit to stdout in CI mode for debugging
    if (process.env.CI && process.env.TUI_DEBUG_STDOUT === 'true') {
      console.log('[TUI_EVENT]', JSON.stringify(fullEvent));
    }
  }

  getEvents(filter?: Partial<TUIOutputEvent>): TUIOutputEvent[] {
    if (!filter) {
      return [...this.events];
    }

    return this.events.filter(event => {
      return Object.entries(filter).every(([key, value]) => {
        return (event as any)[key] === value;
      });
    });
  }

  getLastEvent(type?: string): TUIOutputEvent | undefined {
    if (!type) {
      return this.events[this.events.length - 1];
    }

    for (let i = this.events.length - 1; i >= 0; i--) {
      if (this.events[i].eventType === type) {
        return this.events[i];
      }
    }

    return undefined;
  }

  clearEvents(): void {
    this.events = [];
  }

  // For testing: get event count
  getEventCount(type?: string): number {
    if (!type) {
      return this.events.length;
    }
    return this.events.filter(e => e.eventType === type).length;
  }

  // Enable/disable event collection
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
