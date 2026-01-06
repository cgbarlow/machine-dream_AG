/**
 * TUI Application
 *
 * Main orchestrator for the Terminal User Interface.
 * Manages screen navigation, layout, and component lifecycle.
 */

import { OutputManager } from './services/OutputManager';
import { ThemeManager } from './services/ThemeManager';
import { CLIExecutor } from './services/CLIExecutor';
import { Screen } from './components/layout/Screen';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ContentArea } from './components/layout/ContentArea';
import { StatusBar } from './components/layout/StatusBar';
import { HomeScreen } from './screens/HomeScreen';
import { SolveScreen } from './screens/SolveScreen';
import { MemoryScreen } from './screens/MemoryScreen';
import { DreamScreen } from './screens/DreamScreen';
import { BenchmarkScreen } from './screens/BenchmarkScreen';
import { DemoScreen } from './screens/DemoScreen';
import { ConfigScreen } from './screens/ConfigScreen';
import { ExportScreen } from './screens/ExportScreen';
import { SystemScreen } from './screens/SystemScreen';
import { MenuItem, ScreenName, TUIConfig } from './types';
import { detectTerminalCapabilities } from './utils/terminalDetect';

export class TUIApplication {
  private outputManager: OutputManager;
  private themeManager: ThemeManager;
  private cliExecutor: CLIExecutor;
  private screen?: Screen;
  private header?: Header;
  private sidebar?: Sidebar;
  private contentArea?: ContentArea;
  private statusBar?: StatusBar;
  private currentScreen: ScreenName = 'home';
  private config: TUIConfig;

  constructor(config?: Partial<TUIConfig>) {
    // Detect terminal capabilities
    const capabilities = detectTerminalCapabilities();

    // Create default config
    this.config = {
      sessionId: 'tui-session',
      debugOutput: process.env.TUI_DEBUG_OUTPUT,
      theme: 'dark',
      terminalCapabilities: capabilities,
      ...config
    };

    // Initialize services
    this.outputManager = new OutputManager({
      debugOutput: this.config.debugOutput,
      enabled: Boolean(this.config.debugOutput || process.env.TUI_DEBUG_STDOUT)
    });
    this.themeManager = new ThemeManager(this.config.theme || 'dark');
    this.cliExecutor = new CLIExecutor(this.outputManager);

    // Emit initialization event
    this.outputManager.emit({
      eventType: 'state',
      component: 'TUIApplication',
      data: {
        action: 'initialize',
        config: this.config
      }
    });
  }

  /**
   * Start the TUI application
   */
  async start(): Promise<void> {
    this.outputManager.emit({
      eventType: 'state',
      component: 'TUIApplication',
      data: { action: 'start' }
    });

    // Create screen
    this.screen = new Screen(
      this.outputManager,
      this.themeManager,
      {
        title: 'Machine Dream',
        smartCSR: true,
        fullUnicode: true
      }
    );
    const screenElement = this.screen.getScreen();

    // Create header
    this.header = new Header(this.outputManager, this.themeManager, {
      title: 'Machine Dream',
      subtitle: 'AI-Powered Problem Solving'
    });
    this.header.mount(screenElement);

    // Create sidebar with menu
    const menuItems = this.getMenuItems();
    this.sidebar = new Sidebar(this.outputManager, this.themeManager, {
      menuItems,
      onSelect: (item) => this.navigateTo(item.screen)
    });
    this.sidebar.mount(screenElement);

    // Create content area
    this.contentArea = new ContentArea(this.outputManager, this.themeManager);
    this.contentArea.mount(screenElement);

    // Create status bar
    this.statusBar = new StatusBar(this.outputManager, this.themeManager, {
      sessionId: this.config.sessionId || 'tui-session'
    });
    this.statusBar.mount(screenElement);

    // Set initial help text
    this.statusBar.setHelpText('F1: Help | Ctrl+C: Exit | Ctrl+R: Refresh');

    // Navigate to home screen
    await this.navigateTo('home');

    // Render screen
    screenElement.render();
  }

  /**
   * Navigate to a specific screen
   */
  private async navigateTo(screenName: ScreenName): Promise<void> {
    this.outputManager.emit({
      eventType: 'navigation',
      component: 'TUIApplication',
      data: {
        from: this.currentScreen,
        to: screenName
      }
    });

    this.currentScreen = screenName;

    // Update sidebar selection
    const screenIndex = ['home', 'solve', 'memory', 'dream', 'benchmark', 'demo', 'config', 'export', 'system'].indexOf(screenName);
    this.sidebar?.selectItem(screenIndex);

    // Create and mount screen component
    let screenComponent;

    switch (screenName) {
      case 'home':
        screenComponent = new HomeScreen(this.outputManager, this.themeManager);
        this.statusBar?.setStatus('Welcome to Machine Dream', 'info');
        break;

      case 'solve':
        screenComponent = new SolveScreen(
          this.outputManager,
          this.themeManager,
          this.cliExecutor
        );
        this.statusBar?.setStatus('Solve puzzles with GRASP loop', 'info');
        break;

      case 'memory':
        screenComponent = new MemoryScreen(
          this.outputManager,
          this.themeManager,
          this.cliExecutor
        );
        this.statusBar?.setStatus('Browse and manage memory', 'info');
        break;

      case 'dream':
        screenComponent = new DreamScreen(
          this.outputManager,
          this.themeManager,
          this.cliExecutor
        );
        this.statusBar?.setStatus('Run dream cycles', 'info');
        break;

      case 'benchmark':
        screenComponent = new BenchmarkScreen(
          this.outputManager,
          this.themeManager,
          this.cliExecutor
        );
        this.statusBar?.setStatus('Performance benchmarks', 'info');
        break;

      case 'demo':
        screenComponent = new DemoScreen(this.outputManager, this.themeManager);
        this.statusBar?.setStatus('Interactive demonstrations', 'info');
        break;

      case 'config':
        screenComponent = new ConfigScreen(this.outputManager, this.themeManager);
        this.statusBar?.setStatus('System configuration', 'info');
        break;

      case 'export':
        screenComponent = new ExportScreen(this.outputManager, this.themeManager);
        this.statusBar?.setStatus('Export data and reports', 'info');
        break;

      case 'system':
        screenComponent = new SystemScreen(this.outputManager, this.themeManager);
        this.statusBar?.setStatus('System information', 'info');
        break;

      default:
        screenComponent = new HomeScreen(this.outputManager, this.themeManager);
        this.statusBar?.setStatus('Welcome to Machine Dream', 'info');
    }

    // Mount screen in content area
    this.contentArea?.setContentComponent(screenComponent);

    // Refresh display
    this.screen?.getScreen().render();
  }

  /**
   * Get menu items for sidebar
   */
  private getMenuItems(): MenuItem[] {
    return [
      {
        icon: '*',
        label: 'Home',
        screen: 'home',
        shortcut: 'H'
      },
      {
        icon: '#',
        label: 'Solve',
        screen: 'solve',
        shortcut: 'S'
      },
      {
        icon: '@',
        label: 'Memory',
        screen: 'memory',
        shortcut: 'M'
      },
      {
        icon: '~',
        label: 'Dream',
        screen: 'dream',
        shortcut: 'D'
      },
      {
        icon: '+',
        label: 'Benchmark',
        screen: 'benchmark',
        shortcut: 'B'
      },
      {
        icon: '>',
        label: 'Demo',
        screen: 'demo',
        shortcut: 'E'
      },
      {
        icon: '%',
        label: 'Config',
        screen: 'config',
        shortcut: 'C'
      },
      {
        icon: '^',
        label: 'Export',
        screen: 'export',
        shortcut: 'X'
      },
      {
        icon: '=',
        label: 'System',
        screen: 'system',
        shortcut: 'Y'
      }
    ];
  }

  /**
   * Stop the TUI application
   */
  async stop(): Promise<void> {
    this.outputManager.emit({
      eventType: 'state',
      component: 'TUIApplication',
      data: { action: 'stop' }
    });

    if (this.screen) {
      this.screen.destroy();
    }
  }

  /**
   * Get output manager for testing
   */
  getOutputManager(): OutputManager {
    return this.outputManager;
  }

  /**
   * Get current screen name for testing
   */
  getCurrentScreen(): ScreenName {
    return this.currentScreen;
  }
}
