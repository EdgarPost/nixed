import type { Plugin, PluginManifest } from '@nixed/sdk';
import type { PluginError } from '../types/plugin-registry.types';

/**
 * Plugin loader
 * Responsible for discovering and loading plugins from the monorepo
 */
export class PluginLoader {
  /**
   * Discover all available plugins
   * Scans packages/plugins directory for valid plugin packages
   */
  async discoverPlugins(): Promise<PluginManifest[]> {
    const manifests: PluginManifest[] = [];
    const errors: PluginError[] = [];

    try {
      // In production, plugins are bundled with the app
      // Read plugin manifests from embedded metadata
      const pluginMetadata = await this.getEmbeddedPluginMetadata();

      for (const metadata of pluginMetadata) {
        try {
          this.validateManifest(metadata);
          manifests.push(metadata);
        } catch (error) {
          errors.push({
            pluginId: metadata.id || 'unknown',
            message: `Invalid manifest: ${error instanceof Error ? error.message : String(error)}`,
            error: error instanceof Error ? error : new Error(String(error)),
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('Failed to discover plugins:', error);
    }

    if (errors.length > 0) {
      console.warn('Plugin discovery errors:', errors);
    }

    return manifests;
  }

  /**
   * Load a plugin by ID
   * FIX: Use import.meta.glob for dynamic discovery
   */
  async loadPlugin(pluginId: string): Promise<Plugin> {
    try {
      // Use Vite's import.meta.glob to discover all plugin entry points
      const pluginModules = import.meta.glob<{ default: Plugin }>(
        '../../plugins/*/src/index.{ts,tsx}',
        { eager: false }
      );

      // Find the matching plugin
      const modulePath = Object.keys(pluginModules).find((path) =>
        path.includes(`/plugins/${pluginId}/`)
      );

      if (!modulePath) {
        throw new Error(`Plugin "${pluginId}" not found`);
      }

      // Load the module
      const module = await pluginModules[modulePath]!();
      const plugin = module.default;

      if (!plugin || typeof plugin !== 'object') {
        throw new Error('Plugin must export a default Plugin object');
      }

      if (!plugin.manifest) {
        throw new Error('Plugin must have a manifest');
      }

      // Validate plugin implements interface
      this.validatePlugin(plugin);

      return plugin;
    } catch (error) {
      throw new Error(
        `Failed to load plugin "${pluginId}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate plugin manifest
   */
  private validateManifest(manifest: PluginManifest): void {
    if (!manifest.id || typeof manifest.id !== 'string') {
      throw new Error('Manifest must have a valid id');
    }

    if (!manifest.name || typeof manifest.name !== 'string') {
      throw new Error('Manifest must have a valid name');
    }

    if (!manifest.version || typeof manifest.version !== 'string') {
      throw new Error('Manifest must have a valid version');
    }

    if (!Array.isArray(manifest.commands) || manifest.commands.length === 0) {
      throw new Error('Manifest must have at least one command');
    }

    // Validate each command
    for (const command of manifest.commands) {
      if (!command.name || typeof command.name !== 'string') {
        throw new Error('Command must have a valid name');
      }

      if (!command.title || typeof command.title !== 'string') {
        throw new Error('Command must have a valid title');
      }

      if (!command.mode || !['view', 'no-view'].includes(command.mode)) {
        throw new Error('Command must have a valid mode');
      }
    }
  }

  /**
   * Validate plugin implementation
   */
  private validatePlugin(plugin: Plugin): void {
    if (plugin.onSearch && typeof plugin.onSearch !== 'function') {
      throw new Error('onSearch must be a function');
    }

    if (plugin.onLoad && typeof plugin.onLoad !== 'function') {
      throw new Error('onLoad must be a function');
    }

    if (plugin.onUnload && typeof plugin.onUnload !== 'function') {
      throw new Error('onUnload must be a function');
    }

    if (plugin.onCommand && typeof plugin.onCommand !== 'function') {
      throw new Error('onCommand must be a function');
    }
  }

  /**
   * Get embedded plugin metadata
   * FIX: Use dynamic import.meta.glob for true plugin discovery
   * Vite will statically analyze this at build time
   */
  private async getEmbeddedPluginMetadata(): Promise<PluginManifest[]> {
    const manifests: PluginManifest[] = [];

    // Use Vite's import.meta.glob for automatic plugin discovery
    // This will find all package.json files in plugins directory
    const pluginManifests = import.meta.glob('../../plugins/*/package.json', {
      eager: false,
      import: 'default',
    });

    for (const [path, importFn] of Object.entries(pluginManifests)) {
      try {
        const pkg = (await (importFn as () => Promise<{ nixed?: PluginManifest }>)());

        if (pkg.nixed) {
          manifests.push(pkg.nixed);
        } else {
          console.warn(`Plugin at ${path} missing "nixed" manifest in package.json`);
        }
      } catch (error) {
        console.error(`Failed to load manifest from ${path}:`, error);
      }
    }

    return manifests;
  }
}
