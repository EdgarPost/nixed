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
    async fn test_get_nonexistent() {
        let temp_dir = tempdir().unwrap();
        let manager = StorageManager::new(temp_dir.path().to_path_buf());
        manager.init().await.unwrap();

        let value = manager.get("test-plugin", "nonexistent").await.unwrap();
        assert_eq!(value, None);
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

    #[tokio::test]
    async fn test_remove() {
        let temp_dir = tempdir().unwrap();
        let manager = StorageManager::new(temp_dir.path().to_path_buf());
        manager.init().await.unwrap();

        manager.set("test-plugin", "key1", "value1".to_string()).await.unwrap();
        manager.remove("test-plugin", "key1").await.unwrap();

        let value = manager.get("test-plugin", "key1").await.unwrap();
        assert_eq!(value, None);
    }

    #[tokio::test]
    async fn test_clear_plugin() {
        let temp_dir = tempdir().unwrap();
        let manager = StorageManager::new(temp_dir.path().to_path_buf());
        manager.init().await.unwrap();

        manager.set("test-plugin", "key1", "value1".to_string()).await.unwrap();
        manager.set("test-plugin", "key2", "value2".to_string()).await.unwrap();
        manager.clear_plugin("test-plugin").await.unwrap();

        let value1 = manager.get("test-plugin", "key1").await.unwrap();
        let value2 = manager.get("test-plugin", "key2").await.unwrap();

        assert_eq!(value1, None);
        assert_eq!(value2, None);
    }

    #[tokio::test]
    async fn test_update_existing_key() {
        let temp_dir = tempdir().unwrap();
        let manager = StorageManager::new(temp_dir.path().to_path_buf());
        manager.init().await.unwrap();

        manager.set("test-plugin", "key1", "value1".to_string()).await.unwrap();
        manager.set("test-plugin", "key1", "value2".to_string()).await.unwrap();

        let value = manager.get("test-plugin", "key1").await.unwrap();
        assert_eq!(value, Some("value2".to_string()));
    }

    #[test]
    fn test_clone() {
        // Verify StorageManager can be cloned (required for sharing across threads)
        let manager = StorageManager::new(PathBuf::from("/tmp/test"));
        let _cloned = manager.clone();
    }

    #[tokio::test]
    async fn test_init_creates_directory() {
        let temp_dir = tempdir().unwrap();
        let storage_path = temp_dir.path().join("storage");

        // Verify directory doesn't exist yet
        assert!(!storage_path.exists());

        let manager = StorageManager::new(storage_path.clone());
        manager.init().await.unwrap();

        // Verify directory was created
        assert!(storage_path.exists());
        assert!(storage_path.is_dir());
    }
}
