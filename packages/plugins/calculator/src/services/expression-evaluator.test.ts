import { describe, it, expect, beforeEach } from 'vitest';
import { ExpressionEvaluator } from './expression-evaluator';

describe('ExpressionEvaluator', () => {
  let evaluator: ExpressionEvaluator;

  beforeEach(() => {
    evaluator = new ExpressionEvaluator(2);
  });

  describe('basic arithmetic', () => {
    it('should evaluate addition', () => {
      const result = evaluator.evaluate('2 + 2');
      expect(result.success).toBe(true);
      expect(result.result).toBe('4');
    });

    it('should evaluate subtraction', () => {
      const result = evaluator.evaluate('10 - 3');
      expect(result.success).toBe(true);
      expect(result.result).toBe('7');
    });

    it('should evaluate multiplication', () => {
      const result = evaluator.evaluate('5 * 6');
      expect(result.success).toBe(true);
      expect(result.result).toBe('30');
    });

    it('should evaluate division', () => {
      const result = evaluator.evaluate('15 / 3');
      expect(result.success).toBe(true);
      expect(result.result).toBe('5');
    });
  });

  describe('order of operations', () => {
    it('should respect PEMDAS', () => {
      const result = evaluator.evaluate('2 + 3 * 4');
      expect(result.success).toBe(true);
      expect(result.result).toBe('14');
    });

    it('should handle parentheses', () => {
      const result = evaluator.evaluate('(2 + 3) * 4');
      expect(result.success).toBe(true);
      expect(result.result).toBe('20');
    });
  });

  describe('precision', () => {
    it('should round to configured precision', () => {
      const result = evaluator.evaluate('10 / 3');
      expect(result.success).toBe(true);
      expect(result.result).toBe('3.33');
    });

    it('should remove trailing zeros', () => {
      const result = evaluator.evaluate('4 / 2');
      expect(result.success).toBe(true);
      expect(result.result).toBe('2');
    });
  });

  describe('error handling', () => {
    it('should handle empty expression', () => {
      const result = evaluator.evaluate('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Empty expression');
    });

    it('should handle invalid expression', () => {
      const result = evaluator.evaluate('2 +');
      expect(result.success).toBe(false);
      expect(result.type).toBe('error');
    });

    it('should handle division by zero', () => {
      const result = evaluator.evaluate('5 / 0');
      expect(result.success).toBe(true);
      expect(result.result).toBe('Infinity');
    });
  });

  describe('advanced operations', () => {
    it('should handle exponentiation', () => {
      const result = evaluator.evaluate('2 ^ 8');
      expect(result.success).toBe(true);
      expect(result.result).toBe('256');
    });

    it('should handle square root', () => {
      const result = evaluator.evaluate('sqrt(16)');
      expect(result.success).toBe(true);
      expect(result.result).toBe('4');
    });

    it('should handle percentages', () => {
      const result = evaluator.evaluate('50 * 20%');
      expect(result.success).toBe(true);
      expect(result.result).toBe('10');
    });
  });

  describe('setPrecision', () => {
    it('should update precision', () => {
      evaluator.setPrecision(4);
      const result = evaluator.evaluate('10 / 3');
      expect(result.success).toBe(true);
      expect(result.result).toBe('3.3333');
    });

    it('should work with 0 precision', () => {
      evaluator.setPrecision(0);
      const result = evaluator.evaluate('10 / 3');
      expect(result.success).toBe(true);
      expect(result.result).toBe('3');
    });
  });

  describe('edge cases', () => {
    it('should handle whitespace-only expression', () => {
      const result = evaluator.evaluate('   ');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Empty expression');
    });

    it('should handle negative infinity', () => {
      const result = evaluator.evaluate('-5 / 0');
      expect(result.success).toBe(true);
      expect(result.result).toBe('-Infinity');
    });

    it('should handle NaN', () => {
      const result = evaluator.evaluate('0 / 0');
      expect(result.success).toBe(true);
      expect(result.result).toBe('NaN');
    });

    it('should handle complex expressions with decimals', () => {
      const result = evaluator.evaluate('1.5 * 2.5');
      expect(result.success).toBe(true);
      expect(result.result).toBe('3.75');
    });
  });
});
