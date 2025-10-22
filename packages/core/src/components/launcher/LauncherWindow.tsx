import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { SearchResult } from '@nixed/sdk';
import { SearchInput } from './SearchInput';
import { SearchResults } from './SearchResults';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import { useDebounce } from '../../hooks/useDebounce';
import { usePluginSystem } from '../../contexts/plugin-context';

/**
 * Main launcher window component
 * Provides search input, results display, and keyboard navigation
 */
export function LauncherWindow() {
  const [searchValue, setSearchValue] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  // Get plugin system
  const { searchEngine, ready } = usePluginSystem();

  // Debounce search query
  const debouncedQuery = useDebounce(searchValue, 300);

  // Perform search when debounced query changes
  useEffect(() => {
    if (!ready) {
      return;
    }

    const performSearch = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        return;
      }

      try {
        const searchResults = await searchEngine.search(debouncedQuery);
        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      }
    };

    performSearch();
  }, [debouncedQuery, searchEngine, ready]);

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
    <div className="min-h-screen bg-gray-900 flex items-start justify-center pt-32">
      <div className="w-full max-w-2xl bg-gray-800 rounded-lg shadow-2xl overflow-hidden">
        {/* Search Input */}
        <SearchInput
          value={searchValue}
          onChange={setSearchValue}
          onSearch={() => {}} // Search is handled by useEffect
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
  );
}
