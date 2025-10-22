import { useContext } from 'react';
import { PluginContextReact } from '../internal/context';
import type { PreferenceValues } from '../types';

/**
 * Hook to access plugin preferences
 * SIMPLIFIED: Returns Record<string, unknown> for runtime values
 * @returns Plugin preferences object
 */
export function usePreferences(): PreferenceValues {
  const context = useContext(PluginContextReact);

  if (!context) {
    throw new Error('usePreferences must be used within a PluginProvider');
  }

  return context.preferences;
}

/**
 * Hook to access a specific preference
 * @param key - Preference key
 * @returns Preference value (cast to expected type)
 */
export function usePreference<T = unknown>(key: string): T {
  const preferences = usePreferences();
  return preferences[key] as T;
}
