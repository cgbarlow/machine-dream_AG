/**
 * Base Component Class
 *
 * Abstract base class for all TUI components.
 * Provides event emission and common lifecycle methods.
 */

import { Widgets } from 'blessed';
import { OutputManager } from '../../services/OutputManager';
import { ComponentProps } from '../../types';

export abstract class Component {
  protected element?: Widgets.Node;
  protected outputManager: OutputManager;
  protected props: ComponentProps;
  protected mounted = false;

  constructor(outputManager: OutputManager, props: ComponentProps = {}) {
    this.outputManager = outputManager;
    this.props = props;
  }

  /**
   * Render the component - must be implemented by subclasses
   */
  abstract render(): Widgets.Node;

  /**
   * Mount the component to a parent
   */
  mount(parent?: Widgets.Node): void {
    if (this.mounted) {
      return;
    }

    this.element = this.render();

    if (parent && this.element) {
      parent.append(this.element);
    }

    this.mounted = true;
    this.emit('render', { mounted: true });
  }

  /**
   * Unmount the component
   */
  unmount(): void {
    if (!this.mounted || !this.element) {
      return;
    }

    if (this.element.parent) {
      this.element.parent.remove(this.element);
    }

    this.element.destroy();
    this.mounted = false;
    this.emit('render', { mounted: false });
  }

  /**
   * Get the blessed element
   */
  getElement(): Widgets.Node | undefined {
    return this.element;
  }

  /**
   * Emit an event to the output manager
   */
  protected emit(eventType: string, data: Record<string, unknown>): void {
    this.outputManager.emit({
      eventType: eventType as any,
      component: this.constructor.name,
      data
    });
  }

  /**
   * Update component props
   */
  updateProps(newProps: Partial<ComponentProps>): void {
    this.props = { ...this.props, ...newProps };
    if (this.mounted && this.element) {
      // Re-render if needed
      this.refresh();
    }
  }

  /**
   * Refresh the component
   */
  refresh(): void {
    if (this.element && this.element.screen) {
      this.element.screen.render();
    }
  }

  /**
   * Focus this component
   */
  focus(): void {
    if (this.element && this.element.focusable) {
      (this.element as any).focus();
      this.emit('input', { action: 'focus' });
    }
  }

  /**
   * Check if component is focused
   */
  isFocused(): boolean {
    if (!this.element || !this.element.screen) {
      return false;
    }
    return this.element.screen.focused === this.element;
  }

  /**
   * Show the component
   */
  show(): void {
    if (this.element) {
      (this.element as any).show();
      this.refresh();
    }
  }

  /**
   * Hide the component
   */
  hide(): void {
    if (this.element) {
      (this.element as any).hide();
      this.refresh();
    }
  }

  /**
   * Set component content
   */
  setContent(content: string): void {
    if (this.element && 'setContent' in this.element) {
      (this.element as any).setContent(content);
      this.refresh();
    }
  }
}
