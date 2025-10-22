/**
 * Evaluation result
 */
export interface EvaluationResult {
  /** Original expression */
  expression: string;

  /** Calculated result */
  result: number | string;

  /** Whether evaluation succeeded */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Result type */
  type: 'number' | 'error';
}

/**
 * Calculator preferences
 */
export interface CalculatorPreferences {
  precision: number;
  copyOnSelect: boolean;
}
