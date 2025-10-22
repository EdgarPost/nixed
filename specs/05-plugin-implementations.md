# Plugin Implementations Specification

## Overview

This document specifies the implementation details for the three initial plugins:
1. Calculator Plugin
2. Clipboard History Plugin
3. Web Search Plugin (Fallback)

Each plugin follows SOLID principles, is fully typed (no `any`), and has comprehensive test coverage.

---

## 1. Calculator Plugin

### Purpose
Evaluate mathematical expressions and display results instantly as the user types.

### Manifest (package.json)

```json
{
  "name": "@nixed/plugin-calculator",
  "version": "0.1.0",
  "description": "Calculator plugin for Nixed",
  "nixed": {
    "id": "calculator",
    "name": "Calculator",
    "description": "Evaluate mathematical expressions",
    "version": "0.1.0",
    "author": "Nixed Team",
    "icon": "🔢",
    "commands": [
      {
        "name": "calculate",
        "title": "Calculate",
        "description": "Evaluate mathematical expressions",
        "mode": "view",
        "shortcut": "=",
        "keywords": ["math", "calc", "calculator"]
      }
    ],
    "preferences": [
      {
        "id": "precision",
        "title": "Decimal Precision",
        "description": "Number of decimal places to show",
        "type": "number",
        "default": 6,
        "min": 0,
        "max": 15
      },
      {
        "id": "copyOnSelect",
        "title": "Copy Result on Select",
        "description": "Automatically copy result to clipboard when selected",
        "type": "checkbox",
        "default": true,
        "label": "Copy to clipboard"
      }
    ]
  },
  "dependencies": {
    "@nixed/sdk": "workspace:*",
    "mathjs": "^12.0.0"
  }
}
```

### Type Definitions

#### types/expression.types.ts

```typescript
/**
 * Evaluation result
 */
export interface EvaluationResult {
  /** Original expression */
  expression: string;

  /** Calculated result */
  result: number | string;

  /** Whether evaluation succeeded */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Result type */
  type: 'number' | 'error';
}

/**
 * Calculator preferences
 */
export interface CalculatorPreferences {
  precision: number;
  copyOnSelect: boolean;
}
```

### Implementation

#### services/expression-evaluator.ts

```typescript
import { create, all, type MathJsInstance } from 'mathjs';
import type { EvaluationResult } from '../types/expression.types';

/**
 * Expression evaluator
 * Safely evaluates mathematical expressions using mathjs
 */
export class ExpressionEvaluator {
  private math: MathJsInstance;

  constructor(private precision: number = 6) {
    // Create isolated mathjs instance with limited scope
    this.math = create(all, {
      number: 'BigNumber',
      precision: 64,
    });
  }

  /**
   * Evaluate mathematical expression
   */
  evaluate(expression: string): EvaluationResult {
    if (!expression || expression.trim().length === 0) {
      return {
        expression,
        result: '',
        success: false,
        type: 'error',
        error: 'Empty expression',
      };
    }

    try {
      // Evaluate expression
      const rawResult = this.math.evaluate(expression);

      // Format result
      const result = this.formatResult(rawResult);

      return {
        expression,
        result,
        success: true,
        type: 'number',
      };
    } catch (error) {
      return {
        expression,
        result: '',
        success: false,
        type: 'error',
        error: error instanceof Error ? error.message : 'Invalid expression',
      };
    }
  }

  /**
   * Format result with precision
   */
  private formatResult(value: unknown): string {
    if (typeof value === 'number') {
      return this.roundToPrecision(value);
    }

    if (typeof value === 'object' && value !== null && 'toString' in value) {
      const strValue = String(value);
      const numValue = parseFloat(strValue);

      if (!isNaN(numValue)) {
        return this.roundToPrecision(numValue);
      }

      return strValue;
    }

    return String(value);
  }

  /**
   * Round number to configured precision
   */
  private roundToPrecision(value: number): string {
    // Handle special cases
    if (!isFinite(value)) {
      return String(value);
    }

    // Round to precision
    const multiplier = Math.pow(10, this.precision);
    const rounded = Math.round(value * multiplier) / multiplier;

    // Format with precision, removing trailing zeros
    return rounded.toFixed(this.precision).replace(/\.?0+$/, '');
  }

  /**
   * Update precision
   */
  setPrecision(precision: number): void {
    this.precision = precision;
  }
}
```

#### index.tsx

```typescript
import type { Plugin, SearchQuery, SearchResult } from '@nixed/sdk';
import { clipboard, ui, usePreferences } from '@nixed/sdk';
import { ExpressionEvaluator } from './services/expression-evaluator';
import type { CalculatorPreferences } from './types/expression.types';

// Plugin instance
const evaluator = new ExpressionEvaluator();

const CalculatorPlugin: Plugin = {
  manifest: require('../package.json').nixed,

  onLoad: async () => {
    console.log('Calculator plugin loaded');
  },

  onSearch: (query: SearchQuery): SearchResult[] => {
    const text = query.text.trim();

    // Only show results if query looks like a calculation
    if (!text || !isCalculationQuery(text)) {
      return [];
    }

    // Evaluate expression
    const result = evaluator.evaluate(text);

    if (!result.success) {
      return [];
    }

    return [
      {
        id: 'calc-result',
        title: String(result.result),
        subtitle: `= ${text}`,
        icon: '🔢',
        accessories: [
          {
            text: 'Calculator',
            icon: '🧮',
          },
        ],
        onAction: async () => {
          // Copy result to clipboard
          await clipboard.write(String(result.result));
          ui.showToast('Result copied to clipboard', 'success');
          await ui.close();
        },
        actions: [
          {
            id: 'copy',
            title: 'Copy Result',
            icon: '📋',
            shortcut: 'Ctrl+C',
            onAction: async () => {
              await clipboard.write(String(result.result));
              ui.showToast('Result copied', 'success');
            },
          },
          {
            id: 'copy-expression',
            title: 'Copy Expression',
            icon: '📝',
            onAction: async () => {
              await clipboard.write(text);
              ui.showToast('Expression copied', 'success');
            },
          },
        ],
      },
    ];
  },
};

/**
 * Check if query looks like a calculation
 */
function isCalculationQuery(query: string): boolean {
  // Check for mathematical operators or starts with =
  const mathPattern = /[\d\+\-\*\/\(\)\^\%\.]/;
  const startsWithEquals = query.startsWith('=');

  return startsWithEquals || mathPattern.test(query);
}

export default CalculatorPlugin;
```

### Testing

#### services/expression-evaluator.test.ts

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ExpressionEvaluator } from './expression-evaluator';

describe('ExpressionEvaluator', () => {
  let evaluator: ExpressionEvaluator;

  beforeEach(() => {
    evaluator = new ExpressionEvaluator(2);
  });

  describe('basic arithmetic', () => {
    it('should evaluate addition', () => {
      const result = evaluator.evaluate('2 + 2');
      expect(result.success).toBe(true);
      expect(result.result).toBe('4');
    });

    it('should evaluate subtraction', () => {
      const result = evaluator.evaluate('10 - 3');
      expect(result.success).toBe(true);
      expect(result.result).toBe('7');
    });

    it('should evaluate multiplication', () => {
      const result = evaluator.evaluate('5 * 6');
      expect(result.success).toBe(true);
      expect(result.result).toBe('30');
    });

    it('should evaluate division', () => {
      const result = evaluator.evaluate('15 / 3');
      expect(result.success).toBe(true);
      expect(result.result).toBe('5');
    });
  });

  describe('order of operations', () => {
    it('should respect PEMDAS', () => {
      const result = evaluator.evaluate('2 + 3 * 4');
      expect(result.success).toBe(true);
      expect(result.result).toBe('14');
    });

    it('should handle parentheses', () => {
      const result = evaluator.evaluate('(2 + 3) * 4');
      expect(result.success).toBe(true);
      expect(result.result).toBe('20');
    });
  });

  describe('precision', () => {
    it('should round to configured precision', () => {
      const result = evaluator.evaluate('10 / 3');
      expect(result.success).toBe(true);
      expect(result.result).toBe('3.33');
    });

    it('should remove trailing zeros', () => {
      const result = evaluator.evaluate('4 / 2');
      expect(result.success).toBe(true);
      expect(result.result).toBe('2');
    });
  });

  describe('error handling', () => {
    it('should handle empty expression', () => {
      const result = evaluator.evaluate('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Empty expression');
    });

    it('should handle invalid expression', () => {
      const result = evaluator.evaluate('2 +');
      expect(result.success).toBe(false);
      expect(result.type).toBe('error');
    });

    it('should handle division by zero', () => {
      const result = evaluator.evaluate('5 / 0');
      expect(result.success).toBe(true);
      expect(result.result).toBe('Infinity');
    });
  });

  describe('advanced operations', () => {
    it('should handle exponentiation', () => {
      const result = evaluator.evaluate('2 ^ 8');
      expect(result.success).toBe(true);
      expect(result.result).toBe('256');
    });

    it('should handle square root', () => {
      const result = evaluator.evaluate('sqrt(16)');
      expect(result.success).toBe(true);
      expect(result.result).toBe('4');
    });

    it('should handle percentages', () => {
      const result = evaluator.evaluate('50 * 20%');
      expect(result.success).toBe(true);
      expect(result.result).toBe('10');
    });
  });
});
```

---

## 2. Clipboard History Plugin

### Purpose
Track clipboard history and allow users to search and paste previous clipboard items.

### Manifest (package.json)

```json
{
  "name": "@nixed/plugin-clipboard",
  "version": "0.1.0",
  "description": "Clipboard history plugin for Nixed",
  "nixed": {
    "id": "clipboard",
    "name": "Clipboard History",
    "description": "Access and search clipboard history",
    "version": "0.1.0",
    "author": "Nixed Team",
    "icon": "📋",
    "commands": [
      {
        "name": "search-clipboard",
        "title": "Search Clipboard History",
        "description": "Search and paste from clipboard history",
        "mode": "view",
        "shortcut": "clip",
        "keywords": ["clipboard", "copy", "paste", "history"]
      }
    ],
    "preferences": [
      {
        "id": "maxItems",
        "title": "Maximum History Items",
        "description": "Number of clipboard items to keep in history",
        "type": "number",
        "default": 100,
        "min": 10,
        "max": 1000
      },
      {
        "id": "monitorInterval",
        "title": "Monitor Interval (ms)",
        "description": "How often to check clipboard for changes",
        "type": "number",
        "default": 1000,
        "min": 500,
        "max": 5000
      }
    ]
  },
  "dependencies": {
    "@nixed/sdk": "workspace:*"
  }
}
```

### Type Definitions

#### types/clipboard.types.ts

```typescript
/**
 * Clipboard history item
 */
export interface ClipboardHistoryItem {
  /** Unique identifier */
  id: string;

  /** Clipboard content */
  content: string;

  /** Timestamp when added */
  timestamp: Date;

  /** Preview text (truncated) */
  preview: string;
}

/**
 * Clipboard preferences
 */
export interface ClipboardPreferences {
  maxItems: number;
  monitorInterval: number;
}
```

### Implementation

#### services/clipboard-monitor.ts

```typescript
import { clipboard, storage } from '@nixed/sdk';
import type { ClipboardHistoryItem } from '../types/clipboard.types';

/**
 * Clipboard monitor
 * Monitors clipboard for changes and maintains history
 */
export class ClipboardMonitor {
  private intervalId: number | null = null;
  private lastContent: string = '';
  private history: ClipboardHistoryItem[] = [];

  constructor(
    private maxItems: number = 100,
    private intervalMs: number = 1000
  ) {}

  /**
   * Start monitoring clipboard
   */
  async start(): Promise<void> {
    // Load existing history
    await this.loadHistory();

    // Start monitoring
    this.intervalId = window.setInterval(() => {
      this.checkClipboard();
    }, this.intervalMs);

    console.log('Clipboard monitor started');
  }

  /**
   * Stop monitoring clipboard
   */
  stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('Clipboard monitor stopped');
  }

  /**
   * Check clipboard for changes
   */
  private async checkClipboard(): Promise<void> {
    try {
      const content = await clipboard.read();

      // Check if content changed
      if (content && content !== this.lastContent) {
        this.addToHistory(content);
        this.lastContent = content;
      }
    } catch (error) {
      console.error('Failed to read clipboard:', error);
    }
  }

  /**
   * Add item to history
   */
  private addToHistory(content: string): void {
    // Skip if already at top of history
    if (this.history.length > 0 && this.history[0]?.content === content) {
      return;
    }

    // Create history item
    const item: ClipboardHistoryItem = {
      id: crypto.randomUUID(),
      content,
      timestamp: new Date(),
      preview: this.createPreview(content),
    };

    // Remove duplicates
    this.history = this.history.filter((h) => h.content !== content);

    // Add to front
    this.history.unshift(item);

    // Trim to max size
    if (this.history.length > this.maxItems) {
      this.history = this.history.slice(0, this.maxItems);
    }

    // Save to storage
    this.saveHistory();
  }

  /**
   * Create preview text
   */
  private createPreview(content: string, maxLength: number = 100): string {
    // Collapse whitespace
    const collapsed = content.replace(/\s+/g, ' ').trim();

    // Truncate if needed
    if (collapsed.length <= maxLength) {
      return collapsed;
    }

    return collapsed.substring(0, maxLength) + '...';
  }

  /**
   * Get history items
   */
  getHistory(): ClipboardHistoryItem[] {
    return [...this.history];
  }

  /**
   * Search history
   */
  search(query: string): ClipboardHistoryItem[] {
    if (!query) {
      return this.getHistory();
    }

    const lowerQuery = query.toLowerCase();

    return this.history.filter((item) =>
      item.content.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Clear history
   */
  async clearHistory(): Promise<void> {
    this.history = [];
    await storage.remove('history');
  }

  /**
   * Load history from storage
   */
  private async loadHistory(): Promise<void> {
    try {
      const stored = await storage.get<ClipboardHistoryItem[]>('history');

      if (stored && Array.isArray(stored)) {
        // Convert timestamp strings back to Date objects
        this.history = stored.map((item) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));

        console.log(`Loaded ${this.history.length} clipboard items`);
      }
    } catch (error) {
      console.error('Failed to load clipboard history:', error);
    }
  }

  /**
   * Save history to storage
   */
  private async saveHistory(): Promise<void> {
    try {
      await storage.set('history', this.history);
    } catch (error) {
      console.error('Failed to save clipboard history:', error);
    }
  }
}
```

#### index.tsx

```typescript
import type { Plugin, SearchQuery, SearchResult } from '@nixed/sdk';
import { clipboard, ui } from '@nixed/sdk';
import { ClipboardMonitor } from './services/clipboard-monitor';

// Plugin instance
let monitor: ClipboardMonitor | null = null;

const ClipboardPlugin: Plugin = {
  manifest: require('../package.json').nixed,

  onLoad: async () => {
    monitor = new ClipboardMonitor(100, 1000);
    await monitor.start();
    console.log('Clipboard plugin loaded');
  },

  onUnload: () => {
    if (monitor) {
      monitor.stop();
    }
    console.log('Clipboard plugin unloaded');
  },

  onSearch: (query: SearchQuery): SearchResult[] => {
    if (!monitor) {
      return [];
    }

    // Search history
    const items = monitor.search(query.text);

    // Convert to search results
    return items.map((item) => ({
      id: item.id,
      title: item.preview,
      subtitle: formatTimestamp(item.timestamp),
      icon: '📋',
      accessories: [
        {
          text: `${item.content.length} chars`,
        },
      ],
      onAction: async () => {
        // Paste item
        await clipboard.write(item.content);
        ui.showToast('Copied to clipboard', 'success');
        await ui.close();
      },
      actions: [
        {
          id: 'copy',
          title: 'Copy',
          icon: '📋',
          shortcut: 'Enter',
          onAction: async () => {
            await clipboard.write(item.content);
            ui.showToast('Copied to clipboard', 'success');
          },
        },
        {
          id: 'delete',
          title: 'Delete from History',
          icon: '🗑️',
          onAction: () => {
            ui.showToast('Delete not yet implemented', 'info');
          },
        },
      ],
    }));
  },
};

/**
 * Format timestamp for display
 */
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffMins < 1440) {
    const hours = Math.floor(diffMins / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffMins / 1440);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
}

export default ClipboardPlugin;
```

### Testing

#### services/clipboard-monitor.test.ts

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClipboardMonitor } from './clipboard-monitor';

// Mock SDK
vi.mock('@nixed/sdk', () => ({
  clipboard: {
    read: vi.fn(),
  },
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

describe('ClipboardMonitor', () => {
  let monitor: ClipboardMonitor;

  beforeEach(() => {
    vi.clearAllMocks();
    monitor = new ClipboardMonitor(5, 100);
  });

  describe('addToHistory', () => {
    it('should add new item to front of history', () => {
      monitor['addToHistory']('item1');
      monitor['addToHistory']('item2');

      const history = monitor.getHistory();

      expect(history).toHaveLength(2);
      expect(history[0]?.content).toBe('item2');
      expect(history[1]?.content).toBe('item1');
    });

    it('should not add duplicate at top', () => {
      monitor['addToHistory']('item1');
      monitor['addToHistory']('item1');

      const history = monitor.getHistory();

      expect(history).toHaveLength(1);
    });

    it('should remove duplicate from middle', () => {
      monitor['addToHistory']('item1');
      monitor['addToHistory']('item2');
      monitor['addToHistory']('item1');

      const history = monitor.getHistory();

      expect(history).toHaveLength(2);
      expect(history[0]?.content).toBe('item1');
      expect(history[1]?.content).toBe('item2');
    });

    it('should respect max items', () => {
      for (let i = 0; i < 10; i++) {
        monitor['addToHistory'](`item${i}`);
      }

      const history = monitor.getHistory();

      expect(history).toHaveLength(5); // maxItems = 5
    });
  });

  describe('search', () => {
    beforeEach(() => {
      monitor['addToHistory']('Hello World');
      monitor['addToHistory']('Goodbye World');
      monitor['addToHistory']('Testing 123');
    });

    it('should return all items for empty query', () => {
      const results = monitor.search('');
      expect(results).toHaveLength(3);
    });

    it('should filter by query', () => {
      const results = monitor.search('World');
      expect(results).toHaveLength(2);
    });

    it('should be case insensitive', () => {
      const results = monitor.search('world');
      expect(results).toHaveLength(2);
    });
  });

  describe('createPreview', () => {
    it('should return full text if short', () => {
      const preview = monitor['createPreview']('Short text');
      expect(preview).toBe('Short text');
    });

    it('should truncate long text', () => {
      const longText = 'a'.repeat(200);
      const preview = monitor['createPreview'](longText, 50);

      expect(preview).toHaveLength(53); // 50 + "..."
      expect(preview.endsWith('...')).toBe(true);
    });

    it('should collapse whitespace', () => {
      const preview = monitor['createPreview']('Hello\n\nWorld\t\tTest');
      expect(preview).toBe('Hello World Test');
    });
  });
});
```

---

## 3. Web Search Plugin

### Purpose
Fallback plugin that opens the current query in a web search engine when no other results match.

### Manifest (package.json)

```json
{
  "name": "@nixed/plugin-web-search",
  "version": "0.1.0",
  "description": "Web search fallback plugin for Nixed",
  "nixed": {
    "id": "web-search",
    "name": "Web Search",
    "description": "Search the web when no results found",
    "version": "0.1.0",
    "author": "Nixed Team",
    "icon": "🔍",
    "commands": [
      {
        "name": "web-search",
        "title": "Search Web",
        "description": "Search the web with your query",
        "mode": "no-view",
        "keywords": ["search", "google", "web"]
      }
    ],
    "preferences": [
      {
        "id": "engine",
        "title": "Search Engine",
        "description": "Default search engine to use",
        "type": "dropdown",
        "default": "google",
        "options": [
          { "label": "Google", "value": "google" },
          { "label": "DuckDuckGo", "value": "duckduckgo" },
          { "label": "Bing", "value": "bing" }
        ]
      },
      {
        "id": "alwaysShow",
        "title": "Always Show",
        "description": "Always show web search option, even with other results",
        "type": "checkbox",
        "default": true,
        "label": "Show web search option"
      }
    ]
  },
  "dependencies": {
    "@nixed/sdk": "workspace:*"
  }
}
```

### Implementation

#### index.tsx

```typescript
import type { Plugin, SearchQuery, SearchResult } from '@nixed/sdk';
import { browser, ui, usePreferences } from '@nixed/sdk';

type SearchEngine = 'google' | 'duckduckgo' | 'bing';

interface WebSearchPreferences {
  engine: SearchEngine;
  alwaysShow: boolean;
}

const WebSearchPlugin: Plugin = {
  manifest: require('../package.json').nixed,

  onSearch: (query: SearchQuery): SearchResult[] => {
    const text = query.text.trim();

    if (!text) {
      return [];
    }

    return [
      {
        id: 'web-search',
        title: `Search for "${text}"`,
        subtitle: 'Search the web',
        icon: '🔍',
        accessories: [
          {
            text: getEngineName('google'), // Would use preferences in real impl
            icon: '🌐',
          },
        ],
        onAction: async () => {
          await browser.search(text, 'google');
          ui.showToast('Opening browser...', 'info');
          await ui.close();
        },
        actions: [
          {
            id: 'google',
            title: 'Google',
            icon: '🔵',
            onAction: async () => {
              await browser.search(text, 'google');
              await ui.close();
            },
          },
          {
            id: 'duckduckgo',
            title: 'DuckDuckGo',
            icon: '🦆',
            onAction: async () => {
              await browser.search(text, 'duckduckgo');
              await ui.close();
            },
          },
          {
            id: 'bing',
            title: 'Bing',
            icon: '🔷',
            onAction: async () => {
              await browser.search(text, 'bing');
              await ui.close();
            },
          },
        ],
      },
    ];
  },
};

/**
 * Get display name for search engine
 */
function getEngineName(engine: SearchEngine): string {
  const names: Record<SearchEngine, string> = {
    google: 'Google',
    duckduckgo: 'DuckDuckGo',
    bing: 'Bing',
  };

  return names[engine];
}

export default WebSearchPlugin;
```

### Testing

#### index.test.tsx

```typescript
import { describe, it, expect, vi } from 'vitest';
import WebSearchPlugin from './index';

describe('WebSearchPlugin', () => {
  describe('onSearch', () => {
    it('should return search result for non-empty query', () => {
      const results = WebSearchPlugin.onSearch?.({
        text: 'test query',
      });

      expect(results).toHaveLength(1);
      expect(results?.[0]?.title).toContain('test query');
    });

    it('should return empty for empty query', () => {
      const results = WebSearchPlugin.onSearch?.({
        text: '',
      });

      expect(results).toHaveLength(0);
    });

    it('should provide multiple search engine actions', () => {
      const results = WebSearchPlugin.onSearch?.({
        text: 'test',
      });

      expect(results?.[0]?.actions).toHaveLength(3);
      expect(results?.[0]?.actions?.[0]?.id).toBe('google');
      expect(results?.[0]?.actions?.[1]?.id).toBe('duckduckgo');
      expect(results?.[0]?.actions?.[2]?.id).toBe('bing');
    });
  });
});
```

---

## Common Testing Patterns

### Integration Test Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { PluginLoader } from '../services/plugin-loader';

describe('Plugin Integration', () => {
  it('should load plugin successfully', async () => {
    const loader = new PluginLoader();
    const plugin = await loader.loadPlugin('plugin-id');

    expect(plugin).toBeDefined();
    expect(plugin.manifest).toBeDefined();
    expect(plugin.manifest.id).toBe('plugin-id');
  });

  it('should execute search successfully', async () => {
    const loader = new PluginLoader();
    const plugin = await loader.loadPlugin('plugin-id');

    const results = await plugin.onSearch?.({ text: 'test' });

    expect(Array.isArray(results)).toBe(true);
  });
});
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-22
**Status**: Draft for Implementation
