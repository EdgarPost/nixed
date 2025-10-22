import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { SearchResult } from '@nixed/sdk';
import { PluginContextReact } from '@nixed/sdk';
import { SearchInput } from './SearchInput';
import { SearchResults } from './SearchResults';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';

/**
 * Main launcher window component
 * Provides search input, results display, and keyboard navigation
 */
export function LauncherWindow() {
  const [searchValue, setSearchValue] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  // Plugin context configuration
  const pluginContext = {
    pluginId: 'nixed.launcher',
    preferences: {},
    isDevelopment: import.meta.env.DEV,
  };

  // Handle search query
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    try {
      // TODO: Call Tauri command to search plugins
      // For now, create mock results
      const mockResults: SearchResult[] = [
        {
          id: '1',
          title: 'Example Result',
          subtitle: 'This is a placeholder result',
          icon: '🔍',
          onAction: async () => {
            console.log('Action executed');
          },
        },
      ];
      setResults(mockResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    }
  }, []);

  // Execute selected result action
  const executeAction = useCallback(
    async (selectedIndex: number) => {
      const result = results[selectedIndex];
      if (result && result.onAction) {
        try {
          await result.onAction();
          // Close window after action
          await invoke('close_launcher');
        } catch (error) {
          console.error('Action execution error:', error);
        }
      }
    },
    [results]
  );

  // Handle Escape to close window
  const handleEscape = useCallback(async () => {
    try {
      await invoke('close_launcher');
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  }, []);

  // Keyboard navigation
  const { selectedIndex } = useKeyboardNavigation({
    itemCount: results.length,
    onEnter: executeAction,
    onEscape: handleEscape,
    enabled: results.length > 0,
  });

  // Handle result selection (click or Enter)
  const handleSelectResult = useCallback(
    async (result: SearchResult) => {
      if (result.onAction) {
        try {
          await result.onAction();
          // Close window after action
          await invoke('close_launcher');
        } catch (error) {
          console.error('Action execution error:', error);
        }
      }
    },
    []
  );

  return (
    <PluginContextReact.Provider value={pluginContext}>
      <div className="min-h-screen bg-gray-900 flex items-start justify-center pt-32">
        <div className="w-full max-w-2xl bg-gray-800 rounded-lg shadow-2xl overflow-hidden">
          {/* Search Input */}
          <SearchInput
            value={searchValue}
            onChange={setSearchValue}
            onSearch={handleSearch}
            placeholder="Search for apps, files, and more..."
          />

          {/* Search Results */}
          <SearchResults
            results={results}
            selectedIndex={selectedIndex}
            onSelectResult={handleSelectResult}
          />
        </div>
      </div>
    </PluginContextReact.Provider>
  );
}
