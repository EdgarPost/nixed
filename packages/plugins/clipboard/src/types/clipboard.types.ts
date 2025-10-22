/**
 * Clipboard history item
 */
export interface ClipboardHistoryItem {
  /** Unique identifier */
  id: string;

  /** Clipboard content */
  content: string;

  /** Timestamp when added */
  timestamp: Date;

  /** Preview text (truncated) */
  preview: string;
}

/**
 * Clipboard preferences
 */
export interface ClipboardPreferences {
  maxItems: number;
  monitorInterval: number;
}
