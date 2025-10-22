import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storage } from './storage';
import * as ipc from '../internal/ipc';
import * as context from '../internal/context';

vi.mock('../internal/ipc');
vi.mock('../internal/context');

describe('storage API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(context.getPluginId).mockReturnValue('test-plugin');
  });

  describe('get', () => {
    it('should retrieve and parse JSON value', async () => {
      const testData = { foo: 'bar', count: 42 };
      vi.mocked(ipc.invoke).mockResolvedValue(JSON.stringify(testData));

      const result = await storage.get('test-key');

      expect(result).toEqual(testData);
      expect(ipc.invoke).toHaveBeenCalledWith('storage_get', {
        pluginId: 'test-plugin',
        key: 'test-key',
      });
    });

    it('should return null if value not found', async () => {
      vi.mocked(ipc.invoke).mockResolvedValue(null);

      const result = await storage.get('missing-key');

      expect(result).toBeNull();
      expect(ipc.invoke).toHaveBeenCalledWith('storage_get', {
        pluginId: 'test-plugin',
        key: 'missing-key',
      });
    });

    it('should handle string values', async () => {
      vi.mocked(ipc.invoke).mockResolvedValue('plain string');

      const result = await storage.get('text-key');

      expect(result).toBe('plain string');
      expect(ipc.invoke).toHaveBeenCalledWith('storage_get', {
        pluginId: 'test-plugin',
        key: 'text-key',
      });
    });

    it('should handle invalid JSON gracefully', async () => {
      vi.mocked(ipc.invoke).mockResolvedValue('not valid json {');

      const result = await storage.get('invalid-key');

      expect(result).toBe('not valid json {');
    });

    it('should handle errors from IPC', async () => {
      const error = new Error('Storage get failed');
      vi.mocked(ipc.invoke).mockRejectedValue(error);

      await expect(storage.get('error-key')).rejects.toThrow();
    });

    it('should work with typed values', async () => {
      interface TestType {
        name: string;
        value: number;
      }
      const testData: TestType = { name: 'test', value: 123 };
      vi.mocked(ipc.invoke).mockResolvedValue(JSON.stringify(testData));

      const result = await storage.get<TestType>('typed-key');

      expect(result).toEqual(testData);
    });
  });

  describe('set', () => {
    it('should serialize and store object value', async () => {
      const testData = { foo: 'bar', count: 42 };

      await storage.set('test-key', testData);

      expect(ipc.invoke).toHaveBeenCalledWith('storage_set', {
        pluginId: 'test-plugin',
        key: 'test-key',
        value: JSON.stringify(testData),
      });
    });

    it('should store string value directly', async () => {
      await storage.set('test-key', 'plain string');

      expect(ipc.invoke).toHaveBeenCalledWith('storage_set', {
        pluginId: 'test-plugin',
        key: 'test-key',
        value: 'plain string',
      });
    });

    it('should handle arrays', async () => {
      const testArray = ['item1', 'item2', 'item3'];

      await storage.set('array-key', testArray);

      expect(ipc.invoke).toHaveBeenCalledWith('storage_set', {
        pluginId: 'test-plugin',
        key: 'array-key',
        value: JSON.stringify(testArray),
      });
    });

    it('should handle numbers', async () => {
      const testNumber = 42;

      await storage.set('number-key', testNumber);

      expect(ipc.invoke).toHaveBeenCalledWith('storage_set', {
        pluginId: 'test-plugin',
        key: 'number-key',
        value: JSON.stringify(testNumber),
      });
    });

    it('should handle booleans', async () => {
      const testBool = true;

      await storage.set('bool-key', testBool);

      expect(ipc.invoke).toHaveBeenCalledWith('storage_set', {
        pluginId: 'test-plugin',
        key: 'bool-key',
        value: JSON.stringify(testBool),
      });
    });

    it('should handle errors from IPC', async () => {
      const error = new Error('Storage set failed');
      vi.mocked(ipc.invoke).mockRejectedValue(error);

      await expect(storage.set('error-key', 'value')).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('should remove value from storage', async () => {
      vi.mocked(ipc.invoke).mockResolvedValue(undefined);

      await storage.remove('test-key');

      expect(ipc.invoke).toHaveBeenCalledWith('storage_remove', {
        pluginId: 'test-plugin',
        key: 'test-key',
      });
    });

    it('should handle errors from IPC', async () => {
      const error = new Error('Storage remove failed');
      vi.mocked(ipc.invoke).mockRejectedValue(error);

      await expect(storage.remove('error-key')).rejects.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all storage for plugin', async () => {
      vi.mocked(ipc.invoke).mockResolvedValue(undefined);

      await storage.clear();

      expect(ipc.invoke).toHaveBeenCalledWith('storage_clear', {
        pluginId: 'test-plugin',
      });
    });

    it('should handle errors from IPC', async () => {
      const error = new Error('Storage clear failed');
      vi.mocked(ipc.invoke).mockRejectedValue(error);

      await expect(storage.clear()).rejects.toThrow();
    });
  });
});
