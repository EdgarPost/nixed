# Core Application Specification

## Overview

The core application is the main Tauri executable that manages the launcher window, system tray, global shortcuts, and provides the runtime environment for plugins.

## Rust Backend Specification

### Directory Structure

```
src-tauri/
├── src/
│   ├── main.rs                 # Application entry point
│   ├── lib.rs                  # Library exports for testing
│   ├── commands/               # Tauri IPC commands
│   │   ├── mod.rs
│   │   ├── clipboard.rs        # Clipboard operations
│   │   ├── storage.rs          # Persistent storage
│   │   ├── system.rs           # System operations (open URL, etc.)
│   │   └── window.rs           # Window management
│   ├── managers/               # Business logic managers
│   │   ├── mod.rs
│   │   ├── clipboard_manager.rs
│   │   ├── shortcut_manager.rs
│   │   ├── storage_manager.rs
│   │   └── window_manager.rs
│   ├── models/                 # Data models
│   │   ├── mod.rs
│   │   ├── config.rs
│   │   └── error.rs
│   └── utils/                  # Utility functions
│       ├── mod.rs
│       └── platform.rs
├── Cargo.toml
└── tauri.conf.json
```

### Dependencies (Cargo.toml)

```toml
[package]
name = "nixed"
version = "0.1.0"
edition = "2021"

[dependencies]
tauri = { version = "2.0", features = ["devtools"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1", features = ["full"] }
anyhow = "1.0"
thiserror = "1.0"
dirs = "5.0"
chrono = { version = "0.4", features = ["serde"] }

# Tauri plugins
tauri-plugin-global-shortcut = "2.0"
tauri-plugin-clipboard-manager = "2.0"
tauri-plugin-shell = "2.0"
tauri-plugin-fs = "2.0"

[dev-dependencies]
mockall = "0.12"
rstest = "0.18"

[build-dependencies]
tauri-build = { version = "2.0" }
```

### Type Definitions

#### models/error.rs

```rust
use thiserror::Error;

/// Core application errors
#[derive(Error, Debug)]
pub enum NixedError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Clipboard error: {0}")]
    Clipboard(String),

    #[error("Storage error: {0}")]
    Storage(String),

    #[error("Window error: {0}")]
    Window(String),

    #[error("Configuration error: {0}")]
    Config(String),

    #[error("Plugin error: {0}")]
    Plugin(String),
}

/// Result type alias for Nixed operations
pub type NixedResult<T> = Result<T, NixedError>;

/// Convert NixedError to user-friendly string for IPC
impl From<NixedError> for String {
    fn from(error: NixedError) -> Self {
        error.to_string()
    }
}
```

#### models/config.rs

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Global application configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    /// Global shortcut to trigger launcher
    pub trigger_key: String,

    /// Plugin configurations
    pub plugins: HashMap<String, PluginConfig>,

    /// UI preferences
    pub ui: UiConfig,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            trigger_key: "Ctrl+Space".to_string(),
            plugins: HashMap::new(),
            ui: UiConfig::default(),
        }
    }
}

/// Per-plugin configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginConfig {
    /// Whether plugin is enabled
    pub enabled: bool,

    /// Plugin-specific preferences
    pub preferences: HashMap<String, serde_json::Value>,
}

/// UI-specific configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiConfig {
    /// Theme: "light" | "dark" | "system"
    pub theme: String,

    /// Window width in pixels
    pub window_width: u32,

    /// Maximum results to show
    pub max_results: usize,
}

impl Default for UiConfig {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            window_width: 600,
            max_results: 10,
        }
    }
}
```

### Managers

#### managers/clipboard_manager.rs

```rust
use crate::models::error::{NixedError, NixedResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri_plugin_clipboard_manager::ClipboardExt;

/// Clipboard history item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardItem {
    /// Unique identifier
    pub id: String,

    /// Clipboard text content
    pub content: String,

    /// Timestamp when added (serialized as RFC3339/ISO 8601 string)
    /// Example: "2025-10-22T15:30:00Z"
    pub timestamp: DateTime<Utc>,
}

/// Manages clipboard operations and history
pub struct ClipboardManager {
    history: Arc<Mutex<Vec<ClipboardItem>>>,
    max_history: usize,
}

impl ClipboardManager {
    /// Create a new clipboard manager
    pub fn new(max_history: usize) -> Self {
        Self {
            history: Arc::new(Mutex::new(Vec::new())),
            max_history,
        }
    }

    /// Read current clipboard content
    pub async fn read(&self, app_handle: &tauri::AppHandle) -> NixedResult<String> {
        app_handle
            .clipboard()
            .read_text()
            .map_err(|e| NixedError::Clipboard(e.to_string()))
    }

    /// Write to clipboard
    pub async fn write(
        &self,
        app_handle: &tauri::AppHandle,
        text: String,
    ) -> NixedResult<()> {
        app_handle
            .clipboard()
            .write_text(text.clone())
            .map_err(|e| NixedError::Clipboard(e.to_string()))?;

        self.add_to_history(text);
        Ok(())
    }

    /// Add item to clipboard history
    fn add_to_history(&self, content: String) {
        let mut history = self.history.lock().unwrap();

        // Don't add duplicates at the top
        if let Some(last) = history.first() {
            if last.content == content {
                return;
            }
        }

        let item = ClipboardItem {
            id: uuid::Uuid::new_v4().to_string(),
            content,
            timestamp: Utc::now(),
        };

        history.insert(0, item);

        // Maintain max history size
        if history.len() > self.max_history {
            history.truncate(self.max_history);
        }
    }

    /// Get clipboard history
    pub fn get_history(&self) -> Vec<ClipboardItem> {
        self.history.lock().unwrap().clone()
    }

    /// Clear clipboard history
    pub fn clear_history(&self) {
        self.history.lock().unwrap().clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add_to_history() {
        let manager = ClipboardManager::new(5);

        manager.add_to_history("item1".to_string());
        manager.add_to_history("item2".to_string());

        let history = manager.get_history();
        assert_eq!(history.len(), 2);
        assert_eq!(history[0].content, "item2");
        assert_eq!(history[1].content, "item1");
    }

    #[test]
    fn test_max_history() {
        let manager = ClipboardManager::new(3);

        for i in 0..5 {
            manager.add_to_history(format!("item{}", i));
        }

        let history = manager.get_history();
        assert_eq!(history.len(), 3);
        assert_eq!(history[0].content, "item4");
    }

    #[test]
    fn test_no_duplicates_at_top() {
        let manager = ClipboardManager::new(5);

        manager.add_to_history("item1".to_string());
        manager.add_to_history("item1".to_string());

        let history = manager.get_history();
        assert_eq!(history.len(), 1);
    }
}
```

#### managers/storage_manager.rs

```rust
use crate::models::error::{NixedError, NixedResult};
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::fs;

/// Manages persistent storage for plugins
/// SIMPLIFIED: No caching initially (YAGNI principle)
/// Add caching later if performance issues arise
#[derive(Clone)]
pub struct StorageManager {
    storage_path: PathBuf,
}

impl StorageManager {
    /// Create a new storage manager
    pub fn new(storage_path: PathBuf) -> Self {
        Self { storage_path }
    }

    /// Initialize storage directory
    pub async fn init(&self) -> NixedResult<()> {
        fs::create_dir_all(&self.storage_path)
            .await
            .map_err(|e| NixedError::Storage(format!("Failed to create storage directory: {}", e)))
    }

    /// Get value from plugin storage
    pub async fn get(&self, plugin_id: &str, key: &str) -> NixedResult<Option<String>> {
        let storage = self.load_plugin_storage(plugin_id).await?;
        Ok(storage.get(key).cloned())
    }

    /// Set value in plugin storage
    pub async fn set(&self, plugin_id: &str, key: &str, value: String) -> NixedResult<()> {
        let mut storage = self.load_plugin_storage(plugin_id).await?;
        storage.insert(key.to_string(), value);
        self.save_plugin_storage(plugin_id, &storage).await
    }

    /// Remove value from plugin storage
    pub async fn remove(&self, plugin_id: &str, key: &str) -> NixedResult<()> {
        let mut storage = self.load_plugin_storage(plugin_id).await?;
        storage.remove(key);
        self.save_plugin_storage(plugin_id, &storage).await
    }

    /// Clear all storage for a plugin
    pub async fn clear_plugin(&self, plugin_id: &str) -> NixedResult<()> {
        let file_path = self.get_plugin_storage_path(plugin_id);
        if file_path.exists() {
            fs::remove_file(file_path)
                .await
                .map_err(|e| NixedError::Storage(format!("Failed to delete storage file: {}", e)))?;
        }
        Ok(())
    }

    /// Load plugin storage from disk
    async fn load_plugin_storage(&self, plugin_id: &str) -> NixedResult<HashMap<String, String>> {
        let file_path = self.get_plugin_storage_path(plugin_id);

        if !file_path.exists() {
            return Ok(HashMap::new());
        }

        let content = fs::read_to_string(&file_path)
            .await
            .map_err(|e| NixedError::Storage(format!("Failed to read storage file: {}", e)))?;

        serde_json::from_str(&content)
            .map_err(|e| NixedError::Storage(format!("Failed to parse storage file: {}", e)))
    }

    /// Save plugin storage to disk
    async fn save_plugin_storage(
        &self,
        plugin_id: &str,
        storage: &HashMap<String, String>,
    ) -> NixedResult<()> {
        let file_path = self.get_plugin_storage_path(plugin_id);
        let content = serde_json::to_string_pretty(storage)
            .map_err(|e| NixedError::Storage(format!("Failed to serialize storage: {}", e)))?;

        fs::write(&file_path, content)
            .await
            .map_err(|e| NixedError::Storage(format!("Failed to write storage file: {}", e)))?;

        Ok(())
    }

    /// Get file path for plugin storage
    fn get_plugin_storage_path(&self, plugin_id: &str) -> PathBuf {
        self.storage_path.join(format!("{}.json", plugin_id))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_get_set() {
        let temp_dir = tempdir().unwrap();
        let manager = StorageManager::new(temp_dir.path().to_path_buf());
        manager.init().await.unwrap();

        manager.set("test-plugin", "key1", "value1".to_string()).await.unwrap();
        let value = manager.get("test-plugin", "key1").await.unwrap();

        assert_eq!(value, Some("value1".to_string()));
    }

    #[tokio::test]
    async fn test_persistence() {
        let temp_dir = tempdir().unwrap();

        {
            let manager = StorageManager::new(temp_dir.path().to_path_buf());
            manager.init().await.unwrap();
            manager.set("test-plugin", "key1", "value1".to_string()).await.unwrap();
        }

        // Create new instance to test persistence
        let manager = StorageManager::new(temp_dir.path().to_path_buf());
        let value = manager.get("test-plugin", "key1").await.unwrap();

        assert_eq!(value, Some("value1".to_string()));
    }

    #[tokio::test]
    async fn test_plugin_isolation() {
        let temp_dir = tempdir().unwrap();
        let manager = StorageManager::new(temp_dir.path().to_path_buf());
        manager.init().await.unwrap();

        manager.set("plugin-a", "key1", "value-a".to_string()).await.unwrap();
        manager.set("plugin-b", "key1", "value-b".to_string()).await.unwrap();

        let value_a = manager.get("plugin-a", "key1").await.unwrap();
        let value_b = manager.get("plugin-b", "key1").await.unwrap();

        assert_eq!(value_a, Some("value-a".to_string()));
        assert_eq!(value_b, Some("value-b".to_string()));
    }

    #[test]
    fn test_clone() {
        // Verify StorageManager can be cloned (required for sharing across threads)
        let manager = StorageManager::new(PathBuf::from("/tmp/test"));
        let _cloned = manager.clone();
    }
}
```

#### managers/shortcut_manager.rs

```rust
use crate::models::error::{NixedError, NixedResult};
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

/// Manages global keyboard shortcuts
pub struct ShortcutManager {
    current_shortcut: Option<String>,
}

impl ShortcutManager {
    /// Create a new shortcut manager
    pub fn new() -> Self {
        Self {
            current_shortcut: None,
        }
    }

    /// Register global shortcut to toggle launcher window
    pub fn register(
        &mut self,
        app_handle: &AppHandle,
        shortcut: &str,
    ) -> NixedResult<()> {
        // Unregister old shortcut if exists
        if let Some(old_shortcut) = &self.current_shortcut {
            self.unregister(app_handle, old_shortcut)?;
        }

        // Parse shortcut
        let shortcut_obj: Shortcut = shortcut
            .parse()
            .map_err(|e| NixedError::Config(format!("Invalid shortcut: {}", e)))?;

        // Register new shortcut
        let app = app_handle.clone();
        app_handle
            .global_shortcut()
            .on_shortcut(shortcut_obj, move || {
                if let Some(window) = app.get_webview_window("main") {
                    match window.is_visible() {
                        Ok(true) => {
                            let _ = window.hide();
                        }
                        Ok(false) => {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                        Err(e) => {
                            eprintln!("Error checking window visibility: {}", e);
                        }
                    }
                }
            })
            .map_err(|e| NixedError::Window(format!("Failed to register shortcut: {}", e)))?;

        self.current_shortcut = Some(shortcut.to_string());
        Ok(())
    }

    /// Unregister a shortcut
    fn unregister(&self, app_handle: &AppHandle, shortcut: &str) -> NixedResult<()> {
        if let Ok(shortcut_obj) = shortcut.parse::<Shortcut>() {
            app_handle
                .global_shortcut()
                .unregister(shortcut_obj)
                .map_err(|e| NixedError::Window(format!("Failed to unregister shortcut: {}", e)))?;
        }
        Ok(())
    }
}
```

#### managers/window_manager.rs

```rust
use crate::models::error::{NixedError, NixedResult};
use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize};

/// Manages application windows
pub struct WindowManager;

impl WindowManager {
    /// Show the launcher window centered on screen
    pub fn show_launcher(app_handle: &AppHandle) -> NixedResult<()> {
        let window = app_handle
            .get_webview_window("main")
            .ok_or_else(|| NixedError::Window("Main window not found".to_string()))?;

        // Center window on screen
        Self::center_window(&window)?;

        window
            .show()
            .map_err(|e| NixedError::Window(format!("Failed to show window: {}", e)))?;

        window
            .set_focus()
            .map_err(|e| NixedError::Window(format!("Failed to focus window: {}", e)))?;

        Ok(())
    }

    /// Hide the launcher window
    pub fn hide_launcher(app_handle: &AppHandle) -> NixedResult<()> {
        let window = app_handle
            .get_webview_window("main")
            .ok_or_else(|| NixedError::Window("Main window not found".to_string()))?;

        window
            .hide()
            .map_err(|e| NixedError::Window(format!("Failed to hide window: {}", e)))?;

        Ok(())
    }

    /// Center window on the current monitor
    fn center_window(window: &tauri::WebviewWindow) -> NixedResult<()> {
        let monitor = window
            .current_monitor()
            .map_err(|e| NixedError::Window(format!("Failed to get monitor: {}", e)))?
            .ok_or_else(|| NixedError::Window("No monitor found".to_string()))?;

        let monitor_size = monitor.size();
        let window_size = window
            .outer_size()
            .map_err(|e| NixedError::Window(format!("Failed to get window size: {}", e)))?;

        let x = (monitor_size.width - window_size.width) / 2;
        let y = (monitor_size.height - window_size.height) / 3; // Slightly above center

        window
            .set_position(PhysicalPosition::new(x, y))
            .map_err(|e| NixedError::Window(format!("Failed to set window position: {}", e)))?;

        Ok(())
    }
}
```

### Tauri Commands

#### commands/clipboard.rs

```rust
use crate::managers::clipboard_manager::{ClipboardItem, ClipboardManager};
use crate::models::error::NixedResult;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn clipboard_read(
    app_handle: AppHandle,
    manager: State<'_, ClipboardManager>,
) -> Result<String, String> {
    manager
        .read(&app_handle)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn clipboard_write(
    app_handle: AppHandle,
    manager: State<'_, ClipboardManager>,
    text: String,
) -> Result<(), String> {
    manager
        .write(&app_handle, text)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clipboard_history(
    manager: State<'_, ClipboardManager>,
) -> Result<Vec<ClipboardItem>, String> {
    Ok(manager.get_history())
}

#[tauri::command]
pub fn clipboard_clear_history(
    manager: State<'_, ClipboardManager>,
) -> Result<(), String> {
    manager.clear_history();
    Ok(())
}
```

#### commands/storage.rs

```rust
use crate::managers::storage_manager::StorageManager;
use tauri::State;

#[tauri::command]
pub async fn storage_get(
    manager: State<'_, StorageManager>,
    plugin_id: String,
    key: String,
) -> Result<Option<String>, String> {
    manager
        .get(&plugin_id, &key)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn storage_set(
    manager: State<'_, StorageManager>,
    plugin_id: String,
    key: String,
    value: String,
) -> Result<(), String> {
    manager
        .set(&plugin_id, &key, value)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn storage_remove(
    manager: State<'_, StorageManager>,
    plugin_id: String,
    key: String,
) -> Result<(), String> {
    manager
        .remove(&plugin_id, &key)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn storage_clear(
    manager: State<'_, StorageManager>,
    plugin_id: String,
) -> Result<(), String> {
    manager
        .clear_plugin(&plugin_id)
        .await
        .map_err(|e| e.to_string())
}
```

#### commands/system.rs

```rust
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

#[tauri::command]
pub async fn open_url(app_handle: AppHandle, url: String) -> Result<(), String> {
    app_handle
        .shell()
        .open(&url, None)
        .map_err(|e| format!("Failed to open URL: {}", e))
}
```

#### commands/window.rs

```rust
use crate::managers::window_manager::WindowManager;
use tauri::AppHandle;

#[tauri::command]
pub fn hide_window(app_handle: AppHandle) -> Result<(), String> {
    WindowManager::hide_launcher(&app_handle).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn show_window(app_handle: AppHandle) -> Result<(), String> {
    WindowManager::show_launcher(&app_handle).map_err(|e| e.to_string())
}
```

### Main Application

#### main.rs

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod managers;
mod models;

use managers::{
    clipboard_manager::ClipboardManager,
    shortcut_manager::ShortcutManager,
    storage_manager::StorageManager,
};
use std::sync::Mutex;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Initialize managers
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");

            let storage_path = app_data_dir.join("storage");
            let storage_manager = StorageManager::new(storage_path);

            // Initialize storage asynchronously
            let storage_manager_clone = storage_manager.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = storage_manager_clone.init().await {
                    eprintln!("Failed to initialize storage: {}", e);
                }
            });

            let clipboard_manager = ClipboardManager::new(100);
            let shortcut_manager = Mutex::new(ShortcutManager::new());

            // Register managers as state
            app.manage(storage_manager);
            app.manage(clipboard_manager);
            app.manage(shortcut_manager);

            // Register global shortcut
            let app_handle = app.handle().clone();
            let shortcut_mgr = app.state::<Mutex<ShortcutManager>>();
            let mut mgr = shortcut_mgr.lock().unwrap();

            if let Err(e) = mgr.register(&app_handle, "Ctrl+Space") {
                eprintln!("Failed to register global shortcut: {}", e);
            }

            // Hide window initially (will be shown on shortcut)
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::clipboard::clipboard_read,
            commands::clipboard::clipboard_write,
            commands::clipboard::clipboard_history,
            commands::clipboard::clipboard_clear_history,
            commands::storage::storage_get,
            commands::storage::storage_set,
            commands::storage::storage_remove,
            commands::storage::storage_clear,
            commands::system::open_url,
            commands::window::hide_window,
            commands::window::show_window,
        ])
        .run(tauri::generate_context!())
        .expect("Error while running Tauri application");
}
```

### Tauri Configuration

#### tauri.conf.json

```json
{
  "$schema": "https://schema.tauri.app/config/2.0.0",
  "productName": "Nixed",
  "version": "0.1.0",
  "identifier": "com.nixed.launcher",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  },
  "app": {
    "security": {
      "csp": "default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:"
    },
    "windows": [
      {
        "label": "main",
        "title": "Nixed",
        "width": 600,
        "height": 400,
        "resizable": false,
        "fullscreen": false,
        "decorations": false,
        "alwaysOnTop": true,
        "skipTaskbar": true,
        "visible": false,
        "center": true,
        "focus": true
      }
    ]
  }
}
```

## React Frontend Specification

### Type Definitions

#### types/config.types.ts

```typescript
export interface AppConfig {
  triggerKey: string;
  plugins: Record<string, PluginConfig>;
  ui: UiConfig;
}

export interface PluginConfig {
  enabled: boolean;
  preferences: Record<string, unknown>;
}

export interface UiConfig {
  theme: 'light' | 'dark' | 'system';
  windowWidth: number;
  maxResults: number;
}
```

### Testing Requirements

#### Unit Tests
- All managers must have >80% code coverage
- Test error handling paths
- Mock external dependencies (filesystem, clipboard, etc.)

#### Integration Tests
- Test IPC command flow end-to-end
- Test plugin storage isolation
- Test clipboard history management

#### Example Test (managers/clipboard_manager.rs)

See tests in the manager implementation above.

---

**Document Version**: 1.0
**Last Updated**: 2025-10-22
**Status**: Draft for Implementation
