import type { PluginContext } from '@nixed/sdk';
import type { RegisteredPlugin, PluginRegistryState, PluginError } from '../types/plugin-registry.types';
import type { AppConfig } from '../types/config.types';
import { PluginLoader } from './plugin-loader';

/**
 * Plugin registry
 * Maintains state of all registered plugins
 */
export class PluginRegistry {
  private state: PluginRegistryState = {
    plugins: new Map(),
    initialized: false,
    errors: [],
  };

  private loader: PluginLoader;

  constructor() {
    this.loader = new PluginLoader();
  }

  /**
   * Initialize plugin registry
   * Discovers and loads all plugins
   */
  async initialize(config: AppConfig): Promise<void> {
    if (this.state.initialized) {
      console.warn('Plugin registry already initialized');
      return;
    }

    try {
      // Discover available plugins
      const manifests = await this.loader.discoverPlugins();

      // Load each plugin
      for (const manifest of manifests) {
        try {
          await this.registerPlugin(manifest.id, config);
        } catch (error) {
          this.state.errors.push({
            pluginId: manifest.id,
            message: `Failed to register plugin: ${error instanceof Error ? error.message : String(error)}`,
            error: error instanceof Error ? error : new Error(String(error)),
            timestamp: new Date(),
          });
        }
      }

      this.state.initialized = true;

      console.log(
        `Plugin registry initialized with ${this.state.plugins.size} plugins`
      );
    } catch (error) {
      console.error('Failed to initialize plugin registry:', error);
      throw error;
    }
  }

  /**
   * Register a plugin
   */
  private async registerPlugin(pluginId: string, config: AppConfig): Promise<void> {
    // Load plugin module
    const plugin = await this.loader.loadPlugin(pluginId);

    // Get plugin configuration
    const pluginConfig = config.plugins[pluginId] || {
      enabled: true,
      preferences: {},
    };

    // Create plugin context
    const context: PluginContext = {
      pluginId,
      preferences: pluginConfig.preferences,
      isDevelopment: import.meta.env.DEV,
    };

    // Register plugin
    const registered: RegisteredPlugin = {
      manifest: plugin.manifest,
      instance: plugin,
      context,
      enabled: pluginConfig.enabled,
      loadedAt: new Date(),
    };

    this.state.plugins.set(pluginId, registered);

    // Call plugin onLoad hook
    if (plugin.onLoad) {
      try {
        await plugin.onLoad();
      } catch (error) {
        console.error(`Plugin "${pluginId}" onLoad failed:`, error);
        registered.error = error instanceof Error ? error : new Error(String(error));
      }
    }
  }

  /**
   * Unregister a plugin
   */
  async unregisterPlugin(pluginId: string): Promise<void> {
    const plugin = this.state.plugins.get(pluginId);

    if (!plugin) {
      console.warn(`Plugin "${pluginId}" not found`);
      return;
    }

    // Call onUnload hook
    if (plugin.instance.onUnload) {
      try {
        await plugin.instance.onUnload();
      } catch (error) {
        console.error(`Plugin "${pluginId}" onUnload failed:`, error);
      }
    }

    // Remove from registry
    this.state.plugins.delete(pluginId);
    console.log(`Plugin "${pluginId}" unregistered`);
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): RegisteredPlugin | undefined {
    return this.state.plugins.get(pluginId);
  }

  /**
   * Get all enabled plugins
   */
  getEnabledPlugins(): RegisteredPlugin[] {
    return Array.from(this.state.plugins.values()).filter((p) => p.enabled && !p.error);
  }

  /**
   * Get all plugins
   */
  getAllPlugins(): RegisteredPlugin[] {
    return Array.from(this.state.plugins.values());
  }

  /**
   * Enable plugin
   */
  enablePlugin(pluginId: string): void {
    const plugin = this.state.plugins.get(pluginId);
    if (plugin) {
      plugin.enabled = true;
    }
  }

  /**
   * Disable plugin
   */
  disablePlugin(pluginId: string): void {
    const plugin = this.state.plugins.get(pluginId);
    if (plugin) {
      plugin.enabled = false;
    }
  }

  /**
   * Reload plugin
   */
  async reloadPlugin(pluginId: string, config: AppConfig): Promise<void> {
    // Unload current plugin
    const current = this.state.plugins.get(pluginId);
    if (current && current.instance.onUnload) {
      try {
        await current.instance.onUnload();
      } catch (error) {
        console.error(`Plugin "${pluginId}" onUnload failed:`, error);
      }
    }

    // Remove from registry
    this.state.plugins.delete(pluginId);

    // Re-register
    await this.registerPlugin(pluginId, config);
  }

  /**
   * Get loading errors
   */
  getErrors(): PluginError[] {
    return this.state.errors;
  }

  /**
   * Shutdown registry and unload all plugins
   * FIX: Add cleanup method to call onUnload for all plugins
   */
  async shutdown(): Promise<void> {
    const unloadPromises: Promise<void>[] = [];

    for (const [pluginId, plugin] of this.state.plugins.entries()) {
      if (plugin.instance.onUnload) {
        const unloadPromise = (async () => {
          try {
            await plugin.instance.onUnload!();
            console.log(`Plugin "${pluginId}" unloaded successfully`);
          } catch (error) {
            console.error(`Plugin "${pluginId}" onUnload failed:`, error);
          }
        })();
        unloadPromises.push(unloadPromise);
      }
    }

    await Promise.all(unloadPromises);
    this.state.plugins.clear();
    this.state.initialized = false;

    console.log('Plugin registry shutdown complete');
  }
}
