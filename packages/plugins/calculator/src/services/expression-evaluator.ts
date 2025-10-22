import { create, all, type MathJsInstance } from 'mathjs';
import type { EvaluationResult } from '../types/expression.types';

/**
 * Expression evaluator
 * Safely evaluates mathematical expressions using mathjs
 */
export class ExpressionEvaluator {
  private math: MathJsInstance;

  constructor(private precision: number = 6) {
    // Create isolated mathjs instance with limited scope
    this.math = create(all, {
      number: 'BigNumber',
      precision: 64,
    });
  }

  /**
   * Evaluate mathematical expression
   */
  evaluate(expression: string): EvaluationResult {
    if (!expression || expression.trim().length === 0) {
      return {
        expression,
        result: '',
        success: false,
        type: 'error',
        error: 'Empty expression',
      };
    }

    try {
      // Evaluate expression
      const rawResult = this.math.evaluate(expression);

      // Format result
      const result = this.formatResult(rawResult);

      return {
        expression,
        result,
        success: true,
        type: 'number',
      };
    } catch (error) {
      return {
        expression,
        result: '',
        success: false,
        type: 'error',
        error: error instanceof Error ? error.message : 'Invalid expression',
      };
    }
  }

  /**
   * Format result with precision
   */
  private formatResult(value: unknown): string {
    if (typeof value === 'number') {
      return this.roundToPrecision(value);
    }

    if (typeof value === 'object' && value !== null && 'toString' in value) {
      const strValue = String(value);
      const numValue = parseFloat(strValue);

      if (!isNaN(numValue)) {
        return this.roundToPrecision(numValue);
      }

      return strValue;
    }

    return String(value);
  }

  /**
   * Round number to configured precision
   */
  private roundToPrecision(value: number): string {
    // Handle special cases
    if (!isFinite(value)) {
      return String(value);
    }

    // Round to precision
    const multiplier = Math.pow(10, this.precision);
    const rounded = Math.round(value * multiplier) / multiplier;

    // Format with precision, removing trailing zeros
    return rounded.toFixed(this.precision).replace(/\.?0+$/, '');
  }

  /**
   * Update precision
   */
  setPrecision(precision: number): void {
    this.precision = precision;
  }
}
