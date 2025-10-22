import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchEngine } from './search-engine';
import { PluginRegistry } from './plugin-registry';
import type { Plugin, PluginManifest, SearchResult } from '@nixed/sdk';
import type { RegisteredPlugin } from '../types/plugin-registry.types';

vi.mock('./plugin-registry');

describe('SearchEngine', () => {
  let searchEngine: SearchEngine;
  let mockRegistry: PluginRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRegistry = new PluginRegistry();
    searchEngine = new SearchEngine(mockRegistry);
  });

  describe('parseQuery', () => {
    it('should parse simple query without command', () => {
      vi.mocked(mockRegistry.getEnabledPlugins).mockReturnValue([]);

      const context = searchEngine.parseQuery('hello world');

      expect(context.query).toBe('hello world');
      expect(context.commandPrefix).toBeUndefined();
      expect(context.args).toBeUndefined();
      expect(context.targetPluginId).toBeUndefined();
    });

    it('should parse query with command shortcut', () => {
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test',
        version: '1.0.0',
        author: 'Test',
        description: 'Test',
        commands: [
          {
            name: 'test',
            title: 'Test',
            mode: 'view',
            shortcut: 'clip',
          },
        ],
      };

      const plugin: Plugin = { manifest };

      const registered: RegisteredPlugin = {
        manifest,
        instance: plugin,
        context: { pluginId: 'test-plugin', preferences: {}, isDevelopment: false },
        enabled: true,
        loadedAt: new Date(),
      };

      vi.mocked(mockRegistry.getEnabledPlugins).mockReturnValue([registered]);

      const context = searchEngine.parseQuery('clip foo bar');

      expect(context.query).toBe('clip foo bar');
      expect(context.commandPrefix).toBe('clip');
      expect(context.args).toBe('foo bar');
      expect(context.targetPluginId).toBe('test-plugin');
    });

    it('should be case insensitive for shortcuts', () => {
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test',
        version: '1.0.0',
        author: 'Test',
        description: 'Test',
        commands: [
          {
            name: 'test',
            title: 'Test',
            mode: 'view',
            shortcut: 'clip',
          },
        ],
      };

      const plugin: Plugin = { manifest };

      const registered: RegisteredPlugin = {
        manifest,
        instance: plugin,
        context: { pluginId: 'test-plugin', preferences: {}, isDevelopment: false },
        enabled: true,
        loadedAt: new Date(),
      };

      vi.mocked(mockRegistry.getEnabledPlugins).mockReturnValue([registered]);

      const context = searchEngine.parseQuery('CLIP test');

      expect(context.commandPrefix).toBe('CLIP');
      expect(context.args).toBe('test');
      expect(context.targetPluginId).toBe('test-plugin');
    });
  });

  describe('search', () => {
    it('should aggregate results from all enabled plugins', async () => {
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

      const result1: SearchResult = {
        id: 'result1',
        title: 'Result 1',
        onAction: vi.fn(),
      };

      const result2: SearchResult = {
        id: 'result2',
        title: 'Result 2',
        onAction: vi.fn(),
      };

      const plugin1: Plugin = {
        manifest: manifest1,
        onSearch: vi.fn().mockResolvedValue([result1]),
      };

      const plugin2: Plugin = {
        manifest: manifest2,
        onSearch: vi.fn().mockResolvedValue([result2]),
      };

      const registered1: RegisteredPlugin = {
        manifest: manifest1,
        instance: plugin1,
        context: { pluginId: 'plugin1', preferences: {}, isDevelopment: false },
        enabled: true,
        loadedAt: new Date(),
      };

      const registered2: RegisteredPlugin = {
        manifest: manifest2,
        instance: plugin2,
        context: { pluginId: 'plugin2', preferences: {}, isDevelopment: false },
        enabled: true,
        loadedAt: new Date(),
      };

      vi.mocked(mockRegistry.getEnabledPlugins).mockReturnValue([registered1, registered2]);

      const results = await searchEngine.search('test query');

      expect(results).toHaveLength(2);
      expect(plugin1.onSearch).toHaveBeenCalled();
      expect(plugin2.onSearch).toHaveBeenCalled();
    });

    it('should handle plugin search errors gracefully', async () => {
      const manifest: PluginManifest = {
        id: 'failing-plugin',
        name: 'Failing Plugin',
        version: '1.0.0',
        author: 'Test',
        description: 'Test',
        commands: [{ name: 'test', title: 'Test', mode: 'view' }],
      };

      const plugin: Plugin = {
        manifest,
        onSearch: vi.fn().mockRejectedValue(new Error('Search failed')),
      };

      const registered: RegisteredPlugin = {
        manifest,
        instance: plugin,
        context: { pluginId: 'failing-plugin', preferences: {}, isDevelopment: false },
        enabled: true,
        loadedAt: new Date(),
      };

      vi.mocked(mockRegistry.getEnabledPlugins).mockReturnValue([registered]);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const results = await searchEngine.search('test query');

      expect(results).toHaveLength(0);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should skip plugins without onSearch', async () => {
      const manifest: PluginManifest = {
        id: 'no-search-plugin',
        name: 'No Search Plugin',
        version: '1.0.0',
        author: 'Test',
        description: 'Test',
        commands: [{ name: 'test', title: 'Test', mode: 'view' }],
      };

      const plugin: Plugin = {
        manifest,
      };

      const registered: RegisteredPlugin = {
        manifest,
        instance: plugin,
        context: { pluginId: 'no-search-plugin', preferences: {}, isDevelopment: false },
        enabled: true,
        loadedAt: new Date(),
      };

      vi.mocked(mockRegistry.getEnabledPlugins).mockReturnValue([registered]);

      const results = await searchEngine.search('test query');

      expect(results).toHaveLength(0);
    });
  });

  describe('ranking', () => {
    it('should rank exact matches highest', async () => {
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test',
        version: '1.0.0',
        author: 'Test',
        description: 'Test',
        commands: [{ name: 'test', title: 'Test', mode: 'view' }],
      };

      const exactMatch: SearchResult = {
        id: 'exact',
        title: 'test',
        onAction: vi.fn(),
      };

      const containsMatch: SearchResult = {
        id: 'contains',
        title: 'this is a test',
        onAction: vi.fn(),
      };

      const plugin: Plugin = {
        manifest,
        onSearch: vi.fn().mockResolvedValue([containsMatch, exactMatch]),
      };

      const registered: RegisteredPlugin = {
        manifest,
        instance: plugin,
        context: { pluginId: 'test-plugin', preferences: {}, isDevelopment: false },
        enabled: true,
        loadedAt: new Date(),
      };

      vi.mocked(mockRegistry.getEnabledPlugins).mockReturnValue([registered]);

      const results = await searchEngine.search('test');

      expect(results[0]!.id).toBe('exact');
      expect(results[0]!.score).toBeGreaterThan(results[1]!.score);
    });

    it('should rank starts-with matches higher than contains', async () => {
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test',
        version: '1.0.0',
        author: 'Test',
        description: 'Test',
        commands: [{ name: 'test', title: 'Test', mode: 'view' }],
      };

      const startsWithMatch: SearchResult = {
        id: 'starts',
        title: 'test something',
        onAction: vi.fn(),
      };

      const containsMatch: SearchResult = {
        id: 'contains',
        title: 'this is a test',
        onAction: vi.fn(),
      };

      const plugin: Plugin = {
        manifest,
        onSearch: vi.fn().mockResolvedValue([containsMatch, startsWithMatch]),
      };

      const registered: RegisteredPlugin = {
        manifest,
        instance: plugin,
        context: { pluginId: 'test-plugin', preferences: {}, isDevelopment: false },
        enabled: true,
        loadedAt: new Date(),
      };

      vi.mocked(mockRegistry.getEnabledPlugins).mockReturnValue([registered]);

      const results = await searchEngine.search('test');

      expect(results[0]!.id).toBe('starts');
      expect(results[0]!.score).toBeGreaterThan(results[1]!.score);
    });

    it('should sort by priority when scores are equal', async () => {
      const calculatorManifest: PluginManifest = {
        id: 'calculator',
        name: 'Calculator',
        version: '1.0.0',
        author: 'Test',
        description: 'Test',
        commands: [{ name: 'test', title: 'Test', mode: 'view' }],
      };

      const webSearchManifest: PluginManifest = {
        id: 'web-search',
        name: 'Web Search',
        version: '1.0.0',
        author: 'Test',
        description: 'Test',
        commands: [{ name: 'test', title: 'Test', mode: 'view' }],
      };

      const calcResult: SearchResult = {
        id: 'calc',
        title: 'test',
        onAction: vi.fn(),
      };

      const webResult: SearchResult = {
        id: 'web',
        title: 'test',
        onAction: vi.fn(),
      };

      const calcPlugin: Plugin = {
        manifest: calculatorManifest,
        onSearch: vi.fn().mockResolvedValue([calcResult]),
      };

      const webPlugin: Plugin = {
        manifest: webSearchManifest,
        onSearch: vi.fn().mockResolvedValue([webResult]),
      };

      const registered1: RegisteredPlugin = {
        manifest: calculatorManifest,
        instance: calcPlugin,
        context: { pluginId: 'calculator', preferences: {}, isDevelopment: false },
        enabled: true,
        loadedAt: new Date(),
      };

      const registered2: RegisteredPlugin = {
        manifest: webSearchManifest,
        instance: webPlugin,
        context: { pluginId: 'web-search', preferences: {}, isDevelopment: false },
        enabled: true,
        loadedAt: new Date(),
      };

      vi.mocked(mockRegistry.getEnabledPlugins).mockReturnValue([registered2, registered1]);

      const results = await searchEngine.search('test');

      expect(results[0]!.pluginId).toBe('calculator');
      expect(results[0]!.priority).toBeGreaterThan(results[1]!.priority);
    });
  });
});
