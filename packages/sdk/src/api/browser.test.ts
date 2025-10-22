import { describe, it, expect, vi, beforeEach } from 'vitest';
import { browser } from './browser';
import * as ipc from '../internal/ipc';

vi.mock('../internal/ipc');

describe('browser API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('open', () => {
    it('should open valid URL', async () => {
      const testUrl = 'https://example.com';
      vi.mocked(ipc.invoke).mockResolvedValue(undefined);

      await browser.open(testUrl);

      expect(ipc.invoke).toHaveBeenCalledWith('open_url', { url: testUrl });
    });

    it('should open URL with path', async () => {
      const testUrl = 'https://example.com/path/to/page';
      vi.mocked(ipc.invoke).mockResolvedValue(undefined);

      await browser.open(testUrl);

      expect(ipc.invoke).toHaveBeenCalledWith('open_url', { url: testUrl });
    });

    it('should open URL with query parameters', async () => {
      const testUrl = 'https://example.com?foo=bar&baz=qux';
      vi.mocked(ipc.invoke).mockResolvedValue(undefined);

      await browser.open(testUrl);

      expect(ipc.invoke).toHaveBeenCalledWith('open_url', { url: testUrl });
    });

    it('should throw error for invalid URL', async () => {
      const invalidUrl = 'not-a-valid-url';

      await expect(browser.open(invalidUrl)).rejects.toThrow('Invalid URL: not-a-valid-url');
      expect(ipc.invoke).not.toHaveBeenCalled();
    });

    it('should throw error for empty string', async () => {
      await expect(browser.open('')).rejects.toThrow('Invalid URL: ');
      expect(ipc.invoke).not.toHaveBeenCalled();
    });

    it('should handle errors from IPC', async () => {
      const testUrl = 'https://example.com';
      const error = new Error('Failed to open URL');
      vi.mocked(ipc.invoke).mockRejectedValue(error);

      await expect(browser.open(testUrl)).rejects.toThrow();
      expect(ipc.invoke).toHaveBeenCalledWith('open_url', { url: testUrl });
    });

    it('should accept http URLs', async () => {
      const testUrl = 'http://example.com';
      vi.mocked(ipc.invoke).mockResolvedValue(undefined);

      await browser.open(testUrl);

      expect(ipc.invoke).toHaveBeenCalledWith('open_url', { url: testUrl });
    });

    it('should accept localhost URLs', async () => {
      const testUrl = 'http://localhost:3000';
      vi.mocked(ipc.invoke).mockResolvedValue(undefined);

      await browser.open(testUrl);

      expect(ipc.invoke).toHaveBeenCalledWith('open_url', { url: testUrl });
    });
  });

  describe('search', () => {
    it('should search with Google by default', async () => {
      const query = 'test query';
      vi.mocked(ipc.invoke).mockResolvedValue(undefined);

      await browser.search(query);

      expect(ipc.invoke).toHaveBeenCalledWith('open_url', {
        url: 'https://www.google.com/search?q=test%20query',
      });
    });

    it('should search with DuckDuckGo', async () => {
      const query = 'test query';
      vi.mocked(ipc.invoke).mockResolvedValue(undefined);

      await browser.search(query, 'duckduckgo');

      expect(ipc.invoke).toHaveBeenCalledWith('open_url', {
        url: 'https://duckduckgo.com/?q=test%20query',
      });
    });

    it('should search with Bing', async () => {
      const query = 'test query';
      vi.mocked(ipc.invoke).mockResolvedValue(undefined);

      await browser.search(query, 'bing');

      expect(ipc.invoke).toHaveBeenCalledWith('open_url', {
        url: 'https://www.bing.com/search?q=test%20query',
      });
    });

    it('should properly encode special characters', async () => {
      const query = 'test & special ? chars=value';
      vi.mocked(ipc.invoke).mockResolvedValue(undefined);

      await browser.search(query);

      expect(ipc.invoke).toHaveBeenCalledWith('open_url', {
        url: 'https://www.google.com/search?q=test%20%26%20special%20%3F%20chars%3Dvalue',
      });
    });

    it('should handle empty query', async () => {
      vi.mocked(ipc.invoke).mockResolvedValue(undefined);

      await browser.search('');

      expect(ipc.invoke).toHaveBeenCalledWith('open_url', {
        url: 'https://www.google.com/search?q=',
      });
    });

    it('should handle errors from IPC', async () => {
      const query = 'test query';
      const error = new Error('Failed to open search');
      vi.mocked(ipc.invoke).mockRejectedValue(error);

      await expect(browser.search(query)).rejects.toThrow();
    });
  });
});
