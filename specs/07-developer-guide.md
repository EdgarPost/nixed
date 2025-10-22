# Developer Guide

## Overview

This guide provides practical guidance for implementing the Nixed launcher. It covers setup, development workflow, coding standards, and best practices.

## Prerequisites

### Required Tools

- **Node.js**: v20 or higher
- **pnpm**: v8 or higher (package manager)
- **Rust**: Latest stable (via rustup)
- **Tauri CLI**: v2.0 or higher
- **Git**: For version control

### Recommended Tools

- **VS Code** with extensions:
  - Rust Analyzer
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - Error Lens
- **Rust tools**:
  - clippy (linter)
  - rustfmt (formatter)
  - cargo-watch (auto-rebuild)

### Installation

```bash
# Install Node.js (via nvm)
nvm install 20
nvm use 20

# Install pnpm
npm install -g pnpm

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Tauri CLI
cargo install tauri-cli

# Install Rust tools
rustup component add clippy rustfmt
```

## Project Setup

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd nixed

# Install dependencies
pnpm install

# Build SDK package
cd packages/sdk
pnpm build
cd ../..

# Start development server
cd packages/core
pnpm tauri dev
```

### Workspace Structure

The project uses pnpm workspaces for monorepo management:

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'packages/plugins/*'
```

### Package Scripts

```json
{
  "scripts": {
    "dev": "tauri dev",
    "build": "tauri build",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx}\""
  }
}
```

## Development Workflow

### TDD Workflow

Follow the Red-Green-Refactor cycle strictly:

```bash
# 1. RED: Write failing test
pnpm test -- path/to/test.test.ts

# 2. GREEN: Implement minimal code to pass
# Edit source files

# 3. REFACTOR: Improve code while tests pass
pnpm test:watch

# 4. Verify types
pnpm type-check

# 5. Lint and format
pnpm lint:fix
pnpm format
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes with TDD
# Commit frequently with clear messages
git add .
git commit -m "feat: add calculator expression parser

- Implement ExpressionEvaluator class
- Add tests for basic arithmetic
- Handle edge cases (division by zero, etc.)"

# Push to remote
git push origin feature/your-feature-name

# Create pull request
gh pr create
```

### Commit Message Format

Follow Conventional Commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```
feat(sdk): add clipboard history API

- Implement clipboard.history() function
- Add ClipboardItem type
- Update tests

Closes #123
```

```
fix(plugin/calculator): handle division by zero

Previously, dividing by zero would crash the plugin.
Now it returns Infinity as expected.

Fixes #456
```

## Coding Standards

### TypeScript Standards

#### Type Safety

**Never use `any`:**

```typescript
// ❌ BAD
function processData(data: any) {
  return data.value;
}

// ✅ GOOD
interface Data {
  value: string;
}

function processData(data: Data): string {
  return data.value;
}
```

**Use unknown for truly unknown types:**

```typescript
// ❌ BAD
function parse(json: string): any {
  return JSON.parse(json);
}

// ✅ GOOD
function parse<T>(json: string): T {
  return JSON.parse(json) as T;
}

// ✅ BETTER (with validation)
function parse<T>(json: string, validator: (value: unknown) => value is T): T {
  const parsed: unknown = JSON.parse(json);
  if (!validator(parsed)) {
    throw new Error('Invalid JSON structure');
  }
  return parsed;
}
```

**Use type guards:**

```typescript
interface Success {
  type: 'success';
  data: string;
}

interface Error {
  type: 'error';
  message: string;
}

type Result = Success | Error;

function isSuccess(result: Result): result is Success {
  return result.type === 'success';
}

function handleResult(result: Result): void {
  if (isSuccess(result)) {
    console.log(result.data); // TypeScript knows this is Success
  } else {
    console.error(result.message); // TypeScript knows this is Error
  }
}
```

#### SOLID Principles in TypeScript

**Single Responsibility Principle:**

```typescript
// ❌ BAD: Class doing too much
class UserManager {
  validateUser(user: User): boolean { /* ... */ }
  saveUser(user: User): void { /* ... */ }
  sendEmail(user: User): void { /* ... */ }
}

// ✅ GOOD: Separate concerns
class UserValidator {
  validate(user: User): boolean { /* ... */ }
}

class UserRepository {
  save(user: User): void { /* ... */ }
}

class EmailService {
  sendWelcomeEmail(user: User): void { /* ... */ }
}
```

**Open/Closed Principle:**

```typescript
// ❌ BAD: Must modify to add new storage types
class Storage {
  save(key: string, value: string, type: 'local' | 'session'): void {
    if (type === 'local') {
      localStorage.setItem(key, value);
    } else if (type === 'session') {
      sessionStorage.setItem(key, value);
    }
  }
}

// ✅ GOOD: Open for extension, closed for modification
interface StorageAdapter {
  set(key: string, value: string): void;
  get(key: string): string | null;
}

class LocalStorageAdapter implements StorageAdapter {
  set(key: string, value: string): void {
    localStorage.setItem(key, value);
  }

  get(key: string): string | null {
    return localStorage.getItem(key);
  }
}

class SessionStorageAdapter implements StorageAdapter {
  set(key: string, value: string): void {
    sessionStorage.setItem(key, value);
  }

  get(key: string): string | null {
    return sessionStorage.getItem(key);
  }
}

class Storage {
  constructor(private adapter: StorageAdapter) {}

  save(key: string, value: string): void {
    this.adapter.set(key, value);
  }

  load(key: string): string | null {
    return this.adapter.get(key);
  }
}
```

**Dependency Inversion Principle:**

```typescript
// ❌ BAD: High-level module depends on low-level module
class EmailSender {
  send(to: string, message: string): void {
    // Direct dependency on SMTP
    const smtp = new SMTPClient();
    smtp.send(to, message);
  }
}

// ✅ GOOD: Both depend on abstraction
interface EmailService {
  send(to: string, message: string): Promise<void>;
}

class SMTPEmailService implements EmailService {
  async send(to: string, message: string): Promise<void> {
    // SMTP implementation
  }
}

class MockEmailService implements EmailService {
  async send(to: string, message: string): Promise<void> {
    console.log(`Mock email to ${to}: ${message}`);
  }
}

class NotificationSystem {
  constructor(private emailService: EmailService) {}

  async notifyUser(email: string, message: string): Promise<void> {
    await this.emailService.send(email, message);
  }
}
```

#### React Component Patterns

**Prefer functional components:**

```typescript
// ✅ GOOD
interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function Input({ value, onChange }: Props): React.JSX.Element {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
```

**Use custom hooks for logic:**

```typescript
// ✅ Extract complex logic into hooks
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Usage
function SearchInput(): React.JSX.Element {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    // Search with debounced query
  }, [debouncedQuery]);

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

**Memoize expensive computations:**

```typescript
import { useMemo } from 'react';

function SearchResults({ items, query }: Props): React.JSX.Element {
  // Only recompute when items or query changes
  const filtered = useMemo(() => {
    return items.filter((item) =>
      item.title.toLowerCase().includes(query.toLowerCase())
    );
  }, [items, query]);

  return (
    <div>
      {filtered.map((item) => (
        <div key={item.id}>{item.title}</div>
      ))}
    </div>
  );
}
```

### Rust Standards

#### Error Handling

**Use Result for fallible operations:**

```rust
// ❌ BAD: Using panic
fn read_config(path: &str) -> Config {
    let content = std::fs::read_to_string(path).unwrap();
    serde_json::from_str(&content).unwrap()
}

// ✅ GOOD: Using Result
fn read_config(path: &str) -> Result<Config, ConfigError> {
    let content = std::fs::read_to_string(path)
        .map_err(ConfigError::Io)?;

    let config = serde_json::from_str(&content)
        .map_err(ConfigError::Parse)?;

    Ok(config)
}
```

**Use thiserror for custom errors:**

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ConfigError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Parse error: {0}")]
    Parse(#[from] serde_json::Error),

    #[error("Invalid configuration: {0}")]
    Invalid(String),
}
```

#### SOLID Principles in Rust

**Single Responsibility:**

```rust
// ❌ BAD
struct UserManager {
    // Does validation, storage, and email
}

// ✅ GOOD
struct UserValidator;
struct UserRepository;
struct EmailService;
```

**Dependency Inversion:**

```rust
// ✅ Use traits for abstraction
trait Storage {
    fn get(&self, key: &str) -> Option<String>;
    fn set(&mut self, key: &str, value: String);
}

struct FileStorage {
    path: PathBuf,
}

impl Storage for FileStorage {
    fn get(&self, key: &str) -> Option<String> {
        // Implementation
    }

    fn set(&mut self, key: &str, value: String) {
        // Implementation
    }
}

// High-level module depends on trait
struct ConfigManager<S: Storage> {
    storage: S,
}
```

#### Async Rust

**Use async/await consistently:**

```rust
use tokio::fs;

async fn read_file(path: &str) -> Result<String, std::io::Error> {
    fs::read_to_string(path).await
}

async fn process_file(path: &str) -> Result<(), Box<dyn std::error::Error>> {
    let content = read_file(path).await?;
    // Process content
    Ok(())
}
```

**Use tokio for async runtime:**

```rust
#[tokio::test]
async fn test_async_function() {
    let result = async_function().await;
    assert!(result.is_ok());
}
```

## Testing Patterns

### Mocking

**TypeScript mocking with Vitest:**

```typescript
import { vi } from 'vitest';

// Mock module
vi.mock('@nixed/sdk', () => ({
  clipboard: {
    write: vi.fn(),
  },
}));

// Mock implementation
import { clipboard } from '@nixed/sdk';
vi.mocked(clipboard.write).mockResolvedValue();

// Verify calls
expect(clipboard.write).toHaveBeenCalledWith('expected');
```

**Rust mocking with mockall:**

```rust
use mockall::predicate::*;
use mockall::mock;

mock! {
    Storage {}

    impl Storage for Storage {
        fn get(&self, key: &str) -> Option<String>;
        fn set(&mut self, key: &str, value: String);
    }
}

#[test]
fn test_with_mock() {
    let mut mock = MockStorage::new();

    mock.expect_get()
        .with(eq("key"))
        .returning(|_| Some("value".to_string()));

    assert_eq!(mock.get("key"), Some("value".to_string()));
}
```

### Test Data Builders

```typescript
// Test data builder pattern
class UserBuilder {
  private user: Partial<User> = {};

  withId(id: string): this {
    this.user.id = id;
    return this;
  }

  withEmail(email: string): this {
    this.user.email = email;
    return this;
  }

  build(): User {
    return {
      id: this.user.id || 'default-id',
      email: this.user.email || 'test@example.com',
      name: this.user.name || 'Test User',
    };
  }
}

// Usage in tests
const user = new UserBuilder()
  .withId('123')
  .withEmail('user@test.com')
  .build();
```

## Common Patterns

### Loading State Pattern

```typescript
type LoadingState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function DataComponent(): React.JSX.Element {
  const [state, setState] = useState<LoadingState<Data>>({ status: 'idle' });

  useEffect(() => {
    setState({ status: 'loading' });

    fetchData()
      .then((data) => setState({ status: 'success', data }))
      .catch((error) => setState({ status: 'error', error }));
  }, []);

  switch (state.status) {
    case 'idle':
    case 'loading':
      return <div>Loading...</div>;
    case 'success':
      return <div>{state.data.value}</div>;
    case 'error':
      return <div>Error: {state.error.message}</div>;
  }
}
```

### Repository Pattern

```typescript
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<void>;
  delete(id: string): Promise<void>;
}

class PluginRepository implements Repository<Plugin> {
  constructor(private storage: StorageAdapter) {}

  async findById(id: string): Promise<Plugin | null> {
    const data = await this.storage.get(`plugin:${id}`);
    return data ? JSON.parse(data) : null;
  }

  async findAll(): Promise<Plugin[]> {
    // Implementation
    return [];
  }

  async save(plugin: Plugin): Promise<void> {
    await this.storage.set(`plugin:${plugin.id}`, JSON.stringify(plugin));
  }

  async delete(id: string): Promise<void> {
    await this.storage.remove(`plugin:${id}`);
  }
}
```

## Debugging

### TypeScript Debugging

**Console logging:**

```typescript
// Use structured logging
console.log('User logged in', { userId: user.id, timestamp: new Date() });

// Use console.table for arrays
console.table(users);

// Use console.group for nested logs
console.group('Plugin Loading');
console.log('Loading plugins...');
console.log('Found 3 plugins');
console.groupEnd();
```

**VS Code debugger:**

Set breakpoints and run "Debug Vitest Tests" configuration.

### Rust Debugging

**Debug prints:**

```rust
// Use dbg! macro
let result = dbg!(calculate(10, 20));

// Use debug formatting
println!("{:?}", complex_struct);
```

**VS Code debugger:**

Install CodeLLDB extension and use "Debug Rust Tests" configuration.

## Performance Optimization

### React Performance

**Avoid unnecessary re-renders:**

```typescript
// Use React.memo for expensive components
export const ExpensiveComponent = React.memo(({ data }: Props) => {
  // Expensive rendering logic
  return <div>{/* ... */}</div>;
});

// Use useCallback for stable callbacks
function Parent(): React.JSX.Element {
  const handleClick = useCallback(() => {
    // Handler logic
  }, []); // Dependencies array

  return <Child onClick={handleClick} />;
}
```

### Rust Performance

**Use efficient data structures:**

```rust
// Use HashMap for O(1) lookups
use std::collections::HashMap;

let mut map = HashMap::new();
map.insert("key", "value");

// Use Vec for sequential data
let mut vec = Vec::new();
vec.push(item);
```

**Profile with cargo-flamegraph:**

```bash
cargo install flamegraph
cargo flamegraph --bin nixed
```

## Documentation

### Code Comments

**When to comment:**

```typescript
// ✅ GOOD: Explain WHY, not WHAT
// Use binary search because array is sorted and can be large (>10k items)
function findItem(arr: number[], target: number): number {
  // Implementation
}

// ❌ BAD: Obvious comment
// This function adds two numbers
function add(a: number, b: number): number {
  return a + b;
}
```

### TSDoc Comments

```typescript
/**
 * Evaluates a mathematical expression
 *
 * @param expression - The expression to evaluate (e.g., "2 + 2")
 * @param precision - Number of decimal places (default: 6)
 * @returns Evaluation result with success status
 * @throws {Error} If expression contains invalid syntax
 *
 * @example
 * ```typescript
 * const result = evaluate("2 + 2");
 * console.log(result.result); // "4"
 * ```
 */
export function evaluate(expression: string, precision?: number): EvaluationResult {
  // Implementation
}
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-22
**Status**: Draft for Implementation
