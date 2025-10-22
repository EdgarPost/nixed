/**
 * Plugin configuration
 */
export interface PluginConfig {
  /** Whether plugin is enabled */
  enabled: boolean;

  /** Plugin-specific preferences */
  preferences: Record<string, unknown>;
}

/**
 * Application configuration
 */
export interface AppConfig {
  /** Plugin configurations keyed by plugin ID */
  plugins: Record<string, PluginConfig>;

  /** Global application settings */
  settings?: {
    /** Theme preference */
    theme?: 'light' | 'dark' | 'system';

    /** Hotkey to show window */
    hotkey?: string;
  };
}
