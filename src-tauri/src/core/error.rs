use thiserror::Error;

/// Application error types
#[derive(Error, Debug)]
pub enum AppError {
    #[error("HTTP request error: {0}")]
    HttpError(#[from] reqwest::Error),

    #[error("JSON parsing error: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Configuration error: {0}")]
    ConfigError(String),

    #[error("Search error: {0}")]
    SearchError(String),

    #[error("Site data error: {0}")]
    SiteDataError(String),

    #[error("User input error: {0}")]
    UserInputError(String),

    #[error("Export error: {0}")]
    ExportError(String),

    #[error("Internal error: {0}")]
    InternalError(String),
}

/// Application result type
pub type AppResult<T> = Result<T, AppError>;

impl From<String> for AppError {
    fn from(s: String) -> Self {
        AppError::InternalError(s)
    }
}

impl From<&str> for AppError {
    fn from(s: &str) -> Self {
        AppError::InternalError(s.to_string())
    }
}

impl From<tokio::sync::AcquireError> for AppError {
    fn from(_error: tokio::sync::AcquireError) -> Self {
        AppError::InternalError("Failed to acquire semaphore permit".to_string())
    }
}
