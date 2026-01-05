/**
 * Custom TUI Assertions
 *
 * Specialized assertion helpers for TUI testing.
 */

import { expect } from 'vitest';
import { TUIOutputEvent } from '../../../src/tui/types';

/**
 * Assert that an event was emitted with specific properties
 */
export function assertEventEmitted(
  events: TUIOutputEvent[],
  type: string,
  dataMatch?: Partial<unknown>
): void {
  const matchingEvents = events.filter(e => e.eventType === type);

  if (matchingEvents.length === 0) {
    throw new Error(`Expected event of type "${type}" but none found. Available types: ${events.map(e => e.eventType).join(', ')}`);
  }

  if (dataMatch) {
    const fullyMatching = matchingEvents.find(event => {
      return Object.entries(dataMatch).every(([key, value]) => {
        return (event.data as any)[key] === value;
      });
    });

    if (!fullyMatching) {
      throw new Error(
        `Found ${matchingEvents.length} events of type "${type}" but none matched data criteria:\n` +
        JSON.stringify(dataMatch, null, 2)
      );
    }
  }
}

/**
 * Assert that events occurred in a specific order
 */
export function assertEventSequence(
  events: TUIOutputEvent[],
  expectedSequence: string[]
): void {
  const actualSequence = events.map(e => e.eventType);

  let sequenceIndex = 0;
  for (const eventType of actualSequence) {
    if (eventType === expectedSequence[sequenceIndex]) {
      sequenceIndex++;
      if (sequenceIndex === expectedSequence.length) {
        return; // Sequence complete
      }
    }
  }

  throw new Error(
    `Expected event sequence not found.\n` +
    `Expected: ${expectedSequence.join(' → ')}\n` +
    `Actual:   ${actualSequence.join(' → ')}`
  );
}

/**
 * Assert that a component rendered with specific content
 */
export function assertComponentRendered(
  events: TUIOutputEvent[],
  componentName: string,
  contentMatch?: Record<string, unknown>
): void {
  const renderEvents = events.filter(
    e => e.eventType === 'render' && e.component === componentName
  );

  if (renderEvents.length === 0) {
    throw new Error(
      `Expected component "${componentName}" to render but no render events found`
    );
  }

  if (contentMatch) {
    const lastRender = renderEvents[renderEvents.length - 1];
    Object.entries(contentMatch).forEach(([key, value]) => {
      expect(lastRender.data).toHaveProperty(key, value);
    });
  }
}
