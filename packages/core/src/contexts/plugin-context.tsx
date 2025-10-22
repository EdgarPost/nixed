import React, { createContext, useContext, useEffect, useState } from 'react';
import { PluginRegistry } from '../services/plugin-registry';
import { SearchEngine } from '../services/search-engine';
import type { AppConfig } from '../types/config.types';

interface PluginSystemContext {
  registry: PluginRegistry;
  searchEngine: SearchEngine;
  ready: boolean;
}

const PluginSystemContext = createContext<PluginSystemContext | null>(null);

interface PluginProviderProps {
  config: AppConfig;
  children: React.ReactNode;
}

/**
 * Plugin system provider
 * Initializes and provides plugin system to React components
 * FIX: Add cleanup on unmount
 */
export function PluginProvider({ config, children }: PluginProviderProps): React.JSX.Element {
  const [context, setContext] = useState<PluginSystemContext | null>(null);

  useEffect(() => {
    const registry = new PluginRegistry();
    const searchEngine = new SearchEngine(registry);

    registry
      .initialize(config)
      .then(() => {
        setContext({
          registry,
          searchEngine,
          ready: true,
        });
      })
      .catch((error) => {
        console.error('Failed to initialize plugin system:', error);
      });

    // Cleanup on unmount
    return () => {
      registry.shutdown().catch((error) => {
        console.error('Failed to shutdown plugin registry:', error);
      });
    };
  }, [config]);

  if (!context) {
    return <div>Loading plugins...</div>;
  }

  return (
    <PluginSystemContext.Provider value={context}>
      {children}
    </PluginSystemContext.Provider>
  );
}

/**
 * Hook to access plugin system
 */
export function usePluginSystem(): PluginSystemContext {
  const context = useContext(PluginSystemContext);

  if (!context) {
    throw new Error('usePluginSystem must be used within PluginProvider');
  }

  return context;
}
