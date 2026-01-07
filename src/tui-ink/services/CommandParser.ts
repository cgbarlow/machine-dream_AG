/**
 * CommandParser Service
 *
 * Parses user-entered commands and routes to CLIExecutor methods.
 * Supports command history and help text.
 *
 * Spec: 14-console-menu-interface-spec.md (Section 5.6)
 */

import { CLIExecutor, ProgressCallback } from './CLIExecutor.js';
import { OutputCapture } from './OutputCapture.js';

export interface ParsedCommand {
  command: string;
  subcommand?: string;
  args: string[];
  options: Record<string, string | boolean>;
}

export class CommandParser {
  /**
   * Parse command string into structured format
   */
  static parse(input: string): ParsedCommand {
    const trimmed = input.trim();
    if (!trimmed) {
      throw new Error('Empty command');
    }

    // Split by spaces while respecting quotes
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < trimmed.length; i++) {
      const char = trimmed[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          tokens.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      tokens.push(current);
    }

    // Extract command and subcommand
    const command = tokens[0];
    let subcommand: string | undefined;
    const args: string[] = [];
    const options: Record<string, string | boolean> = {};

    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.startsWith('--')) {
        // Option
        const optionPart = token.slice(2);
        if (optionPart.includes('=')) {
          const [key, value] = optionPart.split('=', 2);
          options[key] = value;
        } else {
          options[optionPart] = true;
        }
      } else if (!subcommand && this.isSubcommand(command, token)) {
        // Subcommand
        subcommand = token;
      } else {
        // Positional argument
        args.push(token);
      }
    }

    return { command, subcommand, args, options };
  }

  /**
   * Check if token is a valid subcommand for the command
   */
  private static isSubcommand(command: string, token: string): boolean {
    const subcommands: Record<string, string[]> = {
      llm: ['play', 'dream', 'stats'],
      memory: ['list', 'search', 'stats'],
      puzzle: ['generate'],
      config: ['show', 'set'],
      benchmark: ['run'],
    };

    return subcommands[command]?.includes(token) || false;
  }

  /**
   * Execute parsed command
   */
  static async execute(parsed: ParsedCommand, onProgress: ProgressCallback): Promise<void> {
    const { command, subcommand, args, options } = parsed;

    try {
      switch (command) {
        case 'solve':
          await this.executeSolve(args, options, onProgress);
          break;

        case 'llm':
          await this.executeLLM(subcommand, args, options, onProgress);
          break;

        case 'memory':
          await this.executeMemory(subcommand, args, options, onProgress);
          break;

        case 'puzzle':
          await this.executePuzzle(subcommand, args, options, onProgress);
          break;

        case 'benchmark':
          await this.executeBenchmark(args, options, onProgress);
          break;

        case 'config':
          await this.executeConfig(subcommand, args, options, onProgress);
          break;

        case 'help':
          this.executeHelp(args[0]);
          break;

        case 'clear':
          OutputCapture.clearBuffer();
          break;

        default:
          throw new Error(`Unknown command: ${command}. Type 'help' for available commands.`);
      }
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
      onProgress({ type: 'error', message: error.message });
    }
  }

  /**
   * Execute solve command
   */
  private static async executeSolve(
    args: string[],
    options: Record<string, string | boolean>,
    onProgress: ProgressCallback
  ): Promise<void> {
    if (args.length === 0) {
      throw new Error('Missing puzzle file. Usage: solve <file> [--memory] [--rl] [--reflexion]');
    }

    const puzzleFile = args[0];
    const params = {
      puzzleFile,
      memorySystem: (options['memory-system'] as string) || 'agentdb',
      enableRL: Boolean(options.rl),
      enableReflexion: Boolean(options.reflexion),
      maxIterations: parseInt((options['max-iterations'] as string) || '100', 10),
    };

    console.log(`Starting solve: ${puzzleFile}`);
    await CLIExecutor.executeSolve(params, onProgress);
  }

  /**
   * Execute LLM commands
   */
  private static async executeLLM(
    subcommand: string | undefined,
    args: string[],
    options: Record<string, string | boolean>,
    onProgress: ProgressCallback
  ): Promise<void> {
    if (!subcommand) {
      throw new Error('LLM subcommand required. Use: llm play|dream|stats');
    }

    switch (subcommand) {
      case 'play':
        if (args.length === 0) {
          throw new Error('Missing puzzle file. Usage: llm play <file> [--model=name] [--max-moves=200]');
        }

        await CLIExecutor.executeLLMPlay(
          args[0],
          {
            memoryEnabled: Boolean(options.memory),
            model: (options.model as string) || 'qwen3-30b',
            maxMoves: parseInt((options['max-moves'] as string) || '200', 10),
          },
          onProgress
        );
        break;

      case 'dream':
        await CLIExecutor.executeLLMDream({}, onProgress);
        break;

      case 'stats':
        const stats = await CLIExecutor.getLLMStats();
        console.log(JSON.stringify(stats, null, 2));
        break;

      default:
        throw new Error(`Unknown LLM subcommand: ${subcommand}`);
    }
  }

  /**
   * Execute memory commands
   */
  private static async executeMemory(
    subcommand: string | undefined,
    args: string[],
    options: Record<string, string | boolean>,
    onProgress: ProgressCallback
  ): Promise<void> {
    if (!subcommand) {
      throw new Error('Memory subcommand required. Use: memory list|search|stats');
    }

    switch (subcommand) {
      case 'list':
        const pattern = args[0] || '*';
        const entries = await CLIExecutor.memoryList({ pattern });
        console.log(`Found ${entries.length} entries:`);
        entries.forEach((entry: any) => console.log(`- ${entry.key}: ${entry.value}`));
        break;

      case 'search':
        if (args.length === 0) {
          throw new Error('Missing search query. Usage: memory search <query>');
        }
        const results = await CLIExecutor.memorySearch({ query: args[0] });
        console.log(`Found ${results.length} matches:`);
        results.forEach((result: any) => console.log(`- ${result.key}: ${result.value}`));
        break;

      case 'stats':
        const stats = await CLIExecutor.getMemoryStats();
        console.log(JSON.stringify(stats, null, 2));
        break;

      default:
        throw new Error(`Unknown memory subcommand: ${subcommand}`);
    }
  }

  /**
   * Execute puzzle commands
   */
  private static async executePuzzle(
    subcommand: string | undefined,
    args: string[],
    options: Record<string, string | boolean>,
    onProgress: ProgressCallback
  ): Promise<void> {
    if (subcommand === 'generate' || !subcommand) {
      await CLIExecutor.executePuzzleGenerate(
        {
          difficulty: (options.difficulty as string) || 'medium',
          seed: options.seed ? parseInt(options.seed as string, 10) : undefined,
        },
        onProgress
      );
    } else {
      throw new Error(`Unknown puzzle subcommand: ${subcommand}`);
    }
  }

  /**
   * Execute benchmark commands
   */
  private static async executeBenchmark(
    args: string[],
    options: Record<string, string | boolean>,
    onProgress: ProgressCallback
  ): Promise<void> {
    const suite = args[0] || 'all';
    await CLIExecutor.executeBenchmark({ suite }, onProgress);
  }

  /**
   * Execute config commands
   */
  private static async executeConfig(
    subcommand: string | undefined,
    args: string[],
    options: Record<string, string | boolean>,
    onProgress: ProgressCallback
  ): Promise<void> {
    if (!subcommand || subcommand === 'show') {
      const config = await CLIExecutor.getConfig();
      console.log(JSON.stringify(config, null, 2));
    } else if (subcommand === 'set') {
      if (args.length < 2) {
        throw new Error('Usage: config set <key> <value>');
      }
      await CLIExecutor.setConfig({ key: args[0], value: args[1] });
      console.log(`Set ${args[0]} = ${args[1]}`);
    } else {
      throw new Error(`Unknown config subcommand: ${subcommand}`);
    }
  }

  /**
   * Show help for a command
   */
  private static executeHelp(command?: string): void {
    const helpText = command ? this.getCommandHelp(command) : this.getGeneralHelp();
    console.log(helpText);
  }

  /**
   * Get available commands
   */
  static getAvailableCommands(): string[] {
    return [
      'solve',
      'llm',
      'memory',
      'puzzle',
      'benchmark',
      'config',
      'help',
      'clear',
    ];
  }

  /**
   * Get help for a specific command
   */
  static getCommandHelp(command: string): string {
    const helpTexts: Record<string, string> = {
      solve: `solve <file> [--memory] [--rl] [--reflexion] [--max-iterations=N]
Solve a Sudoku puzzle using GRASP loop.

Examples:
  solve puzzles/easy-01.json
  solve puzzles/hard-01.json --memory --rl`,

      llm: `llm <play|dream|stats> [options]
LLM Sudoku player commands.

Subcommands:
  play <file> [--model=name] [--max-moves=200] [--memory]
  dream
  stats

Examples:
  llm play puzzles/easy-01.json --model=qwen3-30b
  llm dream
  llm stats`,

      memory: `memory <list|search|stats> [args]
AgentDB memory operations.

Subcommands:
  list [pattern]
  search <query>
  stats

Examples:
  memory list
  memory search "NakedSingle"
  memory stats`,

      puzzle: `puzzle generate [--difficulty=easy|medium|hard] [--seed=N]
Generate a randomized Sudoku puzzle.

Examples:
  puzzle generate
  puzzle generate --difficulty=hard --seed=12345`,

      benchmark: `benchmark [suite]
Run performance benchmarks.

Examples:
  benchmark
  benchmark all`,

      config: `config <show|set> [args]
Manage configuration.

Subcommands:
  show
  set <key> <value>

Examples:
  config show
  config set model qwen3-30b`,

      help: `help [command]
Show help information.

Examples:
  help
  help solve
  help llm`,

      clear: `clear
Clear console output.`,
    };

    return helpTexts[command] || `No help available for: ${command}`;
  }

  /**
   * Get general help
   */
  private static getGeneralHelp(): string {
    return `Available commands:
- solve <file> [options]         Solve puzzle
- llm <play|dream|stats> [args]  LLM player
- memory <list|search|stats>     Memory operations
- puzzle generate [options]      Generate puzzle
- benchmark [suite]              Run benchmarks
- config <show|set> [args]       Configuration
- help [command]                 Show help
- clear                          Clear console

Type 'help <command>' for detailed information.`;
  }
}
