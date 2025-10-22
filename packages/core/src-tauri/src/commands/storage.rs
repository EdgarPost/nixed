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
