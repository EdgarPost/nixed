/**
 * SIMPLIFIED: Plugin preference definition
 * Start with basic JSON values, add type safety incrementally as needed
 */
export interface PluginPreference {
  /** Unique preference identifier */
  id: string;

  /** Human-readable title */
  title: string;

  /** Detailed description */
  description: string;

  /** Preference type */
  type: 'text' | 'password' | 'checkbox' | 'dropdown' | 'number';

  /** Default value */
  default?: unknown;

  /** Whether this preference is required */
  required?: boolean;

  /** Additional metadata (for dropdown options, number min/max, etc.) */
  metadata?: {
    placeholder?: string;
    label?: string;
    options?: Array<{ label: string; value: string }>;
    min?: number;
    max?: number;
    step?: number;
  };
}

/**
 * Runtime preference values are stored as JSON-compatible types
 */
export type PreferenceValues = Record<string, unknown>;

/**
 * Plugin manifest schema
 * Defines metadata and configuration for a plugin
 */
export interface PluginManifest {
  /** Unique plugin identifier (kebab-case) */
  id: string;

  /** Human-readable plugin name */
  name: string;

  /** Brief description of plugin functionality */
  description: string;

  /** Plugin version (semver) */
  version: string;

  /** Plugin author */
  author: string;

  /** Icon (emoji or path to icon file) */
  icon?: string;

  /** Commands exposed by this plugin */
  commands: PluginCommand[];

  /** Configuration preferences */
  preferences?: PluginPreference[];

  /** Minimum Nixed version required */
  minNixedVersion?: string;
}

/**
 * Plugin command definition
 */
export interface PluginCommand {
  /** Unique command identifier within plugin */
  name: string;

  /** Human-readable command title */
  title: string;

  /** Command description */
  description?: string;

  /** Text shortcut to trigger this command (e.g., "clip", "calc") */
  shortcut?: string;

  /** Command execution mode */
  mode: 'view' | 'no-view';

  /** Keywords for search matching */
  keywords?: string[];
}

/**
 * Command execution modes
 * - view: Shows UI component
 * - no-view: Executes in background
 */
export type CommandMode = 'view' | 'no-view';
