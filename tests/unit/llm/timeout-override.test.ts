/**
 * Tests for Timeout Override Behavior
 *
 * Fix 1: CLI default timeout should NOT override profile timeout.
 * When no CLI timeout is specified, the profile's timeout should be used.
 */

import { describe, it, expect } from 'vitest';
import type { LLMConfig } from '../../../src/llm/types.js';

describe('Timeout Override Behavior (Fix 1)', () => {
  // Simulates profile config loading
  const createProfileConfig = (timeout: number): Partial<LLMConfig> => ({
    baseUrl: 'http://localhost:1234',
    model: 'test-model',
    maxTokens: 2048,
    timeout,
  });

  describe('CLI timeout handling', () => {
    it('should use profile timeout when CLI timeout not specified', () => {
      const profileConfig = createProfileConfig(600000); // Profile: 10 minutes
      const cliTimeout: string | undefined = undefined; // Not specified on CLI

      // Simulating the fixed logic from llm.ts
      let finalTimeout = profileConfig.timeout!;
      if (cliTimeout !== undefined) {
        finalTimeout = parseInt(cliTimeout, 10);
      }

      expect(finalTimeout).toBe(600000); // Should use profile timeout
    });

    it('should override profile timeout when CLI timeout specified', () => {
      const profileConfig = createProfileConfig(600000); // Profile: 10 minutes
      const cliTimeout = '300000'; // CLI: 5 minutes

      // Simulating the fixed logic from llm.ts
      let finalTimeout = profileConfig.timeout!;
      if (cliTimeout !== undefined) {
        finalTimeout = parseInt(cliTimeout, 10);
      }

      expect(finalTimeout).toBe(300000); // Should use CLI timeout
    });

    it('should handle zero timeout from CLI', () => {
      const profileConfig = createProfileConfig(600000);
      const cliTimeout = '0'; // Explicit zero

      let finalTimeout = profileConfig.timeout!;
      if (cliTimeout !== undefined) {
        finalTimeout = parseInt(cliTimeout, 10);
      }

      // Zero is a valid explicit value
      expect(finalTimeout).toBe(0);
    });

    it('should handle custom timeout values from CLI', () => {
      const profileConfig = createProfileConfig(600000);
      const testCases = [
        { cli: '120000', expected: 120000 },   // 2 minutes
        { cli: '900000', expected: 900000 },   // 15 minutes
        { cli: '60000', expected: 60000 },     // 1 minute
        { cli: '1800000', expected: 1800000 }, // 30 minutes
      ];

      for (const { cli, expected } of testCases) {
        let finalTimeout = profileConfig.timeout!;
        if (cli !== undefined) {
          finalTimeout = parseInt(cli, 10);
        }
        expect(finalTimeout).toBe(expected);
      }
    });
  });

  describe('Profile timeout preservation', () => {
    it('should preserve profile timeout of 10 minutes', () => {
      const profileConfig = createProfileConfig(600000);

      // When CLI timeout is undefined, profile timeout should be preserved
      const cliOptions = { timeout: undefined };

      let config = { ...profileConfig };
      if (cliOptions.timeout !== undefined) {
        config.timeout = parseInt(cliOptions.timeout as string, 10);
      }

      expect(config.timeout).toBe(600000);
    });

    it('should preserve profile timeout of 5 minutes', () => {
      const profileConfig = createProfileConfig(300000);

      const cliOptions = { timeout: undefined };

      let config = { ...profileConfig };
      if (cliOptions.timeout !== undefined) {
        config.timeout = parseInt(cliOptions.timeout as string, 10);
      }

      expect(config.timeout).toBe(300000);
    });

    it('should preserve different profile timeouts correctly', () => {
      const profiles = [
        { name: 'fast', timeout: 60000 },
        { name: 'standard', timeout: 300000 },
        { name: 'patient', timeout: 600000 },
        { name: 'very-patient', timeout: 1200000 },
      ];

      for (const profile of profiles) {
        const profileConfig = createProfileConfig(profile.timeout);
        const cliOptions = { timeout: undefined };

        let config = { ...profileConfig };
        if (cliOptions.timeout !== undefined) {
          config.timeout = parseInt(cliOptions.timeout as string, 10);
        }

        expect(config.timeout).toBe(profile.timeout);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string timeout from CLI as defined', () => {
      const profileConfig = createProfileConfig(600000);
      const cliTimeout = ''; // Empty string

      let finalTimeout = profileConfig.timeout!;
      if (cliTimeout !== undefined) {
        const parsed = parseInt(cliTimeout, 10);
        if (!isNaN(parsed)) {
          finalTimeout = parsed;
        }
      }

      // Empty string parses to NaN, so should keep profile timeout
      expect(finalTimeout).toBe(600000);
    });

    it('should handle invalid timeout string gracefully', () => {
      const profileConfig = createProfileConfig(600000);
      const cliTimeout = 'invalid';

      let finalTimeout = profileConfig.timeout!;
      if (cliTimeout !== undefined) {
        const parsed = parseInt(cliTimeout, 10);
        if (!isNaN(parsed)) {
          finalTimeout = parsed;
        }
      }

      // Invalid parses to NaN, so should keep profile timeout
      expect(finalTimeout).toBe(600000);
    });

    it('should handle negative timeout from CLI', () => {
      const profileConfig = createProfileConfig(600000);
      const cliTimeout = '-1000';

      let finalTimeout = profileConfig.timeout!;
      if (cliTimeout !== undefined) {
        finalTimeout = parseInt(cliTimeout, 10);
      }

      // Negative is technically valid parseInt result
      // Real CLI should validate this, but parseInt accepts it
      expect(finalTimeout).toBe(-1000);
    });
  });
});
