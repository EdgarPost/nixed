# Nixed

A modern, extensible application launcher built with Tauri, React, and TypeScript.

## Features

- **🚀 Fast & Lightweight**: Built with Tauri for minimal resource usage
- **🔌 Plugin System**: Extensible architecture for adding new functionality
- **⌨️ Keyboard-First**: Designed for keyboard-driven workflows
- **🎨 Modern UI**: Clean, dark-themed interface built with Tailwind CSS
- **🔍 Smart Search**: Intelligent result ranking and filtering

## Included Plugins

### Calculator (🔢)
Evaluate mathematical expressions instantly as you type.

```
2 + 2          → 4
(5 + 3) * 2    → 16
sqrt(16)       → 4
50 * 20%       → 10
```

### Clipboard History (📋)
Access and search your clipboard history.

- Tracks up to 100 clipboard items
- Search through history
- Relative timestamps ("2 mins ago")
- Shortcut: Type `clip` to filter

### Web Search (🔍)
Fallback search to open queries in your browser.

- Supports Google, DuckDuckGo, and Bing
- Always available for any query
- Quick action shortcuts

## Installation

### Prerequisites

- Node.js 20 or higher
- pnpm 8 or higher
- Rust (latest stable)
- System dependencies for Tauri:
  - **Linux**: webkit2gtk, librsvg2
  - **macOS**: Xcode Command Line Tools
  - **Windows**: WebView2

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd nixed

# Install dependencies
pnpm install

# Build the SDK (required first)
cd packages/sdk
pnpm build
cd ../..

# Run in development mode
cd packages/core
pnpm tauri dev
```

## Usage

1. Press `Ctrl+Space` to open the launcher
2. Type your query
3. Use `↑` and `↓` arrows to navigate results
4. Press `Enter` to execute the selected action
5. Press `Esc` to close the launcher

## Project Structure

```
nixed/
├── packages/
│   ├── core/           # Main Tauri application
│   │   ├── src/        # React frontend
│   │   └── src-tauri/  # Rust backend
│   ├── sdk/            # Plugin SDK
│   │   └── src/        # SDK API and types
│   └── plugins/        # Core plugins
│       ├── calculator/
│       ├── clipboard/
│       └── web-search/
└── specs/              # Technical specifications
```

## Development

### Running Tests

```bash
# Test all packages
pnpm test

# Test specific package
cd packages/sdk
pnpm test

# Run with coverage
pnpm test:coverage
```

### Building

```bash
# Build SDK
cd packages/sdk
pnpm build

# Build application
cd packages/core
pnpm tauri build
```

### Linting & Formatting

```bash
# Run linter
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Type check
pnpm type-check
```

## Creating Plugins

Plugins are TypeScript modules that implement the `Plugin` interface from `@nixed/sdk`.

### Basic Plugin Structure

```typescript
import type { Plugin } from '@nixed/sdk';
import { clipboard, ui } from '@nixed/sdk';

const MyPlugin: Plugin = {
  manifest: {
    id: 'my-plugin',
    name: 'My Plugin',
    description: 'Does something cool',
    version: '1.0.0',
    author: 'Your Name',
  },

  onLoad: async () => {
    console.log('Plugin loaded');
  },

  onSearch: (query) => {
    if (!query.text) return [];

    return [
      {
        id: 'result-1',
        title: 'Result Title',
        subtitle: 'Subtitle',
        icon: '🎯',
        onAction: async () => {
          await clipboard.write('Result');
          ui.showToast('Copied!', 'success');
          await ui.close();
        },
      },
    ];
  },
};

export default MyPlugin;
```

### Plugin Manifest

Add a `nixed` field to your plugin's `package.json`:

```json
{
  "name": "@nixed/plugin-example",
  "nixed": {
    "id": "example",
    "name": "Example Plugin",
    "description": "An example plugin",
    "version": "1.0.0",
    "author": "Your Name",
    "icon": "🎯",
    "commands": [],
    "preferences": []
  }
}
```

See the [Plugin Development Guide](specs/07-developer-guide.md) for more details.

## Architecture

Nixed follows a modular, plugin-based architecture:

- **Core**: Tauri application with Rust backend and React frontend
- **SDK**: TypeScript library providing plugin APIs
- **Plugins**: Independent packages that extend functionality

### Key Principles

- **Type Safety**: Strict TypeScript with no `any` types
- **TDD**: Test-driven development with >80% coverage
- **SOLID**: Following SOLID principles throughout
- **Error Handling**: Comprehensive error handling and boundaries

## Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Backend**: Rust, Tauri 2
- **Build Tools**: Vite, tsup, pnpm
- **Testing**: Vitest, @testing-library/react
- **Linting**: ESLint 9, Prettier

## Contributing

We welcome contributions! Please see our [Contributing Guide](specs/07-developer-guide.md) for details.

### Development Workflow

1. Create a feature branch
2. Write tests first (TDD)
3. Implement your changes
4. Ensure all tests pass
5. Run linting and formatting
6. Submit a pull request

### Code Standards

- No `any` types in TypeScript
- All public APIs must have TSDoc comments
- Test coverage must be >80%
- Follow conventional commit messages

## License

MIT

## Acknowledgments

Built with:
- [Tauri](https://tauri.app/) - Native app framework
- [React](https://react.dev/) - UI library
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - Styling
