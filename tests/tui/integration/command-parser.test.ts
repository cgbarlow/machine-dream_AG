/**
 * CommandParser Service Integration Tests
 *
 * Tests command parsing and routing to CLIExecutor methods.
 * Verifies:
 * - Command parsing (command + args extraction)
 * - Routing to appropriate handler methods
 * - Argument validation and normalization
 * - Error handling for invalid commands
 * - Support for all documented CLI commands
 *
 * Specification: docs/specs/14-console-menu-interface-spec.md Section 4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommandParser } from '../../../src/tui-ink/services/CommandParser.js';
import { CLIExecutor } from '../../../src/tui-ink/services/CLIExecutor.js';
// Import instance methods to extend CLIExecutor prototype
import '../../../src/tui-ink/services/CLIExecutor-instance-methods.js';

describe('CommandParser Service Integration Tests (Spec 14 Section 4)', () => {
  let executor: CLIExecutor;
  let parser: CommandParser;

  beforeEach(() => {
    executor = new CLIExecutor();
    parser = new CommandParser(executor);
  });

  describe('Command Parsing', () => {
    it('should parse command without arguments', () => {
      const result = parser['parseCommand']('help');

      expect(result.command).toBe('help');
      expect(result.args).toEqual([]);
    });

    it('should parse command with single argument', () => {
      const result = parser['parseCommand']('solve puzzle.json');

      expect(result.command).toBe('solve');
      expect(result.args).toEqual(['puzzle.json']);
    });

    it('should parse command with multiple arguments', () => {
      const result = parser['parseCommand']('llm play puzzle.json --profile lmstudio');

      expect(result.command).toBe('llm');
      expect(result.args).toEqual(['play', 'puzzle.json', '--profile', 'lmstudio']);
    });

    it('should handle extra whitespace', () => {
      const result = parser['parseCommand']('  solve    puzzle.json  ');

      expect(result.command).toBe('solve');
      expect(result.args).toEqual(['puzzle.json']);
    });

    it('should handle quoted arguments', () => {
      const result = parser['parseCommand']('memory store "my key" "my value"');

      expect(result.command).toBe('memory');
      expect(result.args).toContain('my key');
      expect(result.args).toContain('my value');
    });

    it('should handle empty command', () => {
      const result = parser['parseCommand']('');

      expect(result.command).toBe('');
      expect(result.args).toEqual([]);
    });

    it('should preserve case in command and arguments', () => {
      const result = parser['parseCommand']('LLM Play PUZZLE.JSON');

      expect(result.command).toBe('llm'); // Commands normalized to lowercase
      expect(result.args).toContain('Play');
      expect(result.args).toContain('PUZZLE.JSON');
    });
  });

  describe('Command Routing', () => {
    it('should route solve command to executeSolve', async () => {
      const spy = vi.spyOn(executor, 'executeSolve');

      await parser.execute('solve puzzle.json');

      expect(spy).toHaveBeenCalledWith(['puzzle.json']);
    });

    it('should route llm command to executeLLM', async () => {
      const spy = vi.spyOn(executor, 'executeLLM');

      await parser.execute('llm play puzzle.json');

      expect(spy).toHaveBeenCalledWith(['play', 'puzzle.json']);
    });

    it('should route memory command to executeMemory', async () => {
      const spy = vi.spyOn(executor, 'executeMemory');

      await parser.execute('memory list');

      expect(spy).toHaveBeenCalledWith(['list']);
    });

    it('should route dream command to executeDream', async () => {
      const spy = vi.spyOn(executor, 'executeDream');

      await parser.execute('dream');

      expect(spy).toHaveBeenCalledWith([]);
    });

    it('should route benchmark command to executeBenchmark', async () => {
      const spy = vi.spyOn(executor, 'executeBenchmark');

      await parser.execute('benchmark');

      expect(spy).toHaveBeenCalledWith([]);
    });

    it('should route config command to executeConfig', async () => {
      const spy = vi.spyOn(executor, 'executeConfig');

      await parser.execute('config show');

      expect(spy).toHaveBeenCalledWith(['show']);
    });

    it('should route help command to executeHelp', async () => {
      const spy = vi.spyOn(executor, 'executeHelp');

      await parser.execute('help');

      expect(spy).toHaveBeenCalledWith([]);
    });

    it('should route clear command to executeClear', async () => {
      const spy = vi.spyOn(executor, 'executeClear');

      await parser.execute('clear');

      expect(spy).toHaveBeenCalledWith([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown commands gracefully', async () => {
      const result = await parser.execute('unknown-command arg1 arg2');

      // Should return error message instead of throwing
      expect(result).toContain('Unknown command');
      expect(result).toContain('unknown-command');
    });

    it('should handle executor errors', async () => {
      vi.spyOn(executor, 'executeSolve').mockRejectedValue(new Error('Test error'));

      const result = await parser.execute('solve puzzle.json');

      expect(result).toContain('Error');
      expect(result).toContain('Test error');
    });

    it('should handle empty commands', async () => {
      const result = await parser.execute('');

      // Empty command should be ignored or show help
      expect(result).toBeDefined();
    });

    it('should handle commands with invalid arguments', async () => {
      // Executor should validate arguments
      vi.spyOn(executor, 'executeSolve').mockRejectedValue(
        new Error('Invalid puzzle file')
      );

      const result = await parser.execute('solve nonexistent.json');

      expect(result).toContain('Invalid puzzle file');
    });
  });

  describe('Supported Commands (Spec 14 Section 4)', () => {
    it('should support solve command', async () => {
      const spy = vi.spyOn(executor, 'executeSolve');

      await parser.execute('solve puzzle.json');

      expect(spy).toHaveBeenCalled();
    });

    it('should support llm command with subcommands', async () => {
      const spy = vi.spyOn(executor, 'executeLLM');

      await parser.execute('llm play puzzle.json');
      expect(spy).toHaveBeenCalledWith(expect.arrayContaining(['play']));

      await parser.execute('llm stats');
      expect(spy).toHaveBeenCalledWith(['stats']);

      await parser.execute('llm dream');
      expect(spy).toHaveBeenCalledWith(['dream']);

      await parser.execute('llm benchmark');
      expect(spy).toHaveBeenCalledWith(['benchmark']);
    });

    it('should support memory command with subcommands', async () => {
      const spy = vi.spyOn(executor, 'executeMemory');

      await parser.execute('memory list');
      expect(spy).toHaveBeenCalledWith(['list']);

      await parser.execute('memory search pattern');
      expect(spy).toHaveBeenCalledWith(['search', 'pattern']);

      await parser.execute('memory store key value');
      expect(spy).toHaveBeenCalledWith(['store', 'key', 'value']);

      await parser.execute('memory retrieve key');
      expect(spy).toHaveBeenCalledWith(['retrieve', 'key']);
    });

    it('should support dream command', async () => {
      const spy = vi.spyOn(executor, 'executeDream');

      await parser.execute('dream');

      expect(spy).toHaveBeenCalled();
    });

    it('should support benchmark command', async () => {
      const spy = vi.spyOn(executor, 'executeBenchmark');

      await parser.execute('benchmark');

      expect(spy).toHaveBeenCalled();
    });

    it('should support config command', async () => {
      const spy = vi.spyOn(executor, 'executeConfig');

      await parser.execute('config show');
      expect(spy).toHaveBeenCalledWith(['show']);

      await parser.execute('config set key value');
      expect(spy).toHaveBeenCalledWith(['set', 'key', 'value']);
    });

    it('should support help command', async () => {
      const spy = vi.spyOn(executor, 'executeHelp');

      await parser.execute('help');
      expect(spy).toHaveBeenCalledWith([]);

      await parser.execute('help solve');
      expect(spy).toHaveBeenCalledWith(['solve']);
    });

    it('should support clear command', async () => {
      const spy = vi.spyOn(executor, 'executeClear');

      await parser.execute('clear');

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Integration: Command Execution Flow', () => {
    it('should execute complete solve workflow', async () => {
      const executeSolve = vi.spyOn(executor, 'executeSolve');
      executeSolve.mockResolvedValue('Solve completed successfully');

      const result = await parser.execute('solve puzzle.json --memory');

      expect(executeSolve).toHaveBeenCalledWith(['puzzle.json', '--memory']);
      expect(result).toContain('Solve completed successfully');
    });

    it('should execute complete LLM play workflow', async () => {
      const executeLLM = vi.spyOn(executor, 'executeLLM');
      executeLLM.mockResolvedValue('LLM play completed');

      const result = await parser.execute('llm play puzzle.json --profile lmstudio --max-moves 100');

      expect(executeLLM).toHaveBeenCalledWith([
        'play',
        'puzzle.json',
        '--profile',
        'lmstudio',
        '--max-moves',
        '100',
      ]);
      expect(result).toContain('LLM play completed');
    });

    it('should execute memory operations', async () => {
      const executeMemory = vi.spyOn(executor, 'executeMemory');
      executeMemory.mockResolvedValue('Memory operation completed');

      // Store
      await parser.execute('memory store mykey myvalue');
      expect(executeMemory).toHaveBeenCalledWith(['store', 'mykey', 'myvalue']);

      // Retrieve
      await parser.execute('memory retrieve mykey');
      expect(executeMemory).toHaveBeenCalledWith(['retrieve', 'mykey']);

      // List
      await parser.execute('memory list');
      expect(executeMemory).toHaveBeenCalledWith(['list']);
    });

    it('should handle sequential commands', async () => {
      const executeSolve = vi.spyOn(executor, 'executeSolve');
      const executeLLM = vi.spyOn(executor, 'executeLLM');
      executeSolve.mockResolvedValue('Solve done');
      executeLLM.mockResolvedValue('LLM done');

      await parser.execute('solve puzzle1.json');
      await parser.execute('llm play puzzle2.json');
      await parser.execute('solve puzzle3.json');

      expect(executeSolve).toHaveBeenCalledTimes(2);
      expect(executeLLM).toHaveBeenCalledTimes(1);
    });
  });

  describe('Command Aliases and Shortcuts', () => {
    it('should support command shortcuts if implemented', async () => {
      const spy = vi.spyOn(executor, 'executeHelp');

      // Common shortcuts
      await parser.execute('?');
      expect(spy).toHaveBeenCalled();

      await parser.execute('h');
      expect(spy).toHaveBeenCalled();
    });

    it('should handle case-insensitive commands', async () => {
      const spy = vi.spyOn(executor, 'executeSolve');

      await parser.execute('SOLVE puzzle.json');
      expect(spy).toHaveBeenCalled();

      await parser.execute('Solve puzzle.json');
      expect(spy).toHaveBeenCalled();

      await parser.execute('solve puzzle.json');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle commands with special characters', async () => {
      const spy = vi.spyOn(executor, 'executeMemory');

      await parser.execute('memory store "key-with-dash" "value with spaces"');

      expect(spy).toHaveBeenCalled();
    });

    it('should handle very long commands', async () => {
      const longArgs = 'a'.repeat(1000);
      const spy = vi.spyOn(executor, 'executeSolve');

      await parser.execute(`solve ${longArgs}`);

      expect(spy).toHaveBeenCalledWith([longArgs]);
    });

    it('should handle commands with only whitespace', async () => {
      const result = await parser.execute('   \n\t   ');

      // Should handle gracefully
      expect(result).toBeDefined();
    });

    it('should trim and normalize input', async () => {
      const spy = vi.spyOn(executor, 'executeSolve');

      await parser.execute('  \n  solve   puzzle.json  \t  ');

      expect(spy).toHaveBeenCalledWith(['puzzle.json']);
    });
  });
});
