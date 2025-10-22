import { createContext, useContext } from 'react';
import type { PluginContext } from '../types';

/**
 * Plugin context (React)
 * FIX: Use React Context exclusively instead of global variable
 */
export const PluginContextReact = createContext<PluginContext | null>(null);

/**
 * Get current plugin ID from React context
 * @internal Used by SDK APIs
 */
export function getPluginId(): string {
  // This will be called from within React components that have PluginProvider
  // For use outside components, plugin ID should be passed explicitly
  const context = useContext(PluginContextReact);

  if (!context) {
    throw new Error('Plugin context not available. Ensure component is wrapped with PluginProvider.');
  }

  return context.pluginId;
}

/**
 * Hook to get plugin context
 */
export function usePluginContext(): PluginContext {
  const context = useContext(PluginContextReact);

  if (!context) {
    throw new Error('usePluginContext must be used within a PluginProvider');
  }

  return context;
}
