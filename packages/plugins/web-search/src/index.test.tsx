import { describe, it, expect } from 'vitest';
import WebSearchPlugin from './index';

describe('WebSearchPlugin', () => {
  describe('onSearch', () => {
    it('should return search result for non-empty query', () => {
      const results = WebSearchPlugin.onSearch?.({
        text: 'test query',
      });

      expect(results).toHaveLength(1);
      expect(results?.[0]?.title).toContain('test query');
    });

    it('should return empty for empty query', () => {
      const results = WebSearchPlugin.onSearch?.({
        text: '',
      });

      expect(results).toHaveLength(0);
    });

    it('should provide multiple search engine actions', () => {
      const results = WebSearchPlugin.onSearch?.({
        text: 'test',
      });

      expect(results?.[0]?.actions).toHaveLength(3);
      expect(results?.[0]?.actions?.[0]?.id).toBe('google');
      expect(results?.[0]?.actions?.[1]?.id).toBe('duckduckgo');
      expect(results?.[0]?.actions?.[2]?.id).toBe('bing');
    });
  });
});
