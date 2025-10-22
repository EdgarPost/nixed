import { clipboard, storage } from '@nixed/sdk';
import type { ClipboardHistoryItem } from '../types/clipboard.types';

/**
 * Clipboard monitor
 * Monitors clipboard for changes and maintains history
 */
export class ClipboardMonitor {
  private intervalId: number | null = null;
  private lastContent: string = '';
  private history: ClipboardHistoryItem[] = [];

  constructor(
    private maxItems: number = 100,
    private intervalMs: number = 1000
  ) {}

  /**
   * Start monitoring clipboard
   */
  async start(): Promise<void> {
    // Load existing history
    await this.loadHistory();

    // Start monitoring
    this.intervalId = window.setInterval(() => {
      this.checkClipboard();
    }, this.intervalMs);

    console.log('Clipboard monitor started');
  }

  /**
   * Stop monitoring clipboard
   */
  stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('Clipboard monitor stopped');
  }

  /**
   * Check clipboard for changes
   */
  private async checkClipboard(): Promise<void> {
    try {
      const content = await clipboard.read();

      // Check if content changed
      if (content && content !== this.lastContent) {
        this.addToHistory(content);
        this.lastContent = content;
      }
    } catch (error) {
      console.error('Failed to read clipboard:', error);
    }
  }

  /**
   * Add item to history
   */
  private addToHistory(content: string): void {
    // Skip if already at top of history
    if (this.history.length > 0 && this.history[0]?.content === content) {
      return;
    }

    // Create history item
    const item: ClipboardHistoryItem = {
      id: crypto.randomUUID(),
      content,
      timestamp: new Date(),
      preview: this.createPreview(content),
    };

    // Remove duplicates
    this.history = this.history.filter((h) => h.content !== content);

    // Add to front (LIFO)
    this.history.unshift(item);

    // Trim to max size
    if (this.history.length > this.maxItems) {
      this.history = this.history.slice(0, this.maxItems);
    }

    // Save to storage
    this.saveHistory();
  }

  /**
   * Create preview text
   */
  private createPreview(content: string, maxLength: number = 100): string {
    // Collapse whitespace
    const collapsed = content.replace(/\s+/g, ' ').trim();

    // Truncate if needed
    if (collapsed.length <= maxLength) {
      return collapsed;
    }

    return collapsed.substring(0, maxLength) + '...';
  }

  /**
   * Get history items
   */
  getHistory(): ClipboardHistoryItem[] {
    return [...this.history];
  }

  /**
   * Search history
   */
  search(query: string): ClipboardHistoryItem[] {
    if (!query) {
      return this.getHistory();
    }

    const lowerQuery = query.toLowerCase();

    return this.history.filter((item) =>
      item.content.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Clear history
   */
  async clearHistory(): Promise<void> {
    this.history = [];
    await storage.remove('history');
  }

  /**
   * Load history from storage
   */
  private async loadHistory(): Promise<void> {
    try {
      const stored = await storage.get<ClipboardHistoryItem[]>('history');

      if (stored && Array.isArray(stored)) {
        // Convert timestamp strings back to Date objects
        this.history = stored.map((item) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));

        console.log(`Loaded ${this.history.length} clipboard items`);
      }
    } catch (error) {
      console.error('Failed to load clipboard history:', error);
    }
  }

  /**
   * Save history to storage
   */
  private async saveHistory(): Promise<void> {
    try {
      await storage.set('history', this.history);
    } catch (error) {
      console.error('Failed to save clipboard history:', error);
    }
  }
}
