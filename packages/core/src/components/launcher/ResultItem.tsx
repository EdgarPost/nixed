import type { SearchResult } from '@nixed/sdk';

export interface ResultItemProps {
  /** Search result to display */
  result: SearchResult;
  /** Whether this item is selected */
  isSelected: boolean;
  /** Click handler */
  onClick: () => void;
}

/**
 * Single search result item
 * Displays title, subtitle, icon, and accessories
 */
export function ResultItem({ result, isSelected, onClick }: ResultItemProps) {
  return (
    <div
      className={`
        px-4 py-3 cursor-pointer transition-colors
        ${
          isSelected
            ? 'bg-blue-600 text-white'
            : 'bg-gray-800 hover:bg-gray-700 text-gray-100'
        }
      `}
      onClick={onClick}
      role="option"
      aria-selected={isSelected}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        {result.icon && (
          <div className="flex-shrink-0 text-2xl">{result.icon}</div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{result.title}</div>
          {result.subtitle && (
            <div
              className={`text-sm truncate ${
                isSelected ? 'text-blue-100' : 'text-gray-400'
              }`}
            >
              {result.subtitle}
            </div>
          )}
        </div>

        {/* Accessories */}
        {result.accessories && result.accessories.length > 0 && (
          <div className="flex items-center gap-2">
            {result.accessories.map((accessory, index) => (
              <div
                key={index}
                className={`
                  text-xs px-2 py-1 rounded
                  ${
                    isSelected
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }
                `}
                title={accessory.tooltip}
              >
                {accessory.icon && <span className="mr-1">{accessory.icon}</span>}
                {accessory.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
