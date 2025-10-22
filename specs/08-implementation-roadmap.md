# Implementation Roadmap

## Overview

This document provides a step-by-step roadmap for implementing Nixed. Each phase builds on the previous one, following TDD principles and SOLID design.

## Phase Overview

```
Phase 1: Foundation        [~2-3 days]
   ↓
Phase 2: Core Backend      [~3-4 days]
   ↓
Phase 3: SDK Development   [~2-3 days]
   ↓
Phase 4: Plugin System     [~3-4 days]
   ↓
Phase 5: Core Plugins      [~4-5 days]
   ↓
Phase 6: UI Development    [~3-4 days]
   ↓
Phase 7: Polish & Testing  [~2-3 days]
```

**Total Estimated Time**: 19-26 days

---

## Phase 1: Foundation (2-3 days)

### Goals
- Set up monorepo structure
- Configure build tools
- Establish development workflow
- Create base Tauri application

### Tasks

#### 1.1: Initialize Monorepo

```bash
# Create project structure
mkdir -p nixed/packages/{core,sdk,plugins}
cd nixed

# Initialize pnpm workspace
cat > pnpm-workspace.yaml << EOF
packages:
  - 'packages/*'
  - 'packages/plugins/*'
EOF

# Initialize root package.json
pnpm init
```

**Test**: Verify workspace configuration
```bash
pnpm -r list
```

#### 1.2: Initialize Tauri Application

```bash
cd packages/core
pnpm create tauri-app . --template react-ts

# Update package.json name
{
  "name": "@nixed/core",
  "version": "0.1.0"
}
```

**Test**: Verify Tauri runs
```bash
pnpm tauri dev
```

#### 1.3: Configure TypeScript

Create strict `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**Test**: Verify type checking
```bash
pnpm type-check
```

#### 1.4: Configure Testing

```bash
# Install testing dependencies
pnpm add -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom

# Create vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/node_modules/**'],
    },
  },
});
```

**Test**: Create and run first test
```typescript
// src/test/setup.test.ts
import { describe, it, expect } from 'vitest';

describe('test setup', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});
```

```bash
pnpm test
```

#### 1.5: Configure Linting

```bash
# Install ESLint
pnpm add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Create .eslintrc.json
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

**Test**: Run linter
```bash
pnpm lint
```

### Deliverables
- ✅ Working monorepo structure
- ✅ Tauri app runs successfully
- ✅ TypeScript configured with strict mode
- ✅ Testing framework set up
- ✅ Linting configured

---

## Phase 2: Core Backend (3-4 days)

### Goals
- Implement Rust backend managers
- Create Tauri IPC commands
- Set up error handling
- Write comprehensive tests

### Tasks

#### 2.1: Error Handling Types

**TDD Step 1: Write test**
```rust
// src-tauri/src/models/error.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let error = NixedError::Clipboard("test error".to_string());
        assert_eq!(error.to_string(), "Clipboard error: test error");
    }
}
```

**TDD Step 2: Implement**
```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum NixedError {
    #[error("Clipboard error: {0}")]
    Clipboard(String),

    #[error("Storage error: {0}")]
    Storage(String),

    #[error("Window error: {0}")]
    Window(String),
}

pub type NixedResult<T> = Result<T, NixedError>;
```

**Verify**: Run tests
```bash
cargo test models::error
```

#### 2.2: Storage Manager

**TDD Step 1: Write tests** (see `02-core-application-spec.md`)

**TDD Step 2: Implement** `StorageManager` struct

**TDD Step 3: Refactor and verify**
```bash
cargo test managers::storage_manager
```

**Coverage check**:
```bash
cargo tarpaulin --packages nixed --exclude-files src/main.rs
```

Target: >85% coverage

#### 2.3: Clipboard Manager

Follow same TDD process:
1. Write tests for `ClipboardManager`
2. Implement `ClipboardManager`
3. Verify tests pass
4. Check coverage

#### 2.4: Window Manager

Follow TDD process for window management operations.

#### 2.5: Shortcut Manager

Implement global shortcut registration with TDD.

#### 2.6: Tauri Commands

**TDD Step 1: Write integration test**
```rust
// tests/integration/commands.rs
#[tokio::test]
async fn test_clipboard_read_write() {
    // Test IPC commands end-to-end
}
```

**TDD Step 2: Implement commands** (see `02-core-application-spec.md`)

**TDD Step 3: Verify**
```bash
cargo test --test integration
```

#### 2.7: Main Application

Wire everything together in `main.rs`.

**Manual test**: Run application
```bash
pnpm tauri dev
```

Verify:
- Application starts
- Global shortcut works (Ctrl+Space)
- Window shows/hides

### Deliverables
- ✅ All managers implemented with tests
- ✅ >85% Rust code coverage
- ✅ All Tauri commands working
- ✅ Application runs and responds to shortcut

---

## Phase 3: SDK Development (2-3 days)

### Goals
- Create type-safe SDK package
- Implement all API modules
- Write comprehensive tests
- Document all public APIs

### Tasks

#### 3.1: Initialize SDK Package

```bash
cd packages/sdk
pnpm init

# Install dependencies
pnpm add @tauri-apps/api react
pnpm add -D typescript tsup vitest
```

#### 3.2: Type Definitions

**TDD Step 1: Write type tests**
```typescript
// src/types/plugin.types.test.ts
import { describe, it, expectTypeOf } from 'vitest';
import type { Plugin, PluginManifest } from './plugin.types';

describe('Plugin types', () => {
  it('should enforce manifest structure', () => {
    const manifest: PluginManifest = {
      id: 'test',
      name: 'Test',
      description: 'Test plugin',
      version: '1.0.0',
      author: 'Test',
      commands: [],
    };

    expectTypeOf(manifest).toMatchTypeOf<PluginManifest>();
  });
});
```

**TDD Step 2: Implement types** (see `03-sdk-specification.md`)

#### 3.3: Clipboard API

**TDD Step 1: Write tests**
```typescript
// src/api/clipboard.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clipboard } from './clipboard';
import * as ipc from '../internal/ipc';

vi.mock('../internal/ipc');

describe('clipboard API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('write', () => {
    it('should call IPC with correct params', async () => {
      vi.mocked(ipc.invoke).mockResolvedValue(undefined);

      await clipboard.write('test');

      expect(ipc.invoke).toHaveBeenCalledWith('clipboard_write', { text: 'test' });
    });

    it('should throw on IPC error', async () => {
      vi.mocked(ipc.invoke).mockRejectedValue(new Error('IPC failed'));

      await expect(clipboard.write('test')).rejects.toThrow();
    });
  });

  describe('read', () => {
    it('should return clipboard content', async () => {
      vi.mocked(ipc.invoke).mockResolvedValue('clipboard content');

      const result = await clipboard.read();

      expect(result).toBe('clipboard content');
      expect(ipc.invoke).toHaveBeenCalledWith('clipboard_read');
    });
  });
});
```

**TDD Step 2: Implement** (see `03-sdk-specification.md`)

**TDD Step 3: Verify**
```bash
pnpm test src/api/clipboard.test.ts
```

#### 3.4: Storage API

Follow same TDD process for storage API.

#### 3.5: Browser API

Follow TDD process for browser operations.

#### 3.6: UI API

Implement UI utilities with TDD.

#### 3.7: React Hooks

**TDD Step 1: Write hook tests**
```typescript
import { renderHook, act } from '@testing-library/react';
import { useStorage } from './use-storage';

describe('useStorage', () => {
  it('should load initial value', async () => {
    const { result } = renderHook(() => useStorage('key', 'default'));

    expect(result.current[2]).toBe(true); // isLoading

    await waitFor(() => {
      expect(result.current[2]).toBe(false);
    });

    expect(result.current[0]).toBe('default');
  });
});
```

**TDD Step 2: Implement hooks**

#### 3.8: Documentation

Add TSDoc to all public APIs (see `03-sdk-specification.md`).

#### 3.9: Build and Publish

```bash
# Build SDK
pnpm build

# Verify types are generated
ls dist/index.d.ts
```

### Deliverables
- ✅ SDK package with all APIs
- ✅ >90% test coverage
- ✅ All APIs documented
- ✅ TypeScript types working

---

## Phase 4: Plugin System (3-4 days)

### Goals
- Implement plugin discovery
- Create plugin loader
- Build plugin registry
- Implement search engine

### Tasks

#### 4.1: Plugin Loader

**TDD Step 1: Write tests** (see `04-plugin-system-spec.md`)

**TDD Step 2: Implement `PluginLoader` class**

**Verify**:
```bash
pnpm test src/services/plugin-loader.test.ts
```

#### 4.2: Plugin Registry

Follow TDD for `PluginRegistry` implementation.

#### 4.3: Search Engine

**TDD Step 1: Write tests**
```typescript
describe('SearchEngine', () => {
  describe('parseQuery', () => {
    it('should detect command prefix', () => {
      const context = searchEngine['parseQuery']('clip test');

      expect(context.commandPrefix).toBe('clip');
      expect(context.args).toBe('test');
    });

    it('should handle query without prefix', () => {
      const context = searchEngine['parseQuery']('just a query');

      expect(context.commandPrefix).toBeUndefined();
      expect(context.query).toBe('just a query');
    });
  });

  describe('rankResults', () => {
    it('should prioritize exact matches', () => {
      // Test ranking logic
    });
  });
});
```

**TDD Step 2: Implement**

**TDD Step 3: Verify**
```bash
pnpm test src/services/search-engine.test.ts
```

#### 4.4: React Integration

Create `PluginProvider` component with tests.

#### 4.5: Integration Tests

**Test plugin loading end-to-end**:
```typescript
describe('Plugin System Integration', () => {
  it('should load and search across plugins', async () => {
    const registry = new PluginRegistry();
    await registry.initialize(mockConfig);

    const searchEngine = new SearchEngine(registry);
    const results = await searchEngine.search('test');

    expect(results.length).toBeGreaterThan(0);
  });
});
```

### Deliverables
- ✅ Plugin loading works
- ✅ Search aggregation works
- ✅ >85% test coverage
- ✅ Integration tests pass

---

## Phase 5: Core Plugins (4-5 days)

### Goals
- Implement three initial plugins
- Comprehensive testing for each
- Integration with plugin system

### Tasks

#### 5.1: Calculator Plugin

**Day 1: Expression Evaluator**

**TDD**: Write tests → Implement → Refactor
```typescript
describe('ExpressionEvaluator', () => {
  // All test cases from 05-plugin-implementations.md
});
```

**Day 2: Plugin Integration**

Implement plugin with SDK, add tests.

**Verify**:
```bash
cd packages/plugins/calculator
pnpm test
pnpm test:coverage  # Target: >90%
```

#### 5.2: Clipboard Plugin

**Day 1: Clipboard Monitor**

**TDD**: Implement with tests (see `05-plugin-implementations.md`)

**Day 2: Plugin Integration**

Wire up to SDK, test end-to-end.

#### 5.3: Web Search Plugin

**Day 1: Implementation**

Simpler plugin, implement with TDD.

**Verify all plugins**:
```bash
# From root
pnpm -r test
```

#### 5.4: Plugin Integration Testing

**Test all plugins load correctly**:
```typescript
describe('All Plugins', () => {
  it('should load all three plugins', async () => {
    const manifests = await loader.discoverPlugins();

    expect(manifests).toHaveLength(3);
    expect(manifests.map(m => m.id)).toContain('calculator');
    expect(manifests.map(m => m.id)).toContain('clipboard');
    expect(manifests.map(m => m.id)).toContain('web-search');
  });
});
```

### Deliverables
- ✅ Three working plugins
- ✅ >90% coverage per plugin
- ✅ Integration tests pass
- ✅ Plugins discoverable by system

---

## Phase 6: UI Development (3-4 days)

### Goals
- Build launcher UI
- Implement settings window
- Create search results display
- Add keyboard navigation

### Tasks

#### 6.1: Launcher Window Component

**TDD Step 1: Write component tests**
```typescript
describe('LauncherWindow', () => {
  it('should render input field', () => {
    render(<LauncherWindow />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should focus input on mount', () => {
    render(<LauncherWindow />);
    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('should show loading state while searching', async () => {
    render(<LauncherWindow />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });
});
```

**TDD Step 2: Implement component**

#### 6.2: Search Results Component

**TDD**: Test rendering, selection, keyboard nav

**Implement**:
- Result list
- Keyboard navigation (↑↓ arrows)
- Selection (Enter)
- Actions (→ arrow for secondary actions)

#### 6.3: Settings Window

Create settings UI:
- Plugin list
- Enable/disable toggles
- Preference forms
- Global shortcut config

#### 6.4: Styling

Apply TailwindCSS styling:
- Launcher window design
- Result item styling
- Animations (fade in/out)
- Focus states

#### 6.5: Keyboard Navigation

Implement comprehensive keyboard shortcuts:
- `Ctrl+Space`: Toggle launcher
- `Escape`: Close launcher
- `↑/↓`: Navigate results
- `Enter`: Execute action
- `→`: Show secondary actions
- `Ctrl+,`: Open settings

**Test with E2E**:
```typescript
test('keyboard navigation', async ({ page }) => {
  await page.keyboard.press('Control+Space');
  await page.fill('[role="textbox"]', '2+2');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  // Verify result copied
});
```

### Deliverables
- ✅ Complete launcher UI
- ✅ Settings window
- ✅ Full keyboard navigation
- ✅ E2E tests pass

---

## Phase 7: Polish & Testing (2-3 days)

### Goals
- Fix bugs
- Improve UX
- Comprehensive testing
- Performance optimization
- Documentation

### Tasks

#### 7.1: Bug Fixes

Test entire application, fix issues:
- Plugin loading errors
- Search edge cases
- UI glitches
- Platform-specific issues

#### 7.2: Performance

**Profile and optimize**:
```bash
# React DevTools Profiler
# Identify slow components

# Rust profiling
cargo flamegraph
```

Optimize:
- Debounce search input (150ms)
- Memoize expensive computations
- Lazy load plugins
- Optimize Rust hot paths

#### 7.3: Accessibility

Verify:
- Screen reader support
- Keyboard-only navigation
- Color contrast (WCAG AA)
- Focus indicators
- ARIA labels

#### 7.4: Cross-Platform Testing

Test on:
- Linux (primary)
- macOS
- Windows

Fix platform-specific issues.

#### 7.5: Documentation

Write:
- README.md (user-facing)
- CONTRIBUTING.md
- Plugin development guide
- API reference

#### 7.6: Final Testing

**Full test suite**:
```bash
# Frontend
pnpm test:coverage

# Backend
cargo test
cargo tarpaulin

# E2E
pnpm test:e2e

# Manual testing
pnpm tauri build
# Test built application
```

### Deliverables
- ✅ All tests passing
- ✅ >80% overall coverage
- ✅ No critical bugs
- ✅ Good performance
- ✅ Complete documentation

---

## Success Criteria

### Functionality
- [ ] Application starts and shows in system tray
- [ ] Global shortcut (Ctrl+Space) works
- [ ] Calculator evaluates expressions correctly
- [ ] Clipboard history tracks and displays items
- [ ] Web search opens browser with query
- [ ] Settings can be changed and persist
- [ ] All keyboard shortcuts work

### Code Quality
- [ ] TypeScript: No `any` types
- [ ] >80% test coverage overall
- [ ] >90% test coverage on business logic
- [ ] All linters pass
- [ ] No TypeScript errors
- [ ] No Clippy warnings

### Performance
- [ ] Launcher opens in <100ms
- [ ] Search results appear in <50ms
- [ ] No memory leaks
- [ ] Low CPU usage when idle

### Documentation
- [ ] All public APIs documented
- [ ] Developer guide complete
- [ ] User documentation written
- [ ] Architecture documented

---

## Risk Mitigation

### Risk: Global shortcuts don't work on Linux

**Mitigation**:
- Research Linux alternatives early
- Implement fallback (system tray click)
- Document limitations

### Risk: Plugin loading is slow

**Mitigation**:
- Lazy load plugins
- Cache compiled code
- Optimize dynamic imports

### Risk: Clipboard monitoring consumes resources

**Mitigation**:
- Implement efficient polling
- Use OS events where available
- Allow user to disable

---

## Implementation Tips

### Start Small
Implement one feature completely (with tests) before moving to the next.

### Follow TDD Strictly
Never write implementation code without a failing test first.

### Refactor Continuously
Don't accumulate technical debt. Refactor as you go.

### Review Regularly
Code review your own work. Check against SOLID principles.

### Ask for Help
If stuck for >30 minutes, seek assistance or break down the problem.

---

**Document Version**: 1.0
**Last Updated**: 2025-10-22
**Status**: Draft for Implementation
