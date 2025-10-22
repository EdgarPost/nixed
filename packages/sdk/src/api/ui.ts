import { invoke } from '../internal/ipc';

/**
 * Toast notification types
 */
export type ToastType = 'success' | 'error' | 'info' | 'warning';

/**
 * UI API
 * Provides UI interaction utilities
 */
export const ui = {
  /**
   * Show toast notification
   * @param message - Message to display
   * @param type - Toast type
   */
  showToast(message: string, type: ToastType = 'info'): void {
    // This will be handled by the frontend
    window.dispatchEvent(
      new CustomEvent('nixed:toast', {
        detail: { message, type },
      })
    );
  },

  /**
   * Close the launcher window
   */
  async close(): Promise<void> {
    return invoke<void>('hide_window');
  },

  /**
   * Show the launcher window
   */
  async show(): Promise<void> {
    return invoke<void>('show_window');
  },
} as const;
