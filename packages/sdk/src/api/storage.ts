import { invoke } from '../internal/ipc';
import { getPluginId } from '../internal/context';

/**
 * Storage API
 * Provides persistent key-value storage scoped to plugin
 */
export const storage = {
  /**
   * Get value from storage
   * @param key - Storage key
   * @returns Value or null if not found
   */
  async get<T = string>(key: string): Promise<T | null> {
    const pluginId = getPluginId();
    const value = await invoke<string | null>('storage_get', { pluginId, key });

    if (value === null) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  },

  /**
   * Set value in storage
   * @param key - Storage key
   * @param value - Value to store (will be JSON serialized)
   */
  async set<T>(key: string, value: T): Promise<void> {
    const pluginId = getPluginId();
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    return invoke<void>('storage_set', { pluginId, key, value: serialized });
  },

  /**
   * Remove value from storage
   * @param key - Storage key
   */
  async remove(key: string): Promise<void> {
    const pluginId = getPluginId();
    return invoke<void>('storage_remove', { pluginId, key });
  },

  /**
   * Clear all storage for this plugin
   */
  async clear(): Promise<void> {
    const pluginId = getPluginId();
    return invoke<void>('storage_clear', { pluginId });
  },
} as const;
