import type { Plugin, SearchQuery, SearchResult } from '@nixed/sdk';
import { browser, ui } from '@nixed/sdk';

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
