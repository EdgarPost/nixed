use crate::managers::clipboard_manager::{ClipboardItem, ClipboardManager};
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
