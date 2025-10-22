import { invoke } from '../internal/ipc';

/**
 * Clipboard history item
 */
export interface ClipboardItem {
  id: string;
  content: string;
  /** Timestamp in RFC3339/ISO 8601 format (e.g., "2025-10-22T15:30:00Z") */
  timestamp: string;
}

/**
 * Clipboard API
 * Provides access to system clipboard and history
 */
export const clipboard = {
  /**
   * Read current clipboard content
   * @returns Current clipboard text
   * @throws Error if clipboard access fails
   */
  async read(): Promise<string> {
    return invoke<string>('clipboard_read');
  },

  /**
   * Write text to clipboard
   * @param text - Text to write
   * @throws Error if clipboard write fails
   */
  async write(text: string): Promise<void> {
    return invoke<void>('clipboard_write', { text });
  },

  /**
   * Get clipboard history
   * @returns Array of clipboard history items (newest first)
   */
  async history(): Promise<ClipboardItem[]> {
    return invoke<ClipboardItem[]>('clipboard_history');
  },

  /**
   * Clear clipboard history
   */
  async clearHistory(): Promise<void> {
    return invoke<void>('clipboard_clear_history');
  },
} as const;
