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
        assert_eq!(history[1].content, "item3");
        assert_eq!(history[2].content, "item2");
    }

    #[test]
    fn test_no_duplicates_at_top() {
        let manager = ClipboardManager::new(5);

        manager.add_to_history("item1".to_string());
        manager.add_to_history("item1".to_string());

        let history = manager.get_history();
        assert_eq!(history.len(), 1);
    }

    #[test]
    fn test_clear_history() {
        let manager = ClipboardManager::new(5);

        manager.add_to_history("item1".to_string());
        manager.add_to_history("item2".to_string());
        manager.clear_history();

        let history = manager.get_history();
        assert_eq!(history.len(), 0);
    }

    #[test]
    fn test_get_history_returns_clone() {
        let manager = ClipboardManager::new(5);

        manager.add_to_history("item1".to_string());

        let history1 = manager.get_history();
        let history2 = manager.get_history();

        // Both should have the same content
        assert_eq!(history1.len(), history2.len());
        assert_eq!(history1[0].content, history2[0].content);

        // But they should be independent clones
        // (we can verify this by checking that adding more items doesn't affect the old result)
        manager.add_to_history("item2".to_string());
        let history3 = manager.get_history();

        assert_eq!(history1.len(), 1); // Old result unchanged
        assert_eq!(history3.len(), 2); // New result reflects changes
    }
}
