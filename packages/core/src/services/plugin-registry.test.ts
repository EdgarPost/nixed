import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginRegistry } from './plugin-registry';
import { PluginLoader } from './plugin-loader';
import type { AppConfig } from '../types/config.types';
import type { Plugin, PluginManifest } from '@nixed/sdk';

vi.mock('./plugin-loader');

describe('PluginRegistry', () => {
  let registry: PluginRegistry;
  let mockConfig: AppConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new PluginRegistry();
    mockConfig = {
      plugins: {
        'test-plugin': {
          enabled: true,
          preferences: { key: 'value' },
        },
      },
    };
  });

  describe('initialize', () => {
    it('should initialize registry and load plugins', async () => {
      const mockManifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        author: 'Test',
        description: 'Test plugin',
        commands: [
          {
            name: 'test-command',
            title: 'Test Command',
            mode: 'view',
          },
        ],
      };

      const mockPlugin: Plugin = {
        manifest: mockManifest,
        onLoad: vi.fn(),
      };

      vi.mocked(PluginLoader.prototype.discoverPlugins).mockResolvedValue([mockManifest]);
      vi.mocked(PluginLoader.prototype.loadPlugin).mockResolvedValue(mockPlugin);

      await registry.initialize(mockConfig);

      const plugins = registry.getAllPlugins();
      expect(plugins).toHaveLength(1);
      expect(plugins[0]!.manifest.id).toBe('test-plugin');
      expect(mockPlugin.onLoad).toHaveBeenCalled();
    });

    it('should not reinitialize if already initialized', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      vi.mocked(PluginLoader.prototype.discoverPlugins).mockResolvedValue([]);

      await registry.initialize(mockConfig);
      await registry.initialize(mockConfig);

      expect(consoleWarnSpy).toHaveBeenCalledWith('Plugin registry already initialized');
      consoleWarnSpy.mockRestore();
    });

    it('should handle plugin loading errors gracefully', async () => {
      const mockManifest: PluginManifest = {
        id: 'failing-plugin',
        name: 'Failing Plugin',
        version: '1.0.0',
        author: 'Test',
        description: 'Test',
        commands: [
          {
            name: 'test',
            title: 'Test',
            mode: 'view',
          },
        ],
      };

      vi.mocked(PluginLoader.prototype.discoverPlugins).mockResolvedValue([mockManifest]);
      vi.mocked(PluginLoader.prototype.loadPlugin).mockRejectedValue(new Error('Load failed'));

      await registry.initialize(mockConfig);

      const errors = registry.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0]!.pluginId).toBe('failing-plugin');
      expect(errors[0]!.message).toContain('Failed to register plugin');
    });
  });

  describe('getPlugin', () => {
    it('should return plugin by id', async () => {
      const mockManifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        author: 'Test',
        description: 'Test',
        commands: [{ name: 'test', title: 'Test', mode: 'view' }],
      };

      const mockPlugin: Plugin = {
        manifest: mockManifest,
      };

      vi.mocked(PluginLoader.prototype.discoverPlugins).mockResolvedValue([mockManifest]);
      vi.mocked(PluginLoader.prototype.loadPlugin).mockResolvedValue(mockPlugin);

      await registry.initialize(mockConfig);

      const plugin = registry.getPlugin('test-plugin');
      expect(plugin).toBeDefined();
      expect(plugin?.manifest.id).toBe('test-plugin');
    });

    it('should return undefined for non-existent plugin', () => {
      const plugin = registry.getPlugin('non-existent');
      expect(plugin).toBeUndefined();
    });
  });

  describe('getEnabledPlugins', () => {
    it('should return only enabled plugins without errors', async () => {
      const manifest1: PluginManifest = {
        id: 'enabled-plugin',
        name: 'Enabled',
        version: '1.0.0',
        author: 'Test',
        description: 'Test',
        commands: [{ name: 'test', title: 'Test', mode: 'view' }],
      };

      const manifest2: PluginManifest = {
        id: 'disabled-plugin',
        name: 'Disabled',
        version: '1.0.0',
        author: 'Test',
        description: 'Test',
        commands: [{ name: 'test', title: 'Test', mode: 'view' }],
      };

      const plugin1: Plugin = { manifest: manifest1 };
      const plugin2: Plugin = { manifest: manifest2 };

      vi.mocked(PluginLoader.prototype.discoverPlugins).mockResolvedValue([manifest1, manifest2]);
      vi.mocked(PluginLoader.prototype.loadPlugin)
        .mockResolvedValueOnce(plugin1)
        .mockResolvedValueOnce(plugin2);

      const config: AppConfig = {
        plugins: {
          'enabled-plugin': { enabled: true, preferences: {} },
          'disabled-plugin': { enabled: false, preferences: {} },
        },
      };

      await registry.initialize(config);

      const enabledPlugins = registry.getEnabledPlugins();
      expect(enabledPlugins).toHaveLength(1);
      expect(enabledPlugins[0]!.manifest.id).toBe('enabled-plugin');
    });
  });

  describe('enablePlugin / disablePlugin', () => {
    it('should enable plugin', async () => {
      const mockManifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test',
        version: '1.0.0',
        author: 'Test',
        description: 'Test',
        commands: [{ name: 'test', title: 'Test', mode: 'view' }],
      };

      const mockPlugin: Plugin = { manifest: mockManifest };

      vi.mocked(PluginLoader.prototype.discoverPlugins).mockResolvedValue([mockManifest]);
      vi.mocked(PluginLoader.prototype.loadPlugin).mockResolvedValue(mockPlugin);

      await registry.initialize(mockConfig);

      registry.disablePlugin('test-plugin');
      let plugin = registry.getPlugin('test-plugin');
      expect(plugin?.enabled).toBe(false);

      registry.enablePlugin('test-plugin');
      plugin = registry.getPlugin('test-plugin');
      expect(plugin?.enabled).toBe(true);
    });
  });

  describe('unregisterPlugin', () => {
    it('should unregister plugin and call onUnload', async () => {
      const mockManifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test',
        version: '1.0.0',
        author: 'Test',
        description: 'Test',
        commands: [{ name: 'test', title: 'Test', mode: 'view' }],
      };

      const onUnload = vi.fn();
      const mockPlugin: Plugin = {
        manifest: mockManifest,
        onUnload,
      };

      vi.mocked(PluginLoader.prototype.discoverPlugins).mockResolvedValue([mockManifest]);
      vi.mocked(PluginLoader.prototype.loadPlugin).mockResolvedValue(mockPlugin);

      await registry.initialize(mockConfig);
      await registry.unregisterPlugin('test-plugin');

      expect(onUnload).toHaveBeenCalled();
      expect(registry.getPlugin('test-plugin')).toBeUndefined();
    });
  });

  describe('shutdown', () => {
    it('should shutdown all plugins and call onUnload', async () => {
      const onUnload1 = vi.fn();
      const onUnload2 = vi.fn();

      const manifest1: PluginManifest = {
        id: 'plugin1',
        name: 'Plugin 1',
        version: '1.0.0',
        author: 'Test',
        description: 'Test',
        commands: [{ name: 'test', title: 'Test', mode: 'view' }],
      };

      const manifest2: PluginManifest = {
        id: 'plugin2',
        name: 'Plugin 2',
        version: '1.0.0',
        author: 'Test',
        description: 'Test',
        commands: [{ name: 'test', title: 'Test', mode: 'view' }],
      };

      const plugin1: Plugin = { manifest: manifest1, onUnload: onUnload1 };
      const plugin2: Plugin = { manifest: manifest2, onUnload: onUnload2 };

      vi.mocked(PluginLoader.prototype.discoverPlugins).mockResolvedValue([manifest1, manifest2]);
      vi.mocked(PluginLoader.prototype.loadPlugin)
        .mockResolvedValueOnce(plugin1)
        .mockResolvedValueOnce(plugin2);

      const config: AppConfig = {
        plugins: {
          plugin1: { enabled: true, preferences: {} },
          plugin2: { enabled: true, preferences: {} },
        },
      };

      await registry.initialize(config);
      await registry.shutdown();

      expect(onUnload1).toHaveBeenCalled();
      expect(onUnload2).toHaveBeenCalled();
      expect(registry.getAllPlugins()).toHaveLength(0);
    });

    it('should handle onUnload errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test',
        version: '1.0.0',
        author: 'Test',
        description: 'Test',
        commands: [{ name: 'test', title: 'Test', mode: 'view' }],
      };

      const plugin: Plugin = {
        manifest,
        onUnload: vi.fn().mockRejectedValue(new Error('Unload failed')),
      };

      vi.mocked(PluginLoader.prototype.discoverPlugins).mockResolvedValue([manifest]);
      vi.mocked(PluginLoader.prototype.loadPlugin).mockResolvedValue(plugin);

      await registry.initialize(mockConfig);
      await registry.shutdown();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
