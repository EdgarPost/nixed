import { useState, useEffect, useCallback } from 'react';
import { storage } from '../api/storage';

/**
 * Hook to use plugin storage with React state
 * @param key - Storage key
 * @param defaultValue - Default value if not found
 * @returns [value, setValue, isLoading]
 */
export function useStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => Promise<void>, boolean] {
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    storage
      .get<T>(key)
      .then((stored) => {
        if (mounted) {
          setValue(stored ?? defaultValue);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        console.error(`Failed to load storage key "${key}":`, error);
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [key, defaultValue]);

  const updateValue = useCallback(
    async (newValue: T) => {
      setValue(newValue);
      await storage.set(key, newValue);
    },
    [key]
  );

  return [value, updateValue, isLoading];
}
