# Testing Strategy

## Overview

This document outlines the testing strategy for Nixed, following Test-Driven Development (TDD) principles. All code must be tested before implementation is considered complete.

## Testing Principles

### Test-Driven Development (TDD)

**Red-Green-Refactor Cycle:**
1. **Red**: Write a failing test first
2. **Green**: Write minimal code to make test pass
3. **Refactor**: Improve code while keeping tests green

**Benefits:**
- Forces clear requirements
- Ensures testable code
- Provides regression protection
- Documents expected behavior

### Testing Pyramid

```
           ┌─────────────┐
           │     E2E     │  <- Few, slow, expensive
           │   Tests     │
           ├─────────────┤
           │ Integration │  <- Some, moderate speed
           │   Tests     │
           ├─────────────┤
           │    Unit     │  <- Many, fast, cheap
           │   Tests     │
           └─────────────┘
```

**Distribution Target:**
- Unit Tests: 70%
- Integration Tests: 20%
- E2E Tests: 10%

### Coverage Goals

- **Overall**: 80% minimum
- **Business Logic**: 90% minimum
- **UI Components**: 70% minimum
- **Rust Backend**: 85% minimum

## Testing Stack

### Frontend (TypeScript)

```json
{
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage",
  "test:e2e": "playwright test"
}
```

**Tools:**
- **Vitest**: Unit and integration testing
- **@testing-library/react**: React component testing
- **@vitest/coverage-v8**: Code coverage
- **Playwright**: End-to-end testing
- **MSW**: API mocking

### Backend (Rust)

```bash
cargo test              # Run all tests
cargo test --lib        # Run unit tests only
cargo tarpaulin         # Generate coverage report
```

**Tools:**
- **Built-in test framework**: Unit tests
- **mockall**: Mocking dependencies
- **rstest**: Parameterized tests
- **cargo-tarpaulin**: Coverage reporting

## Test Organization

### Directory Structure

```
packages/
├── core/
│   ├── src/
│   │   └── components/
│   │       ├── launcher.tsx
│   │       └── launcher.test.tsx      # Co-located with component
│   ├── src-tauri/
│   │   └── src/
│   │       ├── managers/
│   │       │   ├── clipboard_manager.rs
│   │       │   └── clipboard_manager.rs  # Contains #[cfg(test)] mod tests
│   └── tests/
│       ├── integration/               # Integration tests
│       │   ├── plugin-loading.test.ts
│       │   └── search-flow.test.ts
│       └── e2e/                       # E2E tests
│           ├── launcher.spec.ts
│           └── plugins.spec.ts
├── sdk/
│   ├── src/
│   │   └── api/
│   │       ├── clipboard.ts
│   │       └── clipboard.test.ts      # Co-located with module
└── plugins/
    └── calculator/
        ├── src/
        │   └── services/
        │       ├── evaluator.ts
        │       └── evaluator.test.ts  # Co-located with service
        └── tests/
            └── integration/
                └── calculator.test.ts
```

## Unit Testing

### TypeScript Unit Tests

#### Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentOrFunction } from './component-or-function';

describe('ComponentOrFunction', () => {
  // Setup
  beforeEach(() => {
    // Initialize test state
  });

  afterEach(() => {
    // Cleanup
    vi.clearAllMocks();
  });

  describe('specific functionality', () => {
    it('should behave as expected in happy path', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = ComponentOrFunction(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle edge case', () => {
      // Test edge cases
    });

    it('should throw error on invalid input', () => {
      // Test error cases
      expect(() => ComponentOrFunction('')).toThrow('Expected error');
    });
  });
});
```

#### React Component Testing

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LauncherInput } from './launcher-input';

describe('LauncherInput', () => {
  it('should render input field', () => {
    render(<LauncherInput />);

    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('should call onChange when typing', () => {
    const onChange = vi.fn();
    render(<LauncherInput onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(onChange).toHaveBeenCalledWith('test');
  });

  it('should focus input on mount', () => {
    render(<LauncherInput autoFocus />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveFocus();
  });
});
```

#### Mocking SDK Functions

```typescript
import { vi } from 'vitest';

// Mock SDK
vi.mock('@nixed/sdk', () => ({
  clipboard: {
    read: vi.fn(),
    write: vi.fn(),
  },
  storage: {
    get: vi.fn(),
    set: vi.fn(),
  },
  browser: {
    open: vi.fn(),
  },
  ui: {
    showToast: vi.fn(),
    close: vi.fn(),
  },
}));

// Usage in test
import { clipboard } from '@nixed/sdk';

it('should copy to clipboard', async () => {
  vi.mocked(clipboard.write).mockResolvedValue();

  await someFunction();

  expect(clipboard.write).toHaveBeenCalledWith('expected value');
});
```

### Rust Unit Tests

#### Test Template

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_happy_path() {
        // Arrange
        let input = "test";

        // Act
        let result = function_under_test(input);

        // Assert
        assert_eq!(result, expected_value);
    }

    #[test]
    fn test_edge_case() {
        // Test edge cases
    }

    #[test]
    #[should_panic(expected = "expected error message")]
    fn test_error_case() {
        // Test error cases
        function_that_should_panic();
    }
}
```

#### Async Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_async_function() {
        // Arrange
        let manager = ClipboardManager::new(10);

        // Act
        let result = manager.get_history().await;

        // Assert
        assert!(result.is_empty());
    }
}
```

#### Parameterized Tests (rstest)

```rust
use rstest::rstest;

#[rstest]
#[case(2, 2, 4)]
#[case(10, 5, 15)]
#[case(-1, 1, 0)]
fn test_addition(#[case] a: i32, #[case] b: i32, #[case] expected: i32) {
    assert_eq!(add(a, b), expected);
}
```

## Integration Testing

### TypeScript Integration Tests

#### Plugin Loading Test

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { PluginRegistry } from '../services/plugin-registry';
import type { AppConfig } from '../types/config.types';

describe('Plugin System Integration', () => {
  let registry: PluginRegistry;

  beforeAll(async () => {
    const config: AppConfig = {
      triggerKey: 'Ctrl+Space',
      plugins: {
        calculator: {
          enabled: true,
          preferences: { precision: 6 },
        },
      },
      ui: {
        theme: 'system',
        windowWidth: 600,
        maxResults: 10,
      },
    };

    registry = new PluginRegistry();
    await registry.initialize(config);
  });

  it('should load calculator plugin', () => {
    const plugin = registry.getPlugin('calculator');

    expect(plugin).toBeDefined();
    expect(plugin?.manifest.name).toBe('Calculator');
  });

  it('should execute calculator search', async () => {
    const plugin = registry.getPlugin('calculator');
    const results = await plugin?.instance.onSearch?.({ text: '2+2' });

    expect(results).toBeDefined();
    expect(results?.[0]?.title).toBe('4');
  });

  it('should handle plugin preferences', () => {
    const plugin = registry.getPlugin('calculator');

    expect(plugin?.context.preferences).toEqual({ precision: 6 });
  });
});
```

#### Search Engine Integration Test

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { PluginRegistry } from '../services/plugin-registry';
import { SearchEngine } from '../services/search-engine';

describe('Search Engine Integration', () => {
  let searchEngine: SearchEngine;

  beforeAll(async () => {
    const config = {
      /* ... */
    };
    const registry = new PluginRegistry();
    await registry.initialize(config);

    searchEngine = new SearchEngine(registry);
  });

  it('should aggregate results from multiple plugins', async () => {
    const results = await searchEngine.search('test');

    expect(results.length).toBeGreaterThan(0);
  });

  it('should route to specific plugin with shortcut', async () => {
    const results = await searchEngine.search('clip test');

    expect(results.every((r) => r.pluginId === 'clipboard')).toBe(true);
  });

  it('should rank calculator results higher', async () => {
    const results = await searchEngine.search('2+2');

    expect(results[0]?.pluginId).toBe('calculator');
  });
});
```

### Rust Integration Tests

#### tests/integration/storage_test.rs

```rust
use nixed::managers::storage_manager::StorageManager;
use tempfile::tempdir;

#[tokio::test]
async fn test_storage_manager_integration() {
    // Setup
    let temp_dir = tempdir().unwrap();
    let manager = StorageManager::new(temp_dir.path().to_path_buf());
    manager.init().await.unwrap();

    // Test set
    manager
        .set("test-plugin", "key1", "value1".to_string())
        .await
        .unwrap();

    // Test get
    let value = manager.get("test-plugin", "key1").await.unwrap();
    assert_eq!(value, Some("value1".to_string()));

    // Test persistence
    drop(manager);

    // Create new instance
    let manager2 = StorageManager::new(temp_dir.path().to_path_buf());
    let value2 = manager2.get("test-plugin", "key1").await.unwrap();
    assert_eq!(value2, Some("value1".to_string()));
}
```

## End-to-End Testing

### Playwright E2E Tests

#### Setup (playwright.config.ts)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### Launcher E2E Test

```typescript
import { test, expect } from '@playwright/test';

test.describe('Launcher', () => {
  test('should open launcher with keyboard shortcut', async ({ page }) => {
    await page.goto('/');

    // Simulate global shortcut (in real test, would need OS-level automation)
    await page.keyboard.press('Control+Space');

    // Wait for launcher to appear
    const launcher = page.getByRole('textbox');
    await expect(launcher).toBeVisible();
    await expect(launcher).toBeFocused();
  });

  test('should show search results as user types', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+Space');

    const input = page.getByRole('textbox');
    await input.fill('2+2');

    // Wait for calculator result
    const result = page.getByText('4');
    await expect(result).toBeVisible();
  });

  test('should execute action on Enter', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+Space');

    const input = page.getByRole('textbox');
    await input.fill('2+2');

    // Wait for result
    await page.waitForSelector('[role="option"]');

    // Select first result
    await page.keyboard.press('Enter');

    // Launcher should close
    await expect(input).not.toBeVisible();
  });

  test('should close launcher on Escape', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+Space');

    const input = page.getByRole('textbox');
    await expect(input).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(input).not.toBeVisible();
  });
});
```

#### Plugin E2E Test

```typescript
import { test, expect } from '@playwright/test';

test.describe('Calculator Plugin', () => {
  test('should evaluate basic arithmetic', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+Space');

    await page.fill('[role="textbox"]', '10 + 20');

    const result = page.getByText('30');
    await expect(result).toBeVisible();
  });

  test('should handle complex expressions', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+Space');

    await page.fill('[role="textbox"]', '(2 + 3) * 4');

    const result = page.getByText('20');
    await expect(result).toBeVisible();
  });

  test('should copy result to clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/');
    await page.keyboard.press('Control+Space');

    await page.fill('[role="textbox"]', '5 * 5');
    await page.keyboard.press('Enter');

    // Check clipboard
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe('25');
  });
});
```

## Coverage Reporting

### TypeScript Coverage

```bash
# Run tests with coverage
pnpm test:coverage

# Generate HTML report
pnpm test:coverage --reporter=html

# View report
open coverage/index.html
```

### Rust Coverage

```bash
# Install tarpaulin
cargo install cargo-tarpaulin

# Generate coverage
cargo tarpaulin --out Html --output-dir coverage

# View report
open coverage/index.html
```

### CI Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm test:coverage
      - run: pnpm test:e2e

      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable

      - run: cargo test --all
      - run: cargo tarpaulin --out Xml

      - uses: codecov/codecov-action@v3
        with:
          files: ./cobertura.xml
```

## Test Maintenance

### When to Write Tests

**Always:**
- Before implementing new feature (TDD)
- When fixing a bug (regression test)
- When refactoring (safety net)

**Test Granularity:**
- One concept per test
- Test should fail for one reason only
- Descriptive test names (no need for comments)

### When to Skip Tests

**Never skip for:**
- Core business logic
- Security-sensitive code
- Data transformation
- API boundaries

**Can skip for:**
- Simple type definitions
- Trivial getters/setters
- Generated code

### Test Quality Checklist

- [ ] Test is fast (<100ms for unit tests)
- [ ] Test is isolated (no external dependencies)
- [ ] Test is repeatable (same result every time)
- [ ] Test has clear Arrange-Act-Assert structure
- [ ] Test name describes what is being tested
- [ ] Test covers both happy and error paths
- [ ] Test uses meaningful assertions
- [ ] Test doesn't test implementation details

## Debugging Tests

### Vitest Debugging

```typescript
// Add .only to run single test
it.only('should do something', () => {
  // ...
});

// Add .skip to skip test
it.skip('should do something', () => {
  // ...
});

// Use describe.only for test suite
describe.only('Component', () => {
  // ...
});
```

### VS Code Integration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Vitest Tests",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["test", "--run", "--inspect-brk"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-22
**Status**: Draft for Implementation
