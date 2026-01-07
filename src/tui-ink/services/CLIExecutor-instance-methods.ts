/**
 * Instance-based CLIExecutor methods for TUI integration tests
 * This file contains instance method wrappers around static CLIExecutor methods
 */

import { CLIExecutor, SolveParams } from './CLIExecutor.js';

/**
 * Extend CLIExecutor with instance methods
 */
declare module './CLIExecutor.js' {
  interface CLIExecutor {
    executeSolve(args: string[]): Promise<string>;
    executeLLM(args: string[]): Promise<string>;
    executeMemory(args: string[]): Promise<string>;
    executeDream(args: string[]): Promise<string>;
    executeBenchmark(args: string[]): Promise<string>;
    executeConfig(args: string[]): Promise<string>;
    executeHelp(args: string[]): Promise<string>;
    executeClear(args: string[]): Promise<string>;
  }
}

/**
 * Add instance methods to CLIExecutor prototype
 */
CLIExecutor.prototype.executeSolve = async function(args: string[]): Promise<string> {
  const puzzleFile = args[0];
  if (!puzzleFile) {
    throw new Error('Missing puzzle file argument');
  }

  const params: SolveParams = {
    puzzleFile,
    memorySystem: 'agentdb',
    enableRL: args.includes('--rl'),
    enableReflexion: args.includes('--reflexion'),
    maxIterations: 100,
  };

  await CLIExecutor.executeSolve(params, () => {});
  return 'Solve completed successfully';
};

CLIExecutor.prototype.executeLLM = async function(args: string[]): Promise<string> {
  const subcommand = args[0];
  if (!subcommand) {
    throw new Error('Missing LLM subcommand');
  }

  switch (subcommand) {
    case 'play':
      if (!args[1]) {
        throw new Error('Missing puzzle file');
      }
      await CLIExecutor.executeLLMPlay(args[1], { memoryEnabled: false, maxMoves: 200 }, () => {});
      return 'LLM play completed';

    case 'dream':
      await CLIExecutor.executeLLMDream(() => {});
      return 'Dream completed';

    case 'stats':
      await CLIExecutor.getLLMStats();
      return 'Stats retrieved';

    case 'benchmark':
      await CLIExecutor.executeLLMBenchmark(['puzzles/easy-01.json'], () => {});
      return 'Benchmark completed';

    default:
      throw new Error(`Unknown LLM subcommand: ${subcommand}`);
  }
};

CLIExecutor.prototype.executeMemory = async function(args: string[]): Promise<string> {
  const subcommand = args[0];
  if (!subcommand) {
    throw new Error('Missing memory subcommand');
  }

  switch (subcommand) {
    case 'list':
      await CLIExecutor.memoryList();
      return 'Memory list retrieved';

    case 'search':
      if (!args[1]) {
        throw new Error('Missing search pattern');
      }
      await CLIExecutor.memorySearch(args[1], {});
      return 'Memory search completed';

    case 'store':
      if (args.length < 3) {
        throw new Error('Missing key or value');
      }
      await CLIExecutor.memoryStore(args[1], args[2]);
      return 'Memory stored';

    case 'retrieve':
      if (!args[1]) {
        throw new Error('Missing key');
      }
      await CLIExecutor.memoryRetrieve(args[1]);
      return 'Memory retrieved';

    default:
      throw new Error(`Unknown memory subcommand: ${subcommand}`);
  }
};

CLIExecutor.prototype.executeDream = async function(_args: string[]): Promise<string> {
  await CLIExecutor.executeDream('default-session', {}, () => {});
  return 'Dream completed';
};

CLIExecutor.prototype.executeBenchmark = async function(_args: string[]): Promise<string> {
  await CLIExecutor.executeBenchmark('Standard', 'grasp-baseline', 10, () => {});
  return 'Benchmark completed';
};

CLIExecutor.prototype.executeConfig = async function(args: string[]): Promise<string> {
  const subcommand = args[0];
  if (!subcommand || subcommand === 'show') {
    await CLIExecutor.getConfig();
    return 'Config retrieved';
  } else if (subcommand === 'set') {
    if (args.length < 3) {
      throw new Error('Missing key or value');
    }
    await CLIExecutor.setConfig(args[1], args[2]);
    return 'Config updated';
  } else {
    throw new Error(`Unknown config subcommand: ${subcommand}`);
  }
};

CLIExecutor.prototype.executeHelp = async function(_args: string[]): Promise<string> {
  return 'Help displayed';
};

CLIExecutor.prototype.executeClear = async function(_args: string[]): Promise<string> {
  return 'Console cleared';
};
