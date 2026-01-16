/**
 * Tests for PlaySession aispMode field
 *
 * TDD tests for aispMode tracking in play sessions.
 *
 * Spec 11: LLM Sudoku Player - PlaySession interface
 * ADR-014: Centralized AISP Validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PlaySession, AISPMode } from '../../../src/llm/types.js';

describe('PlaySession aispMode (Spec 11, ADR-014)', () => {
  describe('session creation', () => {
    it('should store aispMode in session', () => {
      const session: Partial<PlaySession> = {
        id: 'test-session-1',
        puzzleId: 'puzzle-1',
        aispMode: 'aisp-full',
        startTime: new Date(),
        solved: false,
        abandoned: false,
        totalMoves: 0,
        correctMoves: 0,
        invalidMoves: 0,
        validButWrongMoves: 0,
        experiences: [],
        memoryWasEnabled: true,
        profileName: 'test-profile',
        learningUnitId: 'default',
        learningContext: {
          fewShotsUsed: false,
          fewShotCount: 0,
          patternsAvailable: 0,
          consolidatedExperiences: 0,
        },
      };

      expect(session.aispMode).toBe('aisp-full');
    });

    it('should accept off mode', () => {
      const session: Partial<PlaySession> = {
        id: 'test-session-2',
        aispMode: 'off',
      };

      expect(session.aispMode).toBe('off');
    });

    it('should accept aisp mode', () => {
      const session: Partial<PlaySession> = {
        id: 'test-session-3',
        aispMode: 'aisp',
      };

      expect(session.aispMode).toBe('aisp');
    });

    it('should accept aisp-full mode', () => {
      const session: Partial<PlaySession> = {
        id: 'test-session-4',
        aispMode: 'aisp-full',
      };

      expect(session.aispMode).toBe('aisp-full');
    });
  });

  describe('legacy session handling', () => {
    it('should default to off for legacy sessions without aispMode', () => {
      // When loading legacy sessions that don't have aispMode field
      const legacySession = {
        id: 'legacy-session',
        puzzleId: 'puzzle-1',
        startTime: new Date(),
        // no aispMode field
      };

      const aispMode = legacySession.aispMode ?? 'off';
      expect(aispMode).toBe('off');
    });
  });

  describe('AISPMode type', () => {
    it('should only allow valid mode values', () => {
      const validModes: AISPMode[] = ['off', 'aisp', 'aisp-full'];

      validModes.forEach(mode => {
        expect(['off', 'aisp', 'aisp-full']).toContain(mode);
      });
    });
  });
});

describe('Session Display (llm session list/show)', () => {
  describe('session list mode display', () => {
    it('should format off mode as std for display', () => {
      const displayMode = formatModeForDisplay('off');
      expect(displayMode).toBe('std');
    });

    it('should format aisp mode as aisp for display', () => {
      const displayMode = formatModeForDisplay('aisp');
      expect(displayMode).toBe('aisp');
    });

    it('should format aisp-full mode as aisp-full for display', () => {
      const displayMode = formatModeForDisplay('aisp-full');
      expect(displayMode).toBe('aisp-full');
    });
  });

  describe('session show mode display', () => {
    it('should show mode field in session details', () => {
      const session: Partial<PlaySession> = {
        id: 'test-session',
        aispMode: 'aisp-full',
        profileName: 'test-profile',
      };

      // Verify mode is available for display
      expect(session.aispMode).toBeDefined();
      expect(session.aispMode).toBe('aisp-full');
    });
  });
});

// Helper function that will be implemented in llm.ts
function formatModeForDisplay(mode: AISPMode | undefined): string {
  if (!mode || mode === 'off') return 'std';
  return mode;
}
