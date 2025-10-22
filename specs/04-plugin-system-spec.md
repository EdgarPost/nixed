# Plugin System Specification

## Overview

The plugin system is responsible for discovering, loading, managing, and executing plugins. It provides isolation between plugins while enabling them to extend Nixed functionality.

## Design Principles

### Single Responsibility Principle (SRP)
- PluginLoader: Discovers and loads plugins
- PluginRegistry: Maintains plugin state
- SearchEngine: Aggregates and ranks search results
- Each component has one reason to change

### Open/Closed Principle (OCP)
- New plugins can be added without modifying core code
- Plugin interface allows extension without modification

### Liskov Substitution Principle (LSP)
- All plugins are interchangeable via Plugin interface
- Any plugin can be enabled/disabled without breaking system

### Dependency Inversion Principle (DIP)
- Core depends on Plugin interface, not concrete plugins
- Plugins depend on SDK abstractions, not core internals

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Plugin System                         │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    Plugin    │  │    Plugin    │  │    Search    │  │
│  │    Loader    │─▶│   Registry   │◀─│    Engine    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                  │                  │          │
│         │                  ▼                  │          │
│         │          ┌──────────────┐           │          │
│         └─────────▶│   Plugins    │◀──────────┘          │
│                    │  (instances) │                      │
│                    └──────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

## Type Definitions

### types/plugin-registry.types.ts

```typescript
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
```

### types/search.types.ts

```typescript
import type { SearchResult } from '@nixed/sdk';

/**
 * Search result with metadata
 */
export interface RankedSearchResult extends SearchResult {
  /** Plugin ID that provided this result */
  pluginId: string;

  /** Relevance score (0-1) */
  score: number;

  /** Result priority (higher = shown first) */
  priority: number;
}

/**
 * Search context
 */
export interface SearchContext {
  /** Raw query text */
  query: string;

  /** Detected command prefix (e.g., "clip" from "clip foo") */
  commandPrefix?: string;

  /** Arguments after command */
  args?: string;

  /** Target plugin ID (if command prefix matched) */
  targetPluginId?: string;
}
```

## Core Components

### services/plugin-loader.ts

```typescript
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
   * Dynamically imports the plugin module and instantiates it
   */
  async loadPlugin(pluginId: string): Promise<Plugin> {
    try {
      // Dynamic import based on plugin ID
      // This assumes plugins are bundled with the app
      const module = await import(`../../plugins/${pluginId}/src/index`);

      // Plugin should export default Plugin instance
      const plugin = module.default as Plugin;

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
   * In production, this would read from a generated manifest file
   */
  private async getEmbeddedPluginMetadata(): Promise<PluginManifest[]> {
    // This would be generated at build time
    // For now, manually list plugins
    const pluginIds = ['clipboard', 'calculator', 'web-search'];

    const manifests: PluginManifest[] = [];

    for (const id of pluginIds) {
      try {
        const pkg = await import(`../../plugins/${id}/package.json`);
        if (pkg.nixed) {
          manifests.push(pkg.nixed as PluginManifest);
        }
      } catch (error) {
        console.warn(`Failed to load manifest for plugin "${id}":`, error);
      }
    }

    return manifests;
  }
}
```

### services/plugin-registry.ts

```typescript
import type { Plugin, PluginContext } from '@nixed/sdk';
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
}
```

### services/search-engine.ts

```typescript
import type { SearchQuery, SearchResult } from '@nixed/sdk';
import type { SearchContext, RankedSearchResult } from '../types/search.types';
import { PluginRegistry } from './plugin-registry';

/**
 * Search engine
 * Aggregates and ranks search results from plugins
 */
export class SearchEngine {
  constructor(private registry: PluginRegistry) {}

  /**
   * Search across all enabled plugins
   */
  async search(queryText: string): Promise<RankedSearchResult[]> {
    // Parse query into context
    const context = this.parseQuery(queryText);

    // Get target plugins
    const plugins = context.targetPluginId
      ? [this.registry.getPlugin(context.targetPluginId)].filter(
          (p): p is NonNullable<typeof p> => p !== undefined && p.enabled && !p.error
        )
      : this.registry.getEnabledPlugins();

    // Query each plugin
    const resultPromises = plugins.map(async (plugin) => {
      try {
        if (!plugin.instance.onSearch) {
          return [];
        }

        const query: SearchQuery = {
          text: context.args || context.query,
          command: context.commandPrefix,
          args: context.args,
        };

        const results = await plugin.instance.onSearch(query);

        // Add metadata
        return results.map((result) => ({
          ...result,
          pluginId: plugin.manifest.id,
          score: 0, // Will be calculated
          priority: 0, // Will be calculated
        }));
      } catch (error) {
        console.error(`Plugin "${plugin.manifest.id}" search failed:`, error);
        return [];
      }
    });

    const allResults = (await Promise.all(resultPromises)).flat();

    // Rank and sort results
    return this.rankResults(allResults, context);
  }

  /**
   * Parse query text into search context
   */
  private parseQuery(queryText: string): SearchContext {
    const query = queryText.trim();

    // Check for command prefix (e.g., "clip foo" -> command="clip", args="foo")
    const parts = query.split(/\s+/);
    const firstWord = parts[0];

    if (!firstWord) {
      return { query };
    }

    // Find plugin with matching shortcut
    const plugins = this.registry.getEnabledPlugins();

    for (const plugin of plugins) {
      for (const command of plugin.manifest.commands) {
        if (command.shortcut === firstWord.toLowerCase()) {
          return {
            query,
            commandPrefix: firstWord,
            args: parts.slice(1).join(' '),
            targetPluginId: plugin.manifest.id,
          };
        }
      }
    }

    // No command match
    return { query };
  }

  /**
   * Rank search results
   */
  private rankResults(
    results: RankedSearchResult[],
    context: SearchContext
  ): RankedSearchResult[] {
    // Calculate scores
    for (const result of results) {
      // Base score from text matching
      result.score = this.calculateTextScore(result, context);

      // Priority based on plugin
      result.priority = this.getPluginPriority(result.pluginId);
    }

    // Sort by priority (desc) then score (desc)
    return results.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return b.score - a.score;
    });
  }

  /**
   * Calculate text matching score
   */
  private calculateTextScore(result: RankedSearchResult, context: SearchContext): number {
    const query = (context.args || context.query).toLowerCase();

    if (!query) {
      return 1.0;
    }

    const title = result.title.toLowerCase();
    const subtitle = result.subtitle?.toLowerCase() || '';

    // Exact match
    if (title === query) {
      return 1.0;
    }

    // Starts with
    if (title.startsWith(query)) {
      return 0.9;
    }

    // Contains
    if (title.includes(query)) {
      return 0.7;
    }

    // Subtitle match
    if (subtitle.includes(query)) {
      return 0.5;
    }

    // Fuzzy match (basic implementation)
    const fuzzyScore = this.fuzzyMatch(query, title);
    return fuzzyScore * 0.3;
  }

  /**
   * Simple fuzzy matching
   */
  private fuzzyMatch(query: string, text: string): number {
    let queryIndex = 0;
    let textIndex = 0;
    let matches = 0;

    while (queryIndex < query.length && textIndex < text.length) {
      if (query[queryIndex] === text[textIndex]) {
        matches++;
        queryIndex++;
      }
      textIndex++;
    }

    return matches / query.length;
  }

  /**
   * Get plugin priority
   * Higher priority plugins appear first
   */
  private getPluginPriority(pluginId: string): number {
    // Priority order:
    // 1. Specific command plugins (calculator, clipboard)
    // 2. General plugins
    // 3. Fallback plugins (web search)

    const priorityMap: Record<string, number> = {
      calculator: 100,
      clipboard: 90,
      'web-search': 10,
    };

    return priorityMap[pluginId] || 50;
  }
}
```

## React Integration

### components/plugin-provider.tsx

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { PluginRegistry } from '../services/plugin-registry';
import { SearchEngine } from '../services/search-engine';
import type { AppConfig } from '../types/config.types';

interface PluginSystemContext {
  registry: PluginRegistry;
  searchEngine: SearchEngine;
  ready: boolean;
}

const PluginSystemContext = createContext<PluginSystemContext | null>(null);

interface PluginProviderProps {
  config: AppConfig;
  children: React.ReactNode;
}

/**
 * Plugin system provider
 * Initializes and provides plugin system to React components
 */
export function PluginProvider({ config, children }: PluginProviderProps): React.JSX.Element {
  const [context, setContext] = useState<PluginSystemContext | null>(null);

  useEffect(() => {
    const registry = new PluginRegistry();
    const searchEngine = new SearchEngine(registry);

    registry
      .initialize(config)
      .then(() => {
        setContext({
          registry,
          searchEngine,
          ready: true,
        });
      })
      .catch((error) => {
        console.error('Failed to initialize plugin system:', error);
      });
  }, [config]);

  if (!context) {
    return <div>Loading plugins...</div>;
  }

  return (
    <PluginSystemContext.Provider value={context}>
      {children}
    </PluginSystemContext.Provider>
  );
}

/**
 * Hook to access plugin system
 */
export function usePluginSystem(): PluginSystemContext {
  const context = useContext(PluginSystemContext);

  if (!context) {
    throw new Error('usePluginSystem must be used within PluginProvider');
  }

  return context;
}
```

## Testing Requirements

### Unit Tests

#### plugin-loader.test.ts

```typescript
import { describe, it, expect } from 'vitest';
import { PluginLoader } from './plugin-loader';

describe('PluginLoader', () => {
  describe('validateManifest', () => {
    it('should accept valid manifest', () => {
      const loader = new PluginLoader();
      const manifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        author: 'Test Author',
        description: 'Test description',
        commands: [
          {
            name: 'test-command',
            title: 'Test Command',
            mode: 'view' as const,
          },
        ],
      };

      expect(() => loader['validateManifest'](manifest)).not.toThrow();
    });

    it('should reject manifest without id', () => {
      const loader = new PluginLoader();
      const manifest = {
        name: 'Test Plugin',
        version: '1.0.0',
      } as never;

      expect(() => loader['validateManifest'](manifest)).toThrow('must have a valid id');
    });

    it('should reject manifest without commands', () => {
      const loader = new PluginLoader();
      const manifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        commands: [],
      } as never;

      expect(() => loader['validateManifest'](manifest)).toThrow('at least one command');
    });
  });
});
```

### Integration Tests

Test full plugin loading flow:
- Discover plugins
- Load plugin modules
- Initialize plugin registry
- Execute searches across plugins

---

**Document Version**: 1.0
**Last Updated**: 2025-10-22
**Status**: Draft for Implementation
