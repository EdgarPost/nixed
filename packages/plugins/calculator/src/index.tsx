import type { Plugin, SearchQuery, SearchResult } from '@nixed/sdk';
import { clipboard, ui } from '@nixed/sdk';
import { ExpressionEvaluator } from './services/expression-evaluator';

// Plugin instance
const evaluator = new ExpressionEvaluator();

const CalculatorPlugin: Plugin = {
  manifest: require('../package.json').nixed,

  onLoad: async () => {
    console.log('Calculator plugin loaded');
  },

  onSearch: (query: SearchQuery): SearchResult[] => {
    const text = query.text.trim();

    // Only show results if query looks like a calculation
    if (!text || !isCalculationQuery(text)) {
      return [];
    }

    // Strip leading '=' if present
    const expression = text.startsWith('=') ? text.slice(1) : text;

    // Evaluate expression
    const result = evaluator.evaluate(expression);

    if (!result.success) {
      return [];
    }

    return [
      {
        id: 'calc-result',
        title: String(result.result),
        subtitle: `= ${text}`,
        icon: '🔢',
        accessories: [
          {
            text: 'Calculator',
            icon: '🧮',
          },
        ],
        onAction: async () => {
          // Copy result to clipboard
          await clipboard.write(String(result.result));
          ui.showToast('Result copied to clipboard', 'success');
          await ui.close();
        },
        actions: [
          {
            id: 'copy',
            title: 'Copy Result',
            icon: '📋',
            shortcut: 'Ctrl+C',
            onAction: async () => {
              await clipboard.write(String(result.result));
              ui.showToast('Result copied', 'success');
            },
          },
          {
            id: 'copy-expression',
            title: 'Copy Expression',
            icon: '📝',
            onAction: async () => {
              await clipboard.write(text);
              ui.showToast('Expression copied', 'success');
            },
          },
        ],
      },
    ];
  },
};

/**
 * Check if query looks like a calculation
 */
function isCalculationQuery(query: string): boolean {
  // Check for mathematical operators or starts with =
  const mathPattern = /[\d\+\-\*\/\(\)\^\%\.]/;
  const startsWithEquals = query.startsWith('=');

  return startsWithEquals || mathPattern.test(query);
}

export default CalculatorPlugin;
