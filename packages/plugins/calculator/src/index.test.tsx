import { describe, it, expect, vi, beforeEach } from 'vitest';
import CalculatorPlugin from './index';

// Mock SDK
vi.mock('@nixed/sdk', () => ({
  clipboard: {
    write: vi.fn().mockResolvedValue(undefined),
  },
  ui: {
    showToast: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('CalculatorPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('manifest', () => {
    it('should have correct plugin metadata', () => {
      expect(CalculatorPlugin.manifest).toBeDefined();
      expect(CalculatorPlugin.manifest.id).toBe('calculator');
      expect(CalculatorPlugin.manifest.name).toBe('Calculator');
    });
  });

  describe('onLoad', () => {
    it('should load successfully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await CalculatorPlugin.onLoad?.();
      expect(consoleSpy).toHaveBeenCalledWith('Calculator plugin loaded');
      consoleSpy.mockRestore();
    });
  });

  describe('onSearch', () => {
    it('should return empty array for empty query', () => {
      const results = CalculatorPlugin.onSearch?.({ text: '' });
      expect(results).toEqual([]);
    });

    it('should return empty array for non-math query', () => {
      const results = CalculatorPlugin.onSearch?.({ text: 'hello world' });
      expect(results).toEqual([]);
    });

    it('should return result for valid math expression', () => {
      const results = CalculatorPlugin.onSearch?.({ text: '2 + 2' });
      expect(results).toHaveLength(1);
      expect(results?.[0]?.title).toBe('4');
      expect(results?.[0]?.subtitle).toBe('= 2 + 2');
    });

    it('should return result for expression starting with =', () => {
      const results = CalculatorPlugin.onSearch?.({ text: '=10 * 5' });
      expect(results).toHaveLength(1);
      expect(results?.[0]?.title).toBe('50');
    });

    it('should return empty array for invalid expression', () => {
      const results = CalculatorPlugin.onSearch?.({ text: '2 +' });
      expect(results).toEqual([]);
    });

    it('should include copy actions', () => {
      const results = CalculatorPlugin.onSearch?.({ text: '5 * 6' });
      expect(results?.[0]?.actions).toHaveLength(2);
      expect(results?.[0]?.actions?.[0]?.id).toBe('copy');
      expect(results?.[0]?.actions?.[1]?.id).toBe('copy-expression');
    });

    it('should execute main action to copy result', async () => {
      const { clipboard, ui } = await import('@nixed/sdk');
      const results = CalculatorPlugin.onSearch?.({ text: '5 * 6' });

      await results?.[0]?.onAction();

      expect(clipboard.write).toHaveBeenCalledWith('30');
      expect(ui.showToast).toHaveBeenCalledWith('Result copied to clipboard', 'success');
      expect(ui.close).toHaveBeenCalled();
    });

    it('should execute copy action', async () => {
      const { clipboard, ui } = await import('@nixed/sdk');
      const results = CalculatorPlugin.onSearch?.({ text: '10 / 2' });

      await results?.[0]?.actions?.[0]?.onAction();

      expect(clipboard.write).toHaveBeenCalledWith('5');
      expect(ui.showToast).toHaveBeenCalledWith('Result copied', 'success');
    });

    it('should execute copy expression action', async () => {
      const { clipboard, ui } = await import('@nixed/sdk');
      const results = CalculatorPlugin.onSearch?.({ text: '8 + 2' });

      await results?.[0]?.actions?.[1]?.onAction();

      expect(clipboard.write).toHaveBeenCalledWith('8 + 2');
      expect(ui.showToast).toHaveBeenCalledWith('Expression copied', 'success');
    });
  });

  describe('isCalculationQuery', () => {
    it('should detect expressions with numbers', () => {
      const results = CalculatorPlugin.onSearch?.({ text: '123' });
      expect(results?.length).toBeGreaterThan(0);
    });

    it('should detect expressions with operators', () => {
      const results1 = CalculatorPlugin.onSearch?.({ text: '5+5' });
      expect(results1?.length).toBeGreaterThan(0);

      const results2 = CalculatorPlugin.onSearch?.({ text: '10-2' });
      expect(results2?.length).toBeGreaterThan(0);

      const results3 = CalculatorPlugin.onSearch?.({ text: '3*4' });
      expect(results3?.length).toBeGreaterThan(0);

      const results4 = CalculatorPlugin.onSearch?.({ text: '8/2' });
      expect(results4?.length).toBeGreaterThan(0);
    });

    it('should detect expressions with parentheses', () => {
      const results = CalculatorPlugin.onSearch?.({ text: '(2+3)*4' });
      expect(results?.length).toBeGreaterThan(0);
    });

    it('should detect expressions starting with =', () => {
      const results = CalculatorPlugin.onSearch?.({ text: '=100' });
      expect(results?.length).toBeGreaterThan(0);
    });
  });
});
