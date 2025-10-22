import type { PluginManifest } from './manifest.types';
import type { SearchQuery, SearchResult } from './search.types';

/**
 * Main plugin interface
 * All plugins must implement this interface
 */
export interface Plugin {
  /** Plugin manifest */
  readonly manifest: PluginManifest;

  /**
   * Called when plugin is loaded
   * Use for initialization, event listeners, etc.
   */
  onLoad?(): void | Promise<void>;

  /**
   * Called when plugin is unloaded
   * Use for cleanup, removing listeners, etc.
   */
  onUnload?(): void | Promise<void>;

  /**
   * Called when user searches
   * Return array of search results
   */
  onSearch?(query: SearchQuery): SearchResult[] | Promise<SearchResult[]>;

  /**
   * Called when user executes a specific command
   * Only called for 'no-view' commands
   */
  onCommand?(commandName: string, args?: string): void | Promise<void>;
}

/**
 * Plugin context provided to plugins
 * Injected by the core system
 */
export interface PluginContext {
  /** Plugin ID (from manifest) */
  pluginId: string;

  /** Plugin preferences (values from user config) */
  preferences: Record<string, unknown>;

  /** Whether plugin is in development mode */
  isDevelopment: boolean;
}
