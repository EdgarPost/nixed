import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clipboard } from './clipboard';
import * as ipc from '../internal/ipc';

vi.mock('../internal/ipc');

describe('clipboard API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('read', () => {
    it('should read clipboard content', async () => {
      const testContent = 'test clipboard content';
      vi.mocked(ipc.invoke).mockResolvedValue(testContent);

      const result = await clipboard.read();

      expect(result).toBe(testContent);
      expect(ipc.invoke).toHaveBeenCalledWith('clipboard_read');
    });

    it('should handle read errors', async () => {
      const error = new Error('Clipboard read failed');
      vi.mocked(ipc.invoke).mockRejectedValue(error);

      await expect(clipboard.read()).rejects.toThrow();
      expect(ipc.invoke).toHaveBeenCalledWith('clipboard_read');
    });
  });

  describe('write', () => {
    it('should write text to clipboard', async () => {
      const testText = 'text to write';
      vi.mocked(ipc.invoke).mockResolvedValue(undefined);

      await clipboard.write(testText);

      expect(ipc.invoke).toHaveBeenCalledWith('clipboard_write', { text: testText });
    });

    it('should handle write errors', async () => {
      const error = new Error('Clipboard write failed');
      vi.mocked(ipc.invoke).mockRejectedValue(error);

      await expect(clipboard.write('test')).rejects.toThrow();
      expect(ipc.invoke).toHaveBeenCalledWith('clipboard_write', { text: 'test' });
    });
  });

  describe('history', () => {
    it('should retrieve clipboard history', async () => {
      const testHistory = [
        { id: '1', content: 'item 1', timestamp: '2025-10-22T15:30:00Z' },
        { id: '2', content: 'item 2', timestamp: '2025-10-22T15:29:00Z' },
      ];
      vi.mocked(ipc.invoke).mockResolvedValue(testHistory);

      const result = await clipboard.history();

      expect(result).toEqual(testHistory);
      expect(ipc.invoke).toHaveBeenCalledWith('clipboard_history');
    });

    it('should return empty array if no history', async () => {
      vi.mocked(ipc.invoke).mockResolvedValue([]);

      const result = await clipboard.history();

      expect(result).toEqual([]);
      expect(ipc.invoke).toHaveBeenCalledWith('clipboard_history');
    });

    it('should handle history errors', async () => {
      const error = new Error('Failed to retrieve history');
      vi.mocked(ipc.invoke).mockRejectedValue(error);

      await expect(clipboard.history()).rejects.toThrow();
      expect(ipc.invoke).toHaveBeenCalledWith('clipboard_history');
    });
  });

  describe('clearHistory', () => {
    it('should clear clipboard history', async () => {
      vi.mocked(ipc.invoke).mockResolvedValue(undefined);

      await clipboard.clearHistory();

      expect(ipc.invoke).toHaveBeenCalledWith('clipboard_clear_history');
    });

    it('should handle clearHistory errors', async () => {
      const error = new Error('Failed to clear history');
      vi.mocked(ipc.invoke).mockRejectedValue(error);

      await expect(clipboard.clearHistory()).rejects.toThrow();
      expect(ipc.invoke).toHaveBeenCalledWith('clipboard_clear_history');
    });
  });
});
