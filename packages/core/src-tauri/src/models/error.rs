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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clipboard_error_display() {
        let error = NixedError::Clipboard("test error".to_string());
        assert_eq!(error.to_string(), "Clipboard error: test error");
    }

    #[test]
    fn test_storage_error_display() {
        let error = NixedError::Storage("file not found".to_string());
        assert_eq!(error.to_string(), "Storage error: file not found");
    }

    #[test]
    fn test_window_error_display() {
        let error = NixedError::Window("window not found".to_string());
        assert_eq!(error.to_string(), "Window error: window not found");
    }

    #[test]
    fn test_config_error_display() {
        let error = NixedError::Config("invalid config".to_string());
        assert_eq!(error.to_string(), "Configuration error: invalid config");
    }

    #[test]
    fn test_plugin_error_display() {
        let error = NixedError::Plugin("plugin failed to load".to_string());
        assert_eq!(error.to_string(), "Plugin error: plugin failed to load");
    }

    #[test]
    fn test_io_error_conversion() {
        let io_error = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let error = NixedError::from(io_error);
        assert!(error.to_string().contains("IO error"));
    }

    #[test]
    fn test_serialization_error_conversion() {
        let json_error = serde_json::from_str::<u32>("not a number").unwrap_err();
        let error = NixedError::from(json_error);
        assert!(error.to_string().contains("Serialization error"));
    }

    #[test]
    fn test_error_to_string_conversion() {
        let error = NixedError::Clipboard("test".to_string());
        let string: String = error.into();
        assert_eq!(string, "Clipboard error: test");
    }

    #[test]
    fn test_nixed_result_ok() {
        let result: NixedResult<i32> = Ok(42);
        assert_eq!(result.unwrap(), 42);
    }

    #[test]
    fn test_nixed_result_err() {
        let result: NixedResult<i32> = Err(NixedError::Storage("error".to_string()));
        assert!(result.is_err());
    }
}
