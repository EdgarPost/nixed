# Nixed Architecture Overview

## Executive Summary

Nixed is a cross-platform launcher application built with Tauri v2, inspired by Raycast. This document outlines the architectural decisions, design principles, and system structure for implementation.

## Design Principles

### SOLID Principles

1. **Single Responsibility Principle (SRP)**
   - Each module, class, and function has one reason to change
   - Core app handles window management; plugins handle features
   - SDK provides focused APIs without mixing concerns

2. **Open/Closed Principle (OCP)**
   - Core system is closed for modification, open for extension via plugins
   - Plugin interface allows new functionality without changing core
   - Configuration system extends without modifying base types

3. **Liskov Substitution Principle (LSP)**
   - All plugins implement the same interface and are interchangeable
   - SDK abstractions can be swapped without affecting plugins
   - Storage implementations can be replaced without breaking contracts

4. **Interface Segregation Principle (ISP)**
   - Plugins only depend on SDK interfaces they actually use
   - Separate interfaces for different plugin capabilities
   - No plugin is forced to implement unnecessary methods

5. **Dependency Inversion Principle (DIP)**
   - Core depends on plugin abstractions, not concrete implementations
   - Plugins depend on SDK interfaces, not Tauri internals
   - All cross-boundary communication uses defined contracts

### KISS (Keep It Simple, Stupid)

- **Minimal Abstractions**: Only abstract what needs variation
- **Clear Data Flow**: Unidirectional data flow where possible
- **Explicit Over Implicit**: Type everything; no magic behavior
- **Flat Hierarchies**: Prefer composition over deep inheritance

### TDD (Test-Driven Development)

- **Test First**: Write tests before implementation
- **Red-Green-Refactor**: Fail → Pass → Improve
- **Unit Test Coverage**: Aim for 80%+ on business logic
- **Integration Tests**: Test plugin loading and SDK interactions
- **E2E Tests**: Critical user flows (open, search, execute)

## System Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interface                          │
│                   (React + TypeScript)                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Launcher   │  │   Settings   │  │   Plugin     │      │
│  │   Window     │  │   Window     │  │   Views      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                     Plugin System                             │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Clipboard   │  │  Calculator  │  │  Web Search  │      │
│  │   Plugin     │  │   Plugin     │  │   Plugin     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                  │
│                    ┌───────▼────────┐                        │
│                    │   Plugin SDK   │                        │
│                    │  (@nixed/sdk)  │                        │
│                    └───────┬────────┘                        │
├────────────────────────────┼─────────────────────────────────┤
│                            │ Tauri IPC                        │
│                    ┌───────▼────────┐                        │
│                    │   Core System  │                        │
│                    │     (Rust)     │                        │
│                    └───────┬────────┘                        │
│                            │                                  │
│  ┌──────────────┐  ┌──────▼───────┐  ┌──────────────┐      │
│  │   Shortcut   │  │   Clipboard  │  │   Storage    │      │
│  │   Manager    │  │   Manager    │  │   Manager    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                      Operating System                         │
│              (Linux, macOS, Windows via Tauri)               │
└─────────────────────────────────────────────────────────────┘
```

### Monorepo Structure

```
nixed/
├── packages/
│   ├── core/                       # Main Tauri application
│   │   ├── src-tauri/              # Rust backend
│   │   │   ├── src/
│   │   │   │   ├── main.rs         # Entry point
│   │   │   │   ├── commands/       # Tauri commands (SDK backend)
│   │   │   │   │   ├── mod.rs
│   │   │   │   │   ├── clipboard.rs
│   │   │   │   │   ├── storage.rs
│   │   │   │   │   └── system.rs
│   │   │   │   ├── managers/       # Business logic
│   │   │   │   │   ├── mod.rs
│   │   │   │   │   ├── shortcut_manager.rs
│   │   │   │   │   ├── clipboard_manager.rs
│   │   │   │   │   └── window_manager.rs
│   │   │   │   └── lib.rs
│   │   │   ├── Cargo.toml
│   │   │   └── tauri.conf.json
│   │   ├── src/                    # React frontend
│   │   │   ├── components/
│   │   │   │   ├── launcher/
│   │   │   │   ├── settings/
│   │   │   │   └── common/
│   │   │   ├── services/
│   │   │   │   ├── plugin-loader.ts
│   │   │   │   ├── search-engine.ts
│   │   │   │   └── config-manager.ts
│   │   │   ├── types/
│   │   │   ├── hooks/
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── sdk/                        # Plugin SDK (TypeScript)
│   │   ├── src/
│   │   │   ├── index.ts            # Main exports
│   │   │   ├── types/
│   │   │   │   ├── plugin.types.ts
│   │   │   │   ├── manifest.types.ts
│   │   │   │   ├── preferences.types.ts
│   │   │   │   └── search.types.ts
│   │   │   ├── api/
│   │   │   │   ├── clipboard.ts
│   │   │   │   ├── storage.ts
│   │   │   │   ├── ui.ts
│   │   │   │   └── browser.ts
│   │   │   └── hooks/
│   │   │       ├── use-preferences.ts
│   │   │       └── use-search.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   └── plugins/
│       ├── clipboard/              # Clipboard history plugin
│       │   ├── src/
│       │   │   ├── index.tsx
│       │   │   ├── components/
│       │   │   ├── services/
│       │   │   └── types/
│       │   ├── package.json        # Contains manifest
│       │   └── tsconfig.json
│       │
│       ├── calculator/             # Calculator plugin
│       │   ├── src/
│       │   │   ├── index.tsx
│       │   │   ├── components/
│       │   │   ├── services/
│       │   │   │   └── expression-parser.ts
│       │   │   └── types/
│       │   ├── package.json
│       │   └── tsconfig.json
│       │
│       └── web-search/             # Web search fallback plugin
│           ├── src/
│           │   ├── index.tsx
│           │   ├── services/
│           │   └── types/
│           ├── package.json
│           └── tsconfig.json
│
├── specs/                          # This directory
├── docs/                           # End-user documentation
├── pnpm-workspace.yaml
├── package.json
├── turbo.json                      # Optional: Turborepo config
├── .gitignore
└── README.md
```

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript 5+
- **Build Tool**: Vite 5+
- **UI Components**: Radix UI (headless, accessible)
- **Styling**: TailwindCSS 3+
- **State Management**: Zustand (simple, minimal)
- **Type Safety**: Strict TypeScript (no `any`, no `unknown` without guards)

### Backend
- **Runtime**: Rust via Tauri v2
- **Async**: Tokio runtime
- **Serialization**: serde + serde_json
- **IPC**: Tauri's invoke system

### Tooling
- **Package Manager**: pnpm with workspaces
- **Monorepo**: pnpm workspaces (Turborepo optional)
- **Testing**: Vitest (unit), Playwright (E2E)
- **Linting**: ESLint + Clippy (Rust)
- **Formatting**: Prettier + rustfmt
- **Type Checking**: tsc --noEmit

## Data Flow Architecture

### Application Lifecycle

```
1. Application Start
   ↓
2. Tauri Initializes Rust Backend
   ↓
3. Register Global Shortcut
   ↓
4. Initialize Managers (Clipboard, Storage, Window)
   ↓
5. Frontend Initializes React App
   ↓
6. Load Plugin Manifests from package.json
   ↓
7. Dynamically Import Plugin Modules
   ↓
8. Register Plugins in Plugin Registry
   ↓
9. Show System Tray Icon
   ↓
10. Hide Main Window (background mode)
   ↓
11. Wait for Global Shortcut
```

### Search Flow

```
User types in launcher input
   ↓
Frontend debounces input (150ms)
   ↓
For each registered plugin:
   ├─ Check if plugin shortcut matches (e.g., "clip")
   ├─ If match: only query that plugin
   └─ Else: query all plugins
   ↓
Call plugin.onSearch(query)
   ↓
Plugin returns SearchResult[]
   ↓
Core aggregates results
   ↓
Core sorts by priority/relevance
   ↓
Display results to user
   ↓
User selects result (Enter/Click)
   ↓
Call result.onAction()
   ↓
Plugin executes action (may call SDK)
   ↓
SDK calls Tauri IPC command
   ↓
Rust executes system operation
   ↓
Return result to plugin
```

### Plugin Communication

```
Plugin → SDK → Tauri IPC → Rust Backend → OS
```

**Example: Clipboard Write**

```typescript
// Plugin code
import { clipboard } from '@nixed/sdk';

async function copyToClipboard(text: string): Promise<void> {
  await clipboard.write(text);
}
```

```typescript
// SDK implementation (sdk/src/api/clipboard.ts)
import { invoke } from '@tauri-apps/api/core';

export const clipboard = {
  async write(text: string): Promise<void> {
    await invoke<void>('clipboard_write', { text });
  }
};
```

```rust
// Rust command (core/src-tauri/src/commands/clipboard.rs)
#[tauri::command]
pub async fn clipboard_write(text: String) -> Result<(), String> {
    ClipboardManager::write(text)
        .await
        .map_err(|e| e.to_string())
}
```

## Security Considerations

### Plugin Sandboxing

1. **No Direct System Access**: Plugins cannot call OS APIs directly
2. **Scoped Storage**: Each plugin has isolated storage namespace
3. **Capability-Based**: Plugins declare required permissions in manifest
4. **SDK Mediation**: All system access goes through validated SDK

### Tauri Security

1. **CSP (Content Security Policy)**: Restrict resource loading
2. **IPC Validation**: All command parameters validated
3. **No Eval**: Strict CSP prevents code injection
4. **HTTPS Only**: External resources must use HTTPS

## Performance Considerations

### Startup Performance
- Lazy load plugins only when needed
- Cache compiled plugin code
- Minimize initial bundle size

### Search Performance
- Debounce user input (150ms)
- Cancel previous search requests
- Limit results per plugin (max 10)
- Index plugin commands for instant access

### Memory Management
- Limit clipboard history (default: 100 items)
- Unload inactive plugins after timeout
- Use React.memo for expensive components

## Extensibility Points

### Adding New Plugins

Plugins extend the system by:
1. Implementing `Plugin` interface from SDK
2. Declaring manifest in `package.json`
3. Placing in `packages/plugins/` directory
4. Running build to include in bundle

### Adding New SDK APIs

New SDK capabilities require:
1. Define TypeScript interface in SDK
2. Implement Tauri command in Rust
3. Wire up IPC call in SDK implementation
4. Add tests for new functionality
5. Update documentation

### Configuration Extension

Configuration can grow via:
1. Adding preferences to plugin manifests
2. Extending global config schema
3. Settings UI automatically reflects new options

## Error Handling Strategy

### Rust Backend
- Use `Result<T, E>` for all fallible operations
- Convert errors to user-friendly messages at IPC boundary
- Log errors to file for debugging

### TypeScript Frontend
- Use `try/catch` for async operations
- Display user-friendly error toasts
- Never expose stack traces to end users
- Log errors to console in development

### Plugin Errors
- Isolated: Plugin crash doesn't crash app
- Graceful degradation: Failed plugin disabled automatically
- User notification: Show toast with error

## Accessibility (a11y)

- **Keyboard Navigation**: Full keyboard control
- **Screen Reader Support**: ARIA labels on all interactive elements
- **Focus Management**: Proper focus trapping in modals
- **Color Contrast**: WCAG AA compliance
- **Reduced Motion**: Respect `prefers-reduced-motion`

## Cross-Platform Considerations

### Platform Differences

| Feature | Linux | macOS | Windows |
|---------|-------|-------|---------|
| Global Shortcuts | Limited | Full | Full |
| Clipboard Monitoring | Polling | Events | Events |
| System Tray | Yes | Yes | Yes |
| Notifications | Yes | Yes | Yes |

### Handling Platform Differences

```rust
#[cfg(target_os = "linux")]
fn platform_specific_implementation() {
    // Linux implementation
}

#[cfg(target_os = "macos")]
fn platform_specific_implementation() {
    // macOS implementation
}

#[cfg(target_os = "windows")]
fn platform_specific_implementation() {
    // Windows implementation
}
```

## Next Steps

Refer to the following specifications for detailed implementation guidance:

1. `02-core-application-spec.md` - Core application details
2. `03-sdk-specification.md` - Plugin SDK API reference
3. `04-plugin-system-spec.md` - Plugin loading and management
4. `05-plugin-implementations.md` - Individual plugin specifications
5. `06-testing-strategy.md` - Test-driven development approach
6. `07-developer-guide.md` - Developer onboarding and patterns
7. `08-implementation-roadmap.md` - Step-by-step implementation plan

---

**Document Version**: 1.0
**Last Updated**: 2025-10-22
**Status**: Draft for Implementation
