import { invoke } from '../internal/ipc';

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
