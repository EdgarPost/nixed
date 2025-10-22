# Nixed Specifications

Welcome to the Nixed project specifications! This directory contains comprehensive technical documentation for building a Raycast-like launcher for Linux (and cross-platform) using Tauri.

## 📋 Document Index

### Core Specifications

1. **[Architecture Overview](./01-architecture-overview.md)**
   - System design and component relationships
   - Technology stack and design principles
   - High-level architecture diagrams
   - Cross-platform considerations
   - **Start here** for a big-picture understanding

2. **[Core Application Specification](./02-core-application-spec.md)**
   - Rust backend implementation details
   - Manager classes (Clipboard, Storage, Shortcut, Window)
   - Tauri IPC commands
   - Type definitions and error handling
   - Complete code examples with tests

3. **[SDK Specification](./03-sdk-specification.md)**
   - Plugin SDK API reference
   - TypeScript type definitions
   - React hooks for plugin development
   - Internal IPC wrappers
   - Complete type-safe interface

4. **[Plugin System Specification](./04-plugin-system-spec.md)**
   - Plugin discovery and loading mechanism
   - Plugin registry management
   - Search engine implementation
   - React integration
   - Plugin lifecycle management

5. **[Plugin Implementations](./05-plugin-implementations.md)**
   - Calculator plugin (expression evaluation)
   - Clipboard history plugin (monitoring & storage)
   - Web search plugin (fallback)
   - Complete implementations with tests
   - Plugin manifest examples

### Development Guidelines

6. **[Testing Strategy](./06-testing-strategy.md)**
   - Test-Driven Development (TDD) approach
   - Unit, integration, and E2E testing
   - Coverage requirements (>80% overall)
   - Testing tools and frameworks
   - Mock patterns and test data builders

7. **[Developer Guide](./07-developer-guide.md)**
   - Development environment setup
   - Coding standards (TypeScript & Rust)
   - SOLID principles in practice
   - Common patterns and anti-patterns
   - Debugging and performance optimization

8. **[Implementation Roadmap](./08-implementation-roadmap.md)**
   - Step-by-step implementation plan
   - 7 phases with time estimates (19-26 days)
   - TDD workflow for each component
   - Success criteria and risk mitigation
   - Detailed task breakdown

## 🎯 Quick Start

### For Implementation Agents

If you're an agent tasked with implementing Nixed, follow this path:

1. **Read First**: [01-architecture-overview.md](./01-architecture-overview.md)
   - Understand the overall system design
   - Review technology choices
   - Familiarize with design principles

2. **Read Second**: [08-implementation-roadmap.md](./08-implementation-roadmap.md)
   - Understand the implementation phases
   - See the step-by-step plan
   - Note time estimates

3. **Reference as Needed**:
   - Use specific specs (02-07) when implementing each component
   - Follow TDD practices from [06-testing-strategy.md](./06-testing-strategy.md)
   - Apply coding standards from [07-developer-guide.md](./07-developer-guide.md)

### For Reviewers

Focus on these key sections:

1. Architecture soundness: [01-architecture-overview.md](./01-architecture-overview.md)
2. API design quality: [03-sdk-specification.md](./03-sdk-specification.md)
3. Testing completeness: [06-testing-strategy.md](./06-testing-strategy.md)
4. Implementation feasibility: [08-implementation-roadmap.md](./08-implementation-roadmap.md)

## 🏗️ Project Structure

The specifications describe this monorepo structure:

```
nixed/
├── packages/
│   ├── core/              # Main Tauri application
│   │   ├── src-tauri/     # Rust backend
│   │   └── src/           # React frontend
│   ├── sdk/               # TypeScript plugin SDK
│   └── plugins/           # Core plugins
│       ├── calculator/
│       ├── clipboard/
│       └── web-search/
├── specs/                 # This directory
├── docs/                  # User documentation
└── pnpm-workspace.yaml
```

## 🎨 Design Principles

All specifications follow these core principles:

### SOLID Principles

- **Single Responsibility**: Each module has one reason to change
- **Open/Closed**: Open for extension via plugins, closed for modification
- **Liskov Substitution**: All plugins are interchangeable
- **Interface Segregation**: Plugins only depend on what they use
- **Dependency Inversion**: Depend on abstractions, not concretions

### KISS (Keep It Simple, Stupid)

- Minimal abstractions
- Clear data flow
- Explicit over implicit
- Flat hierarchies

### TDD (Test-Driven Development)

- Write tests before implementation
- Red-Green-Refactor cycle
- >80% coverage target
- Tests document behavior

## 📐 Type Safety

**Critical**: No `any` type in TypeScript

All code must be fully typed:
- Use strict TypeScript configuration
- Type guards for runtime validation
- Generic types for reusability
- Discriminated unions for state

## ✅ Quality Standards

### Code Coverage

- **Overall**: 80% minimum
- **Business Logic**: 90% minimum
- **Rust Backend**: 85% minimum
- **Plugins**: 90% minimum

### Testing Levels

- **Unit Tests**: 70% of test suite (fast, isolated)
- **Integration Tests**: 20% (moderate, realistic)
- **E2E Tests**: 10% (slow, comprehensive)

### Documentation

- TSDoc comments on all public APIs
- Rust doc comments on public items
- Architecture decision records
- User-facing guides

## 🔧 Technology Stack

### Frontend
- React 18 + TypeScript 5+
- Vite (build tool)
- Radix UI (headless components)
- TailwindCSS (styling)
- Zustand (state management)
- Vitest (testing)

### Backend
- Rust (via Tauri v2)
- Tokio (async runtime)
- serde (serialization)
- Tauri plugins (clipboard, storage, etc.)

### Tooling
- pnpm (package manager)
- Turborepo (optional monorepo tool)
- Playwright (E2E testing)
- ESLint + Clippy (linting)

## 📝 Document Conventions

### Code Examples

All code examples follow these conventions:

- ✅ **GOOD**: Shows recommended approach
- ❌ **BAD**: Shows anti-pattern to avoid
- Full type annotations (never `any`)
- Comments explain **why**, not **what**

### TypeScript Examples

```typescript
// ✅ GOOD: Fully typed
interface User {
  id: string;
  name: string;
}

function getUser(id: string): User {
  // Implementation
}

// ❌ BAD: Using any
function getUser(id: any): any {
  // Don't do this!
}
```

### Rust Examples

```rust
// ✅ GOOD: Use Result for errors
fn read_file(path: &str) -> Result<String, std::io::Error> {
    std::fs::read_to_string(path)
}

// ❌ BAD: Using unwrap
fn read_file(path: &str) -> String {
    std::fs::read_to_string(path).unwrap() // Don't panic!
}
```

## 🚀 Getting Started

To begin implementation:

1. **Set up environment** (see [07-developer-guide.md](./07-developer-guide.md))
   ```bash
   # Install tools
   nvm install 20
   npm install -g pnpm
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Follow Phase 1** of [08-implementation-roadmap.md](./08-implementation-roadmap.md)
   - Initialize monorepo
   - Set up Tauri
   - Configure tooling

3. **Use TDD** throughout (see [06-testing-strategy.md](./06-testing-strategy.md))
   - Write test first (Red)
   - Implement minimal code (Green)
   - Refactor (Refactor)

4. **Reference specs** as you implement each component

## 🔍 Key Features

The specifications define these core features:

### 1. Configurable Trigger Key
- Global keyboard shortcut (default: `Ctrl+Space`)
- Toggles launcher window
- Configurable in settings

### 2. Plugin System
- Dynamic plugin loading
- Isolated plugin execution
- TypeScript-only plugin API (no Rust exposure)
- Manifest-based configuration

### 3. Core Plugins

**Calculator**
- Real-time expression evaluation
- Mathematical functions (sin, cos, sqrt, etc.)
- Configurable precision
- Copy result to clipboard

**Clipboard History**
- Background clipboard monitoring
- Searchable history
- Configurable history size
- Paste previous items

**Web Search (Fallback)**
- Search web when no results found
- Multiple search engines (Google, DuckDuckGo, Bing)
- Always available as fallback

### 4. Search System
- Fuzzy matching
- Plugin shortcuts (e.g., `clip` for clipboard)
- Result ranking and prioritization
- Keyboard navigation

## 📚 Additional Resources

### External Documentation

- [Tauri v2 Docs](https://v2.tauri.app/)
- [Raycast API](https://developers.raycast.com/) (inspiration)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Test-Driven Development](https://en.wikipedia.org/wiki/Test-driven_development)

### Related Files

- `../README.md` - Project README (to be created)
- `../CONTRIBUTING.md` - Contribution guidelines (to be created)
- `../docs/` - User documentation (to be created)

## ⚠️ Important Notes

### For Implementation Agents

1. **Never use `any` in TypeScript** - This is a hard requirement
2. **Write tests first (TDD)** - Don't skip this step
3. **Follow SOLID principles** - They're not optional
4. **Check coverage** - Aim for >80% overall
5. **Document as you go** - Don't leave it for later

### For Reviewers

Check for:
- [ ] No `any` types in TypeScript
- [ ] Tests written for all new code
- [ ] SOLID principles followed
- [ ] >80% test coverage
- [ ] Documentation complete
- [ ] Error handling proper
- [ ] TypeScript strict mode passing

## 🤝 Contributing to Specs

If you find issues or want to improve these specifications:

1. Open an issue describing the problem
2. Propose improvements with rationale
3. Ensure consistency across all documents
4. Update this README if document structure changes

## 📄 License

These specifications are part of the Nixed project. See the main project LICENSE file.

---

## Document Status

| Document | Status | Last Updated | Completeness |
|----------|--------|--------------|--------------|
| 01-architecture-overview.md | ✅ Complete | 2025-10-22 | 100% |
| 02-core-application-spec.md | ✅ Complete | 2025-10-22 | 100% |
| 03-sdk-specification.md | ✅ Complete | 2025-10-22 | 100% |
| 04-plugin-system-spec.md | ✅ Complete | 2025-10-22 | 100% |
| 05-plugin-implementations.md | ✅ Complete | 2025-10-22 | 100% |
| 06-testing-strategy.md | ✅ Complete | 2025-10-22 | 100% |
| 07-developer-guide.md | ✅ Complete | 2025-10-22 | 100% |
| 08-implementation-roadmap.md | ✅ Complete | 2025-10-22 | 100% |

**Total Pages**: 8 core specification documents
**Total Words**: ~25,000+ words
**Estimated Reading Time**: 2-3 hours

---

**Last Updated**: 2025-10-22
**Version**: 1.0
**Maintainer**: Nixed Development Team

Good luck with implementation! 🚀
