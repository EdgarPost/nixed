import { invoke as tauriInvoke } from '@tauri-apps/api/core';

/**
 * Internal IPC wrapper
 * Wraps Tauri's invoke with error handling
 */
export async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await tauriInvoke<T>(command, args);
  } catch (error) {
    // Convert Tauri error to user-friendly message
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Command "${command}" failed: ${message}`);
  }
}
