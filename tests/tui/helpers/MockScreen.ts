/**
 * Mock Blessed Screen
 *
 * Provides a mock blessed screen for unit testing TUI components
 * without requiring actual terminal.
 */

import { TUIOutputEvent } from '../../../src/tui/types';

export class MockScreen {
  private events: TUIOutputEvent[] = [];
  private rendered = false;

  emit(event: TUIOutputEvent): void {
    this.events.push(event);
  }

  getEvents(): TUIOutputEvent[] {
    return [...this.events];
  }

  clearEvents(): void {
    this.events = [];
  }

  render(): void {
    // No-op in test mode - just track that render was called
    this.rendered = true;
    this.emit({
      timestamp: Date.now(),
      eventType: 'render',
      component: 'MockScreen',
      data: { rendered: true }
    });
  }

  wasRendered(): boolean {
    return this.rendered;
  }

  // Mock blessed screen methods
  key(keys: string[], callback: () => void): void {
    // TODO: Store key handlers for testing
  }

  on(event: string, callback: (...args: any[]) => void): void {
    // TODO: Store event handlers for testing
  }

  destroy(): void {
    this.rendered = false;
    this.events = [];
  }
}
