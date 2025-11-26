use crate::core::error::{AppError, AppResult};
use serde_json::Value;
use std::path::Path;
use tokio::io::AsyncWriteExt;

/// Collection of utility functions

/// Extract data from JSON values
pub fn extract_json_data(path: &[String], data: &Value) -> AppResult<Option<Value>> {
    if path.is_empty() {
        return Ok(Some(data.clone()));
    }

    let mut current = data;
    for segment in path {
        match current {
            Value::Object(map) => {
                current = match map.get(segment) {
                    Some(val) => val,
                    None => return Ok(None),
                };
            }
            Value::Array(arr) => {
                let index = match segment.parse::<usize>() {
                    Ok(i) => i,
                    Err(_) => return Ok(None),
                };
                current = match arr.get(index) {
                    Some(val) => val,
                    None => return Ok(None),
                };
            }
            _ => {
                return Ok(None);
            }
        }
    }

    Ok(Some(current.clone()))
}

/// Extract data from HTML using CSS selectors (scraper)
pub fn extract_html_data(selector: &str, content: &str) -> AppResult<Option<String>> {
    use scraper::{Html, Selector};

    let document = Html::parse_document(content);

    // Support a simple "selector::attr(name)" syntax for attribute extraction
    let (selector_str, attr) = if let Some((sel, attr_part)) = selector.split_once("::attr(") {
        let attr_name = attr_part.trim_end_matches(')');
        (sel.trim(), Some(attr_name.trim().to_string()))
    } else {
        (selector, None)
    };

    let selector = match Selector::parse(selector_str) {
        Ok(s) => s,
        Err(_) => return Ok(None),
    };

    if let Some(element) = document.select(&selector).next() {
        if let Some(attr_name) = attr {
            if let Some(val) = element.value().attr(&attr_name) {
                return Ok(Some(val.to_string()));
            }
        }

        let text = element.text().collect::<Vec<_>>().join(" ").trim().to_string();
        if !text.is_empty() {
            return Ok(Some(text));
        }
    }

    Ok(None)
}

/// Validate username format
pub fn validate_username(username: &str) -> AppResult<()> {
    if username.trim().is_empty() {
        return Err(AppError::UserInputError("Username cannot be empty".to_string()));
    }

    if username.len() < 2 {
        return Err(AppError::UserInputError(
            "Username must be at least 2 characters".to_string(),
        ));
    }

    if username.len() > 100 {
        return Err(AppError::UserInputError("Username is too long".to_string()));
    }

    // Basic character validation (allow letters, numbers, underscores, hyphens, dots)
    if !username
        .chars()
        .all(|c| c.is_alphanumeric() || matches!(c, '_' | '-' | '.'))
    {
        return Err(AppError::UserInputError("Username contains invalid characters".to_string()));
    }

    Ok(())
}

/// Validate email format
pub fn validate_email(email: &str) -> AppResult<()> {
    if email.trim().is_empty() {
        return Err(AppError::UserInputError("Email cannot be empty".to_string()));
    }

    // Simple email format validation
    if !email.contains('@') || !email.contains('.') {
        return Err(AppError::UserInputError("Invalid email format".to_string()));
    }

    let parts: Vec<&str> = email.split('@').collect();
    if parts.len() != 2 {
        return Err(AppError::UserInputError("Invalid email format".to_string()));
    }

    if parts[0].is_empty() || parts[1].is_empty() {
        return Err(AppError::UserInputError("Invalid email format".to_string()));
    }

    Ok(())
}

/// Format duration
pub fn format_duration(milliseconds: u64) -> String {
    let seconds = milliseconds / 1000;
    let minutes = seconds / 60;
    let hours = minutes / 60;

    if hours > 0 {
        format!("{}h {}m {}s", hours, minutes % 60, seconds % 60)
    } else if minutes > 0 {
        format!("{}m {}s", minutes, seconds % 60)
    } else {
        format!("{}s", seconds)
    }
}

/// Create user agent string
pub fn create_user_agent() -> String {
    format!(
        "name-seeker/1.0 ({}; {}; Rust)",
        std::env::consts::OS,
        std::env::consts::ARCH
    )
}

/// Generate random delay (milliseconds)
pub fn random_delay_ms(min: u64, max: u64) -> u64 {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    rng.gen_range(min..=max)
}

/// Clean and normalize URL
pub fn normalize_url(url: &str) -> String {
    let mut normalized = url.trim().to_string();

    // Ensure protocol exists
    if !normalized.starts_with("http://") && !normalized.starts_with("https://") {
        normalized = format!("https://{}", normalized);
    }

    // Remove trailing slash (unless it's root path)
    if normalized.ends_with('/') && normalized.matches('/').count() > 3 {
        normalized.pop();
    }

    normalized
}

/// Extract domain from URL
pub fn extract_domain(url: &str) -> AppResult<String> {
    let url = normalize_url(url);

    if let Ok(parsed) = url::Url::parse(&url) {
        Ok(parsed
            .host_str()
            .ok_or_else(|| AppError::SearchError("Unable to parse domain".to_string()))?
            .to_string())
    } else {
        // Simple string parsing as fallback
        if let Some(start) = url.find("://") {
            let start = start + 3;
            if let Some(end) = url[start..].find('/') {
                Ok(url[start..start + end].to_string())
            } else {
                Ok(url[start..].to_string())
            }
        } else {
            Err(AppError::SearchError("Invalid URL format".to_string()))
        }
    }
}

/// Check if string contains another string (case insensitive)
pub fn contains_case_insensitive(haystack: &str, needle: &str) -> bool {
    haystack.to_lowercase().contains(&needle.to_lowercase())
}

/// Remove duplicates while preserving original order
pub fn remove_duplicates<T: Clone + Eq + std::hash::Hash>(items: Vec<T>) -> Vec<T> {
    let mut seen = std::collections::HashSet::new();
    let mut result = Vec::new();

    for item in items {
        if seen.insert(item.clone()) {
            result.push(item);
        }
    }

    result
}

/// Append a single log line to the given path (best-effort)
pub async fn append_log_line(path: &Path, line: &str) {
    if let Some(parent) = path.parent() {
        let _ = tokio::fs::create_dir_all(parent).await;
    }

    let ts = chrono::Utc::now().to_rfc3339();
    let content = format!("[{ts}] {line}\n");

    if let Ok(mut file) = tokio::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .await
    {
        let _ = tokio::io::AsyncWriteExt::write_all(&mut file, content.as_bytes()).await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_username() {
        assert!(validate_username("testuser").is_ok());
        assert!(validate_username("test_user").is_ok());
        assert!(validate_username("test-user").is_ok());
        assert!(validate_username("test.user").is_ok());

        assert!(validate_username("").is_err());
        assert!(validate_username("a").is_err());
        assert!(validate_username("test user").is_err());
        assert!(validate_username("test@user").is_err());
    }

    #[test]
    fn test_validate_email() {
        assert!(validate_email("test@example.com").is_ok());
        assert!(validate_email("user.name@domain.co.uk").is_ok());

        assert!(validate_email("").is_err());
        assert!(validate_email("invalid-email").is_err());
        assert!(validate_email("@domain.com").is_err());
        assert!(validate_email("user@").is_err());
    }

    #[test]
    fn test_format_duration() {
        assert_eq!(format_duration(500), "0s");
        assert_eq!(format_duration(1500), "1s");
        assert_eq!(format_duration(65000), "1m 5s");
        assert_eq!(format_duration(3665000), "1h 1m 5s");
    }

    #[test]
    fn test_normalize_url() {
        assert_eq!(normalize_url("example.com"), "https://example.com");
        assert_eq!(normalize_url("http://example.com/"), "http://example.com");
        assert_eq!(
            normalize_url("https://example.com/path/"),
            "https://example.com/path"
        );
    }
}
