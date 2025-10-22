import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ClipboardMonitor } from './clipboard-monitor';
import { clipboard, storage } from '@nixed/sdk';

// Mock SDK
vi.mock('@nixed/sdk', () => ({
  clipboard: {
    read: vi.fn(),
  },
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

describe('ClipboardMonitor', () => {
  let monitor: ClipboardMonitor;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    monitor = new ClipboardMonitor(5, 100);
  });

  afterEach(() => {
    vi.useRealTimers();
    monitor.stop();
  });

  describe('addToHistory', () => {
    it('should add new item to front of history (LIFO)', () => {
      monitor['addToHistory']('item1');
      monitor['addToHistory']('item2');

      const history = monitor.getHistory();

      expect(history).toHaveLength(2);
      expect(history[0]?.content).toBe('item2');
      expect(history[1]?.content).toBe('item1');
    });

    it('should not add duplicate at top', () => {
      monitor['addToHistory']('item1');
      monitor['addToHistory']('item1');

      const history = monitor.getHistory();

      expect(history).toHaveLength(1);
    });

    it('should remove duplicate from middle when re-added', () => {
      monitor['addToHistory']('item1');
      monitor['addToHistory']('item2');
      monitor['addToHistory']('item3');
      monitor['addToHistory']('item1');

      const history = monitor.getHistory();

      expect(history).toHaveLength(3);
      expect(history[0]?.content).toBe('item1');
      expect(history[1]?.content).toBe('item3');
      expect(history[2]?.content).toBe('item2');
    });

    it('should respect max items limit', () => {
      for (let i = 0; i < 10; i++) {
        monitor['addToHistory'](`item${i}`);
      }

      const history = monitor.getHistory();

      expect(history).toHaveLength(5); // maxItems = 5
      expect(history[0]?.content).toBe('item9');
      expect(history[4]?.content).toBe('item5');
    });

    it('should generate unique IDs for each item', () => {
      monitor['addToHistory']('item1');
      monitor['addToHistory']('item2');

      const history = monitor.getHistory();

      expect(history[0]?.id).toBeDefined();
      expect(history[1]?.id).toBeDefined();
      expect(history[0]?.id).not.toBe(history[1]?.id);
    });

    it('should include timestamp for each item', () => {
      const before = new Date();
      monitor['addToHistory']('item1');
      const after = new Date();

      const history = monitor.getHistory();

      expect(history[0]?.timestamp).toBeInstanceOf(Date);
      expect(history[0]?.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(history[0]?.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('search', () => {
    beforeEach(() => {
      monitor['addToHistory']('Hello World');
      monitor['addToHistory']('Goodbye World');
      monitor['addToHistory']('Testing 123');
    });

    it('should return all items for empty query', () => {
      const results = monitor.search('');
      expect(results).toHaveLength(3);
    });

    it('should filter by query', () => {
      const results = monitor.search('World');
      expect(results).toHaveLength(2);
      expect(results[0]?.content).toContain('World');
      expect(results[1]?.content).toContain('World');
    });

    it('should be case insensitive', () => {
      const results = monitor.search('world');
      expect(results).toHaveLength(2);
    });

    it('should return empty array if no matches', () => {
      const results = monitor.search('NotFound');
      expect(results).toHaveLength(0);
    });

    it('should maintain order (newest first)', () => {
      const results = monitor.search('World');
      expect(results[0]?.content).toBe('Goodbye World');
      expect(results[1]?.content).toBe('Hello World');
    });
  });

  describe('createPreview', () => {
    it('should return full text if short', () => {
      const preview = monitor['createPreview']('Short text');
      expect(preview).toBe('Short text');
    });

    it('should truncate long text', () => {
      const longText = 'a'.repeat(200);
      const preview = monitor['createPreview'](longText, 50);

      expect(preview).toHaveLength(53); // 50 + "..."
      expect(preview.endsWith('...')).toBe(true);
    });

    it('should collapse whitespace', () => {
      const preview = monitor['createPreview']('Hello\n\nWorld\t\tTest');
      expect(preview).toBe('Hello World Test');
    });

    it('should trim leading and trailing whitespace', () => {
      const preview = monitor['createPreview']('  Hello World  ');
      expect(preview).toBe('Hello World');
    });

    it('should handle multiple spaces', () => {
      const preview = monitor['createPreview']('Hello     World');
      expect(preview).toBe('Hello World');
    });

    it('should handle newlines and tabs together', () => {
      const preview = monitor['createPreview']('Line1\n\tLine2\n\t\tLine3');
      expect(preview).toBe('Line1 Line2 Line3');
    });
  });

  describe('clearHistory', () => {
    it('should clear all history items', async () => {
      monitor['addToHistory']('item1');
      monitor['addToHistory']('item2');

      expect(monitor.getHistory()).toHaveLength(2);

      await monitor.clearHistory();

      expect(monitor.getHistory()).toHaveLength(0);
    });
  });

  describe('getHistory', () => {
    it('should return a copy of history', () => {
      monitor['addToHistory']('item1');

      const history1 = monitor.getHistory();
      const history2 = monitor.getHistory();

      expect(history1).not.toBe(history2);
      expect(history1).toEqual(history2);
    });

    it('should not allow external modification', () => {
      monitor['addToHistory']('item1');

      const history = monitor.getHistory();
      history.push({
        id: 'fake',
        content: 'fake',
        timestamp: new Date(),
        preview: 'fake',
      });

      expect(monitor.getHistory()).toHaveLength(1);
    });
  });

  describe('start', () => {
    it('should load history from storage', async () => {
      const mockHistory = [
        {
          id: '1',
          content: 'stored item',
          timestamp: new Date('2025-10-22T10:00:00Z').toISOString(),
          preview: 'stored item',
        },
      ];

      vi.mocked(storage.get).mockResolvedValue(mockHistory);

      await monitor.start();

      expect(storage.get).toHaveBeenCalledWith('history');
      expect(monitor.getHistory()).toHaveLength(1);
      expect(monitor.getHistory()[0]?.content).toBe('stored item');
    });

    it('should start monitoring clipboard', async () => {
      vi.mocked(storage.get).mockResolvedValue(null);
      vi.mocked(clipboard.read).mockResolvedValue('new content');

      await monitor.start();

      // Advance timer
      await vi.advanceTimersByTimeAsync(150);

      expect(clipboard.read).toHaveBeenCalled();
    });

    it('should handle storage load errors', async () => {
      vi.mocked(storage.get).mockRejectedValue(new Error('Storage error'));

      await expect(monitor.start()).resolves.not.toThrow();
      expect(monitor.getHistory()).toHaveLength(0);
    });
  });

  describe('stop', () => {
    it('should stop monitoring', async () => {
      vi.mocked(storage.get).mockResolvedValue(null);

      await monitor.start();
      monitor.stop();

      // Verify interval is cleared
      expect(monitor['intervalId']).toBeNull();
    });

    it('should handle multiple stop calls', async () => {
      vi.mocked(storage.get).mockResolvedValue(null);

      await monitor.start();
      monitor.stop();
      monitor.stop();

      expect(monitor['intervalId']).toBeNull();
    });

    it('should not throw if never started', () => {
      expect(() => monitor.stop()).not.toThrow();
    });
  });

  describe('checkClipboard', () => {
    beforeEach(async () => {
      vi.mocked(storage.get).mockResolvedValue(null);
      await monitor.start();
    });

    it('should add new clipboard content to history', async () => {
      vi.mocked(clipboard.read).mockResolvedValue('new content');

      await vi.advanceTimersByTimeAsync(150);

      expect(monitor.getHistory()).toHaveLength(1);
      expect(monitor.getHistory()[0]?.content).toBe('new content');
    });

    it('should not add same content twice in a row', async () => {
      vi.mocked(clipboard.read).mockResolvedValue('content1');

      await vi.advanceTimersByTimeAsync(150);
      await vi.advanceTimersByTimeAsync(150);

      expect(monitor.getHistory()).toHaveLength(1);
    });

    it('should handle clipboard read errors', async () => {
      vi.mocked(clipboard.read).mockRejectedValue(new Error('Clipboard error'));

      await vi.advanceTimersByTimeAsync(150);

      expect(monitor.getHistory()).toHaveLength(0);
    });

    it('should ignore empty clipboard content', async () => {
      vi.mocked(clipboard.read).mockResolvedValue('');

      await vi.advanceTimersByTimeAsync(150);

      expect(monitor.getHistory()).toHaveLength(0);
    });
  });

  describe('saveHistory', () => {
    it('should save history to storage when adding items', () => {
      monitor['addToHistory']('item1');

      expect(storage.set).toHaveBeenCalledWith('history', expect.any(Array));
    });

    it('should handle save errors gracefully', () => {
      vi.mocked(storage.set).mockRejectedValue(new Error('Save error'));

      expect(() => monitor['addToHistory']('item1')).not.toThrow();
    });
  });

  describe('loadHistory', () => {
    it('should convert timestamp strings to Date objects', async () => {
      const mockHistory = [
        {
          id: '1',
          content: 'item',
          timestamp: '2025-10-22T10:00:00Z',
          preview: 'item',
        },
      ];

      vi.mocked(storage.get).mockResolvedValue(mockHistory);

      await monitor['loadHistory']();

      expect(monitor.getHistory()[0]?.timestamp).toBeInstanceOf(Date);
    });

    it('should handle non-array storage data', async () => {
      vi.mocked(storage.get).mockResolvedValue('invalid data');

      await monitor['loadHistory']();

      expect(monitor.getHistory()).toHaveLength(0);
    });

    it('should handle null storage data', async () => {
      vi.mocked(storage.get).mockResolvedValue(null);

      await monitor['loadHistory']();

      expect(monitor.getHistory()).toHaveLength(0);
    });
  });
});
