import { useEffect, useState } from 'react';

export interface UseKeyboardNavigationOptions {
  /** Total number of items in the list */
  itemCount: number;
  /** Callback when Enter is pressed */
  onEnter?: (selectedIndex: number) => void;
  /** Callback when Escape is pressed */
  onEscape?: () => void;
  /** Whether keyboard navigation is enabled */
  enabled?: boolean;
}

export interface UseKeyboardNavigationReturn {
  /** Current selected index */
  selectedIndex: number;
  /** Reset selected index to 0 */
  resetSelection: () => void;
}

/**
 * Hook for keyboard navigation in a list
 * Handles Arrow Up/Down, Enter, and Escape keys
 */
export function useKeyboardNavigation({
  itemCount,
  onEnter,
  onEscape,
  enabled = true,
}: UseKeyboardNavigationOptions): UseKeyboardNavigationReturn {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selection when item count changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [itemCount]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % itemCount);
          break;

        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + itemCount) % itemCount);
          break;

        case 'Enter':
          event.preventDefault();
          if (onEnter && itemCount > 0) {
            onEnter(selectedIndex);
          }
          break;

        case 'Escape':
          event.preventDefault();
          if (onEscape) {
            onEscape();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, itemCount, selectedIndex, onEnter, onEscape]);

  const resetSelection = () => {
    setSelectedIndex(0);
  };

  return {
    selectedIndex,
    resetSelection,
  };
}
