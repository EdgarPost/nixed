import { useEffect, useRef } from 'react';
import { useDebounce } from '../../hooks/useDebounce';

export interface SearchInputProps {
  /** Current search value */
  value: string;
  /** Change handler (called immediately) */
  onChange: (value: string) => void;
  /** Debounced search handler (called after delay) */
  onSearch: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Debounce delay in milliseconds */
  debounceDelay?: number;
}

/**
 * Search input with auto-focus and debouncing
 * Includes a clear button (X) when text is present
 */
export function SearchInput({
  value,
  onChange,
  onSearch,
  placeholder = 'Search...',
  debounceDelay = 150,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedValue = useDebounce(value, debounceDelay);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Trigger search when debounced value changes
  useEffect(() => {
    onSearch(debouncedValue);
  }, [debouncedValue, onSearch]);

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full px-4 py-3 pr-10
          bg-gray-800 text-gray-100 text-lg
          border-none outline-none
          placeholder-gray-500
          focus:ring-2 focus:ring-blue-500
        "
        role="searchbox"
        aria-label="Search"
      />

      {/* Clear button */}
      {value && (
        <button
          onClick={handleClear}
          className="
            absolute right-3 top-1/2 -translate-y-1/2
            w-6 h-6 flex items-center justify-center
            text-gray-400 hover:text-gray-200
            bg-gray-700 hover:bg-gray-600
            rounded-full transition-colors
          "
          aria-label="Clear search"
          type="button"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 3L3 9M3 3L9 9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
