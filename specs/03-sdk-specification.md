# Plugin SDK Specification

## Overview

The `@nixed/sdk` package provides a type-safe TypeScript API for plugin developers to interact with the Nixed core system without exposing Tauri internals.

## Design Principles

### Single Responsibility Principle (SRP)
- Each SDK module handles one domain (clipboard, storage, UI, etc.)
- Clear separation between API surface and internal implementation

### Interface Segregation Principle (ISP)
- Plugins import only what they need
- Separate interfaces for different capabilities

### Dependency Inversion Principle (DIP)
- Plugins depend on SDK abstractions, not Tauri
- SDK implementation can change without breaking plugins

## Package Structure

```
packages/sdk/
├── src/
│   ├── index.ts                    # Main exports
│   ├── types/
│   │   ├── plugin.types.ts         # Plugin interface
│   │   ├── manifest.types.ts       # Manifest schema
│   │   ├── preferences.types.ts    # Preference definitions
│   │   ├── search.types.ts         # Search results
│   │   └── index.ts                # Type exports
│   ├── api/
│   │   ├── clipboard.ts            # Clipboard API
│   │   ├── storage.ts              # Storage API
│   │   ├── ui.ts                   # UI utilities
│   │   ├── browser.ts              # Browser operations
│   │   └── index.ts                # API exports
│   ├── hooks/
│   │   ├── use-preferences.ts      # Preferences hook
│   │   ├── use-storage.ts          # Storage hook
│   │   └── index.ts                # Hook exports
│   └── internal/
│       ├── ipc.ts                  # Tauri IPC wrapper
│       └── context.ts              # Plugin context
├── package.json
├── tsconfig.json
└── README.md
```

## Type Definitions

### types/manifest.types.ts

```typescript
/**
 * Plugin manifest schema
 * Defines metadata and configuration for a plugin
 */
export interface PluginManifest {
  /** Unique plugin identifier (kebab-case) */
  id: string;

  /** Human-readable plugin name */
  name: string;

  /** Brief description of plugin functionality */
  description: string;

  /** Plugin version (semver) */
  version: string;

  /** Plugin author */
  author: string;

  /** Icon (emoji or path to icon file) */
  icon?: string;

  /** Commands exposed by this plugin */
  commands: PluginCommand[];

  /** Configuration preferences */
  preferences?: PluginPreference[];

  /** Minimum Nixed version required */
  minNixedVersion?: string;
}

/**
 * Plugin command definition
 */
export interface PluginCommand {
  /** Unique command identifier within plugin */
  name: string;

  /** Human-readable command title */
  title: string;

  /** Command description */
  description?: string;

  /** Text shortcut to trigger this command (e.g., "clip", "calc") */
  shortcut?: string;

  /** Command execution mode */
  mode: 'view' | 'no-view';

  /** Keywords for search matching */
  keywords?: string[];
}

/**
 * Command execution modes
 * - view: Shows UI component
 * - no-view: Executes in background
 */
export type CommandMode = 'view' | 'no-view';
```

### types/preferences.types.ts

```typescript
/**
 * Base preference definition
 */
interface BasePreference {
  /** Unique preference identifier */
  id: string;

  /** Human-readable title */
  title: string;

  /** Detailed description */
  description: string;

  /** Whether this preference is required */
  required?: boolean;
}

/**
 * Text input preference
 */
export interface TextPreference extends BasePreference {
  type: 'text';
  default?: string;
  placeholder?: string;
}

/**
 * Password input preference
 */
export interface PasswordPreference extends BasePreference {
  type: 'password';
  default?: string;
}

/**
 * Checkbox preference
 */
export interface CheckboxPreference extends BasePreference {
  type: 'checkbox';
  default?: boolean;
  label: string;
}

/**
 * Dropdown preference
 */
export interface DropdownPreference extends BasePreference {
  type: 'dropdown';
  default?: string;
  options: Array<{ label: string; value: string }>;
}

/**
 * Number input preference
 */
export interface NumberPreference extends BasePreference {
  type: 'number';
  default?: number;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Union type for all preference types
 */
export type PluginPreference =
  | TextPreference
  | PasswordPreference
  | CheckboxPreference
  | DropdownPreference
  | NumberPreference;

/**
 * Type-safe preference value getter
 */
export type PreferenceValue<T extends PluginPreference> = T extends TextPreference
  ? string
  : T extends PasswordPreference
  ? string
  : T extends CheckboxPreference
  ? boolean
  : T extends DropdownPreference
  ? string
  : T extends NumberPreference
  ? number
  : never;
```

### types/search.types.ts

```typescript
/**
 * Search result returned by plugin
 */
export interface SearchResult {
  /** Unique result identifier */
  id: string;

  /** Primary result text */
  title: string;

  /** Secondary result text */
  subtitle?: string;

  /** Icon (emoji or path) */
  icon?: string;

  /** Accessories (metadata shown on right) */
  accessories?: SearchResultAccessory[];

  /** Action to execute when selected */
  onAction: () => void | Promise<void>;

  /** Additional actions (shown on right-arrow) */
  actions?: SearchResultAction[];
}

/**
 * Search result accessory (metadata badge)
 */
export interface SearchResultAccessory {
  /** Accessory text */
  text: string;

  /** Optional icon */
  icon?: string;

  /** Tooltip on hover */
  tooltip?: string;
}

/**
 * Additional action for a search result
 */
export interface SearchResultAction {
  /** Unique action identifier */
  id: string;

  /** Action title */
  title: string;

  /** Action icon */
  icon?: string;

  /** Keyboard shortcut */
  shortcut?: string;

  /** Action handler */
  onAction: () => void | Promise<void>;
}

/**
 * Search query context
 */
export interface SearchQuery {
  /** Raw search text */
  text: string;

  /** Parsed command (if using shortcut) */
  command?: string;

  /** Arguments after command */
  args?: string;
}
```

### types/plugin.types.ts

```typescript
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
```

## API Modules

### api/clipboard.ts

```typescript
import { invoke } from './internal/ipc';

/**
 * Clipboard history item
 */
export interface ClipboardItem {
  id: string;
  content: string;
  timestamp: string;
}

/**
 * Clipboard API
 * Provides access to system clipboard and history
 */
export const clipboard = {
  /**
   * Read current clipboard content
   * @returns Current clipboard text
   * @throws Error if clipboard access fails
   */
  async read(): Promise<string> {
    return invoke<string>('clipboard_read');
  },

  /**
   * Write text to clipboard
   * @param text - Text to write
   * @throws Error if clipboard write fails
   */
  async write(text: string): Promise<void> {
    return invoke<void>('clipboard_write', { text });
  },

  /**
   * Get clipboard history
   * @returns Array of clipboard history items (newest first)
   */
  async history(): Promise<ClipboardItem[]> {
    return invoke<ClipboardItem[]>('clipboard_history');
  },

  /**
   * Clear clipboard history
   */
  async clearHistory(): Promise<void> {
    return invoke<void>('clipboard_clear_history');
  },
} as const;
```

### api/storage.ts

```typescript
import { invoke } from './internal/ipc';
import { getPluginId } from './internal/context';

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
```

### api/browser.ts

```typescript
import { invoke } from './internal/ipc';

/**
 * Browser API
 * Provides browser operations
 */
export const browser = {
  /**
   * Open URL in default browser
   * @param url - URL to open
   * @throws Error if URL is invalid or opening fails
   */
  async open(url: string): Promise<void> {
    // Validate URL
    try {
      new URL(url);
    } catch {
      throw new Error(`Invalid URL: ${url}`);
    }

    return invoke<void>('open_url', { url });
  },

  /**
   * Open search query in default search engine
   * @param query - Search query
   * @param engine - Search engine ('google' | 'duckduckgo' | 'bing')
   */
  async search(
    query: string,
    engine: 'google' | 'duckduckgo' | 'bing' = 'google'
  ): Promise<void> {
    const encodedQuery = encodeURIComponent(query);

    const urls = {
      google: `https://www.google.com/search?q=${encodedQuery}`,
      duckduckgo: `https://duckduckgo.com/?q=${encodedQuery}`,
      bing: `https://www.bing.com/search?q=${encodedQuery}`,
    };

    return this.open(urls[engine]);
  },
} as const;
```

### api/ui.ts

```typescript
import { invoke } from './internal/ipc';

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
```

## React Hooks

### hooks/use-preferences.ts

```typescript
import { useContext } from 'react';
import { PluginContext } from '../types';
import { PreferenceValue, PluginPreference } from '../types/preferences.types';

/**
 * Hook to access plugin preferences
 * @returns Plugin preferences object
 */
export function usePreferences<T extends Record<string, PluginPreference>>(): {
  [K in keyof T]: PreferenceValue<T[K]>;
} {
  const context = useContext(PluginContextReact);

  if (!context) {
    throw new Error('usePreferences must be used within a PluginProvider');
  }

  return context.preferences as never;
}

/**
 * Hook to access a specific preference
 * @param key - Preference key
 * @returns Preference value
 */
export function usePreference<T>(key: string): T {
  const preferences = usePreferences();
  return preferences[key] as T;
}
```

### hooks/use-storage.ts

```typescript
import { useState, useEffect, useCallback } from 'react';
import { storage } from '../api/storage';

/**
 * Hook to use plugin storage with React state
 * @param key - Storage key
 * @param defaultValue - Default value if not found
 * @returns [value, setValue, isLoading]
 */
export function useStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => Promise<void>, boolean] {
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    storage
      .get<T>(key)
      .then((stored) => {
        if (mounted) {
          setValue(stored ?? defaultValue);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        console.error(`Failed to load storage key "${key}":`, error);
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [key, defaultValue]);

  const updateValue = useCallback(
    async (newValue: T) => {
      setValue(newValue);
      await storage.set(key, newValue);
    },
    [key]
  );

  return [value, updateValue, isLoading];
}
```

## Internal Modules

### internal/ipc.ts

```typescript
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
```

### internal/context.ts

```typescript
import { createContext } from 'react';
import type { PluginContext } from '../types';

/**
 * Plugin context (React)
 */
export const PluginContextReact = createContext<PluginContext | null>(null);

/**
 * Current plugin ID (set by plugin loader)
 */
let currentPluginId: string | null = null;

/**
 * Set current plugin ID
 * @internal Called by plugin loader
 */
export function setPluginId(id: string): void {
  currentPluginId = id;
}

/**
 * Get current plugin ID
 * @internal Used by SDK APIs
 */
export function getPluginId(): string {
  if (!currentPluginId) {
    throw new Error('Plugin ID not set. Ensure plugin is properly loaded.');
  }
  return currentPluginId;
}
```

## Main Export

### index.ts

```typescript
// Type exports
export type {
  Plugin,
  PluginContext,
  PluginManifest,
  PluginCommand,
  PluginPreference,
  SearchResult,
  SearchQuery,
  SearchResultAccessory,
  SearchResultAction,
  ClipboardItem,
  ToastType,
} from './types';

// API exports
export { clipboard } from './api/clipboard';
export { storage } from './api/storage';
export { browser } from './api/browser';
export { ui } from './api/ui';

// Hook exports
export { usePreferences, usePreference } from './hooks/use-preferences';
export { useStorage } from './hooks/use-storage';

// Context exports
export { PluginContextReact } from './internal/context';
```

## Package Configuration

### package.json

```json
{
  "name": "@nixed/sdk",
  "version": "0.1.0",
  "description": "Plugin SDK for Nixed launcher",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.0.0",
    "react": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "tsup": "^8.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0"
  },
  "peerDependencies": {
    "react": "^18.0.0"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": false,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Testing Requirements

### Unit Tests

All SDK functions must have unit tests covering:
- Happy path
- Error cases
- Edge cases
- Type safety

### Example Test (api/storage.test.ts)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storage } from './storage';
import * as ipc from '../internal/ipc';
import * as context from '../internal/context';

vi.mock('../internal/ipc');
vi.mock('../internal/context');

describe('storage API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(context.getPluginId).mockReturnValue('test-plugin');
  });

  describe('get', () => {
    it('should retrieve and parse JSON value', async () => {
      const testData = { foo: 'bar' };
      vi.mocked(ipc.invoke).mockResolvedValue(JSON.stringify(testData));

      const result = await storage.get('test-key');

      expect(result).toEqual(testData);
      expect(ipc.invoke).toHaveBeenCalledWith('storage_get', {
        pluginId: 'test-plugin',
        key: 'test-key',
      });
    });

    it('should return null if value not found', async () => {
      vi.mocked(ipc.invoke).mockResolvedValue(null);

      const result = await storage.get('missing-key');

      expect(result).toBeNull();
    });

    it('should handle string values', async () => {
      vi.mocked(ipc.invoke).mockResolvedValue('plain string');

      const result = await storage.get('text-key');

      expect(result).toBe('plain string');
    });
  });

  describe('set', () => {
    it('should serialize and store object value', async () => {
      const testData = { foo: 'bar' };

      await storage.set('test-key', testData);

      expect(ipc.invoke).toHaveBeenCalledWith('storage_set', {
        pluginId: 'test-plugin',
        key: 'test-key',
        value: JSON.stringify(testData),
      });
    });

    it('should store string value directly', async () => {
      await storage.set('test-key', 'plain string');

      expect(ipc.invoke).toHaveBeenCalledWith('storage_set', {
        pluginId: 'test-plugin',
        key: 'test-key',
        value: 'plain string',
      });
    });
  });
});
```

## API Documentation

Each exported function and type must have:
- TSDoc comments
- Parameter descriptions
- Return value description
- Example usage
- Error conditions

---

**Document Version**: 1.0
**Last Updated**: 2025-10-22
**Status**: Draft for Implementation
