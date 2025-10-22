import type { Plugin, PluginManifest, PluginContext } from '@nixed/sdk';

/**
 * Registered plugin entry
 */
export interface RegisteredPlugin {
  /** Plugin manifest */
  manifest: PluginManifest;

  /** Plugin instance */
  instance: Plugin;

  /** Plugin context */
  context: PluginContext;

  /** Whether plugin is enabled */
  enabled: boolean;

  /** Load timestamp */
  loadedAt: Date;

  /** Error if plugin failed to load */
  error?: Error;
}

/**
 * Plugin registry state
 */
export interface PluginRegistryState {
  /** Map of plugin ID to registered plugin */
  plugins: Map<string, RegisteredPlugin>;

  /** Whether registry is initialized */
  initialized: boolean;

  /** Loading errors */
  errors: PluginError[];
}

/**
 * Plugin loading error
 */
export interface PluginError {
  /** Plugin ID */
  pluginId: string;

  /** Error message */
  message: string;

  /** Full error object */
  error: Error;

  /** Timestamp */
  timestamp: Date;
}
