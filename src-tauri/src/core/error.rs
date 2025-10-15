use thiserror::Error;

/// 应用程序错误类型
#[derive(Error, Debug)]
pub enum AppError {
    #[error("HTTP请求错误: {0}")]
    HttpError(#[from] reqwest::Error),

    #[error("JSON解析错误: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("IO错误: {0}")]
    IoError(#[from] std::io::Error),

    #[error("配置错误: {0}")]
    ConfigError(String),

    #[error("搜索错误: {0}")]
    SearchError(String),

    #[error("网站数据错误: {0}")]
    SiteDataError(String),

    #[error("用户输入错误: {0}")]
    UserInputError(String),

    #[error("导出错误: {0}")]
    ExportError(String),

    #[error("内部错误: {0}")]
    InternalError(String),
}

/// 应用程序结果类型
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
