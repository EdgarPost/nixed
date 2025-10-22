import type { AppConfig } from '../types/config.types';

/**
 * Default application configuration
 * Defines enabled plugins, preferences, and global settings
 */
export const defaultAppConfig: AppConfig = {
  // Plugin configurations
  plugins: {
    // Calculator plugin - enabled by default
    calculator: {
      enabled: true,
      preferences: {},
    },

    // Clipboard plugin - enabled by default
    clipboard: {
      enabled: true,
      preferences: {
        maxItems: 100,
        searchDelay: 300,
      },
    },

    // Web search plugin - enabled by default
    'web-search': {
      enabled: true,
      preferences: {
        searchEngine: 'google',
        openInBrowser: true,
      },
    },
  },

  // Global application settings
  settings: {
    // UI theme
    theme: 'dark',

    // Global hotkey to trigger launcher
    hotkey: 'Ctrl+Space',
  },
};
