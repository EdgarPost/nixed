import type { SearchResult } from '@nixed/sdk';
import { ResultItem } from './ResultItem';

export interface SearchResultsProps {
  /** Array of search results to display */
  results: SearchResult[];
  /** Index of the selected result */
  selectedIndex: number;
  /** Handler when a result is clicked or selected */
  onSelectResult: (result: SearchResult) => void;
}

/**
 * List of search results
 * Shows "No results" when empty
 */
export function SearchResults({
  results,
  selectedIndex,
  onSelectResult,
}: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-gray-500">
        No results found
      </div>
    );
  }

  return (
    <div className="overflow-y-auto max-h-96" role="listbox">
      <div className="divide-y divide-gray-700">
        {results.map((result, index) => (
          <ResultItem
            key={result.id}
            result={result}
            isSelected={index === selectedIndex}
            onClick={() => onSelectResult(result)}
          />
        ))}
      </div>
    </div>
  );
}
