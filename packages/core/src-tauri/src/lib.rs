#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod commands;
pub mod managers;
pub mod models;

use managers::{
    clipboard_manager::ClipboardManager,
    shortcut_manager::ShortcutManager,
    storage_manager::StorageManager,
};
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
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
        .expect("error while running tauri application");
}
