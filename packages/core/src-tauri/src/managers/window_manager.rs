use crate::models::error::{NixedError, NixedResult};
use tauri::{AppHandle, Manager, PhysicalPosition};

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
