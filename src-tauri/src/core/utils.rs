use crate::core::error::{AppError, AppResult};
use serde_json::Value;
use std::collections::HashMap;

/// 实用工具函数集合

/// 从JSON值中提取数据
pub fn extract_json_data(path: &[String], data: &Value) -> AppResult<Option<Value>> {
    if path.is_empty() {
        return Ok(Some(data.clone()));
    }

    let mut current = data;
    for segment in path {
        match current {
            Value::Object(map) => {
                current = map
                    .get(segment)
                    .ok_or_else(|| AppError::SearchError(format!("路径段 '{}' 不存在", segment)))?;
            }
            Value::Array(arr) => {
                let index = segment
                    .parse::<usize>()
                    .map_err(|_| AppError::SearchError(format!("无效的数组索引: {}", segment)))?;
                current = arr
                    .get(index)
                    .ok_or_else(|| AppError::SearchError(format!("数组索引 {} 越界", index)))?;
            }
            _ => {
                return Err(AppError::SearchError(
                    "路径遍历遇到非对象/数组值".to_string(),
                ));
            }
        }
    }

    Ok(Some(current.clone()))
}

/// 从HTML内容中提取数据（使用简单的正则表达式）
pub fn extract_html_data(pattern: &str, content: &str) -> AppResult<Option<String>> {
    // 这是一个简单的实现，实际项目中可能需要更复杂的HTML解析
    // 这里我们使用基本的字符串匹配来模拟正则表达式
    if pattern.contains("href=") {
        // 简单的链接提取
        if let Some(start) = content.find("href=") {
            let start = start + 6; // "href=" 的长度
            if let Some(end_pos) = content[start..].find('"') {
                let end = start + end_pos;
                let url = &content[start..end];
                return Ok(Some(url.to_string()));
            }
        }
    }

    // 简单的标题提取
    if pattern.contains("<title>") {
        if let Some(start) = content.find("<title>") {
            let start = start + 7; // "<title>" 的长度
            if let Some(end) = content[start..].find("</title>") {
                let end = start + end;
                let title = &content[start..end];
                return Ok(Some(title.to_string()));
            }
        }
    }

    // 简单的h1-h6标题提取
    for tag in ["h1", "h2", "h3", "h4", "h5", "h6"] {
        if pattern.contains(&format!("<{}", tag)) {
            let open_tag = format!("<{} ", tag);
            let close_tag = format!("</{}>", tag);
            if let Some(start) = content.find(&open_tag) {
                let start = start + open_tag.len();
                if let Some(end) = content[start..].find('>') {
                    let start = start + end + 1;
                    if let Some(end) = content[start..].find(&close_tag) {
                        let end = start + end;
                        let title = content[start..end].trim();
                        return Ok(Some(title.to_string()));
                    }
                }
            }
        }
    }

    Ok(None)
}

/// 验证用户名格式
pub fn validate_username(username: &str) -> AppResult<()> {
    if username.trim().is_empty() {
        return Err(AppError::UserInputError("用户名不能为空".to_string()));
    }

    if username.len() < 2 {
        return Err(AppError::UserInputError(
            "用户名至少需要2个字符".to_string(),
        ));
    }

    if username.len() > 100 {
        return Err(AppError::UserInputError("用户名过长".to_string()));
    }

    // 基本字符检查（允许字母、数字、下划线、连字符、点）
    if !username
        .chars()
        .all(|c| c.is_alphanumeric() || matches!(c, '_' | '-' | '.'))
    {
        return Err(AppError::UserInputError("用户名包含无效字符".to_string()));
    }

    Ok(())
}

/// 验证邮箱格式
pub fn validate_email(email: &str) -> AppResult<()> {
    if email.trim().is_empty() {
        return Err(AppError::UserInputError("邮箱不能为空".to_string()));
    }

    // 简单的邮箱格式验证
    if !email.contains('@') || !email.contains('.') {
        return Err(AppError::UserInputError("邮箱格式无效".to_string()));
    }

    let parts: Vec<&str> = email.split('@').collect();
    if parts.len() != 2 {
        return Err(AppError::UserInputError("邮箱格式无效".to_string()));
    }

    if parts[0].is_empty() || parts[1].is_empty() {
        return Err(AppError::UserInputError("邮箱格式无效".to_string()));
    }

    Ok(())
}

/// 格式化持续时间
pub fn format_duration(milliseconds: u64) -> String {
    let seconds = milliseconds / 1000;
    let minutes = seconds / 60;
    let hours = minutes / 60;

    if hours > 0 {
        format!("{}小时{}分钟{}秒", hours, minutes % 60, seconds % 60)
    } else if minutes > 0 {
        format!("{}分钟{}秒", minutes, seconds % 60)
    } else {
        format!("{}秒", seconds)
    }
}

/// 创建用户代理字符串
pub fn create_user_agent() -> String {
    format!(
        "search-my-name/1.0 ({}; {}; Rust)",
        std::env::consts::OS,
        std::env::consts::ARCH
    )
}

/// 生成随机延迟（毫秒）
pub fn random_delay_ms(min: u64, max: u64) -> u64 {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    rng.gen_range(min..=max)
}

/// 清理和标准化URL
pub fn normalize_url(url: &str) -> String {
    let mut normalized = url.trim().to_string();

    // 确保协议存在
    if !normalized.starts_with("http://") && !normalized.starts_with("https://") {
        normalized = format!("https://{}", normalized);
    }

    // 移除末尾的斜杠（除非是根路径）
    if normalized.ends_with('/') && normalized.matches('/').count() > 3 {
        normalized.pop();
    }

    normalized
}

/// 从URL中提取域名
pub fn extract_domain(url: &str) -> AppResult<String> {
    let url = normalize_url(url);

    if let Ok(parsed) = url::Url::parse(&url) {
        Ok(parsed
            .host_str()
            .ok_or_else(|| AppError::SearchError("无法解析域名".to_string()))?
            .to_string())
    } else {
        // 简单的字符串解析作为后备
        if let Some(start) = url.find("://") {
            let start = start + 3;
            if let Some(end) = url[start..].find('/') {
                Ok(url[start..start + end].to_string())
            } else {
                Ok(url[start..].to_string())
            }
        } else {
            Err(AppError::SearchError("无效的URL格式".to_string()))
        }
    }
}

/// 检查字符串是否包含另一个字符串（不区分大小写）
pub fn contains_case_insensitive(haystack: &str, needle: &str) -> bool {
    haystack.to_lowercase().contains(&needle.to_lowercase())
}

/// 移除重复项，保持原始顺序
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
        assert_eq!(format_duration(500), "0秒");
        assert_eq!(format_duration(1500), "1秒");
        assert_eq!(format_duration(65000), "1分钟5秒");
        assert_eq!(format_duration(3665000), "1小时1分钟5秒");
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
