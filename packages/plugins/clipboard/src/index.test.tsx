import { describe, it, expect, vi, beforeEach } from 'vitest';
import ClipboardPlugin from './index';
import type { SearchQuery } from '@nixed/sdk';
import { clipboard, ui } from '@nixed/sdk';

// Mock SDK
vi.mock('@nixed/sdk', () => ({
  clipboard: {
    read: vi.fn(),
    write: vi.fn(),
  },
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
  ui: {
    close: vi.fn(),
    showToast: vi.fn(),
  },
}));

// Mock ClipboardMonitor
vi.mock('./services/clipboard-monitor', () => ({
  ClipboardMonitor: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    search: vi.fn().mockReturnValue([
      {
        id: '1',
        content: 'Test content',
        timestamp: new Date('2025-10-22T10:00:00Z'),
        preview: 'Test content',
      },
    ]),
  })),
}));

describe('ClipboardPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have manifest', () => {
    expect(ClipboardPlugin.manifest).toBeDefined();
    expect(ClipboardPlugin.manifest.id).toBe('clipboard');
    expect(ClipboardPlugin.manifest.name).toBe('Clipboard History');
  });

  it('should load and start monitor', async () => {
    await ClipboardPlugin.onLoad?.();

    // Plugin should be loaded
    expect(ClipboardPlugin.onLoad).toBeDefined();
  });

  it('should unload and stop monitor', () => {
    ClipboardPlugin.onUnload?.();

    // Plugin should be unloaded
    expect(ClipboardPlugin.onUnload).toBeDefined();
  });

  describe('onSearch', () => {
    beforeEach(async () => {
      // Initialize plugin
      await ClipboardPlugin.onLoad?.();
    });

    it('should return search results', () => {
      const query: SearchQuery = { text: 'test' };
      const results = ClipboardPlugin.onSearch?.(query);

      expect(results).toBeDefined();
      expect(results).toHaveLength(1);
      expect(results?.[0]?.id).toBe('1');
      expect(results?.[0]?.title).toBe('Test content');
    });

    it('should include timestamp in subtitle', () => {
      const query: SearchQuery = { text: 'test' };
      const results = ClipboardPlugin.onSearch?.(query);

      expect(results?.[0]?.subtitle).toBeDefined();
    });

    it('should include character count in accessories', () => {
      const query: SearchQuery = { text: 'test' };
      const results = ClipboardPlugin.onSearch?.(query);

      expect(results?.[0]?.accessories).toBeDefined();
      expect(results?.[0]?.accessories?.[0]?.text).toBe('12 chars');
    });

    it('should have copy action', () => {
      const query: SearchQuery = { text: 'test' };
      const results = ClipboardPlugin.onSearch?.(query);

      expect(results?.[0]?.actions).toBeDefined();
      const copyAction = results?.[0]?.actions?.find((a) => a.id === 'copy');
      expect(copyAction).toBeDefined();
      expect(copyAction?.title).toBe('Copy');
    });

    it('should have delete action', () => {
      const query: SearchQuery = { text: 'test' };
      const results = ClipboardPlugin.onSearch?.(query);

      const deleteAction = results?.[0]?.actions?.find((a) => a.id === 'delete');
      expect(deleteAction).toBeDefined();
      expect(deleteAction?.title).toBe('Delete from History');
    });

    it('should copy to clipboard on main action', async () => {
      const query: SearchQuery = { text: 'test' };
      const results = ClipboardPlugin.onSearch?.(query);

      await results?.[0]?.onAction?.();

      expect(clipboard.write).toHaveBeenCalledWith('Test content');
      expect(ui.showToast).toHaveBeenCalledWith('Copied to clipboard', 'success');
      expect(ui.close).toHaveBeenCalled();
    });

    it('should copy to clipboard on copy action', async () => {
      const query: SearchQuery = { text: 'test' };
      const results = ClipboardPlugin.onSearch?.(query);

      const copyAction = results?.[0]?.actions?.find((a) => a.id === 'copy');
      await copyAction?.onAction?.();

      expect(clipboard.write).toHaveBeenCalledWith('Test content');
      expect(ui.showToast).toHaveBeenCalledWith('Copied to clipboard', 'success');
    });

    it('should show toast on delete action', async () => {
      const query: SearchQuery = { text: 'test' };
      const results = ClipboardPlugin.onSearch?.(query);

      const deleteAction = results?.[0]?.actions?.find((a) => a.id === 'delete');
      await deleteAction?.onAction?.();

      expect(ui.showToast).toHaveBeenCalledWith('Delete not yet implemented', 'info');
    });
  });
});
