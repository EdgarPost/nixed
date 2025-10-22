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
