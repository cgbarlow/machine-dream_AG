/**
 * Screen Component
 *
 * Wrapper for blessed.screen with terminal detection and event handling.
 */

import blessed, { Widgets } from 'neo-blessed';
import { OutputManager } from '../../services/OutputManager';
import { ThemeManager } from '../../services/ThemeManager';
import { TerminalCapabilities } from '../../types';
import { detectTerminalCapabilities, validateTerminalEnvironment } from '../../utils/terminalDetect';
import { getBoxChars } from '../../utils/boxDrawing';

export class Screen {
  private screen: Widgets.Screen;
  private outputManager: OutputManager;
  private capabilities: TerminalCapabilities;

  constructor(
    outputManager: OutputManager,
    _themeManager: ThemeManager,
    options: {
      title?: string;
      smartCSR?: boolean;
      fullUnicode?: boolean;
      dockBorders?: boolean;
      allowHeadless?: boolean;
    } = {}
  ) {
    this.outputManager = outputManager;
    this.capabilities = detectTerminalCapabilities();

    // Check if debug mode is enabled (allows headless operation)
    const isDebugMode = Boolean(
      process.env.TUI_DEBUG_OUTPUT ||
      process.env.TUI_DEBUG_STDOUT ||
      options.allowHeadless
    );

    // Validate terminal
    const validation = validateTerminalEnvironment(this.capabilities, { allowHeadless: isDebugMode });
    if (!validation.valid) {
      throw new Error(`Terminal validation failed: ${validation.errors.join(', ')}`);
    }

    // Log warnings
    validation.warnings.forEach(warning => {
      outputManager.emit({
        eventType: 'state',
        component: 'Screen',
        data: { type: 'warning', message: warning }
      });
    });

    // Create blessed screen (even in headless mode, but with safeguards)
    this.screen = blessed.screen({
      smartCSR: options.smartCSR ?? true,
      fullUnicode: options.fullUnicode ?? this.capabilities.supportsUnicode,
      dockBorders: options.dockBorders ?? true,
      autoPadding: true,
      cursor: {
        artificial: false,
        shape: 'underline',
        blink: true,
        color: 'white'
      },
      title: options.title || 'Machine Dream TUI'
    });

    // In headless mode, set up auto-exit to prevent infinite loops
    if (this.capabilities.isHeadless && !this.capabilities.supportsKeyboard) {
      outputManager.emit({
        eventType: 'state',
        component: 'Screen',
        data: {
          action: 'created_headless',
          message: 'Running in headless mode - will auto-exit after initialization',
          capabilities: this.capabilities
        }
      });

      // Auto-exit after 2 seconds in headless mode
      setTimeout(() => {
        outputManager.emit({
          eventType: 'state',
          component: 'Screen',
          data: { action: 'auto_exit_headless', message: 'Headless mode timeout reached' }
        });
        this.destroy();
        process.exit(0);
      }, 2000);
    }

    // Set up global key handlers
    this.setupKeyHandlers();

    // Emit creation event
    this.outputManager.emit({
      eventType: 'state',
      component: 'Screen',
      data: {
        action: 'created',
        capabilities: this.capabilities
      }
    });
  }

  private setupKeyHandlers(): void {
    // Skip keyboard setup in headless mode
    if (this.capabilities.isHeadless && !this.capabilities.supportsKeyboard) {
      return;
    }

    // Global exit handler (Ctrl+C)
    this.screen.key(['C-c'], () => {
      this.outputManager.emit({
        eventType: 'input',
        component: 'Screen',
        data: { key: 'C-c', action: 'exit' }
      });
      this.destroy();
      process.exit(0);
    });

    // Global help handler (F1)
    this.screen.key(['f1'], () => {
      this.outputManager.emit({
        eventType: 'input',
        component: 'Screen',
        data: { key: 'f1', action: 'help' }
      });
    });

    // Global refresh handler (Ctrl+R)
    this.screen.key(['C-r'], () => {
      this.outputManager.emit({
        eventType: 'input',
        component: 'Screen',
        data: { key: 'C-r', action: 'refresh' }
      });
      this.screen.render();
    });
  }

  getScreen(): Widgets.Screen {
    return this.screen;
  }

  getCapabilities(): TerminalCapabilities {
    return this.capabilities;
  }

  render(): void {
    this.screen.render();
    this.outputManager.emit({
      eventType: 'render',
      component: 'Screen',
      data: { action: 'render' }
    });
  }

  destroy(): void {
    this.screen.destroy();
    this.outputManager.emit({
      eventType: 'state',
      component: 'Screen',
      data: { action: 'destroyed' }
    });
  }

  append(element: Widgets.Node): void {
    this.screen.append(element);
  }

  remove(element: Widgets.Node): void {
    this.screen.remove(element);
  }

  getBoxChars() {
    return getBoxChars(this.capabilities);
  }
}
