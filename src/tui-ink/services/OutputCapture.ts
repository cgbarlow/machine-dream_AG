/**
 * OutputCapture Service
 *
 * Intercepts stdout/stderr to capture CLI output within TUI.
 * Filters Ink escape sequences and maintains circular buffer.
 *
 * Spec: 14-console-menu-interface-spec.md (Section 5.1)
 */

export class OutputCapture {
  private static originalWrite: typeof process.stdout.write | null = null;
  private static buffer: string[] = [];
  private static listeners: Set<(line: string) => void> = new Set();
  private static maxLines: number = 1000;
  private static isCapturing: boolean = false;

  /**
   * Start capturing stdout
   */
  static start(): void {
    if (this.isCapturing) {
      return; // Already capturing
    }

    // Save original write function
    this.originalWrite = process.stdout.write.bind(process.stdout);

    // Patch process.stdout.write
    process.stdout.write = ((chunk: any, ...args: any[]): boolean => {
      const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');

      // Filter out Ink escape codes (cursor positioning, etc.)
      // Ink escape codes start with \x1b[ for cursor control
      if (!text.startsWith('\x1b[')) {
        // Split multiline output
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.trim().length > 0) {
            this.addLine(line);
          }
        }
      }

      // Call original write to maintain normal output
      return this.originalWrite!(chunk, ...args);
    }) as typeof process.stdout.write;

    this.isCapturing = true;
  }

  /**
   * Stop capturing and restore original stdout
   */
  static stop(): void {
    if (!this.isCapturing || !this.originalWrite) {
      return;
    }

    // Restore original write function
    process.stdout.write = this.originalWrite;
    this.originalWrite = null;
    this.isCapturing = false;
  }

  /**
   * Add a line to the buffer
   */
  static addLine(line: string): void {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 12); // HH:MM:SS.mmm
    const timestampedLine = `[${timestamp}] ${line}`;

    this.buffer.push(timestampedLine);

    // Maintain circular buffer (keep last N lines)
    if (this.buffer.length > this.maxLines) {
      this.buffer.shift();
    }

    // Notify all subscribers
    this.listeners.forEach(callback => callback(timestampedLine));
  }

  /**
   * Subscribe to new lines
   * @returns Unsubscribe function
   */
  static subscribe(callback: (line: string) => void): () => void {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Get current buffer
   */
  static getBuffer(): string[] {
    return [...this.buffer];
  }

  /**
   * Clear the buffer
   */
  static clearBuffer(): void {
    this.buffer = [];
    this.listeners.forEach(callback => callback('[Console cleared]'));
  }

  /**
   * Get buffer statistics
   */
  static getStats(): { lines: number; maxLines: number; isCapturing: boolean } {
    return {
      lines: this.buffer.length,
      maxLines: this.maxLines,
      isCapturing: this.isCapturing,
    };
  }
}
