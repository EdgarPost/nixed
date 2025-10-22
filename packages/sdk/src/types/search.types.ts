/**
 * Search result returned by plugin
 */
export interface SearchResult {
  /** Unique result identifier */
  id: string;

  /** Primary result text */
  title: string;

  /** Secondary result text */
  subtitle?: string;

  /** Icon (emoji or path) */
  icon?: string;

  /** Accessories (metadata shown on right) */
  accessories?: SearchResultAccessory[];

  /** Action to execute when selected */
  onAction: () => void | Promise<void>;

  /** Additional actions (shown on right-arrow) */
  actions?: SearchResultAction[];
}

/**
 * Search result accessory (metadata badge)
 */
export interface SearchResultAccessory {
  /** Accessory text */
  text: string;

  /** Optional icon */
  icon?: string;

  /** Tooltip on hover */
  tooltip?: string;
}

/**
 * Additional action for a search result
 */
export interface SearchResultAction {
  /** Unique action identifier */
  id: string;

  /** Action title */
  title: string;

  /** Action icon */
  icon?: string;

  /** Keyboard shortcut */
  shortcut?: string;

  /** Action handler */
  onAction: () => void | Promise<void>;
}

/**
 * Search query context
 */
export interface SearchQuery {
  /** Raw search text */
  text: string;

  /** Parsed command (if using shortcut) */
  command?: string;

  /** Arguments after command */
  args?: string;
}
