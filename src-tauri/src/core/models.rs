use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Search type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SearchType {
    Username,
    Email,
}

impl Default for SearchType {
    fn default() -> Self {
        SearchType::Username
    }
}

/// Search result status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "PascalCase")]
pub enum SearchResultStatus {
    Found,
    NotFound,
    Error,
    Pending,
}

impl Default for SearchResultStatus {
    fn default() -> Self {
        SearchResultStatus::Pending
    }
}

/// Individual search result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub site: String,
    pub status: SearchResultStatus,
    pub url: Option<String>,
    pub error: Option<String>,
    pub category: Option<String>,
    pub metadata: Option<Vec<MetadataItem>>,
}

/// Metadata item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetadataItem {
    pub name: String,
    pub value: serde_json::Value,
    pub data_type: String,
}

/// Search progress
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchProgress {
    pub total_sites: u32,
    pub checked_sites: u32,
    pub found_count: u32,
    pub error_count: u32,
}

impl SearchProgress {
    pub fn new(total_sites: u32) -> Self {
        Self {
            total_sites,
            checked_sites: 0,
            found_count: 0,
            error_count: 0,
        }
    }

    pub fn increment_checked(&mut self) {
        self.checked_sites += 1;
    }

    pub fn increment_found(&mut self) {
        self.found_count += 1;
    }

    pub fn increment_error(&mut self) {
        self.error_count += 1;
    }

    pub fn percentage(&self) -> f32 {
        if self.total_sites == 0 {
            0.0
        } else {
            (self.checked_sites as f32 / self.total_sites as f32) * 100.0
        }
    }
}

/// Search completion information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchFinished {
    pub total_sites: u32,
    pub found_count: u32,
    pub duration_ms: u64,
}

/// Website configuration
#[derive(Debug, Clone, Deserialize)]
pub struct Site {
    pub name: String,
    pub uri_check: String,
    pub e_code: u16,
    pub e_string: String,
    pub m_string: String,
    pub m_code: u16,
    #[serde(default)]
    pub known: Vec<String>,
    pub cat: String,
    /// HTTP request method (default: GET)
    #[serde(default = "default_method")]
    pub method: String,
    /// Request data (for POST requests)
    #[serde(default)]
    pub data: Option<String>,
    /// Request headers
    #[serde(default)]
    pub headers: Option<serde_json::Value>,
    /// Input operations (e.g., hash-sha256)
    #[serde(default)]
    pub input_operation: Option<String>,
    /// Pre-check configuration
    #[serde(default)]
    pub pre_check: Option<serde_json::Value>,
}

fn default_method() -> String {
    "GET".to_string()
}

/// Metadata extraction configuration
#[derive(Debug, Clone, Deserialize, serde::Serialize)]
pub struct MetadataExtraction {
    pub schema: String,
    #[serde(rename = "type")]
    pub data_type: String,
    pub name: String,
    pub path: serde_json::Value,
    #[serde(default)]
    pub prefix: Option<String>,
    #[serde(default)]
    #[serde(rename = "item-path")]
    pub item_path: Option<Vec<String>>,
}

/// Website metadata configuration
#[derive(Debug, Clone, Deserialize)]
pub struct SiteMetadataConfig {
    pub sites: HashMap<String, Vec<MetadataExtraction>>,
}

/// Search configuration
#[derive(Debug, Clone)]
pub struct SearchConfig {
    pub search_type: SearchType,
    pub query: String, // Username or email
    pub max_concurrent_requests: usize,
    pub timeout_seconds: u64,
    pub user_agent: String,
    pub exclude_nsfw: bool,
    pub category_filter: Option<String>,
}

impl Default for SearchConfig {
    fn default() -> Self {
        Self {
            search_type: SearchType::Username,
            query: String::new(),
            max_concurrent_requests: 30,
            timeout_seconds: 30,
            user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36".to_string(),
            exclude_nsfw: true,
            category_filter: None,
        }
    }
}

/// Tauri event payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchUpdatePayload {
    pub site: String,
    pub status: SearchResultStatus,
    pub url: Option<String>,
    pub error: Option<String>,
    pub category: Option<String>,
    pub metadata: Option<Vec<MetadataItem>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchProgressPayload {
    pub total_sites: u32,
    pub checked_sites: u32,
    pub found_count: u32,
    pub error_count: u32,
    pub percentage: f32,
    pub current_site: Option<String>,
}

/// Export format
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExportFormat {
    Pdf,
    Csv,
    Json,
    Txt,
}

/// Export options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportOptions {
    pub format: ExportFormat,
    pub username: String,
    pub results: Vec<SearchResult>,
    pub timestamp: Option<String>,
}
