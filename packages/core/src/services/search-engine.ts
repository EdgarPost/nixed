import type { SearchQuery } from '@nixed/sdk';
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
  parseQuery(queryText: string): SearchContext {
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
   * SIMPLIFIED: Start with exact and substring matching only
   * Add fuzzy search later if needed
   */
  private calculateTextScore(result: RankedSearchResult, context: SearchContext): number {
    const query = (context.args || context.query).toLowerCase();

    if (!query) {
      return 1.0;
    }

    const title = result.title.toLowerCase();
    const subtitle = result.subtitle?.toLowerCase() || '';

    // Exact match (highest score)
    if (title === query) {
      return 1.0;
    }

    // Starts with (high score)
    if (title.startsWith(query)) {
      return 0.9;
    }

    // Contains (medium score)
    if (title.includes(query)) {
      return 0.7;
    }

    // Subtitle match (lower score)
    if (subtitle.includes(query)) {
      return 0.5;
    }

    // No match
    return 0.0;
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
