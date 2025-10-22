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
