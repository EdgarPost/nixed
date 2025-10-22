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
